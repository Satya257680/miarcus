import React from "react";

import {
    FaCalendarAlt,
    FaUserTie,
    FaBuilding,
    FaUsers,
    FaClipboardCheck,
    FaUser,
    FaHardHat
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


export default function PossessionDetails({

    formData,

    errors,

    handleChange

}) {

    return (

        <div className="nso-card">


            {/* ==================================================
               HEADER
            ================================================== */}

            <div className="nso-card-header">

                <div>

                    <FaClipboardCheck />

                </div>


                <div>

                    <h2>
                        Possession & Assignment
                    </h2>

                    <p>
                        Define project ownership and possession milestones.
                    </p>

                </div>

            </div>


            {/* ==================================================
               POSSESSION & ASSIGNMENT
            ================================================== */}

            <div className="nso-form-grid">


                {/* ==================================================
                   POSSESSION DATE - LOI
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaCalendarAlt />

                        Possession Date (LOI)

                    </label>


                    <input
                        type="date"
                        name="possession_date_loi"
                        value={
                            formData.possession_date_loi || ""
                        }
                        onChange={handleChange}
                    />


                    {
                        errors?.possession_date_loi && (

                            <span className="error-text">

                                {
                                    errors.possession_date_loi
                                }

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                   BROKER POSSESSION
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaCalendarAlt />

                        Broker Possession Date

                    </label>


                    <input
                        type="date"
                        name="possession_date_broker"
                        value={
                            formData.possession_date_broker || ""
                        }
                        onChange={handleChange}
                    />

                </div>


                {/* ==================================================
                   ACTUAL POSSESSION
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaCalendarAlt />

                        Actual Possession Date

                    </label>


                    <input
                        type="date"
                        name="actual_possession_date"
                        value={
                            formData.actual_possession_date || ""
                        }
                        onChange={handleChange}
                    />

                </div>


                {/* ==================================================
                   RECEIVED BY NSO
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaBuilding />

                        Received By NSO

                    </label>


                    <input
                        type="date"
                        name="received_by_nso"
                        value={
                            formData.received_by_nso || ""
                        }
                        onChange={handleChange}
                    />

                </div>


                {/* ==================================================
                   BROKER
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaUserTie />

                        Broker Name

                    </label>


                    <input
                        type="text"
                        name="broker_name"
                        value={
                            formData.broker_name || ""
                        }
                        onChange={handleChange}
                        placeholder="Broker Name"
                    />

                </div>


                {/* ==================================================
                   OPERATION HEAD
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaUsers />

                        Operation Head

                    </label>


                    <input
                        type="text"
                        name="operation_head_assigned"
                        value={
                            formData.operation_head_assigned || ""
                        }
                        onChange={handleChange}
                        placeholder="Operation Head"
                    />

                </div>


                {/* ==================================================
                   ASM
                ================================================== */}

                <div className="nso-form-group full-width">

                    <label>

                        <FaUsers />

                        ASM Assigned

                    </label>


                    <input
                        type="text"
                        name="asm_assigned"
                        value={
                            formData.asm_assigned || ""
                        }
                        onChange={handleChange}
                        placeholder="Area Sales Manager"
                    />

                </div>


            </div>


            {/* ==================================================
               PROJECT OWNERSHIP
            ================================================== */}

            <div
                style={{
                    marginTop: "32px",
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
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "#1e293b"
                        }}
                    >
                        Project Ownership
                    </h3>


                    <p
                        style={{
                            margin: "5px 0 0",
                            fontSize: "13px",
                            color: "#64748b"
                        }}
                    >
                        Enter the responsible person or vendor for the project.
                    </p>

                </div>


                <div className="nso-form-grid">


                    {/* ==================================================
                       APPROVER NAME
                    ================================================== */}

                    <div className="nso-form-group">

                        <label>

                            <FaUser />

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


                        {
                            errors?.approver_name && (

                                <span className="error-text">

                                    {
                                        errors.approver_name
                                    }

                                </span>

                            )
                        }

                    </div>


                    {/* ==================================================
                       CONSTRUCTION VENDOR
                    ================================================== */}

                    <div className="nso-form-group">

                        <label>

                            <FaHardHat />

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


                        {
                            errors?.construction_vendor && (

                                <span className="error-text">

                                    {
                                        errors.construction_vendor
                                    }

                                </span>

                            )
                        }

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


                        {
                            errors?.project_taken_by && (

                                <span className="error-text">

                                    {
                                        errors.project_taken_by
                                    }

                                </span>

                            )
                        }

                    </div>


                </div>

            </div>


        </div>

    );

}