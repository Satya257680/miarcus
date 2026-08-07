import React from "react";

import {
    FaMapMarkerAlt,
    FaCity,
    FaRulerCombined,
    FaWarehouse,
    FaMoneyBillWave,
    FaInfoCircle
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


export default function BasicInformation({

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

                    <FaInfoCircle />

                </div>


                <div>

                    <h2>
                        Basic Information
                    </h2>

                    <p>
                        Enter the primary details for the new store.
                    </p>

                </div>

            </div>


            {/* ==================================================
               FORM
            ================================================== */}

            <div className="nso-form-grid">


                {/* ==================================================
                   LOCATION
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaMapMarkerAlt />

                        Location

                    </label>


                    <input
                        type="text"
                        name="location"
                        value={
                            formData.location || ""
                        }
                        onChange={handleChange}
                        placeholder="Enter Location"
                    />


                    {
                        errors?.location && (

                            <span className="error-text">

                                {errors.location}

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                   CITY
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaCity />

                        City

                    </label>


                    <input
                        type="text"
                        name="city"
                        value={
                            formData.city || ""
                        }
                        onChange={handleChange}
                        placeholder="Enter City"
                    />


                    {
                        errors?.city && (

                            <span className="error-text">

                                {errors.city}

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                   SB AREA
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaWarehouse />

                        SB Area (sq.ft)

                    </label>


                    <input
                        type="number"
                        name="sb_area"
                        value={
                            formData.sb_area || ""
                        }
                        onChange={handleChange}
                        placeholder="SB Area"
                    />

                </div>


                {/* ==================================================
                   CARPET AREA
                ================================================== */}

                <div className="nso-form-group">

                    <label>

                        <FaRulerCombined />

                        Carpet Area (sq.ft)

                    </label>


                    <input
                        type="number"
                        name="carpet_area"
                        value={
                            formData.carpet_area || ""
                        }
                        onChange={handleChange}
                        placeholder="Carpet Area"
                    />

                </div>


                {/* ==================================================
                   EXPECTED SALE
                ================================================== */}

                <div className="nso-form-group full-width">

                    <label>

                        <FaMoneyBillWave />

                        Expected Sale

                    </label>


                    <input
                        type="number"
                        name="expected_sale"
                        value={
                            formData.expected_sale || ""
                        }
                        onChange={handleChange}
                        placeholder="Monthly Expected Sale"
                    />

                </div>


            </div>

        </div>

    );

}