const db = require("../config/db");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ======================================================
// QUIZ MODEL
// ======================================================
// Responsibilities:
// - Quiz CRUD
// - Question CRUD
// - Public reusable quiz links
// - Quiz submissions
// - Submission answers
// - Email recipients
// - Email delivery logs
// ======================================================


// ======================================================
// HELPERS
// ======================================================

const makeToken = () => {
    return crypto.randomBytes(24).toString("base64url");
};

const normalizeId = (value) => {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return id;
};

const normalizeEmail = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase();
};

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const parseJson = (value, fallback = null) => {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        // The MySQL driver auto-decodes JSON columns, so scalar values
        // (e.g. a text/single-choice correct answer like "Tiger") arrive
        // here already decoded as a plain string, not JSON-encoded text.
        // JSON.parse() correctly fails on it — but returning the fallback
        // was wiping the answer out. Return the original value instead so
        // already-decoded strings are preserved.
        return value;
    }
};

const safeNumber = (value, fallback = 0) => {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
};

const safeBoolean = (value, defaultValue = false) => {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return defaultValue;
    }

    if (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    ) {
        return true;
    }

    return false;
};


// ======================================================
// QUESTION SCORING HELPERS
// ======================================================
// The quiz stores:
//
// options_json
// correct_answer_json
// option_scores_json
//
// These values MUST stay synchronized.
//
// Example:
//
// options        = ["Peacock", "Eagle", "Sparrow"]
// correct_answer = "Peacock"
// points         = 1
//
// Automatically:
//
// option_scores  = [1, 0, 0]
//
// This prevents the problem where the correct answer is
// selected but every option has score 0.
// ======================================================

const normalizeQuestionType = (value) => {
    const type = String(
        value || "single_choice"
    ).trim();

    if (
        type === "text" ||
        type === "text_input" ||
        type === "textinput" ||
        type === "automatic_scoring" ||
        type === "text_input_automatic_scoring"
    ) {
        return "text";
    }

    if (
        type === "multiple_choice" ||
        type === "multiple" ||
        type === "checkbox" ||
        type === "checkboxes" ||
        type === "multi_choice"
    ) {
        return "multiple_choice";
    }

    return "single_choice";
};


// ======================================================
// NORMALIZE OPTIONS
// ======================================================

const normalizeQuestionOptions = (value) => {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => {
            if (
                item === null ||
                item === undefined
            ) {
                return "";
            }

            if (
                typeof item === "object"
            ) {
                return String(
                    item.label ??
                    item.value ??
                    item.text ??
                    ""
                ).trim();
            }

            return String(item).trim();
        })
        .filter(Boolean);
};


// ======================================================
// NORMALIZE ANSWER
// ======================================================

const normalizeAnswerValue = (value) => {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    if (Array.isArray(value)) {

        return value
            .map((item) =>
                String(
                    item ?? ""
                )
                    .trim()
                    .toLowerCase()
            )
            .filter(Boolean)
            .sort();
    }

    return String(value)
        .trim()
        .toLowerCase();
};


// ======================================================
// ANSWER EQUALITY
// ======================================================

const answersEqual = (
    actual,
    expected
) => {

    const a =
        normalizeAnswerValue(
            actual
        );

    const b =
        normalizeAnswerValue(
            expected
        );

    if (
        Array.isArray(a) &&
        Array.isArray(b)
    ) {

        if (a.length !== b.length) {
            return false;
        }

        return a.every(
            (value, index) =>
                value === b[index]
        );
    }

    if (
        Array.isArray(a) ||
        Array.isArray(b)
    ) {
        return false;
    }

    return a === b;
};


// ======================================================
// FIND OPTION INDEX
// ======================================================

const findOptionIndex = (
    options,
    answer
) => {

    if (!Array.isArray(options)) {
        return -1;
    }

    const normalizedAnswer =
        normalizeAnswerValue(
            answer
        );

    if (
        Array.isArray(
            normalizedAnswer
        )
    ) {
        return -1;
    }

    return options.findIndex(
        (option, index) => {

            const normalizedOption =
                normalizeAnswerValue(
                    option
                );

            if (
                normalizedOption ===
                normalizedAnswer
            ) {
                return true;
            }

            // Support A / B / C style answers.
            const letter =
                String.fromCharCode(
                    97 + index
                );

            if (
                normalizedAnswer ===
                letter
            ) {
                return true;
            }

            // Support "Option A", "Option B", etc.
            if (
                normalizedAnswer ===
                `option ${letter}`
            ) {
                return true;
            }

            return false;
        }
    );
};


// ======================================================
// GET CORRECT ANSWER
// ======================================================

const getCorrectAnswer = (
    question
) => {

    if (!question) {
        return null;
    }


    // Prefer the JSON column.
    if (
        question.correct_answer_json !==
        undefined &&
        question.correct_answer_json !==
        null
    ) {

        const parsed =
            parseJson(
                question.correct_answer_json,
                null
            );

        if (
            parsed !== null &&
            parsed !== undefined
        ) {

            return parsed;

        }
    }


    // Legacy/fallback column.
    if (
        question.correct_answer !==
        undefined &&
        question.correct_answer !==
        null
    ) {

        return parseJson(
            question.correct_answer,
            question.correct_answer
        );

    }


    return null;
};


// ======================================================
// GET OPTIONS
// ======================================================

const getOptions = (
    question
) => {

    if (!question) {
        return [];
    }


    // Prefer the normal options property when it is
    // already supplied as an array.
    if (
        question.options !==
        undefined &&
        question.options !==
        null
    ) {

        return normalizeQuestionOptions(
            Array.isArray(
                question.options
            )
                ? question.options
                : parseJson(
                    question.options,
                    []
                )
        );

    }


    // Otherwise read the JSON database field.
    if (
        question.options_json !==
        undefined &&
        question.options_json !==
        null
    ) {

        return normalizeQuestionOptions(
            parseJson(
                question.options_json,
                []
            )
        );

    }


    return [];
};


// ======================================================
// GET QUESTION POINTS
// ======================================================

const getQuestionPoints = (
    question
) => {

    const points =
        safeNumber(
            question?.points,
            1
        );

    return Math.max(
        0,
        points
    );
};


// ======================================================
// BUILD OPTION SCORES
// ======================================================
// This is the main fix.
//
// If:
//   points = 1
//   correct = Peacock
//
// then:
//
//   Peacock = 1
//   Eagle   = 0
//   Sparrow = 0
//
// If points = 5:
//
//   Peacock = 5
//   Eagle   = 0
//   Sparrow = 0
//
// For multiple choice, every correct option receives
// an equal share of the available points.
// ======================================================

const buildOptionScores = (
    options,
    correctAnswer,
    points,
    questionType = "single_choice"
) => {

    const cleanOptions =
        normalizeQuestionOptions(
            options
        );

    const maxPoints =
        Math.max(
            0,
            safeNumber(
                points,
                1
            )
        );

    if (!cleanOptions.length) {
        return [];
    }

    const scores =
        cleanOptions.map(
            () => 0
        );

    if (
        correctAnswer === null ||
        correctAnswer === undefined ||
        correctAnswer === ""
    ) {
        return scores;
    }

    // --------------------------------------------------
    // MULTIPLE CHOICE
    // --------------------------------------------------

    if (
        questionType ===
        "multiple_choice"
    ) {

        const correctValues =
            Array.isArray(
                correctAnswer
            )
                ? correctAnswer
                : [correctAnswer];

        const indexes = [];

        for (
            const value
            of correctValues
        ) {

            const index =
                findOptionIndex(
                    cleanOptions,
                    value
                );

            if (
                index >= 0 &&
                !indexes.includes(index)
            ) {
                indexes.push(index);
            }
        }

        if (!indexes.length) {
            return scores;
        }

        const pointsPerOption =
            maxPoints /
            indexes.length;

        indexes.forEach(
            (index) => {
                scores[index] =
                    Number(
                        pointsPerOption.toFixed(
                            4
                        )
                    );
            }
        );

        return scores;
    }

    // --------------------------------------------------
    // SINGLE CHOICE
    // --------------------------------------------------

    const correctIndex =
        findOptionIndex(
            cleanOptions,
            correctAnswer
        );

    if (
        correctIndex >= 0
    ) {
        scores[correctIndex] =
            maxPoints;
    }

    return scores;
};


// ======================================================
// NORMALIZE QUESTION DATA
// ======================================================

const prepareQuestionData = (
    data = {},
    existing = null
) => {

    // --------------------------------------------------
    // QUESTION TYPE
    // --------------------------------------------------

    const questionType =
        normalizeQuestionType(
            data.question_type ??
            existing?.question_type ??
            "single_choice"
        );


    // --------------------------------------------------
    // OPTIONS
    // --------------------------------------------------
    // Accept both:
    //   options
    //   options_json
    //
    // This is important because the frontend may send
    // either the parsed array or the JSON field directly.
    // --------------------------------------------------

    let rawOptions;

    if (
        data.options !== undefined
    ) {

        rawOptions =
            data.options;

    } else if (
        data.options_json !== undefined
    ) {

        rawOptions =
            parseJson(
                data.options_json,
                []
            );

    } else {

        rawOptions =
            existing
                ? getOptions(existing)
                : [];

    }


    const options =
        normalizeQuestionOptions(
            rawOptions
        );


    // --------------------------------------------------
    // CORRECT ANSWER
    // --------------------------------------------------
    // Accept both:
    //   correct_answer
    //   correct_answer_json
    //
    // Never silently fall back to the old answer when
    // the frontend explicitly sends an empty/new value.
    // --------------------------------------------------

    let rawCorrectAnswer;

    const incomingCorrectAnswer =
        data.correct_answer;

    const incomingHasValue =
        incomingCorrectAnswer !== undefined &&
        incomingCorrectAnswer !== null &&
        (Array.isArray(incomingCorrectAnswer)
            ? incomingCorrectAnswer.length > 0
            : String(incomingCorrectAnswer).trim() !== "");

    if (incomingHasValue) {

        rawCorrectAnswer =
            incomingCorrectAnswer;

    } else if (
        data.correct_answer_json !== undefined &&
        data.correct_answer_json !== null &&
        String(data.correct_answer_json).trim() !== ""
    ) {

        rawCorrectAnswer =
            parseJson(
                data.correct_answer_json,
                null
            );

    } else {

        // During an edit, never destroy a previously saved answer just
        // because an older/stale frontend payload omitted it or sent an
        // empty value. The UI validates that a new answer is present, so
        // preserving the existing value here is safe and prevents the
        // answer from disappearing after reopening Edit.
        rawCorrectAnswer =
            existing
                ? getCorrectAnswer(existing)
                : (Array.isArray(incomingCorrectAnswer)
                    ? []
                    : String(incomingCorrectAnswer ?? "").trim());

    }


    // --------------------------------------------------
    // NORMALIZE CORRECT ANSWER
    // --------------------------------------------------

    let correctAnswer =
        rawCorrectAnswer;


    // Handle JSON strings that may arrive inside
    // correct_answer itself.
    if (
        typeof correctAnswer ===
        "string"
    ) {

        const trimmed =
            correctAnswer.trim();

        if (
            trimmed.startsWith("[") ||
            trimmed.startsWith("{") ||
            (
                trimmed.startsWith('"') &&
                trimmed.endsWith('"')
            )
        ) {

            correctAnswer =
                parseJson(
                    trimmed,
                    trimmed
                );

        } else {

            correctAnswer =
                trimmed;

        }
    }


    // --------------------------------------------------
    // MULTIPLE CHOICE NORMALIZATION
    // --------------------------------------------------

    if (
        questionType ===
        "multiple_choice"
    ) {

        if (
            correctAnswer ===
            null ||
            correctAnswer ===
            undefined ||
            correctAnswer === ""
        ) {

            correctAnswer = [];

        } else if (
            !Array.isArray(
                correctAnswer
            )
        ) {

            // Accept comma-separated answers.
            correctAnswer =
                String(
                    correctAnswer
                )
                    .split(",")
                    .map(
                        (item) =>
                            item.trim()
                    )
                    .filter(Boolean);

        }

    }


    // --------------------------------------------------
    // POINTS
    // --------------------------------------------------

    const points =
        Math.max(
            0,
            safeNumber(
                data.points,
                existing?.points ?? 1
            )
        );


    // --------------------------------------------------
    // OPTION SCORES
    // --------------------------------------------------
    // Preserve scores explicitly entered by the quiz creator.
    // For new questions, or older rows that have no score array,
    // calculate the default score from the correct answer.
    // This prevents Edit -> Save from silently changing custom
    // scores back to [1, 0, ...].
    // --------------------------------------------------

    let rawOptionScores;

    if (data.option_scores !== undefined) {
        rawOptionScores = data.option_scores;
    } else if (data.option_scores_json !== undefined) {
        rawOptionScores = parseJson(
            data.option_scores_json,
            null
        );
    } else if (existing) {
        rawOptionScores = parseJson(
            existing.option_scores_json,
            null
        );
    }

    const hasStoredScores =
        Array.isArray(rawOptionScores) &&
        rawOptionScores.length > 0;

    const optionScores = hasStoredScores
        ? Array.from(
              { length: options.length },
              (_, index) => {
                  const score = Number(
                      rawOptionScores[index] ?? 0
                  );

                  return Number.isFinite(score)
                      ? Math.min(5, Math.max(0, score))
                      : 0;
              }
          )
        : buildOptionScores(
              options,
              correctAnswer,
              points,
              questionType
          );


    return {

        questionType,

        options,

        correctAnswer,

        points,

        optionScores

    };
};


// ======================================================
// CHECK ANSWER
// ======================================================

const isAnswerCorrect = (
    question,
    answer
) => {

    if (!question) {
        return false;
    }

    const questionType =
        normalizeQuestionType(
            question.question_type
        );

    const correctAnswer =
        getCorrectAnswer(
            question
        );

    if (
        correctAnswer === null ||
        correctAnswer === undefined
    ) {
        return false;
    }

    // --------------------------------------------------
    // MULTIPLE CHOICE
    // --------------------------------------------------

    if (
        questionType ===
        "multiple_choice"
    ) {

        const actual =
            Array.isArray(answer)
                ? answer
                : [answer];

        const expected =
            Array.isArray(
                correctAnswer
            )
                ? correctAnswer
                : [correctAnswer];

        const normalizedActual =
            actual
                .map((value) =>
                    String(
                        value ?? ""
                    )
                        .trim()
                        .toLowerCase()
                )
                .filter(Boolean)
                .sort();

        const normalizedExpected =
            expected
                .map((value) =>
                    String(
                        value ?? ""
                    )
                        .trim()
                        .toLowerCase()
                )
                .filter(Boolean)
                .sort();

        if (
            normalizedActual.length !==
            normalizedExpected.length
        ) {
            return false;
        }

        return normalizedActual.every(
            (value, index) =>
                value ===
                normalizedExpected[index]
        );
    }

    // --------------------------------------------------
    // SINGLE CHOICE
    // --------------------------------------------------

    const options =
        getOptions(
            question
        );

    const answerIndex =
        findOptionIndex(
            options,
            answer
        );

    const correctIndex =
        findOptionIndex(
            options,
            correctAnswer
        );

    if (
        answerIndex >= 0 &&
        correctIndex >= 0
    ) {
        return (
            answerIndex ===
            correctIndex
        );
    }

    return answersEqual(
        answer,
        correctAnswer
    );
};


// ======================================================
// CALCULATE QUESTION SCORE
// ======================================================

const calculateQuestionScore = (
    question,
    answer
) => {

    const points =
        getQuestionPoints(
            question
        );

    const correct =
        isAnswerCorrect(
            question,
            answer
        );

    if (!correct) {
        return 0;
    }

    return points;
};


// ======================================================
// REPAIR QUESTION OPTION SCORES
// ======================================================
// Repairs existing questions created before the scoring
// fix was added.
//
// Example:
//
// correct_answer = "Peacock"
// points = 1
// option_scores = [0,0,0]
//
// becomes:
//
// option_scores = [1,0,0]
// ======================================================

const repairQuestionOptionScores = async (
    questionId
) => {

    const id =
        normalizeId(
            questionId
        );

    if (!id) {
        return false;
    }

    const rows =
        await db.query(
            `
            SELECT
                id,
                question_type,
                options_json,
                correct_answer_json,
                option_scores_json,
                points
            FROM quiz_questions
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

    if (!rows.length) {
        return false;
    }

    const question =
        rows[0];

    const prepared =
        prepareQuestionData(
            question
        );

    await db.query(
        `
        UPDATE quiz_questions
        SET
            option_scores_json = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
            JSON.stringify(
                prepared.optionScores
            ),
            id
        ]
    );

    return true;
};


// ======================================================
// REPAIR ALL QUESTION SCORES
// ======================================================

const repairAllQuestionOptionScores =
    async () => {

        const questions =
            await db.query(
                `
                SELECT
                    id,
                    question_type,
                    options_json,
                    correct_answer_json,
                    option_scores_json,
                    points
                FROM quiz_questions
                `
            );

        let repaired = 0;

        for (
            const question
            of questions
        ) {

            const prepared =
                prepareQuestionData(
                    question
                );

            const existingScores =
                parseJson(
                    question.option_scores_json,
                    []
                );

            const old =
                JSON.stringify(
                    existingScores
                );

            const next =
                JSON.stringify(
                    prepared.optionScores
                );

            if (old !== next) {

                await db.query(
                    `
                    UPDATE quiz_questions
                    SET
                        option_scores_json = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    `,
                    [
                        next,
                        question.id
                    ]
                );

                repaired += 1;
            }
        }

        return {
            checked:
                questions.length,
            repaired
        };
    };


// ======================================================
// TABLE CREATION
// ======================================================

const createTables = (callback) => {

    const statements = [

        // --------------------------------------------------
        // QUIZZES
        // --------------------------------------------------

        `
        CREATE TABLE IF NOT EXISTS quizzes (
            id INT AUTO_INCREMENT PRIMARY KEY,

            name VARCHAR(255) NOT NULL,

            description TEXT NULL,

            public_token VARCHAR(80) NOT NULL UNIQUE,

            status ENUM('Active','Inactive')
                NOT NULL DEFAULT 'Active',

            passing_score DECIMAL(5,2)
                NOT NULL DEFAULT 70,

            time_limit_minutes INT NULL,

            attempts_allowed INT
                NOT NULL DEFAULT 0,

            require_camera TINYINT(1)
                NOT NULL DEFAULT 1,

            require_location TINYINT(1)
                NOT NULL DEFAULT 1,

            require_email_consent TINYINT(1)
                NOT NULL DEFAULT 1,

            created_by INT NULL,

            created_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_quizzes_status (status),

            INDEX idx_quizzes_created_by (created_by),

            INDEX idx_quizzes_public_token (public_token)

        ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        `,


        // --------------------------------------------------
        // QUESTIONS
        // --------------------------------------------------

        `
        CREATE TABLE IF NOT EXISTS quiz_questions (

            id INT AUTO_INCREMENT PRIMARY KEY,

            quiz_id INT NOT NULL,

            question_text TEXT NOT NULL,

            question_type VARCHAR(40)
                NOT NULL DEFAULT 'single_choice',

            options_json JSON NULL,

            correct_answer_json JSON NULL,

            option_scores_json JSON NULL,

            points DECIMAL(8,2)
                NOT NULL DEFAULT 1,

            is_mandatory TINYINT(1)
                NOT NULL DEFAULT 1,

            sequence_no INT
                NOT NULL DEFAULT 1,

            guideline TEXT NULL,

            image_url VARCHAR(500) NULL,

            video_url VARCHAR(500) NULL,

            created_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

            CONSTRAINT fk_quiz_questions_quiz
                FOREIGN KEY (quiz_id)
                REFERENCES quizzes(id)
                ON DELETE CASCADE,

            INDEX idx_quiz_questions_quiz
                (quiz_id),

            INDEX idx_quiz_questions_sequence
                (quiz_id, sequence_no)

        ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        `,


        // --------------------------------------------------
        // SUBMISSIONS
        // --------------------------------------------------

        `
        CREATE TABLE IF NOT EXISTS quiz_submissions (

            id BIGINT AUTO_INCREMENT PRIMARY KEY,

            quiz_id INT NOT NULL,

            participant_id VARCHAR(40)
                NOT NULL UNIQUE,

            participant_name VARCHAR(255)
                NOT NULL,

            participant_email VARCHAR(255)
                NOT NULL,

            participant_gender ENUM(
                'Male',
                'Female'
            ) NULL,

            session_token VARCHAR(100)
                NOT NULL UNIQUE,

            photo_path VARCHAR(500) NULL,

            photo_captured_at DATETIME NULL,

            latitude DECIMAL(10,7) NULL,

            longitude DECIMAL(10,7) NULL,

            location_accuracy DECIMAL(10,2) NULL,

            camera_consent TINYINT(1)
                NOT NULL DEFAULT 0,

            location_consent TINYINT(1)
                NOT NULL DEFAULT 0,

            email_consent TINYINT(1)
                NOT NULL DEFAULT 0,

            verification_status ENUM(
                'PENDING',
                'APPROVED',
                'REJECTED'
            )
            NOT NULL DEFAULT 'PENDING',

            admin_review_reason TEXT NULL,

            reviewed_by INT NULL,

            reviewed_at DATETIME NULL,

            status ENUM(
                'In Progress',
                'Submitted',
                'Cancelled'
            )
            NOT NULL DEFAULT 'In Progress',

            score DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            max_score DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            percentage DECIMAL(6,2)
                NOT NULL DEFAULT 0,

            result VARCHAR(30) NULL,

            started_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP,

            submitted_at DATETIME NULL,

            created_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_quiz_submissions_quiz
                FOREIGN KEY (quiz_id)
                REFERENCES quizzes(id)
                ON DELETE CASCADE,

            INDEX idx_quiz_submissions_quiz
                (quiz_id),

            INDEX idx_quiz_submissions_email
                (participant_email),

            INDEX idx_quiz_submissions_status
                (status),

            INDEX idx_quiz_submissions_quiz_email
                (quiz_id, participant_email)

        ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        `,


        // --------------------------------------------------
        // SUBMISSION ANSWERS
        // --------------------------------------------------

        `
        CREATE TABLE IF NOT EXISTS quiz_submission_answers (

            id BIGINT AUTO_INCREMENT PRIMARY KEY,

            submission_id BIGINT NOT NULL,

            question_id INT NOT NULL,

            answer_json JSON NULL,

            is_correct TINYINT(1)
                NOT NULL DEFAULT 0,

            points_awarded DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            created_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_quiz_answers_submission
                FOREIGN KEY (submission_id)
                REFERENCES quiz_submissions(id)
                ON DELETE CASCADE,

            CONSTRAINT fk_quiz_answers_question
                FOREIGN KEY (question_id)
                REFERENCES quiz_questions(id)
                ON DELETE CASCADE,

            UNIQUE KEY uq_quiz_submission_question
                (submission_id, question_id),

            INDEX idx_quiz_answers_submission
                (submission_id),

            INDEX idx_quiz_answers_question
                (question_id)

        ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        `,


        // --------------------------------------------------
        // EMAIL LOGS
        // --------------------------------------------------

        `
        CREATE TABLE IF NOT EXISTS quiz_email_logs (

            id BIGINT AUTO_INCREMENT PRIMARY KEY,

            quiz_id INT NOT NULL,

            recipient_name VARCHAR(255) NULL,

            recipient_email VARCHAR(255) NOT NULL,

            email_type VARCHAR(40)
                NOT NULL DEFAULT 'quiz_invitation',

            sent_by INT NULL,

            status ENUM('Sent','Failed')
                NOT NULL,

            message_id VARCHAR(255) NULL,

            error_message TEXT NULL,

            sent_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_quiz_email_logs_quiz
                FOREIGN KEY (quiz_id)
                REFERENCES quizzes(id)
                ON DELETE CASCADE,

            INDEX idx_quiz_email_logs_quiz
                (quiz_id),

            INDEX idx_quiz_email_logs_email
                (recipient_email),

            INDEX idx_quiz_email_logs_sent_at
                (sent_at),

            INDEX idx_quiz_email_logs_quiz_email
                (quiz_id, recipient_email)

        ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        `
    ];


    // --------------------------------------------------
    // SAFE MIGRATIONS
    // --------------------------------------------------

    const migrations = [

        `
        ALTER TABLE quiz_questions
        ADD COLUMN option_scores_json JSON NULL
        AFTER correct_answer_json
        `,

        `
        ALTER TABLE quiz_submissions
        ADD COLUMN photo_captured_at DATETIME NULL
        AFTER photo_path
        `

    ];


    const runMigration = (
        migrationIndex,
        done
    ) => {

        if (
            migrationIndex >=
            migrations.length
        ) {
            return done(null);
        }

        db.query(
            migrations[
                migrationIndex
            ],
            [],
            (error) => {

                if (
                    error &&
                    error.code !==
                    "ER_DUP_FIELDNAME"
                ) {
                    return done(error);
                }

                runMigration(
                    migrationIndex + 1,
                    done
                );
            }
        );
    };


    let index = 0;


    const next = (
        error
    ) => {

        if (error) {
            return callback(error);
        }

        if (
            index >=
            statements.length
        ) {

            return runMigration(
                0,
                async (migrationError) => {

                    if (migrationError) {
                        return callback(
                            migrationError
                        );
                    }

                    try {

                        const repairResult =
                            await repairAllQuestionOptionScores();

                        console.log(
                            "Quiz scoring repair:",
                            repairResult
                        );

                        callback(null);

                    } catch (repairError) {

                        callback(
                            repairError
                        );
                    }
                }
            );
        }

        db.query(
            statements[index++],
            [],
            next
        );
    };


    next();
};


// ======================================================
// GET ALL QUIZZES
// ======================================================

const getQuizzes = async () => {

    const rows =
        await db.query(
            `
            SELECT
                q.*,

                COALESCE(
                    COUNT(DISTINCT qq.id),
                    0
                ) AS question_count,

                COALESCE(
                    COUNT(DISTINCT qs.id),
                    0
                ) AS submission_count

            FROM quizzes q

            LEFT JOIN quiz_questions qq
                ON qq.quiz_id = q.id

            LEFT JOIN quiz_submissions qs
                ON qs.quiz_id = q.id

            GROUP BY q.id

            ORDER BY
                q.updated_at DESC,
                q.id DESC
            `
        );

    return rows;
};


// ======================================================
// GET QUIZ BY ID
// ======================================================

const getQuizById = async (
    id,
    includeAnswers = true
) => {

    const quizId =
        normalizeId(id);

    if (!quizId) {
        return null;
    }

    const rows =
        await db.query(
            `
            SELECT *
            FROM quizzes
            WHERE id = ?
            LIMIT 1
            `,
            [quizId]
        );

    if (!rows.length) {
        return null;
    }

    const quiz =
        rows[0];

    const questions =
        await db.query(
            `
            SELECT
                id,
                quiz_id,
                question_text,
                question_type,
                options_json,
                correct_answer_json,
                option_scores_json,
                points,
                is_mandatory,
                sequence_no,
                guideline,
                image_url,
                video_url

            FROM quiz_questions

            WHERE quiz_id = ?

            ORDER BY
                sequence_no ASC,
                id ASC
            `,
            [quizId]
        );

    quiz.questions =
        questions.map(
            (question) => {

                const prepared =
                    prepareQuestionData(
                        question
                    );

                const item = {
                    ...question,

                    options:
                        prepared.options,

                    option_scores:
                        prepared.optionScores
                };

                if (
                    includeAnswers
                ) {

                    item.correct_answer =
                        prepared.correctAnswer;
                }

                delete item.options_json;

                delete item.correct_answer_json;

                delete item.option_scores_json;

                return item;
            }
        );

    return quiz;
};


// ======================================================
// GET ONE QUESTION
// ======================================================
// Returns the complete persisted question exactly as stored,
// including parsed options, correct answer and option scores.
// This endpoint is intentionally separate from getQuizById()
// so Edit can load one question directly by its ID and never
// depend on stale/incomplete quiz-level state.
// ======================================================

const getQuestionById = async (
    questionId,
    quizId = null,
    includeAnswers = true
) => {

    const normalizedQuestionId =
        normalizeId(questionId);

    if (!normalizedQuestionId) {
        return null;
    }

    const normalizedQuizId =
        quizId === null ||
        quizId === undefined ||
        quizId === ""
            ? null
            : normalizeId(quizId);

    if (
        quizId !== null &&
        quizId !== undefined &&
        quizId !== "" &&
        !normalizedQuizId
    ) {
        return null;
    }

    const rows =
        await db.query(
            `
            SELECT
                id,
                quiz_id,
                question_text,
                question_type,
                options_json,
                correct_answer_json,
                option_scores_json,
                points,
                is_mandatory,
                sequence_no,
                guideline,
                image_url,
                video_url
            FROM quiz_questions
            WHERE id = ?
            ${
                normalizedQuizId
                    ? "AND quiz_id = ?"
                    : ""
            }
            LIMIT 1
            `,
            normalizedQuizId
                ? [
                    normalizedQuestionId,
                    normalizedQuizId
                ]
                : [
                    normalizedQuestionId
                ]
        );

    if (!rows.length) {
        return null;
    }

    const question =
        rows[0];

    const prepared =
        prepareQuestionData(
            question
        );

    const item = {
        ...question,

        // Parsed values used directly by the frontend.
        options:
            prepared.options,

        option_scores:
            prepared.optionScores,

        // Keep the raw persisted JSON values too.
        // This makes Edit compatible with older/newer
        // frontend payload formats without changing storage.
        options_json:
            question.options_json,

        option_scores_json:
            question.option_scores_json
    };

    if (includeAnswers) {

        item.correct_answer =
            prepared.correctAnswer;

        item.correct_answer_json =
            question.correct_answer_json;

    } else {

        delete item.correct_answer_json;

    }

    return item;
};


// ======================================================
// GET PUBLIC QUIZ
// ======================================================
// IMPORTANT:
//
// Public participants NEVER receive
// correct_answer or option_scores.
// ======================================================

const getQuizByToken = async (
    token
) => {

    const cleanToken =
        String(
            token || ""
        ).trim();

    if (!cleanToken) {
        return null;
    }

    const rows =
        await db.query(
            `
            SELECT *
            FROM quizzes

            WHERE public_token = ?

            AND status = 'Active'

            LIMIT 1
            `,
            [cleanToken]
        );

    if (!rows.length) {
        return null;
    }

    const quiz =
        rows[0];

    const questions =
        await db.query(
            `
            SELECT
                id,
                question_text,
                question_type,
                options_json,
                points,
                is_mandatory,
                sequence_no,
                guideline,
                image_url,
                video_url

            FROM quiz_questions

            WHERE quiz_id = ?

            ORDER BY
                sequence_no ASC,
                id ASC
            `,
            [quiz.id]
        );

    quiz.questions =
        questions.map(
            (question) => {

                const options =
                    normalizeQuestionOptions(
                        parseJson(
                            question.options_json,
                            []
                        )
                    );

                return {
                    ...question,

                    options
                };
            }
        );

    return quiz;
};


// ======================================================
// CREATE QUIZ
// ======================================================

const createQuiz = async (
    data = {}
) => {

    const name =
        String(
            data.name || ""
        ).trim();

    if (!name) {
        throw new Error(
            "Quiz name is required"
        );
    }

    let token =
        makeToken();

    let tokenExists =
        true;

    while (tokenExists) {

        const existing =
            await db.query(
                `
                SELECT id
                FROM quizzes
                WHERE public_token = ?
                LIMIT 1
                `,
                [token]
            );

        if (!existing.length) {
            tokenExists = false;
        } else {
            token = makeToken();
        }
    }

    const passingScore =
        Math.min(
            100,
            Math.max(
                0,
                safeNumber(
                    data.passing_score,
                    70
                )
            )
        );

    const attemptsAllowed =
        Math.max(
            0,
            Math.floor(
                safeNumber(
                    data.attempts_allowed,
                    0
                )
            )
        );

    const result =
        await db.query(
            `
            INSERT INTO quizzes
            (
                name,
                description,
                public_token,
                status,
                passing_score,
                time_limit_minutes,
                attempts_allowed,
                require_camera,
                require_location,
                require_email_consent,
                created_by
            )

            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                name,

                data.description
                    ? String(
                        data.description
                    ).trim()
                    : null,

                token,

                data.status ===
                "Inactive"
                    ? "Inactive"
                    : "Active",

                passingScore,

                data.time_limit_minutes
                    ? Math.max(
                        1,
                        Math.floor(
                            safeNumber(
                                data.time_limit_minutes,
                                0
                            )
                        )
                    )
                    : null,

                attemptsAllowed,

                safeBoolean(
                    data.require_camera,
                    true
                )
                    ? 1
                    : 0,

                safeBoolean(
                    data.require_location,
                    true
                )
                    ? 1
                    : 0,

                safeBoolean(
                    data.require_email_consent,
                    true
                )
                    ? 1
                    : 0,

                normalizeId(
                    data.created_by
                )
            ]
        );

    return getQuizById(
        result.insertId,
        true
    );
};


// ======================================================
// UPDATE QUIZ
// ======================================================

const updateQuiz = async (
    id,
    data = {}
) => {

    const quizId =
        normalizeId(id);

    if (!quizId) {
        throw new Error(
            "Invalid quiz ID"
        );
    }

    const existing =
        await getQuizById(
            quizId,
            false
        );

    if (!existing) {
        throw new Error(
            "Quiz not found"
        );
    }

    const name =
        String(
            data.name ??
            existing.name
        ).trim();

    if (!name) {
        throw new Error(
            "Quiz name is required"
        );
    }

    const passingScore =
        Math.min(
            100,
            Math.max(
                0,
                safeNumber(
                    data.passing_score,
                    existing.passing_score
                )
            )
        );

    const attemptsAllowed =
        Math.max(
            0,
            Math.floor(
                safeNumber(
                    data.attempts_allowed,
                    existing.attempts_allowed
                )
            )
        );

    await db.query(
        `
        UPDATE quizzes

        SET
            name = ?,
            description = ?,
            status = ?,
            passing_score = ?,
            time_limit_minutes = ?,
            attempts_allowed = ?,
            require_camera = ?,
            require_location = ?,
            require_email_consent = ?

        WHERE id = ?
        `,
        [
            name,

            data.description !==
            undefined
                ? (
                    data.description
                        ? String(
                            data.description
                        ).trim()
                        : null
                )
                : existing.description,

            data.status ===
            "Inactive"
                ? "Inactive"
                : "Active",

            passingScore,

            data.time_limit_minutes
                ? Math.max(
                    1,
                    Math.floor(
                        safeNumber(
                            data.time_limit_minutes,
                            0
                        )
                    )
                )
                : null,

            attemptsAllowed,

            safeBoolean(
                data.require_camera,
                Boolean(
                    existing.require_camera
                )
            )
                ? 1
                : 0,

            safeBoolean(
                data.require_location,
                Boolean(
                    existing.require_location
                )
            )
                ? 1
                : 0,

            safeBoolean(
                data.require_email_consent,
                Boolean(
                    existing.require_email_consent
                )
            )
                ? 1
                : 0,

            quizId
        ]
    );

    return getQuizById(
        quizId,
        true
    );
};


// ======================================================
// DELETE QUIZ
// ======================================================

const deleteQuiz = async (
    id
) => {

    const quizId =
        normalizeId(id);

    if (!quizId) {
        throw new Error(
            "Invalid quiz ID"
        );
    }

    const result =
        await db.query(
            `
            DELETE FROM quizzes
            WHERE id = ?
            `,
            [quizId]
        );

    return {
        deleted:
            result.affectedRows > 0
    };
};


// ======================================================
// CREATE QUESTION
// ======================================================

const createQuestion = async (
    quizId,
    data = {}
) => {

    const id =
        normalizeId(
            quizId
        );

    if (!id) {
        throw new Error(
            "Invalid quiz ID"
        );
    }

    const quiz =
        await getQuizById(
            id,
            false
        );

    if (!quiz) {
        throw new Error(
            "Quiz not found"
        );
    }

    const questionText =
        String(
            data.question_text || ""
        ).trim();

    if (!questionText) {
        throw new Error(
            "Question text is required"
        );
    }

    const prepared =
        prepareQuestionData(
            data
        );

    let sequenceNo =
        Math.max(
            1,
            Math.floor(
                safeNumber(
                    data.sequence_no,
                    0
                )
            )
        );

    if (!data.sequence_no) {

        const sequenceRows =
            await db.query(
                `
                SELECT
                    COALESCE(
                        MAX(sequence_no),
                        0
                    ) AS max_sequence

                FROM quiz_questions

                WHERE quiz_id = ?
                `,
                [id]
            );

        sequenceNo =
            Number(
                sequenceRows[0]
                    ?.max_sequence || 0
            ) + 1;
    }

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
                option_scores_json,
                points,
                is_mandatory,
                sequence_no,
                guideline,
                image_url,
                video_url
            )

            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                id,

                questionText,

                prepared.questionType,

                JSON.stringify(
                    prepared.options
                ),

                JSON.stringify(
                    prepared.correctAnswer
                ),

                JSON.stringify(
                    prepared.optionScores
                ),

                prepared.points,

                data.is_mandatory ===
                false
                    ? 0
                    : 1,

                sequenceNo,

                data.guideline
                    ? String(
                        data.guideline
                    ).trim()
                    : null,

                data.image_url ||
                    null,

                data.video_url ||
                    null
            ]
        );

    return result.insertId;
};


// ======================================================
// UPDATE QUESTION
// ======================================================

const updateQuestion = async (
    id,
    data = {}
) => {

    const questionId =
        normalizeId(id);

    if (!questionId) {
        throw new Error(
            "Invalid question ID"
        );
    }

    const existingRows =
        await db.query(
            `
            SELECT *
            FROM quiz_questions
            WHERE id = ?
            LIMIT 1
            `,
            [questionId]
        );

    if (!existingRows.length) {
        throw new Error(
            "Question not found"
        );
    }

    const existing =
        existingRows[0];

    const questionText =
        String(
            data.question_text ??
            existing.question_text ??
            ""
        ).trim();

    if (!questionText) {
        throw new Error(
            "Question text is required"
        );
    }

    const prepared =
        prepareQuestionData(
            data,
            existing
        );

    await db.query(
        `
        UPDATE quiz_questions

        SET
            question_text = ?,
            question_type = ?,
            options_json = ?,
            correct_answer_json = ?,
            option_scores_json = ?,
            points = ?,
            is_mandatory = ?,
            sequence_no = ?,
            guideline = ?,
            image_url = ?,
            video_url = ?

        WHERE id = ?
        `,
        [
            questionText,

            prepared.questionType,

            JSON.stringify(
                prepared.options
            ),

            JSON.stringify(
                prepared.correctAnswer
            ),

            JSON.stringify(
                prepared.optionScores
            ),

            prepared.points,

            data.is_mandatory ===
            undefined
                ? existing.is_mandatory
                : data.is_mandatory ===
                  false
                    ? 0
                    : 1,

            Math.max(
                1,
                Math.floor(
                    safeNumber(
                        data.sequence_no,
                        existing.sequence_no
                    )
                )
            ),

            data.guideline !==
            undefined
                ? (
                    data.guideline
                        ? String(
                            data.guideline
                        ).trim()
                        : null
                )
                : existing.guideline,

            data.image_url !==
            undefined
                ? data.image_url ||
                  null
                : existing.image_url,

            data.video_url !==
            undefined
                ? data.video_url ||
                  null
                : existing.video_url,

            questionId
        ]
    );

    return {
        id:
            questionId
    };
};


// ======================================================
// DELETE QUESTION
// ======================================================

const deleteQuestion = async (
    id
) => {

    const questionId =
        normalizeId(id);

    if (!questionId) {
        throw new Error(
            "Invalid question ID"
        );
    }

    const result =
        await db.query(
            `
            DELETE FROM quiz_questions
            WHERE id = ?
            `,
            [questionId]
        );

    return {
        deleted:
            result.affectedRows > 0
    };
};


// ======================================================
// DELETE ALL QUESTIONS
// ======================================================

const deleteAllQuestions =
    async (
        quizId
    ) => {

        const id =
            normalizeId(
                quizId
            );

        if (!id) {
            throw new Error(
                "Invalid quiz ID"
            );
        }

        const result =
            await db.query(
                `
                DELETE FROM quiz_questions
                WHERE quiz_id = ?
                `,
                [id]
            );

        return {
            deleted:
                Number(
                    result.affectedRows ||
                    0
                )
        };
    };


// ======================================================
// BULK CREATE QUESTIONS
// ======================================================

const createQuestionsBulk =
    async (
        quizId,
        questions = []
    ) => {

        const id =
            normalizeId(
                quizId
            );

        if (!id) {
            throw new Error(
                "Invalid quiz ID"
            );
        }

        const quiz =
            await getQuizById(
                id,
                false
            );

        if (!quiz) {
            throw new Error(
                "Quiz not found"
            );
        }

        const rows =
            Array.isArray(
                questions
            )
                ? questions
                : [];

        if (!rows.length) {
            return {
                created: 0
            };
        }

        const sequenceRows =
            await db.query(
                `
                SELECT
                    COALESCE(
                        MAX(sequence_no),
                        0
                    ) AS max_sequence

                FROM quiz_questions

                WHERE quiz_id = ?
                `,
                [id]
            );

        let sequence =
            Number(
                sequenceRows[0]
                    ?.max_sequence || 0
            );

        let created = 0;

        for (
            const data
            of rows
        ) {

            const questionText =
                String(
                    data?.question_text ||
                    ""
                ).trim();

            if (!questionText) {
                continue;
            }

            const prepared =
                prepareQuestionData(
                    data
                );

            sequence += 1;

            await db.query(
                `
                INSERT INTO quiz_questions
                (
                    quiz_id,
                    question_text,
                    question_type,
                    options_json,
                    correct_answer_json,
                    option_scores_json,
                    points,
                    is_mandatory,
                    sequence_no,
                    guideline,
                    image_url,
                    video_url
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    id,

                    questionText,

                    prepared.questionType,

                    JSON.stringify(
                        prepared.options
                    ),

                    JSON.stringify(
                        prepared.correctAnswer
                    ),

                    JSON.stringify(
                        prepared.optionScores
                    ),

                    prepared.points,

                    data.is_mandatory ===
                    false
                        ? 0
                        : 1,

                    sequence,

                    data.guideline
                        ? String(
                            data.guideline
                        ).trim()
                        : null,

                    data.image_url ||
                        null,

                    data.video_url ||
                        null
                ]
            );

            created += 1;
        }

        return {
            created
        };
    };


// ======================================================
// GET EMAIL RECIPIENTS
// ======================================================

const getRecipients = async ({
    mode = "everyone",
    ids = [],
    search = ""
} = {}) => {

    const params = [];

    let sql = `
        SELECT DISTINCT
            u.id,
            u.name,
            u.email,
            u.employee_id,
            u.department_id,
            u.designation_id

        FROM users u

        LEFT JOIN user_stores us
            ON us.user_id = u.id

        WHERE
            u.status = 'Active'

            AND u.email IS NOT NULL

            AND TRIM(u.email) <> ''
    `;

    if (
        mode === "users" &&
        Array.isArray(ids) &&
        ids.length
    ) {

        const cleanIds =
            ids
                .map(normalizeId)
                .filter(Boolean);

        if (cleanIds.length) {

            sql += `
                AND u.id IN (
                    ${cleanIds
                        .map(() => "?")
                        .join(",")}
                )
            `;

            params.push(
                ...cleanIds
            );
        }
    }

    if (
        mode === "departments" &&
        Array.isArray(ids) &&
        ids.length
    ) {

        const cleanIds =
            ids
                .map(normalizeId)
                .filter(Boolean);

        if (cleanIds.length) {

            sql += `
                AND u.department_id IN (
                    ${cleanIds
                        .map(() => "?")
                        .join(",")}
                )
            `;

            params.push(
                ...cleanIds
            );
        }
    }

    if (
        mode === "designations" &&
        Array.isArray(ids) &&
        ids.length
    ) {

        const cleanIds =
            ids
                .map(normalizeId)
                .filter(Boolean);

        if (cleanIds.length) {

            sql += `
                AND u.designation_id IN (
                    ${cleanIds
                        .map(() => "?")
                        .join(",")}
                )
            `;

            params.push(
                ...cleanIds
            );
        }
    }

    if (
        mode === "stores" &&
        Array.isArray(ids) &&
        ids.length
    ) {

        const cleanIds =
            ids
                .map(normalizeId)
                .filter(Boolean);

        if (cleanIds.length) {

            sql += `
                AND us.store_id IN (
                    ${cleanIds
                        .map(() => "?")
                        .join(",")}
                )
            `;

            params.push(
                ...cleanIds
            );
        }
    }

    if (mode === "custom") {
        return [];
    }

    if (search) {

        const searchValue =
            `%${String(
                search
            ).trim()}%`;

        sql += `
            AND (
                u.name LIKE ?
                OR u.email LIKE ?
                OR u.employee_id LIKE ?
            )
        `;

        params.push(
            searchValue,
            searchValue,
            searchValue
        );
    }

    sql += `
        ORDER BY
            u.name ASC
    `;

    const rows =
        await db.query(
            sql,
            params
        );

    return rows.filter(
        (user) =>
            isValidEmail(
                normalizeEmail(
                    user.email
                )
            )
    );
};


// ======================================================
// GET SUBMISSIONS / TRAINING REPORT
// ======================================================

const getSubmissions = async (
    filters = {}
) => {

    const params = [];

    let sql = `
        SELECT
            s.*,
            q.name AS quiz_name

        FROM quiz_submissions s

        INNER JOIN quizzes q
            ON q.id = s.quiz_id

        WHERE 1 = 1
    `;

    const quizId =
        normalizeId(
            filters.quiz_id
        );

    if (quizId) {

        sql += `
            AND s.quiz_id = ?
        `;

        params.push(
            quizId
        );
    }

    if (filters.search) {

        const searchValue =
            `%${String(
                filters.search
            ).trim()}%`;

        sql += `
            AND (
                s.participant_name LIKE ?
                OR s.participant_email LIKE ?
                OR s.participant_id LIKE ?
            )
        `;

        params.push(
            searchValue,
            searchValue,
            searchValue
        );
    }

    if (filters.result) {

        sql += `
            AND s.result = ?
        `;

        params.push(
            filters.result
        );
    }

    if (filters.status) {

        sql += `
            AND s.status = ?
        `;

        params.push(
            filters.status
        );
    }

    if (filters.verification_status) {

        const verificationStatus =
            String(
                filters.verification_status
            ).trim().toUpperCase();

        if (
            [
                "PENDING",
                "APPROVED",
                "REJECTED"
            ].includes(
                verificationStatus
            )
        ) {

            sql += `
                AND s.verification_status = ?
            `;

            params.push(
                verificationStatus
            );

        }
    }

    sql += `
        ORDER BY
            s.submitted_at DESC,
            s.id DESC
    `;

    return db.query(
        sql,
        params
    );
};


// ======================================================
// GET SINGLE SUBMISSION
// ======================================================

const getSubmission = async (
    id
) => {

    const submissionId =
        normalizeId(id);

    if (!submissionId) {
        return null;
    }

    const rows =
        await db.query(
            `
            SELECT
                s.*,
                q.name AS quiz_name,
                q.passing_score

            FROM quiz_submissions s

            INNER JOIN quizzes q
                ON q.id = s.quiz_id

            WHERE s.id = ?

            LIMIT 1
            `,
            [submissionId]
        );

    if (!rows.length) {
        return null;
    }

    // ------------------------------------------------------
    // PARTICIPANT PHOTO FOR CERTIFICATE
    // ------------------------------------------------------
    // Convert the stored verification image to a data URL so
    // the certificate can render the exact captured photo even
    // when it opens in a new browser window.
    let photo_data_url = null;

    const storedPhotoPath = rows[0]?.photo_path;

    if (storedPhotoPath) {
        try {
            const normalizedPath = String(storedPhotoPath)
                .replace(/^[/\\]+/, "");

            const fullPhotoPath = path.join(
                __dirname,
                "..",
                normalizedPath
            );

            if (fs.existsSync(fullPhotoPath)) {
                const extension = path
                    .extname(fullPhotoPath)
                    .toLowerCase();

                const mimeType =
                    extension === ".png"
                        ? "image/png"
                        : extension === ".webp"
                            ? "image/webp"
                            : "image/jpeg";

                const base64 = fs
                    .readFileSync(fullPhotoPath)
                    .toString("base64");

                photo_data_url =
                    `data:${mimeType};base64,${base64}`;
            }
        } catch (photoError) {
            console.warn(
                "Unable to load participant verification photo:",
                photoError?.message || photoError
            );
        }
    }

    const answers =
        await db.query(
            `
            SELECT
                a.*,
                qq.question_text,
                qq.question_type,
                qq.points

            FROM quiz_submission_answers a

            INNER JOIN quiz_questions qq
                ON qq.id = a.question_id

            WHERE
                a.submission_id = ?

            ORDER BY
                qq.sequence_no ASC,
                qq.id ASC
            `,
            [submissionId]
        );

    return {
        ...rows[0],

        photo_data_url,

        answers:
            answers.map(
                (answer) => ({
                    ...answer,

                    answer:
                        parseJson(
                            answer.answer_json,
                            null
                        )
                })
            )
    };
};


// ======================================================
// EMAIL LOG - CREATE
// ======================================================

const createEmailLog =
    async ({
        quiz_id,
        recipient_name = null,
        recipient_email,
        email_type =
            "quiz_invitation",
        sent_by = null,
        status,
        message_id = null,
        error_message = null
    } = {}) => {

        const quizId =
            normalizeId(
                quiz_id
            );

        const email =
            normalizeEmail(
                recipient_email
            );

        if (!quizId) {
            throw new Error(
                "Invalid quiz ID"
            );
        }

        if (!isValidEmail(email)) {
            throw new Error(
                "Invalid recipient email"
            );
        }

        const normalizedStatus =
            status === "Sent"
                ? "Sent"
                : "Failed";

        const result =
            await db.query(
                `
                INSERT INTO quiz_email_logs
                (
                    quiz_id,
                    recipient_name,
                    recipient_email,
                    email_type,
                    sent_by,
                    status,
                    message_id,
                    error_message
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    quizId,

                    recipient_name
                        ? String(
                            recipient_name
                        ).trim()
                        : null,

                    email,

                    email_type ||
                        "quiz_invitation",

                    normalizeId(
                        sent_by
                    ),

                    normalizedStatus,

                    message_id
                        ? String(
                            message_id
                        )
                        : null,

                    error_message
                        ? String(
                            error_message
                        )
                        : null
                ]
            );

        return result.insertId;
    };


// ======================================================
// EMAIL LOGS
// ======================================================

const getEmailLogs = async (
    quizId
) => {

    const id =
        normalizeId(
            quizId
        );

    if (!id) {
        return [];
    }

    return db.query(
        `
        SELECT
            id,
            quiz_id,
            recipient_name,
            recipient_email,
            email_type,
            sent_by,
            status,
            message_id,
            error_message,
            sent_at

        FROM quiz_email_logs

        WHERE quiz_id = ?

        ORDER BY
            sent_at DESC,
            id DESC
        `,
        [id]
    );
};


// ======================================================
// EMAIL STATISTICS
// ======================================================

const getEmailStats = async (
    quizId
) => {

    const id =
        normalizeId(
            quizId
        );

    if (!id) {
        return {
            total: 0,
            sent: 0,
            failed: 0
        };
    }

    const rows =
        await db.query(
            `
            SELECT
                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN status = 'Sent'
                        THEN 1
                        ELSE 0
                    END
                ) AS sent,

                SUM(
                    CASE
                        WHEN status = 'Failed'
                        THEN 1
                        ELSE 0
                    END
                ) AS failed

            FROM quiz_email_logs

            WHERE quiz_id = ?
            `,
            [id]
        );

    const row =
        rows[0] || {};

    return {
        total:
            Number(
                row.total || 0
            ),

        sent:
            Number(
                row.sent || 0
            ),

        failed:
            Number(
                row.failed || 0
            )
    };
};


// ======================================================
// CHECK PARTICIPANT ATTEMPTS
// ======================================================
// Attempts are counted per participant email.
// They are NOT counted per public link.
// ======================================================

const getParticipantAttemptCount =
    async (
        quizId,
        participantEmail
    ) => {

        const id =
            normalizeId(
                quizId
            );

        const email =
            normalizeEmail(
                participantEmail
            );

        if (
            !id ||
            !isValidEmail(
                email
            )
        ) {
            return 0;
        }

        const rows =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total

                FROM quiz_submissions

                WHERE
                    quiz_id = ?

                    AND LOWER(
                        TRIM(
                            participant_email
                        )
                    ) = ?

                    AND status =
                        'Submitted'
                `,
                [
                    id,
                    email
                ]
            );

        return Number(
            rows[0]?.total || 0
        );
    };


// ======================================================
// GET PARTICIPANT ACTIVE SESSION
// ======================================================

const getActiveParticipantSession =
    async (
        quizId,
        participantEmail
    ) => {

        const id =
            normalizeId(
                quizId
            );

        const email =
            normalizeEmail(
                participantEmail
            );

        if (
            !id ||
            !isValidEmail(
                email
            )
        ) {
            return null;
        }

        const rows =
            await db.query(
                `
                SELECT *

                FROM quiz_submissions

                WHERE
                    quiz_id = ?

                    AND LOWER(
                        TRIM(
                            participant_email
                        )
                    ) = ?

                    AND status =
                        'In Progress'

                ORDER BY
                    started_at DESC,
                    id DESC

                LIMIT 1
                `,
                [
                    id,
                    email
                ]
            );

        return rows[0] || null;
    };


// ======================================================
// CHECK PUBLIC QUIZ AVAILABILITY
// ======================================================

const checkPublicQuizAvailability =
    async (
        token
    ) => {

        const quiz =
            await getQuizByToken(
                token
            );

        if (!quiz) {

            return {
                available: false,
                reason:
                    "Quiz not found or inactive"
            };
        }

        return {
            available: true,

            quiz_id:
                quiz.id,

            name:
                quiz.name,

            public_token:
                quiz.public_token,

            status:
                quiz.status
        };
    };


// ======================================================
// GET QUIZ SUMMARY
// ======================================================

const getQuizSummary =
    async (
        quizId
    ) => {

        const id =
            normalizeId(
                quizId
            );

        if (!id) {
            return null;
        }

        const rows =
            await db.query(
                `
                SELECT

                    q.id,

                    q.name,

                    q.public_token,

                    q.status,

                    q.passing_score,

                    q.time_limit_minutes,

                    q.attempts_allowed,

                    q.require_camera,

                    q.require_location,

                    q.require_email_consent,

                    COUNT(
                        DISTINCT qq.id
                    ) AS question_count,

                    COUNT(
                        DISTINCT qs.id
                    ) AS submission_count,

                    COUNT(
                        DISTINCT CASE
                            WHEN qs.result =
                                'Passed'
                            THEN qs.id
                        END
                    ) AS passed_count,

                    COUNT(
                        DISTINCT CASE
                            WHEN qs.result =
                                'Failed'
                            THEN qs.id
                        END
                    ) AS failed_count

                FROM quizzes q

                LEFT JOIN quiz_questions qq
                    ON qq.quiz_id = q.id

                LEFT JOIN quiz_submissions qs
                    ON qs.quiz_id = q.id

                WHERE q.id = ?

                GROUP BY q.id

                LIMIT 1
                `,
                [id]
            );

        return rows[0] || null;
    };


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    // Table setup
    createTables,

    // Quiz
    getQuizzes,
    getQuizById,
    getQuestionById,
    getQuizByToken,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizSummary,
    checkPublicQuizAvailability,

    // Questions
    createQuestion,
    createQuestionsBulk,
    updateQuestion,
    deleteQuestion,
    deleteAllQuestions,

    // Scoring helpers
    buildOptionScores,
    isAnswerCorrect,
    calculateQuestionScore,
    repairQuestionOptionScores,
    repairAllQuestionOptionScores,

    // Recipients
    getRecipients,

    // Submissions
    getSubmissions,
    getSubmission,
    getParticipantAttemptCount,
    getActiveParticipantSession,

    // Email
    createEmailLog,
    getEmailLogs,
    getEmailStats,

    // Helpers
    parseJson,
    normalizeId,
    normalizeEmail,
    isValidEmail
};