import React from "react";

import {
    FaProjectDiagram,
    FaCheckCircle,
    FaClock,
    FaCircle
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


/* ======================================================
   TIMELINE MILESTONES
====================================================== */

const milestones = [

    {
        id: 1,
        title: "Layout By NSO",
        field: "layout_by_nso"
    },

    {
        id: 2,
        title: "Revised Layout",
        field: "revised_layout_by_nso"
    },

    {
        id: 3,
        title: "Approval",
        field: "approval_deadline"
    },

    {
        id: 4,
        title: "Visit By OP",
        field: "visit_by_op_team"
    },

    {
        id: 5,
        title: "GST",
        field: "gst_deadline"
    },

    {
        id: 6,
        title: "HR Hiring",
        field: "hr_hiring_deadline"
    },

    {
        id: 7,
        title: "Team Training",
        field: "team_training_deadline"
    },

    {
        id: 8,
        title: "NSO Visit",
        field: "visit_by_nso_team_deadline"
    },

    {
        id: 9,
        title: "Plan Of Stock",
        field: "plan_of_stock_deadline"
    },

    {
        id: 10,
        title: "Collaterals",
        field: "plan_of_collaterals_deadline"
    },

    {
        id: 11,
        title: "Field Training",
        field: "on_field_training_deadline"
    },

    {
        id: 12,
        title: "Dispatch",
        field: "dispatch_stock_deadline"
    },

    {
        id: 13,
        title: "NSO Handover",
        field: "nso_handover_deadline"
    },

    {
        id: 14,
        title: "VM Handover",
        field: "vm_handover_deadline"
    },

    {
        id: 15,
        title: "Scanning",
        field: "scanning_deadline"
    },

    {
        id: 16,
        title: "Billing",
        field: "billing_start_date"
    }

];


/* ======================================================
   FORMAT DATE
====================================================== */

const formatDate = (value) => {

    if (!value) {
        return "";
    }


    const date = new Date(
        `${value}T00:00:00`
    );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleDateString(
        "en-GB"
    );

};


/* ======================================================
   CHECK COMPLETION
====================================================== */

const isCompleted = (value) => {

    if (!value) {
        return false;
    }


    const date = new Date(
        `${value}T00:00:00`
    );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return false;

    }


    const today = new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    return date <= today;

};


/* ======================================================
   TIMELINE PREVIEW
====================================================== */

export default function TimelinePreview({

    formData = {},
    handleChange

}) {

    return (

        <div className="nso-card">


            {/* ==================================================
               HEADER
            ================================================== */}

            <div className="nso-card-header">

                <div>

                    <FaProjectDiagram />

                </div>


                <div>

                    <h2>
                        Project Timeline
                    </h2>

                    <p>
                        Automatically generated project milestones.
                    </p>

                </div>

            </div>


            {/* ==================================================
               TIMELINE
            ================================================== */}

            <div className="timeline-list">

                {
                    milestones.map(

                        (
                            item,
                            index
                        ) => {

                            const value =
                                formData?.[item.field];


                            const completed =
                                isCompleted(value);


                            return (

                                <div
                                    key={item.id}
                                    className="timeline-item"
                                >


                                    {/* ==================================================
                                       ICON
                                    ================================================== */}

                                    <div className="timeline-icon">

                                        {
                                            completed

                                                ? (

                                                    <FaCheckCircle
                                                        className="completed"
                                                    />

                                                )

                                                : value

                                                    ? (

                                                        <FaClock
                                                            className="pending"
                                                        />

                                                    )

                                                    : (

                                                        <FaCircle
                                                            className="waiting"
                                                        />

                                                    )
                                        }

                                    </div>


                                    {/* ==================================================
                                       CONTENT
                                    ================================================== */}

                                    <div className="timeline-content">

                                        <h4>

                                            {item.title}

                                        </h4>


                                        <span>

                                            {
                                                value
                                                    ? formatDate(value)
                                                    : "Not Generated"
                                            }

                                        </span>

                                    </div>


                                    {/* ==================================================
                                       CONNECTING LINE
                                    ================================================== */}

                                    {
                                        index <
                                        milestones.length - 1 && (

                                            <div
                                                className="timeline-line"
                                            />

                                        )
                                    }


                                </div>

                            );

                        }

                    )
                }

            </div>

        </div>

    );

}