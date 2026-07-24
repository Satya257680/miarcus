const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

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
// ======================================

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("Questions", "View"),
  getQuestions
);

// ======================================
// CREATE QUESTION
// ======================================

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("Questions", "Add"),
  createQuestion
);

// ======================================
// DELETE ALL QUESTIONS
// ======================================

router.delete(
  "/delete-all",
  authMiddleware,
  permissionMiddleware("Questions", "Full"),
  deleteAllQuestions
);

// ======================================
// GET SINGLE QUESTION
// ======================================

router.get(
  "/:id",
  authMiddleware,
  permissionMiddleware("Questions", "View"),
  getQuestionById
);

// ======================================
// UPDATE QUESTION
// ======================================

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("Questions", "Edit"),
  updateQuestion
);

// ======================================
// DELETE QUESTION
// ======================================

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("Questions", "Full"),
  deleteQuestion
);

module.exports = router;