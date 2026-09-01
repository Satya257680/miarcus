import { API_BASE_URL } from "../../axiosConfig.js";
import React, { useEffect, useMemo, useState } from "react";

import {
    FaCheckCircle,
    FaMapMarkerAlt,
    FaCity,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaUserTie,
    FaInfoCircle,
    FaEnvelope,
    FaClock,
    FaCommentAlt,
    FaPaperclip,
    FaBuilding,
    FaExternalLinkAlt,
    FaProjectDiagram
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


/* ======================================================
   REMARKS
====================================================== */

const getRemarksValue = (formData = {}) =>
    formData.remarks ??
    formData.remark ??
    formData.remarks_text ??
    "";


/* ======================================================
   ATTACHMENT NAME
====================================================== */

const getAttachmentName = (
    attachment,
    formData = {}
) => {

    if (attachment?.name) {
        return attachment.name;
    }

    if (typeof attachment === "string") {
        return attachment.split("/").pop();
    }

    if (formData.attachment_name) {
        return formData.attachment_name;
    }

    if (typeof formData.attachment === "string") {
        return formData.attachment.split("/").pop();
    }

    if (formData.attachment?.name) {
        return formData.attachment.name;
    }

    return "No attachment selected";
};


/* ======================================================
   ATTACHMENT URL
====================================================== */

const getAttachmentUrl = (
    attachment,
    formData = {}
) => {

    /* Browser File */
    if (
        typeof File !== "undefined" &&
        attachment instanceof File
    ) {
        return URL.createObjectURL(attachment);
    }


    const rawValue =
        attachment?.url ||
        attachment?.path ||
        attachment?.file_url ||
        attachment?.fileUrl ||
        attachment?.filename ||
        attachment?.fileName ||
        (
            typeof attachment === "string"
                ? attachment
                : null
        ) ||
        formData.attachment_url ||
        formData.attachmentUrl ||
        formData.file_url ||
        formData.fileUrl ||
        (
            typeof formData.attachment === "string"
                ? formData.attachment
                : null
        );


    if (!rawValue) {
        return "";
    }


    const value =
        String(rawValue).trim();


    if (!value) {
        return "";
    }


    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("blob:") ||
        value.startsWith("data:")
    ) {
        return value;
    }


    const cleanValue =
        value.replace(/^\/+/, "");


    if (
        cleanValue.startsWith("uploads/")
    ) {
        return `${API_BASE_URL}/${cleanValue}`;
    }


    return `${API_BASE_URL}/uploads/${cleanValue}`;
};


/* ======================================================
   FORMAT DATE
====================================================== */

const formatDate = (value) => {

    if (!value) {
        return "--";
    }


    const date =
        new Date(`${value}T00:00:00`);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
};


/* ======================================================
   FORMAT CURRENCY
====================================================== */

const formatCurrency = (value) => {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "₹0";
    }


    const number =
        Number(value);


    if (Number.isNaN(number)) {
        return value;
    }


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(number);
};


/* ======================================================
   REVIEW ITEM
====================================================== */

const Item = ({
    icon,
    label,
    value,
    fullWidth = false
}) => (

    <div
        className={
            fullWidth
                ? "review-item review-item-full"
                : "review-item"
        }
    >

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
   TIMELINE MILESTONES
====================================================== */

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


/* ======================================================
   REVIEW STEP
====================================================== */

export default function ReviewStep({

    formData = {},

    attachment,

    existingAttachment,

    preview,

    onFileChange,

    onRemoveFile,

    handleChange,

    errors = {}

}) {

    /* ==================================================
       REMARKS STATE
    ================================================== */

    const [
        remarksDraft,
        setRemarksDraft
    ] = useState(
        getRemarksValue(formData)
    );


    useEffect(() => {

        setRemarksDraft(
            getRemarksValue(formData)
        );

    }, [
        formData?.remarks,
        formData?.remark,
        formData?.remarks_text
    ]);


    /* ==================================================
       ATTACHMENT
    ================================================== */

    const activeAttachment =
        attachment ||
        existingAttachment ||
        formData?.attachment ||
        null;


    const attachmentName =
        useMemo(
            () =>
                getAttachmentName(
                    activeAttachment,
                    formData
                ),
            [
                activeAttachment,
                formData
            ]
        );


    const attachmentUrl =
        useMemo(
            () =>
                getAttachmentUrl(
                    activeAttachment,
                    formData
                ),
            [
                activeAttachment,
                formData
            ]
        );


    /* ==================================================
       REMARK CHANGE
    ================================================== */

    const handleRemarksChange = (
        event
    ) => {

        const value =
            event.target.value;


        setRemarksDraft(value);


        if (
            typeof handleChange ===
            "function"
        ) {

            handleChange(event);

        }

    };


    /* ==================================================
       VIEW ATTACHMENT
    ================================================== */

    const handleViewAttachment = () => {

        if (!attachmentUrl) {
            return;
        }


        window.open(
            attachmentUrl,
            "_blank",
            "noopener,noreferrer"
        );

    };


    /* ==================================================
       CLEANUP BLOB URL
    ================================================== */

    useEffect(() => {

        if (
            typeof File !== "undefined" &&
            activeAttachment instanceof File &&
            attachmentUrl.startsWith("blob:")
        ) {

            return () => {

                URL.revokeObjectURL(
                    attachmentUrl
                );

            };

        }


        return undefined;

    }, [
        activeAttachment,
        attachmentUrl
    ]);


    /* ==================================================
       RENDER
    ================================================== */

    return (

        <div className="nso-card review-page-card">


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
                        label="SB Area (sq.ft)"
                        value={formData.sb_area}
                    />

                    <Item
                        icon={<FaBuilding />}
                        label="Carpet Area (sq.ft)"
                        value={formData.carpet_area}
                    />

                    <Item
                        icon={<FaMoneyBillWave />}
                        label="Expected Sale"
                        value={formatCurrency(
                            formData.expected_sale
                        )}
                    />

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
                        icon={<FaEnvelope />}
                        label="Approver Email"
                        value={formData.approver_email}
                    />

                    <Item
                        icon={<FaEnvelope />}
                        label="Construction Vendor Email"
                        value={formData.construction_vendor_email}
                    />

                    <Item
                        icon={<FaUserTie />}
                        label="Project Taken By"
                        value={formData.project_taken_by}
                    />

                    <Item
                        icon={<FaEnvelope />}
                        label="Project Taken By Email"
                        value={formData.project_taken_by_email}
                    />

                </div>

            </div>


            {/* ==================================================
               FINANCIAL INFORMATION
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
               POSSESSION
            ================================================== */}

            <div className="review-section">

                <h3>
                    Possession Details
                </h3>


                <div className="review-grid">

                    <Item
                        icon={<FaCalendarAlt />}
                        label="LOI Possession Date"
                        value={formatDate(
                            formData.possession_date_loi
                        )}
                    />

                    <Item
                        icon={<FaCalendarAlt />}
                        label="Broker Possession Date"
                        value={formatDate(
                            formData.possession_date_broker
                        )}
                    />

                    <Item
                        icon={<FaCalendarAlt />}
                        label="Actual Possession Date"
                        value={formatDate(
                            formData.actual_possession_date
                        )}
                    />

                    <Item
                        icon={<FaCheckCircle />}
                        label="Received By NSO"
                        value={formData.received_by_nso}
                    />

                    <Item
                        icon={<FaUserTie />}
                        label="Broker"
                        value={formData.broker_name}
                    />

                    <Item icon={<FaEnvelope />} label="Broker Email" value={formData.broker_email} />

                    <Item
                        icon={<FaUserTie />}
                        label="Operation Head"
                        value={formData.operation_head_assigned}
                    />

                    <Item icon={<FaEnvelope />} label="Operation Head Email" value={formData.operation_head_email} />

                    <Item
                        icon={<FaUserTie />}
                        label="ASM"
                        value={formData.asm_assigned}
                    />

                    <Item icon={<FaEnvelope />} label="ASM Email" value={formData.asm_email} />

                    <Item
                        icon={<FaInfoCircle />}
                        label="Status"
                        value={formData.status}
                    />

                </div>

            </div>


            {/* ==================================================
               DERIVED VALUES
            ================================================== */}

            <div className="review-section">

                <h3>
                    Project Calculation
                </h3>


                <div className="review-grid">

                    <Item
                        icon={<FaClock />}
                        label="Deal Days"
                        value={
                            formData.deal_days !== ""
                                ? `${formData.deal_days} Days`
                                : "--"
                        }
                    />

                    <Item
                        icon={<FaClock />}
                        label="Delay LOI vs Broker"
                        value={
                            formData.delay_loi_vs_broker !== ""
                                ? `${formData.delay_loi_vs_broker} Days`
                                : "--"
                        }
                    />

                    <Item
                        icon={<FaClock />}
                        label="Possession Delay"
                        value={
                            formData.possession_delay !== ""
                                ? `${formData.possession_delay} Days`
                                : "--"
                        }
                    />

                </div>

            </div>


            {/* ==================================================
               PROJECT TIMELINE
            ================================================== */}

            <div className="review-section">

                <h3>
                    <FaProjectDiagram />
                    {" "}Project Timeline
                </h3>

                <p style={{ margin: "6px 0 16px", color: "#64748b", fontSize: "13px" }}>
                    Timeline Mode: <strong style={{ color: "#2563eb" }}>{formData.timeline_mode === "manual" ? "Manual" : "Automatic"}</strong>
                </p>


                <div className="review-grid timeline-review-grid">

                    {
                        milestones.map(
                            (item) => (

                                <Item
                                    key={item.field}
                                    icon={<FaCalendarAlt />}
                                    label={item.title}
                                    value={formatDate(
                                        formData[item.field]
                                    )}
                                />

                            )
                        )
                    }

                </div>

            </div>


            {/* ==================================================
               REMARKS — ONLY ON REVIEW PAGE
            ================================================== */}

            <div className="review-section review-edit-section">

                <h3>
                    <FaCommentAlt />
                    {" "}Remarks
                </h3>


                <p className="review-section-description">
                    Add any important notes about this store opening.
                </p>


                <div className="nso-form-group">

                    <label htmlFor="nso-review-remarks">
                        Remarks
                    </label>


                    <textarea
                        id="nso-review-remarks"
                        name="remarks"
                        value={remarksDraft}
                        onChange={
                            handleRemarksChange
                        }
                        placeholder="Enter remarks or additional project information..."
                        rows={5}
                    />


                    {
                        errors?.remarks && (

                            <span className="review-error">
                                {errors.remarks}
                            </span>

                        )
                    }

                </div>

            </div>


            {/* ==================================================
               ATTACHMENT — ONLY ON REVIEW PAGE
            ================================================== */}

            <div className="review-section review-edit-section">

                <h3>
                    <FaPaperclip />
                    {" "}Attachment
                </h3>


                <p className="review-section-description">
                    Upload a document or image related to this store opening.
                </p>


                <div className="review-attachment-box">

                    <div className="review-attachment-icon">
                        <FaPaperclip />
                    </div>


                    <div className="review-attachment-content">

                        <strong>
                            {
                                attachmentName
                            }
                        </strong>


                        {
                            attachment?.size && (

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
                        activeAttachment &&
                        onRemoveFile && (

                            <button
                                type="button"
                                className="remove-attachment-btn"
                                onClick={
                                    onRemoveFile
                                }
                            >
                                Remove
                            </button>

                        )
                    }


                    {
                        attachmentUrl && (

                            <button
                                type="button"
                                className="view-attachment-btn"
                                onClick={
                                    handleViewAttachment
                                }
                            >

                                <FaExternalLinkAlt />

                                View Attachment

                            </button>

                        )
                    }

                </div>


                <div className="review-upload">

                    <label htmlFor="nso-review-attachment">
                        Choose Attachment
                    </label>


                    <input
                        id="nso-review-attachment"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.csv"
                        onChange={
                            onFileChange
                        }
                    />

                </div>


                {
                    preview && (

                        <div className="review-image-preview">

                            <img
                                src={preview}
                                alt="Attachment preview"
                            />

                        </div>

                    )
                }


                {
                    errors?.attachment && (

                        <span className="review-error">
                            {errors.attachment}
                        </span>

                    )
                }

            </div>


            {/* ==================================================
               REVIEW NOTE
            ================================================== */}

            <div className="review-note">

                <FaCheckCircle />


                <span>

                    All information above will be submitted
                    together with the remarks and attachment.

                </span>

            </div>

        </div>

    );

}
