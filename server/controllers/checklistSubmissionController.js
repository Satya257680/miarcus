const ChecklistSubmission = require(
  "../models/checklistSubmissionModel"
);


// ======================================================
// CREATE CHECKLIST SUBMISSION
// POST /api/checklist-submissions
// ======================================================

exports.createSubmission = (req, res) => {

  try {


    const {

      checklist_type_id,

      store_id,

      submitted_by,

      submission_date,

      latitude,

      longitude,

      device

    } = req.body;



    // ================= ANSWERS =================


    let answers = [];


    try {

      answers = JSON.parse(
        req.body.answers || "[]"
      );


    }
    catch(error){

      console.log(
        "ANSWER JSON ERROR:",
        error
      );

      answers = [];

    }





    // ================= ATTACHMENT =================


    let uploadedAttachment = null;


    if(req.file){

      uploadedAttachment =
        req.file.path;

    }






    // ================= DEVICE =================


    const submittedDevice =
      device ||
      req.headers["user-agent"] ||
      "Unknown Device";






    // ================= VALIDATION =================


    if(!checklist_type_id){

      return res.status(400).json({

        success:false,

        message:
        "Checklist Type is required."

      });

    }




    if(!store_id){

      return res.status(400).json({

        success:false,

        message:
        "Store is required."

      });

    }





    if(!submission_date){

      return res.status(400).json({

        success:false,

        message:
        "Submission date is required."

      });

    }






    if(
      !Array.isArray(answers) ||
      answers.length === 0
    ){

      return res.status(400).json({

        success:false,

        message:
        "Checklist answers are required."

      });

    }







    // Remove invalid answers


    const validAnswers =
      answers.filter(

        item =>
        item &&
        item.question_id

      );





    if(validAnswers.length === 0){


      return res.status(400).json({

        success:false,

        message:
        "No valid question answers found."

      });


    }









    // ================= SUBMISSION DATA =================


    const submissionData = {


      checklist_type_id,


      store_id,


      submitted_by:
      submitted_by || null,



      submission_date,



      latitude:
      latitude || null,



      longitude:
      longitude || null,



      device:
      submittedDevice,



      attachment:
      uploadedAttachment,



      status:
      "Submitted"


    };








    // ================= SAVE =================



    ChecklistSubmission.create(

      submissionData,

      validAnswers,


      (error,result)=>{


        if(error){


          console.error(
            "CREATE CHECKLIST SUBMISSION ERROR:",
            error
          );



          return res.status(500).json({

            success:false,

            message:
            "Unable to submit checklist.",

            error:
            error.message

          });


        }







        return res.status(201).json({


          success:true,


          message:
          "Checklist submitted successfully.",



          data:{


            submission_id:
            result.submissionId,


            attachment:
            uploadedAttachment,


            device:
            submittedDevice



          }



        });




      }


    );




  }


  catch(error){


    console.error(
      "CHECKLIST CONTROLLER ERROR:",
      error
    );


    return res.status(500).json({

      success:false,

      message:
      "Internal Server Error"

    });


  }


};







// ======================================================
// GET ALL SUBMISSIONS
// ======================================================


exports.getAllSubmissions = (req,res)=>{


  ChecklistSubmission.getAll(

    (error,results)=>{


      if(error){


        console.error(
          "FETCH SUBMISSIONS ERROR:",
          error
        );


        return res.status(500).json({

          success:false,

          message:
          "Unable to fetch checklist submissions."

        });


      }






      return res.status(200).json({

        success:true,

        data:results

      });



    }


  );


};







// ======================================================
// GET ONE SUBMISSION + ANSWERS
// ======================================================


exports.getSubmissionById = (req,res)=>{


  const submissionId =
  req.params.id;



  ChecklistSubmission.getById(

    submissionId,


    (error,submissions)=>{


      if(error){


        console.error(
          "FETCH SUBMISSION ERROR:",
          error
        );


        return res.status(500).json({

          success:false,

          message:
          "Unable to fetch checklist submission."

        });



      }





      if(
        !submissions ||
        submissions.length===0
      ){


        return res.status(404).json({

          success:false,

          message:
          "Checklist submission not found."

        });



      }







      ChecklistSubmission.getAnswers(

        submissionId,


        (answerError,answers)=>{


          if(answerError){


            console.error(
              "FETCH ANSWERS ERROR:",
              answerError
            );



            return res.status(500).json({

              success:false,

              message:
              "Unable to fetch checklist answers."

            });


          }







          return res.status(200).json({


            success:true,


            data:{


              ...submissions[0],


              answers



            }



          });




        }


      );



    }


  );



};