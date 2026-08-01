import React, {
    useState
} from "react";


import {
    createNSOTracking
} from "../services/nsoTrackingService";


import "../styles/NSOTracking.css";



function AddNSOTrackingModal({

    isOpen,

    onClose,

    onSuccess

}) {


    // ======================================================
    // FORM STATE
    // ======================================================

    const initialState = {

        new_store_opening_id:"",

        rule_id:"",

        department_id:"",

        trigger_column:"",

        status:"Pending",

        due_date:"",

        remarks:""

    };


    const [formData,setFormData] = useState(initialState);



    // ======================================================
    // CLOSE MODAL
    // ======================================================

    if(!isOpen)

        return null;





    // ======================================================
    // HANDLE INPUT CHANGE
    // ======================================================

    const handleChange=(e)=>{


        setFormData({

            ...formData,

            [e.target.name]:
            e.target.value

        });


    };







    // ======================================================
    // CREATE NSO TRACKING
    // ======================================================

    const handleSubmit=async(e)=>{


        e.preventDefault();




        // ================= VALIDATION =================


        if(!formData.new_store_opening_id){

            alert(
                "New Store Opening ID is required"
            );

            return;

        }



        if(!formData.department_id){

            alert(
                "Department ID is required"
            );

            return;

        }



        if(!formData.trigger_column){

            alert(
                "Trigger Column is required"
            );

            return;

        }






        try{


            await createNSOTracking(

                formData

            );



            alert(

                "NSO Tracking Created Successfully"

            );



            setFormData(

                initialState

            );



            onSuccess();



            onClose();



        }


        catch(error){


            console.error(

                "Create NSO Tracking Error",

                error

            );



            alert(

                error.response?.data?.message ||

                "Failed to create tracking"

            );


        }


    };









    return (

        <div className="modal-overlay">


            <div className="modal-box">



                <h2>

                    Add NSO Tracking

                </h2>




                <form onSubmit={handleSubmit}>


                    {/* NEW STORE OPENING ID */}

                    <input

                        name="new_store_opening_id"

                        placeholder="New Store Opening ID"

                        value={
                            formData.new_store_opening_id
                        }

                        onChange={handleChange}

                    />





                    {/* RULE ID */}

                    <input

                        name="rule_id"

                        placeholder="Rule ID"

                        value={
                            formData.rule_id
                        }

                        onChange={handleChange}

                    />





                    {/* DEPARTMENT ID */}

                    <input

                        name="department_id"

                        placeholder="Department ID"

                        value={
                            formData.department_id
                        }

                        onChange={handleChange}

                    />





                    {/* TRIGGER COLUMN */}

                    <input

                        name="trigger_column"

                        placeholder="Trigger Column"

                        value={
                            formData.trigger_column
                        }

                        onChange={handleChange}

                    />







                    {/* STATUS */}

                    <select

                        name="status"

                        value={
                            formData.status
                        }

                        onChange={handleChange}

                    >


                        <option>
                            Pending
                        </option>


                        <option>
                            In Progress
                        </option>


                        <option>
                            Completed
                        </option>


                        <option>
                            Hold
                        </option>


                    </select>







                    {/* DUE DATE */}

                    <input

                        type="date"

                        name="due_date"

                        value={
                            formData.due_date
                        }

                        onChange={handleChange}

                    />








                    {/* REMARKS */}

                    <textarea

                        name="remarks"

                        placeholder="Remarks"

                        value={
                            formData.remarks
                        }

                        onChange={handleChange}

                    />









                    <div className="modal-actions">



                        <button

                            type="submit"

                            className="save-btn"

                        >

                            Save

                        </button>





                        <button

                            type="button"

                            onClick={onClose}

                            className="cancel-btn"

                        >

                            Cancel

                        </button>




                    </div>




                </form>




            </div>



        </div>

    );


}



export default AddNSOTrackingModal;