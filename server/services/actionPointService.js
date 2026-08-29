const db = require("../config/db");
const ActionPoint = require("../models/actionPointModel");
const Activity = require("../models/activityModel");
const Audit = require("../models/auditModel");
const Notification = require("./notificationService");

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


const queryOne = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows?.[0] || null);
        });
    });


// Resolve references for global/bulk uploads. A bulk file can contain
// multiple stores, and checklist-based rows do not need to repeat Store ID
// when Submission ID is supplied because the submission already identifies
// the store.
const resolveGlobalReferences = async (data) => {
    const resolved = { ...data };

    const hasValue = (value) =>
        value !== undefined && value !== null && String(value).trim() !== "";

    // 1. Resolve Store ID from a store name/code when the global file
    // provides a human-readable Store/Store Name instead of an ID.
    const numericStoreId = hasValue(resolved.store_id)
        ? Number(resolved.store_id)
        : NaN;

    if ((!Number.isFinite(numericStoreId) || numericStoreId <= 0) && hasValue(resolved.store_name)) {
        const store = await queryOne(
            `SELECT id
             FROM stores
             WHERE store_name = ? OR store_code = ?
             LIMIT 1`,
            [String(resolved.store_name).trim(), String(resolved.store_name).trim()]
        );

        if (store?.id) {
            resolved.store_id = store.id;
        }
    }

    // 2. Resolve Store ID from the checklist submission. A submission already
    // identifies its store, so Store ID is optional for checklist-based rows.
    if (!hasValue(resolved.store_id) && hasValue(resolved.submission_id)) {
        const submission = await queryOne(
            `SELECT store_id FROM checklist_submissions WHERE id = ? LIMIT 1`,
            [Number(resolved.submission_id)]
        );

        if (submission?.store_id) {
            resolved.store_id = submission.store_id;
        }
    }

    // 3. Resolve Question ID from the submission answer when omitted.
    if (!hasValue(resolved.question_id) && hasValue(resolved.submission_answer_id)) {
        const answer = await queryOne(
            `SELECT question_id, submission_id
             FROM checklist_submission_answers
             WHERE id = ? LIMIT 1`,
            [Number(resolved.submission_answer_id)]
        );

        if (answer?.question_id) {
            resolved.question_id = answer.question_id;
        }

        if (!hasValue(resolved.submission_id) && answer?.submission_id) {
            resolved.submission_id = answer.submission_id;
        }
    }

    // 4. Resolve Question ID from Question text when supplied.
    // Question is optional for manual/bulk Action Points. If the uploaded
    // file contains a matching question, use it; otherwise leave question_id
    // NULL and still allow the Action Point to be created.
    if (!hasValue(resolved.question_id) && hasValue(resolved.question)) {
        const question = await queryOne(
            `SELECT id
             FROM questions
             WHERE question = ?
             LIMIT 1`,
            [String(resolved.question).trim()]
        );

        if (question?.id) {
            resolved.question_id = question.id;
        }
    }

    // 5. If Department ID is omitted, use the first department configured
    // for the question. This keeps the global upload useful while preserving
    // the existing optional department field.
    if (!hasValue(resolved.department_id) && hasValue(resolved.question_id)) {
        const department = await queryOne(
            `SELECT department_id
             FROM question_departments
             WHERE question_id = ?
             ORDER BY department_id ASC
             LIMIT 1`,
            [Number(resolved.question_id)]
        );

        if (department?.department_id) {
            resolved.department_id = department.department_id;
        }
    }

    return resolved;
};


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

            sla_minutes:
                Number(rule.sla_minutes) ||
                (() => {
                    const value = Number(item.question_sla_value) || 0;
                    const unit = String(item.question_sla_unit || "").toLowerCase();
                    if (value <= 0) return (Number(rule.sla_days) || 0) * 24 * 60;
                    if (unit.includes("minute")) return Math.round(value);
                    if (unit.includes("hour")) return Math.round(value * 60);
                    return Math.round(value * 24 * 60);
                })(),

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
        store_name,
        department_id,
        question_id,
        assigned_to,
        priority,
        sla_days,
        sla_value,
        sla_type,
        sla_hours,
        sla_minutes,
        answer,
        remarks,
        status
    } = body;


    // ==================================================
    // GLOBAL/BULK REFERENCE RESOLUTION
    // ==================================================

    // When a bulk row comes from a checklist submission, Store ID can be
    // omitted safely because it is available on checklist_submissions.
    const resolvedBody = await resolveGlobalReferences({
        ...body,
        store_name
    });

    const resolvedStoreId = resolvedBody.store_id;

    // ==================================================
    // NORMALIZE OPTIONAL VALUES
    // ==================================================

    const normalizedSubmissionId =
        resolvedBody.submission_id === undefined ||
        resolvedBody.submission_id === null ||
        resolvedBody.submission_id === ""
            ? null
            : Number(resolvedBody.submission_id);


    const normalizedSubmissionAnswerId =
        resolvedBody.submission_answer_id === undefined ||
        resolvedBody.submission_answer_id === null ||
        resolvedBody.submission_answer_id === ""
            ? null
            : Number(resolvedBody.submission_answer_id);


    const normalizedRuleId =
        rule_id === undefined ||
        rule_id === null ||
        rule_id === ""
            ? null
            : Number(rule_id);


    const normalizedStoreId =
        resolvedStoreId === undefined ||
        resolvedStoreId === null ||
        resolvedStoreId === ""
            ? null
            : Number(resolvedStoreId);


    const normalizedDepartmentId =
        resolvedBody.department_id === undefined ||
        resolvedBody.department_id === null ||
        resolvedBody.department_id === ""
            ? null
            : Number(resolvedBody.department_id);


    const normalizedQuestionId =
        resolvedBody.question_id === undefined ||
        resolvedBody.question_id === null ||
        resolvedBody.question_id === ""
            ? null
            : Number(resolvedBody.question_id);


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


    // Question is intentionally OPTIONAL.
    //
    // Manual and bulk Action Points may be created without a checklist
    // question. Checklist/rule-generated Action Points still provide their
    // question_id through createFromRules().
    //
    // Do not reject the row when question_id is missing.


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
        finalSlaValue = Number(sla_value) || 0;
    } else if (
        sla_days !== undefined &&
        sla_days !== null &&
        sla_days !== ""
    ) {
        finalSlaValue = Number(sla_days) || 0;
    }

    // Keep an exact countdown duration while retaining sla_value as the
    // legacy/day value used by existing Action Point records.
    const hasSlaParts =
        sla_days !== undefined ||
        sla_hours !== undefined ||
        sla_minutes !== undefined;

    let finalSlaMinutes = 0;

    if (hasSlaParts) {
        finalSlaMinutes =
            (Number(sla_days) || 0) * 24 * 60 +
            (Number(sla_hours) || 0) * 60 +
            (Number(sla_minutes) || 0);
    }

    if (finalSlaMinutes <= 0 && finalSlaValue > 0) {
        finalSlaMinutes = finalSlaValue * 24 * 60;
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
        finalSlaValue = Number(sla_value) || oldData.sla_value;
    } else if (
        sla_days !== undefined &&
        sla_days !== null &&
        sla_days !== ""
    ) {
        finalSlaValue = Number(sla_days) || oldData.sla_value;
    }

    let finalSlaMinutes =
        Number(oldData.sla_minutes) ||
        (Number(oldData.sla_value) || 0) * 24 * 60;

    if (
        sla_days !== undefined ||
        sla_hours !== undefined ||
        sla_minutes !== undefined
    ) {
        finalSlaMinutes =
            (Number(sla_days) || 0) * 24 * 60 +
            (Number(sla_hours) || 0) * 60 +
            (Number(sla_minutes) || 0);
    }


    const updateData = {

        assigned_to:
            assigned_to || null,

        priority:
            priority ||
            oldData.priority,

        sla_value:
            finalSlaValue,

        sla_minutes:
            finalSlaMinutes,

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

    // Notify the checklist submitter after the Action Point has actually
    // been closed. The related answer is then visible in Checklist Reports.
    try {
        if (oldData?.submission_id) {
            const recipients = new Set();
            const submissionRows = await db.query(
                `SELECT submitted_by FROM checklist_submissions WHERE id = ? LIMIT 1`,
                [oldData.submission_id]
            );
            const submitterId = Number(submissionRows?.[0]?.submitted_by || 0);
            if (submitterId > 0) recipients.add(submitterId);
            if (Number(oldData.assigned_to) > 0) recipients.add(Number(oldData.assigned_to));

            await Notification.createForUsers([...recipients], {
                title: "Action Point Completed",
                message: `Action Point #${id} has been completed. The related checklist answer is now available in Checklist Reports.`,
                module_name: "Checklist Reports",
                action_name: "Completed",
                entity_id: oldData.submission_id,
                link: "/checklist-reports",
                type: "success"
            });
        }
    } catch (notificationError) {
        console.error("Action Point completion notification error:", notificationError.message);
    }


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