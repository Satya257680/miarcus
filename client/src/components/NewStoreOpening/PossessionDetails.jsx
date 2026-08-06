import React from "react";
import {
    FaCalendarAlt,
    FaUserTie,
    FaBuilding,
    FaUsers,
    FaClipboardCheck
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";

export default function PossessionDetails({

    formData,

    errors,

    handleChange

}) {

    return (

        <div className="nso-card">

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

            <div className="nso-form-grid">

                {/* LOI Date */}

                <div className="nso-form-group">

                    <label>

                        <FaCalendarAlt />

                        Possession Date (LOI)

                    </label>

                    <input

                        type="date"

                        name="possession_date_loi"

                        value={formData.possession_date_loi || ""}

                        onChange={handleChange}

                    />

                    {

                        errors.possession_date_loi && (

                            <span className="error-text">

                                {errors.possession_date_loi}

                            </span>

                        )

                    }

                </div>

                {/* Broker Date */}

                <div className="nso-form-group">

                    <label>

                        <FaCalendarAlt />

                        Broker Possession Date

                    </label>

                    <input

                        type="date"

                        name="possession_date_broker"

                        value={formData.possession_date_broker || ""}

                        onChange={handleChange}

                    />

                </div>

                {/* Actual Date */}

                <div className="nso-form-group">

                    <label>

                        <FaCalendarAlt />

                        Actual Possession Date

                    </label>

                    <input

                        type="date"

                        name="actual_possession_date"

                        value={formData.actual_possession_date || ""}

                        onChange={handleChange}

                    />

                </div>

                {/* Received By NSO */}

                <div className="nso-form-group">

                    <label>

                        <FaBuilding />

                        Received By NSO

                    </label>

                    <input

                        type="date"

                        name="received_by_nso"

                        value={formData.received_by_nso || ""}

                        onChange={handleChange}

                    />

                </div>

                {/* Broker */}

                <div className="nso-form-group">

                    <label>

                        <FaUserTie />

                        Broker Name

                    </label>

                    <input

                        type="text"

                        name="broker_name"

                        value={formData.broker_name || ""}

                        onChange={handleChange}

                        placeholder="Broker Name"

                    />

                </div>

                {/* Operation Head */}

                <div className="nso-form-group">

                    <label>

                        <FaUsers />

                        Operation Head

                    </label>

                    <input

                        type="text"

                        name="operation_head_assigned"

                        value={formData.operation_head_assigned || ""}

                        onChange={handleChange}

                        placeholder="Operation Head"

                    />

                </div>

                {/* ASM */}

                <div className="nso-form-group full-width">

                    <label>

                        <FaUsers />

                        ASM Assigned

                    </label>

                    <input

                        type="text"

                        name="asm_assigned"

                        value={formData.asm_assigned || ""}

                        onChange={handleChange}

                        placeholder="Area Sales Manager"

                    />

                </div>

            </div>

        </div>

    );

}