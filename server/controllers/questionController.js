const Question = require("../models/questionModel");

const { logActivity } = require("../utils/activityLogger");

// ======================================================
// GET QUESTIONS
// If checklist_type_id is passed,
// return only that checklist's questions.
// Otherwise return all questions.
// ======================================================

exports.getQuestions = (req, res) => {

    const { checklist_type_id } = req.query;

    // ======================================
    // CHECKLIST SUBMISSION
    // ======================================

    if (checklist_type_id) {

        return Question.getQuestionsByChecklistType(

            checklist_type_id,

            (err, rows) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: err.message

                    });

                }

                return res.status(200).json({

                    success: true,

                    data: rows

                });

            }

        );

    }

    // ======================================
    // QUESTIONS PAGE
    // ======================================

    Question.getAllQuestions(

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            return res.status(200).json({

                success: true,

                count: rows.length,

                data: rows

            });

        }

    );

};
// ======================================================
// GET QUESTION BY ID
// ======================================================

exports.getQuestionById = (req, res) => {

    const { id } = req.params;

    Question.getQuestionById(

        id,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Question not found"

                });

            }

            const question = rows[0];

            question.departments =

                question.department_ids

                    ? question.department_ids

                          .split(",")

                          .map(Number)

                    : [];

            return res.status(200).json({

                success: true,

                data: question

            });

        }

    );

};
// ======================================================
// CREATE QUESTION
// ======================================================

exports.createQuestion = (req, res) => {

    let {

        checklist_type_id,

        question,

        sequence_no,

        answer_type,

        sla_value,

        sla_unit,

        answer_required,

        status,

        departments = []

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    question = question?.trim();

    if (

        !checklist_type_id ||

        !question ||

        !answer_type

    ) {

        return res.status(400).json({

            success: false,

            message: "Checklist Type, Question and Answer Type are required."

        });

    }

    status = status || "Active";

    // ======================================
    // CREATE QUESTION
    // ======================================

    Question.createQuestion(

        {

            checklist_type_id,

            question,

            sequence_no,

            answer_type,

            sla_value,

            sla_unit,

            answer_required,

            status

        },
                (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            const questionId = result.insertId;

            // ======================================
            // SAVE DEPARTMENTS
            // ======================================

            Question.saveDepartments(

                questionId,

                departments,

                (deptErr) => {

                    if (deptErr) {

                        console.error(deptErr);

                        return res.status(500).json({

                            success: false,

                            message: deptErr.message

                        });

                    }

                    // ======================================
                    // LOG ACTIVITY
                    // ======================================

                    logActivity({

                        activity_type: "Question",

                        reference_id: questionId,

                        title: "Question Created",

                        description: `${question} question was created`,

                        module_name: "Questions",

                        status: "Open",

                        priority: "Medium",

                        created_by: req.user.id,

                        assigned_to: null

                    });

                    return res.status(201).json({

                        success: true,

                        message: "Question created successfully.",

                        id: questionId

                    });

                }

            );

        }

    );

};
// ======================================================
// UPDATE QUESTION
// ======================================================

exports.updateQuestion = (req, res) => {

    const { id } = req.params;

    let {

        checklist_type_id,

        question,

        sequence_no,

        answer_type,

        sla_value,

        sla_unit,

        answer_required,

        status,

        departments = []

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    question = question?.trim();

    if (

        !checklist_type_id ||

        !question ||

        !answer_type

    ) {

        return res.status(400).json({

            success: false,

            message: "Checklist Type, Question and Answer Type are required."

        });

    }

    status = status || "Active";

    // ======================================
    // UPDATE QUESTION
    // ======================================

    Question.updateQuestion(

        id,

        {

            checklist_type_id,

            question,

            sequence_no,

            answer_type,

            sla_value,

            sla_unit,

            answer_required,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // DELETE OLD DEPARTMENTS
            // ======================================

            Question.deleteDepartments(

                id,

                (deleteErr) => {

                    if (deleteErr) {

                        console.error(deleteErr);

                        return res.status(500).json({

                            success: false,

                            message: deleteErr.message

                        });

                    }

                    // ======================================
                    // SAVE NEW DEPARTMENTS
                    // ======================================

                    Question.saveDepartments(

                        id,

                        departments,

                        (saveErr) => {

                            if (saveErr) {

                                console.error(saveErr);

                                return res.status(500).json({

                                    success: false,

                                    message: saveErr.message

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Question",

                                reference_id: id,

                                title: "Question Updated",

                                description: `${question} question was updated`,

                                module_name: "Questions",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Question updated successfully."

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// DELETE QUESTION
// ======================================================

exports.deleteQuestion = (req, res) => {

    const { id } = req.params;

    // ======================================
    // GET QUESTION DETAILS
    // ======================================

    Question.getQuestionById(

        id,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Question not found."

                });

            }

            const questionData = rows[0];

            // ======================================
            // DELETE QUESTION DEPARTMENTS
            // ======================================

            Question.deleteDepartments(

                id,

                (deleteDeptErr) => {

                    if (deleteDeptErr) {

                        console.error(deleteDeptErr);

                        return res.status(500).json({

                            success: false,

                            message: deleteDeptErr.message

                        });

                    }

                    // ======================================
                    // DELETE QUESTION
                    // ======================================

                    Question.deleteQuestion(

                        id,

                        (deleteErr) => {

                            if (deleteErr) {

                                console.error(deleteErr);

                                return res.status(500).json({

                                    success: false,

                                    message: deleteErr.message

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Question",

                                reference_id: id,

                                title: "Question Deleted",

                                description: `${questionData.question} question was deleted`,

                                module_name: "Questions",

                                status: "Closed",

                                priority: "High",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Question deleted successfully."

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// DELETE ALL QUESTIONS
// ======================================================

exports.deleteAllQuestions = (req, res) => {

    Question.deleteAllQuestions(

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Question",

                reference_id: 0,

                title: "All Questions Deleted",

                description: "All questions were deleted from the Questions module",

                module_name: "Questions",

                status: "Closed",

                priority: "High",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.status(200).json({

                success: true,

                message: "All Questions deleted successfully."

            });

        }

    );

};
// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

exports.getQuestions = exports.getQuestions;

exports.getQuestionById = exports.getQuestionById;

exports.createQuestion = exports.createQuestion;

exports.updateQuestion = exports.updateQuestion;

exports.deleteQuestion = exports.deleteQuestion;

exports.deleteAllQuestions = exports.deleteAllQuestions;