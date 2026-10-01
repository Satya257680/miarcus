const { readDeleteScope, eachId, sendFilteredResult } = require("../utils/deleteScope");
const { Parser } = require("json2csv");

const XLSX = require("xlsx");

const workflowService = require("../services/nsoWorkflowService");

const nsoService = require("../services/nsoService");

const db = require("../config/db");
const { runBulkUpload } = require("../utils/bulkUploadEngine");
const { defineBulkModule, COMMON_GUIDELINES } = require("../config/bulkUploadModules");

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
// BULK IMPORT NEW STORE OPENINGS  (global bulk-upload engine)
// Any format. Every row is saved on its own (no all-or-nothing batch):
// invalid dates / missing Location are reported with the exact Excel
// row, column, value and reason while all valid rows are created.
// Extra columns are kept with the project (bulk_extra_data).
// ======================================================

exports.bulkUploadNewStoreOpenings = async (req, res) => {
    const userId = req.user && (req.user.id || req.user.user_id);

    if (!userId) {
        return res.status(401).json({ success: false, message: "Authenticated user not found." });
    }

    return runBulkUpload({
        req,
        res,
        module: "new-store-openings",

        prepare: async (ctx) => {
            ctx.data.numericColumns = await getNumericColumns("new_store_openings");
        },

        validateRow: (row, ctx) => {
            const record = {};

            Object.keys(NSO_COLUMN_ALIASES).forEach((field) => {
                const label = NSO_SAMPLE_HEADER_LABELS[field] || field;
                const raw = ctx.cell(label);

                if (NSO_DATE_FIELDS.includes(field)) {
                    record[field] = ctx.date(label);
                    return;
                }

                if (ctx.data.numericColumns.has(field)) {
                    const value = toDecimalOrNull(raw);
                    const text = String(raw ?? "").trim();
                    if (value === null && text && !/^(n\.?\/?a\.?|nil|none|-{1,2}|na)$/i.test(text)) {
                        ctx.fail(label, text, `${label} must be a number.`);
                    }
                    record[field] = value;
                    return;
                }

                record[field] = raw !== null && raw !== undefined && String(raw).trim() !== "" ? String(raw).trim() : null;
            });

            ctx.record = record;
        },

        processRow: async (row, ctx) => {
            const result = await workflowService.bulkImportWorkflow([ctx.record], userId, { skipHistory: true });
            return { id: result?.insertId || null };
        },

        finalize: async (ctx) => {
            if (ctx.report.uploaded && workflowService.createImportHistory) {
                await workflowService.createImportHistory(userId, ctx.report.uploaded);
            }
        }
    });
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

// Registers this module with the global bulk-upload engine. The
// spreadsheet column names are the sample-file labels; every alias in
// NSO_COLUMN_ALIASES (and the raw DB field name) is still accepted.
const NSO_DATE_FIELDS = ["possession_date_loi", "possession_date_broker", "actual_possession_date", "received_by_nso"];

defineBulkModule("new-store-openings", {
    title: "New Store Openings",
    table: "new_store_openings",
    columns: Object.fromEntries(
        Object.entries(NSO_COLUMN_ALIASES).map(([field, aliases]) => [
            NSO_SAMPLE_HEADER_LABELS[field] || field,
            {
                aliases: [field, ...aliases],
                required: field === "location" ? true : undefined,
                sample: {
                    location: "Hisar - Main Market",
                    city: "Hisar",
                    sb_area: "1500",
                    carpet_area: "1200",
                    cam: "25",
                    mg: "150000",
                    electricity_kva: "20",
                    revenue_share: "12",
                    escalation: "5% every 3 years",
                    expected_sale: "800000",
                    possession_date_loi: "01/11/2026",
                    possession_date_broker: "05/11/2026",
                    actual_possession_date: "",
                    received_by_nso: "20/10/2026",
                    broker_name: "ABC Realty",
                    operation_head_assigned: "Rohit Singh",
                    asm_assigned: "ASM North",
                    remarks: "",
                    attachment: "",
                    approver_name: "Regional Head",
                    construction_vendor: "XYZ Interiors",
                    project_taken_by: "NSO Team"
                }[field] ?? "",
                help: NSO_DATE_FIELDS.includes(field) ? "Date (DD/MM/YYYY)." : undefined
            }
        ])
    ),
    guidelines: COMMON_GUIDELINES
});


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