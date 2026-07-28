const express = require("express");
const router = express.Router();

// ==============================
// Middleware
// ==============================

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

// ==============================
// Controller
// ==============================

const departmentController = require("../controllers/departmentController");

// ==============================
// GET All Departments
// Permission: View / Add / Edit / Full
// ==============================

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("Departments", "View"),
  departmentController.getDepartments
);

// ==============================
// GET Assigned Users
// Permission: View / Add / Edit / Full
// ==============================

router.get(
  "/:id/users",
  authMiddleware,
  permissionMiddleware("Departments", "View"),
  departmentController.getAssignedUsers
);

// ==============================
// CREATE Department
// Permission: Add / Edit / Full
// ==============================

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("Departments", "Add"),
  departmentController.createDepartment
);

// ==============================
// UPDATE Department
// Permission: Edit / Full
// ==============================

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("Departments", "Edit"),
  departmentController.updateDepartment
);

// ==============================
// DELETE Department
// Permission: Full
// ==============================

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("Departments", "Full"),
  departmentController.deleteDepartment
);

module.exports = router;