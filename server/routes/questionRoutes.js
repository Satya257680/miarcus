const express = require("express");

const router = express.Router();

const {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions,
} = require("../controllers/questionController");

// ======================================
// Get All Questions
// ======================================
router.get("/", getQuestions);

// ======================================
// Create Question
// ======================================
router.post("/", createQuestion);

// ======================================
// Delete All Questions
// ======================================
router.delete("/delete-all", deleteAllQuestions);

// ======================================
// Get Single Question
// ======================================
router.get("/:id", getQuestionById);

// ======================================
// Update Question
// ======================================
router.put("/:id", updateQuestion);

// ======================================
// Delete Question
// ======================================
router.delete("/:id", deleteQuestion);

module.exports = router;