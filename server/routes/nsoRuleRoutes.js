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
// PARAM VALIDATION
// ======================================================

router.param("id", (req, res, next, id) => {

    const ruleId = Number(id);

    if (

        Number.isNaN(ruleId) ||

        ruleId <= 0

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Rule ID."

        });

    }

    req.params.id = ruleId;

    next();

});

// ======================================================
// BASE URL
// /api/nso-rules
// ======================================================

// ======================================================
// GET ALL RULES
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
// EXPORT CSV
// GET /api/nso-rules/export
// Permission : View
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
// BULK UPLOAD
// POST /api/nso-rules/bulk-upload
// Permission : Add
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
// DELETE RULE
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