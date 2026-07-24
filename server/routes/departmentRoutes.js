const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const departmentController = require("../controllers/departmentController");

// ==============================
// GET All Departments
// ==============================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware("Departments", "View"),

    departmentController.getDepartments

);

// ==============================
// GET Assigned Users of Department
// ==============================

router.get(

    "/:id/users",

    authMiddleware,

    permissionMiddleware("Departments", "View"),

    departmentController.getAssignedUsers

);

// ==============================
// POST Create Department
// ==============================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware("Departments", "Add"),

    departmentController.createDepartment

);

// ==============================
// PUT Update Department
// ==============================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware("Departments", "Edit"),

    departmentController.updateDepartment

);

// ==============================
// DELETE Department
// ==============================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware("Departments", "Full"),

    departmentController.deleteDepartment

);

module.exports = router;