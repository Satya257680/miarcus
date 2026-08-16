import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../axiosConfig";

import {
    FaCopy,
    FaExternalLinkAlt,
    FaLink,
    FaSearch,
    FaShieldAlt,
    FaEnvelope,
    FaCamera,
    FaMapMarkerAlt,
    FaCheckCircle,
    FaClock,
    FaUsers,
    FaQuestionCircle,
    FaTimes,
    FaPaperPlane,
} from "react-icons/fa";

import "../../styles/pages/Quiz.css";


function TakeQuiz() {

    const navigate = useNavigate();

    // ============================================================
    // STATE
    // ============================================================

    const [quizzes, setQuizzes] = useState([]);

    const [search, setSearch] =
        useState("");

    const [message, setMessage] =
        useState("");

    const [loading, setLoading] =
        useState(true);


    // ============================================================
    // LOAD ACTIVE QUIZZES
    // ============================================================

    useEffect(() => {

        let mounted = true;

        const loadQuizzes = async () => {

            setLoading(true);

            try {

                const response =
                    await axios.get("/api/quiz");

                const list =
                    response?.data?.data || [];

                const activeQuizzes =
                    Array.isArray(list)
                        ? list.filter(
                            quiz =>
                                quiz.status ===
                                "Active"
                        )
                        : [];

                if (mounted) {

                    setQuizzes(
                        activeQuizzes
                    );

                }

            } catch (error) {

                if (mounted) {

                    setMessage(
                        error?.response?.data
                            ?.message ||
                        "Unable to load active quizzes."
                    );

                }

            } finally {

                if (mounted) {

                    setLoading(false);

                }

            }

        };


        loadQuizzes();


        return () => {

            mounted = false;

        };

    }, []);


    // ============================================================
    // FILTER
    // ============================================================

    const filtered =
        useMemo(() => {

            const keyword =
                search
                    .trim()
                    .toLowerCase();

            if (!keyword) {

                return quizzes;

            }

            return quizzes.filter(
                quiz =>
                    `${quiz.name || ""} ${
                        quiz.description || ""
                    }`
                        .toLowerCase()
                        .includes(keyword)
            );

        }, [
            quizzes,
            search,
        ]);


    // ============================================================
    // PUBLIC LINK
    // ============================================================

    const getQuizLink = quiz => {

        if (!quiz?.public_token) {

            return "";

        }

        return `${window.location.origin}/quiz/${quiz.public_token}`;

    };


    // ============================================================
    // COPY LINK
    // ============================================================

    const copyLink = async quiz => {

        const publicLink =
            getQuizLink(quiz);

        if (!publicLink) {

            setMessage(
                "This quiz does not have a public link."
            );

            return;

        }


        try {

            await navigator.clipboard.writeText(
                publicLink
            );

            setMessage(
                "Reusable quiz link copied successfully."
            );

        } catch {

            try {

                const textarea =
                    document.createElement(
                        "textarea"
                    );

                textarea.value =
                    publicLink;

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

                setMessage(
                    "Reusable quiz link copied successfully."
                );

            } catch {

                setMessage(
                    "Unable to copy the quiz link."
                );

            }

        }

    };


    // ============================================================
    // SEND BY EMAIL
    // ============================================================

    const sendByEmail = quiz => {

        if (!quiz?.id) {

            setMessage(
                "Unable to identify this quiz."
            );

            return;

        }

        navigate(
            `/quiz/email-settings?quizId=${quiz.id}`
        );

    };


    // ============================================================
    // OPEN QUIZ
    // ============================================================

    const openQuiz = quiz => {

        const publicLink =
            getQuizLink(quiz);

        if (!publicLink) {

            setMessage(
                "This quiz does not have a public link."
            );

            return;

        }

        window.open(
            publicLink,
            "_blank",
            "noopener,noreferrer"
        );

    };


    // ============================================================
    // CLEAR MESSAGE
    // ============================================================

    const clearMessage = () => {

        setMessage("");

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="quiz-page">


            {/* ====================================================
                PAGE HEADER
            ==================================================== */}

            <div className="quiz-page-header">

                <div>

                    <div className="quiz-eyebrow">
                        EMPLOYEE ASSESSMENTS
                    </div>

                    <h1>
                        Take Quiz
                    </h1>

                    <p>
                        Select an active training
                        assessment or share its
                        reusable public link.
                    </p>

                </div>


                <div
                    className="quiz-security-pill"
                >

                    <FaShieldAlt />

                    Secure Assessment Flow

                </div>

            </div>


            {/* ====================================================
                MESSAGE
            ==================================================== */}

            {message && (

                <div className="quiz-toast">

                    <span>
                        {message}
                    </span>

                    <button
                        type="button"
                        onClick={
                            clearMessage
                        }
                    >

                        <FaTimes />

                    </button>

                </div>

            )}


            {/* ====================================================
                SEARCH / TOOLBAR
            ==================================================== */}

            <div className="quiz-toolbar">

                <div className="quiz-search">

                    <FaSearch />

                    <input
                        type="text"
                        placeholder="Search active quizzes..."
                        value={search}
                        onChange={e =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />

                </div>


                <div
                    style={{
                        display:
                            "flex",
                        alignItems:
                            "center",
                        gap: "8px",
                        fontSize:
                            "13px",
                        color:
                            "#64748b",
                        whiteSpace:
                            "nowrap",
                    }}
                >

                    <FaQuestionCircle />

                    {filtered.length} active
                    assessment
                    {filtered.length === 1
                        ? ""
                        : "s"}

                </div>

            </div>


            {/* ====================================================
                LOADING
            ==================================================== */}

            {loading && (

                <div className="quiz-card-grid">

                    <div
                        className="quiz-empty large"
                        style={{
                            gridColumn:
                                "1 / -1",
                        }}
                    >

                        <div
                            className="loading-ring"
                        />

                        <strong>
                            Loading assessments...
                        </strong>

                        <span>
                            Please wait while
                            active quizzes are
                            loaded.
                        </span>

                    </div>

                </div>

            )}


            {/* ====================================================
                EMPTY STATE
            ==================================================== */}

            {!loading &&
                !filtered.length && (

                    <div className="quiz-empty large">

                        <FaQuestionCircle />

                        <h2>
                            No active quizzes found
                        </h2>

                        <p>
                            {search
                                ? "Try another search term."
                                : "There are currently no active training assessments."}
                        </p>

                    </div>

                )}


            {/* ====================================================
                QUIZ CARDS
            ==================================================== */}

            {!loading &&
                filtered.length > 0 && (

                    <div className="quiz-card-grid">

                        {filtered.map(
                            quiz => {

                                const publicLink =
                                    getQuizLink(
                                        quiz
                                    );


                                return (

                                    <article
                                        className="quiz-launch-card"
                                        key={
                                            quiz.id
                                        }
                                    >


                                        {/* =========================
                                            CARD HEADER
                                        ========================= */}

                                        <div className="quiz-launch-top">

                                            <span className="quiz-status active">

                                                <span
                                                    style={{
                                                        width:
                                                            "6px",
                                                        height:
                                                            "6px",
                                                        borderRadius:
                                                            "50%",
                                                        background:
                                                            "currentColor",
                                                        display:
                                                            "inline-block",
                                                    }}
                                                />

                                                Active

                                            </span>


                                            <span>

                                                <FaQuestionCircle />

                                                {
                                                    quiz.question_count ||
                                                    quiz.questions
                                                        ?.length ||
                                                    0
                                                }{" "}
                                                questions

                                            </span>

                                        </div>


                                        {/* =========================
                                            TITLE
                                        ========================= */}

                                        <h3>
                                            {
                                                quiz.name
                                            }
                                        </h3>


                                        <p>
                                            {
                                                quiz.description ||
                                                "Complete this training assessment to demonstrate your knowledge."
                                            }
                                        </p>


                                        {/* =========================
                                            META
                                        ========================= */}

                                        <div className="quiz-launch-meta">

                                            <span>

                                                <strong>
                                                    Pass
                                                </strong>

                                                {" "}

                                                {
                                                    quiz.passing_score ??
                                                    70
                                                }%

                                            </span>


                                            <span>

                                                <FaClock />

                                                {quiz.time_limit_minutes
                                                    ? `${quiz.time_limit_minutes} min`
                                                    : "No time limit"}

                                            </span>


                                            <span>

                                                <FaUsers />

                                                {Number(
                                                    quiz.attempts_allowed
                                                ) === 0
                                                    ? "Unlimited attempts"
                                                    : `${quiz.attempts_allowed} attempt${Number(
                                                        quiz.attempts_allowed
                                                    ) === 1
                                                        ? ""
                                                        : "s"}`}

                                            </span>

                                        </div>


                                        {/* =========================
                                            SECURITY REQUIREMENTS
                                        ========================= */}

                                        <div
                                            className="quiz-launch-security"
                                        >

                                            {quiz.require_camera && (

                                                <span
                                                    title="Camera verification required"
                                                >

                                                    <FaCamera />

                                                    Camera

                                                </span>

                                            )}


                                            {quiz.require_location && (

                                                <span
                                                    title="Location verification required"
                                                >

                                                    <FaMapMarkerAlt />

                                                    Location

                                                </span>

                                            )}


                                            {quiz.require_email_consent && (

                                                <span
                                                    title="Email consent required"
                                                >

                                                    <FaEnvelope />

                                                    Email

                                                </span>

                                            )}

                                        </div>


                                        {/* =========================
                                            ACTIONS
                                        ========================= */}

                                        <div className="quiz-launch-actions">


                                            <button
                                                type="button"
                                                className="quiz-primary small"
                                                onClick={() =>
                                                    openQuiz(
                                                        quiz
                                                    )
                                                }
                                            >

                                                <FaExternalLinkAlt />

                                                Open Quiz

                                            </button>


                                            <button
                                                type="button"
                                                className="quiz-secondary small"
                                                onClick={() =>
                                                    copyLink(
                                                        quiz
                                                    )
                                                }
                                            >

                                                <FaCopy />

                                                Copy Link

                                            </button>


                                            <button
                                                type="button"
                                                className="quiz-secondary small"
                                                onClick={() =>
                                                    sendByEmail(
                                                        quiz
                                                    )
                                                }
                                            >

                                                <FaPaperPlane />

                                                Send by Email

                                            </button>

                                        </div>


                                        {/* =========================
                                            REUSABLE LINK
                                        ========================= */}

                                        <div className="quiz-launch-link">

                                            <FaLink />

                                            <span>
                                                {publicLink}
                                            </span>

                                        </div>


                                        {/* =========================
                                            LINK DESCRIPTION
                                        ========================= */}

                                        <div
                                            style={{
                                                marginTop:
                                                    "10px",
                                                padding:
                                                    "10px 12px",
                                                borderRadius:
                                                    "8px",
                                                background:
                                                    "#f8fafc",
                                                border:
                                                    "1px solid #e2e8f0",
                                                fontSize:
                                                    "11px",
                                                lineHeight:
                                                    "1.5",
                                                color:
                                                    "#64748b",
                                            }}
                                        >

                                            <FaShieldAlt
                                                style={{
                                                    marginRight:
                                                        "6px",
                                                }}
                                            />

                                            This link is
                                            reusable. Each
                                            participant
                                            receives a
                                            separate quiz
                                            session.

                                        </div>

                                    </article>

                                );

                            }
                        )}

                    </div>

                )}

        </div>

    );

}


export default TakeQuiz;