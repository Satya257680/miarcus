import React, {
    useEffect,
    useState
} from "react";

import {

    getNSOTracking,

    deleteNSOTracking,

    deleteAllNSOTracking,

    exportNSOTracking,

    updateNSOTrackingStatus

} from "../services/nsoTrackingService";

import "../styles/NSOTracking.css";

import AddNSOTrackingModal from "../components/AddNSOTrackingModal";

import EditNSOTrackingModal from "../components/EditNSOTrackingModal";



function NSOTracking() {


    // ======================================================
    // STATES
    // ======================================================

    const [tracking, setTracking] = useState([]);

    const [loading, setLoading] = useState(false);


    const [search, setSearch] = useState("");


    const [page, setPage] = useState(1);


    const [limit] = useState(10);


    const [totalPages, setTotalPages] = useState(1);

    const [showAddModal,setShowAddModal] = useState(false);

const [showEditModal,setShowEditModal] = useState(false);

const [selectedTracking,setSelectedTracking] = useState(null);





    // ======================================================
    // PERMISSIONS
    // ======================================================


    const permissions = JSON.parse(

        localStorage.getItem("permissions")

    ) || {};



    const nsoPermission =
        permissions["NSO Tracking"] || "None";





    // ======================================================
    // FETCH DATA
    // ======================================================

    const fetchTracking = async () => {


        try {


            setLoading(true);



            const response = await getNSOTracking({

                search,

                page,

                limit

            });



            if(response.data.success){


                setTracking(

                    response.data.data

                );


                setTotalPages(

                    response.data.totalPages

                );


            }



        }

        catch(error){


            console.error(

                "Fetch NSO Tracking Error",

                error

            );


        }

        finally{


            setLoading(false);


        }


    };







    useEffect(()=>{


        fetchTracking();


    },[page,search]);




// ======================================================
// UPDATE STATUS
// ======================================================

const handleStatusChange = async(

    id,

    status

)=>{


    try{


        await updateNSOTrackingStatus(

            id,

            status

        );


        fetchTracking();


    }

    catch(error){

        console.error(

            "Status Update Error",

            error

        );

    }


};




    // ======================================================
    // DELETE
    // ======================================================

    const handleDelete = async(id)=>{


        if(

            !window.confirm(

                "Delete this NSO Tracking?"

            )

        )

        return;



        try{


            await deleteNSOTracking(id);


            fetchTracking();



        }

        catch(error){


            console.error(error);


        }


    };







    // ======================================================
    // DELETE ALL
    // ======================================================

    const handleDeleteAll = async()=>{


        if(

            !window.confirm(

                "Delete all NSO Tracking?"

            )

        )

        return;



        try{


            await deleteAllNSOTracking();


            fetchTracking();



        }

        catch(error){


            console.error(error);


        }


    };







    // ======================================================
    // EXPORT
    // ======================================================

    const handleExport = async()=>{


        try{


            const response =
                await exportNSOTracking();



            const url =
                window.URL.createObjectURL(

                    new Blob(

                        [response.data]

                    )

                );



            const link =
                document.createElement("a");



            link.href=url;


            link.setAttribute(

                "download",

                "NSO_Tracking.csv"

            );



            document.body.appendChild(link);



            link.click();



            link.remove();



        }

        catch(error){


            console.error(error);


        }


    };








    return (

        <div className="nso-tracking-page">



            {/* ======================================================
                HEADER
            ====================================================== */}


            <div className="page-header">


                <h2>

                    NSO Tracking

                </h2>



                <div className="actions">


                    {

                    nsoPermission === "Full" &&

                    <button

                        onClick={handleDeleteAll}

                        className="delete-all-btn"

                    >

                        Delete All

                    </button>

                    }



                    {

                    nsoPermission !== "None" &&

                    <button

                        onClick={handleExport}

                        className="export-btn"

                    >

                        Export

                    </button>

                    }



                    {

                    (

                    nsoPermission === "Add" ||

                    nsoPermission === "Full"

                    )

                    &&

                    <button

className="add-btn"

onClick={()=>setShowAddModal(true)}

>

+ Add Tracking

</button>

                    }


                </div>



            </div>









            {/* ======================================================
                SEARCH
            ====================================================== */}


            <input

                type="text"

                placeholder="Search NSO Tracking..."

                value={search}

                onChange={(e)=>{


                    setSearch(e.target.value);

                    setPage(1);


                }}

                className="search-box"

            />









            {/* ======================================================
                TABLE
            ====================================================== */}


            <div className="table-container">


            {

            loading ?


            <h3>

                Loading...

            </h3>


            :


            <table>


                <thead>

                    <tr>

                        <th>ID</th>

                        <th>New Store Opening</th>

                        <th>Department</th>

                        <th>Trigger</th>

                        <th>Status</th>

                        <th>Due Date</th>

                        <th>Action</th>


                    </tr>


                </thead>




                <tbody>


                {


                tracking.length === 0 ?


                <tr>

                    <td colSpan="7">

                        No Data Found

                    </td>

                </tr>


                :


                tracking.map((item)=>(


                    <tr key={item.id}>


                        <td>

                            {item.id}

                        </td>



                        <td>

                            {item.new_store_opening_id}

                        </td>



                        <td>

                            {item.department_id}

                        </td>



                        <td>

                            {item.trigger_column}

                        </td>


<td>

<select

value={item.status}

onChange={(e)=>
handleStatusChange(
    item.id,
    e.target.value
)
}

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

</td>


                        <td>

                            {item.due_date || "-"}

                        </td>




                        <td>


                        {

                        nsoPermission === "Full"

                        &&


                        <button

                            className="delete-btn"

                            onClick={()=>handleDelete(item.id)}

                        >

                            Delete

                        </button>


                        }



                        {

                        (

                        nsoPermission === "Edit"

                        ||

                        nsoPermission === "Full"

                        )

                        &&


                        <button

className="edit-btn"

onClick={()=>{

setSelectedTracking(item);

setShowEditModal(true);

}}

>

Edit

</button>




                        }
                       


                        </td>



                    </tr>


                ))



                }



                </tbody>


            </table>


            }


            </div>



{/* ======================================================
    MODALS
====================================================== */}


<AddNSOTrackingModal

    isOpen={showAddModal}

    onClose={()=>setShowAddModal(false)}

    onSuccess={fetchTracking}

/>



<EditNSOTrackingModal

    isOpen={showEditModal}

    data={selectedTracking}

onClose={()=>{

    setShowEditModal(false);

    setSelectedTracking(null);

}}

    onSuccess={fetchTracking}

/>





            {/* ======================================================
                PAGINATION
            ====================================================== */}



            <div className="pagination">


                <button

                    disabled={page===1}

                    onClick={()=>setPage(page-1)}

                >

                    Previous

                </button>




                <span>

                    Page {page} of {totalPages}

                </span>





                <button

                    disabled={page===totalPages}

                    onClick={()=>setPage(page+1)}

                >

                    Next

                </button>


            </div>



        </div>

    );

}



export default NSOTracking;