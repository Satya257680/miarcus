const ActionPoint = require("../models/actionPointModel");
const Activity = require("../models/activityModel");
const Audit = require("../models/auditModel");

// ======================================================
// HELPER
// Wrap callback-style model calls in Promise
// ======================================================

const asPromise = (fn, ...args) =>
    new Promise((resolve, reject) => {
        fn(...args, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });


// ======================================================
// GET ALL
// ======================================================

const getAll = async (filters) => {

    const rows = await asPromise(
        ActionPoint.getAll,
        filters
    );

    const countResult = await asPromise(
        ActionPoint.count,
        filters
    );

    const total =
        countResult &&
        countResult[0]
            ? Number(countResult[0].total || 0)
            : 0;

    return {
        rows,

        pagination: {
            page:
                Math.floor(
                    (filters.offset || 0) /
                    (filters.limit || 10)
                ) + 1,

            limit:
                filters.limit || 10,

            total,

            totalPages:
                Math.ceil(
                    total /
                    (filters.limit || 10)
                )
        }
    };
};


// ======================================================
// GET BY ID
// ======================================================

const getById = async (id) => {

    const rows = await asPromise(
        ActionPoint.getById,
        id
    );

    if (!rows || rows.length === 0) {
        return null;
    }

    return rows[0];
};


// ======================================================
// EXPORT CSV
// ======================================================

const exportData = (filters) =>
    asPromise(
        ActionPoint.exportData,
        filters
    );


// ======================================================
// GET OPEN ACTION POINTS
// ======================================================

const getOpen = () =>
    asPromise(
        ActionPoint.getOpenActionPoints
    );


// ======================================================
// GET ACTION POINTS BY SUBMISSION
// ======================================================

const getBySubmission = (submissionId) =>
    asPromise(
        ActionPoint.getBySubmission,
        submissionId
    );


// ======================================================
// DASHBOARD STATS
// ======================================================

const getDashboardStats = () =>
    asPromise(
        ActionPoint.getDashboardStats
    );


// ======================================================
// TRUTHY FLAG HELPER
// ======================================================

const isFlagEnabled = (value) => {

    if (Buffer.isBuffer(value)) {
        return (
            value.length > 0 &&
            value[0] === 1
        );
    }

    if (typeof value === "boolean") {
        return value;
    }

    return Number(value) === 1;
};


// ======================================================
// CREATE ACTION POINTS FROM NSO RULES
//
// This is the checklist/rule-engine flow.
//
// These Action Points MUST have:
// submission_id
// submission_answer_id
// ======================================================

const createFromRules = async (
    submission,
    matchedRules,
    userId
) => {

    const created = [];

    if (
        !matchedRules ||
        matchedRules.length === 0
    ) {
        return created;
    }

    for (const item of matchedRules) {

        const rule = item.rule;

        if (
            !isFlagEnabled(
                rule.create_action_point
            )
        ) {
            continue;
        }

        // --------------------------------------------------
        // RULE-BASED ACTION POINTS REQUIRE AN ANSWER
        // --------------------------------------------------

        if (!item.answer_id) {

            throw new Error(
                `Missing checklist submission answer ID for question ${item.question_id}.`
            );
        }

        // --------------------------------------------------
        // DEPARTMENT IDS
        // --------------------------------------------------

        const departmentIds =
            rule.department_ids
                ? String(rule.department_ids)
                    .split(",")
                    .map((id) => Number(id))
                    .filter(Boolean)
                : [];

        // --------------------------------------------------
        // ACTION POINT DATA
        // --------------------------------------------------

        const data = {

            submission_id:
                submission.id,

            submission_answer_id:
                item.answer_id,

            rule_id:
                rule.id || null,

            store_id:
                submission.store_id,

            department_id:
                departmentIds[0] || null,

            question_id:
                item.question_id,

            assigned_to:
                null,

            priority:
                rule.priority || "Medium",

            sla_value:
                Number(rule.sla_days) || 0,

            status:
                "Open",

            remarks:
                item.remarks || null,

            attachment:
                null,

            created_by:
                userId || null
        };

        // --------------------------------------------------
        // CREATE
        // --------------------------------------------------

        const result =
            await asPromise(
                ActionPoint.create,
                data
            );

        const actionPointId =
            result.insertId;

        created.push({
            id: actionPointId,
            ...data
        });

        console.log(
            `[ActionPointService] Action Point #${actionPointId} created for submission #${submission.id}, answer #${item.answer_id}, rule #${rule.id}.`
        );

        // --------------------------------------------------
        // ACTIVITY
        // --------------------------------------------------

        Activity.create(
            {
                title:
                    "Action Point Created",

                description:
                    `Action Point #${actionPointId} raised from rule "${rule.name || rule.id}" on submission #${submission.id}.`,

                module_name:
                    "Action Points",

                status:
                    "Open",

                priority:
                    data.priority,

                created_by:
                    userId,

                assigned_to:
                    null
            },

            () => {}
        );

        // --------------------------------------------------
        // AUDIT
        // --------------------------------------------------

        Audit.create(
            {
                module_name:
                    "Action Points",

                reference_id:
                    actionPointId,

                action:
                    "CREATE",

                old_data:
                    null,

                new_data:
                    data,

                changed_by:
                    userId
            },

            () => {}
        );
    }

    return created;
};


// ======================================================
// MANUAL CREATE
//
// IMPORTANT:
//
// submission_id          OPTIONAL
// submission_answer_id   OPTIONAL
//
// This allows:
//
// 1. Checklist Action Point
// 2. Manual Action Point
// ======================================================

const createManual = async (
    body,
    attachment,
    userId
) => {

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
        sla_value,
        sla_type,
        answer,
        remarks,
        status
    } = body;


    // ==================================================
    // NORMALIZE OPTIONAL VALUES
    // ==================================================

    const normalizedSubmissionId =
        submission_id === undefined ||
        submission_id === null ||
        submission_id === ""
            ? null
            : Number(submission_id);


    const normalizedSubmissionAnswerId =
        submission_answer_id === undefined ||
        submission_answer_id === null ||
        submission_answer_id === ""
            ? null
            : Number(submission_answer_id);


    const normalizedRuleId =
        rule_id === undefined ||
        rule_id === null ||
        rule_id === ""
            ? null
            : Number(rule_id);


    const normalizedStoreId =
        store_id === undefined ||
        store_id === null ||
        store_id === ""
            ? null
            : Number(store_id);


    const normalizedDepartmentId =
        department_id === undefined ||
        department_id === null ||
        department_id === ""
            ? null
            : Number(department_id);


    const normalizedQuestionId =
        question_id === undefined ||
        question_id === null ||
        question_id === ""
            ? null
            : Number(question_id);


    // ==================================================
    // REQUIRED FIELDS FOR MANUAL ACTION POINT
    // ==================================================

    if (!normalizedStoreId) {

        const err =
            new Error(
                "Store is required."
            );

        err.statusCode = 400;

        throw err;
    }


    if (!normalizedQuestionId) {

        const err =
            new Error(
                "Question is required."
            );

        err.statusCode = 400;

        throw err;
    }


    // ==================================================
    // SLA
    //
    // Support both:
    //
    // sla_days
    // sla_value
    // ==================================================

    let finalSlaValue = 0;

    if (
        sla_value !== undefined &&
        sla_value !== null &&
        sla_value !== ""
    ) {

        finalSlaValue =
            Number(sla_value) || 0;

    } else if (
        sla_days !== undefined &&
        sla_days !== null &&
        sla_days !== ""
    ) {

        finalSlaValue =
            Number(sla_days) || 0;
    }


    // ==================================================
    // BUILD ACTION POINT
    // ==================================================

    const actionPointData = {

        // ----------------------------------------------
        // OPTIONAL CHECKLIST FIELDS
        // ----------------------------------------------

        submission_id:
            normalizedSubmissionId,

        submission_answer_id:
            normalizedSubmissionAnswerId,

        rule_id:
            normalizedRuleId,


        // ----------------------------------------------
        // REQUIRED / MANUAL FIELDS
        // ----------------------------------------------

        store_id:
            normalizedStoreId,

        department_id:
            normalizedDepartmentId,

        question_id:
            normalizedQuestionId,


        // ----------------------------------------------
        // ASSIGNMENT
        // ----------------------------------------------

        assigned_to:
            assigned_to || null,


        // ----------------------------------------------
        // PRIORITY
        // ----------------------------------------------

        priority:
            priority || "Medium",


        // ----------------------------------------------
        // SLA
        // ----------------------------------------------

        sla_value:
            finalSlaValue,


        // ----------------------------------------------
        // STATUS
        // ----------------------------------------------

        status:
            status || "Open",


        // ----------------------------------------------
        // ANSWER
        //
        // Manual answer can be stored in remarks/
        // depending on your existing DB structure.
        // ----------------------------------------------

        answer:
            answer || null,


        // ----------------------------------------------
        // REMARKS
        // ----------------------------------------------

        remarks:
            remarks || "",


        // ----------------------------------------------
        // ATTACHMENT
        // ----------------------------------------------

        attachment:
            attachment || null,


        // ----------------------------------------------
        // CREATED BY
        // ----------------------------------------------

        created_by:
            userId || null
    };


    console.log(
        "[ActionPointService] Manual Action Point data:",
        {
            ...actionPointData
        }
    );


    // ==================================================
    // CREATE IN DATABASE
    // ==================================================

    const result =
        await asPromise(
            ActionPoint.create,
            actionPointData
        );


    const actionPointId =
        result.insertId;


    // ==================================================
    // ACTIVITY
    // ==================================================

    Activity.create(
        {
            title:
                "Action Point Created",

            description:
                `Action Point #${actionPointId} created manually.`,

            module_name:
                "Action Points",

            status:
                "Open",

            priority:
                actionPointData.priority,

            created_by:
                userId,

            assigned_to:
                actionPointData.assigned_to
        },

        () => {}
    );


    // ==================================================
    // AUDIT
    // ==================================================

    Audit.create(
        {
            module_name:
                "Action Points",

            reference_id:
                actionPointId,

            action:
                "CREATE",

            old_data:
                null,

            new_data:
                actionPointData,

            changed_by:
                userId
        },

        () => {}
    );


    // ==================================================
    // RETURN
    // ==================================================

    return {
        id: actionPointId
    };
};


// ======================================================
// UPDATE ACTION POINT
// ======================================================

const update = async (
    id,
    body,
    attachment,
    userId
) => {

    const {
        assigned_to,
        priority,
        sla_days,
        sla_value,
        remarks,
        status
    } = body;


    const oldData =
        await getById(id);


    if (!oldData) {

        const err =
            new Error(
                "Action Point not found."
            );

        err.statusCode = 404;

        throw err;
    }


    let finalSlaValue =
        oldData.sla_value;


    if (
        sla_value !== undefined &&
        sla_value !== null &&
        sla_value !== ""
    ) {

        finalSlaValue =
            Number(sla_value) ||
            oldData.sla_value;

    } else if (
        sla_days !== undefined &&
        sla_days !== null &&
        sla_days !== ""
    ) {

        finalSlaValue =
            Number(sla_days) ||
            oldData.sla_value;
    }


    const updateData = {

        assigned_to:
            assigned_to || null,

        priority:
            priority ||
            oldData.priority,

        sla_value:
            finalSlaValue,

        remarks:
            remarks !== undefined
                ? remarks
                : oldData.remarks,

        attachment:
            attachment ||
            oldData.attachment
    };


    await asPromise(
        ActionPoint.update,
        id,
        updateData
    );


    if (
        status &&
        status !== oldData.status
    ) {

        await asPromise(
            ActionPoint.updateStatus,
            id,
            status
        );
    }


    // ==================================================
    // ACTIVITY
    // ==================================================

    Activity.create(
        {
            title:
                "Action Point Updated",

            description:
                `Action Point #${id} updated.`,

            module_name:
                "Action Points",

            status:
                "Open",

            priority:
                updateData.priority,

            created_by:
                userId,

            assigned_to:
                updateData.assigned_to
        },

        () => {}
    );


    // ==================================================
    // AUDIT
    // ==================================================

    Audit.create(
        {
            module_name:
                "Action Points",

            reference_id:
                id,

            action:
                "UPDATE",

            old_data:
                oldData,

            new_data:
                {
                    ...oldData,
                    ...updateData,
                    status:
                        status ||
                        oldData.status
                },

            changed_by:
                userId
        },

        () => {}
    );


    return {
        success: true,

        message:
            "Action Point updated successfully."
    };
};


// ======================================================
// TAKE ACTION / CLOSE ACTION POINT
// ======================================================

const takeAction = async (
    id,
    body,
    userId
) => {

    const {
        action_taken,
        remarks,
        status
    } = body;


    if (!action_taken) {

        const err =
            new Error(
                "Action Taken is required."
            );

        err.statusCode = 400;

        throw err;
    }


    const oldData =
        await getById(id);


    if (!oldData) {

        const err =
            new Error(
                "Action Point not found."
            );

        err.statusCode = 404;

        throw err;
    }


    await asPromise(
        ActionPoint.takeAction,
        id,
        {
            action_taken,
            remarks,
            status:
                status || "Closed"
        }
    );


    // ==================================================
    // ACTIVITY
    // ==================================================

    Activity.create(
        {
            title:
                "Action Point Closed",

            description:
                `Action Point #${id} completed.`,

            module_name:
                "Action Points",

            status:
                "Closed",

            priority:
                oldData.priority,

            created_by:
                userId,

            assigned_to:
                oldData.assigned_to
        },

        () => {}
    );


    // ==================================================
    // AUDIT
    // ==================================================

    Audit.create(
        {
            module_name:
                "Action Points",

            reference_id:
                id,

            action:
                "TAKE_ACTION",

            old_data:
                oldData,

            new_data:
                {
                    action_taken,
                    remarks,
                    status:
                        status || "Closed"
                },

            changed_by:
                userId
        },

        () => {}
    );


    return {
        success: true,

        message:
            "Action Point completed successfully."
    };
};


// ======================================================
// DELETE ACTION POINT
// ======================================================

const deleteActionPoint = async (
    id,
    userId
) => {

    const oldData =
        await getById(id);


    if (!oldData) {

        const err =
            new Error(
                "Action Point not found."
            );

        err.statusCode = 404;

        throw err;
    }


    const result =
        await asPromise(
            ActionPoint.delete,
            id
        );


    if (
        result.affectedRows === 0
    ) {

        const err =
            new Error(
                "Action Point not found."
            );

        err.statusCode = 404;

        throw err;
    }


    // ==================================================
    // ACTIVITY
    // ==================================================

    Activity.create(
        {
            title:
                "Action Point Deleted",

            description:
                `Action Point #${id} deleted.`,

            module_name:
                "Action Points",

            status:
                "Closed",

            priority:
                oldData.priority,

            created_by:
                userId,

            assigned_to:
                oldData.assigned_to
        },

        () => {}
    );


    // ==================================================
    // AUDIT
    // ==================================================

    Audit.create(
        {
            module_name:
                "Action Points",

            reference_id:
                id,

            action:
                "DELETE",

            old_data:
                oldData,

            new_data:
                null,

            changed_by:
                userId
        },

        () => {}
    );


    return {
        success: true,

        message:
            "Action Point deleted successfully."
    };
};


// ======================================================
// DELETE ALL
// ======================================================

const deleteAll = async (
    userId
) => {

    const result =
        await asPromise(
            ActionPoint.deleteAll
        );


    // ==================================================
    // ACTIVITY
    // ==================================================

    Activity.create(
        {
            title:
                "All Action Points Deleted",

            description:
                "All Action Points removed.",

            module_name:
                "Action Points",

            status:
                "Closed",

            priority:
                "High",

            created_by:
                userId,

            assigned_to:
                null
        },

        () => {}
    );


    // ==================================================
    // AUDIT
    // ==================================================

    Audit.create(
        {
            module_name:
                "Action Points",

            reference_id:
                null,

            action:
                "DELETE_ALL",

            old_data:
                null,

            new_data:
                {
                    affectedRows:
                        result.affectedRows
                },

            changed_by:
                userId
        },

        () => {}
    );


    return {
        success: true,

        message:
            "All Action Points deleted successfully."
    };
};


// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = {

    // Rule-engine path
    createFromRules,

    // CRUD
    getAll,
    getById,
    exportData,
    getOpen,
    getBySubmission,
    getDashboardStats,

    // Manual creation
    createManual,

    // Update
    update,

    // Take action
    takeAction,

    // Delete
    delete: deleteActionPoint,

    // Delete all
    deleteAll
};