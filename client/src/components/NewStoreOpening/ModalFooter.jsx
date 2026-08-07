import React from "react";

import {
    FaArrowLeft,
    FaArrowRight,
    FaTimes,
    FaCheck
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";


export default function ModalFooter({

    currentStep,
    setCurrentStep,
    totalSteps,
    onClose,
    onSubmit

}) {


    /* ======================================================
       NEXT
    ====================================================== */

    const handleNext = () => {

        if (
            currentStep < totalSteps
        ) {

            setCurrentStep(
                currentStep + 1
            );

        }

    };


    /* ======================================================
       PREVIOUS
    ====================================================== */

    const handlePrevious = () => {

        if (
            currentStep > 1
        ) {

            setCurrentStep(
                currentStep - 1
            );

        }

    };


    /* ======================================================
       RENDER
    ====================================================== */

    return (

        <div className="nso-footer">


            {/* ==================================================
               CANCEL
            ================================================== */}

            <button
                type="button"
                className="footer-btn footer-cancel"
                onClick={onClose}
            >

                <FaTimes />

                Cancel

            </button>


            {/* ==================================================
               RIGHT SIDE BUTTONS
            ================================================== */}

            <div className="footer-right">


                {/* ==================================================
                   PREVIOUS
                ================================================== */}

                {
                    currentStep > 1 && (

                        <button
                            type="button"
                            className="footer-btn footer-secondary"
                            onClick={handlePrevious}
                        >

                            <FaArrowLeft />

                            Previous

                        </button>

                    )
                }


                {/* ==================================================
                   NEXT
                ================================================== */}

                {
                    currentStep < totalSteps && (

                        <button
                            type="button"
                            className="footer-btn footer-primary"
                            onClick={handleNext}
                        >

                            Next

                            <FaArrowRight />

                        </button>

                    )
                }


                {/* ==================================================
                   SUBMIT
                ================================================== */}

                {
                    currentStep === totalSteps && (

                        <button
                            type="button"
                            className="footer-btn footer-success"
                            onClick={onSubmit}
                        >

                            <FaCheck />

                            Submit Entry

                        </button>

                    )
                }


            </div>

        </div>

    );

}