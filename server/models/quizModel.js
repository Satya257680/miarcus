const db = require("../config/db");
const crypto = require("crypto");

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
        return fallback;
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

            INDEX idx_quiz_questions_quiz (quiz_id),

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

            session_token VARCHAR(100)
                NOT NULL UNIQUE,

            photo_path VARCHAR(500) NULL,

            latitude DECIMAL(10,7) NULL,

            longitude DECIMAL(10,7) NULL,

            location_accuracy DECIMAL(10,2) NULL,

            camera_consent TINYINT(1)
                NOT NULL DEFAULT 0,

            location_consent TINYINT(1)
                NOT NULL DEFAULT 0,

            email_consent TINYINT(1)
                NOT NULL DEFAULT 0,

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


    let index = 0;


    const next = (error) => {

        if (error) {
            return callback(error);
        }

        if (index >= statements.length) {
            return callback(null);
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

    const rows = await db.query(`
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
    `);


    return rows;
};


// ======================================================
// GET QUIZ BY ID
// ======================================================

const getQuizById = async (
    id,
    includeAnswers = true
) => {

    const quizId = normalizeId(id);

    if (!quizId) {
        return null;
    }


    const rows = await db.query(
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


    const quiz = rows[0];


    const questions = await db.query(
        `
        SELECT
            id,
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

        FROM quiz_questions

        WHERE quiz_id = ?

        ORDER BY
            sequence_no ASC,
            id ASC
        `,
        [quizId]
    );


    quiz.questions = questions.map((question) => {

        const item = {
            ...question,

            options: parseJson(
                question.options_json,
                []
            )
        };


        if (includeAnswers) {
            item.correct_answer =
                parseJson(
                    question.correct_answer_json,
                    null
                );
        }


        return item;
    });


    delete quiz.options_json;


    if (!includeAnswers) {
        delete quiz.correct_answer_json;
    }


    return quiz;
};


// ======================================================
// GET PUBLIC QUIZ
// ======================================================
// IMPORTANT:
// Same public_token can be used by many participants.
// Completion of one participant DOES NOT invalidate it.
// ======================================================

const getQuizByToken = async (token) => {

    const cleanToken = String(token || "").trim();

    if (!cleanToken) {
        return null;
    }


    const rows = await db.query(
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


    const quiz = rows[0];


    const questions = await db.query(
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


    quiz.questions = questions.map(
        (question) => ({
            ...question,

            options: parseJson(
                question.options_json,
                []
            )
        })
    );


    // Never expose correct answers publicly.
    delete quiz.correct_answer_json;


    return quiz;
};


// ======================================================
// CREATE QUIZ
// ======================================================

const createQuiz = async (data = {}) => {

    const name = String(
        data.name || ""
    ).trim();


    if (!name) {
        throw new Error(
            "Quiz name is required"
        );
    }


    let token = makeToken();


    // Extremely unlikely collision protection.
    let tokenExists = true;


    while (tokenExists) {

        const existing = await db.query(
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


    const result = await db.query(
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
                ? String(data.description).trim()
                : null,

            token,

            data.status === "Inactive"
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

            normalizeId(data.created_by)
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

    const quizId = normalizeId(id);

    if (!quizId) {
        throw new Error(
            "Invalid quiz ID"
        );
    }


    const existing = await getQuizById(
        quizId,
        false
    );


    if (!existing) {
        throw new Error(
            "Quiz not found"
        );
    }


    const name = String(
        data.name ?? existing.name
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

            data.description !== undefined
                ? (
                    data.description
                        ? String(data.description).trim()
                        : null
                )
                : existing.description,

            data.status === "Inactive"
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
                Boolean(existing.require_camera)
            )
                ? 1
                : 0,

            safeBoolean(
                data.require_location,
                Boolean(existing.require_location)
            )
                ? 1
                : 0,

            safeBoolean(
                data.require_email_consent,
                Boolean(existing.require_email_consent)
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

const deleteQuiz = async (id) => {

    const quizId = normalizeId(id);

    if (!quizId) {
        throw new Error(
            "Invalid quiz ID"
        );
    }


    const result = await db.query(
        `
        DELETE FROM quizzes
        WHERE id = ?
        `,
        [quizId]
    );


    return {
        deleted: result.affectedRows > 0
    };
};


// ======================================================
// CREATE QUESTION
// ======================================================

const createQuestion = async (
    quizId,
    data = {}
) => {

    const id = normalizeId(quizId);

    if (!id) {
        throw new Error(
            "Invalid quiz ID"
        );
    }


    const quiz = await getQuizById(
        id,
        false
    );


    if (!quiz) {
        throw new Error(
            "Quiz not found"
        );
    }


    const questionText = String(
        data.question_text || ""
    ).trim();


    if (!questionText) {
        throw new Error(
            "Question text is required"
        );
    }


    const points = Math.max(
        0,
        safeNumber(
            data.points,
            1
        )
    );


    const sequenceNo = Math.max(
        1,
        Math.floor(
            safeNumber(
                data.sequence_no,
                1
            )
        )
    );


    const result = await db.query(
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
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,

            questionText,

            data.question_type ||
                "single_choice",

            JSON.stringify(
                Array.isArray(data.options)
                    ? data.options
                    : []
            ),

            JSON.stringify(
                data.correct_answer ?? null
            ),

            points,

            data.is_mandatory === false
                ? 0
                : 1,

            sequenceNo,

            data.guideline
                ? String(data.guideline).trim()
                : null,

            data.image_url || null,

            data.video_url || null
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


    const existingRows = await db.query(
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


    await db.query(
        `
        UPDATE quiz_questions

        SET
            question_text = ?,
            question_type = ?,
            options_json = ?,
            correct_answer_json = ?,
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

            data.question_type ||
                existing.question_type ||
                "single_choice",

            JSON.stringify(
                Array.isArray(data.options)
                    ? data.options
                    : parseJson(
                        existing.options_json,
                        []
                    )
            ),

            JSON.stringify(
                data.correct_answer !== undefined
                    ? data.correct_answer
                    : parseJson(
                        existing.correct_answer_json,
                        null
                    )
            ),

            Math.max(
                0,
                safeNumber(
                    data.points,
                    existing.points
                )
            ),

            data.is_mandatory === undefined
                ? existing.is_mandatory
                : data.is_mandatory === false
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

            data.guideline !== undefined
                ? (
                    data.guideline
                        ? String(
                            data.guideline
                        ).trim()
                        : null
                )
                : existing.guideline,

            data.image_url !== undefined
                ? data.image_url || null
                : existing.image_url,

            data.video_url !== undefined
                ? data.video_url || null
                : existing.video_url,

            questionId
        ]
    );


    return {
        id: questionId
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


    const result = await db.query(
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

        const cleanIds = ids
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

        const cleanIds = ids
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

        const cleanIds = ids
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

        const cleanIds = ids
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
            `%${String(search).trim()}%`;


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


    const rows = await db.query(
        sql,
        params
    );


    // Remove invalid emails.
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
        normalizeId(filters.quiz_id);


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


    const rows = await db.query(
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


    const answers = await db.query(
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

        answers: answers.map(
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

const createEmailLog = async ({
    quiz_id,
    recipient_name = null,
    recipient_email,
    email_type = "quiz_invitation",
    sent_by = null,
    status,
    message_id = null,
    error_message = null
} = {}) => {

    const quizId =
        normalizeId(quiz_id);


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


    const result = await db.query(
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
        normalizeId(quizId);


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
        normalizeId(quizId);


    if (!id) {
        return {
            total: 0,
            sent: 0,
            failed: 0
        };
    }


    const rows = await db.query(
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
            Number(row.total || 0),

        sent:
            Number(row.sent || 0),

        failed:
            Number(row.failed || 0)
    };
};


// ======================================================
// CHECK PARTICIPANT ATTEMPTS
// ======================================================
// IMPORTANT:
// Attempts are counted per participant email.
// They are NOT counted per public link.
//
// Therefore:
//
// Person A completes link
// Person B can still use same link.
// ======================================================

const getParticipantAttemptCount = async (
    quizId,
    participantEmail
) => {

    const id =
        normalizeId(quizId);


    const email =
        normalizeEmail(
            participantEmail
        );


    if (!id || !isValidEmail(email)) {
        return 0;
    }


    const rows = await db.query(
        `
        SELECT
            COUNT(*) AS total

        FROM quiz_submissions

        WHERE
            quiz_id = ?

            AND LOWER(
                TRIM(participant_email)
            ) = ?

            AND status = 'Submitted'
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

const getActiveParticipantSession = async (
    quizId,
    participantEmail
) => {

    const id =
        normalizeId(quizId);


    const email =
        normalizeEmail(
            participantEmail
        );


    if (!id || !isValidEmail(email)) {
        return null;
    }


    const rows = await db.query(
        `
        SELECT *

        FROM quiz_submissions

        WHERE
            quiz_id = ?

            AND LOWER(
                TRIM(participant_email)
            ) = ?

            AND status = 'In Progress'

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

const checkPublicQuizAvailability = async (
    token
) => {

    const quiz =
        await getQuizByToken(token);


    if (!quiz) {

        return {
            available: false,
            reason: "Quiz not found or inactive"
        };
    }


    return {
        available: true,

        quiz_id: quiz.id,

        name: quiz.name,

        public_token: quiz.public_token,

        status: quiz.status
    };
};


// ======================================================
// GET QUIZ SUMMARY
// ======================================================

const getQuizSummary = async (
    quizId
) => {

    const id =
        normalizeId(quizId);


    if (!id) {
        return null;
    }


    const rows = await db.query(
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
                    WHEN qs.result = 'Passed'
                    THEN qs.id
                END
            ) AS passed_count,

            COUNT(
                DISTINCT CASE
                    WHEN qs.result = 'Failed'
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
    getQuizByToken,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizSummary,
    checkPublicQuizAvailability,

    // Questions
    createQuestion,
    updateQuestion,
    deleteQuestion,

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