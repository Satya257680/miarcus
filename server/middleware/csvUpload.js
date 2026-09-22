const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOAD_DIR } = require("../config/storage");
const { MAX_UPLOAD_SIZE } = require("./fileSecurity");


// ==========================================
// Upload Folder
// ==========================================

const uploadFolder = UPLOAD_DIR;


if(!fs.existsSync(uploadFolder)){

    fs.mkdirSync(
        uploadFolder,
        {
            recursive:true
        }
    );

}





// ==========================================
// Storage
// ==========================================


const storage = multer.diskStorage({


    destination:(req,file,cb)=>{


        cb(
            null,
            uploadFolder
        );


    },


    filename:(req,file,cb)=>{


        const uniqueName =

            Date.now()
            +
            "-"
            +
            Math.round(
                Math.random()*1000000000
            )
            +
            path.extname(
                file.originalname
            );



        cb(
            null,
            uniqueName
        );


    }


});








// ==========================================
// CSV File Filter
// ==========================================


const fileFilter = (req,file,cb)=>{


    const ext =

    path
    .extname(
        file.originalname
    )
    .toLowerCase();



    if(ext === ".csv"){


        cb(
            null,
            true
        );


    }
    else{


        cb(

            new Error(
                "Only CSV files are allowed."
            )

        );


    }


};








// ==========================================
// Multer Config
//
// UPLOAD SIZE — matches the app-wide ceiling (100 GB by default; see
// MAX_UPLOAD_SIZE in middleware/fileSecurity.js), same as
// middleware/bulkFileUpload.js. The IIS reverse-proxy in front of this
// app (server/web.config) still applies its own separate ~4 GB hard
// ceiling on a single request — a file larger than that needs the
// chunked upload flow (middleware/chunkedUpload.js) instead.
// ==========================================


const csvUpload = multer({


    storage,


    fileFilter,

    limits: {
        fileSize: MAX_UPLOAD_SIZE
    }


});





module.exports = csvUpload;