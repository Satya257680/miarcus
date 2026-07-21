const db = require("../config/db");

const ChecklistReport = {};




// ======================================================
// GET ALL REPORTS
// ======================================================


ChecklistReport.getAll = (filters, callback) => {


let sql = `

SELECT

cs.id,

cs.submission_date,

cs.status,

cs.latitude,

cs.longitude,

cs.device,

cs.attachment,

cs.created_at,


ct.checklist_name,


s.store_name,


u.name AS employee_name,

u.employee_id,


d.department_name,


q.id AS question_id,

q.question,

q.sequence_no,


csa.answer,

csa.remarks,


(
SELECT COUNT(*)
FROM checklist_submission_answers csa2
WHERE csa2.submission_id = cs.id
) AS total_questions



FROM checklist_submissions cs



LEFT JOIN checklist_types ct
ON ct.id = cs.checklist_type_id



LEFT JOIN stores s
ON s.id = cs.store_id



LEFT JOIN users u
ON u.id = cs.submitted_by



LEFT JOIN departments d
ON d.id = u.department_id



LEFT JOIN checklist_submission_answers csa
ON csa.submission_id = cs.id



LEFT JOIN questions q
ON q.id = csa.question_id



WHERE 1=1

`;



const values=[];




// ================= FILTER =================



if(filters.store_id){


sql += `
AND cs.store_id=?
`;

values.push(filters.store_id);


}



if(filters.checklist_type_id){


sql += `
AND cs.checklist_type_id=?
`;

values.push(filters.checklist_type_id);


}




if(filters.employee_id){


sql += `
AND u.employee_id=?
`;

values.push(filters.employee_id);


}





if(filters.from_date){


sql += `
AND DATE(cs.submission_date)>=?
`;

values.push(filters.from_date);


}




if(filters.to_date){


sql += `
AND DATE(cs.submission_date)<=?
`;

values.push(filters.to_date);


}







// ================= SEARCH =================


if(filters.search){


sql += `

AND (

s.store_name LIKE ?

OR ct.checklist_name LIKE ?

OR u.name LIKE ?

OR u.employee_id LIKE ?

OR d.department_name LIKE ?

OR q.question LIKE ?

OR csa.answer LIKE ?

OR csa.remarks LIKE ?

)

`;



const keyword =
`%${filters.search}%`;



values.push(

keyword,

keyword,

keyword,

keyword,

keyword,

keyword,

keyword,

keyword

);


}






sql += `

ORDER BY

cs.created_at DESC,

q.sequence_no ASC

`;





db.query(

sql,

values,

callback

);



};









// ======================================================
// GET REPORT BY ID
// ======================================================


ChecklistReport.getById=(id,callback)=>{


const sql=`


SELECT


cs.id,

cs.submission_date,

cs.status,

cs.latitude,

cs.longitude,

cs.device,

cs.attachment,


ct.checklist_name,


s.store_name,


u.name AS employee_name,

u.employee_id,


d.department_name,


q.question,

q.sequence_no,


csa.answer,

csa.remarks



FROM checklist_submissions cs



LEFT JOIN checklist_types ct

ON ct.id=cs.checklist_type_id



LEFT JOIN stores s

ON s.id=cs.store_id



LEFT JOIN users u

ON u.id=cs.submitted_by



LEFT JOIN departments d

ON d.id=u.department_id



LEFT JOIN checklist_submission_answers csa

ON csa.submission_id=cs.id



LEFT JOIN questions q

ON q.id=csa.question_id



WHERE cs.id=?



ORDER BY q.sequence_no ASC


`;




db.query(

sql,

[id],

callback

);



};











// ======================================================
// DELETE REPORT
// ======================================================


ChecklistReport.delete=(id,callback)=>{



db.beginTransaction((err)=>{


if(err)
return callback(err);





db.query(

`
DELETE FROM checklist_submission_answers
WHERE submission_id=?
`,

[id],

(answerErr)=>{



if(answerErr){

return db.rollback(()=>{

callback(answerErr);

});

}





db.query(

`
DELETE FROM checklist_submissions
WHERE id=?
`,

[id],


(deleteErr,result)=>{



if(deleteErr){

return db.rollback(()=>{

callback(deleteErr);

});

}




db.commit((commitErr)=>{


if(commitErr){

return callback(commitErr);

}



callback(null,result);



});



}



);



}



);



});



};








// ======================================================
// IMPORT CSV SUPPORT
// ======================================================


ChecklistReport.importCSV=(rows,callback)=>{


if(!rows || rows.length===0){


return callback(null,{

inserted:0

});


}




let inserted=0;




const insertRow=(index)=>{



if(index>=rows.length){


return callback(null,{

inserted

});


}




const row=rows[index];





const sql=`

INSERT INTO checklist_submissions

(

checklist_type_id,

store_id,

submitted_by,

submission_date,

device,

attachment,

status

)

VALUES (?,?,?,?,?,?,?)

`;






db.query(

sql,

[


row.checklist_type_id,

row.store_id,

row.submitted_by || null,


row.submission_date || new Date(),


row.device || "CSV Import",


row.attachment || null,


row.status || "Submitted"


],



(err,result)=>{



if(err){

console.log(
"SUBMISSION INSERT ERROR:",
err
);

return callback(err);


}





const submissionId =
result.insertId;








if(!row.question_id){


inserted++;

return insertRow(index+1);


}







db.query(

`

INSERT INTO checklist_submission_answers

(

submission_id,

question_id,

answer,

remarks

)

VALUES(?,?,?,?)

`,

[


submissionId,


row.question_id,


row.answer || "",


row.remarks || ""


],



(answerErr)=>{



if(answerErr){


return callback(answerErr);


}





inserted++;


insertRow(index+1);



}


);



}



);



};





insertRow(0);



};







module.exports = ChecklistReport;