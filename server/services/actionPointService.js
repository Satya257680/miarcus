const ActionPoint = require("../models/actionPointModel");
const Activity = require("../models/activityModel");
const Audit = require("../models/auditModel");

// ======================================================
// helper: wrap a callback-style model call in a Promise
// ======================================================

const asPromise = (fn, ...args) =>
    new Promise((resolve, reject) => {
        fn(...args, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

// ======================================================
// GET ALL (list + pagination)
// ======================================================

const getAll = async (filters) => {

    const rows = await asPromise(ActionPoint.getAll, filters);
    const countResult = await asPromise(ActionPoint.count, filters);
    const total = countResult[0].total || 0;

    return {
        rows,
        pagination: {
            page: Math.floor((filters.offset || 0) / (filters.limit || 10)) + 1,
            limit: filters.limit || 10,
            total,
            totalPages: Math.ceil(total / (filters.limit || 10))
        }
    };

};

// ======================================================
// GET BY ID
// ======================================================

const getById = async (id) => {

    const rows = await asPromise(ActionPoint.getById, id);

    if (!rows || rows.length === 0) {
        return null;
    }

    return rows[0];

};

// ======================================================
// EXPORT (CSV data)
// ======================================================

const exportData = (filters) => asPromise(ActionPoint.exportData, filters);

// ======================================================
// GET OPEN ACTION POINTS
// ======================================================

const getOpen = () => asPromise(ActionPoint.getOpenActionPoints);

// ======================================================
// GET ACTION POINTS BY SUBMISSION
// ======================================================

const getBySubmission = (submissionId) =>
    asPromise(ActionPoint.getBySubmission, submissionId);

// ======================================================
// DASHBOARD STATS
// ======================================================

const getDashboardStats = () => asPromise(ActionPoint.getDashboardStats);

// ======================================================
// TRUTHY FLAG HELPER
// ======================================================

// ------------------------------------------------------
// Same fix as services/inspectionService.js — nso_rules
// boolean-ish columns can come back from mysql2 as a Buffer
// if the column is BIT(1) rather than TINYINT. This isn't
// currently called by the live rule-engine path (that runs
// through inspectionService.js), but keeping it consistent
// in case something switches to call it.
// ------------------------------------------------------

const isFlagEnabled = (value) => {

    if (Buffer.isBuffer(value)) {
        return value.length > 0 && value[0] === 1;
    }

    if (typeof value === "boolean") {
        return value;
    }

    return Number(value) === 1;

};

// ======================================================
// CREATE ACTION POINTS FROM MATCHED NSO RULES
// Called by inspectionService.runInspection() after the
// rule engine evaluates a checklist submission.
// Only rules with create_action_point = 1 produce a row.
// ======================================================

const createFromRules = async (submission, matchedRules, userId) => {

    const created = [];

    if (!matchedRules || matchedRules.length === 0) {
        return created;
    }

    for (const item of matchedRules) {

        const rule = item.rule;

        if (!isFlagEnabled(rule.create_action_point)) {
            continue;
        }

        if (!item.answer_id) {
            throw new Error(
                `Missing checklist submission answer ID for question ${item.question_id}.`
            );
        }

        const departmentIds = rule.department_ids
            ? String(rule.department_ids)
                .split(",")
                .map((id) => Number(id))
                .filter(Boolean)
            : [];

        const data = {
            submission_id: submission.id,
            submission_answer_id: item.answer_id,
            rule_id: rule.id || null,
            store_id: submission.store_id,
            department_id: departmentIds[0] || null,
            question_id: item.question_id,
            assigned_to: null,
            priority: rule.priority || "Medium",
            sla_value: Number(rule.sla_days) || 0,
            status: "Open",
            remarks: item.remarks || null,
            attachment: null,
            created_by: userId || null
        };

        const result = await asPromise(ActionPoint.create, data);

        created.push({ id: result.insertId, ...data });

        console.log(
            `[ActionPointService] Action Point #${result.insertId} created for submission #${submission.id}, answer #${item.answer_id}, rule #${rule.id}.`
        );

        Activity.create(
            {
                title: "Action Point Created",
                description: `Action Point #${result.insertId} raised from rule "${rule.name || rule.id}" on submission #${submission.id}.`,
                module_name: "Action Points",
                status: "Open",
                priority: data.priority,
                created_by: userId,
                assigned_to: null
            },
            () => {}
        );

        Audit.create(
            {
                module_name: "Action Points",
                reference_id: result.insertId,
                action: "CREATE",
                old_data: null,
                new_data: data,
                changed_by: userId
            },
            () => {}
        );

    }

    return created;

};

// ======================================================
// MANUAL CREATE
// Used by POST /api/action-points (user-raised)
// Mirrors the field/validation contract of the original
// controller exactly.
// ======================================================

const createManual = async (body, attachment, userId) => {

    const {
        submission_id,
        submission_answer_id,
        rule_id,
        store_id,
        department_id,
        question_id,
        assigned_to,
        priority,
        sla_days,
        remarks,
        status
    } = body;

    if (!submission_id) {
        const err = new Error("Submission is required.");
        err.statusCode = 400;
        throw err;
    }

    if (!submission_answer_id) {
        const err = new Error("Submission Answer is required.");
        err.statusCode = 400;
        throw err;
    }

    if (!question_id) {
        const err = new Error("Question is required.");
        err.statusCode = 400;
        throw err;
    }

    if (!store_id) {
        const err = new Error("Store is required.");
        err.statusCode = 400;
        throw err;
    }

    const actionPointData = {
        submission_id,
        submission_answer_id,
        rule_id: rule_id || null,
        store_id,
        department_id: department_id || null,
        question_id,
        assigned_to: assigned_to || null,
        priority: priority || "Medium",
        sla_value: Number(sla_days) || 0,
        status: status || "Open",
        remarks: remarks || "",
        attachment,
        created_by: userId
    };

    const result = await asPromise(ActionPoint.create, actionPointData);
    const actionPointId = result.insertId;

    Activity.create(
        {
            title: "Action Point Created",
            description: `Action Point #${actionPointId} created.`,
            module_name: "Action Points",
            status: "Open",
            priority: actionPointData.priority,
            created_by: userId,
            assigned_to: assigned_to || null
        },
        () => {}
    );

    Audit.create(
        {
            module_name: "Action Points",
            reference_id: actionPointId,
            action: "CREATE",
            old_data: null,
            new_data: actionPointData,
            changed_by: userId
        },
        () => {}
    );

    return { id: actionPointId };

};

// ======================================================
// UPDATE ACTION POINT
// (assigned_to / priority / sla_days / remarks / status)
// ======================================================

const update = async (id, body, attachment, userId) => {

    const {
        assigned_to,
        priority,
        sla_days,
        remarks,
        status
    } = body;

    const oldData = await getById(id);

    if (!oldData) {
        const err = new Error("Action Point not found.");
        err.statusCode = 404;
        throw err;
    }

    const updateData = {
        assigned_to: assigned_to || null,
        priority: priority || oldData.priority,
        sla_value: Number(sla_days) || oldData.sla_value,
        remarks: remarks || "",
        attachment: attachment || oldData.attachment
    };

    await asPromise(ActionPoint.update, id, updateData);

    if (status && status !== oldData.status) {
        await asPromise(ActionPoint.updateStatus, id, status);
    }

    Activity.create(
        {
            title: "Action Point Updated",
            description: `Action Point #${id} updated.`,
            module_name: "Action Points",
            status: "Open",
            priority: updateData.priority,
            created_by: userId,
            assigned_to: updateData.assigned_to
        },
        () => {}
    );

    Audit.create(
        {
            module_name: "Action Points",
            reference_id: id,
            action: "UPDATE",
            old_data: oldData,
            new_data: {
                ...oldData,
                ...updateData,
                status: status || oldData.status
            },
            changed_by: userId
        },
        () => {}
    );

    return { success: true, message: "Action Point updated successfully." };

};

// ======================================================
// TAKE ACTION / CLOSE ACTION POINT
// Also writes back to checklist_submission_answers via
// the model's transaction (action_taken / action_remarks
// / completion_date).
// ======================================================

const takeAction = async (id, body, userId) => {

    const { action_taken, remarks, status } = body;

    if (!action_taken) {
        const err = new Error("Action Taken is required.");
        err.statusCode = 400;
        throw err;
    }

    const oldData = await getById(id);

    if (!oldData) {
        const err = new Error("Action Point not found.");
        err.statusCode = 404;
        throw err;
    }

    await asPromise(ActionPoint.takeAction, id, {
        action_taken,
        remarks,
        status: status || "Closed"
    });

    Activity.create(
        {
            title: "Action Point Closed",
            description: `Action Point #${id} completed.`,
            module_name: "Action Points",
            status: "Closed",
            priority: oldData.priority,
            created_by: userId,
            assigned_to: oldData.assigned_to
        },
        () => {}
    );

    Audit.create(
        {
            module_name: "Action Points",
            reference_id: id,
            action: "TAKE_ACTION",
            old_data: oldData,
            new_data: { action_taken, remarks, status: "Closed" },
            changed_by: userId
        },
        () => {}
    );

    return { success: true, message: "Action Point completed successfully." };

};

// ======================================================
// DELETE ACTION POINT
// ======================================================

const deleteActionPoint = async (id, userId) => {

    const oldData = await getById(id);

    if (!oldData) {
        const err = new Error("Action Point not found.");
        err.statusCode = 404;
        throw err;
    }

    const result = await asPromise(ActionPoint.delete, id);

    if (result.affectedRows === 0) {
        const err = new Error("Action Point not found.");
        err.statusCode = 404;
        throw err;
    }

    Activity.create(
        {
            title: "Action Point Deleted",
            description: `Action Point #${id} deleted.`,
            module_name: "Action Points",
            status: "Closed",
            priority: oldData.priority,
            created_by: userId,
            assigned_to: oldData.assigned_to
        },
        () => {}
    );

    Audit.create(
        {
            module_name: "Action Points",
            reference_id: id,
            action: "DELETE",
            old_data: oldData,
            new_data: null,
            changed_by: userId
        },
        () => {}
    );

    return { success: true, message: "Action Point deleted successfully." };

};

// ======================================================
// DELETE ALL ACTION POINTS
// ======================================================

const deleteAll = async (userId) => {

    const result = await asPromise(ActionPoint.deleteAll);

    Activity.create(
        {
            title: "All Action Points Deleted",
            description: "All Action Points removed.",
            module_name: "Action Points",
            status: "Closed",
            priority: "High",
            created_by: userId,
            assigned_to: null
        },
        () => {}
    );

    Audit.create(
        {
            module_name: "Action Points",
            reference_id: null,
            action: "DELETE_ALL",
            old_data: null,
            new_data: { affectedRows: result.affectedRows },
            changed_by: userId
        },
        () => {}
    );

    return { success: true, message: "All Action Points deleted successfully." };

};

// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = {

    // rule-engine path (called from inspectionService)
    createFromRules,

    // manual CRUD path (called from actionPointController)
    getAll,
    getById,
    exportData,
    getOpen,
    getBySubmission,
    getDashboardStats,
    createManual,
    update,
    takeAction,
    delete: deleteActionPoint,
    deleteAll

};