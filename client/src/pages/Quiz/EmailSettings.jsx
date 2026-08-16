import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useSearchParams,
} from "react-router-dom";

import axios from "../../axiosConfig";

import {
    FaCheckCircle,
    FaCopy,
    FaEnvelope,
    FaSearch,
    FaUsers,
    FaTimes,
    FaPaperPlane,
    FaLink,
    FaHistory,
    FaExclamationCircle,
    FaSpinner,
    FaUserCheck,
    FaUserPlus,
    FaTrash,
    FaExternalLinkAlt,
    FaShieldAlt,
} from "react-icons/fa";

import "../../styles/pages/Quiz.css";


function EmailSettings() {

    // ============================================================
    // URL PARAMETERS
    // ============================================================

    const [searchParams] =
        useSearchParams();


    const quizIdFromUrl =
        searchParams.get("quizId");


    // ============================================================
    // DATA
    // ============================================================

    const [quizzes, setQuizzes] =
        useState([]);

    const [users, setUsers] =
        useState([]);

    const [logs, setLogs] =
        useState([]);


    // ============================================================
    // FORM
    // ============================================================

    const [selectedQuiz, setSelectedQuiz] =
        useState("");

    const [mode, setMode] =
        useState("everyone");

    const [selectedIds, setSelectedIds] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [subject, setSubject] =
        useState("");

    const [message, setMessage] =
        useState(
            "You have been invited to complete this Mi Arcus training assessment."
        );


    // ============================================================
    // UI STATE
    // ============================================================

    const [loading, setLoading] =
        useState(true);

    const [loadingLogs, setLoadingLogs] =
        useState(false);

    const [sending, setSending] =
        useState(false);

    const [feedback, setFeedback] =
        useState("");

    const [feedbackType, setFeedbackType] =
        useState("success");


    // ============================================================
    // FEEDBACK
    // ============================================================

    const showFeedback = (
        text,
        type = "success"
    ) => {

        setFeedback(text);
        setFeedbackType(type);

    };


    // ============================================================
    // EMAIL VALIDATION
    // ============================================================

    const isValidEmail = (
        email
    ) => {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            String(email || "").trim()
        );

    };


    // ============================================================
    // LOAD QUIZZES + USERS
    // ============================================================

    const load = async () => {

        setLoading(true);

        try {

            const [
                quizResponse,
                usersResponse,
            ] = await Promise.all([

                axios.get(
                    "/api/quiz"
                ),

                axios.get(
                    "/api/quiz/recipients?mode=everyone"
                ),

            ]);


            const quizList =
                quizResponse?.data?.data ||
                [];

            const userList =
                usersResponse?.data?.data ||
                [];


            const normalizedQuizzes =
                Array.isArray(quizList)
                    ? quizList
                    : [];


            const normalizedUsers =
                Array.isArray(userList)
                    ? userList
                    : [];


            setQuizzes(
                normalizedQuizzes
            );

            setUsers(
                normalizedUsers
            );


            // ====================================================
            // IMPORTANT:
            // If Quiz Setup / Take Quiz sends:
            //
            // /quiz/email-settings?quizId=123
            //
            // automatically select quiz 123.
            // ====================================================

            if (
                quizIdFromUrl &&
                normalizedQuizzes.some(
                    quiz =>
                        String(quiz.id) ===
                        String(
                            quizIdFromUrl
                        )
                )
            ) {

                setSelectedQuiz(
                    String(
                        quizIdFromUrl
                    )
                );

            } else if (
                normalizedQuizzes.length > 0
            ) {

                // Only use first quiz when
                // no valid quizId was supplied.

                setSelectedQuiz(
                    previous => {

                        if (
                            previous &&
                            normalizedQuizzes.some(
                                quiz =>
                                    String(
                                        quiz.id
                                    ) ===
                                    String(
                                        previous
                                    )
                            )
                        ) {

                            return previous;

                        }

                        return String(
                            normalizedQuizzes[0].id
                        );

                    }
                );

            }

        } catch (error) {

            showFeedback(
                error?.response?.data?.message ||
                "Unable to load email settings.",
                "error"
            );

        } finally {

            setLoading(false);

        }

    };


    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {

        load();

    }, [quizIdFromUrl]);


    // ============================================================
    // CURRENT QUIZ
    // ============================================================

    const quiz = useMemo(() => {

        return quizzes.find(
            item =>
                String(item.id) ===
                String(selectedQuiz)
        );

    }, [
        quizzes,
        selectedQuiz,
    ]);


    // ============================================================
    // LOAD EMAIL LOGS
    // ============================================================

    const loadLogs = async () => {

        if (!selectedQuiz) {

            setLogs([]);

            return;

        }


        setLoadingLogs(true);

        try {

            const response =
                await axios.get(
                    `/api/quiz/${selectedQuiz}/email-logs`
                );


            const data =
                response?.data?.data ||
                [];


            setLogs(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (error) {

            console.error(
                "Unable to load email logs:",
                error
            );

        } finally {

            setLoadingLogs(false);

        }

    };


    // ============================================================
    // QUIZ SELECTION CHANGE
    // ============================================================

    useEffect(() => {

        if (!selectedQuiz) {

            setLogs([]);

            return;

        }


        loadLogs();


        const currentQuiz =
            quizzes.find(
                quiz =>
                    String(quiz.id) ===
                    String(selectedQuiz)
            );


        if (currentQuiz) {

            setSubject(
                `Mi Arcus Training Quiz – ${currentQuiz.name}`
            );

        }


        // Clear previous employee
        // selections when quiz changes.

        setSelectedIds([]);

        setSearch("");

    }, [
        selectedQuiz,
        quizzes,
    ]);


    // ============================================================
    // FILTER USERS
    // ============================================================

    const filteredUsers = useMemo(() => {

        const query =
            search
                .trim()
                .toLowerCase();


        if (!query) {

            return users;

        }


        return users.filter(
            user => {

                const name =
                    user?.name ||
                    "";

                const email =
                    user?.email ||
                    "";

                const employeeId =
                    user?.employee_id ||
                    "";


                return (
                    `${name} ${email} ${employeeId}`
                        .toLowerCase()
                        .includes(query)
                );

            }
        );

    }, [
        users,
        search,
    ]);


    // ============================================================
    // CUSTOM EMAILS
    // ============================================================

    const customEmails =
        useMemo(() => {

            if (
                mode !==
                "custom"
            ) {

                return [];

            }


            return selectedIds
                .map(
                    email =>
                        String(
                            email
                        ).trim()
                )
                .filter(Boolean);

        }, [
            mode,
            selectedIds,
        ]);


    // ============================================================
    // VALID CUSTOM EMAILS
    // ============================================================

    const validCustomEmails =
        useMemo(() => {

            return customEmails.filter(
                isValidEmail
            );

        }, [
            customEmails,
        ]);


    // ============================================================
    // INVALID CUSTOM EMAILS
    // ============================================================

    const invalidCustomEmails =
        useMemo(() => {

            return customEmails.filter(
                email =>
                    !isValidEmail(
                        email
                    )
            );

        }, [
            customEmails,
        ]);


    // ============================================================
    // RECIPIENT COUNT
    // ============================================================

    const selectedCount =
        useMemo(() => {

            if (
                mode ===
                "everyone"
            ) {

                return users.filter(
                    user =>
                        isValidEmail(
                            user?.email
                        )
                ).length;

            }


            if (
                mode ===
                "users"
            ) {

                return selectedIds.length;

            }


            if (
                mode ===
                "custom"
            ) {

                return validCustomEmails.length;

            }


            return 0;

        }, [
            mode,
            users,
            selectedIds,
            validCustomEmails,
        ]);


    // ============================================================
    // EMAIL STATISTICS
    // ============================================================

    const emailStats =
        useMemo(() => {

            const sent =
                logs.filter(
                    item =>
                        String(
                            item?.status ||
                            ""
                        ).toLowerCase() ===
                        "sent"
                ).length;


            const failed =
                logs.filter(
                    item =>
                        String(
                            item?.status ||
                            ""
                        ).toLowerCase() ===
                        "failed"
                ).length;


            return {

                sent,

                failed,

                total:
                    logs.length,

            };

        }, [
            logs,
        ]);


    // ============================================================
    // TOGGLE EMPLOYEE
    // ============================================================

    const toggleEmployee = (
        id
    ) => {

        setSelectedIds(
            previous => {

                if (
                    previous.includes(
                        id
                    )
                ) {

                    return previous.filter(
                        item =>
                            item !== id
                    );

                }


                return [
                    ...previous,
                    id,
                ];

            }
        );

    };


    // ============================================================
    // SELECT VISIBLE
    // ============================================================

    const selectVisible = () => {

        const visibleIds =
            filteredUsers
                .filter(
                    user =>
                        isValidEmail(
                            user?.email
                        )
                )
                .map(
                    user =>
                        user.id
                );


        setSelectedIds(
            previous =>
                Array.from(
                    new Set([
                        ...previous,
                        ...visibleIds,
                    ])
                )
        );

    };


    // ============================================================
    // CLEAR SELECTION
    // ============================================================

    const clearSelection = () => {

        setSelectedIds([]);

    };


    // ============================================================
    // COPY LINK
    // ============================================================

    const copyLink = async () => {

        if (
            !quiz?.public_token
        ) {

            showFeedback(
                "This quiz does not have a reusable public link.",
                "error"
            );

            return;

        }


        const link =
            `${window.location.origin}/quiz/${quiz.public_token}`;


        try {

            if (
                navigator.clipboard &&
                window.isSecureContext
            ) {

                await navigator.clipboard.writeText(
                    link
                );

            } else {

                const textarea =
                    document.createElement(
                        "textarea"
                    );


                textarea.value =
                    link;

                textarea.style.position =
                    "fixed";

                textarea.style.opacity =
                    "0";


                document.body.appendChild(
                    textarea
                );


                textarea.focus();
                textarea.select();


                document.execCommand(
                    "copy"
                );


                textarea.remove();

            }


            showFeedback(
                "Reusable quiz link copied successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Copy failed:",
                error
            );


            showFeedback(
                "Unable to copy the quiz link.",
                "error"
            );

        }

    };


    // ============================================================
    // OPEN QUIZ
    // ============================================================

    const openQuizLink = () => {

        if (
            !quiz?.public_token
        ) {

            showFeedback(
                "This quiz does not have a public link.",
                "error"
            );

            return;

        }


        const link =
            `${window.location.origin}/quiz/${quiz.public_token}`;


        window.open(
            link,
            "_blank",
            "noopener,noreferrer"
        );

    };


    // ============================================================
    // CUSTOM EMAIL INPUT
    // ============================================================

    const handleCustomEmails = (
        event
    ) => {

        const value =
            event.target.value;


        const emails =
            value
                .split(
                    /[\n,;]+/
                )
                .map(
                    email =>
                        email.trim()
                )
                .filter(Boolean);


        setSelectedIds(
            emails
        );

    };


    // ============================================================
    // VALIDATE SEND
    // ============================================================

    const validateSend = () => {

        if (!selectedQuiz) {

            showFeedback(
                "Please select a quiz first.",
                "error"
            );

            return false;

        }


        if (!quiz) {

            showFeedback(
                "Selected quiz could not be found.",
                "error"
            );

            return false;

        }


        if (
            !quiz.public_token
        ) {

            showFeedback(
                "This quiz does not have a reusable public link.",
                "error"
            );

            return false;

        }


        if (
            !subject.trim()
        ) {

            showFeedback(
                "Please enter an email subject.",
                "error"
            );

            return false;

        }


        if (
            !message.trim()
        ) {

            showFeedback(
                "Please enter an email message.",
                "error"
            );

            return false;

        }


        if (
            mode === "users" &&
            !selectedIds.length
        ) {

            showFeedback(
                "Select at least one employee.",
                "error"
            );

            return false;

        }


        if (
            mode === "custom"
        ) {

            if (
                !customEmails.length
            ) {

                showFeedback(
                    "Enter at least one email address.",
                    "error"
                );

                return false;

            }


            if (
                invalidCustomEmails.length
            ) {

                showFeedback(
                    `Please correct ${invalidCustomEmails.length} invalid email address${invalidCustomEmails.length === 1
                        ? ""
                        : "es"
                    }.`,
                    "error"
                );

                return false;

            }

        }


        if (
            !selectedCount
        ) {

            showFeedback(
                "No valid recipients were found.",
                "error"
            );

            return false;

        }


        return true;

    };


    // ============================================================
    // SEND EMAIL
    // ============================================================

    const send = async () => {

        if (sending) {

            return;

        }


        if (
            !validateSend()
        ) {

            return;

        }


        setSending(true);

        setFeedback("");


        try {

            const payload = {

                quiz_id:
                    Number(
                        selectedQuiz
                    ),

                mode,

                ids:
                    mode ===
                    "users"
                        ? selectedIds
                        : [],

                recipients:
                    mode ===
                    "custom"
                        ? validCustomEmails.map(
                            email => ({
                                email,
                            })
                        )
                        : [],

                subject:
                    subject.trim(),

                message:
                    message.trim(),

            };


            const response =
                await axios.post(
                    "/api/quiz/email/send",
                    payload
                );


            showFeedback(
                response?.data?.message ||
                `Quiz invitation sent to ${selectedCount} recipient${selectedCount === 1
                    ? ""
                    : "s"
                }.`,
                "success"
            );


            await loadLogs();

        } catch (error) {

            showFeedback(
                error?.response?.data
                    ?.message ||
                "Unable to send quiz email.",
                "error"
            );

        } finally {

            setSending(false);

        }

    };


    // ============================================================
    // LOADING SCREEN
    // ============================================================

    if (loading) {

        return (

            <div className="quiz-page">

                <div className="quiz-loading-state">

                    <FaSpinner className="quiz-spin" />

                    <strong>
                        Loading Email Settings
                    </strong>

                    <span>
                        Preparing quizzes and
                        recipients...
                    </span>

                </div>

            </div>

        );

    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="quiz-page">


            {/* ====================================================
                HEADER
            ==================================================== */}

            <div className="quiz-page-header">

                <div>

                    <div className="quiz-eyebrow">
                        COMMUNICATION CENTER
                    </div>

                    <h1>
                        Email Settings
                    </h1>

                    <p>
                        Send one reusable quiz link
                        to everyone, selected
                        employees, or custom
                        recipients.
                    </p>

                </div>


                <div className="quiz-email-summary">

                    <span>

                        <FaCheckCircle />

                        {emailStats.sent}
                        {" "}sent

                    </span>


                    <span>

                        {emailStats.failed}
                        {" "}failed

                    </span>


                    <span>

                        {emailStats.total}
                        {" "}total

                    </span>

                </div>

            </div>


            {/* ====================================================
                FEEDBACK
            ==================================================== */}

            {feedback && (

                <div
                    className={
                        `quiz-toast ${
                            feedbackType ===
                            "error"
                                ? "error"
                                : "success"
                        }`
                    }
                >

                    {feedbackType ===
                    "error" ? (
                        <FaExclamationCircle />
                    ) : (
                        <FaCheckCircle />
                    )}


                    <span>
                        {feedback}
                    </span>


                    <button
                        type="button"
                        onClick={() =>
                            setFeedback("")
                        }
                    >

                        <FaTimes />

                    </button>

                </div>

            )}


            {/* ====================================================
                MAIN
            ==================================================== */}

            <div className="email-layout">


                {/* ==================================================
                    BUILDER
                ================================================== */}

                <section className="quiz-panel email-builder">


                    <div className="quiz-panel-title">

                        <div>

                            <span>
                                Send Assessment
                            </span>

                            <small>
                                The same public quiz
                                link can be reused
                                by every participant.
                            </small>

                        </div>

                        <FaPaperPlane />

                    </div>


                    {/* ================================================
                        QUIZ
                    ================================================= */}

                    <label className="quiz-field">

                        <span>
                            Select Quiz
                        </span>


                        <select
                            value={
                                selectedQuiz
                            }
                            onChange={event =>
                                setSelectedQuiz(
                                    event.target
                                        .value
                                )
                            }
                        >

                            <option value="">
                                Select an assessment
                            </option>


                            {quizzes.map(
                                item => (

                                    <option
                                        key={
                                            item.id
                                        }
                                        value={
                                            item.id
                                        }
                                    >
                                        {
                                            item.name
                                        }
                                    </option>

                                )
                            )}

                        </select>

                    </label>


                    {/* ================================================
                        LINK
                    ================================================= */}

                    {quiz && (

                        <div className="quiz-link-box compact">


                            <div className="quiz-link-icon">

                                <FaLink />

                            </div>


                            <div className="quiz-link-content">

                                <span>
                                    REUSABLE QUIZ LINK
                                </span>


                                <strong>
                                    {
                                        window.location
                                            .origin
                                    }
                                    /quiz/
                                    {
                                        quiz.public_token
                                    }
                                </strong>


                                <small>

                                    This is one reusable
                                    link. Each participant
                                    gets a separate
                                    session when they
                                    start the assessment.

                                </small>

                            </div>


                            <div className="quiz-link-actions">

                                <button
                                    type="button"
                                    onClick={
                                        copyLink
                                    }
                                >

                                    <FaCopy />

                                    Copy

                                </button>


                                <button
                                    type="button"
                                    className="link-open-button"
                                    onClick={
                                        openQuizLink
                                    }
                                >

                                    <FaExternalLinkAlt />

                                </button>

                            </div>

                        </div>

                    )}


                    {/* ================================================
                        RECIPIENT SECTION
                    ================================================= */}

                    <div className="email-section">


                        <div className="email-section-heading">

                            <div>

                                <strong>
                                    Recipients
                                </strong>

                                <span>
                                    Choose who should
                                    receive this
                                    assessment.
                                </span>

                            </div>


                            <div className="recipient-count">

                                <FaUsers />

                                <strong>
                                    {
                                        selectedCount
                                    }
                                </strong>

                                <span>
                                    recipients
                                </span>

                            </div>

                        </div>


                        {/* ============================================
                            MODES
                        ============================================= */}

                        <div className="recipient-mode">


                            <button
                                type="button"
                                className={
                                    mode ===
                                    "everyone"
                                        ? "active"
                                        : ""
                                }
                                onClick={() => {

                                    setMode(
                                        "everyone"
                                    );

                                    setSelectedIds(
                                        []
                                    );

                                }}
                            >

                                <FaUsers />

                                <span>
                                    Everyone
                                </span>

                                <small>
                                    {
                                        users.filter(
                                            user =>
                                                isValidEmail(
                                                    user?.email
                                                )
                                        ).length
                                    }
                                </small>

                            </button>


                            <button
                                type="button"
                                className={
                                    mode ===
                                    "users"
                                        ? "active"
                                        : ""
                                }
                                onClick={() => {

                                    setMode(
                                        "users"
                                    );

                                    setSelectedIds(
                                        []
                                    );

                                }}
                            >

                                <FaUserCheck />

                                <span>
                                    Employees
                                </span>

                                <small>
                                    {users.length}
                                </small>

                            </button>


                            <button
                                type="button"
                                className={
                                    mode ===
                                    "custom"
                                        ? "active"
                                        : ""
                                }
                                onClick={() => {

                                    setMode(
                                        "custom"
                                    );

                                    setSelectedIds(
                                        []
                                    );

                                }}
                            >

                                <FaUserPlus />

                                <span>
                                    Custom
                                </span>

                            </button>

                        </div>

                    </div>


                    {/* ================================================
                        EVERYONE
                    ================================================= */}

                    {mode ===
                        "everyone" && (

                        <div className="everyone-state">

                            <div className="everyone-state-icon">

                                <FaCheckCircle />

                            </div>


                            <div>

                                <strong>
                                    All active employees
                                </strong>

                                <span>

                                    {
                                        users.filter(
                                            user =>
                                                isValidEmail(
                                                    user?.email
                                                )
                                        ).length
                                    }{" "}
                                    valid email
                                    addresses will
                                    receive the same
                                    reusable quiz link.

                                </span>

                            </div>

                        </div>

                    )}


                    {/* ================================================
                        EMPLOYEES
                    ================================================= */}

                    {mode ===
                        "users" && (

                        <div className="employee-selector">


                            <div className="recipient-toolbar">

                                <div className="quiz-search">

                                    <FaSearch />


                                    <input
                                        type="search"
                                        placeholder="Search employees by name, email or ID..."
                                        value={
                                            search
                                        }
                                        onChange={
                                            event =>
                                                setSearch(
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    />


                                    {search && (

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSearch(
                                                    ""
                                                )
                                            }
                                        >

                                            <FaTimes />

                                        </button>

                                    )}

                                </div>


                                <div className="selection-actions">

                                    <button
                                        type="button"
                                        className="quiz-secondary small"
                                        onClick={
                                            selectVisible
                                        }
                                    >

                                        <FaUserCheck />

                                        Select Visible

                                    </button>


                                    <button
                                        type="button"
                                        className="quiz-secondary small"
                                        onClick={
                                            clearSelection
                                        }
                                    >

                                        <FaTrash />

                                        Clear

                                    </button>

                                </div>

                            </div>


                            <div className="recipient-list">

                                {filteredUsers.length ===
                                0 ? (

                                    <div className="quiz-empty">

                                        <FaSearch />

                                        <strong>
                                            No employees
                                            found
                                        </strong>

                                        <span>
                                            Try another
                                            search term.
                                        </span>

                                    </div>

                                ) : (

                                    filteredUsers.map(
                                        user => {

                                            const validEmail =
                                                isValidEmail(
                                                    user?.email
                                                );


                                            const checked =
                                                selectedIds.includes(
                                                    user.id
                                                );


                                            return (

                                                <label
                                                    key={
                                                        user.id
                                                    }
                                                    className={
                                                        `recipient-row ${
                                                            !validEmail
                                                                ? "disabled"
                                                                : ""
                                                        }`
                                                    }
                                                >


                                                    <input
                                                        type="checkbox"
                                                        disabled={
                                                            !validEmail
                                                        }
                                                        checked={
                                                            checked
                                                        }
                                                        onChange={() =>
                                                            toggleEmployee(
                                                                user.id
                                                            )
                                                        }
                                                    />


                                                    <span className="recipient-avatar">

                                                        {(
                                                            user?.name ||
                                                            "U"
                                                        )
                                                            .charAt(
                                                                0
                                                            )
                                                            .toUpperCase()}

                                                    </span>


                                                    <span className="recipient-details">

                                                        <strong>
                                                            {
                                                                user?.name ||
                                                                "Unnamed User"
                                                            }
                                                        </strong>

                                                        <small>
                                                            {
                                                                user?.email ||
                                                                "No email address"
                                                            }
                                                        </small>

                                                    </span>


                                                    {user?.employee_id && (

                                                        <span className="recipient-employee-id">

                                                            {
                                                                user.employee_id
                                                            }

                                                        </span>

                                                    )}


                                                    {!validEmail && (

                                                        <span className="recipient-invalid">

                                                            Invalid email

                                                        </span>

                                                    )}


                                                    {checked && (

                                                        <FaCheckCircle
                                                            className="recipient-selected"
                                                        />

                                                    )}

                                                </label>

                                            );

                                        }
                                    )

                                )}

                            </div>

                        </div>

                    )}


                    {/* ================================================
                        CUSTOM
                    ================================================= */}

                    {mode ===
                        "custom" && (

                        <div className="custom-recipient-box">

                            <label>

                                <span>
                                    Email Addresses
                                </span>


                                <textarea
                                    className="custom-emails"
                                    value={
                                        selectedIds.join(
                                            ", "
                                        )
                                    }
                                    onChange={
                                        handleCustomEmails
                                    }
                                    placeholder={
                                        `name@example.com
another@example.com
third@example.com`
                                    }
                                />

                            </label>


                            <small>
                                Separate addresses
                                with commas,
                                semicolons or new
                                lines.
                            </small>


                            {customEmails.length >
                                0 && (

                                <div className="custom-email-summary">

                                    <span>
                                        {
                                            validCustomEmails.length
                                        }{" "}
                                        valid
                                    </span>


                                    {invalidCustomEmails.length >
                                        0 && (

                                        <span className="invalid">

                                            {
                                                invalidCustomEmails.length
                                            }{" "}
                                            invalid

                                        </span>

                                    )}

                                </div>

                            )}

                        </div>

                    )}


                    {/* ================================================
                        EMAIL CONTENT
                    ================================================= */}

                    <div className="email-content-section">


                        <div className="email-section-heading">

                            <div>

                                <strong>
                                    Email Content
                                </strong>

                                <span>
                                    Customize the
                                    invitation before
                                    sending.
                                </span>

                            </div>

                            <FaEnvelope />

                        </div>


                        <div className="quiz-form-grid email-fields">


                            <label className="full">

                                <span>
                                    Subject
                                </span>


                                <input
                                    value={
                                        subject
                                    }
                                    onChange={
                                        event =>
                                            setSubject(
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                    placeholder="Enter email subject"
                                    maxLength={
                                        180
                                    }
                                />


                                <small>
                                    {
                                        subject.length
                                    }/180
                                </small>

                            </label>


                            <label className="full">

                                <span>
                                    Message
                                </span>


                                <textarea
                                    value={
                                        message
                                    }
                                    onChange={
                                        event =>
                                            setMessage(
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                    placeholder="Write the invitation message..."
                                    rows={
                                        6
                                    }
                                    maxLength={
                                        3000
                                    }
                                />


                                <small>
                                    {
                                        message.length
                                    }/3000
                                </small>

                            </label>

                        </div>

                    </div>


                    {/* ================================================
                        SECURITY NOTICE
                    ================================================= */}

                    {quiz && (

                        <div
                            style={{
                                display:
                                    "flex",
                                alignItems:
                                    "flex-start",
                                gap:
                                    "10px",
                                padding:
                                    "12px 14px",
                                borderRadius:
                                    "10px",
                                background:
                                    "#f8fafc",
                                border:
                                    "1px solid #e2e8f0",
                                color:
                                    "#64748b",
                                fontSize:
                                    "12px",
                                lineHeight:
                                    "1.5",
                                marginTop:
                                    "14px",
                            }}
                        >

                            <FaShieldAlt
                                style={{
                                    marginTop:
                                        "2px",
                                    flexShrink:
                                        0,
                                }}
                            />

                            <span>

                                The email contains
                                the public quiz
                                link. Participant
                                identity, answers,
                                score and verification
                                data are created
                                separately when the
                                participant starts the
                                assessment.

                            </span>

                        </div>

                    )}


                    {/* ================================================
                        SEND FOOTER
                    ================================================= */}

                    <div className="send-footer">


                        <div className="send-recipient-summary">

                            <FaUsers />


                            <div>

                                <strong>
                                    {
                                        selectedCount
                                    }
                                </strong>

                                <span>

                                    recipient
                                    {
                                        selectedCount ===
                                        1
                                            ? ""
                                            : "s"
                                    }{" "}
                                    will receive
                                    this quiz

                                </span>

                            </div>

                        </div>


                        <button
                            type="button"
                            className="quiz-primary"
                            disabled={
                                sending ||
                                !selectedQuiz ||
                                !selectedCount
                            }
                            onClick={
                                send
                            }
                        >

                            {sending ? (

                                <>

                                    <FaSpinner className="quiz-spin" />

                                    Sending...

                                </>

                            ) : (

                                <>

                                    <FaPaperPlane />

                                    Send Quiz Email

                                </>

                            )}

                        </button>

                    </div>

                </section>


                {/* ==================================================
                    EMAIL HISTORY
                ================================================== */}

                <section className="quiz-panel email-history">


                    <div className="quiz-panel-title">

                        <div>

                            <span>
                                Email History
                            </span>

                            <small>
                                Recent delivery
                                activity for this
                                quiz.
                            </small>

                        </div>

                        <FaHistory />

                    </div>


                    {/* ================================================
                        HISTORY SUMMARY
                    ================================================= */}

                    <div className="email-history-summary">

                        <div>

                            <span>
                                Sent
                            </span>

                            <strong>
                                {
                                    emailStats.sent
                                }
                            </strong>

                        </div>


                        <div>

                            <span>
                                Failed
                            </span>

                            <strong>
                                {
                                    emailStats.failed
                                }
                            </strong>

                        </div>


                        <div>

                            <span>
                                Total
                            </span>

                            <strong>
                                {
                                    emailStats.total
                                }
                            </strong>

                        </div>

                    </div>


                    {/* ================================================
                        LOG LOADING
                    ================================================= */}

                    {loadingLogs && (

                        <div className="quiz-empty">

                            <FaSpinner className="quiz-spin" />

                            <span>
                                Loading email history...
                            </span>

                        </div>

                    )}


                    {/* ================================================
                        LOG LIST
                    ================================================= */}

                    {!loadingLogs &&
                        logs.length >
                        0 && (

                        <div className="email-history-list">

                            {logs
                                .slice(
                                    0,
                                    20
                                )
                                .map(
                                    log => {

                                        const status =
                                            String(
                                                log?.status ||
                                                "Unknown"
                                            ).toLowerCase();


                                        const isSent =
                                            status ===
                                            "sent";


                                        const recipientName =
                                            log?.recipient_name ||
                                            "Recipient";


                                        const recipientEmail =
                                            log?.recipient_email ||
                                            "";


                                        return (

                                            <div
                                                className="email-log"
                                                key={
                                                    log.id
                                                }
                                            >

                                                <div
                                                    className={
                                                        `email-log-icon ${status}`
                                                    }
                                                >

                                                    {isSent ? (
                                                        <FaCheckCircle />
                                                    ) : (
                                                        <FaEnvelope />
                                                    )}

                                                </div>


                                                <div className="email-log-details">

                                                    <strong>
                                                        {
                                                            recipientName
                                                        }
                                                    </strong>


                                                    <small>
                                                        {
                                                            recipientEmail
                                                        }
                                                    </small>


                                                    {log?.sent_at && (

                                                        <small>
                                                            {
                                                                log.sent_at
                                                            }
                                                        </small>

                                                    )}

                                                </div>


                                                <span
                                                    className={
                                                        `email-log-status ${status}`
                                                    }
                                                >

                                                    {
                                                        log?.status ||
                                                        "Unknown"
                                                    }

                                                </span>

                                            </div>

                                        );

                                    }
                                )}

                        </div>

                    )}


                    {/* ================================================
                        EMPTY
                    ================================================= */}

                    {!loadingLogs &&
                        logs.length ===
                        0 && (

                        <div className="quiz-empty">

                            <FaHistory />

                            <strong>
                                No email activity
                            </strong>

                            <span>
                                Emails sent for
                                this quiz will
                                appear here.
                            </span>

                        </div>

                    )}

                </section>

            </div>

        </div>

    );

}


export default EmailSettings;