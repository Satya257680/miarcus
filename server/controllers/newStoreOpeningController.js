const { readDeleteScope, eachId, sendFilteredResult } = require("../utils/deleteScope");
const { Parser } = require("json2csv");

const XLSX = require("xlsx");

const workflowService = require("../services/nsoWorkflowService");

const nsoService = require("../services/nsoService");

const db = require("../config/db");

// ======================================================
// WHICH new_store_openings COLUMNS ARE ACTUALLY NUMERIC?
// ======================================================
//
// There's no CREATE TABLE for new_store_openings in this codebase (the
// table already existed in the live database), so its real column
// types aren't something this file can just assume — guessing wrong
// either strips legitimate free text out of a VARCHAR column (e.g.
// Electricity, which is routinely "10KVA"/"3530 per KVA") or leaves a
// genuinely DECIMAL/INT column exposed to the exact "Incorrect [...]
// value" bulk-upload failure this fix exists to prevent.
//
// Instead, ask the database itself once per bulk upload which columns
// are numeric, and only run toDecimalOrNull() (below) on those. Falls
// back to a conservative static list (the columns the original "NA"
// error and its siblings are known to hit) only if the introspection
// query itself fails for some reason.
// ======================================================

const NUMERIC_SQL_TYPES = new Set([
    "decimal", "numeric", "float", "double",
    "int", "integer", "tinyint", "smallint", "mediumint", "bigint"
]);

const FALLBACK_NUMERIC_COLUMNS = new Set([
    "sb_area", "carpet_area", "cam", "mg", "revenue_share", "escalation", "expected_sale"
]);

// ======================================================
// BULK UPLOAD — COLUMN HEADER MATCHING
// ======================================================
//
// BUG FIX — spreadsheet columns silently dropped on bulk upload
//
// The importer used to turn every header into a key with
// `header.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")`
// and then read that exact key off the row (e.g. row.sb_area). That
// only matches a header written exactly as "sb_area". A completely
// normal, human-written header like "SB Area (sqft)" normalizes to
// "sb_area_sqft" — one character different from what the code reads —
// so the whole column was silently ignored: every value in it never
// reached the database, with no error and no warning anywhere.
//
// This replaces that with an alias table: each database column lists
// every header spelling it should accept, including the labels this
// app's own Add/Edit form and CSV export already use ("Broker
// Possession Date", "Rev Share (%)") as well as spellings seen in
// real-world exports ("Broker Date", "Recee by NSO", "Actual
// Possession Date (confirmed)"). Matching strips ALL punctuation and
// whitespace and lowercases before comparing, so "SB Area (sqft)",
// "SB Area (Sqft)" and "sb_area" are all recognised as the same
// column regardless of spacing or punctuation.
//
// A header that still isn't recognised is left out exactly as
// before — that's expected for the many auto-calculated/reporting
// columns (Deal Days, Layout by NSO, GST Deadline, History, etc.)
// that this app always recalculates itself from the possession date
// (see generateTimeline() in nsoService.js) and was never meant to
// be a bulk-upload input. Any header that isn't recognised is now
// also reported back in the API response (see `unrecognizedColumns`
// below) instead of vanishing without a trace.
// ======================================================

const NSO_COLUMN_ALIASES = {
    location: ["location", "store location", "location name"],
    city: ["city"],
    sb_area: ["sb area", "sb area sqft", "super built up area", "sba", "built up area"],
    carpet_area: ["carpet area", "carpet area sqft"],
    cam: ["cam"],
    mg: ["mg", "minimum guarantee"],
    electricity_kva: ["electricity", "electricity kva"],
    revenue_share: ["revenue share", "revenue share %", "rev share", "rev share %", "rev share (%)"],
    escalation: ["escalation", "escalation %"],
    expected_sale: ["expected sale", "expected sale inr"],
    possession_date_loi: [
        "possession date loi", "possession date (loi)", "possession date as per loi",
        "possession date (as per loi)", "loi possession date"
    ],
    possession_date_broker: [
        "possession date broker", "broker possession date", "broker date"
    ],
    actual_possession_date: [
        "actual possession date", "actual possession date confirmed",
        "actual possession date (confirmed)"
    ],
    received_by_nso: [
        "received by nso", "recee by nso", "recce by nso", "receive by nso", "receipt by nso"
    ],
    broker_name: ["broker name", "broker"],
    operation_head_assigned: ["operation head assigned", "operation head"],
    asm_assigned: ["asm assigned", "asm"],
    remarks: ["remarks", "remark"],
    attachment: ["attachment", "attachments"],
    approver_name: ["approver name", "approver"],
    construction_vendor: ["construction vendor", "vendor"],
    project_taken_by: ["project taken by"]
};

// Strips everything but letters/digits and lowercases, so "SB Area
// (sqft)", "sb_area", and "SB AREA - SQFT" all collapse to the same
// comparison key.
const normalizeHeaderForMatch = (value) =>
    String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

// Canonical DB field name is always an accepted alias too, so a
// header that already matches the field name exactly (e.g. from this
// app's own sample file — see downloadNewStoreOpeningsSample below)
// always works even if it was never explicitly listed above.
const NSO_HEADER_LOOKUP = (() => {
    const lookup = {};
    for (const [field, aliases] of Object.entries(NSO_COLUMN_ALIASES)) {
        lookup[normalizeHeaderForMatch(field)] = field;
        for (const alias of aliases) {
            lookup[normalizeHeaderForMatch(alias)] = field;
        }
    }
    return lookup;
})();

const canonicalNsoField = (header) =>
    NSO_HEADER_LOOKUP[normalizeHeaderForMatch(header)] || null;

async function getNumericColumns(tableName) {
    try {
        const rows = await db.query(
            `SELECT COLUMN_NAME, DATA_TYPE
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
            [tableName]
        );

        if (!rows || !rows.length) return FALLBACK_NUMERIC_COLUMNS;

        const numeric = new Set();
        for (const r of rows) {
            const columnName = r.COLUMN_NAME || r.column_name;
            const dataType = String(r.DATA_TYPE || r.data_type || "").toLowerCase();
            if (NUMERIC_SQL_TYPES.has(dataType)) numeric.add(columnName);
        }
        return numeric;
    } catch (error) {
        console.warn(
            "Unable to introspect new_store_openings column types — falling back to the known numeric fields:",
            error.message
        );
        return FALLBACK_NUMERIC_COLUMNS;
    }
}

// ======================================================
// SAFE DECIMAL FOR A BULK-UPLOAD NUMERIC COLUMN
// ======================================================
//
// BUG FIX — "Incorrect decimal value: 'NA' for column 'cam' at row 10"
//
// New Store Openings bulk upload used to pass a spreadsheet cell
// straight through into decimal columns (CAM, MG, SB Area, Carpet
// Area, Rev Share %, Escalation %, Expected Sale) with no sanitizing
// at all. Real-world exports commonly contain:
//   - "NA" / "N/A" / "-" / blank                (no data for that field)
//   - "1,10,000" / "8,00,000"                   (Indian-style comma grouping)
//   - "15% After 3 years" / "5% (every year)"   (a number plus descriptive text)
// Any of these sent straight to a DECIMAL column throws exactly the
// error above and — because the whole file is inserted as one batch
// (see workflowService.bulkImportWorkflow) — aborts the ENTIRE upload,
// not just that one row/column.
//
// This extracts the leading numeric value (after stripping commas/
// currency symbols) and returns null for anything with no digits at
// all, so the column always receives either a clean number or NULL —
// never text a DECIMAL column can reject. The database can only ever
// store a number in a decimal column, so a purely descriptive
// qualifier ("After 3 years") can't be preserved here; the number
// itself always is.
// ======================================================

const toDecimalOrNull = (value) => {

    if (value === null || value === undefined) return null;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    let text = String(value).trim();
    if (!text) return null;

    // Explicit "not applicable" markers -> NULL, not a parse failure.
    if (/^(n\.?\/?a\.?|nil|none|-{1,2}|na)$/i.test(text)) return null;

    // Strip currency symbols and thousands separators (including the
    // Indian "1,10,000" grouping, which plain comma-stripping already
    // handles correctly since it just removes every comma).
    text = text.replace(/[₹$,]/g, "").trim();

    // Pull out the first number in whatever text remains — handles a
    // bare number, a trailing "%", a unit suffix ("10KVA"), or a
    // descriptive qualifier ("15% After 3 years").
    const match = text.match(/-?\d+(\.\d+)?/);
    if (!match) return null;

    const num = Number(match[0]);
    return Number.isFinite(num) ? num : null;
};

// Only run the numeric coercion above on a column the database has
// actually told us is numeric (see getNumericColumns) — otherwise a
// genuinely text/VARCHAR column (a descriptive Escalation clause, an
// Electricity value like "3530 per KVA") is passed through untouched
// instead of being trimmed down to just its leading digits.
const sanitizeImportField = (fieldName, rawValue, numericColumns) => {
    if (numericColumns.has(fieldName)) {
        return toDecimalOrNull(rawValue);
    }
    return rawValue !== null && rawValue !== undefined && rawValue !== ""
        ? rawValue
        : null;
};

// ======================================================
// DATE FORMATTER
// ======================================================

const formatDate = (value) => {

    if (!value) {

        return null;

    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {

        return null;

    }

    return date.toISOString().split("T")[0];

};

// ======================================================
// GET ALL NEW STORE OPENINGS
// ======================================================

exports.getAllNewStoreOpenings = async (

    req,

    res

) => {

    try {

        const page =

            parseInt(req.query.page) || 1;

        const limit =

            parseInt(req.query.limit) || 10;

        const filters = {

            search:

                req.query.search || "",

            offset:

                (page - 1) * limit,

            limit

        };

        const result =

            await nsoService.getProjects(

                filters

            );

        return res.json({

            success: true,

            page,

            limit,

            total:

                result.total,

            totalPages:

                Math.ceil(

                    result.total / limit

                ),

            data:

                result.data

        });

    }

    catch (

        error

    ) {

        return res.status(500).json({

            success: false,

            message:

                error.message

        });

    }

};

// ======================================================
// GET NEW STORE OPENING BY ID
// ======================================================

exports.getNewStoreOpeningById = async (

    req,

    res

) => {

    try {

        const project =

            await nsoService.getProjectById(

                req.params.id

            );

        return res.json({

            success: true,

            data:

                project

        });

    }

    catch (

        error

    ) {

        return res.status(

            error.message === "Project not found."

                ? 404

                : 500

        ).json({

            success: false,

            message:

                error.message

        });

    }

};
// ======================================================
// CREATE NEW STORE OPENING
// ======================================================

exports.createNewStoreOpening = async (

    req,

    res

) => {

    try {

        const data = {

            ...req.body,

            possession_date_loi:

                formatDate(

                    req.body.possession_date_loi

                ),

            possession_date_broker:

                formatDate(

                    req.body.possession_date_broker

                ),

            actual_possession_date:

                formatDate(

                    req.body.actual_possession_date

                ),

            received_by_nso:

                formatDate(

                    req.body.received_by_nso

                )

        };

        const result =

            await workflowService.createWorkflow(

                data,

                req.user.id,

                req.file || null

            );

        return res.status(201).json({

            success: true,

            id:

                result.id,

            message:

                result.message

        });

    }

    catch (

        error

    ) {

        return res.status(500).json({

            success: false,

            message:

                error.message

        });

    }

};
// ======================================================
// UPDATE NEW STORE OPENING
// ======================================================

exports.updateNewStoreOpening = async (

    req,

    res

) => {

    try {

        const id =

            req.params.id;

        // ==========================================
        // REQUEST DATA
        // ==========================================

        const data = {

            ...req.body,

            possession_date_loi:

                formatDate(

                    req.body.possession_date_loi

                ),

            possession_date_broker:

                formatDate(

                    req.body.possession_date_broker

                ),

            actual_possession_date:

                formatDate(

                    req.body.actual_possession_date

                ),

            received_by_nso:

                formatDate(

                    req.body.received_by_nso

                )

        };

        // ==========================================
        // WORKFLOW
        // ==========================================

        const result =

            await workflowService.updateWorkflow(

                id,

                data,

                req.user.id,

                req.file || null

            );

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.json({

            success: true,

            message:

                result.message

        });

    }

    catch (

        error

    ) {

        return res.status(

            error.message === "Project not found."

                ? 404

                : 500

        ).json({

            success: false,

            message:

                error.message

        });

    }

};
// ======================================================
// DELETE NEW STORE OPENING
// ======================================================

exports.deleteNewStoreOpening = async (

    req,

    res

) => {

    try {

        const result =

            await workflowService.deleteWorkflow(

                req.params.id,

                req.user.id

            );

        return res.json({

            success: true,

            message:

                result.message

        });

    }

    catch (

        error

    ) {

        return res.status(

            error.message === "Project not found."

                ? 404

                : 500

        ).json({

            success: false,

            message:

                error.message

        });

    }

};

// ======================================================
// DELETE ALL NEW STORE OPENINGS
// ======================================================

exports.deleteAllNewStoreOpenings = async (

    req,

    res

) => {

    try {

        // Filters applied on the page -> the client sends the ids of the
        // matching projects; each goes through the normal single-project
        // delete workflow (history etc.). No filters -> delete all.
        const scope = readDeleteScope(req);

        if (scope.filtered) {
            const filteredResult = await eachId(
                scope.ids || [],
                (id) => workflowService.deleteWorkflow(id, req.user.id)
            );
            return sendFilteredResult(res, filteredResult, "New Store Opening project(s)");
        }

        const result =

            await workflowService.deleteAllWorkflow(

                req.user.id

            );

        return res.json({

            success: true,

            message:

                result.message

        });

    }

    catch (

        error

    ) {

        return res.status(500).json({

            success: false,

            message:

                error.message

        });

    }

};
// ======================================================
// EXPORT NEW STORE OPENINGS CSV
// ======================================================

exports.exportNewStoreOpeningsCSV = async (

    req,

    res

) => {

    try {

        const data =

            await workflowService.exportWorkflow();

        const parser =

            new Parser();

        const csv =

            parser.parse(

                data

            );

        res.header(

            "Content-Type",

            "text/csv"

        );

        res.attachment(

            "new_store_openings.csv"

        );

        return res.send(

            csv

        );

    }

    catch (

        error

    ) {

        return res.status(500).json({

            success: false,

            message:

                error.message

        });

    }

};
// ======================================================
// BULK IMPORT NEW STORE OPENINGS
// SUPPORTS CSV + XLSX + XLS
// ======================================================

exports.bulkUploadNewStoreOpenings = async (
    req,
    res
) => {

    try {

        // ==================================================
        // CHECK FILE
        // ==================================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Please upload a CSV, XLSX or XLS file."

            });

        }


        // ==================================================
        // CHECK FILE EXTENSION
        // ==================================================

        const fileName =
            req.file.originalname ||
            req.file.filename ||
            "";

        const extension =
            fileName
                .split(".")
                .pop()
                .toLowerCase();


        if (
            ![
                "csv",
                "xlsx",
                "xls"
            ].includes(extension)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Only CSV, XLSX and XLS files are supported."

            });

        }


        // ==================================================
        // DATE FORMATTER
        // ==================================================
        //
        // Supports:
        //
        // XLSX:
        // Excel serial number
        // JavaScript Date
        //
        // CSV:
        // DD-MM-YYYY
        // DD/MM/YYYY
        // YYYY-MM-DD
        //
        // Output:
        // YYYY-MM-DD
        //
        // Suitable for MySQL DATE and
        // React <input type="date">
        // ==================================================

        const formatImportDate = (
            value
        ) => {

            // ----------------------------------------------
            // EMPTY
            // ----------------------------------------------

            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {

                return null;

            }


            // ----------------------------------------------
            // DATE OBJECT
            // ----------------------------------------------

            if (
                value instanceof Date
            ) {

                if (
                    isNaN(
                        value.getTime()
                    )
                ) {

                    return null;

                }

                const year =
                    value.getFullYear();

                const month =
                    String(
                        value.getMonth() + 1
                    ).padStart(
                        2,
                        "0"
                    );

                const day =
                    String(
                        value.getDate()
                    ).padStart(
                        2,
                        "0"
                    );

                return `${year}-${month}-${day}`;

            }


            // ----------------------------------------------
            // EXCEL SERIAL DATE
            // ----------------------------------------------

            if (
                typeof value === "number" &&
                Number.isFinite(value)
            ) {

                /*
                 * Excel date serial number.
                 *
                 * Example:
                 * 46520
                 *
                 * XLSX files can return dates this way.
                 */

                const excelDate =
                    new Date(
                        Date.UTC(
                            1899,
                            11,
                            30
                        ) +
                        (
                            value *
                            86400000
                        )
                    );


                if (
                    !isNaN(
                        excelDate.getTime()
                    )
                ) {

                    const year =
                        excelDate.getUTCFullYear();

                    const month =
                        String(
                            excelDate.getUTCMonth() + 1
                        ).padStart(
                            2,
                            "0"
                        );

                    const day =
                        String(
                            excelDate.getUTCDate()
                        ).padStart(
                            2,
                            "0"
                        );

                    return `${year}-${month}-${day}`;

                }

            }


            // ----------------------------------------------
            // STRING
            // ----------------------------------------------

            let dateString =
                String(value).trim();


            if (!dateString) {

                return null;

            }


            // ----------------------------------------------
            // REMOVE TIME
            // ----------------------------------------------

            if (
                dateString.includes("T")
            ) {

                dateString =
                    dateString.split("T")[0];

            }

            else if (
                dateString.includes(" ")
            ) {

                dateString =
                    dateString.split(" ")[0];

            }


            // ----------------------------------------------
            // DD-MM-YYYY
            // ----------------------------------------------

            let match =
                dateString.match(
                    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
                );


            if (match) {

                const day =
                    String(
                        match[1]
                    ).padStart(
                        2,
                        "0"
                    );

                const month =
                    String(
                        match[2]
                    ).padStart(
                        2,
                        "0"
                    );

                const year =
                    match[3];


                return `${year}-${month}-${day}`;

            }


            // ----------------------------------------------
            // DD/MM/YYYY
            // ----------------------------------------------

            match =
                dateString.match(
                    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
                );


            if (match) {

                const day =
                    String(
                        match[1]
                    ).padStart(
                        2,
                        "0"
                    );

                const month =
                    String(
                        match[2]
                    ).padStart(
                        2,
                        "0"
                    );

                const year =
                    match[3];


                return `${year}-${month}-${day}`;

            }


            // ----------------------------------------------
            // YYYY-MM-DD
            // ----------------------------------------------

            match =
                dateString.match(
                    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
                );


            if (match) {

                const year =
                    match[1];

                const month =
                    String(
                        match[2]
                    ).padStart(
                        2,
                        "0"
                    );

                const day =
                    String(
                        match[3]
                    ).padStart(
                        2,
                        "0"
                    );


                return `${year}-${month}-${day}`;

            }


            // ----------------------------------------------
            // FALLBACK
            // ----------------------------------------------

            const parsedDate =
                new Date(
                    dateString
                );


            if (
                !isNaN(
                    parsedDate.getTime()
                )
            ) {

                const year =
                    parsedDate.getFullYear();

                const month =
                    String(
                        parsedDate.getMonth() + 1
                    ).padStart(
                        2,
                        "0"
                    );

                const day =
                    String(
                        parsedDate.getDate()
                    ).padStart(
                        2,
                        "0"
                    );


                return `${year}-${month}-${day}`;

            }


            // ----------------------------------------------
            // INVALID
            // ----------------------------------------------

            return null;

        };


        // ==================================================
        // READ FILE
        // ==================================================
        //
        // XLSX.readFile() supports:
        //
        // CSV
        // XLSX
        // XLS
        //
        // ==================================================

        const workbook =
            XLSX.readFile(
                req.file.path,
                {
                    cellDates: true
                }
            );


        // ==================================================
        // CHECK WORKSHEET
        // ==================================================

        if (
            !workbook.SheetNames ||
            workbook.SheetNames.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "The uploaded file does not contain a worksheet."

            });

        }


        // ==================================================
        // FIRST SHEET
        // ==================================================

        const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];


        if (!sheet) {

            return res.status(400).json({

                success: false,

                message:
                    "Unable to read the uploaded file."

            });

        }


        // ==================================================
        // SHEET → JSON
        // ==================================================

        const rows =
            XLSX.utils.sheet_to_json(
                sheet,
                {
                    defval: null,
                    raw: true
                }
            );


        // ==================================================
        // EMPTY FILE
        // ==================================================

        if (
            !rows ||
            rows.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Uploaded file is empty."

            });

        }


        // ==================================================
        // WHICH COLUMNS ARE NUMERIC? (see getNumericColumns above)
        // ==================================================

        const numericColumns =
            await getNumericColumns("new_store_openings");

        // ==================================================
        // NORMALIZE ROWS (alias-matched — see NSO_COLUMN_ALIASES
        // and canonicalNsoField above)
        // ==================================================

        const unrecognizedHeaders = new Set();

        const normalizedRows =
            rows.map(
                (
                    originalRow
                ) => {

                    const row = {};


                    Object.keys(
                        originalRow
                    ).forEach(
                        (
                            key
                        ) => {

                            const canonical =
                                canonicalNsoField(key);

                            if (canonical) {

                                row[canonical] =
                                    originalRow[key];

                            } else if (
                                String(key).trim()
                            ) {

                                unrecognizedHeaders.add(
                                    String(key).trim()
                                );

                            }

                        }
                    );


                    return row;

                }
            );


        // ==================================================
        // PREPARE RECORDS
        // ==================================================

        const records =
            normalizedRows.map(
                (
                    row
                ) => {

                    return {

                        // ----------------------------------
                        // BASIC INFORMATION
                        // ----------------------------------

                        location:
                            row.location ||
                            null,

                        city:
                            row.city ||
                            null,


                        // ----------------------------------
                        // AREA
                        // ----------------------------------

                        sb_area:
                            sanitizeImportField("sb_area", row.sb_area, numericColumns),

                        carpet_area:
                            sanitizeImportField("carpet_area", row.carpet_area, numericColumns),


                        // ----------------------------------
                        // FINANCIAL
                        //
                        // Sanitized with sanitizeImportField()/toDecimalOrNull()
                        // (see above) so a cell like "NA", "1,10,000" or "15%
                        // After 3 years" can never abort the whole bulk upload
                        // with an "Incorrect decimal value" SQL error — but
                        // ONLY when the database actually reports that column
                        // as numeric, so a genuinely text column (e.g. a
                        // descriptive Escalation clause) is left exactly as
                        // written in the spreadsheet.
                        // ----------------------------------

                        cam:
                            sanitizeImportField("cam", row.cam, numericColumns),

                        mg:
                            sanitizeImportField("mg", row.mg, numericColumns),

                        electricity_kva:
                            sanitizeImportField("electricity_kva", row.electricity_kva, numericColumns),

                        revenue_share:
                            sanitizeImportField("revenue_share", row.revenue_share, numericColumns),

                        escalation:
                            sanitizeImportField("escalation", row.escalation, numericColumns),

                        expected_sale:
                            sanitizeImportField("expected_sale", row.expected_sale, numericColumns),


                        // ----------------------------------
                        // DATES
                        // ----------------------------------

                        possession_date_loi:
                            formatImportDate(
                                row.possession_date_loi
                            ),

                        possession_date_broker:
                            formatImportDate(
                                row.possession_date_broker
                            ),

                        actual_possession_date:
                            formatImportDate(
                                row.actual_possession_date
                            ),

                        received_by_nso:
                            formatImportDate(
                                row.received_by_nso
                            ),


                        // ----------------------------------
                        // PEOPLE / ASSIGNMENTS
                        // ----------------------------------

                        broker_name:
                            row.broker_name ||
                            null,

                        operation_head_assigned:
                            row.operation_head_assigned ||
                            null,

                        asm_assigned:
                            row.asm_assigned ||
                            null,


                        // ----------------------------------
                        // OTHER INFORMATION
                        // ----------------------------------

                        remarks:
                            row.remarks ||
                            null,

                        attachment:
                            row.attachment ||
                            null,

                        approver_name:
                            row.approver_name ||
                            null,

                        construction_vendor:
                            row.construction_vendor ||
                            null,

                        project_taken_by:
                            row.project_taken_by ||
                            null

                    };

                }
            );


        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const userId =
            req.user &&
            (
                req.user.id ||
                req.user.user_id
            );


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authenticated user not found."

            });

        }


        // ==================================================
        // DEBUG
        // ==================================================

        console.log(
            "=========================================="
        );

        console.log(
            "NSO BULK IMPORT"
        );

        console.log(
            "File:",
            fileName
        );

        console.log(
            "Type:",
            extension
        );

        console.log(
            "Rows:",
            records.length
        );

        console.log(
            "First Record:",
            records[0]
        );

        console.log(
            "=========================================="
        );


        // ==================================================
        // WORKFLOW
        // ==================================================

        const result =
            await workflowService.bulkImportWorkflow(

                records,

                userId

            );


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(200).json({

            success: true,

            message:
                "Bulk Upload Completed Successfully.",

            imported:
                result &&
                result.affectedRows !== undefined
                    ? result.affectedRows
                    : records.length,

            // Columns in the uploaded file that didn't match any known
            // New Store Opening field (see NSO_COLUMN_ALIASES above) —
            // every row still imported, but these specific columns were
            // not recognised and so were not saved. Usually empty; if
            // not, it's a real heads-up rather than a silent drop.
            unrecognizedColumns:
                Array.from(unrecognizedHeaders)

        });

    }

    catch (error) {

        // ==================================================
        // ERROR
        // ==================================================

        console.error(
            "❌ Bulk Upload New Store Openings Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Bulk upload failed."

        });

    }

};

// ======================================================
// DOWNLOAD BULK-UPLOAD SAMPLE FILE
// ======================================================
//
// BUG FIX — "Download Sample File" always failed (404)
//
// The New Store Openings page links its "Download Sample File" button
// to GET /api/new-store-openings/sample (see sampleFile prop on the
// BulkUploadModal in client/src/pages/NewStoreOpenings.jsx), but no
// route or handler for that path existed anywhere on the server, so
// every click just 404'd — admins had no reliable way to know which
// column headers a bulk upload actually needs.
//
// This adds that route's handler. It builds the sample directly from
// NSO_COLUMN_ALIASES — the exact same table bulkUploadNewStoreOpenings
// (above) reads headers against — so the sample and the importer can
// never drift out of sync, and generates a ready-to-edit .xlsx with
// one filled-in example row plus one blank row underneath.
// ======================================================

const NSO_SAMPLE_HEADER_LABELS = {
    location: "Location",
    city: "City",
    sb_area: "SB Area (Sqft)",
    carpet_area: "Carpet Area (Sqft)",
    cam: "CAM",
    mg: "MG",
    electricity_kva: "Electricity (KVA)",
    revenue_share: "Revenue Share (%)",
    escalation: "Escalation (%)",
    expected_sale: "Expected Sale (INR)",
    possession_date_loi: "Possession Date (LOI)",
    possession_date_broker: "Broker Possession Date",
    actual_possession_date: "Actual Possession Date",
    received_by_nso: "Received By NSO",
    broker_name: "Broker Name",
    operation_head_assigned: "Operation Head Assigned",
    asm_assigned: "ASM Assigned",
    remarks: "Remarks",
    attachment: "Attachment",
    approver_name: "Approver Name",
    construction_vendor: "Construction Vendor",
    project_taken_by: "Project Taken By"
};

const NSO_SAMPLE_ROW = {
    location: "Example Mall, Sector 21",
    city: "Gurugram",
    sb_area: 1200,
    carpet_area: 800,
    cam: 45000,
    mg: 150000,
    electricity_kva: "10KVA",
    revenue_share: 12,
    escalation: 15,
    expected_sale: 1200000,
    possession_date_loi: "01/08/2026",
    possession_date_broker: "03/08/2026",
    actual_possession_date: "05/08/2026",
    received_by_nso: "06/08/2026",
    broker_name: "Broker Name",
    operation_head_assigned: "Operation Head Name",
    asm_assigned: "ASM Name",
    remarks: "Optional notes",
    attachment: "",
    approver_name: "Approver Name",
    construction_vendor: "Construction Vendor Name",
    project_taken_by: "Person Name"
};

exports.downloadNewStoreOpeningsSample = async (
    req,
    res
) => {

    try {

        const fields =
            Object.keys(NSO_COLUMN_ALIASES);

        const headerRow =
            fields.map(
                (field) => NSO_SAMPLE_HEADER_LABELS[field] || field
            );

        const exampleRow =
            fields.map(
                (field) => NSO_SAMPLE_ROW[field] ?? ""
            );

        const blankRow =
            fields.map(() => "");

        const worksheet =
            XLSX.utils.aoa_to_sheet(
                [headerRow, exampleRow, blankRow]
            );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "New Store Openings"
        );

        const buffer =
            XLSX.write(
                workbook,
                {
                    type: "buffer",
                    bookType: "xlsx"
                }
            );

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=new-store-openings-sample.xlsx"
        );

        return res.send(buffer);

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to generate sample file."

        });

    }

};