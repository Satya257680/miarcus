const nsoService = require("./nsoService");

const timelineService = require("./nsoTimelineService");

const statusService = require("./nsoStatusService");

const historyService = require("./nsoHistoryService");
const nsoEmailService = require("./nsoEmailService");
const NewStoreOpening = require("../models/newStoreOpeningModel");

const toYmd = (value) => {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const raw = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
};

const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const isCompletedStatus = (value) => ["opened", "completed"].includes(String(value || "").trim().toLowerCase());
const reached = (value) => Boolean(toYmd(value) && toYmd(value) <= todayInIndia());

const applyOpeningLifecycle = (data, existing = null) => {
    const actualOpening = toYmd(data.actual_store_opening_date);
    const oldSource = String(existing?.status_source || data.status_source || "automatic").toLowerCase();
    const oldStatus = String(existing?.status || "Planning");
    const requestedSource = String(data.status_source || "").toLowerCase();
    const existingSource = String(existing?.status_source || "").toLowerCase();
    let source = String(
        existing && requestedSource && requestedSource !== existingSource
            ? requestedSource
            : (existingSource || requestedSource || oldSource || "automatic")
    ).toLowerCase();
    let beforeAuto = existing?.status_before_auto_opening || data.status_before_auto_opening || null;
    let status = String(data.status || oldStatus || "Planning");

    // A status explicitly marked complete by a person is sticky until that
    // person changes it. A recorded actual opening date drives automatic completion.
    if (isCompletedStatus(status) && oldSource !== "automatic" && !existing) source = "manual";
    if (existing && isCompletedStatus(data.status) && !isCompletedStatus(existing.status)) source = "manual";
    if (source === "manual" && isCompletedStatus(status)) {
        data.status = status;
    } else if (actualOpening && reached(actualOpening)) {
        if (!isCompletedStatus(oldStatus) || oldSource !== "automatic") beforeAuto = oldStatus;
        status = "Opened";
        source = "automatic";
        data.status = status;
    } else {
        if (oldSource === "automatic" && isCompletedStatus(oldStatus)) {
            status = beforeAuto || (toYmd(data.billing_start_date) && toYmd(data.billing_start_date) < todayInIndia() ? "Planning" : "Planning");
        }
        if (source !== "manual" || !isCompletedStatus(status)) source = "automatic";
        data.status = status;
        if (!actualOpening) beforeAuto = null;
    }
    data.actual_store_opening_date = actualOpening || null;
    data.status_source = source;
    data.status_before_auto_opening = beforeAuto;
    return data;
};



// ======================================================
// CREATE WORKFLOW
// ======================================================

const createWorkflow = async (
    data,
    userId,
    file
) => {

    // ------------------------------------------
    // VALIDATE DATA
    // ------------------------------------------

    if (!data) {

        throw new Error(
            "New Store Opening data is required."
        );

    }

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    // ------------------------------------------
    // BUSINESS LOGIC
    // ------------------------------------------

    data =
        nsoService.calculateDealDays(
            data
        );

    data =
        nsoService.calculateDelay(
            data
        );

    data =
        timelineService.generateTimeline(
            data
        );


    // ------------------------------------------
    // DEFAULT STATUS
    // ------------------------------------------

    data.status =
        statusService.getDefaultStatus();


    // ------------------------------------------
    // AUDIT USER
    // ------------------------------------------

    data.created_by =
        userId;

    data.updated_by =
        userId;


    // ------------------------------------------
    // CREATE PROJECT
    // ------------------------------------------

    data = applyOpeningLifecycle(data, null);

    const lifecycleStatus = data.status;
    const project =
        await nsoService.createProject(
            data,
            userId,
            file
        );

    // createProject sets the initial status to Planning; restore the lifecycle
    // result when saving the new opening-date metadata.
    data.status = lifecycleStatus;
    if (project?.id) await NewStoreOpening.updateLifecycleMeta(project.id, data);


    // ------------------------------------------
    // VALIDATE CREATED PROJECT
    // ------------------------------------------

    if (
        !project ||
        !project.id
    ) {

        throw new Error(
            "New Store Opening was created but no valid project ID was returned."
        );

    }


    // ------------------------------------------
    // HISTORY
    // ------------------------------------------

    await historyService.projectCreated(
        project.id,
        userId
    );

    try {
        await nsoEmailService.sendProjectNotification(project.id, "created");
    } catch (emailError) {
        console.error("NSO create email notification failed:", emailError.message || emailError);
    }


    return project;

};


// ======================================================
// UPDATE WORKFLOW
// ======================================================

const updateWorkflow = async (
    id,
    data,
    userId,
    file
) => {

    // ------------------------------------------
    // VALIDATE
    // ------------------------------------------

    if (!id) {

        throw new Error(
            "Project ID is required."
        );

    }

    if (!data) {

        throw new Error(
            "New Store Opening data is required."
        );

    }

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    // ------------------------------------------
    // LOAD EXISTING STATUS SOURCE BEFORE RECOMPUTING
    // ------------------------------------------
    const existing = await nsoService.getProjectById(id);

    // ------------------------------------------
    // BUSINESS LOGIC
    // ------------------------------------------

    data =
        nsoService.calculateDealDays(
            data
        );

    data =
        nsoService.calculateDelay(
            data
        );

    data =
        timelineService.regenerateTimeline(
            data
        );


    // ------------------------------------------
    // STATUS + OPENING-DATE LIFECYCLE
    // ------------------------------------------

    data = applyOpeningLifecycle(data, existing);
    if (!isCompletedStatus(data.status) && !["On Hold", "Cancelled"].includes(data.status)) {
        data.status = statusService.calculateStatus(data);
    }


    // ------------------------------------------
    // AUDIT USER
    // ------------------------------------------

    data.updated_by =
        userId;


    // ------------------------------------------
    // UPDATE PROJECT
    // ------------------------------------------

    const result =
        await nsoService.updateProject(
            id,
            data,
            userId,
            file
        );

    await NewStoreOpening.updateLifecycleMeta(id, data);


    // ------------------------------------------
    // HISTORY
    // ------------------------------------------

    await historyService.projectUpdated(
        id,
        userId
    );

    try {
        await nsoEmailService.sendProjectNotification(id, "updated");
    } catch (emailError) {
        console.error("NSO update email notification failed:", emailError.message || emailError);
    }


    return result;

};


// ======================================================
// DELETE WORKFLOW
// ======================================================

const deleteWorkflow = async (
    id,
    userId
) => {

    // ------------------------------------------
    // VALIDATE
    // ------------------------------------------

    if (!id) {

        throw new Error(
            "Project ID is required."
        );

    }

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    // ------------------------------------------
    // DELETE PROJECT
    // ------------------------------------------

    const result =
        await nsoService.deleteProject(
            id,
            userId
        );


    // ------------------------------------------
    // HISTORY
    // ------------------------------------------

    await historyService.projectDeleted(
        id,
        userId
    );


    return result;

};


// ======================================================
// DELETE ALL WORKFLOW
// ======================================================

const deleteAllWorkflow = async (
    userId
) => {

    // ------------------------------------------
    // VALIDATE
    // ------------------------------------------

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    // ------------------------------------------
    // DELETE ALL PROJECTS
    // ------------------------------------------

    const result =
        await nsoService.deleteAllProjects(
            userId
        );


    // ------------------------------------------
    // ACTIVITY HISTORY ONLY
    // ------------------------------------------
    //
    // There is no single project ID here.
    //
    // DO NOT send projectId = 0 to nso_tracking.
    //
    // nso_tracking.new_store_opening_id is NOT NULL.
    //
    // Passing null allows nsoHistoryService to create
    // the activity log without creating NSO tracking.
    //
    // ------------------------------------------

    await historyService.createHistory(
        null,
        userId,
        "Delete All",
        "Deleted all New Store Opening projects."
    );


    return result;

};


// ======================================================
// EXPORT WORKFLOW
// ======================================================

const exportWorkflow = async () => {

    return nsoService.exportProjects();

};


// ======================================================
// BULK IMPORT WORKFLOW
// ======================================================

const bulkImportWorkflow = async (
    records,
    userId,
    options = {}
) => {

    // ------------------------------------------
    // VALIDATE
    // ------------------------------------------

    if (
        !Array.isArray(records) ||
        records.length === 0
    ) {

        throw new Error(
            "No records available for bulk import."
        );

    }

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    // ------------------------------------------
    // PREPARE RECORDS
    // ------------------------------------------

    const preparedRecords =
        records.map(
            (project) => {

                let preparedProject =
                    nsoService.calculateDealDays(
                        project
                    );


                preparedProject =
                    nsoService.calculateDelay(
                        preparedProject
                    );


                preparedProject =
                    timelineService.generateTimeline(
                        preparedProject
                    );


                // ----------------------------------
                // DEFAULT STATUS
                // ----------------------------------

                preparedProject.status =
                    statusService.getDefaultStatus();


                // ----------------------------------
                // AUDIT USER
                // ----------------------------------

                preparedProject.created_by =
                    userId;

                preparedProject.updated_by =
                    userId;


                return preparedProject;

            }
        );


    // ------------------------------------------
    // BULK CREATE
    // ------------------------------------------

    const result =
        await nsoService.bulkCreateProjects(
            preparedRecords
        );


    // ------------------------------------------
    // ACTIVITY HISTORY ONLY
    // ------------------------------------------
    //
    // Bulk import creates multiple projects.
    // There is no single project ID.
    //
    // Therefore do NOT create an nso_tracking
    // record with projectId = 0.
    //
    // Passing null creates only the activity log.
    //
    // ------------------------------------------

    // The global bulk-upload engine saves one row at a time and writes
    // a single history entry for the whole file itself (skipHistory).
    if (!options.skipHistory) {
        await historyService.createHistory(
            null,
            userId,
            "Bulk Import",
            `${preparedRecords.length} New Store Opening project(s) imported.`
        );
    }


    return result;

};


// ======================================================
// CHANGE PROJECT STATUS
// ======================================================

const changeProjectStatus = async (
    id,
    project,
    newStatus,
    userId
) => {

    // ------------------------------------------
    // VALIDATE
    // ------------------------------------------

    if (!id) {

        throw new Error(
            "Project ID is required."
        );

    }

    if (!project) {

        throw new Error(
            "Project data is required."
        );

    }

    if (!newStatus) {

        throw new Error(
            "New status is required."
        );

    }

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    // ------------------------------------------
    // OLD STATUS
    // ------------------------------------------

    const oldStatus =
        project.status;


    // ------------------------------------------
    // CHANGE STATUS
    // ------------------------------------------

    project =
        statusService.changeStatus(
            project,
            newStatus
        );


    // ------------------------------------------
    // AUDIT USER
    // ------------------------------------------

    project.updated_by =
        userId;


    // ------------------------------------------
    // UPDATE PROJECT
    // ------------------------------------------

    await nsoService.updateProject(
        id,
        project,
        userId,
        null
    );


    // ------------------------------------------
    // HISTORY
    // ------------------------------------------

    await historyService.statusChanged(
        id,
        userId,
        oldStatus,
        newStatus
    );


    return {

        success: true,

        message:
            "Project status updated successfully."

    };

};


// ======================================================
// COMPLETE PROJECT
// ======================================================

const completeProject = async (
    id,
    project,
    userId
) => {

    return changeProjectStatus(
        id,
        project,
        statusService.STATUS.COMPLETED,
        userId
    );

};


// ======================================================
// GET DASHBOARD SUMMARY
// ======================================================

const getDashboardSummary = async (
    filters = {}
) => {

    const response =
        await nsoService.getProjects(
            filters
        );


    // ------------------------------------------
    // NORMALIZE PROJECT DATA
    // ------------------------------------------

    const projects =
        Array.isArray(response)
            ? response
            : (
                response &&
                Array.isArray(response.data)
                    ? response.data
                    : []
            );


    // ------------------------------------------
    // SUMMARY
    // ------------------------------------------

    return {

        total:
            projects.length,


        planning:
            projects.filter(
                (project) =>
                    project.status ===
                    statusService.STATUS.PLANNING
            ).length,


        readyForOpening:
            projects.filter(
                (project) =>
                    project.status ===
                    statusService.STATUS.READY_FOR_OPENING
            ).length,


        opened:
            projects.filter(
                (project) =>
                    project.status ===
                    statusService.STATUS.OPENED
            ).length,


        completed:
            projects.filter(
                (project) =>
                    project.status ===
                    statusService.STATUS.COMPLETED
            ).length,


        delayed:
            projects.filter(
                (project) =>
                    statusService.isDelayed(
                        project
                    )
            ).length

    };

};


// ======================================================
// MODULE EXPORTS
// ======================================================

// Exposed for the bulk importer's single history entry.
const createImportHistory = (userId, count) =>
    historyService.createHistory(
        null,
        userId,
        "Bulk Import",
        `${count} New Store Opening project(s) imported.`
    );

module.exports = {
    createImportHistory,

    createWorkflow,

    updateWorkflow,

    deleteWorkflow,

    deleteAllWorkflow,

    exportWorkflow,

    bulkImportWorkflow,

    changeProjectStatus,

    completeProject,

    getDashboardSummary

};