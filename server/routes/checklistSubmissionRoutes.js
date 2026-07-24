const express = require("express");
const router = express.Router();

const db = require("../config/db");
const upload = require("../middleware/upload");

// ================= MIDDLEWARE =================

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

// =====================================================
// CREATE TABLES
// =====================================================

const createSubmissionTable = `

CREATE TABLE IF NOT EXISTS checklist_submissions (

    id INT AUTO_INCREMENT PRIMARY KEY,

    checklist_type_id INT NOT NULL,

    store_id INT NOT NULL,

    submitted_by INT NULL,

    submission_date DATE NOT NULL,

    latitude DECIMAL(10,7) NULL,

    longitude DECIMAL(10,7) NULL,

    device VARCHAR(255) NULL,

    attachment VARCHAR(500) NULL,

    status VARCHAR(50) DEFAULT 'Submitted',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

)

`;

const createAnswersTable = `

CREATE TABLE IF NOT EXISTS checklist_submission_answers (

    id INT AUTO_INCREMENT PRIMARY KEY,

    submission_id INT NOT NULL,

    question_id INT NOT NULL,

    answer TEXT NULL,

    remarks TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(submission_id)

    REFERENCES checklist_submissions(id)

    ON DELETE CASCADE

)

`;

db.query(createSubmissionTable, (err) => {

    if (err) {

        console.log(
            "Table Error:",
            err
        );

        return;
    }

    db.query(createAnswersTable, (err) => {

        if (err) {

            console.log(
                "Answer Table Error",
                err
            );

            return;
        }

        console.log(
            "✅ Checklist Tables Ready"
        );

    });

});

// =====================================================
// CREATE CHECKLIST SUBMISSION
// POST /api/checklist-submissions
// =====================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware("Checklist Submission", "Add"),

    upload.single("attachment"),

    (req, res) => {

        console.log("BODY:", req.body);

        console.log("FILE:", req.file);

        const {

            checklist_type_id,

            store_id,

            submitted_by,

            submission_date,

            latitude,

            longitude,

            device,

            answers

        } = req.body;

        // ================= Parse Answers =================

        let checklistAnswers = [];

        try {

            checklistAnswers =
                JSON.parse(
                    answers || "[]"
                );

        }
        catch (error) {

            console.log(
                "Answer Parse Error",
                error
            );

            checklistAnswers = [];

        }

        // ================= Attachment =================

        const attachment =
            req.file
                ? req.file.path
                : null;

        // ================= Device =================

        const finalDevice =
            device ||
            req.headers["user-agent"] ||
            "Unknown Device";

        // ================= Validation =================

        if (!checklist_type_id) {

            return res.status(400).json({

                success: false,

                message: "Checklist Type required"

            });

        }

        if (!store_id) {

            return res.status(400).json({

                success: false,

                message: "Store required"

            });

        }

        if (!submission_date) {

            return res.status(400).json({

                success: false,

                message: "Date required"

            });

        }

        if (
            !Array.isArray(checklistAnswers) ||
            checklistAnswers.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message: "Answers required"

            });

        }

        // ================= Insert Submission =================

        const sql = `

INSERT INTO checklist_submissions

(

checklist_type_id,

store_id,

submitted_by,

submission_date,

latitude,

longitude,

device,

attachment,

status

)

VALUES (?,?,?,?,?,?,?,?,?)

`;

        const values = [

            checklist_type_id,

            store_id,

            submitted_by || null,

            submission_date,

            latitude || null,

            longitude || null,

            finalDevice,

            attachment,

            "Submitted"

        ];

        db.query(
            sql,
            values,
                        (err, result) => {

                if (err) {

                    console.log(
                        "Submission Error",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message: "Submission failed"

                    });

                }

                const submissionId =
                    result.insertId;

                const answerValues =
                    checklistAnswers

                        .filter(
                            item => item.question_id
                        )

                        .map(item => [

                            submissionId,

                            item.question_id,

                            item.answer
                                ? String(item.answer)
                                : "",

                            item.remarks || ""

                        ]);

                if (answerValues.length === 0) {

                    return res.status(400).json({

                        success: false,

                        message: "No valid answers"

                    });

                }

                const answerSql = `

INSERT INTO checklist_submission_answers

(

submission_id,

question_id,

answer,

remarks

)

VALUES ?

`;

                db.query(

                    answerSql,

                    [answerValues],

                    (answerErr) => {

                        if (answerErr) {

                            console.log(
                                "Answer Error",
                                answerErr
                            );

                            return res.status(500).json({

                                success: false,

                                message: "Answers not saved"

                            });

                        }

                        return res.status(201).json({

                            success: true,

                            message:
                                "Checklist submitted successfully",

                            submission_id:
                                submissionId,

                            attachment:
                                attachment

                        });

                    }

                );

            }

        );

    }

);

// =====================================================
// GET ALL SUBMISSIONS
// =====================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(
        "Checklist Submission",
        "View"
    ),

    (req, res) => {

        const sql = `

SELECT *

FROM checklist_submissions

ORDER BY created_at DESC

`;

        db.query(
            sql,
            (err, result) => {

                if (err) {

                    return res.status(500).json({

                        success: false

                    });

                }

                res.json({

                    success: true,

                    data: result

                });

            }
        );

    }

);
// =====================================================
// GET SINGLE SUBMISSION
// =====================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(
        "Checklist Submission",
        "View"
    ),

    (req, res) => {

        const id = req.params.id;

        const sql = `

SELECT *

FROM checklist_submissions

WHERE id=?

`;

        db.query(

            sql,

            [id],

            (err, result) => {

                if (err) {

                    return res.status(500).json({

                        success: false

                    });

                }

                if (result.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message: "Not found"

                    });

                }

                const answerSql = `

SELECT *

FROM checklist_submission_answers

WHERE submission_id=?

ORDER BY id ASC

`;

                db.query(

                    answerSql,

                    [id],

                    (err, answers) => {

                        if (err) {

                            return res.status(500).json({

                                success: false

                            });

                        }

                        return res.json({

                            success: true,

                            data: {

                                ...result[0],

                                answers

                            }

                        });

                    }

                );

            }

        );

    }

);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;