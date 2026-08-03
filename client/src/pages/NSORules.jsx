import React, {
    useEffect,
    useState
} from "react";


import {

    getRules,

    deleteRule,

    deleteAllRules,

    bulkUploadRules,

    exportRules

} from "../services/nsoRuleService";


import AddRuleModal from "../components/AddRuleModal";

import BulkUploadModal from "../components/BulkUploadModal";


import "../styles/NSORules.css";



function NSORules(){


// ==========================================
// STATES
// ==========================================


const [rules,setRules] = useState([]);


const [loading,setLoading] = useState(true);



const [search,setSearch] = useState("");



const [currentPage,setCurrentPage] = useState(1);



const [totalPages,setTotalPages] = useState(1);



const [totalRecords,setTotalRecords] = useState(0);



const [showModal,setShowModal] = useState(false);



const [editData,setEditData] = useState(null);



const [showBulkUpload,setShowBulkUpload] = useState(false);



const rowsPerPage = 10;



// ==========================================
// USER + RBAC
// ==========================================


const user = JSON.parse(

    localStorage.getItem("user") || "{}"

);



const permissions = JSON.parse(

    localStorage.getItem("permissions") || "{}"

);



const isAdmin =

user.administrator === true ||

user.administrator === 1;



const permission =

permissions["NSO Rules"] || "None";



const canView =

isAdmin ||

[

"View",

"Add",

"Edit",

"Full"

].includes(permission);



const canAdd =

isAdmin ||

[

"Add",

"Edit",

"Full"

].includes(permission);



const canEdit =

isAdmin ||

[

"Edit",

"Full"

].includes(permission);



const canDelete =

isAdmin ||

permission === "Full";


// ==========================================
// LOAD NSO RULES
// SEARCH + PAGINATION
// ==========================================

const loadRules = async (

    page = currentPage,

    keyword = search

) => {


    try {


        setLoading(true);



        const res = await getRules(

            keyword,

            page,

            rowsPerPage

        );



        setRules(

            res.data || []

        );



        setTotalRecords(

            res.pagination?.total || 0

        );



        setTotalPages(

            res.pagination?.totalPages || 1

        );



    }

    catch(err){


        console.error(err);


        alert(

            "Failed to load NSO Rules."

        );


    }

    finally{


        setLoading(false);


    }


};




// ==========================================
// INITIAL LOAD
// ==========================================


useEffect(()=>{


    loadRules(

        currentPage,

        search

    );


},[

    currentPage,

    search

]);




// ==========================================
// ADD RULE
// ==========================================


const handleAdd = ()=>{


    if(!canAdd) return;



    setEditData(null);



    setShowModal(true);


};




// ==========================================
// EDIT RULE
// ==========================================


const handleEdit = (rule)=>{


    if(!canEdit) return;



    setEditData(rule);



    setShowModal(true);


};




// ==========================================
// DELETE SINGLE RULE
// ==========================================


const handleDelete = async(id)=>{


    const confirmDelete = window.confirm(

        "Are you sure you want to delete this rule?"

    );



    if(!confirmDelete) return;



    try{


        await deleteRule(id);



        alert(

            "Rule deleted successfully."

        );



        loadRules();



    }

    catch(err){


        console.error(err);



        alert(

            err.response?.data?.message ||

            "Failed to delete rule."

        );


    }


};




// ==========================================
// DELETE ALL RULES
// ==========================================


const handleDeleteAll = async()=>{


    if(!canDelete){


        alert(

            "No permission."

        );


        return;


    }



    const confirmDelete = window.confirm(

        "Are you sure you want to delete ALL NSO Rules?"

    );



    if(!confirmDelete) return;



    try{


        await deleteAllRules();



        alert(

            "All NSO Rules deleted successfully."

        );



        setCurrentPage(1);



        loadRules(

            1,

            ""

        );


    }

    catch(err){


        console.error(err);



        alert(

            err.response?.data?.message ||

            "Failed to delete all rules."

        );


    }


};




// ==========================================
// EXPORT RULES
// ==========================================


const handleExport = async()=>{


    try{


        const response = await exportRules();



        const url = window.URL.createObjectURL(

            new Blob([response.data])

        );



        const link = document.createElement("a");



        link.href = url;



        link.setAttribute(

            "download",

            "NSO_Rules.csv"

        );



        document.body.appendChild(link);



        link.click();



        link.remove();



    }

    catch(err){


        console.error(err);



        alert(

            "Failed to export rules."

        );


    }


};




// ==========================================
// CLEAR SEARCH
// ==========================================


const handleClearFilters = ()=>{


    setSearch("");

    setCurrentPage(1);



    loadRules(

        1,

        ""

    );


};
// ==========================================
// RETURN JSX
// ==========================================

return (

<div className="nso-rules-page">


{/* ==========================================
    HEADER
========================================== */}

<div className="page-header">


<h2>

NSO Rules

</h2>



<div className="header-actions">



{canAdd && (

<button

className="add-btn"

onClick={handleAdd}

>

+ Add Rule

</button>

)}




{canAdd && (

<button

className="bulk-btn"

onClick={()=>setShowBulkUpload(true)}

>

Bulk Upload

</button>

)}




{canView && (

<button

className="export-btn"

onClick={handleExport}

>

Export

</button>

)}




{canDelete && (

<button

className="delete-all-btn"

onClick={handleDeleteAll}

>

Delete All

</button>

)}



</div>


</div>





{/* ==========================================
    SEARCH
========================================== */}


<div className="filter-section">



<input

type="text"

placeholder="Search trigger column or department..."

value={search}

onChange={(e)=>{


setSearch(e.target.value);


setCurrentPage(1);


}}

className="search-input"

/>




<button

className="clear-btn"

onClick={handleClearFilters}

>

Clear

</button>



</div>





{/* ==========================================
    TABLE
========================================== */}



<div className="table-container">


{loading ? (


<div className="loading">

Loading...

</div>


) : (



<table>



<thead>


<tr>


<th>

ID

</th>


<th>

Trigger Column

</th>


<th>

Departments

</th>


<th>

Actions

</th>


</tr>


</thead>





<tbody>


{rules.length > 0 ? (


rules.map((rule)=>(



<tr

key={rule.id}

>


<td>

{rule.id}

</td>



<td>

{rule.trigger_column}

</td>



<td>

{rule.departments || "-"}

</td>





<td>


<div className="action-buttons">



{canEdit && (

<button

className="edit-btn"

onClick={()=>handleEdit(rule)}

>

Edit

</button>

)}





{canDelete && (

<button

className="delete-btn"

onClick={()=>handleDelete(rule.id)}

>

Delete

</button>

)}



</div>


</td>



</tr>



))


) : (


<tr>


<td

colSpan="4"

className="no-data"

>

No NSO Rules Found

</td>


</tr>


)}



</tbody>


</table>



)}



</div>





{/* ==========================================
    PAGINATION
========================================== */}



<div className="pagination">



<button

disabled={currentPage === 1}

onClick={()=>setCurrentPage(

prev=>prev-1

)}

>

Previous

</button>





<span>


Page {currentPage} of {totalPages}


</span>





<button

disabled={currentPage === totalPages}

onClick={()=>setCurrentPage(

prev=>prev+1

)}

>

Next

</button>



</div>



<AddRuleModal


isOpen={showModal}



editData={editData}



onClose={()=>{


    setShowModal(false);


    setEditData(null);


}}



onSuccess={()=>{


    setShowModal(false);


    setEditData(null);


    loadRules();


}}


/>





{/* ==========================================
    BULK UPLOAD MODAL
========================================== */}



<BulkUploadModal



isOpen={showBulkUpload}



onClose={()=>{


    setShowBulkUpload(false);


}}



uploadFunction={bulkUploadRules}



title="Bulk Upload NSO Rules"



onSuccess={()=>{


    setShowBulkUpload(false);


    loadRules();


}}


/>



</div>

);

}





export default NSORules;