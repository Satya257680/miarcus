import React from "react";

import {
    FaStore,
    FaChartLine,
    FaCalendarCheck,
    FaMoneyBillWave,
    FaClock,
    FaCheckCircle,
    FaCommentAlt
} from "react-icons/fa";

import AttachmentUpload from "./AttachmentUpload";

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

    const numericValue =
        Number(value);

    if (
        Number.isNaN(numericValue)
    ) {
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

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
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
   PROJECT SUMMARY
====================================================== */

export default function ProjectSummary({

    formData = {},

    progress = 0,

    currentStep = 1,

    /* ==================================================
       REMARKS
    ================================================== */

    handleChange,

    errors = {},

    /* ==================================================
       ATTACHMENT
    ================================================== */

    attachment = null,

    existingAttachment = null,

    preview = "",

    onFileChange,

    onRemoveFile

}) {

    /* ==================================================
       SAFE PROGRESS
    ================================================== */

    const safeProgress =
        Math.min(
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
       VALUES
    ================================================== */

    const expectedSale =
        formData?.expected_sale;


    const dealDays =
        formData?.deal_days;


    const possessionDate =
        formData?.actual_possession_date;


    const possessionDelay =
        formData?.possession_delay;


    /* ==================================================
       REMARKS
    ================================================== */

    const remarks =
        formData?.remarks || "";


    /* ==================================================
       RENDER
    ================================================== */

    return (

        <div className="project-summary-container">


            {/* ==================================================
               PROJECT SUMMARY
            ================================================== */}

            <div className="summary-card">


                {/* ==================================================
                   HEADER
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


                </div>


                {/* ==================================================
                   FOOTER
                ================================================== */}

                <div className="summary-footer">

                    <FaCheckCircle />

                    <span>

                        Step {currentStep} of 5

                    </span>

                </div>


            </div>


            {/* ==================================================
               REMARKS
               BELOW PROJECT SUMMARY
            ================================================== */}

            <div className="review-remarks-card">


                <div className="review-section-header">

                    <div className="review-section-icon">

                        <FaCommentAlt />

                    </div>


                    <div>

                        <h3>
                            Remarks
                        </h3>

                        <p>
                            Add any important notes
                            about this store opening.
                        </p>

                    </div>

                </div>


                <div className="review-section-body">

                    <label htmlFor="project-summary-remarks">

                        Remarks

                    </label>


                    <textarea
                        id="project-summary-remarks"
                        name="remarks"
                        value={remarks}
                        onChange={handleChange}
                        placeholder="Enter remarks..."
                        rows={4}
                    />


                    {
                        errors?.remarks && (

                            <span className="review-field-error">

                                {errors.remarks}

                            </span>

                        )
                    }

                </div>


            </div>


            {/* ==================================================
               ATTACHMENT
               BELOW REMARKS
            ================================================== */}

            <div className="review-attachment-card">

                <AttachmentUpload

                    file={attachment}

                    existingAttachment={
                        existingAttachment
                    }

                    preview={preview}

                    onFileChange={
                        onFileChange
                    }

                    onRemove={
                        onRemoveFile
                    }

                />

            </div>


        </div>

    );

}