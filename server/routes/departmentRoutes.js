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

    getDepartments,

    getDepartmentById,

    getAssignedUsers,

    createDepartment,

    updateDepartment,

    deleteDepartment,

    deleteAllDepartments,

    exportDepartments,

    bulkUploadDepartments

} = require("../controllers/departmentController");

// ======================================================
// GET ALL DEPARTMENTS
// GET /api/departments
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "View"

    ),

    getDepartments

);

// ======================================================
// EXPORT DEPARTMENTS
// GET /api/departments/export
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "View"

    ),

    exportDepartments

);

// ======================================================
// BULK UPLOAD DEPARTMENTS
// POST /api/departments/bulk-upload
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "Add"

    ),

    upload.single("file"),

    bulkUploadDepartments

);

// ======================================================
// DELETE ALL DEPARTMENTS
// DELETE /api/departments/delete-all
// IMPORTANT: MUST COME BEFORE /:id
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "Full"

    ),

    deleteAllDepartments

);

// ======================================================
// GET DEPARTMENT BY ID
// GET /api/departments/:id
// IMPORTANT: MUST COME BEFORE /:id/users
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "View"

    ),

    getDepartmentById

);

// ======================================================
// GET ASSIGNED USERS
// GET /api/departments/:id/users
// ======================================================

router.get(

    "/:id/users",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "View"

    ),

    getAssignedUsers

);

// ======================================================
// CREATE DEPARTMENT
// POST /api/departments
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "Add"

    ),

    createDepartment

);

// ======================================================
// UPDATE DEPARTMENT
// PUT /api/departments/:id
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "Edit"

    ),

    updateDepartment

);

// ======================================================
// DELETE SINGLE DEPARTMENT
// DELETE /api/departments/:id
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Departments",

        "Full"

    ),

    deleteDepartment

);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;