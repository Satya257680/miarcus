const express = require("express");
const router = express.Router();

const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const questionController = require("../controllers/questionController");

// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({
    storage: multer.memoryStorage()
});

// ======================================================
// GET ALL QUESTIONS
// GET /api/questions
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware("Questions", "View"),
    questionController.getQuestions
);

// ======================================================
// GET QUESTION BY ID
// GET /api/questions/:id
// ======================================================

router.get(
    "/:id",
    authMiddleware,
    permissionMiddleware("Questions", "View"),
    questionController.getQuestionById
);

// ======================================================
// CREATE QUESTION
// POST /api/questions
// ======================================================

router.post(
    "/",
    authMiddleware,
    permissionMiddleware("Questions", "Add"),
    questionController.createQuestion
);

// ======================================================
// BULK UPLOAD QUESTIONS
// POST /api/questions/bulk-upload
// ======================================================

router.post(
    "/bulk-upload",
    authMiddleware,
    permissionMiddleware("Questions", "Add"),
    upload.single("file"),
    questionController.bulkUploadQuestions
);

// ======================================================
// UPDATE QUESTION
// PUT /api/questions/:id
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware("Questions", "Edit"),
    questionController.updateQuestion
);

// ======================================================
// DELETE ALL QUESTIONS
// IMPORTANT: BEFORE /:id
// ======================================================

router.delete(
    "/delete-all",
    authMiddleware,
    permissionMiddleware("Questions", "Full"),
    questionController.deleteAllQuestions
);

// ======================================================
// DELETE SINGLE QUESTION
// DELETE /api/questions/:id
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware("Questions", "Full"),
    questionController.deleteQuestion
);

module.exports = router;