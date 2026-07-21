import {
    useEffect,
    useState
} from "react";

import axios from "axios";

import {
    FaPlus,
    FaFileCsv,
    FaEdit,
    FaTrash,
    FaEye
} from "react-icons/fa";

import "../styles/ActionPoints.css";



function ActionPoints(){


const API="http://localhost:5000";



// ================= STATES =================


const [actionPoints,setActionPoints]=useState([]);


const [stores,setStores]=useState([]);


const [departments,setDepartments]=useState([]);


const [checklists,setChecklists]=useState([]);





const [page,setPage]=useState(1);


const [total,setTotal]=useState(0);


const limit=10;






// ================= FILTER STATES =================


const [search,setSearch]=useState("");


const [store,setStore]=useState("");


const [department,setDepartment]=useState("");


const [status,setStatus]=useState("");


const [checklistType,setChecklistType]=useState("");


const [startDate,setStartDate]=useState("");


const [endDate,setEndDate]=useState("");






// ================= MODAL =================


const [showModal,setShowModal]=useState(false);


const [showEdit,setShowEdit]=useState(false);



const [file,setFile]=useState(null);





// ================= CREATE FORM =================


const [form,setForm]=useState({

submission_id:"",

question_id:"",

answer:"",

remarks:"",

store_id:"",

department_id:"",

sla:""

});







// ================= EDIT DATA =================


const [editData,setEditData]=useState({

id:"",

question:"",

answer:"",

comment:"",

department_name:"",

sla:""

});









// ================= FETCH ACTION POINTS =================


const fetchActionPoints=async()=>{


try{


const res=await axios.get(

`${API}/api/action-points`,

{

params:{


page,

limit,


search,


store_id:store,


department_id:department,


status,


checklist_type_id:checklistType,


start_date:startDate,


end_date:endDate


}

}

);



setActionPoints(

res.data.data || []

);



setTotal(

res.data.total || 0

);



}

catch(error){


console.log(

"Action Point Fetch Error",

error

);


}


};











// ================= FETCH FILTERS =================


const fetchFilters=async()=>{


try{


const storeRes=

await axios.get(

`${API}/api/stores`

);



setStores(

storeRes.data.data || []

);







const deptRes=

await axios.get(

`${API}/api/departments`

);



setDepartments(

deptRes.data.data || []

);







const checklistRes=

await axios.get(

`${API}/api/checklist-types`

);



setChecklists(

checklistRes.data.data || []

);



}

catch(error){


console.log(

"Filter Error",

error

);


}


};









useEffect(()=>{


fetchFilters();


},[]);









useEffect(()=>{


fetchActionPoints();


},[

page,

search,

store,

department,

status,

checklistType,

startDate,

endDate

]);












// ================= CREATE ACTION POINT =================


const createActionPoint=async()=>{


try{


const data=new FormData();


// temporary submission id
// later connect with checklist submission
data.append(
"submission_id",
1
);



data.append(
"question_id",
form.question_id
);



data.append(
"answer",
form.answer
);



data.append(
"remarks",
form.remarks
);



data.append(
"store_id",
form.store_id
);



data.append(
"department_id",
form.department_id
);



data.append(
"sla",
form.sla
);




if(file){

data.append(
"attachment",
file
);

}





const response = await axios.post(

`${API}/api/action-points`,

data,

{

headers:{

"Content-Type":
"multipart/form-data"

}

}

);




console.log(
response.data
);



alert(
"Action Point Created Successfully"
);




setShowModal(false);



// clear form

setForm({

submission_id:"",

question_id:"",

answer:"",

remarks:"",

store_id:"",

department_id:"",

sla:""

});


setFile(null);



// reload table

fetchActionPoints();



}


catch(error){

console.log(
"CREATE ERROR:",
error.response?.data || error
);


alert(
JSON.stringify(
error.response?.data || error.message
)
);




}


};





// ================= UPDATE ACTION POINT =================


const updateActionPoint=async()=>{


try{


await axios.put(

`${API}/api/action-points/${editData.id}`,

{


answer:editData.answer,


remarks:editData.comment,


status:"No Action Taken"


}

);




setShowEdit(false);


fetchActionPoints();


}

catch(error){


console.log(

"Update Error",

error

);


}


};












// ================= DELETE =================


const deleteActionPoint=async(id)=>{


if(

!window.confirm(

"Delete Action Point?"

)

)

return;




try{


await axios.delete(

`${API}/api/action-points/${id}`

);



fetchActionPoints();



}

catch(error){


console.log(error);


}


};












// ================= EXPORT =================


const exportCSV=()=>{


window.open(

`${API}/api/action-points/export`

);


};











// ================= CLEAR FILTER =================


const clearFilters=()=>{


setSearch("");

setStore("");

setDepartment("");

setStatus("");

setChecklistType("");

setStartDate("");

setEndDate("");

setPage(1);


};
return(

<div className="action-page">



<h2>
Action Points
</h2>





{/* ================= FILTER ================= */}


<div className="action-filter">



<select
value={store}
onChange={(e)=>setStore(e.target.value)}
>

<option value="">
All Stores/Locations
</option>


{
stores.map(s=>(

<option

key={s.id}

value={s.id}

>

{s.store_name}

</option>

))

}

</select>







<select

value={department}

onChange={(e)=>setDepartment(e.target.value)}

>

<option value="">
All Departments
</option>


{

departments.map(d=>(

<option

key={d.id}

value={d.id}

>

{d.department_name}

</option>

))

}


</select>







<select

value={status}

onChange={(e)=>setStatus(e.target.value)}

>

<option value="">
All Statuses
</option>

<option>
Opened
</option>

<option>
In Progress
</option>

<option>
Closed
</option>

<option>
No Action Taken
</option>


</select>








<select

value={checklistType}

onChange={(e)=>setChecklistType(e.target.value)}

>


<option value="">
All Checklist Types
</option>


{

checklists.map(c=>(

<option

key={c.id}

value={c.id}

>

{c.checklist_name}

</option>

))

}


</select>








<input

type="date"

value={startDate}

onChange={(e)=>setStartDate(e.target.value)}

/>



<input

type="date"

value={endDate}

onChange={(e)=>setEndDate(e.target.value)}

/>







<input

className="search-box"

placeholder="Search action points..."

value={search}

onChange={(e)=>setSearch(e.target.value)}

/>







<div className="action-buttons">



<button

className="create-btn"

onClick={()=>setShowModal(true)}

>

<FaPlus/>

Add Action Point

</button>







<button

className="export-btn"

onClick={exportCSV}

>

<FaFileCsv/>

Export CSV

</button>






<button

onClick={clearFilters}

>

Clear Filters

</button>



</div>



</div>









{/* ================= TABLE ================= */}



<div className="action-table">


<table>


<thead>

<tr>

<th>Date</th>

<th>Store</th>

<th>City</th>

<th>State</th>

<th>Checklist</th>

<th>Question</th>

<th>Department</th>

<th>Answer</th>

<th>Comment</th>

<th>Attachment</th>

<th>Status</th>

<th>SLA</th>

<th>Next Action</th>

<th>Remarks</th>

<th>Actions</th>

<th>History</th>


</tr>


</thead>






<tbody>



{

actionPoints.length===0 ?


<tr>

<td colSpan="16">

No Action Points Found

</td>

</tr>



:


actionPoints.map(item=>(



<tr key={item.id}>


<td>

{new Date(item.date).toLocaleString()}

</td>



<td>

{item.store_name}

</td>



<td>

{item.city || "-"}

</td>



<td>

{item.state || "-"}

</td>



<td>

{item.checklist_name}

</td>



<td>

{item.question}

</td>



<td>

{item.department_name || "-"}

</td>



<td>

{item.answer || "-"}

</td>



<td>

{item.comment || "-"}

</td>





<td>


{

item.attachment ?


<a

href={`${API}/${item.attachment.replace("\\","/")}`}

target="_blank"

rel="noreferrer"

>

<FaEye/>

View

</a>


:

"-"


}


</td>







<td>


<div className="status-box">

{item.status}

</div>


</td>






<td className="sla">

{item.sla_status}

</td>






<td>

{item.next_action}

</td>






<td>

{item.remarks}

</td>








<td>


<button

className="edit-btn"

onClick={()=>{


setEditData({

id:item.id,

question:item.question,

answer:item.answer || "",

comment:item.comment || "",

department_name:item.department_name || ""

});


setShowEdit(true);


}}

>

<FaEdit/>

</button>







<button

className="delete-btn"

onClick={()=>deleteActionPoint(item.id)}

>

<FaTrash/>

</button>


</td>








<td>

{item.history}

</td>



</tr>


))


}



</tbody>


</table>


</div>









{/* ================= PAGINATION ================= */}



<div className="pagination">


<span>

Total: {total} entries

</span>





<button

disabled={page===1}

onClick={()=>setPage(page-1)}

>

Previous

</button>






<span>

Page {page}

</span>






<button

disabled={page*limit>=total}

onClick={()=>setPage(page+1)}

>

Next

</button>


</div>












{/* ================= CREATE MODAL ================= */}



{

showModal &&


<div className="modal-overlay">


<div className="modal-box">


<h3>
Create Point
</h3>





<select

onChange={(e)=>

setForm({

...form,

store_id:e.target.value

})

}

>


<option value="">
Select Store/Location
</option>


{

stores.map(s=>(

<option

key={s.id}

value={s.id}

>

{s.store_name}

</option>

))

}


</select>






<input

placeholder="Action Point Question/Description"

value={form.question_id}

onChange={(e)=>

setForm({

...form,

question_id:e.target.value

})

}

/>





<select

onChange={(e)=>

setForm({

...form,

department_id:e.target.value

})

}

>


<option value="">
Select Departments
</option>
{

departments.map(d=>(

<option

key={d.id}

value={d.id}

>

{d.department_name}

</option>

))

}


</select>








<div className="sla-row">


<input

placeholder="SLA Value"

onChange={(e)=>

setForm({

...form,

sla:e.target.value

})

}

/>





<select>

<option>

Hours

</option>


<option>

Days

</option>


</select>


</div>







<input

placeholder="Answer (optional)"

value={form.answer}

onChange={(e)=>

setForm({

...form,

answer:e.target.value

})

}

/>






<textarea

placeholder="Comment (optional)"

value={form.remarks}

onChange={(e)=>

setForm({

...form,

remarks:e.target.value

})

}

/>






<label className="file-label">

Attachment (optional)

</label>




<div className="file-box">


<input

type="file"

onChange={(e)=>setFile(e.target.files[0])}

/>


</div>







<div className="modal-actions">


<button

className="cancel-btn"

onClick={()=>setShowModal(false)}

>

Cancel

</button>






<button

className="submit-btn"

onClick={createActionPoint}

>

Create Point

</button>


</div>



</div>


</div>


}












{/* ================= EDIT MODAL ================= */}



{

showEdit && editData &&


<div className="modal-overlay">


<div className="modal-box">


<h3>

Edit Action Point

</h3>






<input

value={editData.question}

readOnly

/>







<input

value={editData.department_name}

readOnly

/>








<div className="sla-row">


<input

placeholder="SLA Value"

/>



<select>

<option>

Hours

</option>


<option>

Days

</option>


</select>



</div>







<input

value={editData.answer}

onChange={(e)=>

setEditData({

...editData,

answer:e.target.value

})

}

/>








<textarea

value={editData.comment}

onChange={(e)=>

setEditData({

...editData,

comment:e.target.value

})

}

/>








<label className="file-label">

Attachment (optional)

</label>



<div className="file-box">


<input

type="file"

/>


</div>







<div className="modal-actions">



<button

className="cancel-btn"

onClick={()=>setShowEdit(false)}

>

Cancel

</button>






<button

className="submit-btn"

onClick={updateActionPoint}

>

Update

</button>



</div>



</div>


</div>


}






</div>


);


}


export default ActionPoints;