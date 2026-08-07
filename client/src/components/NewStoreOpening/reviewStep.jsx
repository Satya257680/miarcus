import React from "react";

import {
    FaCheckCircle,
    FaMapMarkerAlt,
    FaCity,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaUserTie,
    FaInfoCircle,
    FaClock,
    FaCommentAlt,
    FaPaperclip,
    FaBuilding
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


/* ======================================================
   REVIEW ITEM
====================================================== */

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
                    value !== undefined &&
                    value !== null &&
                    value !== ""
                        ? value
                        : "--"
                }

            </strong>

        </div>

    </div>

);


/* ======================================================
   REVIEW STEP
====================================================== */

export default function ReviewStep({

    formData,
    attachment,
    onFileChange,
    onRemoveFile,
    handleChange

}) {

    return (

        <div className="nso-card">


            {/* ==================================================
               HEADER
            ================================================== */}

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


            {/* ==================================================
               STORE INFORMATION
            ================================================== */}

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
                        label="Possession Date (LOI)"
                        value={formData.possession_date_loi}
                    />


                    <Item
                        icon={<FaCalendarAlt />}
                        label="Broker Possession Date"
                        value={formData.possession_date_broker}
                    />


                    <Item
                        icon={<FaCalendarAlt />}
                        label="Actual Possession Date"
                        value={formData.actual_possession_date}
                    />

                </div>

            </div>


            {/* ==================================================
               FINANCIAL
            ================================================== */}

            <div className="review-section">

                <h3>
                    Financial Information
                </h3>


                <div className="review-grid">

                    <Item
                        icon={<FaMoneyBillWave />}
                        label="CAM"
                        value={formData.cam}
                    />


                    <Item
                        icon={<FaMoneyBillWave />}
                        label="Minimum Guarantee (MG)"
                        value={formData.mg}
                    />


                    <Item
                        icon={<FaMoneyBillWave />}
                        label="Electricity (KVA)"
                        value={formData.electricity_kva}
                    />


                    <Item
                        icon={<FaMoneyBillWave />}
                        label="Revenue Share %"
                        value={formData.revenue_share}
                    />


                    <Item
                        icon={<FaMoneyBillWave />}
                        label="Escalation %"
                        value={formData.escalation}
                    />

                </div>

            </div>


            {/* ==================================================
               ASSIGNMENT
            ================================================== */}

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


            {/* ==================================================
               PROJECT OWNERSHIP
            ================================================== */}

            <div className="review-section">

                <h3>
                    Project Ownership
                </h3>


                <div className="review-grid">

                    <Item
                        icon={<FaUserTie />}
                        label="Approver Name"
                        value={formData.approver_name}
                    />


                    <Item
                        icon={<FaBuilding />}
                        label="Construction Vendor"
                        value={formData.construction_vendor}
                    />


                    <Item
                        icon={<FaUserTie />}
                        label="Project Taken By"
                        value={formData.project_taken_by}
                    />

                </div>

            </div>


            {/* ==================================================
               POSSESSION & DELAY
            ================================================== */}

            <div className="review-section">

                <h3>
                    Possession & Delay
                </h3>


                <div className="review-grid">

                    <Item
                        icon={<FaClock />}
                        label="Deal Days"
                        value={
                            formData.deal_days !== ""
                                ? `${formData.deal_days} Days`
                                : ""
                        }
                    />


                    <Item
                        icon={<FaClock />}
                        label="Delay LOI vs Broker"
                        value={
                            formData.delay_loi_vs_broker !== ""
                                ? `${formData.delay_loi_vs_broker} Days`
                                : ""
                        }
                    />


                    <Item
                        icon={<FaClock />}
                        label="Possession Delay"
                        value={
                            formData.possession_delay !== ""
                                ? `${formData.possession_delay} Days`
                                : ""
                        }
                    />


                    <Item
                        icon={<FaCheckCircle />}
                        label="Received By NSO"
                        value={formData.received_by_nso}
                    />

                </div>

            </div>


            {/* ==================================================
               REMARKS
            ================================================== */}

            <div className="review-section">

                <h3>
                    Remarks
                </h3>


                <div className="nso-form-group">

                    <label>

                        <FaCommentAlt />

                        Remarks

                    </label>


                    <textarea
                        name="remarks"
                        value={
                            formData.remarks || ""
                        }
                        onChange={handleChange}
                        placeholder="Enter remarks or additional project information..."
                        rows="4"
                    />

                </div>

            </div>


            {/* ==================================================
               ATTACHMENT
            ================================================== */}

            <div className="review-section">

                <h3>
                    Attachment
                </h3>


                <div className="review-attachment">

                    <div className="review-attachment-icon">

                        <FaPaperclip />

                    </div>


                    <div className="review-attachment-content">

                        <strong>

                            {
                                attachment
                                    ? attachment.name
                                    : formData.attachment
                                        ? formData.attachment
                                        : "No attachment selected"
                            }

                        </strong>


                        {
                            attachment && (

                                <span>

                                    {
                                        (
                                            attachment.size /
                                            1024
                                        ).toFixed(1)
                                    }

                                    {" "}KB

                                </span>

                            )
                        }

                    </div>


                    {
                        attachment &&
                        onRemoveFile && (

                            <button
                                type="button"
                                className="remove-attachment-btn"
                                onClick={onRemoveFile}
                            >

                                Remove

                            </button>

                        )
                    }

                </div>


                {/* ==================================================
                   FILE INPUT
                ================================================== */}

                <div className="review-upload">

                    <label>
                        Change Attachment
                    </label>


                    <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={onFileChange}
                    />

                </div>

            </div>


            {/* ==================================================
               REVIEW NOTE
            ================================================== */}

            <div className="review-note">

                <FaCheckCircle />

                <span>

                    After clicking{" "}

                    <strong>
                        Create Project
                    </strong>

                    , the timeline, status, history,
                    and tracking will be generated automatically.

                </span>

            </div>

        </div>

    );

}