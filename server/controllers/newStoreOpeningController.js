const { Parser } = require("json2csv");

const XLSX = require("xlsx");

const workflowService = require("../services/nsoWorkflowService");

const nsoService = require("../services/nsoService");

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
        // NORMALIZE COLUMN NAME
        // ==================================================

        const normalizeKey = (
            key
        ) => {

            return String(key)
                .trim()
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "_"
                )
                .replace(
                    /[^a-z0-9_]/g,
                    ""
                );

        };


        // ==================================================
        // NORMALIZE ROWS
        // ==================================================

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

                            row[
                                normalizeKey(
                                    key
                                )
                            ] =
                                originalRow[key];

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
                            row.sb_area !== null &&
                            row.sb_area !== undefined &&
                            row.sb_area !== ""
                                ? row.sb_area
                                : null,

                        carpet_area:
                            row.carpet_area !== null &&
                            row.carpet_area !== undefined &&
                            row.carpet_area !== ""
                                ? row.carpet_area
                                : null,


                        // ----------------------------------
                        // FINANCIAL
                        // ----------------------------------

                        cam:
                            row.cam !== null &&
                            row.cam !== undefined &&
                            row.cam !== ""
                                ? row.cam
                                : null,

                        mg:
                            row.mg !== null &&
                            row.mg !== undefined &&
                            row.mg !== ""
                                ? row.mg
                                : null,

                        electricity_kva:
                            row.electricity_kva !== null &&
                            row.electricity_kva !== undefined &&
                            row.electricity_kva !== ""
                                ? row.electricity_kva
                                : null,

                        revenue_share:
                            row.revenue_share !== null &&
                            row.revenue_share !== undefined &&
                            row.revenue_share !== ""
                                ? row.revenue_share
                                : null,

                        escalation:
                            row.escalation !== null &&
                            row.escalation !== undefined &&
                            row.escalation !== ""
                                ? row.escalation
                                : null,

                        expected_sale:
                            row.expected_sale !== null &&
                            row.expected_sale !== undefined &&
                            row.expected_sale !== ""
                                ? row.expected_sale
                                : null,


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
                    : records.length

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