const { Parser } = require("json2csv");

const actionPointService = require("../services/actionPointService");

// ======================================================
// GET ALL ACTION POINTS
// SEARCH + FILTER + PAGINATION
// GET /api/action-points
// ======================================================

exports.getAllActionPoints = async (req, res) => {

    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const filters = {
            store_id: req.query.store_id || null,
            department_id: req.query.department_id || null,
            checklist_type_id: req.query.checklist_type_id || null,
            priority: req.query.priority || null,
            status: req.query.status || null,
            start_date: req.query.start_date || null,
            end_date: req.query.end_date || null,
            search: req.query.search || "",
            offset,
            limit
        };

        const { rows, pagination } = await actionPointService.getAll(filters);

        return res.status(200).json({
            success: true,
            data: rows,
            pagination
        });

    }
    catch (error) {
        console.error("GET ACTION POINTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch Action Points.",
            error: error.message
        });
    }

};

// ======================================================
// EXPORT ACTION POINTS CSV
// GET /api/action-points/export
// ======================================================

exports.exportActionPointsCSV = async (req, res) => {

    try {

        const filters = {
            store_id: req.query.store_id || null,
            department_id: req.query.department_id || null,
            checklist_type_id: req.query.checklist_type_id || null,
            priority: req.query.priority || null,
            status: req.query.status || null,
            start_date: req.query.start_date || null,
            end_date: req.query.end_date || null,
            search: req.query.search || "",
            offset: 0,
            limit: 100000
        };

        const rows = await actionPointService.exportData(filters);

        const parser = new Parser({
            fields: [
                "id",
                "submission_date",
                "store_name",
                "city",
                "state",
                "checklist_name",
                "department_name",
                "question",
                "answer",
                "priority",
                "sla_days",
                "status",
                "remarks",
                "submitted_by",
                "assigned_to",
                "completed_at",
                "created_at"
            ]
        });

        const csv = parser.parse(rows || []);

        const Activity = require("../models/activityModel");
        const Audit = require("../models/auditModel");

        Activity.create({
            title: "Action Points Exported",
            description: "Action Points exported successfully.",
            module_name: "Action Points",
            status: "Closed",
            priority: "Low",
            created_by: req.user.id,
            assigned_to: null
        }, () => {});

        Audit.create({
            module_name: "Action Points",
            reference_id: null,
            action: "EXPORT",
            old_data: null,
            new_data: { total: rows.length },
            changed_by: req.user.id
        }, () => {});

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=ActionPoints.csv");

        return res.status(200).send(csv);

    }
    catch (error) {
        console.error("EXPORT ACTION POINTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Export failed.",
            error: error.message
        });
    }

};

// ======================================================
// GET ACTION POINT BY ID
// GET /api/action-points/:id
// ======================================================

exports.getActionPointById = async (req, res) => {

    try {

        const data = await actionPointService.getById(req.params.id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Action Point not found."
            });
        }

        return res.status(200).json({ success: true, data });

    }
    catch (error) {
        console.error("GET ACTION POINT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// CREATE ACTION POINT
// POST /api/action-points
// ======================================================

exports.createActionPoint = async (req, res) => {

    try {

        const attachment = req.file
            ? req.file.path.replace(/\\/g, "/")
            : null;

        const result = await actionPointService.createManual(
            req.body,
            attachment,
            req.user.id
        );

        return res.status(201).json({
            success: true,
            message: "Action Point created successfully.",
            data: result
        });

    }
    catch (error) {
        console.error("CREATE ACTION POINT ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to create Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// UPDATE ACTION POINT
// PUT /api/action-points/:id
// ======================================================

exports.updateActionPoint = async (req, res) => {

    try {

        const attachment = req.file
            ? req.file.path.replace(/\\/g, "/")
            : null;

        const result = await actionPointService.update(
            req.params.id,
            req.body,
            attachment,
            req.user.id
        );

        return res.status(200).json(result);

    }
    catch (error) {
        console.error("UPDATE ACTION POINT ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to update Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// TAKE ACTION
// PUT /api/action-points/:id/take-action
// ======================================================

exports.takeAction = async (req, res) => {

    try {

        const result = await actionPointService.takeAction(
            req.params.id,
            req.body,
            req.user.id
        );

        return res.status(200).json(result);

    }
    catch (error) {
        console.error("TAKE ACTION ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to complete Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// DELETE ACTION POINT
// DELETE /api/action-points/:id
// ======================================================

exports.deleteActionPoint = async (req, res) => {

    try {

        const result = await actionPointService.delete(req.params.id, req.user.id);
        return res.status(200).json(result);

    }
    catch (error) {
        console.error("DELETE ACTION POINT ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to delete Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// DELETE ALL ACTION POINTS
// DELETE /api/action-points
// ======================================================

exports.deleteAllActionPoints = async (req, res) => {

    try {

        const result = await actionPointService.deleteAll(req.user.id);
        return res.status(200).json(result);

    }
    catch (error) {
        console.error("DELETE ALL ACTION POINTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete Action Points.",
            error: error.message
        });
    }

};

// ======================================================
// MODULE EXPORT
// ======================================================

module.exports = {
    getAllActionPoints: exports.getAllActionPoints,
    exportActionPointsCSV: exports.exportActionPointsCSV,
    getActionPointById: exports.getActionPointById,
    createActionPoint: exports.createActionPoint,
    updateActionPoint: exports.updateActionPoint,
    takeAction: exports.takeAction,
    deleteActionPoint: exports.deleteActionPoint,
    deleteAllActionPoints: exports.deleteAllActionPoints
};