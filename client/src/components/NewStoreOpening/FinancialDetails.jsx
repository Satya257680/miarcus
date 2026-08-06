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

            <div className="nso-form-grid">

                {/* CAM */}

                <div className="nso-form-group">

                    <label>

                        <FaMoneyBillWave />

                        CAM

                    </label>

                    <input

                        type="number"

                        name="cam"

                        value={formData.cam || ""}

                        onChange={handleChange}

                        placeholder="Common Area Maintenance"

                    />

                </div>

                {/* MG */}

                <div className="nso-form-group">

                    <label>

                        <FaCoins />

                        Minimum Guarantee (MG)

                    </label>

                    <input

                        type="number"

                        name="mg"

                        value={formData.mg || ""}

                        onChange={handleChange}

                        placeholder="Minimum Guarantee"

                    />

                </div>

                {/* Electricity */}

                <div className="nso-form-group">

                    <label>

                        <FaBolt />

                        Electricity (KVA)

                    </label>

                    <input

                        type="number"

                        name="electricity_kva"

                        value={formData.electricity_kva || ""}

                        onChange={handleChange}

                        placeholder="Electricity Load"

                    />

                </div>

                {/* Revenue Share */}

                <div className="nso-form-group">

                    <label>

                        <FaChartLine />

                        Revenue Share %

                    </label>

                    <input

                        type="number"

                        name="revenue_share"

                        value={formData.revenue_share || ""}

                        onChange={handleChange}

                        placeholder="Revenue Share"

                    />

                </div>

                {/* Escalation */}

                <div className="nso-form-group full-width">

                    <label>

                        <FaPercent />

                        Escalation %

                    </label>

                    <input

                        type="number"

                        name="escalation"

                        value={formData.escalation || ""}

                        onChange={handleChange}

                        placeholder="Escalation Percentage"

                    />

                </div>

            </div>

        </div>

    );

}