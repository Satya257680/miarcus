import React from "react";

import {
    FaProjectDiagram,
    FaCheckCircle,
    FaClock,
    FaCircle,
    FaUserTie,
    FaBuilding,
    FaUser
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


const formatDate = (value) => {

    if (!value) {
        return "";
    }

    const date =
        new Date(
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


const isCompleted = (value) => {

    if (!value) {
        return false;
    }

    const date =
        new Date(
            `${value}T00:00:00`
        );

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    return date <= today;

};


export default function TimelinePreview({

    formData,
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
                                formData[item.field];

                            const completed =
                                isCompleted(value);


                            return (

                                <div
                                    key={item.field}
                                    className="timeline-item"
                                >


                                    {/* ICON */}

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


                                    {/* CONTENT */}

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


                                    {
                                        index !==
                                        milestones.length - 1 && (

                                            <div className="timeline-line" />

                                        )
                                    }

                                </div>

                            );

                        }
                    )
                }

            </div>


            {/* ==================================================
               PROJECT OWNERSHIP
            ================================================== */}

            <div
                style={{
                    marginTop: "30px",
                    paddingTop: "24px",
                    borderTop: "1px solid #e2e8f0"
                }}
            >

                <div
                    style={{
                        marginBottom: "20px"
                    }}
                >

                    <h3
                        style={{
                            margin: 0,
                            color: "#1e293b",
                            fontSize: "18px"
                        }}
                    >
                        Project Ownership
                    </h3>

                    <p
                        style={{
                            margin: "6px 0 0",
                            color: "#64748b",
                            fontSize: "13px"
                        }}
                    >
                        Enter the responsible person or vendor for the project.
                    </p>

                </div>


                <div className="nso-form-grid">


                    {/* ==================================================
                       APPROVER
                    ================================================== */}

                    <div className="nso-form-group">

                        <label>

                            <FaUserTie />

                            Approver Name

                        </label>


                        <input
                            type="text"
                            name="approver_name"
                            value={
                                formData.approver_name || ""
                            }
                            onChange={handleChange}
                            placeholder="Enter approver name"
                        />

                    </div>


                    {/* ==================================================
                       CONSTRUCTION VENDOR
                    ================================================== */}

                    <div className="nso-form-group">

                        <label>

                            <FaBuilding />

                            Construction Vendor

                        </label>


                        <input
                            type="text"
                            name="construction_vendor"
                            value={
                                formData.construction_vendor || ""
                            }
                            onChange={handleChange}
                            placeholder="Enter construction vendor"
                        />

                    </div>


                    {/* ==================================================
                       PROJECT TAKEN BY
                    ================================================== */}

                    <div className="nso-form-group full-width">

                        <label>

                            <FaUser />

                            Project Taken By

                        </label>


                        <input
                            type="text"
                            name="project_taken_by"
                            value={
                                formData.project_taken_by || ""
                            }
                            onChange={handleChange}
                            placeholder="Enter responsible person"
                        />

                    </div>

                </div>

            </div>

        </div>

    );

}