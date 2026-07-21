const db = require("../config/db");


const ActionPoint = {};




// ======================================================
// GET ALL ACTION POINTS
// FILTER + PAGINATION
// ======================================================


ActionPoint.getAll = (filters, callback)=>{


let sql = `

SELECT

cs.id,

cs.submission_date AS date,

s.store_name,

s.city,

s.state,

ct.checklist_name,

q.question,

d.department_name,

csa.answer,

csa.remarks AS comment,

cs.attachment,



CASE

WHEN csa.answer IS NULL
OR csa.answer=''

THEN 'Pending'

ELSE 'No Action Taken'

END AS status,



CASE

WHEN csa.answer IS NOT NULL

THEN '6d 23h Remaining'

ELSE '-'

END AS sla_status,



'Open' AS next_action,



CASE

WHEN csa.remarks IS NULL
OR csa.remarks=''

THEN '-'

ELSE csa.remarks

END AS remarks,



'No Action Taken by System Auto' AS history,


u.name AS employee_name,

u.employee_id



FROM checklist_submissions cs



LEFT JOIN checklist_submission_answers csa

ON csa.submission_id = cs.id



LEFT JOIN questions q

ON q.id = csa.question_id



LEFT JOIN checklist_types ct

ON ct.id = cs.checklist_type_id



LEFT JOIN stores s

ON s.id = cs.store_id



LEFT JOIN users u

ON u.id = cs.submitted_by



LEFT JOIN departments d

ON d.id = u.department_id



WHERE 1=1


`;



let values=[];




// STORE

if(filters.store_id){

sql += " AND cs.store_id=? ";

values.push(filters.store_id);

}




// DEPARTMENT

if(filters.department_id){

sql += " AND d.id=? ";

values.push(filters.department_id);

}




// STATUS

if(filters.status){

sql += `

AND

(

CASE

WHEN csa.answer IS NULL
OR csa.answer=''

THEN 'Pending'

ELSE 'No Action Taken'

END

)=?

`;

values.push(filters.status);

}




// CHECKLIST TYPE

if(filters.checklist_type_id){

sql += " AND cs.checklist_type_id=? ";

values.push(filters.checklist_type_id);

}




// DATE

if(filters.start_date){

sql += " AND DATE(cs.submission_date)>=? ";

values.push(filters.start_date);

}


if(filters.end_date){

sql += " AND DATE(cs.submission_date)<=? ";

values.push(filters.end_date);

}




// SEARCH

if(filters.search){


sql += `

AND

(

s.store_name LIKE ?

OR s.city LIKE ?

OR s.state LIKE ?

OR ct.checklist_name LIKE ?

OR q.question LIKE ?

OR d.department_name LIKE ?

OR csa.answer LIKE ?

OR csa.remarks LIKE ?

)

`;



let key=`%${filters.search}%`;



values.push(

key,
key,
key,
key,
key,
key,
key,
key

);


}





sql += `

ORDER BY cs.id DESC

LIMIT ?,?

`;



values.push(

filters.offset,

filters.limit

);



db.query(

sql,

values,

callback

);



};











// ======================================================
// COUNT
// ======================================================


ActionPoint.count=(filters,callback)=>{


let sql=`


SELECT COUNT(*) AS total


FROM checklist_submissions cs


LEFT JOIN checklist_submission_answers csa

ON csa.submission_id=cs.id


LEFT JOIN questions q

ON q.id=csa.question_id


LEFT JOIN checklist_types ct

ON ct.id=cs.checklist_type_id


LEFT JOIN stores s

ON s.id=cs.store_id


LEFT JOIN users u

ON u.id=cs.submitted_by


LEFT JOIN departments d

ON d.id=u.department_id


WHERE 1=1


`;



let values=[];




if(filters.search){


sql+=`

AND

(

s.store_name LIKE ?

OR s.city LIKE ?

OR s.state LIKE ?

OR q.question LIKE ?

OR ct.checklist_name LIKE ?

OR csa.answer LIKE ?

OR csa.remarks LIKE ?

)

`;



let key=`%${filters.search}%`;



values.push(

key,
key,
key,
key,
key,
key,
key

);


}




db.query(

sql,

values,

callback

);



};












// ======================================================
// CREATE ACTION POINT
// ======================================================


ActionPoint.create=(data,callback)=>{


let sql=`


INSERT INTO checklist_submission_answers

(

submission_id,

question_id,

answer,

remarks

)

VALUES(?,?,?,?)


`;



db.query(

sql,

[


data.submission_id,


data.question_id,


data.answer || "",


data.remarks || ""


],


callback


);


};












// ======================================================
// UPDATE ACTION POINT
// ======================================================


ActionPoint.update=(id,data,callback)=>{


let sql=`


UPDATE checklist_submission_answers


SET


answer=?,


remarks=?


WHERE submission_id=?


`;



db.query(

sql,

[


data.answer || "",


data.remarks || "",


id


],


callback


);



};












// ======================================================
// DELETE ACTION POINT
// ======================================================


ActionPoint.delete=(id,callback)=>{


let sql=`


DELETE FROM checklist_submission_answers


WHERE submission_id=?


`;



db.query(

sql,

[id],

callback

);



};








module.exports = ActionPoint;