import React from "react";

import {

    FaCheckCircle,

    FaMapMarkerAlt,

    FaCity,

    FaMoneyBillWave,

    FaCalendarAlt,

    FaUserTie,

    FaInfoCircle

} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";

const Item = ({

    icon,

    label,

    value

}) => (

    <div className="review-item">

        <div className="review-icon">

            {icon}

        </div>

        <div className="review-content">

            <label>

                {label}

            </label>

            <strong>

                {

                    value ||

                    "--"

                }

            </strong>

        </div>

    </div>

);

export default function ReviewStep({

    formData,

    attachment

}) {

    return (

        <div className="nso-card">

            <div className="nso-card-header">

                <div>

                    <FaCheckCircle />

                </div>

                <div>

                    <h2>

                        Review & Submit

                    </h2>

                    <p>

                        Verify all information before creating the project.

                    </p>

                </div>

            </div>

            <div className="review-section">

                <h3>

                    Store Information

                </h3>

                <div className="review-grid">

                    <Item

                        icon={<FaMapMarkerAlt />}

                        label="Location"

                        value={formData.location}

                    />

                    <Item

                        icon={<FaCity />}

                        label="City"

                        value={formData.city}

                    />

                    <Item

                        icon={<FaMoneyBillWave />}

                        label="Expected Sale"

                        value={formData.expected_sale}

                    />

                    <Item

                        icon={<FaCalendarAlt />}

                        label="Possession Date"

                        value={formData.possession_date_loi}

                    />

                </div>

            </div>

            <div className="review-section">

                <h3>

                    Assignment

                </h3>

                <div className="review-grid">

                    <Item

                        icon={<FaUserTie />}

                        label="Broker"

                        value={formData.broker_name}

                    />

                    <Item

                        icon={<FaUserTie />}

                        label="Operation Head"

                        value={formData.operation_head_assigned}

                    />

                    <Item

                        icon={<FaUserTie />}

                        label="ASM"

                        value={formData.asm_assigned}

                    />

                    <Item

                        icon={<FaInfoCircle />}

                        label="Status"

                        value={formData.status}

                    />

                </div>

            </div>

            <div className="review-section">

                <h3>

                    Attachment

                </h3>

                <div className="review-attachment">

                    {

                        attachment ?

                            attachment.name

                            :

                            "No attachment selected"

                    }

                </div>

            </div>

            <div className="review-note">

                <FaCheckCircle />

                <span>

                    After clicking <strong>Create Project</strong>,
                    the timeline, status, history, and tracking
                    will be generated automatically.

                </span>

            </div>

        </div>

    );

}