import React from "react";

import {
    FaStore,
    FaChartLine,
    FaCalendarCheck,
    FaMoneyBillWave,
    FaClock,
    FaCheckCircle
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