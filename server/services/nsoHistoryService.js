const NSOTracking = require("../models/nsoTrackingModel");

const { logActivity } = require("../utils/activityLogger");

// ======================================================
// CONSTANTS
// ======================================================

const MODULE_NAME = "New Store Openings";

// IMPORTANT:
// activities.reference_id is NOT NULL in the database.
//
// For module-level actions such as:
// - Delete All
// - Bulk Import
// - Module-level activity
//
// there is no single project ID.
//
// Therefore we use 0 instead of NULL.
//
// nso_tracking.new_store_opening_id is different:
// it must ONLY receive a real project ID.
// ======================================================

const MODULE_REFERENCE_ID = 0;


// ======================================================
// NORMALIZE PROJECT ID
// ======================================================

const normalizeProjectId = (projectId) => {

    const id = Number(projectId);

    if (
        Number.isInteger(id) &&
        id > 0
    ) {

        return id;

    }

    return null;

};


// ======================================================
// NORMALIZE USER ID
// ======================================================

const normalizeUserId = (userId) => {

    const id = Number(userId);

    if (
        Number.isInteger(id) &&
        id > 0
    ) {

        return id;

    }

    return null;

};


// ======================================================
// CREATE NSO TRACKING ENTRY
// ======================================================

const createTrackingEntry = async (
    projectId,
    userId,
    description,
    extra = {}
) => {

    // ------------------------------------------
    // VALID PROJECT ID
    // ------------------------------------------

    const trackingProjectId =
        normalizeProjectId(projectId);


    // ------------------------------------------
    // NO PROJECT = NO TRACKING
    // ------------------------------------------

    if (
        trackingProjectId === null
    ) {

        return null;

    }


    // ------------------------------------------
    // CHECK MODEL
    // ------------------------------------------

    if (
        !NSOTracking ||
        typeof NSOTracking.create !== "function"
    ) {

        console.warn(
            "NSO Tracking model create() is not available."
        );

        return null;

    }


    // ------------------------------------------
    // USER ID
    // ------------------------------------------

    const trackingUserId =
        normalizeUserId(userId);


    // ------------------------------------------
    // TRACKING DATA
    // ------------------------------------------

    const trackingData = {

        new_store_opening_id:
            trackingProjectId,

        status:
            extra.status ||
            null,

        remarks:
            description ||
            null,

        created_by:
            trackingUserId,

        updated_by:
            trackingUserId

    };


    // ------------------------------------------
    // CREATE
    // ------------------------------------------

    return new Promise(
        (
            resolve,
            reject
        ) => {

            NSOTracking.create(
                trackingData,

                (
                    error,
                    result
                ) => {

                    if (error) {

                        console.error(
                            "NSO Tracking Error:",
                            error
                        );

                        return reject(
                            error
                        );

                    }

                    return resolve(
                        result
                    );

                }
            );

        }
    );

};


// ======================================================
// CREATE ACTIVITY LOG
// ======================================================

const createActivity = async (
    projectId,
    userId,
    action,
    description,
    extra = {}
) => {

    // ------------------------------------------
    // NORMALIZE
    // ------------------------------------------

    const normalizedProjectId =
        normalizeProjectId(projectId);

    const normalizedUserId =
        normalizeUserId(userId);


    // ------------------------------------------
    // IMPORTANT
    //
    // activities.reference_id is NOT NULL.
    //
    // For module-level events:
    // projectId = null
    //
    // therefore use:
    // reference_id = 0
    // ------------------------------------------

    const referenceId =
        normalizedProjectId !== null
            ? normalizedProjectId
            : MODULE_REFERENCE_ID;


    // ------------------------------------------
    // CHECK LOGGER
    // ------------------------------------------

    if (
        typeof logActivity !== "function"
    ) {

        console.warn(
            "activityLogger.logActivity is not available."
        );

        return null;

    }


    // ------------------------------------------
    // ACTIVITY DATA
    // ------------------------------------------

    const activity = {

        // --------------------------------------
        // ACTIVITY TYPE
        // --------------------------------------

        activity_type:
            action ||
            "NSO Activity",


        // --------------------------------------
        // REFERENCE ID
        // --------------------------------------

        reference_id:
            referenceId,


        // --------------------------------------
        // TITLE
        // --------------------------------------

        title:
            action ||
            "NSO Activity",


        // --------------------------------------
        // DESCRIPTION
        // --------------------------------------

        description:
            description ||
            "",


        // --------------------------------------
        // MODULE
        // --------------------------------------

        module_name:
            MODULE_NAME,


        // --------------------------------------
        // STATUS
        // --------------------------------------

        status:
            extra.activityStatus ||
            "Open",


        // --------------------------------------
        // PRIORITY
        // --------------------------------------

        priority:
            extra.priority ||
            "Medium",


        // --------------------------------------
        // CREATED BY
        // --------------------------------------

        created_by:
            normalizedUserId,


        // --------------------------------------
        // ASSIGNED TO
        // --------------------------------------

        assigned_to:
            normalizeUserId(
                extra.assigned_to
            )

    };


    // ------------------------------------------
    // LOG
    // ------------------------------------------

    return logActivity(
        activity
    );

};


// ======================================================
// CREATE HISTORY
// ======================================================
//
// Handles:
//
// 1. NSO Tracking
// 2. Activity Log
//
// IMPORTANT:
//
// A real project ID:
//     -> creates NSO tracking
//     -> creates activity
//
// No project ID:
//     -> skips NSO tracking
//     -> creates activity with reference_id = 0
//
// This prevents:
//
// Column 'new_store_opening_id' cannot be null
//
// AND:
//
// Column 'reference_id' cannot be null
//
// ======================================================

const createHistory = async (
    projectId,
    userId,
    action,
    description,
    extra = {}
) => {

    try {

        // ------------------------------------------
        // NORMALIZE
        // ------------------------------------------

        const normalizedProjectId =
            normalizeProjectId(
                projectId
            );

        const normalizedUserId =
            normalizeUserId(
                userId
            );


        // ------------------------------------------
        // VALIDATE ACTION
        // ------------------------------------------

        if (
            !action ||
            String(action).trim() === ""
        ) {

            throw new Error(
                "History action is required."
            );

        }


        // ------------------------------------------
        // CREATE NSO TRACKING
        //
        // ONLY when a real project exists.
        // ------------------------------------------

        if (
            normalizedProjectId !== null
        ) {

            await createTrackingEntry(

                normalizedProjectId,

                normalizedUserId,

                description,

                extra

            );

        }


        // ------------------------------------------
        // CREATE ACTIVITY
        //
        // Always create activity.
        //
        // Module-level events use reference_id = 0.
        // ------------------------------------------

        await createActivity(

            normalizedProjectId,

            normalizedUserId,

            action,

            description,

            extra

        );


        // ------------------------------------------
        // SUCCESS
        // ------------------------------------------

        return {

            success: true,

            projectId:
                normalizedProjectId,

            referenceId:
                normalizedProjectId !== null
                    ? normalizedProjectId
                    : MODULE_REFERENCE_ID,

            action

        };

    }
    catch (
        error
    ) {

        console.error(
            "Create History Error:",
            error
        );

        throw error;

    }

};


// ======================================================
// CREATE ACTIVITY ONLY
// ======================================================
//
// Used for:
//
// - Delete All
// - Bulk Import
// - Other module-level actions
//
// IMPORTANT:
//
// This function intentionally does NOT create
// an nso_tracking record.
//
// It uses reference_id = 0 because the activities
// table requires reference_id to be NOT NULL.
//
// ======================================================

const createActivityOnly = async (
    userId,
    action,
    description,
    extra = {}
) => {

    try {

        // ------------------------------------------
        // VALIDATE ACTION
        // ------------------------------------------

        if (
            !action ||
            String(action).trim() === ""
        ) {

            throw new Error(
                "Activity action is required."
            );

        }


        // ------------------------------------------
        // CREATE MODULE ACTIVITY
        // ------------------------------------------

        await createActivity(

            null,

            userId,

            action,

            description,

            extra

        );


        // ------------------------------------------
        // SUCCESS
        // ------------------------------------------

        return {

            success: true,

            referenceId:
                MODULE_REFERENCE_ID,

            action

        };

    }
    catch (
        error
    ) {

        console.error(
            "Create Activity Only Error:",
            error
        );

        throw error;

    }

};


// ======================================================
// PROJECT CREATED
// ======================================================

const projectCreated = async (
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

const projectUpdated = async (
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

const statusChanged = async (
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

const timelineUpdated = async (
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

const projectDeleted = async (
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

const inspectionCompleted = async (
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

const actionPointCreated = async (
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

const checklistSubmitted = async (
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

const projectOpened = async (
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

const projectCompleted = async (
    projectId,
    userId
) => {

    return createHistory(

        projectId,

        userId,

        "Completed",

        "Project completed successfully.",

        {

            status:
                "Completed"

        }

    );

};


// ======================================================
// BULK IMPORTED
// ======================================================
//
// IMPORTANT:
//
// Bulk import is a module-level event.
//
// There is no single project ID.
//
// Therefore:
//
// NO nso_tracking row.
//
// Activity:
//
// reference_id = 0
//
// ======================================================

const bulkImported = async (
    userId,
    total
) => {

    return createActivityOnly(

        userId,

        "Bulk Import",

        `${total} New Store Opening project(s) imported.`

    );

};


// ======================================================
// DELETE ALL
// ======================================================
//
// Module-level event.
//
// NO nso_tracking row.
//
// Activity:
//
// reference_id = 0
//
// ======================================================

const deleteAll = async (
    userId,
    total = 0
) => {

    const message =
        total > 0
            ? `Deleted all ${total} New Store Opening project(s).`
            : "Deleted all New Store Opening projects.";


    return createActivityOnly(

        userId,

        "Delete All",

        message

    );

};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    // ------------------------------------------
    // CORE
    // ------------------------------------------

    createHistory,

    createActivityOnly,


    // ------------------------------------------
    // PROJECT EVENTS
    // ------------------------------------------

    projectCreated,

    projectUpdated,

    projectDeleted,

    projectCompleted,

    projectOpened,


    // ------------------------------------------
    // STATUS
    // ------------------------------------------

    statusChanged,


    // ------------------------------------------
    // TIMELINE
    // ------------------------------------------

    timelineUpdated,


    // ------------------------------------------
    // INSPECTION
    // ------------------------------------------

    inspectionCompleted,


    // ------------------------------------------
    // ACTION POINT
    // ------------------------------------------

    actionPointCreated,


    // ------------------------------------------
    // CHECKLIST
    // ------------------------------------------

    checklistSubmitted,


    // ------------------------------------------
    // BULK
    // ------------------------------------------

    bulkImported,


    // ------------------------------------------
    // DELETE ALL
    // ------------------------------------------

    deleteAll

};