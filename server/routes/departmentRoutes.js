const express = require("express");
const router = express.Router();

const departmentController = require("../controllers/departmentController");

// ==============================
// GET All Departments
// ==============================
router.get("/", departmentController.getDepartments);

// ==============================
// GET Assigned Users of Department
// ==============================
router.get("/:id/users", departmentController.getAssignedUsers);

// ==============================
// POST Create Department
// ==============================
router.post("/", departmentController.createDepartment);

// ==============================
// PUT Update Department
// ==============================
router.put("/:id", departmentController.updateDepartment);

// ==============================
// DELETE Department
// ==============================
router.delete("/:id", departmentController.deleteDepartment);

module.exports = router;