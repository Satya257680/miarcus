import React from "react";
import {
    FaProjectDiagram,
    FaCheckCircle,
    FaClock,
    FaCircle
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";

const milestones = [

    {
        title: "Layout By NSO",
        field: "layout_by_nso"
    },

    {
        title: "Revised Layout",
        field: "revised_layout_by_nso"
    },

    {
        title: "Approval",
        field: "approval_deadline"
    },

    {
        title: "Visit By OP",
        field: "visit_by_op_team"
    },

    {
        title: "GST",
        field: "gst_deadline"
    },

    {
        title: "HR Hiring",
        field: "hr_hiring_deadline"
    },

    {
        title: "Team Training",
        field: "team_training_deadline"
    },

    {
        title: "NSO Visit",
        field: "visit_by_nso_team_deadline"
    },

    {
        title: "Plan Of Stock",
        field: "plan_of_stock_deadline"
    },

    {
        title: "Collaterals",
        field: "plan_of_collaterals_deadline"
    },

    {
        title: "Field Training",
        field: "on_field_training_deadline"
    },

    {
        title: "Dispatch",
        field: "dispatch_stock_deadline"
    },

    {
        title: "NSO Handover",
        field: "nso_handover_deadline"
    },

    {
        title: "VM Handover",
        field: "vm_handover_deadline"
    },

    {
        title: "Scanning",
        field: "scanning_deadline"
    },

    {
        title: "Billing",
        field: "billing_start_date"
    }

];

export default function TimelinePreview({

    formData

}) {

    const today = new Date();

    return (

        <div className="nso-card">

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

            <div className="timeline-list">

                {

                    milestones.map(

                        (

                            item,

                            index

                        ) => {

                            const value =

                                formData[item.field];

                            const completed =

                                value &&

                                new Date(value) <= today;

                            return (

                                <div

                                    key={item.field}

                                    className="timeline-item"

                                >

                                    <div className="timeline-icon">

                                        {

                                            completed ?

                                                <FaCheckCircle className="completed"/>

                                                :

                                                value ?

                                                    <FaClock className="pending"/>

                                                    :

                                                    <FaCircle className="waiting"/>

                                        }

                                    </div>

                                    <div className="timeline-content">

                                        <h4>

                                            {

                                                item.title

                                            }

                                        </h4>

                                        <span>

                                            {

                                                value ||

                                                "Not Generated"

                                            }

                                        </span>

                                    </div>

                                    {

                                        index !== milestones.length - 1 && (

                                            <div className="timeline-line"/>

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