const express = require("express");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

const upload = require("../middleware/upload");



// ======================================================
// CONTROLLER
// ======================================================

const {

    getRules,

    createRule,

    bulkUploadRules,

    updateRule,

    deleteRule,

    deleteAllRules,

    exportRules


} = require("../controllers/nsoRuleController");




// ======================================================
// BASE URL
// /api/nso-rules
// ======================================================





// ======================================================
// GET ALL RULES
// SEARCH + PAGINATION
// GET /api/nso-rules
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "NSO Rules",

        "View"

    ),

    getRules

);






// ======================================================
// EXPORT RULES CSV
// GET /api/nso-rules/export
// Permission : View
// IMPORTANT: BEFORE /:id
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "NSO Rules",

        "View"

    ),

    exportRules

);






// ======================================================
// CREATE RULE
// POST /api/nso-rules
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "NSO Rules",

        "Add"

    ),

    createRule

);






// ======================================================
// BULK UPLOAD RULES
// POST /api/nso-rules/bulk-upload
// Permission : Add
// IMPORTANT: BEFORE /:id
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    permissionMiddleware(

        "NSO Rules",

        "Add"

    ),

    upload.single("file"),

    bulkUploadRules

);






// ======================================================
// UPDATE RULE
// PUT /api/nso-rules/:id
// Permission : Edit
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "NSO Rules",

        "Edit"

    ),

    updateRule

);






// ======================================================
// DELETE ALL RULES
// DELETE /api/nso-rules/delete-all
// Permission : Full
// IMPORTANT: BEFORE /:id
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(

        "NSO Rules",

        "Full"

    ),

    deleteAllRules

);






// ======================================================
// DELETE SINGLE RULE
// DELETE /api/nso-rules/:id
// Permission : Full
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "NSO Rules",

        "Full"

    ),

    deleteRule

);






// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;