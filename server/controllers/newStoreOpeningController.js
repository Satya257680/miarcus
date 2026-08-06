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
// ======================================================

exports.bulkUploadNewStoreOpenings = async (

    req,

    res

) => {

    try {

        if (

            !req.file

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Please upload a CSV, XLSX or XLS file."

            });

        }

        // ==========================================
        // READ EXCEL
        // ==========================================

        const workbook =

            XLSX.readFile(

                req.file.path

            );

        const sheet =

            workbook.Sheets[

                workbook.SheetNames[0]

            ];

        const rows =

            XLSX.utils.sheet_to_json(

                sheet

            );

        if (

            rows.length === 0

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Uploaded file is empty."

            });

        }

       // ==========================================
// PREPARE DATA
// ==========================================

const records = rows.map(

    (

        row

    ) => ({

        location:

            row.location,

        city:

            row.city,

        sb_area:

            row.sb_area,

        carpet_area:

            row.carpet_area,

        cam:

            row.cam,

        mg:

            row.mg,

        electricity_kva:

            row.electricity_kva,

        revenue_share:

            row.revenue_share,

        escalation:

            row.escalation,

        expected_sale:

            row.expected_sale,

        possession_date_loi:

            formatDate(

                row.possession_date_loi

            ),

        possession_date_broker:

            formatDate(

                row.possession_date_broker

            ),

        broker_name:

            row.broker_name,

        operation_head_assigned:

            row.operation_head_assigned,

        asm_assigned:

            row.asm_assigned,

        actual_possession_date:

            formatDate(

                row.actual_possession_date

            ),

        remarks:

            row.remarks,

        attachment:

            row.attachment,

        received_by_nso:

            formatDate(

                row.received_by_nso

            ),

        approver_name:

            row.approver_name,

        construction_vendor:

            row.construction_vendor,

        project_taken_by:

            row.project_taken_by

    })

);
        // ==========================================
        // WORKFLOW
        // ==========================================

        const result =

            await workflowService.bulkImportWorkflow(

                records,

                req.user.id

            );

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.json({

            success: true,

            message:

                "Bulk Upload Completed Successfully.",

            imported:

                result.affectedRows ||

                records.length

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