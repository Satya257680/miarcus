const nsoService = require("./nsoService");

const timelineService = require("./nsoTimelineService");

const statusService = require("./nsoStatusService");

const historyService = require("./nsoHistoryService");


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

    const project =
        await nsoService.createProject(
            data,
            userId,
            file
        );


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
    // STATUS
    // ------------------------------------------

    data.status =
        statusService.calculateStatus(
            data
        );


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


    // ------------------------------------------
    // HISTORY
    // ------------------------------------------

    await historyService.projectUpdated(
        id,
        userId
    );


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
    userId
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

    await historyService.createHistory(
        null,
        userId,
        "Bulk Import",
        `${preparedRecords.length} New Store Opening project(s) imported.`
    );


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

module.exports = {

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