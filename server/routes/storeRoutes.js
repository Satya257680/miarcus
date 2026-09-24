const express = require("express");
const multer = require("multer");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

// Master data (create / edit / delete / import / export) is
// Administrator-only. Read access stays permission-based because
// other modules (Action Points, Expenses, Reports...) read it.
const adminOnly = require("../middleware/adminOnly");

const extendUploadTimeout = require("../middleware/extendUploadTimeout");



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




// UNLIMITED UPLOAD SIZE
//
// This used to cap out at 5 MB, which a genuinely large store list
// CSV (a big historical export) can exceed. `limits.fileSize` is
// intentionally left unset below — multer treats a missing fileSize
// limit as "no limit at all", matching the same fix already applied
// to Checklist Reports / Users bulk upload (see
// middleware/bulkFileUpload.js). The IIS reverse-proxy in front of
// this app (server/web.config) still applies its own ceiling, raised
// to the maximum IIS supports.
const upload = multer({

    storage,


    // No `limits.fileSize` — uploads of any size are accepted here.


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

    extendUploadTimeout,

    authMiddleware,

    adminOnly,

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

    adminOnly,

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

    adminOnly,

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

    adminOnly,

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

    adminOnly,

    deleteStore

);








// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;