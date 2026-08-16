const express = require("express");
const multer = require("multer");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

// ======================================================
// CONTROLLER
// ======================================================

const quiz = require("../controllers/quizController");

// ======================================================
// QUIZ RBAC PERMISSION HELPER
// ======================================================
//
// Module name:
//     Quiz
//
// Permission levels:
//     View -> View
//     Add  -> View + Add
//     Edit -> View + Edit
//     Full -> View + Add + Edit + Delete
//
// Admin users automatically bypass permission checks.
// ======================================================

const quizPermission = (level) => {

    return (req, res, next) => {

        const isAdmin =
            req.user?.is_admin === 1 ||
            req.user?.is_admin === true ||
            req.user?.is_admin === "1";

        // --------------------------------------------------
        // ADMIN BYPASS
        // --------------------------------------------------

        if (isAdmin) {
            return next();
        }

        // --------------------------------------------------
        // NORMAL USER
        // --------------------------------------------------

        return permissionMiddleware(
            "Quiz",
            level
        )(req, res, next);
    };
};

// ======================================================
// MULTER
// ======================================================
//
// Used for participant verification photo.
//
// Memory storage is used because the controller handles
// saving the uploaded image.
// ======================================================

const upload = multer({

    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
        }

        return cb(
            new Error(
                "Only JPG, PNG or WEBP images are allowed"
            )
        );
    }

});

// ======================================================
// ROUTER TEST
// ======================================================
//
// IMPORTANT:
// Keep these BEFORE "/:id".
//
// Test:
// GET /api/quiz/route-test
//
// This confirms that quizRoutes.js is actually mounted.
// ======================================================

router.get(
    "/route-test",
    (req, res) => {

        return res.status(200).json({
            success: true,
            message: "Quiz API route is mounted",
            path: "/api/quiz"
        });

    }
);

// ======================================================
// ROUTER STATUS
// ======================================================
//
// Test:
// GET /api/quiz/status
//
// No authentication is required because this is only
// a route-mount diagnostic endpoint.
// ======================================================

router.get(
    "/status",
    (req, res) => {

        return res.status(200).json({
            success: true,
            quizRoutesLoaded: true,
            route: "/api/quiz",
            routeFile: "./routes/quizRoutes"
        });

    }
);

// ======================================================
// PUBLIC QUIZ ROUTES
// ======================================================
//
// These routes DO NOT require login.
//
// Example:
//
// /quiz/ABC123
//
// Anyone who receives the reusable link can open it.
// ======================================================


// ======================================================
// GET PUBLIC QUIZ
// GET /api/quiz/public/:token
// ======================================================

router.get(
    "/public/:token",
    quiz.getPublicQuiz
);


// ======================================================
// START PUBLIC QUIZ
// POST /api/quiz/public/:token/start
// ======================================================

router.post(
    "/public/:token/start",
    upload.single("photo"),
    quiz.startPublicQuiz
);


// ======================================================
// SUBMIT PUBLIC QUIZ
// POST /api/quiz/public/session/:sessionToken/submit
// ======================================================

router.post(
    "/public/session/:sessionToken/submit",
    quiz.submitPublicQuiz
);


// ======================================================
// INTERNAL QUIZ ROUTES
// ======================================================
//
// All routes below require:
//
// 1. Authentication
// 2. Quiz RBAC permission
//
// Module:
//     Quiz
// ======================================================


// ======================================================
// GET ALL QUIZZES
// GET /api/quiz
//
// Permission:
//     View
//
// Used by:
//     Quiz Setup
//     Take Quiz
//     Email Settings
//     Training Report
// ======================================================

router.get(
    "/",
    authMiddleware,
    quizPermission("View"),
    quiz.getAll
);


// ======================================================
// GET RECIPIENTS
// GET /api/quiz/recipients
//
// Permission:
//     View
//
// Used by:
//     Email Settings
// ======================================================

router.get(
    "/recipients",
    authMiddleware,
    quizPermission("View"),
    quiz.getRecipients
);


// ======================================================
// GET TRAINING REPORTS
// GET /api/quiz/reports
//
// Permission:
//     View
//
// Used by:
//     Training Report
// ======================================================

router.get(
    "/reports",
    authMiddleware,
    quizPermission("View"),
    quiz.getReports
);


// ======================================================
// GET SINGLE TRAINING REPORT
// GET /api/quiz/reports/:id
//
// Permission:
//     View
// ======================================================

router.get(
    "/reports/:id",
    authMiddleware,
    quizPermission("View"),
    quiz.getReport
);


// ======================================================
// DELETE TRAINING REPORT
// DELETE /api/quiz/reports/:id
//
// Permission:
//     Full
// ======================================================

router.delete(
    "/reports/:id",
    authMiddleware,
    quizPermission("Full"),
    quiz.deleteReport
);


// ======================================================
// SEND QUIZ EMAIL
// POST /api/quiz/email/send
//
// Permission:
//     Add
//
// Allows admin/user with Quiz Add permission to send
// the reusable quiz link through Email Settings.
// ======================================================

router.post(
    "/email/send",
    authMiddleware,
    quizPermission("Add"),
    quiz.sendEmails
);


// ======================================================
// EMAIL HISTORY
// GET /api/quiz/:id/email-logs
//
// Permission:
//     View
// ======================================================

router.get(
    "/:id/email-logs",
    authMiddleware,
    quizPermission("View"),
    quiz.getEmailLogs
);


// ======================================================
// GET SINGLE QUIZ
// GET /api/quiz/:id
//
// Permission:
//     View
// ======================================================

router.get(
    "/:id",
    authMiddleware,
    quizPermission("View"),
    quiz.getOne
);


// ======================================================
// CREATE QUIZ
// POST /api/quiz
//
// Permission:
//     Add
// ======================================================

router.post(
    "/",
    authMiddleware,
    quizPermission("Add"),
    quiz.create
);


// ======================================================
// UPDATE QUIZ
// PUT /api/quiz/:id
//
// Permission:
//     Edit
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    quizPermission("Edit"),
    quiz.update
);


// ======================================================
// DELETE QUIZ
// DELETE /api/quiz/:id
//
// Permission:
//     Full
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    quizPermission("Full"),
    quiz.remove
);


// ======================================================
// ADD QUESTION
// POST /api/quiz/:id/questions
//
// Permission:
//     Add
// ======================================================

router.post(
    "/:id/questions",
    authMiddleware,
    quizPermission("Add"),
    quiz.addQuestion
);


// ======================================================
// UPDATE QUESTION
// PUT /api/quiz/:id/questions/:questionId
//
// Permission:
//     Edit
// ======================================================

router.put(
    "/:id/questions/:questionId",
    authMiddleware,
    quizPermission("Edit"),
    quiz.updateQuestion
);


// ======================================================
// DELETE QUESTION
// DELETE /api/quiz/:id/questions/:questionId
//
// Permission:
//     Full
// ======================================================

router.delete(
    "/:id/questions/:questionId",
    authMiddleware,
    quizPermission("Full"),
    quiz.removeQuestion
);


// ======================================================
// MULTER ERROR HANDLER
// ======================================================
//
// Handles invalid image type / file size errors.
// ======================================================

router.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

    if (
        err &&
        err.message ===
        "Only JPG, PNG or WEBP images are allowed"
    ) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

    return next(err);

});


// ======================================================
// EXPORT
// ======================================================

module.exports = router;