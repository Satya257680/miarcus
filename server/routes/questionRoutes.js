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
// GET QUESTIONS
// - Without query: returns all questions
// - With ?checklist_type_id=1 : returns only
//   that checklist type's questions
// ======================================
router.get("/", getQuestions);

// ======================================
// CREATE QUESTION
// ======================================
router.post("/", createQuestion);

// ======================================
// DELETE ALL QUESTIONS
// ======================================
router.delete("/delete-all", deleteAllQuestions);

// ======================================
// GET SINGLE QUESTION
// ======================================
router.get("/:id", getQuestionById);

// ======================================
// UPDATE QUESTION
// ======================================
router.put("/:id", updateQuestion);

// ======================================
// DELETE QUESTION
// ======================================
router.delete("/:id", deleteQuestion);

module.exports = router;