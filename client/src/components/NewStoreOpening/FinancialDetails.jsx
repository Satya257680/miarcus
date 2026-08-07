import React from "react";

import {
    FaMoneyBillWave,
    FaBolt,
    FaChartLine,
    FaPercent,
    FaCoins,
    FaCalculator
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


export default function FinancialDetails({

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

                    <FaCalculator />

                </div>


                <div>

                    <h2>
                        Financial Details
                    </h2>

                    <p>
                        Enter commercial and financial information.
                    </p>

                </div>

            </div>


            {/* ==================================================
               FINANCIAL FORM
            ================================================== */}

            <div className="nso-form-grid">


                {/* ==================================================
                   CAM
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaMoneyBillWave />

                        CAM

                    </label>


                    <input
                        type="number"
                        name="cam"
                        value={formData?.cam ?? ""}
                        onChange={handleChange}
                        placeholder="Common Area Maintenance"
                        min="0"
                    />


                    {
                        errors?.cam && (

                            <span className="error-text">

                                {errors.cam}

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                   MINIMUM GUARANTEE
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaCoins />

                        Minimum Guarantee (MG)

                    </label>


                    <input
                        type="number"
                        name="mg"
                        value={formData?.mg ?? ""}
                        onChange={handleChange}
                        placeholder="Minimum Guarantee"
                        min="0"
                    />


                    {
                        errors?.mg && (

                            <span className="error-text">

                                {errors.mg}

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                   ELECTRICITY
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaBolt />

                        Electricity (KVA)

                    </label>


                    <input
                        type="number"
                        name="electricity_kva"
                        value={
                            formData?.electricity_kva ?? ""
                        }
                        onChange={handleChange}
                        placeholder="Electricity Load"
                        min="0"
                        step="any"
                    />


                    {
                        errors?.electricity_kva && (

                            <span className="error-text">

                                {errors.electricity_kva}

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                   REVENUE SHARE
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaChartLine />

                        Revenue Share %

                    </label>


                    <input
                        type="number"
                        name="revenue_share"
                        value={
                            formData?.revenue_share ?? ""
                        }
                        onChange={handleChange}
                        placeholder="Revenue Share"
                        min="0"
                        max="100"
                        step="any"
                    />


                    {
                        errors?.revenue_share && (

                            <span className="error-text">

                                {errors.revenue_share}

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                   ESCALATION
                ================================================== */}

                <div className="nso-form-group full-width">

                    <label>

                        <FaPercent />

                        Escalation %

                    </label>


                    <input
                        type="number"
                        name="escalation"
                        value={
                            formData?.escalation ?? ""
                        }
                        onChange={handleChange}
                        placeholder="Escalation Percentage"
                        min="0"
                        max="100"
                        step="any"
                    />


                    {
                        errors?.escalation && (

                            <span className="error-text">

                                {errors.escalation}

                            </span>

                        )
                    }

                </div>


            </div>

        </div>

    );

}