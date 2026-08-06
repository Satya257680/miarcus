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
    // BUSINESS LOGIC
    // ------------------------------------------

    data = nsoService.calculateDealDays(

        data

    );

    data = nsoService.calculateDelay(

        data

    );

    data = timelineService.generateTimeline(

        data

    );

    // ------------------------------------------
    // DEFAULT STATUS
    // ------------------------------------------

    data.status =

        statusService.getDefaultStatus();

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
    // BUSINESS LOGIC
    // ------------------------------------------

    data = nsoService.calculateDealDays(

        data

    );

    data = nsoService.calculateDelay(

        data

    );

    data = timelineService.regenerateTimeline(

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

    const result =

        await nsoService.deleteProject(

            id,

            userId

        );

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

    const result =

        await nsoService.deleteAllProjects(

            userId

        );

    await historyService.createHistory(

        0,

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

    const preparedRecords = records.map(

        (

            project

        ) => {

            project = nsoService.calculateDealDays(

                project

            );

            project = nsoService.calculateDelay(

                project

            );

            project = timelineService.generateTimeline(

                project

            );

            project.status =

                statusService.getDefaultStatus();

            project.created_by =

                userId;

            project.updated_by =

                userId;

            return project;

        }

    );

    const result =

        await nsoService.bulkCreateProjects(

            preparedRecords

        );

    await historyService.bulkImported(

        userId,

        preparedRecords.length

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

    const oldStatus =

        project.status;

    // ------------------------------------------
    // CHANGE STATUS
    // ------------------------------------------

    project = statusService.changeStatus(

        project,

        newStatus

    );

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

    filters

) => {

    const response =

        await nsoService.getProjects(

            filters

        );

    const projects =

        response.data || [];

    return {

        total:

            projects.length,

        planning:

            projects.filter(

                (

                    project

                ) =>

                    project.status ===

                    statusService.STATUS.PLANNING

            ).length,

        readyForOpening:

            projects.filter(

                (

                    project

                ) =>

                    project.status ===

                    statusService.STATUS.READY_FOR_OPENING

            ).length,

        opened:

            projects.filter(

                (

                    project

                ) =>

                    project.status ===

                    statusService.STATUS.OPENED

            ).length,

        completed:

            projects.filter(

                (

                    project

                ) =>

                    project.status ===

                    statusService.STATUS.COMPLETED

            ).length,

        delayed:

            projects.filter(

                (

                    project

                ) =>

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