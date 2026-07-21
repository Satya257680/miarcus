const db = require("../config/db");

const ChecklistSubmission = {};


// ======================================================
// CREATE REQUIRED TABLES
// ======================================================

ChecklistSubmission.createTables = (callback) => {

  const submissionTable = `

    CREATE TABLE IF NOT EXISTS checklist_submissions (

      id INT AUTO_INCREMENT PRIMARY KEY,

      checklist_type_id INT NOT NULL,

      store_id INT NOT NULL,

      submitted_by INT NULL,

      submission_date DATE NOT NULL,

      latitude DECIMAL(10,7) NULL,

      longitude DECIMAL(10,7) NULL,

      device VARCHAR(255) NULL,

      attachment VARCHAR(500) NULL,

      status VARCHAR(50) DEFAULT 'Submitted',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP

    )

  `;


  const answersTable = `

    CREATE TABLE IF NOT EXISTS checklist_submission_answers (

      id INT AUTO_INCREMENT PRIMARY KEY,

      submission_id INT NOT NULL,

      question_id INT NOT NULL,

      answer TEXT NULL,

      remarks TEXT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


      FOREIGN KEY (submission_id)

      REFERENCES checklist_submissions(id)

      ON DELETE CASCADE

    )

  `;



  db.query(submissionTable,(err)=>{

    if(err){
      return callback(err);
    }


    db.query(
      answersTable,
      callback
    );

  });


};




// ======================================================
// CREATE SUBMISSION WITH ANSWERS
// ======================================================


ChecklistSubmission.create = (
  submission,
  answers,
  callback
)=>{


  db.beginTransaction((transactionError)=>{


    if(transactionError){

      return callback(transactionError);

    }



    const submissionSql = `

      INSERT INTO checklist_submissions

      (

        checklist_type_id,

        store_id,

        submitted_by,

        submission_date,

        latitude,

        longitude,

        device,

        attachment,

        status

      )

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

    `;



    const submissionValues = [

      submission.checklist_type_id,

      submission.store_id,

      submission.submitted_by || null,

      submission.submission_date,

      submission.latitude ?? null,

      submission.longitude ?? null,

      submission.device || null,

      submission.attachment || null,

      submission.status || "Submitted"

    ];




    db.query(
      submissionSql,
      submissionValues,

      (submissionError,submissionResult)=>{


        if(submissionError){

          return db.rollback(()=>{

            callback(submissionError);

          });

        }



        const submissionId =
        submissionResult.insertId;



        if(!answers || answers.length===0){

          return db.commit(()=>{

            callback(null,{
              submissionId
            });

          });

        }




        const answerValues = answers.map(
          (item)=>[

            submissionId,

            item.question_id,

            item.answer !== undefined &&
            item.answer !== null

            ? String(item.answer)

            : "",


            item.remarks || ""

          ]

        );




        const answerSql = `


          INSERT INTO checklist_submission_answers

          (

            submission_id,

            question_id,

            answer,

            remarks

          )

          VALUES ?

        `;




        db.query(

          answerSql,

          [answerValues],


          (answerError)=>{


            if(answerError){


              return db.rollback(()=>{

                callback(answerError);

              });


            }





            db.commit((commitError)=>{


              if(commitError){


                return db.rollback(()=>{

                  callback(commitError);

                });


              }



              callback(null,{

                submissionId

              });



            });



          }


        );



      }


    );



  });



};






// ======================================================
// GET ALL SUBMISSIONS
// ======================================================


ChecklistSubmission.getAll = (callback)=>{


  const sql = `

    SELECT

      cs.*

    FROM checklist_submissions cs

    ORDER BY cs.created_at DESC

  `;


  db.query(
    sql,
    callback
  );


};






// ======================================================
// GET SINGLE SUBMISSION
// ======================================================


ChecklistSubmission.getById = (
  id,
  callback
)=>{


  const sql = `

    SELECT *

    FROM checklist_submissions

    WHERE id = ?

  `;


  db.query(
    sql,
    [id],
    callback
  );


};






// ======================================================
// GET ANSWERS
// ======================================================


ChecklistSubmission.getAnswers = (
  submissionId,
  callback
)=>{


  const sql = `

    SELECT *

    FROM checklist_submission_answers

    WHERE submission_id = ?

    ORDER BY id ASC

  `;


  db.query(
    sql,
    [submissionId],
    callback
  );


};





module.exports = ChecklistSubmission;