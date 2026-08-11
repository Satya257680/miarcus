const NewStoreOpening = require("../models/newStoreOpeningModel");
const historyService = require("./nsoHistoryService");

// ======================================================
// NSO STATUS SERVICE
// ======================================================

const STATUS = {

    PLANNING: "Planning",

    LAYOUT_PENDING: "Layout Pending",

    APPROVAL_PENDING: "Approval Pending",

    CONSTRUCTION: "Construction",

    TRAINING: "Training",

    READY_FOR_OPENING: "Ready For Opening",

    OPENED: "Opened",

    COMPLETED: "Completed",

    ON_HOLD: "On Hold",

    CANCELLED: "Cancelled"

};

// ======================================================
// STATUS FLOW
// ======================================================

const STATUS_FLOW = [

    STATUS.PLANNING,

    STATUS.LAYOUT_PENDING,

    STATUS.APPROVAL_PENDING,

    STATUS.CONSTRUCTION,

    STATUS.TRAINING,

    STATUS.READY_FOR_OPENING,

    STATUS.OPENED,

    STATUS.COMPLETED

];

// ======================================================
// GET DEFAULT STATUS
// ======================================================

const getDefaultStatus = () => {

    return STATUS.PLANNING;

};

// ======================================================
// CHECK IF PROJECT IS COMPLETED
// ======================================================

const isCompleted = (project) => {

    return project.status === STATUS.COMPLETED;

};

// ======================================================
// CHECK IF PROJECT IS OPENED
// ======================================================

const isOpened = (project) => {

    return project.status === STATUS.OPENED;

};

// ======================================================
// CHECK IF PROJECT IS READY
// ======================================================

const isReadyForOpening = (project) => {

    return project.status === STATUS.READY_FOR_OPENING;

};

// ======================================================
// CHECK IF PROJECT IS CANCELLED
// ======================================================

const isCancelled = (project) => {

    return project.status === STATUS.CANCELLED;

};

// ======================================================
// CHECK IF PROJECT IS ON HOLD
// ======================================================

const isOnHold = (project) => {

    return project.status === STATUS.ON_HOLD;

};

// ======================================================
// CALCULATE PROJECT STATUS
// ======================================================

const calculateStatus = (project) => {

    if (

        !project ||

        !project.status

    ) {

        return STATUS.PLANNING;

    }

    if (

        Object.values(STATUS).includes(

            project.status

        )

    ) {

        return project.status;

    }

    return STATUS.PLANNING;

};

// ======================================================
// CHECK STATUS TRANSITION
// ======================================================

const canChangeStatus = (

    current,

    next

) => {

    if (

        next === STATUS.ON_HOLD ||

        next === STATUS.CANCELLED

    ) {

        return true;

    }

    // A failed inspection can place a project On Hold. A subsequent
    // clean inspection is explicitly allowed to return it to the
    // pre-opening gate.
    if (
        current === STATUS.ON_HOLD &&
        next === STATUS.READY_FOR_OPENING
    ) {

        return true;

    }

    const currentIndex =

        STATUS_FLOW.indexOf(

            current

        );

    const nextIndex =

        STATUS_FLOW.indexOf(

            next

        );

    if (

        currentIndex === -1 ||

        nextIndex === -1

    ) {

        return false;

    }

    return nextIndex >= currentIndex;

};

// ======================================================
// CHANGE STATUS
// ======================================================

const changeStatus = (

    project,

    newStatus

) => {

    if (

        !canChangeStatus(

            project.status,

            newStatus

        )

    ) {

        throw new Error(

            `Cannot change status from "${project.status}" to "${newStatus}".`

        );

    }

    project.status =

        newStatus;

    return project;

};
// ======================================================
// AVAILABLE STATUS LIST
// ======================================================

const getAvailableStatuses = (

    project

) => {

    const currentIndex =

        STATUS_FLOW.indexOf(

            project.status

        );

    if (

        currentIndex === -1

    ) {

        return STATUS_FLOW;

    }

    return STATUS_FLOW.slice(

        currentIndex

    );

};

// ======================================================
// CHECK IF PROJECT IS DELAYED
// ======================================================

const isDelayed = (project) => {

    if (

        !project ||

        isCompleted(project) ||

        isCancelled(project)

    ) {

        return false;

    }

    const today = new Date();

    const milestones = [

        project.layout_by_nso,

        project.revised_layout_by_nso,

        project.approval_deadline,

        project.visit_by_op_team,

        project.gst_deadline,

        project.hr_hiring_deadline,

        project.team_training_deadline,

        project.visit_by_nso_team_deadline,

        project.plan_of_stock_deadline,

        project.plan_of_collaterals_deadline,

        project.on_field_training_deadline,

        project.dispatch_stock_deadline,

        project.nso_handover_deadline,

        project.vm_handover_deadline,

        project.scanning_deadline

    ].filter(Boolean);

    return milestones.some(

        (

            milestone

        ) =>

            new Date(

                milestone

            ) < today

    );

};

// ======================================================
// CHECK IF PROJECT IS ACTIVE
// ======================================================

const isActive = (

    project

) => {

    return (

        !isCompleted(

            project

        ) &&

        !isCancelled(

            project

        )

    );

};

// ======================================================
// STATUS COLOR
// ======================================================

const getStatusColor = (

    status

) => {

    switch (

        status

    ) {

        case STATUS.PLANNING:

            return "#3b82f6";

        case STATUS.LAYOUT_PENDING:

            return "#8b5cf6";

        case STATUS.APPROVAL_PENDING:

            return "#6366f1";

        case STATUS.CONSTRUCTION:

            return "#f59e0b";

        case STATUS.TRAINING:

            return "#14b8a6";

        case STATUS.READY_FOR_OPENING:

            return "#22c55e";

        case STATUS.OPENED:

            return "#16a34a";

        case STATUS.COMPLETED:

            return "#15803d";

        case STATUS.ON_HOLD:

            return "#ef4444";

        case STATUS.CANCELLED:

            return "#6b7280";

        default:

            return "#6b7280";

    }

};

// ======================================================
// STATUS PROGRESS
// ======================================================

const getStatusProgress = (

    status

) => {

    switch (

        status

    ) {

        case STATUS.PLANNING:

            return 10;

        case STATUS.LAYOUT_PENDING:

            return 20;

        case STATUS.APPROVAL_PENDING:

            return 35;

        case STATUS.CONSTRUCTION:

            return 50;

        case STATUS.TRAINING:

            return 70;

        case STATUS.READY_FOR_OPENING:

            return 85;

        case STATUS.OPENED:

            return 95;

        case STATUS.COMPLETED:

            return 100;

        default:

            return 0;

    }

};

// ======================================================
// INSPECTION RESULT -> AUTHORITATIVE NSO STATUS
// ======================================================
//
// Phase 1C centralizes the business decision made after an
// inspection.  The checklist's nso_status remains only a
// backward-compatible checklist result; the NSO project's
// `new_store_openings.status` is the source of truth.
// ======================================================
const deriveInspectionStatus = (project, matchedRules = []) => {

    if (!project) {
        throw new Error("New Store Opening project not found.");
    }

    const hasFailures = Array.isArray(matchedRules) && matchedRules.length > 0;
    const current = project.status || STATUS.PLANNING;

    // Never regress a project that has already reached a terminal/business
    // milestone after the inspection. A failed inspection still records the
    // result, but does not move Completed/Cancelled projects backwards.
    if (current === STATUS.COMPLETED || current === STATUS.CANCELLED) {
        return current;
    }

    if (hasFailures) {
        return STATUS.ON_HOLD;
    }

    // A clean inspection clears an inspection-created hold. It also advances
    // pre-opening projects that have reached the inspection gate.
    if (
        current === STATUS.ON_HOLD ||
        current === STATUS.TRAINING ||
        current === STATUS.READY_FOR_OPENING
    ) {
        return STATUS.READY_FOR_OPENING;
    }

    return current;
};

const applyInspectionResult = async (
    projectId,
    matchedRules = [],
    userId = null
) => {

    if (!projectId) {
        return {
            changed: false,
            project_id: null,
            status: null,
            reason: "No NSO project is linked to this submission."
        };
    }

    const project = await new Promise((resolve, reject) => {
        NewStoreOpening.getById(projectId, (err, rows) => {
            if (err) return reject(err);
            // getById returns a single row through the model's callback contract.
            resolve(rows);
        });
    });

    if (!project) {
        throw new Error(`New Store Opening project #${projectId} not found.`);
    }

    const oldStatus = project.status || STATUS.PLANNING;
    const newStatus = deriveInspectionStatus(project, matchedRules);

    if (oldStatus === newStatus) {
        return {
            changed: false,
            project_id: Number(projectId),
            old_status: oldStatus,
            status: newStatus
        };
    }

    // Reuse the transition guard for every status mutation.
    changeStatus(project, newStatus);

    await new Promise((resolve, reject) => {
        NewStoreOpening.updateStatus(
            projectId,
            newStatus,
            userId,
            (err, result) => {
                if (err) return reject(err);
                if (!result || result.affectedRows === 0) {
                    return reject(new Error(`Unable to update NSO project #${projectId} status.`));
                }
                resolve(result);
            }
        );
    });

    try {
        await historyService.statusChanged(
            projectId,
            userId,
            oldStatus,
            newStatus
        );
    } catch (historyError) {
        // Status is already persisted; history failure must not make the
        // inspection look failed. It is logged for operational visibility.
        console.error("[NSO Status] Failed to write status history:", historyError);
    }

    return {
        changed: true,
        project_id: Number(projectId),
        old_status: oldStatus,
        status: newStatus
    };
};


// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = {

    STATUS,

    getDefaultStatus,

    calculateStatus,

    changeStatus,

    canChangeStatus,

    getAvailableStatuses,

    isCompleted,

    isOpened,

    isReadyForOpening,

    isCancelled,

    isOnHold,

    isDelayed,

    isActive,

    getStatusColor,

    getStatusProgress,

    deriveInspectionStatus,
    applyInspectionResult

};