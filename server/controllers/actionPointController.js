const ActionPoint = require("../models/actionPointModel");

const { Parser } = require("json2csv");




// ======================================================
// GET ALL ACTION POINTS
// ======================================================

exports.getAllActionPoints = (req,res)=>{


try{


const page =
parseInt(req.query.page) || 1;


const limit =
parseInt(req.query.limit) || 10;


const offset =
(page - 1) * limit;




const filters={


store_id:req.query.store_id || null,

department_id:req.query.department_id || null,

status:req.query.status || null,

checklist_type_id:req.query.checklist_type_id || null,

start_date:req.query.start_date || null,

end_date:req.query.end_date || null,

search:req.query.search || null,

offset,

limit


};





ActionPoint.getAll(

filters,

(err,data)=>{


if(err){

console.error(
"GET ACTION POINT ERROR:",
err
);


return res.status(500).json({

success:false,

message:"Unable to fetch action points",

error:err.message

});

}




ActionPoint.count(

filters,

(err,count)=>{


if(err){


return res.status(500).json({

success:false,

message:"Unable to count action points",

error:err.message

});


}





const total =
count[0]?.total || 0;




return res.json({

success:true,

page,

limit,

total,

totalPages:
Math.ceil(total/limit),

data:data || []

});



});


}


);



}


catch(error){


return res.status(500).json({

success:false,

message:"Internal Server Error",

error:error.message

});


}


};









// ======================================================
// EXPORT CSV
// ======================================================

exports.exportActionPointsCSV=(req,res)=>{


const filters={


store_id:req.query.store_id || null,

department_id:req.query.department_id || null,

status:req.query.status || null,

checklist_type_id:req.query.checklist_type_id || null,

search:req.query.search || null,


offset:0,

limit:10000


};





ActionPoint.getAll(

filters,

(err,data)=>{


if(err){


return res.status(500).json({

success:false,

error:err.message

});


}





try{


const parser =
new Parser();


const csv =
parser.parse(data || []);




res.header(
"Content-Type",
"text/csv"
);


res.attachment(
"action_points.csv"
);


return res.send(csv);



}

catch(error){


return res.status(500).json({

success:false,

error:error.message

});


}



}



);


};











// ======================================================
// CREATE ACTION POINT
// ======================================================

exports.createActionPoint=(req,res)=>{


try{


const {


submission_id,

question_id,

answer,

remarks,

store_id,

department_id,

sla


}=req.body;





if(!submission_id || !question_id){


return res.status(400).json({

success:false,

message:
"Submission ID and Question ID required"

});


}







const attachment =
req.file
?
req.file.path.replace(/\\/g,"/")
:
null;







ActionPoint.create(

{


submission_id,

question_id,

answer:answer || "",

remarks:remarks || "",

store_id,

department_id,

sla,

attachment


},


(err,result)=>{


if(err){


console.error(
"CREATE ERROR:",
err
);


return res.status(500).json({

success:false,

message:"Create Failed",

error:err.message

});


}





return res.status(201).json({

success:true,

message:
"Action Point Created Successfully",

id:
result.insertId


});


}



);



}

catch(error){


return res.status(500).json({

success:false,

message:error.message

});


}



};












// ======================================================
// UPDATE ACTION POINT
// ======================================================

exports.updateActionPoint=(req,res)=>{


const id =
req.params.id;



const {


answer,

remarks


}=req.body;





const attachment =
req.file
?
req.file.path.replace(/\\/g,"/")
:
null;







ActionPoint.update(

id,

{


answer,

remarks,

attachment


},


(err,result)=>{


if(err){


return res.status(500).json({

success:false,

error:err.message

});


}




if(result.affectedRows===0){


return res.status(404).json({

success:false,

message:
"Action Point not found"

});


}





return res.json({

success:true,

message:
"Action Point Updated Successfully"

});



}



);


};













// ======================================================
// DELETE ACTION POINT
// ======================================================

exports.deleteActionPoint=(req,res)=>{


const id =
req.params.id;



ActionPoint.delete(

id,


(err,result)=>{


if(err){


return res.status(500).json({

success:false,

error:err.message

});


}





if(result.affectedRows===0){


return res.status(404).json({

success:false,

message:
"Action Point not found"

});


}




return res.json({

success:true,

message:
"Action Point Deleted Successfully"

});


}



);


};