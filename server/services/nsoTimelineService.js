// ======================================================
// NSO TIMELINE SERVICE
// ======================================================

const TIMELINE = {

    LAYOUT_BY_NSO: 2,

    REVISED_LAYOUT: 2,

    APPROVAL: 3,

    OP_VISIT: 5,

    GST: 2,

    HR: 2,

    TRAINING: 7,

    STOCK: 5,

    ON_FIELD: 5,

    DISPATCH: 5,

    HANDOVER: 4,

    BILLING: 5

};

// ======================================================
// DATE HELPER
// ======================================================

const addDays = (

    date,

    days

) => {

    if (

        !date

    ) {

        return null;

    }

    const newDate =

        new Date(date);

    newDate.setDate(

        newDate.getDate() +

        Number(days)

    );

    return newDate

        .toISOString()

        .split("T")[0];

};

// ======================================================
// GET PROJECT START DATE
// ======================================================

const getProjectStartDate = (

    project

) => {

    return (

        project.actual_possession_date ||

        project.possession_date_broker ||

        project.possession_date_loi ||

        null

    );

};

// ======================================================
// GENERATE COMPLETE TIMELINE
// ======================================================

const generateTimeline = (

    project

) => {

    const data = {

        ...project

    };

    const startDate =

        getProjectStartDate(

            data

        );

    if (

        !startDate

    ) {

        return data;

    }

    // ----------------------------------------
    // PLANNING
    // ----------------------------------------

    data.layout_by_nso =

        addDays(

            startDate,

            TIMELINE.LAYOUT_BY_NSO

        );

    data.revised_layout_by_nso =

        addDays(

            data.layout_by_nso,

            TIMELINE.REVISED_LAYOUT

        );

    // ----------------------------------------
    // APPROVAL
    // ----------------------------------------

    data.approval_deadline =

        addDays(

            data.revised_layout_by_nso,

            TIMELINE.APPROVAL

        );

    // ----------------------------------------
    // EXECUTION
    // ----------------------------------------

    data.visit_by_op_team =

        addDays(

            data.approval_deadline,

            TIMELINE.OP_VISIT

        );

    // ----------------------------------------
    // COMPLIANCE
    // ----------------------------------------

    data.gst_deadline =

        addDays(

            data.visit_by_op_team,

            TIMELINE.GST

        );

    data.hr_hiring_deadline =

        addDays(

            data.gst_deadline,

            TIMELINE.HR

        );

    // ----------------------------------------
    // TRAINING
    // ----------------------------------------

    data.team_training_deadline =

        addDays(

            data.hr_hiring_deadline,

            TIMELINE.TRAINING

        );

    data.visit_by_nso_team_deadline =

        data.team_training_deadline;

    // ----------------------------------------
    // STORE READY
    // ----------------------------------------

    data.plan_of_stock_deadline =

        addDays(

            data.visit_by_nso_team_deadline,

            TIMELINE.STOCK

        );

    data.plan_of_collaterals_deadline =

        data.plan_of_stock_deadline;

    data.on_field_training_deadline =

        addDays(

            data.plan_of_collaterals_deadline,

            TIMELINE.ON_FIELD

        );

    // ----------------------------------------
    // HANDOVER
    // ----------------------------------------

    data.dispatch_stock_deadline =

        addDays(

            data.on_field_training_deadline,

            TIMELINE.DISPATCH

        );

    data.nso_handover_deadline =

        addDays(

            data.dispatch_stock_deadline,

            TIMELINE.HANDOVER

        );

    data.vm_handover_deadline =

        data.nso_handover_deadline;

    data.scanning_deadline =

        data.vm_handover_deadline;

    data.billing_start_date =

        addDays(

            data.scanning_deadline,

            TIMELINE.BILLING

        );

    return data;

};

// ======================================================
// GET ALL MILESTONES
// ======================================================

const getMilestones = (

    project

) => {

    return [

        {
            key: "layout_by_nso",

            title: "Layout By NSO",

            date: project.layout_by_nso
        },

        {
            key: "revised_layout_by_nso",

            title: "Revised Layout",

            date: project.revised_layout_by_nso
        },

        {
            key: "approval_deadline",

            title: "Approval",

            date: project.approval_deadline
        },

        {
            key: "visit_by_op_team",

            title: "OP Team Visit",

            date: project.visit_by_op_team
        },

        {
            key: "gst_deadline",

            title: "GST",

            date: project.gst_deadline
        },

        {
            key: "hr_hiring_deadline",

            title: "HR Hiring",

            date: project.hr_hiring_deadline
        },

        {
            key: "team_training_deadline",

            title: "Team Training",

            date: project.team_training_deadline
        },

        {
            key: "visit_by_nso_team_deadline",

            title: "NSO Team Visit",

            date: project.visit_by_nso_team_deadline
        },

        {
            key: "plan_of_stock_deadline",

            title: "Plan Of Stock",

            date: project.plan_of_stock_deadline
        },

        {
            key: "plan_of_collaterals_deadline",

            title: "Plan Of Collaterals",

            date: project.plan_of_collaterals_deadline
        },

        {
            key: "on_field_training_deadline",

            title: "On Field Training",

            date: project.on_field_training_deadline
        },

        {
            key: "dispatch_stock_deadline",

            title: "Dispatch Stock",

            date: project.dispatch_stock_deadline
        },

        {
            key: "nso_handover_deadline",

            title: "NSO Handover",

            date: project.nso_handover_deadline
        },

        {
            key: "vm_handover_deadline",

            title: "VM Handover",

            date: project.vm_handover_deadline
        },

        {
            key: "scanning_deadline",

            title: "Scanning",

            date: project.scanning_deadline
        },

        {
            key: "billing_start_date",

            title: "Billing Start",

            date: project.billing_start_date
        }

    ];

};
// ======================================================
// CALCULATE TIMELINE PROGRESS
// ======================================================

const calculateTimelineProgress = (

    project

) => {

    const milestones =

        getMilestones(

            project

        );

    const today =

        new Date();

    const completed =

        milestones.filter(

            (

                milestone

            ) =>

                milestone.date &&

                new Date(

                    milestone.date

                ) <= today

        ).length;

    const total =

        milestones.length;

    return {

        total,

        completed,

        pending:

            total - completed,

        percentage:

            total === 0

                ? 0

                : Math.round(

                    (completed / total) * 100

                )

    };

};

// ======================================================
// GET CURRENT MILESTONE
// ======================================================

const getCurrentMilestone = (

    project

) => {

    const today =

        new Date();

    const milestones =

        getMilestones(

            project

        );

    return (

        milestones.find(

            (

                milestone

            ) =>

                milestone.date &&

                new Date(

                    milestone.date

                ) >= today

        ) ||

        milestones[

            milestones.length - 1

        ] ||

        null

    );

};

// ======================================================
// GET NEXT UPCOMING MILESTONE
// ======================================================

const getUpcomingMilestone = (

    project

) => {

    const today =

        new Date();

    return (

        getMilestones(

            project

        ).find(

            (

                milestone

            ) =>

                milestone.date &&

                new Date(

                    milestone.date

                ) > today

        ) ||

        null

    );

};

// ======================================================
// CHECK IF TIMELINE IS DELAYED
// ======================================================

const isTimelineDelayed = (

    project

) => {

    if (

        !project

    ) {

        return false;

    }

    if (

        project.status ===

            "Completed" ||

        project.status ===

            "Cancelled"

    ) {

        return false;

    }

    const today =

        new Date();

    return getMilestones(

        project

    ).some(

        (

            milestone

        ) =>

            milestone.date &&

            new Date(

                milestone.date

            ) < today

    );

};

// ======================================================
// GET DELAYED MILESTONES
// ======================================================

const getDelayedMilestones = (

    project

) => {

    if (

        !project

    ) {

        return [];

    }

    const today =

        new Date();

    return getMilestones(

        project

    ).filter(

        (

            milestone

        ) =>

            milestone.date &&

            new Date(

                milestone.date

            ) < today

    );

};

// ======================================================
// GET NEXT DEADLINE
// ======================================================

const getNextDeadline = (

    project

) => {

    const upcoming =

        getUpcomingMilestone(

            project

        );

    if (

        !upcoming

    ) {

        return null;

    }

    return {

        milestone:

            upcoming.title,

        date:

            upcoming.date

    };

};


// ======================================================
// REGENERATE TIMELINE
// ======================================================

const regenerateTimeline = (

    project

) => {


    return generateTimeline({

        ...project

    });


};


// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = {

    generateTimeline,

    regenerateTimeline,

    getMilestones,

    calculateTimelineProgress,

    getCurrentMilestone,

    getUpcomingMilestone,

    getNextDeadline,

    getDelayedMilestones,

    isTimelineDelayed

};