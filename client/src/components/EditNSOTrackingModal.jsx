import React, {
    useEffect,
    useState
} from "react";


import {

    updateNSOTracking

} from "../services/nsoTrackingService";


import "../styles/NSOTracking.css";





function EditNSOTrackingModal({

    isOpen,

    onClose,

    data,

    onSuccess

}) {



    // ======================================================
    // INITIAL STATE
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



    const [formData,setFormData] = useState(

        initialState

    );







    // ======================================================
    // LOAD DATA
    // ======================================================

    useEffect(()=>{


        if(data){

            setFormData({

                new_store_opening_id:
                data.new_store_opening_id || "",


                rule_id:
                data.rule_id || "",


                department_id:
                data.department_id || "",


                trigger_column:
                data.trigger_column || "",


                status:
                data.status || "Pending",


                due_date:
                data.due_date || "",


                remarks:
                data.remarks || ""

            });


        }


    },[data]);









    if(!isOpen)

        return null;









    // ======================================================
    // HANDLE CHANGE
    // ======================================================

    const handleChange=(e)=>{


        setFormData({

            ...formData,

            [e.target.name]:
            e.target.value

        });


    };









    // ======================================================
    // UPDATE
    // ======================================================

    const handleSubmit=async(e)=>{


        e.preventDefault();




        if(!formData.trigger_column){


            alert(

                "Trigger Column is required"

            );


            return;

        }




        if(!formData.department_id){


            alert(

                "Department ID is required"

            );


            return;

        }





        try{


            await updateNSOTracking(

                data.id,

                formData

            );



            alert(

                "NSO Tracking Updated Successfully"

            );



            onSuccess();



            onClose();



        }


        catch(error){


            console.error(

                "Update NSO Tracking Error",

                error

            );



            alert(

                error.response?.data?.message ||

                "Failed to update tracking"

            );


        }


    };









    return (

        <div className="modal-overlay">



            <div className="modal-box">



                <h2>

                    Edit NSO Tracking

                </h2>






                <form onSubmit={handleSubmit}>





                    {/* NEW STORE OPENING */}

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








                    {/* DEPARTMENT */}

                    <input


                        name="department_id"


                        placeholder="Department ID"


                        value={

                            formData.department_id

                        }


                        onChange={handleChange}


                    />








                    {/* TRIGGER */}

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

                            Update

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




export default EditNSOTrackingModal;