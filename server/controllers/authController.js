const db = require("../config/db");


// ======================================================
// LOGIN USER
// POST : /api/auth/login
// ======================================================

const loginUser = (req, res) => {

    const { email, password } = req.body;


    const sql = `
        SELECT
            id,
            employee_id,
            name,
            email,
            password,
            profile_photo,
            department_id,
            designation_id
        FROM users
        WHERE email = ?
        AND password = ?
        LIMIT 1
    `;


    db.query(
        sql,
        [email, password],
        (err, result) => {


            if (err) {

                console.error(
                    "LOGIN DATABASE ERROR:",
                    err
                );


                return res.status(500).json({

                    success:false,

                    message:"Database Error"

                });

            }



            if (result.length === 0) {


                return res.status(401).json({

                    success:false,

                    message:
                    "Invalid Email or Password"

                });


            }



            const user = result[0];



            return res.status(200).json({


                success:true,


                message:
                "Login Successful",



                user:{


                    id:user.id,


                    employee_id:
                    user.employee_id || "",



                    name:
                    user.name,



                    email:
                    user.email,



                    profile_photo:
                    user.profile_photo || "",



                    department_id:
                    user.department_id || null,



                    designation_id:
                    user.designation_id || null


                }


            });


        }
    );

};




// ======================================================
// FORGOT PASSWORD
// POST : /api/auth/forgot-password
// ======================================================


const forgotPassword = (req,res)=>{


    const {email}=req.body;



    const sql =
    `
    SELECT id
    FROM users
    WHERE email=?
    `;



    db.query(
        sql,
        [email],
        (err,result)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:
                    "Database Error"

                });

            }



            if(result.length===0){


                return res.status(404).json({

                    success:false,

                    message:
                    "Email Not Found"

                });


            }



            return res.status(200).json({

                success:true,

                message:
                "Email Verified"

            });



        }
    );


};




// ======================================================
// RESET PASSWORD
// PUT : /api/auth/reset-password
// ======================================================


const resetPassword = (req,res)=>{


    const {
        email,
        password
    } = req.body;



    const sql =
    `
    UPDATE users
    SET password=?
    WHERE email=?
    `;



    db.query(
        sql,
        [
            password,
            email
        ],
        (err,result)=>{


            if(err){


                return res.status(500).json({

                    success:false,

                    message:
                    "Database Error"

                });


            }



            if(result.affectedRows===0){


                return res.status(404).json({

                    success:false,

                    message:
                    "User Not Found"

                });


            }




            return res.status(200).json({

                success:true,

                message:
                "Password Updated Successfully"

            });



        }
    );


};




// ======================================================
// EXPORTS
// ======================================================


module.exports = {

    loginUser,

    forgotPassword,

    resetPassword

};