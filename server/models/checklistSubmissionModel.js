const db = require("../config/db");


const ChecklistSubmission = {};



// ======================================================
// CREATE REQUIRED TABLES
// ======================================================

ChecklistSubmission.createTables = (callback)=>{


    const submissionTable = `

    CREATE TABLE IF NOT EXISTS checklist_submissions

    (

        id INT AUTO_INCREMENT PRIMARY KEY,


        checklist_type_id INT NOT NULL,


        store_id INT NOT NULL,


        submitted_by INT NULL,


        submission_date DATE NOT NULL,


        latitude DECIMAL(10,7) NULL,


        longitude DECIMAL(10,7) NULL,


        device VARCHAR(255) NULL,


        attachment VARCHAR(500) NULL,


        status VARCHAR(50)
        DEFAULT 'Submitted',


        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,


        updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP


    )

    `;




    const answersTable = `


    CREATE TABLE IF NOT EXISTS checklist_submission_answers

    (

        id INT AUTO_INCREMENT PRIMARY KEY,


        submission_id INT NOT NULL,


        question_id INT NOT NULL,


        answer TEXT NULL,


        remarks TEXT NULL,


        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,


        FOREIGN KEY(submission_id)

        REFERENCES checklist_submissions(id)

        ON DELETE CASCADE


    )

    `;





    db.query(

        submissionTable,

        (err)=>{


            if(err){

                return callback(err);

            }



            db.query(

                answersTable,

                callback

            );


        }

    );


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




        // ======================================
        // INSERT SUBMISSION
        // ======================================


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


            submission.latitude || null,


            submission.longitude || null,


            submission.device || null,


            submission.attachment || null,


            submission.status || "Submitted"


        ];







        db.query(

            submissionSql,

            submissionValues,


            (submissionError,result)=>{


                if(submissionError){


                    return db.rollback(()=>{


                        callback(submissionError);


                    });


                }







                const submissionId =

                result.insertId;







                // ======================================
                // NO ANSWERS
                // ======================================


                if(

                    !answers ||

                    answers.length === 0

                ){



                    return db.commit((commitError)=>{


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








                // ======================================
                // ANSWERS INSERT
                // ======================================


                const answerValues =

                answers.map((item)=>[


                    submissionId,


                    item.question_id,


                    item.answer !== undefined &&

                    item.answer !== null

                    ?

                    String(item.answer)

                    :

                    "",



                    item.remarks || ""


                ]);







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
// SEARCH + PAGINATION
// ======================================================

ChecklistSubmission.getAll = (

    filters,

    callback

)=>{


    let sql = `


    SELECT


        cs.*,


        ct.type_name AS checklist_type_name,


        s.store_name,


        u.name AS submitted_by_name



    FROM checklist_submissions cs



    LEFT JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id



    LEFT JOIN stores s

        ON cs.store_id = s.id



    LEFT JOIN users u

        ON cs.submitted_by = u.id



    WHERE 1=1


    `;



    const params = [];




    // ======================================
    // SEARCH
    // ======================================


    if(filters.search){



        sql += `


        AND

        (

            s.store_name LIKE ?


            OR ct.type_name LIKE ?


            OR cs.status LIKE ?


            OR u.name LIKE ?


        )


        `;



        const search =

        `%${filters.search}%`;



        params.push(

            search,

            search,

            search,

            search

        );



    }





    // ======================================
    // ORDER
    // ======================================


    sql += `


    ORDER BY cs.created_at DESC


    `;







    // ======================================
    // PAGINATION
    // ======================================


    if(

        filters.page &&

        filters.limit

    ){



        const offset =


        (

            Number(filters.page) - 1

        )

        *

        Number(filters.limit);





        sql += `


        LIMIT ?

        OFFSET ?


        `;




        params.push(


            Number(filters.limit),


            offset


        );



    }







    db.query(

        sql,

        params,

        callback

    );



};








// ======================================================
// COUNT SUBMISSIONS
// ======================================================

ChecklistSubmission.countAll = (

    filters,

    callback

)=>{


    let sql = `


    SELECT

        COUNT(*) AS total



    FROM checklist_submissions cs



    LEFT JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id



    LEFT JOIN stores s

        ON cs.store_id = s.id



    LEFT JOIN users u

        ON cs.submitted_by = u.id



    WHERE 1=1



    `;



    const params = [];





    if(filters.search){



        sql += `


        AND

        (

            s.store_name LIKE ?


            OR ct.type_name LIKE ?


            OR cs.status LIKE ?


            OR u.name LIKE ?


        )


        `;



        const search =

        `%${filters.search}%`;



        params.push(

            search,

            search,

            search,

            search

        );



    }





    db.query(

        sql,

        params,

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


    SELECT


        cs.*,


        ct.type_name AS checklist_type_name,


        s.store_name,


        u.name AS submitted_by_name



    FROM checklist_submissions cs



    LEFT JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id



    LEFT JOIN stores s

        ON cs.store_id = s.id



    LEFT JOIN users u

        ON cs.submitted_by = u.id



    WHERE cs.id = ?



    `;



    db.query(

        sql,

        [id],

        callback

    );


};






// ======================================================
// GET SUBMISSION ANSWERS
// ======================================================

ChecklistSubmission.getAnswers = (

    submissionId,

    callback

)=>{


    const sql = `


    SELECT


        csa.*,


        q.question



    FROM checklist_submission_answers csa



    LEFT JOIN questions q

        ON csa.question_id = q.id



    WHERE csa.submission_id = ?



    ORDER BY csa.id ASC



    `;



    db.query(

        sql,

        [submissionId],

        callback

    );


};








// ======================================================
// UPDATE SUBMISSION STATUS
// ======================================================

ChecklistSubmission.updateStatus = (

    id,

    status,

    callback

)=>{


    const sql = `


    UPDATE checklist_submissions


    SET status = ?


    WHERE id = ?



    `;



    db.query(

        sql,

        [

            status,

            id

        ],

        callback

    );


};







// ======================================================
// EXPORT SUBMISSIONS
// ======================================================

ChecklistSubmission.exportData = (

    callback

)=>{


    const sql = `


    SELECT


        cs.id,


        ct.type_name AS checklist_type,


        s.store_name,


        u.name AS submitted_by,


        cs.submission_date,


        cs.status,


        cs.created_at



    FROM checklist_submissions cs



    LEFT JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id



    LEFT JOIN stores s

        ON cs.store_id = s.id



    LEFT JOIN users u

        ON cs.submitted_by = u.id



    ORDER BY cs.created_at DESC



    `;



    db.query(

        sql,

        callback

    );


};







// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = ChecklistSubmission;