const express = require("express");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");



// ======================================================
// CONTROLLER
// ======================================================

const questionController = require("../controllers/questionController");




// ======================================================
// BASE URL
// /api/questions
// ======================================================





// ======================================================
// GET QUESTIONS
// GET /api/questions
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Questions",

        "View"

    ),

    questionController.getQuestions

);







// ======================================================
// CREATE QUESTION
// POST /api/questions
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Questions",

        "Add"

    ),

    questionController.createQuestion

);







// ======================================================
// DELETE ALL QUESTIONS
// DELETE /api/questions/delete-all
// Permission : Full
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(

        "Questions",

        "Full"

    ),

    questionController.deleteAllQuestions

);







// ======================================================
// GET QUESTION BY ID
// GET /api/questions/:id
// Permission : View
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Questions",

        "View"

    ),

    questionController.getQuestionById

);







// ======================================================
// UPDATE QUESTION
// PUT /api/questions/:id
// Permission : Edit
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Questions",

        "Edit"

    ),

    questionController.updateQuestion

);







// ======================================================
// DELETE QUESTION
// DELETE /api/questions/:id
// Permission : Full
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Questions",

        "Full"

    ),

    questionController.deleteQuestion

);







// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;