import React, {
    useEffect,
    useState
} from "react";


// ======================================================
// SERVICES
// ======================================================

import {

    getNewStoreOpenings,

    deleteNewStoreOpening,

    deleteAllNewStoreOpenings,

    bulkUploadNewStoreOpenings,

    exportNewStoreOpenings

} from "../services/newStoreOpeningService";




// ======================================================
// COMPONENTS
// ======================================================

import AddNewStoreOpeningModal from "../components/AddNewStoreOpeningModal";


// ======================================================
// STYLE
// ======================================================

import "../styles/NewStoreOpenings.css";





function NewStoreOpenings(){



    // ======================================================
    // STATES
    // ======================================================


    const [data,setData] = useState([]);


    const [loading,setLoading] = useState(false);



    // SEARCH

    const [search,setSearch] = useState("");



    // PAGINATION

    const [page,setPage] = useState(1);


    const [limit,setLimit] = useState(10);


    const [totalPages,setTotalPages] = useState(1);


    const [total,setTotal] = useState(0);




    // MODALS


    const [showAddModal,setShowAddModal] = useState(false);


   


    const [selectedData,setSelectedData] = useState(null);





    // IMPORT FILE


    const [selectedFile,setSelectedFile] = useState(null);






    // ======================================================
    // LOAD DATA
    // SEARCH + PAGINATION
    // ======================================================


    const loadData = async()=>{


        try{


            setLoading(true);



            const response = await getNewStoreOpenings({

                page,

                limit,

                search

            });





            setData(

                response.data.data || []

            );



            setTotal(

                response.data.total || 0

            );



            setTotalPages(

                response.data.totalPages || 1

            );



        }


        catch(error){


            console.error(

                "FETCH NEW STORE ERROR",

                error

            );


        }


        finally{


            setLoading(false);


        }


    };






    // ======================================================
    // USE EFFECT
    // ======================================================


    useEffect(()=>{


        loadData();


    },[

        page,

        limit,

        search

    ]);


// ======================================================
// OPEN ADD MODAL
// ======================================================

const handleAdd = () => {


    setSelectedData(null);


    setShowAddModal(true);


};






// ======================================================
// OPEN EDIT MODAL
// ======================================================

const handleEdit = (item) => {


    setSelectedData(item);


    setShowAddModal(true);


};






// ======================================================
// DELETE SINGLE
// ======================================================

const handleDelete = async(id)=>{


    const confirmDelete =
    window.confirm(
        "Delete this New Store Opening?"
    );



    if(!confirmDelete)

        return;





    try{


        await deleteNewStoreOpening(id);



        alert(
            "Deleted Successfully"
        );



        loadData();



    }


    catch(error){


        console.error(

            "DELETE ERROR",

            error

        );


    }



};








// ======================================================
// DELETE ALL
// ======================================================

const handleDeleteAll = async()=>{


    const confirmDelete =

    window.confirm(

        "Delete all New Store Openings?"

    );



    if(!confirmDelete)

        return;





    try{


        await deleteAllNewStoreOpenings();



        alert(

            "All Records Deleted"

        );



        loadData();



    }


    catch(error){


        console.error(

            "DELETE ALL ERROR",

            error

        );


    }



};









// ======================================================
// IMPORT EXCEL
// ======================================================

const handleImport = async()=>{


    if(!selectedFile){


        alert(

            "Please select Excel file"

        );


        return;


    }





    try{


        await bulkUploadNewStoreOpenings(

            selectedFile

        );



        alert(

            "Import Successfully Completed"

        );



        setSelectedFile(null);



        loadData();



    }


    catch(error){


        console.error(

            "IMPORT ERROR",

            error

        );


        alert(

            "Import Failed"

        );


    }



};









// ======================================================
// EXPORT CSV
// ======================================================

const handleExport = async()=>{


    try{


        const response =

        await exportNewStoreOpenings({

            search

        });





        const url =

        window.URL.createObjectURL(

            new Blob([response.data])

        );





        const link =

        document.createElement("a");





        link.href = url;



        link.download =

        "new_store_openings.csv";





        document.body.appendChild(link);



        link.click();



        document.body.removeChild(link);



    }


    catch(error){


        console.error(

            "EXPORT ERROR",

            error

        );


    }



};









// ======================================================
// AFTER SAVE SUCCESS
// ======================================================

const handleSuccess = ()=>{


    setShowAddModal(false);


    setShowEditModal(false);


    setSelectedData(null);



    loadData();


};
return (

<div className="new-store-page">


{/* ======================================================
    HEADER
====================================================== */}

<div className="page-header">


<h2>

New Store Openings

</h2>



<button

className="add-btn"

onClick={handleAdd}

>

+ Add Entry

</button>



</div>





{/* ======================================================
    TOOLBAR
====================================================== */}


<div className="toolbar">



<input

type="text"

placeholder="Search..."

value={search}

onChange={(e)=>{

    setSearch(e.target.value);

    setPage(1);

}}

/>





<button

onClick={()=>{

setSearch("");

setPage(1);

}}

>

Clear

</button>







<input

type="file"

accept=".xlsx,.xls"

onChange={(e)=>

setSelectedFile(

e.target.files[0]

)

}

/>






<button

className="import-btn"

onClick={handleImport}

>

Import Excel

</button>







<button

className="export-btn"

onClick={handleExport}

>

Export CSV

</button>







<button

className="delete-all-btn"

onClick={handleDeleteAll}

>

Delete All

</button>





</div>










{/* ======================================================
    TABLE
====================================================== */}



{

loading ? (


<h3>

Loading...

</h3>



)

:

(


<div className="table-wrapper">



<table>



<thead>


<tr>


<th>
Location
</th>


<th>
City
</th>


<th>
SB Area
</th>


<th>
Carpet Area
</th>


<th>
CAM
</th>


<th>
MG
</th>


<th>
Electricity KVA
</th>


<th>
Revenue Share
</th>


<th>
Escalation
</th>


<th>
Expected Sale
</th>


<th>
Broker Name
</th>


<th>
Operation Head
</th>


<th>
ASM
</th>


<th>
Deal Days
</th>


<th>
Actual Possession
</th>


<th>
Remarks
</th>


<th>
Attachment
</th>


<th>
Actions
</th>


</tr>


</thead>






<tbody>



{

data.length===0 ?



(


<tr>


<td colSpan="18">


No Records Found


</td>


</tr>


)



:



data.map((item)=>(


<tr key={item.id}>


<td>
{item.location}
</td>



<td>
{item.city}
</td>



<td>
{item.sb_area}
</td>



<td>
{item.carpet_area}
</td>



<td>
{item.cam}
</td>



<td>
{item.mg}
</td>



<td>
{item.electricity_kva}
</td>



<td>
{item.revenue_share}
</td>



<td>
{item.escalation}
</td>



<td>
{item.expected_sale}
</td>



<td>
{item.broker_name}
</td>



<td>
{item.operation_head_assigned}
</td>



<td>
{item.asm_assigned}
</td>



<td>
{item.deal_days}
</td>



<td>

{
item.actual_possession_date || "-"
}

</td>



<td>

{
item.remarks || "-"
}

</td>




<td>


{

item.attachment ?


(

<a

href={item.attachment}

target="_blank"

rel="noreferrer"

>

View

</a>


)


:

("-")


}


</td>






<td className="action-buttons">



<button

className="edit-btn"

onClick={()=>handleEdit(item)}

>

Edit

</button>






<button

className="delete-btn"

onClick={()=>handleDelete(item.id)}

>

Delete

</button>





</td>




</tr>



))


}



</tbody>



</table>



</div>



)



}
// ======================================================
// PAGINATION
// ======================================================


<div className="pagination">



<button

disabled={page === 1}

onClick={()=>setPage(page-1)}

>

Previous

</button>





<span>

Page {page} of {totalPages}

</span>





<button

disabled={page === totalPages}

onClick={()=>setPage(page+1)}

>

Next

</button>






<select

value={limit}

onChange={(e)=>{

setLimit(

Number(e.target.value)

);

setPage(1);


}}

>


<option value={10}>

10

</option>



<option value={25}>

25

</option>



<option value={50}>

50

</option>



<option value={100}>

100

</option>



</select>







<span>

Total Records : {total}

</span>





</div>







{/* ======================================================
    ADD / EDIT MODAL
====================================================== */}


<AddNewStoreOpeningModal


    isOpen={showAddModal}


    editData={selectedData}


    onClose={()=>{


        setShowAddModal(false);


        setSelectedData(null);


    }}



    onSuccess={handleSuccess}


/>



</div>

);

}



export default NewStoreOpenings;