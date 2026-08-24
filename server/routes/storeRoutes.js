const express = require("express");
const multer = require("multer");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");



// ======================================================
// CONTROLLER
// ======================================================

const {

    getStores,

    getStoreById,

    createStore,

    updateStore,

    deleteStore,

    deleteAllStores,

    importStoresFromCSV


} = require("../controllers/storeController");





// ======================================================
// MULTER CONFIGURATION
// ======================================================

const storage = multer.diskStorage({

    destination:(req,file,cb)=>{

        cb(null,"uploads/");

    },


    filename:(req,file,cb)=>{

        cb(
            null,
            `${Date.now()}-${require("crypto").randomBytes(18).toString("hex")}.csv`
        );

    }

});




const upload = multer({

    storage,


    limits:{

        fileSize:5 * 1024 * 1024

    },


    fileFilter:(req,file,cb)=>{


        if(

            file.mimetype === "text/csv" ||

            file.originalname
            .toLowerCase()
            .endsWith(".csv")

        ){

            return cb(null,true);

        }


        return cb(

            new Error(
                "Only CSV files are allowed."
            )

        );


    }


});







// ======================================================
// GET ALL STORES
// GET /api/stores
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Store Management",

        "View"

    ),

    getStores

);







// ======================================================
// IMPORT STORES CSV
// POST /api/stores/import
// Permission : Add
// ======================================================

router.post(

    "/import",

    authMiddleware,

    permissionMiddleware(

        "Store Management",

        "Add"

    ),

    upload.single("file"),

    importStoresFromCSV

);








// ======================================================
// CREATE STORE
// POST /api/stores
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Store Management",

        "Add"

    ),

    createStore

);








// ======================================================
// GET STORE BY ID
// GET /api/stores/:id
// Permission : View
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Store Management",

        "View"

    ),

    getStoreById

);








// ======================================================
// UPDATE STORE
// PUT /api/stores/:id
// Permission : Edit
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Store Management",

        "Edit"

    ),

    updateStore

);








// ======================================================
// DELETE ALL STORES
// DELETE /api/stores/delete-all
// Permission : Full
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(

        "Store Management",

        "Full"

    ),

    deleteAllStores

);








// ======================================================
// DELETE STORE
// DELETE /api/stores/:id
// Permission : Full
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Store Management",

        "Full"

    ),

    deleteStore

);








// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;