import React from "react";

import {
    FaStore,
    FaChartLine,
    FaCalendarCheck,
    FaMoneyBillWave,
    FaClock,
    FaCheckCircle,
    FaPaperclip,
    FaCommentAlt
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";

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

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return "₹0";
    }

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(numericValue);
};


/* ======================================================
   FORMAT DATE
====================================================== */

const formatDate = (value) => {

    if (!value) {
        return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
};


/* ======================================================
   GET ATTACHMENT NAME
====================================================== */

const getAttachmentName = (attachment) => {

    if (!attachment) {
        return null;
    }

    /* File object */
    if (attachment instanceof File) {
        return attachment.name;
    }

    /* Object returned from backend */
    if (typeof attachment === "object") {

        return (
            attachment.name ||
            attachment.file_name ||
            attachment.filename ||
            attachment.originalname ||
            null
        );
    }

    /* String */
    if (typeof attachment === "string") {

        const parts = attachment.split("/");

        return parts[parts.length - 1] || attachment;
    }

    return null;
};


/* ======================================================
   GET ATTACHMENT URL
====================================================== */

const getAttachmentUrl = (attachment) => {

    if (!attachment) {
        return null;
    }

    /* File object */
    if (attachment instanceof File) {
        return URL.createObjectURL(attachment);
    }

    /* Object returned from backend */
    if (typeof attachment === "object") {

        return (
            attachment.url ||
            attachment.file_url ||
            attachment.fileUrl ||
            attachment.path ||
            attachment.file_path ||
            null
        );
    }

    /* String */
    if (typeof attachment === "string") {
        return attachment;
    }

    return null;
};


/* ======================================================
   PROJECT SUMMARY
====================================================== */

export default function ProjectSummary({

    formData = {},

    progress = 0,

    currentStep = 1

}) {

    /* ==================================================
       SAFE PROGRESS
    ================================================== */

    const safeProgress = Math.min(
        100,
        Math.max(
            0,
            Number(progress) || 0
        )
    );


    /* ==================================================
       STATUS
    ================================================== */

    const status =
        formData?.status ||
        "Planning";


    /* ==================================================
       EXPECTED SALE
    ================================================== */

    const expectedSale =
        formData?.expected_sale;


    /* ==================================================
       DEAL DAYS
    ================================================== */

    const dealDays =
        formData?.deal_days;


    /* ==================================================
       POSSESSION DATE
    ================================================== */

    const possessionDate =
        formData?.actual_possession_date;


    /* ==================================================
       POSSESSION DELAY
    ================================================== */

    const possessionDelay =
        formData?.possession_delay;


    /* ==================================================
       REMARKS
    ================================================== */

    const remarks =
        formData?.remarks ||
        formData?.remark ||
        "";


    /* ==================================================
       ATTACHMENT
    ================================================== */

    const attachment =
        formData?.attachment ||
        formData?.attachments ||
        formData?.file ||
        formData?.document ||
        null;


    const attachmentName =
        getAttachmentName(attachment);


    const attachmentUrl =
        getAttachmentUrl(attachment);


    /* ==================================================
       RENDER
    ================================================== */

    return (

        <div className="summary-card">


            {/* ==================================================
               SUMMARY HEADER
            ================================================== */}

            <div className="summary-header">

                <h3>

                    <FaStore />

                    Project Summary

                </h3>


                <span className="summary-badge">

                    {status}

                </span>

            </div>


            {/* ==================================================
               PROGRESS
            ================================================== */}

            <div className="summary-progress">

                <div className="summary-progress-top">

                    <span>

                        Form Completion

                    </span>


                    <strong>

                        {safeProgress}%

                    </strong>

                </div>


                <div className="summary-progress-bar">

                    <div
                        className="summary-progress-fill"
                        style={{
                            width: `${safeProgress}%`
                        }}
                    />

                </div>

            </div>


            {/* ==================================================
               SUMMARY GRID
            ================================================== */}

            <div className="summary-grid">


                {/* ==================================================
                   EXPECTED SALE
                ================================================== */}

                <div className="summary-item">

                    <FaMoneyBillWave />

                    <div>

                        <label>

                            Expected Sale

                        </label>


                        <strong>

                            {
                                formatCurrency(
                                    expectedSale
                                )
                            }

                        </strong>

                    </div>

                </div>


                {/* ==================================================
                   DEAL DAYS
                ================================================== */}

                <div className="summary-item">

                    <FaClock />

                    <div>

                        <label>

                            Deal Days

                        </label>


                        <strong>

                            {
                                dealDays !== null &&
                                dealDays !== undefined &&
                                dealDays !== ""
                                    ? dealDays
                                    : "--"
                            }

                        </strong>

                    </div>

                </div>


                {/* ==================================================
                   POSSESSION
                ================================================== */}

                <div className="summary-item">

                    <FaCalendarCheck />

                    <div>

                        <label>

                            Possession

                        </label>


                        <strong>

                            {
                                formatDate(
                                    possessionDate
                                )
                            }

                        </strong>

                    </div>

                </div>


                {/* ==================================================
                   DELAY
                ================================================== */}

                <div className="summary-item">

                    <FaChartLine />

                    <div>

                        <label>

                            Delay

                        </label>


                        <strong>

                            {
                                possessionDelay !== null &&
                                possessionDelay !== undefined &&
                                possessionDelay !== ""
                                    ? possessionDelay
                                    : "0"
                            }

                            {" "}Days

                        </strong>

                    </div>

                </div>


                {/* ==================================================
                   REMARKS
                ================================================== */}

                <div className="summary-item">

                    <FaCommentAlt />

                    <div>

                        <label>

                            Remarks

                        </label>


                        <strong
                            style={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word"
                            }}
                        >

                            {
                                remarks
                                    ? remarks
                                    : "--"
                            }

                        </strong>

                    </div>

                </div>


                {/* ==================================================
                   ATTACHMENT
                ================================================== */}

                <div className="summary-item">

                    <FaPaperclip />

                    <div>

                        <label>

                            Attachment

                        </label>


                        {
                            attachmentName ? (

                                attachmentUrl ? (

                                    <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: "#2563eb",
                                            fontWeight: "600",
                                            textDecoration: "none",
                                            wordBreak: "break-word"
                                        }}
                                    >

                                        {attachmentName}

                                    </a>

                                ) : (

                                    <strong
                                        style={{
                                            wordBreak: "break-word"
                                        }}
                                    >

                                        {attachmentName}

                                    </strong>

                                )

                            ) : (

                                <strong>

                                    --

                                </strong>

                            )
                        }

                    </div>

                </div>


            </div>


            {/* ==================================================
               SUMMARY FOOTER
            ================================================== */}

            <div className="summary-footer">

                <FaCheckCircle />

                <span>

                    Step {currentStep} of 5

                </span>

            </div>


        </div>

    );

}