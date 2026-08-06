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

const formatCurrency = (value) => {

    if (!value) {

        return "₹0";

    }

    return new Intl.NumberFormat(

        "en-IN",

        {

            style: "currency",

            currency: "INR",

            maximumFractionDigits: 0

        }

    ).format(value);

};

export default function ProjectSummary({

    formData,

    progress = 0,

    currentStep = 1

}) {

    const status = formData.status || "Planning";

    return (

        <div className="summary-card">

            <div className="summary-header">

                <h3>

                    <FaStore />

                    Project Summary

                </h3>

                <span className="summary-badge">

                    {status}

                </span>

            </div>

            <div className="summary-progress">

                <div className="summary-progress-top">

                    <span>

                        Form Completion

                    </span>

                    <strong>

                        {progress}%

                    </strong>

                </div>

                <div className="summary-progress-bar">

                    <div

                        className="summary-progress-fill"

                        style={{

                            width: `${progress}%`

                        }}

                    />

                </div>

            </div>

            <div className="summary-grid">

                <div className="summary-item">

                    <FaMoneyBillWave />

                    <div>

                        <label>

                            Expected Sale

                        </label>

                        <strong>

                            {

                                formatCurrency(

                                    formData.expected_sale

                                )

                            }

                        </strong>

                    </div>

                </div>

                <div className="summary-item">

                    <FaClock />

                    <div>

                        <label>

                            Deal Days

                        </label>

                        <strong>

                            {

                                formData.deal_days ||

                                "--"

                            }

                        </strong>

                    </div>

                </div>

                <div className="summary-item">

                    <FaCalendarCheck />

                    <div>

                        <label>

                            Possession

                        </label>

                        <strong>

                            {

                                formData.actual_possession_date ||

                                "--"

                            }

                        </strong>

                    </div>

                </div>

                <div className="summary-item">

                    <FaChartLine />

                    <div>

                        <label>

                            Delay

                        </label>

                        <strong>

                            {

                                formData.possession_delay ||

                                "0"

                            }

                            {" "}Days

                        </strong>

                    </div>

                </div>

            </div>

            <div className="summary-footer">

                <FaCheckCircle />

                <span>

                    Step {currentStep} of 5

                </span>

            </div>

        </div>

    );

}