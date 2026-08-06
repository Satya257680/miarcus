import React, {

    useEffect,

    useMemo,

    useState

} from "react";


import axios from "axios";


import {

    FaTimes,

    FaStore

} from "react-icons/fa";


import Stepper from "./Stepper";

import BasicInformation from "./BasicInformation";

import FinancialDetails from "./FinancialDetails";

import PossessionDetails from "./PossessionDetails";

import TimelinePreview from "./TimelinePreview";

import AttachmentUpload from "./AttachmentUpload";

import ReviewStep from "./ReviewStep";

import ProjectSummary from "./ProjectSummary";

import ModalFooter from "./ModalFooter";


import "../../styles/AddNewStoreOpeningModal.css";



const API =

"http://localhost:5000/api/new-store-openings";



const TOTAL_STEPS = 5;





// ======================================================
// INITIAL FORM
// ======================================================


const initialForm = {


    location: "",


    city: "",


    sb_area: "",


    carpet_area: "",



    cam: "",


    mg: "",


    electricity_kva: "",


    revenue_share: "",


    escalation: "",


    expected_sale: "",





    possession_date_loi: "",


    possession_date_broker: "",


    actual_possession_date: "",





    broker_name: "",


    operation_head_assigned: "",


    asm_assigned: "",





    deal_days: "",





    remarks: "",





    attachment: "",





    delay_loi_vs_broker: "",


    possession_delay: "",





    received_by_nso: "",





    layout_by_nso: "",


    revised_layout_by_nso: "",


    approval_deadline: "",


    approver_name: "",


    construction_vendor: "",


    project_taken_by: "",


    visit_by_op_team: "",





    gst_deadline: "",


    hr_hiring_deadline: "",


    team_training_deadline: "",


    visit_by_nso_team_deadline: "",


    plan_of_stock_deadline: "",


    plan_of_collaterals_deadline: "",


    on_field_training_deadline: "",


    dispatch_stock_deadline: "",


    nso_handover_deadline: "",


    vm_handover_deadline: "",


    scanning_deadline: "",


    billing_start_date: "",





    status:"Planning"


};






export default function AddNewStoreOpeningModal({


    isOpen,


    onClose,


    onSuccess,


    editData = null



}) {



    const [


        currentStep,


        setCurrentStep


    ] = useState(1);






    const [


        loading,


        setLoading


    ] = useState(false);






    const [


        errors,


        setErrors


    ] = useState({});






    const [


        attachment,


        setAttachment


    ] = useState(null);






    const [


        preview,


        setPreview


    ] = useState("");






    const [


        formData,


        setFormData


    ] = useState(initialForm);








// ======================================================
// LOAD DATA WHEN OPEN
// ======================================================


useEffect(()=>{


    if(!isOpen)

        return;





    setCurrentStep(1);





    if(editData){



        setFormData({


            ...initialForm,


            ...editData


        });



    }

    else{


        setFormData(

            initialForm

        );


        setAttachment(null);


        setPreview("");

    }




},[

    isOpen,

    editData

]);








// ======================================================
// PROGRESS
// ======================================================


const progress = useMemo(()=>{


    return Math.round(


        (

            currentStep /

            TOTAL_STEPS

        )

        *

        100


    );



},[currentStep]);









// ======================================================
// INPUT CHANGE
// ======================================================


const handleChange=(e)=>{


    const {


        name,


        value


    } = e.target;





    setFormData(prev=>({


        ...prev,


        [name]:value



    }));





    setErrors(prev=>({


        ...prev,


        [name]:""



    }));



};









// ======================================================
// FILE CHANGE
// ======================================================


const handleFileChange=(e)=>{


    const file = e.target.files[0];



    if(!file)

        return;





    setAttachment(file);





    if(file.type.includes("image")){


        setPreview(


            URL.createObjectURL(file)


        );


    }


};







// ======================================================
// REMOVE FILE
// ======================================================


const removeAttachment=()=>{


    setAttachment(null);


    setPreview("");



};






// ======================================================
// SUBMIT API
// ======================================================


const handleSubmit = async()=>{


    try{


        setLoading(true);



        const form = new FormData();





        Object.keys(formData).forEach(key=>{


            form.append(


                key,


                formData[key] || ""

            );



        });





        if(attachment){


            form.append(


                "attachment",


                attachment


            );


        }







        if(editData){



            await axios.put(


                `${API}/${editData.id}`,


                form,


                {


                    headers:{


                        "Content-Type":

                        "multipart/form-data"


                    }


                }


            );



        }

        else{



            await axios.post(


                API,


                form,


                {


                    headers:{


                        "Content-Type":

                        "multipart/form-data"


                    }


                }


            );



        }






        if(onSuccess){


            onSuccess();


        }





        onClose();




    }

    catch(error){



        console.log(

            error

        );


        alert(

            "Failed to save New Store Opening"

        );



    }

    finally{


        setLoading(false);


    }



};







if(

    !isOpen

)

{

    return null;

}

    return (

    <div className="nso-overlay">


        <div className="nso-modal">


            {/* ======================================================
                HEADER
            ====================================================== */}

            <div className="nso-header">


                <div className="header-left">


                    <div className="header-icon">

                        <FaStore />

                    </div>


                    <div>

                        <h2>

                            {
                                editData

                                    ? "Edit New Store Opening"

                                    : "Add New Store Opening"
                            }

                        </h2>


                        <p>

                            Manage retail expansion projects

                        </p>


                    </div>


                </div>



                <button

                    className="close-btn"

                    onClick={onClose}

                >

                    <FaTimes />

                </button>


            </div>





            {/* ======================================================
                STEPPER
            ====================================================== */}

            <Stepper

                currentStep={currentStep}

                onStepChange={setCurrentStep}

            />






            {/* ======================================================
                BODY
            ====================================================== */}

            <div className="nso-body">



                {/* ==================================================
                    LEFT CONTENT
                ================================================== */}

                <div className="nso-left">



                    {
                        currentStep === 1 && (


                            <BasicInformation


                                formData={formData}


                                handleChange={handleChange}


                                errors={errors}


                            />


                        )
                    }





                    {
                        currentStep === 2 && (


                            <FinancialDetails


                                formData={formData}


                                handleChange={handleChange}


                                errors={errors}


                            />


                        )
                    }





                    {
                        currentStep === 3 && (


                            <PossessionDetails


                                formData={formData}


                                handleChange={handleChange}


                                errors={errors}


                            />


                        )
                    }





                    {
                        currentStep === 4 && (


                            <TimelinePreview


                                formData={formData}


                            />


                        )
                    }





                    {
                        currentStep === 5 && (


                            <ReviewStep


                                formData={formData}


                            />


                        )
                    }



                </div>








                {/* ==================================================
                    RIGHT SUMMARY
                ================================================== */}

                <div className="nso-right">


                    <ProjectSummary


                        formData={formData}


                        progress={progress}


                        currentStep={currentStep}


                    />


                </div>



            </div>







            {/* ======================================================
                FOOTER
            ====================================================== */}


        <ModalFooter

    currentStep={currentStep}

    setCurrentStep={setCurrentStep}

    totalSteps={TOTAL_STEPS}

    onClose={onClose}

    onSubmit={handleSubmit}

    loading={loading}

/>

        </div>


    </div>


);
}