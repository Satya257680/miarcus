import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../../axiosConfig";

import {
    FaCamera,
    FaCheckCircle,
    FaClock,
    FaLocationArrow,
    FaMapMarkerAlt,
    FaShieldAlt,
    FaArrowLeft,
    FaArrowRight,
    FaLock,
    FaEnvelope,
} from "react-icons/fa";

import "../../styles/pages/Quiz.css";

const mediaUrl = (value) => {
    if (!value) return "";

    if (/^https?:\/\//i.test(String(value))) {
        return String(value);
    }

    const api = (
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000"
    ).replace(/\/+$/, "");

    return `${api}/${String(value).replace(/^\/+/, "")}`;
};

function PublicQuiz() {
    const { token } = useParams();

    // ============================================================
    // QUIZ STATE
    // ============================================================

    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [step, setStep] = useState("verify");

    // ============================================================
    // PARTICIPANT STATE
    // ============================================================

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const [emailConsent, setEmailConsent] = useState(false);
    const [cameraConsent, setCameraConsent] = useState(false);
    const [locationConsent, setLocationConsent] = useState(false);

    // ============================================================
    // VERIFICATION STATE
    // ============================================================

    const [location, setLocation] = useState(null);
    const [photo, setPhoto] = useState(null);

    const [cameraLoading, setCameraLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // ============================================================
    // SESSION / ANSWERS
    // ============================================================

    const [session, setSession] = useState(null);

    const [answers, setAnswers] = useState({});

    /*
     * IMPORTANT FIX
     *
     * React state updates are asynchronous.
     *
     * If a participant selects an answer and immediately clicks
     * "Save & Continue" or "Submit Assessment", the state update
     * may not have completed yet.
     *
     * answersRef always contains the latest answer object.
     */
    const answersRef = useRef({});

    const [index, setIndex] = useState(0);

    /*
     * Central answer updater.
     *
     * Every answer change goes through this function so both:
     *
     *   answers state
     *   answersRef
     *
     * stay synchronized immediately.
     */
    const updateAnswers = (updater) => {
        const previous = answersRef.current || {};

        const next =
            typeof updater === "function"
                ? updater(previous)
                : updater;

        // IMPORTANT:
        // Update the ref FIRST. React state updates are asynchronous,
        // so the submit handler must never depend on React finishing
        // a render before the latest answer is available.
        answersRef.current = next;

        setAnswers(next);
    };

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    // ============================================================
    // TIMER
    // ============================================================

    const [remainingSeconds, setRemainingSeconds] =
        useState(null);

    // ============================================================
    // LOAD PUBLIC QUIZ
    // ============================================================

    useEffect(() => {
        let mounted = true;

        const loadQuiz = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await axios.get(
                    `/api/quiz/public/${token}`
                );

                if (!mounted) {
                    return;
                }

                const quizData =
                    response?.data?.data;

                if (!quizData) {
                    throw new Error(
                        "Quiz data was not found."
                    );
                }

                setQuiz(quizData);

                // ----------------------------------------------------
                // INITIALIZE TIMER
                // ----------------------------------------------------

                if (
                    quizData.time_limit_minutes
                ) {
                    const seconds =
                        Number(
                            quizData.time_limit_minutes
                        ) * 60;

                    if (
                        Number.isFinite(seconds) &&
                        seconds > 0
                    ) {
                        setRemainingSeconds(
                            seconds
                        );
                    }
                }
            } catch (err) {
                if (!mounted) {
                    return;
                }

                setError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "This quiz link is unavailable."
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadQuiz();

        return () => {
            mounted = false;
        };
    }, [token]);

    // ============================================================
    // CAMERA CLEANUP
    // ============================================================

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // ============================================================
    // ATTACH CAMERA STREAM
    // ============================================================

    useEffect(() => {
        if (
            videoRef.current &&
            streamRef.current
        ) {
            videoRef.current.srcObject =
                streamRef.current;
        }
    }, [cameraConsent]);

    // ============================================================
    // QUIZ TIMER
    // ============================================================

    useEffect(() => {
        if (
            step !== "quiz" ||
            remainingSeconds === null ||
            submitting
        ) {
            return undefined;
        }

        if (remainingSeconds <= 0) {
            handleSubmit(true);
            return undefined;
        }

        const timer = setInterval(() => {
            setRemainingSeconds(
                (current) => {
                    if (current === null) {
                        return null;
                    }

                    if (current <= 1) {
                        clearInterval(timer);
                        return 0;
                    }

                    return current - 1;
                }
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [
        step,
        remainingSeconds,
        submitting,
    ]);

    // ============================================================
    // STOP CAMERA
    // ============================================================

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current
                .getTracks()
                .forEach((track) => {
                    try {
                        track.stop();
                    } catch {
                        // Ignore cleanup errors
                    }
                });

            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // ============================================================
    // REQUEST CAMERA
    // ============================================================

    const requestCamera = async () => {
        setError("");
        setCameraLoading(true);

        try {
            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices
                    .getUserMedia
            ) {
                throw new Error(
                    "Camera access is not supported by this browser."
                );
            }

            stopCamera();

            const mediaStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: {
                            facingMode: "user",
                            width: {
                                ideal: 1280,
                            },
                            height: {
                                ideal: 720,
                            },
                        },
                        audio: false,
                    });

            streamRef.current =
                mediaStream;

            setCameraConsent(true);

            setTimeout(() => {
                if (
                    videoRef.current &&
                    streamRef.current
                ) {
                    videoRef.current.srcObject =
                        streamRef.current;
                }
            }, 50);
        } catch (err) {
            setCameraConsent(false);

            setError(
                err?.message ||
                "Camera permission is required for this assessment."
            );
        } finally {
            setCameraLoading(false);
        }
    };

    // ============================================================
    // CAPTURE PHOTO
    // ============================================================

    const capturePhoto = () => {
        if (!videoRef.current) {
            setError(
                "Camera is not ready."
            );
            return;
        }

        const video =
            videoRef.current;

        if (
            !video.videoWidth ||
            !video.videoHeight
        ) {
            setError(
                "Camera is still loading. Please try again."
            );

            return;
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            video.videoWidth;

        canvas.height =
            video.videoHeight;

        const context =
            canvas.getContext("2d");

        if (!context) {
            setError(
                "Unable to capture photo."
            );
            return;
        }

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setError(
                        "Unable to create photo."
                    );
                    return;
                }

                const file = new File(
                    [blob],
                    "participant-verification.jpg",
                    {
                        type: "image/jpeg",
                    }
                );

                setPhoto(file);
                setError("");
            },
            "image/jpeg",
            0.88
        );
    };

    // ============================================================
    // REQUEST LOCATION
    // ============================================================

    const requestLocation = () => {
        setError("");

        if (!navigator.geolocation) {
            setError(
                "Location services are not supported by this browser."
            );

            return;
        }

        setLocationLoading(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const {
                    latitude,
                    longitude,
                    accuracy,
                } = position.coords;

                setLocation({
                    latitude,
                    longitude,
                    accuracy,
                });

                setLocationConsent(true);
                setLocationLoading(false);
                setError("");
            },
            (err) => {
                setLocationLoading(false);
                setLocationConsent(false);

                let message =
                    "Location permission is required for this assessment.";

                if (err.code === 1) {
                    message =
                        "Location permission was denied. Please allow location access and try again.";
                }

                if (err.code === 2) {
                    message =
                        "Your location could not be determined. Please try again.";
                }

                if (err.code === 3) {
                    message =
                        "Location request timed out. Please try again.";
                }

                setError(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    // ============================================================
    // VALIDATE PARTICIPANT
    // ============================================================

    const validateParticipant = () => {
        if (!name.trim()) {
            setError(
                "Please enter your full name."
            );
            return false;
        }

        if (!email.trim()) {
            setError(
                "Please enter your email address."
            );
            return false;
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(
                email.trim()
            )
        ) {
            setError(
                "Please enter a valid email address."
            );

            return false;
        }

        if (
            quiz?.require_email_consent &&
            !emailConsent
        ) {
            setError(
                "Please provide email consent before continuing."
            );

            return false;
        }

        if (
            quiz?.require_camera &&
            (!cameraConsent || !photo)
        ) {
            setError(
                "Please allow camera access and capture your verification photo."
            );

            return false;
        }

        if (
            quiz?.require_location &&
            !locationConsent
        ) {
            setError(
                "Please allow location access before continuing."
            );

            return false;
        }

        return true;
    };

    // ============================================================
    // START QUIZ SESSION
    // ============================================================

    const startQuiz = async () => {
        setError("");

        if (!validateParticipant()) {
            return;
        }

        const formData =
            new FormData();

        formData.append(
            "participant_name",
            name.trim()
        );

        formData.append(
            "participant_email",
            email.trim()
        );

        formData.append(
            "email_consent",
            emailConsent ? "1" : "0"
        );

        formData.append(
            "camera_consent",
            cameraConsent ? "1" : "0"
        );

        formData.append(
            "location_consent",
            locationConsent ? "1" : "0"
        );

        if (location) {
            formData.append(
                "latitude",
                String(
                    location.latitude
                )
            );

            formData.append(
                "longitude",
                String(
                    location.longitude
                )
            );

            formData.append(
                "location_accuracy",
                String(
                    location.accuracy
                )
            );
        }

        if (photo) {
            formData.append(
                "photo",
                photo
            );
        }

        try {
            const response =
                await axios.post(
                    `/api/quiz/public/${token}/start`,
                    formData,
                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data",
                        },
                    }
                );

            const sessionData =
                response?.data?.data ||
                response?.data;

            if (!sessionData) {
                throw new Error(
                    "Unable to create assessment session."
                );
            }

            setSession(
                sessionData
            );

            setStep("quiz");
            setIndex(0);

            // IMPORTANT:
            // Reset both state and ref.
            answersRef.current = {};
            setAnswers({});

            stopCamera();
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                "Unable to start assessment."
            );
        }
    };

    // ============================================================
    // NORMALIZE OPTIONS
    // ============================================================

    const getQuestionOptions =
        (question) => {
            if (!question) {
                return [];
            }

            if (
                question.question_type ===
                "true_false"
            ) {
                return [
                    "True",
                    "False",
                ];
            }

            if (
                Array.isArray(
                    question.options
                )
            ) {
                return question.options;
            }

            if (
                typeof question.options ===
                "string"
            ) {
                try {
                    const parsed =
                        JSON.parse(
                            question.options
                        );

                    if (
                        Array.isArray(
                            parsed
                        )
                    ) {
                        return parsed;
                    }
                } catch {
                    // Ignore invalid JSON
                }

                return question.options
                    .split(",")
                    .map(
                        (item) =>
                            item.trim()
                    )
                    .filter(Boolean);
            }

            return [];
        };

    // ============================================================
    // CURRENT QUESTION
    // ============================================================

    const currentQuestion =
        quiz?.questions?.[index] ||
        null;

    // ============================================================
    // CHECK REQUIRED QUESTION
    // ============================================================

    const isQuestionRequired =
        (question) => {
            if (!question) {
                return false;
            }

            return Boolean(
                question.is_mandatory ??
                question.required ??
                question.mandatory
            );
        };

    // ============================================================
    // CHECK ANSWER
    // ============================================================

    const hasAnswer =
        (question) => {
            if (!question) {
                return false;
            }

            /*
             * Read from the ref so validation always sees the
             * latest answer, even before React renders again.
             */
            const answer =
                answersRef.current?.[
                    question.id
                ];

            if (
                Array.isArray(answer)
            ) {
                return answer.length > 0;
            }

            return (
                answer !== undefined &&
                answer !== null &&
                String(answer).trim() !== ""
            );
        };

    // ============================================================
    // SET ANSWER
    // ============================================================

    const setQuestionAnswer = (
        question,
        option
    ) => {
        if (!question) {
            return;
        }

        const questionId = Number(
            question.id
        );

        if (
            !Number.isInteger(questionId) ||
            questionId <= 0
        ) {
            return;
        }

        const previous =
            answersRef.current || {};

        // --------------------------------------------------------
        // MULTIPLE CHOICE
        // --------------------------------------------------------

        if (
            question.question_type ===
            "multiple_choice"
        ) {
            const current =
                Array.isArray(
                    previous[questionId]
                )
                    ? [
                        ...previous[questionId],
                    ]
                    : [];

            const exists =
                current.includes(
                    option
                );

            const nextAnswer = exists
                ? current.filter(
                    (item) =>
                        item !== option
                )
                : [
                    ...current,
                    option,
                ];

            const next = {
                ...previous,
                [questionId]:
                    nextAnswer,
            };

            // Synchronously store the answer.
            answersRef.current = next;

            // Then update React state for the UI.
            setAnswers(next);

            return;
        }

        // --------------------------------------------------------
        // SINGLE CHOICE / TRUE-FALSE
        // --------------------------------------------------------

        const next = {
            ...previous,
            [questionId]:
                option,
        };

        // Synchronously store the answer.
        answersRef.current = next;

        // Then update React state for the UI.
        setAnswers(next);
    };

    // ============================================================
    // NEXT QUESTION
    // ============================================================

    const nextQuestion = () => {
        setError("");

        if (
            currentQuestion &&
            isQuestionRequired(
                currentQuestion
            ) &&
            !hasAnswer(
                currentQuestion
            )
        ) {
            setError(
                "This question is mandatory. Please provide an answer before continuing."
            );

            return;
        }

        if (
            index <
            (quiz?.questions
                ?.length || 1) - 1
        ) {
            setIndex(
                (current) =>
                    current + 1
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
    };

    // ============================================================
    // PREVIOUS QUESTION
    // ============================================================

    const previousQuestion =
        () => {
            setError("");

            if (index > 0) {
                setIndex(
                    (current) =>
                        current - 1
                );

                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }
        };

    // ============================================================
    // BUILD SUBMISSION PAYLOAD
    // ============================================================

    const buildSubmissionPayload =
        () => {
            /*
             * IMPORTANT FIX:
             *
             * Use answersRef instead of the possibly stale React
             * state value.
             */
            const latestAnswers =
                answersRef.current || {};

            /*
             * IMPORTANT FIX:
             *
             * Build answers from the COMPLETE question list.
             *
             * Before:
             *
             *     Object.entries(answers)
             *
             * only sent questions that happened to exist in the
             * React state object.
             *
             * Now:
             *
             *     quiz.questions
             *
             * is the source of truth.
             *
             * This guarantees that the backend receives one
             * answer object for every question.
             */
            const submittedAnswers =
                (
                    quiz?.questions ||
                    []
                )
                    .map(
                        (question) => {
                            const questionId =
                                Number(
                                    question?.id
                                );

                            if (
                                !Number.isFinite(
                                    questionId
                                ) ||
                                questionId <= 0
                            ) {
                                return null;
                            }

                            const hasStoredAnswer =
                                Object.prototype.hasOwnProperty.call(
                                    latestAnswers,
                                    questionId
                                ) ||
                                Object.prototype.hasOwnProperty.call(
                                    latestAnswers,
                                    String(questionId)
                                );

                            const answer =
                                hasStoredAnswer
                                    ? latestAnswers[
                                        questionId
                                    ]
                                    : null;

                            return {
                                question_id:
                                    questionId,

                                /*
                                 * Backend expects this exact
                                 * property name.
                                 */
                                answer,
                            };
                        }
                    )
                    .filter(Boolean);

            return {
                answers:
                    submittedAnswers,
            };
        };

    // ============================================================
    // SUBMIT QUIZ
    // ============================================================

    const handleSubmit =
        async (
            automaticSubmit = false
        ) => {
            if (submitting) {
                return;
            }

            setError("");

            // ----------------------------------------------------
            // VALIDATE MANDATORY QUESTIONS
            // ----------------------------------------------------

            if (!automaticSubmit) {
                const mandatoryQuestion =
                    quiz?.questions?.find(
                        (question) =>
                            isQuestionRequired(
                                question
                            ) &&
                            !hasAnswer(
                                question
                            )
                    );

                if (
                    mandatoryQuestion
                ) {
                    setError(
                        "Please answer all mandatory questions before submitting."
                    );

                    const mandatoryIndex =
                        quiz.questions.findIndex(
                            (question) =>
                                question.id ===
                                mandatoryQuestion.id
                        );

                    if (
                        mandatoryIndex >= 0
                    ) {
                        setIndex(
                            mandatoryIndex
                        );
                    }

                    return;
                }
            }

            if (
                !session?.session_token
            ) {
                setError(
                    "Your assessment session is unavailable. Please restart the assessment."
                );

                return;
            }

            setSubmitting(true);

            try {
                /*
                 * Build the payload immediately before the request.
                 *
                 * This ensures the latest answersRef value is used.
                 */
                const payload =
                    buildSubmissionPayload();

                // Never submit an empty answer collection when the
                // participant has actually selected an answer.
                const submittedCount =
                    Array.isArray(payload.answers)
                        ? payload.answers.filter(
                            (item) => {
                                const answer =
                                    item?.answer;

                                if (
                                    Array.isArray(answer)
                                ) {
                                    return answer.length > 0;
                                }

                                return (
                                    answer !== null &&
                                    answer !== undefined &&
                                    String(answer).trim() !== ""
                                );
                            }
                        ).length
                        : 0;

                if (
                    !automaticSubmit &&
                    submittedCount === 0
                ) {
                    setError(
                        "No answer was captured. Please select an answer and try again."
                    );
                    return;
                }

                const response =
                    await axios.post(
                        `/api/quiz/public/session/${session.session_token}/submit`,
                        payload,
                        {
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                        }
                    );

                const resultData =
                    response?.data?.data ||
                    response?.data;

                setResult(
                    resultData
                );

                setStep("result");

                stopCamera();
            } catch (err) {
                setError(
                    err?.response?.data
                        ?.message ||
                    "Unable to submit assessment."
                );
            } finally {
                setSubmitting(false);
            }
        };

    // ============================================================
    // FORMAT TIMER
    // ============================================================

    const formatTime =
        (seconds) => {
            if (
                seconds === null ||
                seconds === undefined
            ) {
                return "No time limit";
            }

            const safeSeconds =
                Math.max(
                    0,
                    Number(seconds)
                );

            const minutes =
                Math.floor(
                    safeSeconds / 60
                );

            const remaining =
                safeSeconds % 60;

            return `${String(
                minutes
            ).padStart(
                2,
                "0"
            )}:${String(
                remaining
            ).padStart(
                2,
                "0"
            )}`;
        };

    // ============================================================
    // LOADING SCREEN
    // ============================================================

    if (loading) {
        return (
            <div className="public-quiz-shell">
                <header className="public-header">
                    <div className="brand-mark">
                        mi <span>arcus</span>
                    </div>

                    <div className="public-secure">
                        <FaLock />
                        Secure Assessment
                    </div>
                </header>

                <main className="public-main">
                    <div className="public-card loading-card">
                        <div className="loading-ring" />

                        <h2>
                            Loading assessment
                        </h2>

                        <p>
                            Please wait while we
                            securely load your quiz.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ============================================================
    // QUIZ UNAVAILABLE
    // ============================================================

    if (error && !quiz) {
        return (
            <div className="public-quiz-shell">
                <header className="public-header">
                    <div className="brand-mark">
                        mi <span>arcus</span>
                    </div>

                    <div className="public-secure">
                        <FaShieldAlt />
                        Secure Assessment
                    </div>
                </header>

                <main className="public-main">
                    <div className="public-card public-error">
                        <FaShieldAlt />

                        <h1>
                            Assessment unavailable
                        </h1>

                        <p>
                            {error}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ============================================================
    // EMPTY QUIZ PROTECTION
    // ============================================================

    if (
        !quiz ||
        !Array.isArray(
            quiz.questions
        ) ||
        quiz.questions.length === 0
    ) {
        return (
            <div className="public-quiz-shell">
                <header className="public-header">
                    <div className="brand-mark">
                        mi <span>arcus</span>
                    </div>
                </header>

                <main className="public-main">
                    <div className="public-card public-error">
                        <FaShieldAlt />

                        <h1>
                            No questions available
                        </h1>

                        <p>
                            This assessment has not
                            been configured with any
                            questions yet.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ============================================================
    // CURRENT QUESTION OPTIONS
    // ============================================================

    const questionOptions =
        getQuestionOptions(
            currentQuestion
        );

    const currentAnswer =
        currentQuestion
            ? (
                Object.prototype.hasOwnProperty.call(
                    answersRef.current || {},
                    Number(currentQuestion.id)
                )
                    ? answersRef.current[
                        Number(currentQuestion.id)
                    ]
                    : answers[
                        currentQuestion.id
                    ]
            )
            : undefined;

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="public-quiz-shell">
            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="public-header">
                <div className="brand-mark">
                    mi <span>arcus</span>
                </div>

                <div className="public-secure">
                    <FaShieldAlt />
                    Secure Assessment
                </div>
            </header>

            <main className="public-main">
                {/* ==================================================
                    ERROR BANNER
                ================================================== */}

                {error && (
                    <div className="public-error-banner">
                        <FaShieldAlt />

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setError("")
                            }
                            aria-label="Close error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* ==================================================
                    VERIFICATION STEP
                ================================================== */}

                {step === "verify" && (
                    <div className="public-card wide">
                        <div className="public-card-intro">
                            <span>
                                MI ARCUS TRAINING
                            </span>

                            <h1>
                                {quiz.name}
                            </h1>

                            <p>
                                {quiz.description ||
                                    "Complete this assessment to demonstrate your training knowledge."}
                            </p>

                            <div className="public-meta">
                                <span>
                                    {
                                        quiz.questions
                                            .length
                                    }{" "}
                                    Questions
                                </span>

                                <span>
                                    {quiz.time_limit_minutes
                                        ? `${quiz.time_limit_minutes} Minutes`
                                        : "No Time Limit"}
                                </span>

                                <span>
                                    Pass{" "}
                                    {
                                        quiz.passing_score
                                    }%
                                </span>
                            </div>
                        </div>

                        <div className="verification-grid">
                            {/* ==================================================
                                PARTICIPANT DETAILS
                            ================================================== */}

                            <section>
                                <div className="section-heading">
                                    <span className="section-number">
                                        01
                                    </span>

                                    <div>
                                        <h3>
                                            Participant
                                            details
                                        </h3>

                                        <p>
                                            Enter the
                                            details used
                                            for your
                                            assessment
                                            record.
                                        </p>
                                    </div>
                                </div>

                                <label>
                                    <span>
                                        Full Name
                                    </span>

                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(event) =>
                                            setName(
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Enter your full name"
                                        autoComplete="name"
                                    />
                                </label>

                                <label>
                                    <span>
                                        Email Address
                                    </span>

                                    <div className="input-with-icon">
                                        <FaEnvelope />

                                        <input
                                            type="email"
                                            value={
                                                email
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setEmail(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                        />
                                    </div>
                                </label>

                                {quiz.require_email_consent && (
                                    <label className="consent">
                                        <input
                                            type="checkbox"
                                            checked={
                                                emailConsent
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setEmailConsent(
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                        />

                                        <span>
                                            I agree to
                                            receive
                                            assessment-related
                                            emails such
                                            as my result
                                            and
                                            certificate.
                                        </span>
                                    </label>
                                )}
                            </section>

                            {/* ==================================================
                                VERIFICATION
                            ================================================== */}

                            <section>
                                <div className="section-heading">
                                    <span className="section-number">
                                        02
                                    </span>

                                    <div>
                                        <h3>
                                            Assessment
                                            verification
                                        </h3>

                                        <p>
                                            Complete the
                                            required
                                            verification
                                            steps before
                                            starting.
                                        </p>
                                    </div>
                                </div>

                                {/* CAMERA */}

                                {quiz.require_camera && (
                                    <>
                                        <div className="permission-card">
                                            <div>
                                                <FaCamera />

                                                <span>
                                                    Camera
                                                    verification

                                                    <small>
                                                        {cameraConsent
                                                            ? photo
                                                                ? "Photo captured successfully"
                                                                : "Camera permission granted"
                                                            : "Required before starting"}
                                                    </small>
                                                </span>
                                            </div>

                                            {!cameraConsent ? (
                                                <button
                                                    type="button"
                                                    onClick={
                                                        requestCamera
                                                    }
                                                    disabled={
                                                        cameraLoading
                                                    }
                                                >
                                                    {cameraLoading
                                                        ? "Opening..."
                                                        : "Allow Camera"}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={
                                                        capturePhoto
                                                    }
                                                >
                                                    {photo
                                                        ? "Retake Photo"
                                                        : "Capture Photo"}
                                                </button>
                                            )}
                                        </div>

                                        {cameraConsent && (
                                            <div className="camera-preview">
                                                <video
                                                    ref={
                                                        videoRef
                                                    }
                                                    autoPlay
                                                    muted
                                                    playsInline
                                                />

                                                {photo && (
                                                    <div className="verification-success">
                                                        <FaCheckCircle />

                                                        <span>
                                                            Verification
                                                            photo
                                                            captured
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* LOCATION */}

                                {quiz.require_location && (
                                    <div className="permission-card">
                                        <div>
                                            <FaMapMarkerAlt />

                                            <span>
                                                Location
                                                verification

                                                <small>
                                                    {locationConsent
                                                        ? `Accuracy ${Math.round(
                                                            location?.accuracy ||
                                                            0
                                                        )}m`
                                                        : "Required before starting"}
                                                </small>
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={
                                                requestLocation
                                            }
                                            disabled={
                                                locationLoading
                                            }
                                        >
                                            {locationLoading
                                                ? "Checking..."
                                                : locationConsent
                                                    ? "Location Ready"
                                                    : "Allow Location"}
                                        </button>
                                    </div>
                                )}

                                {!quiz.require_camera &&
                                    !quiz.require_location && (
                                        <div className="verification-ready">
                                            <FaCheckCircle />

                                            <div>
                                                <strong>
                                                    No additional
                                                    verification
                                                    required
                                                </strong>

                                                <span>
                                                    You can
                                                    proceed
                                                    directly to
                                                    the
                                                    assessment.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                            </section>
                        </div>

                        {/* ==================================================
                            FOOTER ACTION
                        ================================================== */}

                        <div className="public-actions">
                            <span>
                                <FaShieldAlt />

                                Your assessment data
                                is recorded for
                                training
                                verification.
                            </span>

                            <button
                                type="button"
                                className="public-primary"
                                onClick={
                                    startQuiz
                                }
                            >
                                Proceed to Assessment
                                <FaArrowRight />
                            </button>
                        </div>
                    </div>
                )}

                {/* ==================================================
                    QUIZ PLAYER
                ================================================== */}

                {step === "quiz" &&
                    currentQuestion && (
                        <div className="public-card wide quiz-player">
                            {/* ==================================================
                                PLAYER HEADER
                            ================================================== */}

                            <div className="player-head">
                                <div>
                                    <span>
                                        QUESTION{" "}
                                        {index + 1} OF{" "}
                                        {
                                            quiz.questions
                                                .length
                                        }
                                    </span>

                                    <h1>
                                        {quiz.name}
                                    </h1>
                                </div>

                                <div className="player-status">
                                    {remainingSeconds !==
                                        null && (
                                            <div
                                                className={
                                                    remainingSeconds <=
                                                        60
                                                        ? "quiz-timer danger"
                                                        : "quiz-timer"
                                                }
                                            >
                                                <FaClock />

                                                <strong>
                                                    {formatTime(
                                                        remainingSeconds
                                                    )}
                                                </strong>

                                                <small>
                                                    Remaining
                                                </small>
                                            </div>
                                        )}

                                    <div className="player-progress">
                                        {Math.round(
                                            ((index + 1) /
                                                quiz
                                                    .questions
                                                    .length) *
                                            100
                                        )}
                                        %
                                    </div>
                                </div>
                            </div>

                            {/* ==================================================
                                PROGRESS
                            ================================================== */}

                            <div className="progress-track">
                                <i
                                    style={{
                                        width: `${
                                            ((index + 1) /
                                                quiz
                                                    .questions
                                                    .length) *
                                            100
                                        }%`,
                                    }}
                                />
                            </div>

                            {/* ==================================================
                                QUESTION
                            ================================================== */}

                            <div className="player-question">
                                <div className="question-badge">
                                    {String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        "0"
                                    )}
                                </div>

                                <div className="question-body">
                                    <div className="question-label">
                                        {currentQuestion.question_type ||
                                            "Question"}

                                        {isQuestionRequired(
                                            currentQuestion
                                        ) && (
                                                <span>
                                                    Required
                                                </span>
                                            )}
                                    </div>

                                    <h2>
                                        {
                                            currentQuestion.question_text
                                        }
                                    </h2>

                                    {/* IMAGE */}

                                    {currentQuestion.image_url && (
                                        <div className="question-media">
                                            <img
                                                src={mediaUrl(
                                                    currentQuestion.image_url
                                                )}
                                                alt="Question reference"
                                            />
                                        </div>
                                    )}

                                    {/* VIDEO */}

                                    {currentQuestion.video_url && (
                                        <div className="question-video">
                                            <a
                                                href={mediaUrl(
                                                    currentQuestion.video_url
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open video
                                                reference
                                                <FaArrowRight />
                                            </a>
                                        </div>
                                    )}

                                    {/* TEXT QUESTION */}

                                    {currentQuestion.question_type ===
                                        "text" && (
                                            <textarea
                                                value={
                                                    currentAnswer ||
                                                    ""
                                                }
                                                onChange={(
                                                    event
                                                ) => {
                                                    const questionId =
                                                        Number(
                                                            currentQuestion.id
                                                        );

                                                    const next = {
                                                        ...(answersRef.current || {}),
                                                        [questionId]:
                                                            event
                                                                .target
                                                                .value,
                                                    };

                                                    // Keep the latest text answer
                                                    // available immediately.
                                                    answersRef.current = next;
                                                    setAnswers(next);
                                                }}
                                                placeholder="Type your answer..."
                                            />
                                        )}

                                    {/* SINGLE / MULTIPLE / TRUE-FALSE */}

                                    {currentQuestion.question_type !==
                                        "text" && (
                                            <div className="answer-options">
                                                {questionOptions.map(
                                                    (
                                                        option,
                                                        optionIndex
                                                    ) => {
                                                        const selected =
                                                            Array.isArray(
                                                                currentAnswer
                                                            )
                                                                ? currentAnswer.includes(
                                                                    option
                                                                )
                                                                : currentAnswer ===
                                                                option;

                                                        return (
                                                            <label
                                                                key={`${currentQuestion.id}-${optionIndex}`}
                                                                className={
                                                                    selected
                                                                        ? "selected"
                                                                        : ""
                                                                }
                                                            >
                                                                <input
                                                                    type={
                                                                        currentQuestion.question_type ===
                                                                            "multiple_choice"
                                                                            ? "checkbox"
                                                                            : "radio"
                                                                    }
                                                                    name={`question-${currentQuestion.id}`}
                                                                    checked={
                                                                        selected
                                                                    }
                                                                    onChange={() =>
                                                                        setQuestionAnswer(
                                                                            currentQuestion,
                                                                            option
                                                                        )
                                                                    }
                                                                />

                                                                <span className="answer-letter">
                                                                    {String.fromCharCode(
                                                                        65 +
                                                                        optionIndex
                                                                    )}
                                                                </span>

                                                                <span className="answer-text">
                                                                    {
                                                                        option
                                                                    }
                                                                </span>

                                                                {selected && (
                                                                    <FaCheckCircle className="answer-check" />
                                                                )}
                                                            </label>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* ==================================================
                                PLAYER FOOTER
                            ================================================== */}

                            <div className="player-footer">
                                <button
                                    type="button"
                                    className="quiz-secondary"
                                    disabled={
                                        index ===
                                        0
                                    }
                                    onClick={
                                        previousQuestion
                                    }
                                >
                                    <FaArrowLeft />
                                    Previous
                                </button>

                                <span className="question-counter">
                                    {index + 1} /{" "}
                                    {
                                        quiz.questions
                                            .length
                                    }
                                </span>

                                {index <
                                    quiz.questions
                                        .length -
                                    1 ? (
                                    <button
                                        type="button"
                                        className="public-primary"
                                        onClick={
                                            nextQuestion
                                        }
                                    >
                                        Save & Continue
                                        <FaArrowRight />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="public-primary"
                                        disabled={
                                            submitting
                                        }
                                        onClick={() =>
                                            handleSubmit(
                                                false
                                            )
                                        }
                                    >
                                        {submitting
                                            ? "Submitting..."
                                            : "Submit Assessment"}

                                        {!submitting && (
                                            <FaCheckCircle />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                {/* ==================================================
                    RESULT
                ================================================== */}

                {step === "result" &&
                    result && (
                        <div className="public-card result-card">
                            <div className="result-icon">
                                <FaCheckCircle />
                            </div>

                            <span>
                                ASSESSMENT COMPLETE
                            </span>

                            <h1>
                                {result.result ||
                                    "Assessment Submitted"}
                            </h1>

                            <p>
                                Thank you,{" "}
                                <strong>
                                    {name}
                                </strong>
                                . Your assessment has
                                been securely recorded.
                            </p>

                            <div className="result-score">
                                <strong>
                                    {Number(
                                        result.percentage ||
                                        0
                                    ).toFixed(
                                        1
                                    )}
                                    %
                                </strong>

                                <span>
                                    {result.score ||
                                        0}{" "}
                                    /{" "}
                                    {result.max_score ||
                                        0}{" "}
                                    points
                                </span>
                            </div>

                            {result.participant_id && (
                                <div className="participant-id">
                                    <span>
                                        Participant ID
                                    </span>

                                    <strong>
                                        {
                                            result.participant_id
                                        }
                                    </strong>
                                </div>
                            )}

                            <div className="result-security">
                                <FaShieldAlt />

                                <div>
                                    <strong>
                                        Assessment
                                        recorded
                                        successfully
                                    </strong>

                                    <span>
                                        Your training
                                        report is
                                        available to the
                                        authorized
                                        Miarcus training
                                        team.
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
            </main>
        </div>
    );
}

export default PublicQuiz;