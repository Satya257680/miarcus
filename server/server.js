const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");



const app = express();






// ======================================================
// DATABASE
// ======================================================


const db = require("./config/db");



db.connect((err)=>{


    if(err){


        console.error(
            "❌ MySQL Connection Failed"
        );


        console.error(err);


        process.exit(1);


    }



    console.log(
        "✅ MySQL Connected Successfully"
    );


});









// ======================================================
// MIDDLEWARE
// ======================================================


app.use(

    cors({

        origin:"http://localhost:5173",

        credentials:true

    })

);



app.use(

    express.json({

        limit:"20mb"

    })

);



app.use(

    express.urlencoded({

        extended:true,

        limit:"20mb"

    })

);











// ======================================================
// UPLOAD FOLDER
// ======================================================


const uploadFolder = path.join(

    __dirname,

    "uploads"

);



if(!fs.existsSync(uploadFolder)){


    fs.mkdirSync(

        uploadFolder,

        {
            recursive:true
        }

    );


    console.log(
        "📂 Upload folder created"
    );


}







// Serve uploaded files


app.use(

    "/uploads",

    express.static(uploadFolder)

);




console.log(

    "📂 Upload Path:",

    uploadFolder

);











// ======================================================
// HOME API
// ======================================================


app.get("/",(req,res)=>{


    res.json({

        success:true,

        message:
        "🚀 Miarcus Backend Running"

    });


});






// Health Check


app.get("/api/health",(req,res)=>{


    res.json({

        success:true,

        server:"running",

        database:"connected"

    });


});











// ======================================================
// ROUTE LOADER
// ======================================================


const loadRoute = (

    routeFile,

    apiPath,

    routeName

)=>{


    try{


        const route = require(routeFile);



        app.use(

            apiPath,

            route

        );



        console.log(

            `✅ ${routeName} Loaded`

        );



    }

    catch(error){


        console.error(

            `❌ ${routeName} Failed`

        );


        console.error(error);


    }


};











// ======================================================
// API ROUTES
// ======================================================



loadRoute(

"./routes/authRoutes",

"/api/auth",

"Auth Routes"

);





loadRoute(

"./routes/storeRoutes",

"/api/stores",

"Store Routes"

);





loadRoute(

"./routes/actionPointRoutes",

"/api/action-points",

"Action Point Routes"

);





loadRoute(

"./routes/profileRoutes",

"/api/profile",

"Profile Routes"

);





loadRoute(

"./routes/userRoutes",

"/api/users",

"User Routes"

);





loadRoute(

"./routes/departmentRoutes",

"/api/departments",

"Department Routes"

);





loadRoute(

"./routes/designationRoutes",

"/api/designations",

"Designation Routes"

);





loadRoute(

"./routes/checklistTypeRoutes",

"/api/checklist-types",

"Checklist Type Routes"

);





loadRoute(

"./routes/questionRoutes",

"/api/questions",

"Question Routes"

);





loadRoute(

"./routes/reportsToRoutes",

"/api/reports",

"Reports To Routes"

);





loadRoute(

"./routes/checklistSubmissionRoutes",

"/api/checklist-submissions",

"Checklist Submission Routes"

);





loadRoute(

"./routes/checklistReportRoutes",

"/api/checklist-reports",

"Checklist Report Routes"

);












// ======================================================
// MULTER ERROR HANDLER
// ======================================================


app.use(

(err,req,res,next)=>{


    console.error(

        "UPLOAD ERROR:",

        err

    );





    if(err.code==="LIMIT_FILE_SIZE"){


        return res.status(400).json({

            success:false,

            message:
            "Maximum file size allowed is 10MB"

        });


    }







    if(err.message){


        return res.status(400).json({

            success:false,

            message:
            err.message

        });


    }




    next(err);



}

);











// ======================================================
// 404 ERROR
// ======================================================


app.use(

(req,res)=>{


    res.status(404).json({

        success:false,

        message:
        "API Route Not Found"

    });


}

);












// ======================================================
// GLOBAL ERROR
// ======================================================


app.use(

(err,req,res,next)=>{


    console.error(

        "SERVER ERROR:",

        err

    );




    res.status(500).json({

        success:false,

        message:
        err.message ||
        "Internal Server Error"

    });



}

);











// ======================================================
// SERVER START
// ======================================================


const PORT =
process.env.PORT || 5000;



app.listen(

PORT,

()=>{


console.log(
"================================"
);



console.log(

`🚀 Server Running : http://localhost:${PORT}`

);



console.log(

`📂 Upload URL : http://localhost:${PORT}/uploads`

);



console.log(
"================================"
);



}

);