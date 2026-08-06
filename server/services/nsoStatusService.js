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

    getStatusProgress

};