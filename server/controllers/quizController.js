const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const Quiz = require("../models/quizModel");
const db = require("../config/db");

const {
    sendGenericEmail
} = require("../services/emailService");


// ======================================================
// FRONTEND URL
// ======================================================

const frontendUrl = () => {

    return String(
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

};


// ======================================================
// HELPERS
// ======================================================

const parseMaybeJson = (
    value,
    fallback = null
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    if (
        typeof value !== "string"
    ) {
        return value;
    }

    try {

        return JSON.parse(value);

    } catch {

        // Same reasoning as quizModel.js's parseJson: MySQL already
        // decodes JSON columns, so a scalar answer like "Tiger" arrives
        // here as a plain (already-decoded) string, not JSON text.
        // Falling back to null here was erasing valid saved answers.
        return value;

    }

};

// ======================================================
// NORMALIZE ID
// ======================================================

const normalizeId = (value) => {

    const id = Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        return null;
    }

    return id;

};


// ======================================================
// NORMALIZE EMAIL
// ======================================================

const normalizeEmail = (value) => {

    return String(value || "")
        .trim()
        .toLowerCase();

};


// ======================================================
// VALID EMAIL
// ======================================================

const isValidEmail = (email) => {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );

};


// ======================================================
// NORMALIZE ANSWER
// ======================================================

const normalizeAnswer = (
    answer
) => {

    if (Array.isArray(answer)) {

        return answer
            .map((item) =>
                String(item)
                    .trim()
                    .toLowerCase()
            )
            .sort();

    }

    if (
        answer === null ||
        answer === undefined
    ) {
        return "";
    }

    return String(answer)
        .trim()
        .toLowerCase();

};


// ======================================================
// CLEAN OPTION TEXT
// ======================================================

const cleanOptionText = (value) => {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .trim()
        .replace(
            /^[A-Z]\s*[\.\)\-:]\s*/i,
            ""
        )
        .replace(
            /^\d+\s*[\.\)\-:]\s*/,
            ""
        )
        .trim();

};


// ======================================================
// GET QUESTION OPTIONS
// ======================================================

const getQuestionOptions = (
    question
) => {

    let options =
        parseMaybeJson(
            question?.options_json,
            null
        );


    if (
        options === null ||
        options === undefined
    ) {

        options =
            parseMaybeJson(
                question?.options,
                null
            );

    }


    if (
        options === null ||
        options === undefined
    ) {

        options =
            parseMaybeJson(
                question?.option_json,
                null
            );

    }


    if (
        options === null ||
        options === undefined
    ) {

        options =
            parseMaybeJson(
                question?.choices,
                null
            );

    }


    if (Array.isArray(options)) {

        return options
            .map((option) => {

                if (
                    option &&
                    typeof option === "object"
                ) {

                    return (
                        option.text ??
                        option.label ??
                        option.value ??
                        option.option ??
                        ""
                    );

                }

                return option;

            })
            .map(cleanOptionText)
            .filter(Boolean);

    }


    if (
        options &&
        typeof options === "object"
    ) {

        return Object.values(options)
            .map((option) => {

                if (
                    option &&
                    typeof option === "object"
                ) {

                    return (
                        option.text ??
                        option.label ??
                        option.value ??
                        option.option ??
                        ""
                    );

                }

                return option;

            })
            .map(cleanOptionText)
            .filter(Boolean);

    }


    return [];

};


// ======================================================
// GET CORRECT ANSWER
// ======================================================

const getCorrectAnswer = (
    question
) => {

    let expected =
        parseMaybeJson(
            question?.correct_answer_json,
            undefined
        );


    if (
        expected === undefined ||
        expected === null ||
        expected === ""
    ) {

        expected =
            parseMaybeJson(
                question?.correct_answer,
                undefined
            );

    }


    if (
        expected === undefined ||
        expected === null ||
        expected === ""
    ) {

        expected =
            parseMaybeJson(
                question?.answer,
                undefined
            );

    }


    if (
        expected === undefined ||
        expected === null ||
        expected === ""
    ) {

        expected =
            parseMaybeJson(
                question?.correct_option,
                undefined
            );

    }


    return expected;

};


// ======================================================
// RESOLVE ANSWER VALUE
// ======================================================
//
// Supports:
//
// "Peacock"
// 0
// 1
// "A"
// "B"
// "Option A"
// "Option B"
// { value: "Peacock" }
// { text: "Peacock" }
// { label: "Peacock" }
//
// This is important for normal questions and
// AI-generated questions because different generators
// can store the correct answer in different formats.
// ======================================================

const resolveAnswerValue = (
    question,
    answer
) => {

    if (
        answer === null ||
        answer === undefined
    ) {
        return "";
    }


    if (
        typeof answer === "object" &&
        !Array.isArray(answer)
    ) {

        const objectValue =
            answer.value ??
            answer.text ??
            answer.label ??
            answer.answer ??
            answer.option;


        if (
            objectValue !== undefined &&
            objectValue !== null
        ) {

            return resolveAnswerValue(
                question,
                objectValue
            );

        }

    }


    const options =
        getQuestionOptions(question);


    if (Array.isArray(answer)) {

        return answer.map((item) =>
            resolveAnswerValue(
                question,
                item
            )
        );

    }


    const raw =
        String(answer).trim();


    if (!raw) {
        return "";
    }


    // --------------------------------------------------
    // Exact option text
    // --------------------------------------------------

    const exactIndex =
        options.findIndex(
            (option) =>
                normalizeAnswer(option) ===
                normalizeAnswer(raw)
        );


    if (exactIndex >= 0) {

        return options[exactIndex];

    }


    // --------------------------------------------------
    // Numeric option index
    // --------------------------------------------------

    if (
        /^\d+$/.test(raw)
    ) {

        const numericIndex =
            Number(raw);


        if (
            numericIndex >= 0 &&
            numericIndex < options.length
        ) {

            return options[numericIndex];

        }


        // Some frontends use 1-based indexes.

        const oneBasedIndex =
            numericIndex - 1;


        if (
            oneBasedIndex >= 0 &&
            oneBasedIndex < options.length
        ) {

            return options[oneBasedIndex];

        }

    }


    // --------------------------------------------------
    // A / B / C / D option format
    // --------------------------------------------------

    const letterMatch =
        raw.match(
            /^option\s*([a-z])$/i
        ) ||
        raw.match(
            /^([a-z])$/i
        );


    if (letterMatch) {

        const letter =
            letterMatch[1]
                .toUpperCase();


        const letterIndex =
            letter.charCodeAt(0) -
            "A".charCodeAt(0);


        if (
            letterIndex >= 0 &&
            letterIndex < options.length
        ) {

            return options[letterIndex];

        }

    }


    // --------------------------------------------------
    // "Option 1", "Option 2", etc.
// --------------------------------------------------

    const optionNumber =
        raw.match(
            /^option\s*(\d+)$/i
        );


    if (optionNumber) {

        const index =
            Number(
                optionNumber[1]
            ) - 1;


        if (
            index >= 0 &&
            index < options.length
        ) {

            return options[index];

        }

    }


    // --------------------------------------------------
    // Return original value if no mapping required
    // --------------------------------------------------

    return raw;

};


// ======================================================
// CHECK ANSWER
// ======================================================

const isCorrect = (
    question,
    answer
) => {

    const expected =
        getCorrectAnswer(
            question
        );


    if (
        expected === null ||
        expected === undefined ||
        expected === ""
    ) {

        return false;

    }


    // --------------------------------------------------
    // MULTIPLE CHOICE
    // --------------------------------------------------

    if (
        question.question_type ===
        "multiple_choice"
    ) {

        const actualArray =
            Array.isArray(answer)
                ? answer
                : String(answer || "")
                    .split(",")
                    .map((x) =>
                        x.trim()
                    )
                    .filter(Boolean);


        const expectedArray =
            Array.isArray(expected)
                ? expected
                : String(expected || "")
                    .split(",")
                    .map((x) =>
                        x.trim()
                    )
                    .filter(Boolean);


        const actualResolved =
            actualArray.map((item) =>
                resolveAnswerValue(
                    question,
                    item
                )
            );


        const expectedResolved =
            expectedArray.map((item) =>
                resolveAnswerValue(
                    question,
                    item
                )
            );


        const actualNormalized =
            normalizeAnswer(
                actualResolved
            );


        const expectedNormalized =
            normalizeAnswer(
                expectedResolved
            );


        return (
            JSON.stringify(
                actualNormalized
            ) ===
            JSON.stringify(
                expectedNormalized
            )
        );

    }


    // --------------------------------------------------
    // SINGLE CHOICE / TRUE FALSE / TEXT
    // --------------------------------------------------

    const actualResolved =
        resolveAnswerValue(
            question,
            answer
        );


    const expectedResolved =
        resolveAnswerValue(
            question,
            expected
        );


    return (
        normalizeAnswer(
            actualResolved
        ) ===
        normalizeAnswer(
            expectedResolved
        )
    );

};


// ======================================================
// QUESTION SCORING
// ======================================================
//
// Correct answer always receives the question points.
//
// option_scores_json is NOT used for normal
// single-choice scoring.
//
// This fixes the situation where:
//
// Correct answer = Peacock
// points = 1
// option_scores_json = { "Peacock": 0 }
//
// Previously that could result in 0 points.
// Now Peacock receives 1 point because it is the
// configured correct answer.
// ======================================================

const getQuestionScore = (
    question,
    answer
) => {

    const points =
        Number(
            question.points || 0
        );


    const correct =
        isCorrect(
            question,
            answer
        );


    return {

        max: points,

        awarded:
            correct
                ? points
                : 0

    };

};


// ======================================================
// CURRENT USER
// ======================================================

const getCurrentUserId = (
    req
) => {

    return (
        normalizeId(
            req?.user?.id
        ) || null
    );

};


// ======================================================
// GET ALL QUIZZES
// ======================================================

exports.getAll = async (
    req,
    res
) => {

    try {

        const quizzes =
            await Quiz.getQuizzes();


        return res.json({

            success: true,

            data:
                quizzes

        });

    } catch (error) {

        console.error(
            "Quiz getAll error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load quizzes"

        });

    }

};


// ======================================================
// GET ONE QUIZ
// ======================================================

exports.getOne = async (
    req,
    res
) => {

    try {

        const id =
            normalizeId(
                req.params.id
            );


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const quiz =
            await Quiz.getQuizById(
                id,
                true
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"

            });

        }


        return res.json({

            success: true,

            data:
                quiz

        });

    } catch (error) {

        console.error(
            "Quiz getOne error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load quiz"

        });

    }

};


// ======================================================
// GET ONE QUESTION
// ======================================================
// Dedicated endpoint for Edit.
// Always reads the persisted question directly from MySQL.
// ======================================================

exports.getQuestion = async (
    req,
    res
) => {

    try {

        const quizId =
            normalizeId(
                req.params.id
            );

        const questionId =
            normalizeId(
                req.params.questionId
            );

        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }

        if (!questionId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid question ID"

            });

        }

        const question =
            await Quiz.getQuestionById(
                questionId,
                quizId,
                true
            );

        if (!question) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found in this quiz"

            });

        }

        return res.json({

            success: true,

            data:
                question

        });

    } catch (error) {

        console.error(
            "Quiz getQuestion error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to load question"

        });

    }

};


// ======================================================
// CREATE QUIZ
// ======================================================

exports.create = async (
    req,
    res
) => {

    try {

        const name =
            String(
                req.body.name || ""
            ).trim();


        if (!name) {

            return res.status(400).json({

                success: false,

                message:
                    "Quiz name is required"

            });

        }


        const quiz =
            await Quiz.createQuiz({

                ...req.body,

                created_by:
                    getCurrentUserId(req)

            });


        return res.status(201).json({

            success: true,

            data:
                quiz,

            link:
                `${frontendUrl()}/quiz/${quiz.public_token}`

        });

    } catch (error) {

        console.error(
            "Quiz create error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to create quiz"

        });

    }

};


// ======================================================
// UPDATE QUIZ
// ======================================================

exports.update = async (
    req,
    res
) => {

    try {

        const id =
            normalizeId(
                req.params.id
            );


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const quiz =
            await Quiz.updateQuiz(
                id,
                req.body
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"

            });

        }


        return res.json({

            success: true,

            data:
                quiz,

            link:
                `${frontendUrl()}/quiz/${quiz.public_token}`

        });

    } catch (error) {

        console.error(
            "Quiz update error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to update quiz"

        });

    }

};


// ======================================================
// DELETE QUIZ
// ======================================================

exports.remove = async (
    req,
    res
) => {

    try {

        const id =
            normalizeId(
                req.params.id
            );


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const result =
            await Quiz.deleteQuiz(
                id
            );


        if (
            !result ||
            !result.deleted
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"

            });

        }


        return res.json({

            success: true,

            message:
                "Quiz deleted"

        });

    } catch (error) {

        console.error(
            "Quiz delete error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to delete quiz"

        });

    }

};


// ======================================================
// ADD QUESTION
// ======================================================

exports.addQuestion = async (
    req,
    res
) => {

    try {

        const quizId =
            normalizeId(
                req.params.id
            );


        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const questionText =
            String(
                req.body.question_text ||
                ""
            ).trim();


        if (!questionText) {

            return res.status(400).json({

                success: false,

                message:
                    "Question text is required"

            });

        }


        const quiz =
            await Quiz.getQuizById(
                quizId,
                true
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"

            });

        }


        const questionId =
            await Quiz.createQuestion(
                quizId,
                req.body
            );


        return res.status(201).json({

            success: true,

            id:
                questionId,

            message:
                "Question added"

        });

    } catch (error) {

        console.error(
            "Quiz addQuestion error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to add question"

        });

    }

};


// ======================================================
// UPDATE QUESTION
// ======================================================

exports.updateQuestion = async (
    req,
    res
) => {

    try {

        const questionId =
            normalizeId(
                req.params.questionId
            );


        if (!questionId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid question ID"

            });

        }


        const quizId =
            normalizeId(
                req.params.id
            );


        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const quiz =
            await Quiz.getQuizById(
                quizId,
                false
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"

            });

        }


        const question =
            await db.query(
                `
                SELECT id
                FROM quiz_questions

                WHERE
                    id = ?
                    AND quiz_id = ?

                LIMIT 1
                `,
                [
                    questionId,
                    quizId
                ]
            );


        if (!question.length) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found in this quiz"

            });

        }


        await Quiz.updateQuestion(
            questionId,
            req.body
        );


        return res.json({

            success: true,

            message:
                "Question updated"

        });

    } catch (error) {

        console.error(
            "Quiz updateQuestion error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to update question"

        });

    }

};


// ======================================================
// DELETE QUESTION
// ======================================================

exports.removeQuestion = async (
    req,
    res
) => {

    try {

        const questionId =
            normalizeId(
                req.params.questionId
            );


        if (!questionId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid question ID"

            });

        }


        const quizId =
            normalizeId(
                req.params.id
            );


        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const question =
            await db.query(
                `
                SELECT id
                FROM quiz_questions

                WHERE
                    id = ?
                    AND quiz_id = ?

                LIMIT 1
                `,
                [
                    questionId,
                    quizId
                ]
            );


        if (!question.length) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found in this quiz"

            });

        }


        const result =
            await Quiz.deleteQuestion(
                questionId
            );


        if (
            result &&
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found"

            });

        }


        return res.json({

            success: true,

            message:
                "Question deleted"

        });

    } catch (error) {

        console.error(
            "Quiz removeQuestion error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to delete question"

        });

    }

};


// ======================================================
// GET EMAIL RECIPIENTS
// ======================================================

exports.getRecipients = async (
    req,
    res
) => {

    try {

        const mode =
            String(
                req.query.mode ||
                "everyone"
            ).trim();


        const ids =
            String(
                req.query.ids || ""
            )
                .split(",")
                .map((value) =>
                    normalizeId(value)
                )
                .filter(Boolean);


        const search =
            String(
                req.query.search || ""
            ).trim();


        const data =
            await Quiz.getRecipients({

                mode,

                ids,

                search

            });


        return res.json({

            success: true,

            data

        });

    } catch (error) {

        console.error(
            "Quiz getRecipients error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load recipients"

        });

    }

};


// ======================================================
// SEND QUIZ EMAILS
// ======================================================

exports.sendEmails = async (
    req,
    res
) => {

    try {

        const quizId =
            normalizeId(
                req.body.quiz_id
            );


        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Quiz is required"

            });

        }


        const quiz =
            await Quiz.getQuizById(
                quizId,
                false
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz not found"

            });

        }


        if (
            quiz.status !==
            "Active"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Only active quizzes can be emailed"

            });

        }


        const mode =
            String(
                req.body.mode ||
                "everyone"
            ).trim();


        let recipients = [];


        if (
            mode ===
            "custom"
        ) {

            const customRecipients =
                Array.isArray(
                    req.body.recipients
                )
                    ? req.body.recipients
                    : [];


            recipients =
                customRecipients
                    .map(
                        (recipient) => {

                            const email =
                                normalizeEmail(
                                    recipient?.email
                                );


                            return {

                                name:
                                    String(
                                        recipient?.name ||
                                        ""
                                    ).trim(),

                                email

                            };

                        }
                    )
                    .filter(
                        (recipient) =>
                            isValidEmail(
                                recipient.email
                            )
                    );

        } else {

            const ids =
                Array.isArray(
                    req.body.ids
                )
                    ? req.body.ids
                        .map(normalizeId)
                        .filter(Boolean)
                    : [];


            recipients =
                await Quiz.getRecipients({

                    mode,

                    ids

                });

        }


        if (!recipients.length) {

            return res.status(400).json({

                success: false,

                message:
                    "No valid recipients found"

            });

        }


        const uniqueMap =
            new Map();


        for (
            const recipient
            of recipients
        ) {

            const email =
                normalizeEmail(
                    recipient.email
                );


            if (
                !isValidEmail(email)
            ) {

                continue;

            }


            if (
                !uniqueMap.has(email)
            ) {

                uniqueMap.set(
                    email,
                    {
                        ...recipient,
                        email
                    }
                );

            }

        }


        recipients =
            Array.from(
                uniqueMap.values()
            );


        if (!recipients.length) {

            return res.status(400).json({

                success: false,

                message:
                    "No valid recipients found"

            });

        }


        const link =
            `${frontendUrl()}/quiz/${quiz.public_token}`;


        const subject =
            String(
                req.body.subject ||
                `Mi Arcus Training Quiz – ${quiz.name}`
            ).trim();


        const message =
            String(
                req.body.message ||
                `You have been invited to complete the ${quiz.name} training assessment.`
            ).trim();


        let sent = 0;

        let failed = 0;


        for (
            const recipient
            of recipients
        ) {

            try {

                const safeQuizName =
                    String(
                        quiz.name || ""
                    ).replace(
                        /[<>]/g,
                        ""
                    );


                const safeName =
                    String(
                        recipient.name ||
                        "Participant"
                    ).replace(
                        /[<>]/g,
                        ""
                    );


                const safeMessage =
                    message
                        .replace(
                            /</g,
                            "&lt;"
                        )
                        .replace(
                            />/g,
                            "&gt;"
                        )
                        .replace(
                            /\n/g,
                            "<br>"
                        );


                const html = `
                    <div
                        style="
                            font-family:Arial,sans-serif;
                            background:#f4f6fb;
                            padding:32px;
                            color:#243142;
                        "
                    >

                        <div
                            style="
                                max-width:620px;
                                margin:auto;
                                background:#fff;
                                border-radius:18px;
                                overflow:hidden;
                                border:1px solid #e7e4f5;
                            "
                        >

                            <div
                                style="
                                    padding:26px 30px;
                                    background:
                                        linear-gradient(
                                            135deg,
                                            #8d78d4,
                                            #6d57c8
                                        );
                                    color:#fff;
                                "
                            >

                                <div
                                    style="
                                        font-size:13px;
                                        letter-spacing:2px;
                                        opacity:.85;
                                    "
                                >
                                    MI ARCUS TRAINING
                                </div>

                                <h1
                                    style="
                                        margin:8px 0 0;
                                        font-size:25px;
                                    "
                                >
                                    ${safeQuizName}
                                </h1>

                            </div>


                            <div
                                style="
                                    padding:30px;
                                "
                            >

                                <p>
                                    Hello ${safeName},
                                </p>

                                <p>
                                    ${safeMessage}
                                </p>


                                <div
                                    style="
                                        margin:26px 0;
                                        text-align:center;
                                    "
                                >

                                    <a
                                        href="${link}"
                                        style="
                                            display:inline-block;
                                            background:#6d57c8;
                                            color:#fff;
                                            text-decoration:none;
                                            padding:13px 24px;
                                            border-radius:10px;
                                            font-weight:700;
                                        "
                                    >
                                        Start Quiz
                                    </a>

                                </div>


                                <p
                                    style="
                                        font-size:12px;
                                        color:#718096;
                                    "
                                >
                                    This is a reusable shared quiz link.
                                    Completing the quiz does not invalidate
                                    the link for other participants.
                                </p>

                            </div>

                        </div>

                    </div>
                `;


                const text =
                    `${quiz.name}

${message}

Start Quiz:
${link}`;


                const emailResult =
                    await sendGenericEmail({

                        to:
                            recipient.email,

                        subject,

                        html,

                        text

                    });


                await Quiz.createEmailLog({

                    quiz_id:
                        quiz.id,

                    recipient_name:
                        recipient.name ||
                        null,

                    recipient_email:
                        recipient.email,

                    email_type:
                        "quiz_invitation",

                    sent_by:
                        getCurrentUserId(req),

                    status:
                        "Sent",

                    message_id:
                        emailResult?.id ||
                        emailResult?.messageId ||
                        null

                });


                sent++;


            } catch (error) {

                failed++;


                console.error(
                    `Quiz email failed for ${recipient.email}:`,
                    error
                );


                try {

                    await Quiz.createEmailLog({

                        quiz_id:
                            quiz.id,

                        recipient_name:
                            recipient.name ||
                            null,

                        recipient_email:
                            recipient.email,

                        email_type:
                            "quiz_invitation",

                        sent_by:
                            getCurrentUserId(req),

                        status:
                            "Failed",

                        error_message:
                            String(
                                error.message ||
                                error
                            )

                    });

                } catch (
                    logError
                ) {

                    console.error(
                        "Unable to save email failure log:",
                        logError
                    );

                }

            }

        }


        return res.json({

            success: true,

            message:
                `Email processing completed. Sent: ${sent}, Failed: ${failed}`,

            sent,

            failed,

            total:
                recipients.length

        });


    } catch (error) {

        console.error(
            "Quiz sendEmails error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to send quiz emails"

        });

    }

};


// ======================================================
// GET EMAIL LOGS
// ======================================================

exports.getEmailLogs = async (
    req,
    res
) => {

    try {

        const quizId =
            normalizeId(
                req.params.id
            );


        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const rows =
            await Quiz.getEmailLogs(
                quizId
            );


        return res.json({

            success: true,

            data:
                rows

        });

    } catch (error) {

        console.error(
            "Quiz getEmailLogs error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load email history"

        });

    }

};


// ======================================================
// GET EMAIL STATISTICS
// ======================================================

exports.getEmailStats = async (
    req,
    res
) => {

    try {

        const quizId =
            normalizeId(
                req.params.id
            );


        if (!quizId) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid quiz ID"

            });

        }


        const stats =
            await Quiz.getEmailStats(
                quizId
            );


        return res.json({

            success: true,

            data:
                stats

        });

    } catch (error) {

        console.error(
            "Quiz getEmailStats error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load email statistics"

        });

    }

};


// ======================================================
// TRAINING REPORTS
// ======================================================

exports.getReports = async (
    req,
    res
) => {

    try {

        const data =
            await Quiz.getSubmissions(
                req.query
            );


        return res.json({

            success: true,

            data

        });

    } catch (error) {

        console.error(
            "Quiz getReports error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load training report"

        });

    }

};


// ======================================================
// SINGLE TRAINING REPORT
// ======================================================

exports.getReport = async (
    req,
    res
) => {

    try {

        const id =
            normalizeId(
                req.params.id
            );


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid submission ID"

            });

        }


        const data =
            await Quiz.getSubmission(
                id
            );


        if (!data) {

            return res.status(404).json({

                success: false,

                message:
                    "Submission not found"

            });

        }


        return res.json({

            success: true,

            data

        });

    } catch (error) {

        console.error(
            "Quiz getReport error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load submission"

        });

    }

};


// ======================================================
// DELETE TRAINING REPORT
// ======================================================

exports.deleteReport = async (
    req,
    res
) => {

    try {

        const id =
            normalizeId(
                req.params.id
            );


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid submission ID"

            });

        }


        const result =
            await db.query(
                `
                DELETE FROM quiz_submissions

                WHERE id = ?
                `,
                [
                    id
                ]
            );


        if (
            !result ||
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Submission not found"

            });

        }


        return res.json({

            success: true,

            message:
                "Submission deleted"

        });

    } catch (error) {

        console.error(
            "Quiz deleteReport error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to delete submission"

        });

    }

};


// ======================================================
// GET PUBLIC QUIZ
// ======================================================

exports.getPublicQuiz = async (
    req,
    res
) => {

    try {

        const token =
            String(
                req.params.token ||
                ""
            ).trim();


        if (!token) {

            return res.status(400).json({

                success: false,

                message:
                    "Quiz token is required"

            });

        }


        const quiz =
            await Quiz.getQuizByToken(
                token
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz link is invalid or the quiz is inactive"

            });

        }


        return res.json({

            success: true,

            data:
                quiz

        });

    } catch (error) {

        console.error(
            "Quiz getPublicQuiz error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load quiz"

        });

    }

};


// ======================================================
// START PUBLIC QUIZ
// ======================================================

exports.startPublicQuiz = async (
    req,
    res
) => {

    try {

        const token =
            String(
                req.params.token ||
                ""
            ).trim();


        if (!token) {

            return res.status(400).json({

                success: false,

                message:
                    "Quiz token is required"

            });

        }


        const quiz =
            await Quiz.getQuizByToken(
                token
            );


        if (!quiz) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz link is invalid or the quiz is inactive"

            });

        }


        const name =
            String(
                req.body.participant_name ||
                ""
            ).trim();


        const email =
            normalizeEmail(
                req.body.participant_email
            );


        if (
            !name ||
            !email
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name and email are required"

            });

        }


        if (
            !isValidEmail(email)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Enter a valid email address"

            });

        }


        const emailConsent =
            Boolean(
                req.body.email_consent
            );


        const cameraConsent =
            Boolean(
                req.body.camera_consent
            );


        const locationConsent =
            Boolean(
                req.body.location_consent
            );


        if (
            quiz.require_email_consent &&
            !emailConsent
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email consent is required"

            });

        }


        if (
            quiz.require_camera &&
            !cameraConsent
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Camera permission is required"

            });

        }


        if (
            quiz.require_location &&
            !locationConsent
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Location permission is required"

            });

        }


        if (
            Number(
                quiz.attempts_allowed
            ) > 0
        ) {

            const attempts =
                await Quiz.getParticipantAttemptCount(
                    quiz.id,
                    email
                );


            if (
                attempts >=
                Number(
                    quiz.attempts_allowed
                )
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Maximum attempts reached for this email"

                });

            }

        }


        const activeSession =
            await Quiz.getActiveParticipantSession(
                quiz.id,
                email
            );


        if (activeSession) {

            return res.status(409).json({

                success: false,

                message:
                    "You already have an active quiz session",

                session_token:
                    activeSession.session_token,

                submission_id:
                    activeSession.id,

                participant_id:
                    activeSession.participant_id

            });

        }


        const sessionToken =
            crypto.randomBytes(
                32
            ).toString(
                "base64url"
            );


        const participantId =
            `QZ-${new Date().getFullYear()}-${crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase()}`;


        let photoPath = null;


        if (req.file) {

            const originalName =
                String(
                    req.file.originalname ||
                    ""
                ).toLowerCase();


            const ext =
                originalName.endsWith(
                    ".png"
                )
                    ? ".png"
                    : ".jpg";


            const folder =
                path.join(
                    __dirname,
                    "../uploads/quiz"
                );


            fs.mkdirSync(
                folder,
                {
                    recursive: true
                }
            );


            const fileName =
                `${participantId}-${Date.now()}${ext}`;


            const fullPath =
                path.join(
                    folder,
                    fileName
                );


            if (
                req.file.buffer
            ) {

                fs.writeFileSync(
                    fullPath,
                    req.file.buffer
                );

            } else if (
                req.file.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                fs.copyFileSync(
                    req.file.path,
                    fullPath
                );

            }


            photoPath =
                `/uploads/quiz/${fileName}`;

        }


        const maxScore =
            quiz.questions.reduce(
                (
                    total,
                    question
                ) => {

                    return (
                        total +
                        Number(
                            question.points ||
                            0
                        )
                    );

                },
                0
            );


        const result =
            await db.query(
                `
                INSERT INTO quiz_submissions
                (
                    quiz_id,
                    participant_id,
                    participant_name,
                    participant_email,
                    session_token,
                    photo_path,
                    latitude,
                    longitude,
                    location_accuracy,
                    camera_consent,
                    location_consent,
                    email_consent,
                    status,
                    max_score
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [

                    quiz.id,

                    participantId,

                    name,

                    email,

                    sessionToken,

                    photoPath,

                    req.body.latitude ||
                        null,

                    req.body.longitude ||
                        null,

                    req.body.location_accuracy ||
                        null,

                    cameraConsent
                        ? 1
                        : 0,

                    locationConsent
                        ? 1
                        : 0,

                    emailConsent
                        ? 1
                        : 0,

                    "In Progress",

                    maxScore

                ]
            );


        return res.status(201).json({

            success: true,

            session_token:
                sessionToken,

            submission_id:
                result.insertId,

            participant_id:
                participantId,

            quiz

        });

    } catch (error) {

        console.error(
            "Quiz startPublicQuiz error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to start quiz"

        });

    }

};


// ======================================================
// SUBMIT PUBLIC QUIZ
// ======================================================

exports.submitPublicQuiz = async (
    req,
    res
) => {

    try {

        const sessionToken =
            String(
                req.params.sessionToken ||
                ""
            ).trim();


        if (!sessionToken) {

            return res.status(400).json({

                success: false,

                message:
                    "Quiz session token is required"

            });

        }


        // ==================================================
        // GET SESSION
        // ==================================================

        const rows =
            await db.query(
                `
                SELECT
                    s.*,

                    q.name AS quiz_name,

                    q.passing_score,

                    q.time_limit_minutes,

                    q.status AS quiz_status

                FROM quiz_submissions s

                INNER JOIN quizzes q
                    ON q.id = s.quiz_id

                WHERE
                    s.session_token = ?

                LIMIT 1
                `,
                [
                    sessionToken
                ]
            );


        if (
            !rows ||
            !rows.length
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Quiz session not found"

            });

        }


        const submission =
            rows[0];


        // ==================================================
        // ALREADY SUBMITTED
        // ==================================================

        if (
            String(
                submission.status
            ) !==
            "In Progress"
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "This quiz session has already been submitted"

            });

        }


        // ==================================================
        // QUIZ ACTIVE
        // ==================================================

        if (
            String(
                submission.quiz_status
            ) !==
            "Active"
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "This quiz is no longer active"

            });

        }


        // ==================================================
        // TIME LIMIT
        // ==================================================

        if (
            submission.time_limit_minutes !==
                null &&
            submission.time_limit_minutes !==
                undefined &&
            Number(
                submission.time_limit_minutes
            ) > 0
        ) {

            const startedAt =
                new Date(
                    submission.started_at
                ).getTime();


            if (
                Number.isNaN(
                    startedAt
                )
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Invalid quiz start time"

                });

            }


            const elapsed =
                Date.now() -
                startedAt;


            const allowed =
                Number(
                    submission.time_limit_minutes
                ) *
                60 *
                1000;


            if (
                elapsed >
                allowed +
                30000
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Quiz time limit has expired"

                });

            }

        }


        // ==================================================
        // QUESTIONS
        // ==================================================

        const questions =
            await db.query(
                `
                SELECT *
                FROM quiz_questions

                WHERE
                    quiz_id = ?

                ORDER BY
                    sequence_no ASC,
                    id ASC
                `,
                [
                    submission.quiz_id
                ]
            );


        if (
            !questions ||
            !questions.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This quiz has no questions"

            });

        }


        // ==================================================
        // ANSWERS
        // ==================================================

        const answers =
            Array.isArray(
                req.body?.answers
            )
                ? req.body.answers
                : [];


        const answerMap =
            new Map();


        for (
            const item
            of answers
        ) {

            const questionId =
                normalizeId(
                    item?.question_id
                );


            if (!questionId) {
                continue;
            }


            answerMap.set(
                questionId,
                item?.answer
            );

        }


        // ==================================================
        // MANDATORY QUESTIONS
        // ==================================================

        const emptyAnswer = (
            answer
        ) => {

            if (
                answer === null ||
                answer === undefined
            ) {

                return true;

            }


            if (
                Array.isArray(answer)
            ) {

                return (
                    answer.length === 0
                );

            }


            return (
                String(answer)
                    .trim()
                    .length ===
                0
            );

        };


        const mandatoryQuestions = [];


        for (
            const question
            of questions
        ) {

            const mandatoryValue =
                question.is_mandatory ??
                question.is_required ??
                question.required ??
                question.answer_mandatory ??
                0;


            const isMandatory =
                Boolean(
                    Number(
                        mandatoryValue
                    )
                ) ||
                mandatoryValue === true ||
                mandatoryValue === "true";


            if (!isMandatory) {
                continue;
            }


            const answer =
                answerMap.get(
                    Number(
                        question.id
                    )
                );


            if (
                emptyAnswer(
                    answer
                )
            ) {

                mandatoryQuestions.push({

                    question_id:
                        question.id,

                    question:
                        String(
                            question.question_text ||
                            question.question ||
                            `Question ${question.id}`
                        ).trim()

                });

            }

        }


        if (
            mandatoryQuestions.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please answer all mandatory questions before submitting the quiz.",

                missing_required_questions:
                    mandatoryQuestions.map(
                        (item) => ({

                            question_id:
                                item.question_id,

                            question:
                                item.question

                        })
                    )

            });

        }


        // ==================================================
        // SCORE
        // ==================================================

        let score = 0;

        let maxScore = 0;

        const answerResults = [];


        for (
            const question
            of questions
        ) {

            const questionId =
                Number(
                    question.id
                );


            const answer =
                answerMap.get(
                    questionId
                );


            // --------------------------------------------------
            // SCORE QUESTION
            // --------------------------------------------------

            const scoring =
                getQuestionScore(
                    question,
                    answer
                );


            const points =
                Number(
                    scoring?.max ||
                    0
                );


            const awarded =
                Number(
                    scoring?.awarded ||
                    0
                );


            maxScore +=
                points;


            score +=
                awarded;


            // --------------------------------------------------
            // CORRECT
            // --------------------------------------------------

            const correct =
                isCorrect(
                    question,
                    answer
                );


            // --------------------------------------------------
            // SAVE ANSWER
            // --------------------------------------------------

            const answerForDb =
                answer !== undefined &&
                answer !== null
                    ? answer
                    : null;


            await db.query(
                `
                INSERT INTO quiz_submission_answers
                (
                    submission_id,
                    question_id,
                    answer_json,
                    is_correct,
                    points_awarded
                )

                VALUES
                (?, ?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE

                    answer_json =
                        VALUES(answer_json),

                    is_correct =
                        VALUES(is_correct),

                    points_awarded =
                        VALUES(points_awarded)
                `,
                [

                    submission.id,

                    questionId,

                    JSON.stringify(
                        answerForDb
                    ),

                    correct
                        ? 1
                        : 0,

                    awarded

                ]
            );


            answerResults.push({

                question_id:
                    questionId,

                answer:
                    answerForDb,

                is_correct:
                    Boolean(
                        correct
                    ),

                points_awarded:
                    awarded,

                max_points:
                    points

            });

        }


        // ==================================================
        // SCORE PROTECTION
        // ==================================================

        if (
            score < 0
        ) {

            score = 0;

        }


        if (
            maxScore < 0
        ) {

            maxScore = 0;

        }


        if (
            score >
            maxScore
        ) {

            score =
                maxScore;

        }


        // ==================================================
        // PERCENTAGE
        // ==================================================

        const percentage =
            maxScore > 0

                ? (
                    score /
                    maxScore
                ) *
                100

                : 0;


        const finalPercentage =
            Number(
                percentage.toFixed(2)
            );


        // ==================================================
        // PASS / FAIL
        // ==================================================

        const passingScore =
            Number(
                submission.passing_score
            ) || 0;


        const result =
            finalPercentage >=
            passingScore

                ? "Passed"

                : "Failed";


        // ==================================================
        // UPDATE SUBMISSION
        // ==================================================

        const updateResult =
            await db.query(
                `
                UPDATE quiz_submissions

                SET
                    status =
                        'Submitted',

                    score =
                        ?,

                    max_score =
                        ?,

                    percentage =
                        ?,

                    result =
                        ?,

                    submitted_at =
                        NOW()

                WHERE
                    id = ?

                    AND status =
                        'In Progress'
                `,
                [

                    score,

                    maxScore,

                    finalPercentage,

                    result,

                    submission.id

                ]
            );


        if (
            !updateResult ||
            updateResult.affectedRows === 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "Quiz submission could not be completed"

            });

        }


        return res.json({

            success: true,

            message:
                "Quiz submitted successfully",

            participant_id:
                submission.participant_id,

            participant_name:
                submission.participant_name,

            participant_email:
                submission.participant_email,

            quiz_id:
                submission.quiz_id,

            quiz_name:
                submission.quiz_name,

            score:
                score,

            max_score:
                maxScore,

            percentage:
                finalPercentage,

            passing_score:
                passingScore,

            result:
                result,

            total_questions:
                questions.length,

            answered_questions:
                answerMap.size,

            answer_results:
                answerResults

        });

    } catch (error) {

        console.error(
            "Quiz submitPublicQuiz error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to submit quiz"

        });

    }

};


// ======================================================
// EXPORTS
// ======================================================
//
// All controller methods are exported above using
// exports.<method>, so no additional module.exports
// object is required.
// ======================================================