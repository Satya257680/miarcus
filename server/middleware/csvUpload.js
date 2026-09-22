const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOAD_DIR } = require("../config/storage");


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
// UNLIMITED UPLOAD SIZE
// This used to cap out at 10 MB, which a genuinely large bulk-import
// CSV (a big historical export / thousands of rows) can exceed.
// `limits.fileSize` is intentionally left unset below — multer treats
// a missing fileSize limit as "no limit at all", matching the same
// fix already applied to Checklist Reports / Users bulk upload (see
// middleware/bulkFileUpload.js). The IIS reverse-proxy in front of
// this app (server/web.config) still applies its own ceiling, raised
// to the maximum IIS supports.
// ==========================================


const csvUpload = multer({


    storage,


    fileFilter


    // No `limits.fileSize` — uploads of any size are accepted here.


});





module.exports = csvUpload;