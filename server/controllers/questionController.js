const Question = require("../models/questionModel");

// ==============================
// Get Questions
// If checklist_type_id is passed,
// return only that checklist's questions.
// Otherwise return all questions.
// ==============================

exports.getQuestions = (req, res) => {

  const { checklist_type_id } = req.query;

  // ============================
  // Checklist Submission
  // ============================

  if (checklist_type_id) {

    return Question.getQuestionsByChecklistType(
      checklist_type_id,
      (err, rows) => {

        if (err) {
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

        return res.json({
          success: true,
          data: rows,
        });

      }
    );

  }

  // ============================
  // Questions Page
  // ============================

  Question.getAllQuestions((err, rows) => {

    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      data: rows,
    });

  });

};

// ==============================
// Get Question By ID
// ==============================

exports.getQuestionById = (req, res) => {

  Question.getQuestionById(req.params.id, (err, rows) => {

    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const question = rows[0];

    question.departments = question.department_ids
      ? question.department_ids.split(",").map(Number)
      : [];

    res.json({
      success: true,
      data: question,
    });

  });

};

// ==============================
// Create Question
// ==============================

exports.createQuestion = (req, res) => {

  const {
    checklist_type_id,
    question,
    sequence_no,
    answer_type,
    sla_value,
    sla_unit,
    answer_required,
    status,
    departments = [],
  } = req.body;

  if (
    !checklist_type_id ||
    !question ||
    !answer_type
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Checklist Type, Question and Answer Type are required.",
    });
  }

  Question.createQuestion(
    {
      checklist_type_id,
      question,
      sequence_no,
      answer_type,
      sla_value,
      sla_unit,
      answer_required,
      status,
    },
    (err, result) => {

      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      const questionId = result.insertId;

      Question.saveDepartments(
        questionId,
        departments,
        (deptErr) => {

          if (deptErr) {
            return res.status(500).json({
              success: false,
              message: deptErr.message,
            });
          }

          res.status(201).json({
            success: true,
            message: "Question created successfully.",
          });

        }
      );

    }
  );

};

// ==============================
// Update Question
// ==============================

exports.updateQuestion = (req, res) => {

  const id = req.params.id;

  const {
    checklist_type_id,
    question,
    sequence_no,
    answer_type,
    sla_value,
    sla_unit,
    answer_required,
    status,
    departments = [],
  } = req.body;

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
      status,
    },
    (err) => {

      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      Question.deleteDepartments(
        id,
        (deleteErr) => {

          if (deleteErr) {
            return res.status(500).json({
              success: false,
              message: deleteErr.message,
            });
          }

          Question.saveDepartments(
            id,
            departments,
            (saveErr) => {

              if (saveErr) {
                return res.status(500).json({
                  success: false,
                  message: saveErr.message,
                });
              }

              res.json({
                success: true,
                message: "Question updated successfully.",
              });

            }
          );

        }
      );

    }
  );

};

// ==============================
// Delete Question
// ==============================

exports.deleteQuestion = (req, res) => {

  Question.deleteQuestion(
    req.params.id,
    (err) => {

      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      res.json({
        success: true,
        message: "Question deleted successfully.",
      });

    }
  );

};

// ==============================
// Delete All Questions
// ==============================

exports.deleteAllQuestions = (req, res) => {

  Question.deleteAllQuestions((err) => {

    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "All Questions deleted successfully.",
    });

  });

};