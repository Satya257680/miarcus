import React from "react";

import {
    FaArrowLeft,
    FaArrowRight,
    FaTimes,
    FaCheck
} from "react-icons/fa";


export default function ModalFooter({

    currentStep,

    setCurrentStep,

    totalSteps,

    onClose,

    onSubmit

}) {


    const handleNext = () => {


        if (

            currentStep < totalSteps

        ) {


            setCurrentStep(

                currentStep + 1

            );


        }

    };



    const handlePrevious = () => {


        if (

            currentStep > 1

        ) {


            setCurrentStep(

                currentStep - 1

            );


        }

    };



    return (

        <div className="nso-footer">



            {/* CANCEL BUTTON */}

            <button

                type="button"

                className="cancel-btn"

                onClick={onClose}

            >

                <FaTimes />

                Cancel

            </button>





            <div className="footer-right">



                {

                    currentStep > 1 && (


                        <button

                            type="button"

                            className="previous-btn"

                            onClick={handlePrevious}

                        >

                            <FaArrowLeft />

                            Previous

                        </button>


                    )

                }





                {

                    currentStep < totalSteps ? (


                        <button

                            type="button"

                            className="next-btn"

                            onClick={handleNext}

                        >

                            Next

                            <FaArrowRight />

                        </button>


                    )

                    :


                    (

                        <button

                            type="button"

                            className="submit-btn"

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