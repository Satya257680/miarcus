import PremiumLoader from "../../components/premium/PremiumLoader";
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
import "../../styles/pages/TakeQuizPremium.css";


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
                    Array.isArray(response?.data?.data)
                        ? response.data.data
                        : Array.isArray(response?.data)
                            ? response.data
                            : [];

                const activeQuizzes =
                    list.filter((quiz) => {
                        const status = String(
                            quiz?.status ?? ""
                        )
                            .trim()
                            .toLowerCase();

                        return status === "active";
                    });

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

        const token = String(
            quiz?.public_token || ""
        ).trim();

        if (!token) {
            return "";
        }

        return `${window.location.origin}/quiz/${encodeURIComponent(
            token
        )}`;

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

    const openQuiz = (quiz) => {
        const publicLink = getQuizLink(quiz);

        if (!publicLink) {

            setMessage(
                "This quiz does not have a public link."
            );

            return;

        }

        const newWindow =
            window.open(
                publicLink,
                "_blank",
                "noopener,noreferrer"
            );

        if (!newWindow) {
            setMessage(
                "The quiz could not be opened. Please allow pop-ups for this site."
            );
        }

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

    const totalQuestions = filtered.reduce(
        (sum, quiz) =>
            sum +
            (Number(
                quiz?.question_count ??
                quiz?.questions?.length ??
                0
            ) || 0),
        0
    );

    return (

        <div className="quiz-page tq-premium">

            {/* ================= HERO ================= */}

            <section className="tq-hero">

                <div className="tq-hero-copy">

                    <span className="tq-eyebrow">
                        Employee Assessments
                    </span>

                    <h1>Take Quiz</h1>

                    <p>
                        Pick an active training assessment to start it now,
                        or share its reusable link with your team.
                    </p>

                </div>

                <div className="tq-hero-stats">

                    <div className="tq-hero-stat">
                        <strong>{filtered.length}</strong>
                        <span>Active {filtered.length === 1 ? "quiz" : "quizzes"}</span>
                    </div>

                    <div className="tq-hero-stat">
                        <strong>{totalQuestions}</strong>
                        <span>Questions</span>
                    </div>

                    <div className="tq-hero-pill">
                        <FaShieldAlt />
                        Secure assessment flow
                    </div>

                </div>

            </section>

            {/* ================= MESSAGE ================= */}

            {message && (

                <div className="quiz-toast tq-toast">

                    <span>{message}</span>

                    <button type="button" onClick={clearMessage} aria-label="Dismiss">
                        <FaTimes />
                    </button>

                </div>

            )}

            {/* ================= TOOLBAR ================= */}

            <div className="tq-toolbar">

                <label className="tq-search">

                    <FaSearch />

                    <input
                        type="text"
                        placeholder="Search active quizzes..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />

                </label>

                <span className="tq-count">
                    <FaQuestionCircle />
                    {filtered.length} active assessment{filtered.length === 1 ? "" : "s"}
                </span>

            </div>

            {/* ================= LOADING ================= */}

            {loading && (

                <div className="tq-empty">
                    <PremiumLoader compact title="Loading assessments" />
                </div>

            )}

            {/* ================= EMPTY ================= */}

            {!loading && !filtered.length && (

                <div className="tq-empty">
                    <FaQuestionCircle className="tq-empty-icon" />
                    <strong>No active quizzes found</strong>
                    <span>
                        {search
                            ? "Try another search term."
                            : "There are currently no active training assessments."}
                    </span>
                </div>

            )}

            {/* ================= CARDS ================= */}

            {!loading && filtered.length > 0 && (

                <div className="tq-grid">

                    {filtered.map(quiz => {

                        const publicLink = getQuizLink(quiz);

                        const questionCount =
                            Number(
                                quiz?.question_count ??
                                quiz?.questions?.length ??
                                0
                            ) || 0;

                        const passScore =
                            Number(quiz?.passing_score ?? 70) || 0;

                        const attemptsLabel =
                            Number(quiz.attempts_allowed) === 0
                                ? "Unlimited"
                                : `${quiz.attempts_allowed} attempt${Number(quiz.attempts_allowed) === 1 ? "" : "s"}`;

                        const hasChecks =
                            quiz.require_camera ||
                            quiz.require_location ||
                            quiz.require_email_consent;

                        return (

                            <article className="tq-card" key={quiz.id}>

                                <header className="tq-card-head">

                                    <div className="tq-card-icon">
                                        <FaCheckCircle />
                                    </div>

                                    <div className="tq-card-title">
                                        <span className="tq-status">
                                            <i /> Active
                                        </span>
                                        <h3>{quiz.name}</h3>
                                        <p>
                                            {quiz.description ||
                                                "Complete this training assessment to demonstrate your knowledge."}
                                        </p>
                                    </div>

                                    <span className="tq-qcount">
                                        <FaQuestionCircle />
                                        {questionCount} question{questionCount === 1 ? "" : "s"}
                                    </span>

                                </header>

                                <div className="tq-meta">

                                    <div className="tq-meta-item">
                                        <span>Pass mark</span>
                                        <strong>{passScore}%</strong>
                                    </div>

                                    <div className="tq-meta-item">
                                        <span><FaClock /> Time limit</span>
                                        <strong>
                                            {quiz.time_limit_minutes
                                                ? `${quiz.time_limit_minutes} min`
                                                : "No limit"}
                                        </strong>
                                    </div>

                                    <div className="tq-meta-item">
                                        <span><FaUsers /> Attempts</span>
                                        <strong>{attemptsLabel}</strong>
                                    </div>

                                </div>

                                {hasChecks && (

                                    <div className="tq-checks">

                                        <span className="tq-checks-label">Verification</span>

                                        {quiz.require_camera && (
                                            <span className="tq-chip" title="Camera verification required">
                                                <FaCamera /> Camera
                                            </span>
                                        )}

                                        {quiz.require_location && (
                                            <span className="tq-chip" title="Location verification required">
                                                <FaMapMarkerAlt /> Location
                                            </span>
                                        )}

                                        {quiz.require_email_consent && (
                                            <span className="tq-chip" title="Email consent required">
                                                <FaEnvelope /> Email
                                            </span>
                                        )}

                                    </div>

                                )}

                                <div className="tq-actions">

                                    <button
                                        type="button"
                                        className="tq-btn tq-btn-primary"
                                        onClick={() => openQuiz(quiz)}
                                    >
                                        <FaExternalLinkAlt />
                                        Open Quiz
                                    </button>

                                    <button
                                        type="button"
                                        className="tq-btn tq-btn-ghost"
                                        onClick={() => copyLink(quiz)}
                                    >
                                        <FaCopy />
                                        Copy Link
                                    </button>

                                    <button
                                        type="button"
                                        className="tq-btn tq-btn-ghost"
                                        onClick={() => sendByEmail(quiz)}
                                    >
                                        <FaPaperPlane />
                                        Send by Email
                                    </button>

                                </div>

                                <footer className="tq-link">

                                    <div className="tq-link-url">
                                        <FaLink />
                                        <span>{publicLink || "Public link unavailable"}</span>
                                    </div>

                                    <p>
                                        <FaShieldAlt />
                                        This link is reusable. Each participant gets a separate quiz session.
                                    </p>

                                </footer>

                            </article>

                        );

                    })}

                </div>

            )}

        </div>

    );

}

export default TakeQuiz;
