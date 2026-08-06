const db = require("../config/db");

// ======================================================
// MODELS
// ======================================================

const ActionPoint = require("../models/actionPointModel");

const Activity = require("../models/activityModel");

const Audit = require("../models/auditModel");

// ======================================================
// CREATE ACTION POINTS
// ======================================================

const createActionPoints = (

    submission,

    matchedRules,

    userId

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            // ==========================================
            // NO MATCHED RULES
            // ==========================================

            if (

                matchedRules.length === 0

            ) {

                return resolve([]);

            }

            const createdActionPoints = [];

            let completed = 0;

            // ==========================================
            // LOOP RULES
            // ==========================================

            matchedRules.forEach(

                (

                    item

                ) => {

                    const rule = item.rule;

                    // ==================================
                    // CREATE ACTION POINT ?
                    // ==================================

                    if (

                        Number(

                            rule.create_action_point

                        ) !== 1

                    ) {

                        completed++;

                        if (

                            completed ===

                            matchedRules.length

                        ) {

                            resolve(

                                createdActionPoints

                            );

                        }

                        return;

                    }

                    // ==================================
                    // DEPARTMENT
                    // ==================================

                    const departmentIds =

                        rule.department_ids

                            ? rule.department_ids

                                  .split(",")

                                  .map(Number)

                            : [];

                    const data = {

                        submission_id:

                            submission.id,

                        submission_answer_id:

                            item.answer_id ||

                            null,

                        rule_id:

                            rule.id,

                        store_id:

                            submission.store_id,

                        department_id:

                            departmentIds[0] ||

                            null,

                        question_id:

                            item.question_id,

                        assigned_to:

                            null,

                        answer:

                            item.answer,

                        comment:

                            item.remarks,

                        attachment:

                            null,

                        status:

                            "Open",

                        priority:

                            rule.priority ||

                            "Medium",

                        sla_value:

                            rule.sla_days ||

                            0,

                        sla_type:

                            "Days",

                        created_by:

                            userId

                    };
                                        // ==================================
                    // CREATE ACTION POINT
                    // ==================================

                    ActionPoint.create(

                        data,

                        (

                            err,

                            result

                        ) => {

                            if (

                                err

                            ) {

                                console.log(

                                    "====================================="

                                );

                                console.log(

                                    "ACTION POINT INSERT ERROR"

                                );

                                console.log(

                                    err

                                );

                                console.log(

                                    data

                                );

                                console.log(

                                    "====================================="

                                );

                                return reject(

                                    err

                                );

                            }

                            console.log(

                                "====================================="

                            );

                            console.log(

                                "ACTION POINT CREATED"

                            );

                            console.log(

                                "Action Point ID:",

                                result.insertId

                            );

                            console.log(

                                "Submission ID:",

                                submission.id

                            );

                            console.log(

                                "Question ID:",

                                item.question_id

                            );

                            console.log(

                                "====================================="

                            );

                            createdActionPoints.push({

                                id:

                                    result.insertId,

                                submission_id:

                                    submission.id,

                                question_id:

                                    item.question_id,

                                rule_id:

                                    rule.id,

                                priority:

                                    rule.priority,

                                status:

                                    "Open"

                            });

                            completed++;

                            if (

                                completed ===

                                matchedRules.length

                            ) {

                                resolve(

                                    createdActionPoints

                                );

                            }

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// UPDATE ACTION POINT
// ======================================================

const updateActionPoint = (

    id,

    data,

    userId

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            ActionPoint.update(

                id,

                {

                    assigned_to:

                        data.assigned_to ||

                        null,

                    priority:

                        data.priority ||

                        "Medium",

                    status:

                        data.status ||

                        "Open",

                    answer:

                        data.answer ||

                        "",

                    comment:

                        data.comment ||

                        "",

                    attachment:

                        data.attachment ||

                        null,

                    sla_value:

                        Number(

                            data.sla_value

                        ) || 0,

                    sla_type:

                        data.sla_type ||

                        "Days"

                },

                (

                    err

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    // ==================================
                    // ACTIVITY
                    // ==================================

                    Activity.create(

                        {

                            title:

                                "Action Point Updated",

                            description:

                                `Action Point #${id} updated successfully.`,

                            module_name:

                                "Action Points",

                            status:

                                data.status ||

                                "Open",

                            priority:

                                data.priority ||

                                "Medium",

                            created_by:

                                userId,

                            assigned_to:

                                data.assigned_to ||

                                null

                        },

                        () => {}

                    );

                    // ==================================
                    // AUDIT
                    // ==================================

                    Audit.create(

                        {

                            module_name:

                                "Action Points",

                            reference_id:

                                id,

                            action:

                                "UPDATE",

                            old_data:

                                null,

                            new_data:

                                data,

                            changed_by:

                                userId

                        },

                        () => {}

                    );

                    resolve({

                        success: true,

                        message:

                            "Action Point updated successfully."

                    });

                }

            );

        }

    );

};
// ======================================================
// TAKE ACTION / CLOSE ACTION POINT
// ======================================================

const takeAction = (

    id,

    data,

    userId

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            ActionPoint.takeAction(

                id,

                {

                    action_taken:

                        data.action_taken ||

                        "",

                    comment:

                        data.comment ||

                        "",

                    attachment:

                        data.attachment ||

                        null,

                    status:

                        "Closed",

                    completed_at:

                        new Date()

                },

                (

                    err

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    // ==================================
                    // ACTIVITY
                    // ==================================

                    Activity.create(

                        {

                            title:

                                "Action Point Closed",

                            description:

                                `Action Point #${id} has been closed.`,

                            module_name:

                                "Action Points",

                            status:

                                "Closed",

                            priority:

                                "Medium",

                            created_by:

                                userId,

                            assigned_to:

                                null

                        },

                        () => {}

                    );

                    // ==================================
                    // AUDIT
                    // ==================================

                    Audit.create(

                        {

                            module_name:

                                "Action Points",

                            reference_id:

                                id,

                            action:

                                "CLOSE",

                            old_data:

                                null,

                            new_data:

                                {

                                    action_taken:

                                        data.action_taken,

                                    comment:

                                        data.comment,

                                    completed_at:

                                        new Date()

                                },

                            changed_by:

                                userId

                        },

                        () => {}

                    );

                    resolve({

                        success: true,

                        message:

                            "Action Point closed successfully."

                    });

                }

            );

        }

    );

};
// ======================================================
// DELETE ACTION POINT
// ======================================================

const deleteActionPoint = (

    id,

    userId

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            ActionPoint.delete(

                id,

                (

                    err

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    // ==================================
                    // ACTIVITY
                    // ==================================

                    Activity.create(

                        {

                            title:

                                "Action Point Deleted",

                            description:

                                `Action Point #${id} deleted successfully.`,

                            module_name:

                                "Action Points",

                            status:

                                "Deleted",

                            priority:

                                "Medium",

                            created_by:

                                userId,

                            assigned_to:

                                null

                        },

                        () => {}

                    );

                    // ==================================
                    // AUDIT
                    // ==================================

                    Audit.create(

                        {

                            module_name:

                                "Action Points",

                            reference_id:

                                id,

                            action:

                                "DELETE",

                            old_data:

                                null,

                            new_data:

                                {

                                    deleted: true

                                },

                            changed_by:

                                userId

                        },

                        () => {}

                    );

                    resolve({

                        success: true,

                        message:

                            "Action Point deleted successfully."

                    });

                }

            );

        }

    );

};
// ======================================================
// GET OPEN ACTION POINTS
// ======================================================

const getOpenActionPoints = () => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            ActionPoint.getOpenActionPoints(

                (

                    err,

                    rows

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    resolve(

                        rows || []

                    );

                }

            );

        }

    );

};


// ======================================================
// EXPORT ACTION POINTS
// ======================================================

const exportActionPoints = (

    filters = {}

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            ActionPoint.exportData(

                filters,

                (

                    err,

                    rows

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    resolve(

                        rows || []

                    );

                }

            );

        }

    );

};


// ======================================================
// GET ACTION POINT BY ID
// ======================================================

const getActionPointById = (

    id

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            ActionPoint.getById(

                id,

                (

                    err,

                    row

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    resolve(

                        row || null

                    );

                }

            );

        }

    );

};


// ======================================================
// GET ALL ACTION POINTS
// ======================================================

const getAllActionPoints = (

    filters

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            ActionPoint.getAll(

                filters,

                (

                    err,

                    result

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    resolve(

                        result

                    );

                }

            );

        }

    );

};
// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = {

    // ======================================
    // CREATE
    // ======================================

    createActionPoints,

    // ======================================
    // UPDATE
    // ======================================

    updateActionPoint,

    // ======================================
    // TAKE ACTION
    // ======================================

    takeAction,

    // ======================================
    // DELETE
    // ======================================

    deleteActionPoint,

    // ======================================
    // GET ALL
    // ======================================

    getAllActionPoints,

    // ======================================
    // GET BY ID
    // ======================================

    getActionPointById,

    // ======================================
    // OPEN ACTION POINTS
    // ======================================

    getOpenActionPoints,

    // ======================================
    // EXPORT
    // ======================================

    exportActionPoints

};