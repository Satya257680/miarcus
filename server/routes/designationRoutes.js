const express = require("express");
const router = express.Router();

const designationController = require("../controllers/designationController");

// Get all designations
router.get("/", designationController.getAllDesignations);

// Create designation
router.post("/", designationController.createDesignation);

// Update designation
router.put("/:id", designationController.updateDesignation);

// Delete designation
router.delete("/:id", designationController.deleteDesignation);

module.exports = router;