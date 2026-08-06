const NSOTracking = require("../models/nsoTrackingModel");

const { logActivity } = require("../utils/activityLogger");

// ======================================================
// CREATE HISTORY
// ======================================================

const createHistory = (

    projectId,

    userId,

    action,

    description,

    extra = {}

) => {

    return new Promise(

        async (

            resolve,

            reject

        ) => {

            try {

                // ==========================================
                // NSO TRACKING
                // ==========================================

                if (

                    NSOTracking &&

                    NSOTracking.create

                ) {

                    await new Promise(

                        (

                            res,

                            rej

                        ) => {

                            NSOTracking.create(

                                {

                                    new_store_opening_id:

                                        projectId,

                                    status:

                                        extra.status ||

                                        null,

                                    remarks:

                                        description,

                                    created_by:

                                        userId

                                },

                                (

                                    err

                                ) => {

                                    if (

                                        err

                                    ) {

                                        return rej(

                                            err

                                        );

                                    }

                                    return res();

                                }

                            );

                        }

                    );

                }

                // ==========================================
                // ACTIVITY LOG
                // ==========================================

                if (

                    logActivity

                ) {

                    await logActivity({

                        user_id:

                            userId,

                        module:

                            "New Store Openings",

                        action,

                        reference_id:

                            projectId,

                        description

                    });

                }

                return resolve(

                    true

                );

            }

            catch (

                error

            ) {

                return reject(

                    error

                );

            }

        }

    );

};

// ======================================================
// PROJECT CREATED
// ======================================================

const projectCreated = (

    projectId,

    userId

) => {

    return createHistory(

        projectId,

        userId,

        "Created",

        "New Store Opening created.",

        {

            status:

                "Planning"

        }

    );

};

// ======================================================
// PROJECT UPDATED
// ======================================================

const projectUpdated = (

    projectId,

    userId

) => {

    return createHistory(

        projectId,

        userId,

        "Updated",

        "Project information updated."

    );

};

// ======================================================
// STATUS CHANGED
// ======================================================

const statusChanged = (

    projectId,

    userId,

    oldStatus,

    newStatus

) => {

    return createHistory(

        projectId,

        userId,

        "Status Changed",

        `Status changed from "${oldStatus}" to "${newStatus}".`,

        {

            status:

                newStatus

        }

    );

};
// ======================================================
// TIMELINE UPDATED
// ======================================================

const timelineUpdated = (

    projectId,

    userId

) => {

    return createHistory(

        projectId,

        userId,

        "Timeline Updated",

        "Project timeline regenerated."

    );

};

// ======================================================
// PROJECT DELETED
// ======================================================

const projectDeleted = (

    projectId,

    userId

) => {

    return createHistory(

        projectId,

        userId,

        "Deleted",

        "Project deleted."

    );

};

// ======================================================
// INSPECTION COMPLETED
// ======================================================

const inspectionCompleted = (

    projectId,

    userId,

    score

) => {

    return createHistory(

        projectId,

        userId,

        "Inspection Completed",

        `Inspection completed with score ${score}.`

    );

};

// ======================================================
// ACTION POINT CREATED
// ======================================================

const actionPointCreated = (

    projectId,

    userId,

    count = 1

) => {

    return createHistory(

        projectId,

        userId,

        "Action Point",

        `${count} Action Point(s) generated.`

    );

};

// ======================================================
// CHECKLIST SUBMITTED
// ======================================================

const checklistSubmitted = (

    projectId,

    userId

) => {

    return createHistory(

        projectId,

        userId,

        "Checklist Submitted",

        "Checklist submitted successfully."

    );

};

// ======================================================
// PROJECT OPENED
// ======================================================

const projectOpened = (

    projectId,

    userId

) => {

    return createHistory(

        projectId,

        userId,

        "Store Opened",

        "Store opening completed."

    );

};

// ======================================================
// PROJECT COMPLETED
// ======================================================

const projectCompleted = (

    projectId,

    userId

) => {

    return createHistory(

        projectId,

        userId,

        "Completed",

        "Project completed successfully."

    );

};

// ======================================================
// BULK IMPORTED
// ======================================================

const bulkImported = (

    userId,

    total

) => {

    return createHistory(

        0,

        userId,

        "Bulk Import",

        `${total} New Store Opening project(s) imported.`

    );

};

// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = {

    createHistory,

    projectCreated,

    projectUpdated,

    statusChanged,

    timelineUpdated,

    projectDeleted,

    inspectionCompleted,

    actionPointCreated,

    checklistSubmitted,

    projectOpened,

    projectCompleted,

    bulkImported

};