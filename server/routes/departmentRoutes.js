const express = require("express");

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

    getDepartments,

    getAssignedUsers,

    createDepartment,

    updateDepartment,

    deleteDepartment


} = require("../controllers/departmentController");





// ======================================================
// BASE URL
// /api/departments
// ======================================================





// ======================================================
// GET ALL DEPARTMENTS
// GET /api/departments
// Permission : View
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
// GET ASSIGNED USERS
// GET /api/departments/:id/users
// Permission : View
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
// Permission : Add
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
// Permission : Edit
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
// DELETE DEPARTMENT
// DELETE /api/departments/:id
// Permission : Full
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