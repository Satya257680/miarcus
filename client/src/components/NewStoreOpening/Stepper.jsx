import React from "react";
import {
    FaStore,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaProjectDiagram,
    FaClipboardCheck
} from "react-icons/fa";

import "../../styles/AddNewStoreOpeningModal.css";

const steps = [

    {
        id: 1,
        title: "Basic",
        icon: <FaStore />
    },

    {
        id: 2,
        title: "Financial",
        icon: <FaMoneyBillWave />
    },

    {
        id: 3,
        title: "Possession",
        icon: <FaCalendarAlt />
    },

    {
        id: 4,
        title: "Timeline",
        icon: <FaProjectDiagram />
    },

    {
        id: 5,
        title: "Review",
        icon: <FaClipboardCheck />
    }

];

export default function Stepper({

    currentStep,

    onStepChange

}) {

    return (

        <div className="nso-stepper">

            {

                steps.map(

                    (

                        step,

                        index

                    ) => (

                        <React.Fragment

                            key={step.id}

                        >

                            <button

                                type="button"

                                className={`

                                    nso-step

                                    ${currentStep === step.id ? "active" : ""}

                                    ${currentStep > step.id ? "completed" : ""}

                                `}

                                onClick={() =>

                                    onStepChange(

                                        step.id

                                    )

                                }

                            >

                                <div className="nso-step-icon">

                                    {

                                        step.icon

                                    }

                                </div>

                                <div className="nso-step-text">

                                    <span>

                                        Step {step.id}

                                    </span>

                                    <strong>

                                        {

                                            step.title

                                        }

                                    </strong>

                                </div>

                            </button>

                            {

                                index < steps.length - 1 && (

                                    <div

                                        className={`

                                            nso-step-line

                                            ${currentStep > step.id ? "completed" : ""}

                                        `}

                                    />

                                )

                            }

                        </React.Fragment>

                    )

                )

            }

        </div>

    );

}