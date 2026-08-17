const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const permissionMiddleware = require(
    "../middleware/permissionMiddleware"
);


// ======================================================
// DATABASE
// ======================================================

const db = require(
    "../config/db"
);


// ======================================================
// CONTROLLER
// ======================================================

const quiz = require(
    "../controllers/quizController"
);


// ======================================================
// QUIZ RBAC
// ======================================================

const quizPermission = (level) => {

    return (req, res, next) => {

        const isAdmin =
            req.user?.is_admin === 1 ||
            req.user?.is_admin === true ||
            req.user?.is_admin === "1";


        if (isAdmin) {
            return next();
        }


        return permissionMiddleware(
            "Quiz",
            level
        )(
            req,
            res,
            next
        );

    };

};


// ======================================================
// QUIZ WRITE PERMISSION
// ======================================================

const quizWritePermission = (
    req,
    res,
    next
) => {

    const isAdmin =
        req.user?.is_admin === 1 ||
        req.user?.is_admin === true ||
        req.user?.is_admin === "1";


    if (isAdmin) {
        return next();
    }


    const userId =
        req.user?.id;


    if (!userId) {

        return res.status(401).json({

            success: false,

            message:
                "Unauthorized"

        });

    }


    db.query(

        `
        SELECT permission

        FROM user_permissions

        WHERE
            user_id = ?
            AND module_name = ?

        LIMIT 1
        `,

        [
            userId,
            "Quiz"
        ],

        (
            error,
            rows
        ) => {

            if (error) {

                console.error(
                    "Quiz permission error:",
                    error
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Permission Check Failed"

                });

            }


            const permission =
                rows?.[0]?.permission;


            if (
                [
                    "Add",
                    "Edit",
                    "Full"
                ].includes(
                    permission
                )
            ) {

                return next();

            }


            return res.status(403).json({

                success: false,

                message:
                    "Insufficient Permission"

            });

        }

    );

};


// ======================================================
// PARTICIPANT PHOTO UPLOAD
// ======================================================

const upload = multer({

    storage:
        multer.memoryStorage(),

    limits: {

        fileSize:
            5 * 1024 * 1024

    },

    fileFilter: (
        req,
        file,
        cb
    ) => {

        const allowed = [

            "image/jpeg",
            "image/png",
            "image/webp"

        ];


        if (
            allowed.includes(
                file.mimetype
            )
        ) {

            return cb(
                null,
                true
            );

        }


        return cb(
            new Error(
                "Only JPG, PNG or WEBP images are allowed"
            )
        );

    }

});


// ======================================================
// QUESTION MEDIA UPLOAD FOLDER
// ======================================================

const questionUploadFolder =
    path.join(
        process.cwd(),
        "uploads"
    );


if (
    !fs.existsSync(
        questionUploadFolder
    )
) {

    fs.mkdirSync(
        questionUploadFolder,
        {
            recursive: true
        }
    );

}


// ======================================================
// QUESTION MEDIA STORAGE
// ======================================================

const questionStorage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                questionUploadFolder
            );

        },


        filename: (
            req,
            file,
            cb
        ) => {

            const extension =
                path.extname(
                    file.originalname ||
                    ""
                );


            const safeBase =
                path
                    .basename(
                        file.originalname ||
                        "quiz-media",
                        extension
                    )
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        "-"
                    )
                    .slice(
                        0,
                        60
                    );


            cb(

                null,

                `${Date.now()}-${Math.round(
                    Math.random() * 1000000000
                )}-${safeBase}${extension}`

            );

        }

    });


// ======================================================
// QUESTION MEDIA UPLOAD
// ======================================================

const questionUpload =
    multer({

        storage:
            questionStorage,

        limits: {

            fileSize:
                50 * 1024 * 1024

        },

        fileFilter: (
            req,
            file,
            cb
        ) => {

            const images = [

                "image/jpeg",
                "image/png",
                "image/webp"

            ];


            const videos = [

                "video/mp4",
                "video/webm",
                "video/quicktime",
                "video/x-msvideo",
                "video/mpeg"

            ];


            if (
                images.includes(
                    file.mimetype
                ) ||
                videos.includes(
                    file.mimetype
                )
            ) {

                return cb(
                    null,
                    true
                );

            }


            return cb(

                new Error(
                    "Only JPG, PNG, WEBP, MP4, WEBM, MOV, AVI or MPEG files are allowed"
                )

            );

        }

    });


// ======================================================
// HELPERS
// ======================================================

const normalizeId = (
    value
) => {

    const id =
        Number(value);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        return null;

    }


    return id;

};


// ======================================================
// JSON PARSER
// ======================================================

const parseJson = (
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

        return JSON.parse(
            value
        );

    } catch {

        return fallback;

    }

};


// ======================================================
// QUESTION TYPE
// ======================================================

const normalizeQuestionType = (
    value
) => {

    const type =
        String(
            value ||
            "single_choice"
        )
            .trim()
            .toLowerCase();


    if (
        [
            "multiple_choice",
            "multiple",
            "checkbox",
            "multiple choice"
        ].includes(
            type
        )
    ) {

        return "multiple_choice";

    }


    if (
        [
            "text",
            "text_input",
            "text input",
            "manual"
        ].includes(
            type
        )
    ) {

        return "text";

    }


    return "single_choice";

};


// ======================================================
// PUBLIC BASE URL
// ======================================================

const getPublicBaseUrl = (
    req
) => {

    const configured =
        String(

            process.env.PUBLIC_API_URL ||
            process.env.API_URL ||
            ""

        ).trim();


    if (configured) {

        return configured.replace(
            /\/+$/,
            ""
        );

    }


    return `${req.protocol}://${req.get(
        "host"
    )}`;

};


// ======================================================
// CONVERT ANSWER TO EXACT OPTION
// ======================================================

const convertAnswerToOption = (
    answer,
    options
) => {

    const text =
        String(
            answer ?? ""
        ).trim();


    if (!text) {
        return "";
    }


    // --------------------------------------------------
    // A / B / C / D
    // --------------------------------------------------

    const letter =
        text.match(
            /^([A-D])$/i
        );


    if (letter) {

        const index =
            letter[1]
                .toUpperCase()
                .charCodeAt(0) -
            65;


        return (
            options[index] ||
            text
        );

    }


    // --------------------------------------------------
    // OPTION 1 / OPTION 2 / OPTION 3 / OPTION 4
    // --------------------------------------------------

    const number =
        text.match(
            /^(?:option\s*)?([1-4])$/i
        );


    if (number) {

        const index =
            Number(
                number[1]
            ) - 1;


        return (
            options[index] ||
            text
        );

    }


    // --------------------------------------------------
    // EXACT MATCH
    // --------------------------------------------------

    const exact =
        options.find(
            option =>
                String(
                    option
                )
                    .trim()
                    .toLowerCase() ===
                text.toLowerCase()
        );


    if (exact) {

        return exact;

    }


    // --------------------------------------------------
    // PARTIAL MATCH
    // --------------------------------------------------

    const partial =
        options.find(
            option => {

                const a =
                    String(
                        option
                    )
                        .trim()
                        .toLowerCase();


                const b =
                    text.toLowerCase();


                return (
                    a.includes(b) ||
                    b.includes(a)
                );

            }
        );


    return (
        partial ||
        text
    );

};


// ======================================================
// NORMALIZE CORRECT ANSWER
// ======================================================

const normalizeCorrectAnswer = (
    answer,
    type,
    options
) => {

    if (
        type === "text"
    ) {

        return String(
            answer ?? ""
        ).trim();

    }


    if (
        type === "multiple_choice"
    ) {

        const values =
            Array.isArray(
                answer
            )
                ? answer
                : [answer];


        return values

            .filter(
                value =>
                    value !== null &&
                    value !== undefined &&
                    String(
                        value
                    ).trim()
            )

            .map(
                value =>
                    convertAnswerToOption(
                        value,
                        options
                    )
            )

            .filter(Boolean);

    }


    const value =
        Array.isArray(
            answer
        )
            ? answer[0]
            : answer;


    return convertAnswerToOption(

        value ||
        options[0] ||
        "",

        options

    );

};


// ======================================================
// ROUTE TEST
// ======================================================

router.get(
    "/route-test",
    (
        req,
        res
    ) => {

        return res.json({

            success: true,

            message:
                "Quiz API route is mounted",

            path:
                "/api/quiz"

        });

    }
);


// ======================================================
// ROUTE STATUS
// ======================================================

router.get(
    "/status",
    (
        req,
        res
    ) => {

        return res.json({

            success: true,

            quizRoutesLoaded:
                true,

            route:
                "/api/quiz",

            routeFile:
                "./routes/quizRoutes"

        });

    }
);


// ======================================================
// PUBLIC QUIZ ROUTES
// ======================================================

// GET PUBLIC QUIZ

router.get(

    "/public/:token",

    quiz.getPublicQuiz

);


// START PUBLIC QUIZ

router.post(

    "/public/:token/start",

    upload.single(
        "photo"
    ),

    quiz.startPublicQuiz

);


// SUBMIT PUBLIC QUIZ

router.post(

    "/public/session/:sessionToken/submit",

    quiz.submitPublicQuiz

);


// ======================================================
// INTERNAL QUIZ ROUTES
// ======================================================

// GET ALL QUIZZES

router.get(

    "/",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getAll

);


// GET RECIPIENTS

router.get(

    "/recipients",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getRecipients

);


// GET REPORTS

router.get(

    "/reports",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getReports

);


// GET SINGLE REPORT

router.get(

    "/reports/:id",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getReport

);


// DELETE REPORT

router.delete(

    "/reports/:id",

    authMiddleware,

    quizPermission(
        "Full"
    ),

    quiz.deleteReport

);


// ======================================================
// SEND QUIZ EMAIL
// ======================================================

router.post(

    "/email/send",

    authMiddleware,

    quizPermission(
        "Add"
    ),

    quiz.sendEmails

);


// ======================================================
// EMAIL LOGS
// ======================================================

router.get(

    "/:id/email-logs",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getEmailLogs

);


// ======================================================
// EMAIL STATISTICS
// ======================================================

router.get(

    "/:id/email-stats",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getEmailStats

);


// ======================================================
// DELETE ALL QUIZZES
// ======================================================

router.delete(

    "/bulk/all",

    authMiddleware,

    quizPermission(
        "Full"
    ),

    async (
        req,
        res
    ) => {

        try {

            await db.query(
                `DELETE FROM quiz_submission_answers`
            );


            await db.query(
                `DELETE FROM quiz_submissions`
            );


            try {

                await db.query(
                    `DELETE FROM quiz_email_logs`
                );

            } catch (
                emailError
            ) {

                console.warn(
                    "quiz_email_logs cleanup skipped:",
                    emailError.message
                );

            }


            await db.query(
                `DELETE FROM quiz_questions`
            );


            const result =
                await db.query(
                    `DELETE FROM quizzes`
                );


            return res.json({

                success: true,

                message:
                    "All quizzes deleted successfully",

                deleted_count:
                    Number(
                        result?.affectedRows ||
                        0
                    )

            });

        } catch (
            error
        ) {

            console.error(
                "Quiz bulk delete error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to delete all quizzes"

            });

        }

    }

);


// ======================================================
// AI QUESTION GENERATION
// ======================================================

router.post(

    "/ai/generate-question",

    authMiddleware,

    quizPermission(
        "Add"
    ),

    async (
        req,
        res
    ) => {

        try {

            const topic =
                String(

                    req.body?.topic ||
                    req.body?.question_topic ||
                    req.body?.prompt ||
                    ""

                ).trim();


            const questionType =
                normalizeQuestionType(

                    req.body?.question_type ||
                    req.body?.questionType

                );


            const guideline =
                String(

                    req.body?.guideline ||
                    req.body?.assessment_guidelines ||
                    ""

                ).trim();


            const difficulty =
                String(
                    req.body?.difficulty ||
                    "medium"
                ).trim();


            if (!topic) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Enter a question topic or full text first."

                });

            }


            // --------------------------------------------------
            // GEMINI KEY
            // --------------------------------------------------

            const apiKey =
                String(

                    process.env.GEMINI_API_KEY ||
                    process.env.GOOGLE_GEMINI_API_KEY ||
                    ""

                ).trim();


            if (!apiKey) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Gemini API key is not configured. Add GEMINI_API_KEY to server/.env."

                });

            }


            // --------------------------------------------------
            // GEMINI MODEL
            // --------------------------------------------------

            const model =
                String(

                    process.env.GEMINI_MODEL ||
                    "gemini-2.5-pro"

                ).trim();


            // --------------------------------------------------
            // REQUIRED FORMAT
            // --------------------------------------------------

            let format;


            if (
                questionType ===
                "multiple_choice"
            ) {

                format = {

                    question_text:
                        "Question text",

                    question_type:
                        "multiple_choice",

                    options: [
                        "Option 1",
                        "Option 2",
                        "Option 3",
                        "Option 4"
                    ],

                    option_scores: [
                        0,
                        0,
                        0,
                        0
                    ],

                    correct_answer: [
                        "Option 1"
                    ],

                    points:
                        5,

                    guideline:
                        "Short assessment guideline"

                };

            } else if (
                questionType ===
                "text"
            ) {

                format = {

                    question_text:
                        "Question text",

                    question_type:
                        "text",

                    options: [],

                    option_scores: [],

                    correct_answer:
                        "",

                    points:
                        5,

                    guideline:
                        "Short assessment guideline"

                };

            } else {

                format = {

                    question_text:
                        "Question text",

                    question_type:
                        "single_choice",

                    options: [
                        "Option 1",
                        "Option 2",
                        "Option 3",
                        "Option 4"
                    ],

                    option_scores: [
                        0,
                        0,
                        0,
                        0
                    ],

                    correct_answer:
                        "Option 1",

                    points:
                        5,

                    guideline:
                        "Short assessment guideline"

                };

            }


            // --------------------------------------------------
            // AI PROMPT
            // --------------------------------------------------

            const prompt = `

You are an assessment-question generator for the MI ARCUS ERP quiz system.

Generate exactly ONE high-quality assessment question.

Topic / user input:
${topic}

Question type:
${questionType}

Difficulty:
${difficulty}

Assessment guidelines:
${
    guideline ||
    "Use the response to assess understanding and practical reasoning."
}

Rules:

1. Return ONLY valid JSON.
2. Do not wrap JSON in markdown.
3. Do not add explanations.
4. For single_choice generate exactly 4 options.
5. For multiple_choice generate exactly 4 options.
6. For text questions options must be [].
7. correct_answer MUST use the exact option text.
8. Never return A/B/C/D as correct_answer.
9. Never return 0/1/2/3 as correct_answer.
10. Never return "Option 1" unless that is literally the option text.
11. For multiple_choice every correct_answer value must exactly match an option.
12. points must be between 1 and 5.
13. option_scores must contain one number per option.
14. guideline must be concise.

Required JSON structure:

${JSON.stringify(
    format,
    null,
    2
)}

`;


            // --------------------------------------------------
            // GEMINI ENDPOINT
            // --------------------------------------------------

            const endpoint =

                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
                    model
                )}:generateContent?key=${encodeURIComponent(
                    apiKey
                )}`;


            // --------------------------------------------------
            // CALL GEMINI
            // --------------------------------------------------

            const response =
                await fetch(
                    endpoint,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                contents: [

                                    {

                                        parts: [

                                            {
                                                text:
                                                    prompt
                                            }

                                        ]

                                    }

                                ],

                                generationConfig: {

                                    temperature:
                                        0.7,

                                    responseMimeType:
                                        "application/json"

                                }

                            })

                    }
                );


            const responseText =
                await response.text();


            if (!response.ok) {

                console.error(

                    "Gemini API error:",

                    response.status,

                    responseText

                );


                return res.status(502).json({

                    success: false,

                    message:
                        "AI question generation failed.",

                    details:
                        responseText

                });

            }


            // --------------------------------------------------
            // PARSE GEMINI RESPONSE
            // --------------------------------------------------

            let geminiData;


            try {

                geminiData =
                    JSON.parse(
                        responseText
                    );

            } catch {

                return res.status(502).json({

                    success: false,

                    message:
                        "Invalid response received from Gemini."

                });

            }


            const generatedText =

                geminiData
                    ?.candidates?.[0]
                    ?.content?.parts
                    ?.map(
                        part =>
                            part?.text ||
                            ""
                    )
                    .join("")
                    .trim();


            if (!generatedText) {

                return res.status(502).json({

                    success: false,

                    message:
                        "Gemini returned an empty response."

                });

            }


            // --------------------------------------------------
            // PARSE GENERATED JSON
            // --------------------------------------------------

            let generated;


            try {

                generated =
                    JSON.parse(
                        generatedText
                    );

            } catch {

                const cleaned =
                    generatedText

                        .replace(
                            /^```json\s*/i,
                            ""
                        )

                        .replace(
                            /^```\s*/i,
                            ""
                        )

                        .replace(
                            /\s*```$/i,
                            ""
                        )

                        .trim();


                try {

                    generated =
                        JSON.parse(
                            cleaned
                        );

                } catch {

                    console.error(
                        "Unable to parse Gemini JSON:",
                        generatedText
                    );


                    return res.status(502).json({

                        success: false,

                        message:
                            "AI returned an invalid question format."

                    });

                }

            }


            // --------------------------------------------------
            // NORMALIZE TYPE
            // --------------------------------------------------

            const finalType =
                normalizeQuestionType(

                    generated.question_type ||
                    questionType

                );


            // --------------------------------------------------
            // NORMALIZE OPTIONS
            // --------------------------------------------------

            let options =
                Array.isArray(
                    generated.options
                )

                    ? generated.options

                        .map(
                            item =>
                                String(
                                    item ||
                                    ""
                                ).trim()
                        )

                        .filter(Boolean)

                        .slice(
                            0,
                            4
                        )

                    : [];


            if (
                finalType !==
                "text"
            ) {

                while (
                    options.length <
                    4
                ) {

                    options.push(
                        `Option ${
                            options.length + 1
                        }`
                    );

                }

            } else {

                options = [];

            }


            // --------------------------------------------------
            // NORMALIZE OPTION SCORES
            // --------------------------------------------------

            let optionScores =
                Array.isArray(
                    generated.option_scores
                )
                    ? generated.option_scores
                    : [];


            optionScores =
                options.map(

                    (
                        _,
                        index
                    ) =>

                        Math.min(

                            5,

                            Math.max(

                                0,

                                Number(
                                    optionScores[index] ??
                                    0
                                )

                            )

                        )

                );


            // --------------------------------------------------
            // NORMALIZE CORRECT ANSWER
            // --------------------------------------------------

            const correctAnswer =
                normalizeCorrectAnswer(

                    generated.correct_answer,

                    finalType,

                    options

                );


            // --------------------------------------------------
            // POINTS
            // --------------------------------------------------

            const points =
                Math.min(

                    5,

                    Math.max(

                        1,

                        Number(
                            generated.points ||
                            5
                        )

                    )

                );


            // --------------------------------------------------
            // FINAL QUESTION
            // --------------------------------------------------

            const result = {

                question_text:
                    String(

                        generated.question_text ||
                        generated.question ||
                        topic

                    ).trim(),

                question_type:
                    finalType,

                options,

                option_scores:
                    optionScores,

                correct_answer:
                    correctAnswer,

                points,

                is_mandatory:
                    true,

                guideline:
                    String(

                        generated.guideline ||
                        guideline ||
                        ""

                    ).trim()

            };


            return res.json({

                success: true,

                message:
                    "Question generated successfully.",

                data:
                    result,

                question:
                    result

            });

        } catch (
            error
        ) {

            console.error(
                "AI question generation error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to generate question with AI."

            });

        }

    }

);


// ======================================================
// QUIZ CRUD
// ======================================================

// GET SINGLE QUIZ

router.get(

    "/:id",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getOne

);


// CREATE QUIZ

router.post(

    "/",

    authMiddleware,

    quizPermission(
        "Add"
    ),

    quiz.create

);


// UPDATE QUIZ

router.put(

    "/:id",

    authMiddleware,

    quizPermission(
        "Edit"
    ),

    quiz.update

);


// DELETE QUIZ

router.delete(

    "/:id",

    authMiddleware,

    quizPermission(
        "Full"
    ),

    quiz.remove

);


// ======================================================
// ADD SINGLE QUESTION
// ======================================================

router.post(

    "/:id/questions",

    authMiddleware,

    quizPermission(
        "Add"
    ),

    quiz.addQuestion

);


// ======================================================
// BULK ADD QUESTIONS
// ======================================================

router.post(

    "/:id/questions/bulk",

    authMiddleware,

    quizPermission(
        "Add"
    ),

    async (
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


            // --------------------------------------------------
            // CHECK QUIZ
            // --------------------------------------------------

            const quizData =
                await db.query(

                    `
                    SELECT id

                    FROM quizzes

                    WHERE id = ?

                    LIMIT 1
                    `,

                    [
                        quizId
                    ]

                );


            if (
                !quizData ||
                quizData.length ===
                0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Quiz not found"

                });

            }


            // --------------------------------------------------
            // GET QUESTIONS
            // --------------------------------------------------

            let questions =
                req.body?.questions;


            if (
                typeof questions ===
                "string"
            ) {

                questions =
                    parseJson(
                        questions,
                        []
                    );

            }


            if (
                !Array.isArray(
                    questions
                ) ||
                questions.length ===
                0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "At least one question is required"

                });

            }


            const created = [];


            // ==================================================
            // IMPORTANT:
            // This FOR loop is completely closed before
            // created.length is checked.
            // ==================================================

            for (
                let index = 0;
                index < questions.length;
                index++
            ) {

                const item =
                    questions[index] ||
                    {};


                // --------------------------------------------------
                // QUESTION TEXT
                // --------------------------------------------------

                const questionText =
                    String(

                        item.question_text ||
                        item.question ||
                        item.text ||
                        ""

                    ).trim();


                if (
                    !questionText
                ) {

                    continue;

                }


                // --------------------------------------------------
                // QUESTION TYPE
                // --------------------------------------------------

                const questionType =
                    normalizeQuestionType(

                        item.question_type ||
                        item.questionType ||
                        item.type

                    );


                // --------------------------------------------------
                // OPTIONS
                // --------------------------------------------------

                let options =
                    item.options;


                if (
                    typeof options ===
                    "string"
                ) {

                    options =
                        parseJson(
                            options,
                            []
                        );

                }


                if (
                    !Array.isArray(
                        options
                    )
                ) {

                    options = [];

                }


                options =
                    options

                        .map(
                            option =>
                                String(
                                    option ||
                                    ""
                                ).trim()
                        )

                        .filter(Boolean);


                // --------------------------------------------------
                // CORRECT ANSWER
                // --------------------------------------------------

                let correctAnswer =

                    item.correct_answer !==
                    undefined

                        ? item.correct_answer

                        : item.correctAnswer;


                correctAnswer =
                    normalizeCorrectAnswer(

                        correctAnswer,

                        questionType,

                        options

                    );


                // --------------------------------------------------
                // OPTION SCORES
                // --------------------------------------------------

                let optionScores =

                    item.option_scores ||
                    item.optionScores ||
                    [];


                if (
                    typeof optionScores ===
                    "string"
                ) {

                    optionScores =
                        parseJson(
                            optionScores,
                            []
                        );

                }


                if (
                    !Array.isArray(
                        optionScores
                    )
                ) {

                    optionScores = [];

                }


                // --------------------------------------------------
                // POINTS
                // --------------------------------------------------

                const points =
                    Math.min(

                        5,

                        Math.max(

                            1,

                            Number(
                                item.points ||
                                5
                            )

                        )

                    );


                // --------------------------------------------------
                // MANDATORY
                // --------------------------------------------------

                const mandatory =

                    item.is_mandatory ===
                    false ||

                    item.answer_required ===
                    false

                        ? 0
                        : 1;


                // --------------------------------------------------
                // SEQUENCE
                // --------------------------------------------------

                const sequence =
                    Number(

                        item.sequence_no ||
                        item.sequence ||
                        index + 1

                    );


                // --------------------------------------------------
                // GUIDELINE
                // --------------------------------------------------

                const guideline =
                    String(

                        item.guideline ||
                        item.assessment_guidelines ||
                        ""

                    ).trim();


                // --------------------------------------------------
                // MEDIA
                // --------------------------------------------------

                const imageUrl =

                    item.image_url ||
                    item.imageUrl ||
                    null;


                const videoUrl =

                    item.video_url ||
                    item.videoUrl ||
                    null;


                // --------------------------------------------------
                // INSERT QUESTION
                // --------------------------------------------------

                const result =
                    await db.query(

                        `
                        INSERT INTO quiz_questions
                        (
                            quiz_id,
                            question_text,
                            question_type,
                            options_json,
                            correct_answer_json,
                            points,
                            is_mandatory,
                            sequence_no,
                            guideline,
                            image_url,
                            video_url
                        )

                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `,

                        [

                            quizId,

                            questionText,

                            questionType,

                            JSON.stringify(
                                options
                            ),

                            JSON.stringify(
                                correctAnswer ??
                                null
                            ),

                            points,

                            mandatory,

                            Number.isFinite(
                                sequence
                            )
                                ? sequence
                                : index + 1,

                            guideline ||
                            null,

                            imageUrl,

                            videoUrl

                        ]

                    );


                // --------------------------------------------------
                // STORE CREATED QUESTION
                // --------------------------------------------------

                created.push({

                    id:
                        result.insertId,

                    question_text:
                        questionText,

                    question_type:
                        questionType,

                    correct_answer:
                        correctAnswer,

                    points

                });

            } // END FOR LOOP


            // ==================================================
            // CHECK CREATED QUESTIONS
            // ==================================================

            if (
                created.length ===
                0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No valid questions were supplied."

                });

            }


            // ==================================================
            // SUCCESS
            // ==================================================

            return res.status(201).json({

                success: true,

                message:
                    `${created.length} question(s) added successfully.`,

                count:
                    created.length,

                data:
                    created

            });

        } catch (
            error
        ) {

            console.error(
                "Bulk quiz question error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to add questions"

            });

        }

    }

);


// ======================================================
// DELETE ALL QUESTIONS
// ======================================================

router.delete(

    "/:id/questions/bulk/all",

    authMiddleware,

    quizPermission(
        "Full"
    ),

    async (
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


            const quizRows =
                await db.query(

                    `
                    SELECT id

                    FROM quizzes

                    WHERE id = ?

                    LIMIT 1
                    `,

                    [
                        quizId
                    ]

                );


            if (
                !quizRows ||
                quizRows.length ===
                0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Quiz not found"

                });

            }


            const result =
                await db.query(

                    `
                    DELETE FROM quiz_questions

                    WHERE quiz_id = ?
                    `,

                    [
                        quizId
                    ]

                );


            return res.json({

                success: true,

                message:
                    "All questions deleted successfully.",

                deleted_count:
                    Number(
                        result?.affectedRows ||
                        0
                    )

            });

        } catch (
            error
        ) {

            console.error(
                "Delete all quiz questions error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to delete all questions"

            });

        }

    }

);


// ======================================================
// QUESTION MEDIA UPLOAD
// ======================================================

router.post(

    "/:id/questions/:questionId/upload",

    authMiddleware,

    quizWritePermission,

    questionUpload.fields([

        {
            name:
                "image",

            maxCount:
                1

        },

        {
            name:
                "video",

            maxCount:
                1

        }

    ]),

    async (
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


            if (
                !quizId ||
                !questionId
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid quiz or question ID"

                });

            }


            const rows =
                await db.query(

                    `
                    SELECT
                        id,
                        image_url,
                        video_url

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


            if (
                !rows ||
                rows.length ===
                0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Question not found in this quiz"

                });

            }


            const imageFile =
                req.files?.image?.[0] ||
                null;


            const videoFile =
                req.files?.video?.[0] ||
                null;


            if (
                !imageFile &&
                !videoFile
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please upload an image or video."

                });

            }


            const baseUrl =
                getPublicBaseUrl(
                    req
                );


            const imageUrl =

                imageFile

                    ? `${baseUrl}/uploads/${encodeURIComponent(
                        imageFile.filename
                    )}`

                    : rows[0].image_url ||
                    null;


            const videoUrl =

                videoFile

                    ? `${baseUrl}/uploads/${encodeURIComponent(
                        videoFile.filename
                    )}`

                    : rows[0].video_url ||
                    null;


            await db.query(

                `
                UPDATE quiz_questions

                SET
                    image_url = ?,
                    video_url = ?

                WHERE
                    id = ?
                    AND quiz_id = ?
                `,

                [

                    imageUrl,

                    videoUrl,

                    questionId,

                    quizId

                ]

            );


            return res.json({

                success: true,

                message:
                    "Question media uploaded successfully.",

                image_url:
                    imageUrl,

                video_url:
                    videoUrl

            });

        } catch (
            error
        ) {

            console.error(
                "Question media upload error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to upload question media"

            });

        }

    }

);


// ======================================================
// GET ONE QUESTION
// ======================================================
// IMPORTANT:
// This route is intentionally placed before the PUT/DELETE
// question routes and uses GET, so it does not interfere with
// any existing route.
// ======================================================

router.get(

    "/:id/questions/:questionId",

    authMiddleware,

    quizPermission(
        "View"
    ),

    quiz.getQuestion

);


// ======================================================
// UPDATE QUESTION
// ======================================================

router.put(

    "/:id/questions/:questionId",

    authMiddleware,

    quizPermission(
        "Edit"
    ),

    quiz.updateQuestion

);


// ======================================================
// DELETE QUESTION
// ======================================================

router.delete(

    "/:id/questions/:questionId",

    authMiddleware,

    quizPermission(
        "Full"
    ),

    quiz.removeQuestion

);


// ======================================================
// MULTER ERROR HANDLER
// ======================================================

router.use(

    (
        err,
        req,
        res,
        next
    ) => {

        if (
            err instanceof
            multer.MulterError
        ) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    err.message

            });

        }


        if (

            err?.message ===
            "Only JPG, PNG or WEBP images are allowed"

            ||

            err?.message ===
            "Only JPG, PNG, WEBP, MP4, WEBM, MOV, AVI or MPEG files are allowed"

        ) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    err.message

            });

        }


        return next(
            err
        );

    }

);


// ======================================================
// EXPORT
// ======================================================

module.exports =
    router;