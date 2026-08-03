import React, {

    useEffect,

    useState

} from "react";


import {

    createNewStoreOpening,

    updateNewStoreOpening

} from "../services/newStoreOpeningService";


import "../styles/AddNewStoreOpeningModal.css";




// ======================================================
// INITIAL FORM STATE
// ======================================================


const initialState = {


    // BASIC DETAILS

    location:"",

    city:"",


    // AREA DETAILS

    sb_area:"",

    carpet_area:"",



    // FINANCIAL DETAILS

    cam:"",

    mg:"",

    electricity_kva:"",

    revenue_share:"",

    escalation:"",

    expected_sale:"",



    // POSSESSION DETAILS

    possession_date_loi:"",

    possession_date_broker:"",

    actual_possession_date:"",



    // PEOPLE DETAILS

    broker_name:"",

    operation_head_assigned:"",

    asm_assigned:"",



    // DEAL DETAILS

    deal_days:"",



    // APPROVAL DETAILS

    approver_name:"",

    construction_vendor:"",

    project_taken_by:"",



    // DEADLINES

    visit_by_op_team:"",

    gst_deadline:"",

    hr_hiring_deadline:"",

    team_training_deadline:"",

    visit_by_nso_team_deadline:"",

    plan_of_stock_deadline:"",

    plan_of_collaterals_deadline:"",

    on_field_training_deadline:"",

    dispatch_stock_deadline:"",

    nso_handover_deadline:"",

    vm_handover_deadline:"",

    scanning_deadline:"",

    billing_start_date:"",



    // OTHER

    remarks:"",

    attachment:""


};






function AddNewStoreOpeningModal({


    isOpen,


    onClose,


    onSuccess,


    editData


}) {



    // ======================================================
    // STATES
    // ======================================================


    const [form,setForm] = useState(

        initialState

    );



    const [loading,setLoading] = useState(false);



    const [file,setFile] = useState(null);

    // ======================================================
// LOAD EDIT DATA
// ======================================================

useEffect(()=>{


    if(editData){


        setForm({

            ...initialState,

            ...editData

        });


    }

    else{


        setForm(initialState);


        setFile(null);


    }


},[editData,isOpen]);








// ======================================================
// HANDLE INPUT CHANGE
// ======================================================

const handleChange = (e)=>{


    const {

        name,

        value

    } = e.target;



    setForm((prev)=>({


        ...prev,


        [name]:value


    }));



};







// ======================================================
// HANDLE FILE CHANGE
// ======================================================

const handleFileChange = (e)=>{


    const selectedFile =

    e.target.files[0];



    setFile(selectedFile);


};








// ======================================================
// VALIDATION
// ======================================================

const validateForm = ()=>{


    if(!form.location){


        alert(
            "Location is required"
        );


        return false;


    }




    if(!form.city){


        alert(
            "City is required"
        );


        return false;


    }




    if(!form.broker_name){


        alert(
            "Broker Name is required"
        );


        return false;


    }




    return true;


};








// ======================================================
// SUBMIT FORM
// ======================================================

const handleSubmit = async(e)=>{


    e.preventDefault();




    if(!validateForm())

        return;





    try{


        setLoading(true);




        const formData = new FormData();





        Object.keys(form).forEach((key)=>{


            formData.append(

                key,

                form[key] || ""

            );


        });







        // FILE UPLOAD

        if(file){


            formData.append(

                "attachment",

                file

            );


        }






        if(editData){


            await updateNewStoreOpening(


                editData.id,


                formData


            );


            alert(

                "New Store Opening Updated Successfully"

            );


        }


        else{


            await createNewStoreOpening(

                formData

            );


            alert(

                "New Store Opening Created Successfully"

            );


        }






        setFile(null);



        onSuccess();





    }


    catch(error){


        console.error(

            "SAVE ERROR:",

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








if(!isOpen)

    return null;
    return (

<div className="nso-modal-overlay">


<div className="nso-modal">



{/* ======================================================
    HEADER
====================================================== */}


<div className="nso-modal-header">


<h2>

{

editData

?

"Edit New Store Opening"

:

"Add New Store Opening"

}

</h2>




<button

className="close-btn"

onClick={onClose}

>

×

</button>


</div>







<form onSubmit={handleSubmit}>



<div className="nso-grid">





{/* ================= BASIC ================= */}


<div className="form-group">

<label>Location</label>

<input

type="text"

name="location"

value={form.location}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>City</label>

<input

type="text"

name="city"

value={form.city}

onChange={handleChange}

/>

</div>






<div className="form-group">

<label>SB Area</label>

<input

type="number"

name="sb_area"

value={form.sb_area}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Carpet Area</label>

<input

type="number"

name="carpet_area"

value={form.carpet_area}

onChange={handleChange}

/>

</div>







{/* ================= FINANCIAL ================= */}



<div className="form-group">

<label>CAM</label>

<input

type="number"

name="cam"

value={form.cam}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>MG</label>

<input

type="number"

name="mg"

value={form.mg}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Electricity KVA</label>

<input

type="text"

name="electricity_kva"

value={form.electricity_kva}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Revenue Share %</label>

<input

type="number"

name="revenue_share"

value={form.revenue_share}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Escalation %</label>

<input

type="number"

name="escalation"

value={form.escalation}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Expected Sale</label>

<input

type="number"

name="expected_sale"

value={form.expected_sale}

onChange={handleChange}

/>

</div>







{/* ================= POSSESSION ================= */}



<div className="form-group">

<label>Possession Date LOI</label>

<input

type="date"

name="possession_date_loi"

value={form.possession_date_loi}

onChange={handleChange}

/>

</div>






<div className="form-group">

<label>Possession Date Broker</label>

<input

type="date"

name="possession_date_broker"

value={form.possession_date_broker}

onChange={handleChange}

/>

</div>






<div className="form-group">

<label>Actual Possession Date</label>

<input

type="date"

name="actual_possession_date"

value={form.actual_possession_date}

onChange={handleChange}

/>

</div>









{/* ================= PEOPLE ================= */}



<div className="form-group">

<label>Broker Name</label>

<input

type="text"

name="broker_name"

value={form.broker_name}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Operation Head Assigned</label>

<input

type="text"

name="operation_head_assigned"

value={form.operation_head_assigned}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>ASM Assigned</label>

<input

type="text"

name="asm_assigned"

value={form.asm_assigned}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Deal Days</label>

<input

type="number"

name="deal_days"

value={form.deal_days}

onChange={handleChange}

/>

</div>







{/* ================= APPROVAL ================= */}



<div className="form-group">

<label>Approver Name</label>

<input

type="text"

name="approver_name"

value={form.approver_name}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Construction Vendor</label>

<input

type="text"

name="construction_vendor"

value={form.construction_vendor}

onChange={handleChange}

/>

</div>







<div className="form-group">

<label>Project Taken By</label>

<input

type="text"

name="project_taken_by"

value={form.project_taken_by}

onChange={handleChange}

/>

</div>



<div className="form-group">

<label>Visit By Operation Team</label>

<input

type="date"

name="visit_by_op_team"

value={form.visit_by_op_team}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>GST Deadline</label>

<input

type="date"

name="gst_deadline"

value={form.gst_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>HR Hiring Deadline</label>

<input

type="date"

name="hr_hiring_deadline"

value={form.hr_hiring_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>Team Training Deadline</label>

<input

type="date"

name="team_training_deadline"

value={form.team_training_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>Visit By NSO Team Deadline</label>

<input

type="date"

name="visit_by_nso_team_deadline"

value={form.visit_by_nso_team_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>Plan Of Stock Deadline</label>

<input

type="date"

name="plan_of_stock_deadline"

value={form.plan_of_stock_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>Plan Of Collaterals Deadline</label>

<input

type="date"

name="plan_of_collaterals_deadline"

value={form.plan_of_collaterals_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>On Field Training Deadline</label>

<input

type="date"

name="on_field_training_deadline"

value={form.on_field_training_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>Dispatch Stock Deadline</label>

<input

type="date"

name="dispatch_stock_deadline"

value={form.dispatch_stock_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>NSO Handover Deadline</label>

<input

type="date"

name="nso_handover_deadline"

value={form.nso_handover_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>VM Handover Deadline</label>

<input

type="date"

name="vm_handover_deadline"

value={form.vm_handover_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>Scanning Deadline</label>

<input

type="date"

name="scanning_deadline"

value={form.scanning_deadline}

onChange={handleChange}

/>

</div>





<div className="form-group">

<label>Billing Start Date</label>

<input

type="date"

name="billing_start_date"

value={form.billing_start_date}

onChange={handleChange}

/>

</div>







{/* ======================================================
    REMARKS
====================================================== */}


<div className="form-group full-width">


<label>

Remarks

</label>



<textarea

name="remarks"

value={form.remarks}

onChange={handleChange}

placeholder="Enter remarks"

/>



</div>








{/* ======================================================
    ATTACHMENT
====================================================== */}


<div className="form-group full-width">


<label>

Attachment

</label>



<input

type="file"

onChange={handleFileChange}

/>



{

editData?.attachment &&

(

<small>

Existing File Available

</small>

)

}



</div>





</div>








{/* ======================================================
    FOOTER
====================================================== */}


<div className="modal-footer">



<button

type="button"

className="cancel-btn"

onClick={onClose}

>

Cancel

</button>







<button

type="submit"

className="submit-btn"

disabled={loading}

>


{

loading

?

"Saving..."

:

editData

?

"Update Entry"

:

"Submit Entry"

}



</button>



</div>






</form>



</div>



</div>


);

}




export default AddNewStoreOpeningModal;