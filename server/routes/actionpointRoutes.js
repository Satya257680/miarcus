const express = require("express");

const router = express.Router();

const {
    getActionPoints,
    createActionPoint,
} = require("../controllers/actionPointController");

// Get all Action Points
router.get("/", getActionPoints);

// Create a new Action Point
router.post("/", createActionPoint);

module.exports = router;