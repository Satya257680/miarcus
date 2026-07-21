const multer = require("multer");
const path = require("path");
const fs = require("fs");


// ==========================================
// Upload Folder
// ==========================================

const uploadFolder = "uploads";


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
// ==========================================


const csvUpload = multer({


    storage,


    fileFilter,


    limits:{


        fileSize:
        10 * 1024 * 1024


    }


});





module.exports = csvUpload;