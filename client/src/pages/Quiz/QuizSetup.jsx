import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../axiosConfig";

import {
    FaCopy,
    FaEdit,
    FaLink,
    FaPlus,
    FaQuestionCircle,
    FaSave,
    FaTrash,
    FaTimes,
    FaEnvelope,
    FaPaperPlane,
    FaMagic,
    FaSearch,
    FaChevronDown,
    FaUpload,
} from "react-icons/fa";

import "../../styles/pages/Quiz.css";

/*
|--------------------------------------------------------------------------
| AI ENDPOINT
|--------------------------------------------------------------------------
|
| Change ONLY this value if your backend uses another AI route.
|
| Expected request:
|
| POST /api/quiz/ai/generate-question
|
| Example body:
|
| {
|   "question_text": "...",
|   "question_type": "single_choice",
|   "options": ["", ""],
|   "guideline": "..."
| }
|
| The response can contain:
|
| {
|   question_text: "...",
|   question_type: "single_choice",
|   options: ["A", "B", "C", "D"],
|   correct_answer: "A",
|   points: 1,
|   guideline: "..."
| }
|
|--------------------------------------------------------------------------
*/

const AI_GENERATE_ENDPOINT =
    "/api/quiz/ai/generate-question";


/* ==========================================================================
   EMPTY QUIZ
========================================================================== */

const emptyQuiz = {
    name: "",
    description: "",
    passing_score: 70,
    time_limit_minutes: "",
    attempts_allowed: 0,
    status: "Active",
    require_camera: true,
    require_location: true,
    require_email_consent: true,
};


/* ==========================================================================
   EMPTY QUESTION
========================================================================== */

const emptyQuestion = {
    question_text: "",
    question_type: "single_choice",
    options: ["", ""],
    correct_answer: "",
    points: 1,
    is_mandatory: true,
    guideline: "",
    image_url: "",
    video_url: "",
};


/* ==========================================================================
   QUESTION TYPE LABEL
========================================================================== */

const questionTypeLabel = (type) => {
    switch (type) {
        case "single_choice":
            return "Single Choice (Radio)";

        case "multiple_choice":
            return "Multiple Choice (Checkbox)";

        case "text":
            return "Text Input (Manual scoring in Training Report)";

        case "true_false":
            return "True / False";

        default:
            return String(type || "")
                .replaceAll("_", " ");
    }
};


/* ==========================================================================
   SAFE RESPONSE DATA
========================================================================== */

const getResponseData = (response) => {
    return (
        response?.data?.data ??
        response?.data ??
        null
    );
};


/* ==========================================================================
   COMPONENT
========================================================================== */

function QuizSetup() {

    const navigate = useNavigate();


    /* ======================================================================
       STATE
    ====================================================================== */

    const [quizzes, setQuizzes] = useState([]);

    const [selected, setSelected] =
        useState(null);

    const [quizForm, setQuizForm] =
        useState(emptyQuiz);

    const [questionForm, setQuestionForm] =
        useState(emptyQuestion);

    const [showQuiz, setShowQuiz] =
        useState(false);

    const [showQuestion, setShowQuestion] =
        useState(false);

    const [editingQuestion, setEditingQuestion] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [searchQuiz, setSearchQuiz] =
        useState("");

    const [searchQuestion, setSearchQuestion] =
        useState("");

    const [generatingAI, setGeneratingAI] =
        useState(false);

    const [bulkGenerating, setBulkGenerating] =
        useState(false);

    const [bulkText, setBulkText] =
        useState("");

    const [showBulkModal, setShowBulkModal] =
        useState(false);

    const [imageFile, setImageFile] =
        useState(null);

    const [videoFile, setVideoFile] =
        useState(null);


    /* ======================================================================
       MESSAGE HELPER
    ====================================================================== */

    const showMessage = (text) => {

        setMessage(text);

        window.clearTimeout(
            window.__quizMessageTimer
        );

        window.__quizMessageTimer =
            window.setTimeout(() => {
                setMessage("");
            }, 4000);
    };


    /* ======================================================================
       LOAD QUIZZES
    ====================================================================== */

    const load = async () => {

        setLoading(true);

        try {

            const response =
                await axios.get("/api/quiz");

            const quizList =
                response?.data?.data || [];

            setQuizzes(
                Array.isArray(quizList)
                    ? quizList
                    : []
            );


            /*
             * Refresh currently selected quiz.
             */

            if (selected?.id) {

                try {

                    const detail =
                        await axios.get(
                            `/api/quiz/${selected.id}`
                        );

                    setSelected(
                        getResponseData(detail)
                    );

                } catch (detailError) {

                    console.error(
                        "Unable to refresh quiz:",
                        detailError
                    );
                }
            }

        } catch (error) {

            console.error(
                "Quiz load error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Unable to load quizzes"
            );

        } finally {

            setLoading(false);
        }
    };


    /* ======================================================================
       INITIAL LOAD
    ====================================================================== */

    useEffect(() => {

        load();

    }, []);


    /* ======================================================================
       FILTERED QUIZZES
    ====================================================================== */

    const filteredQuizzes =
        useMemo(() => {

            const search =
                searchQuiz
                    .trim()
                    .toLowerCase();

            if (!search) {
                return quizzes;
            }

            return quizzes.filter((quiz) => {

                return (
                    String(
                        quiz?.name || ""
                    )
                        .toLowerCase()
                        .includes(search)
                    ||
                    String(
                        quiz?.description || ""
                    )
                        .toLowerCase()
                        .includes(search)
                );

            });

        }, [quizzes, searchQuiz]);


    /* ======================================================================
       FILTERED QUESTIONS
    ====================================================================== */

    const filteredQuestions =
        useMemo(() => {

            const questions =
                selected?.questions || [];

            const search =
                searchQuestion
                    .trim()
                    .toLowerCase();

            if (!search) {
                return questions;
            }

            return questions.filter(
                (question) => {

                    return (
                        String(
                            question?.question_text ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search)
                        ||
                        String(
                            question?.question_type ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search)
                    );

                }
            );

        }, [selected, searchQuestion]);


    /* ======================================================================
       OPEN QUIZ
    ====================================================================== */

    const openQuiz = async (id) => {

        try {

            const response =
                await axios.get(
                    `/api/quiz/${id}`
                );

            const quiz =
                getResponseData(response);

            setSelected(quiz);

            setSearchQuestion("");

        } catch (error) {

            console.error(
                "Unable to open quiz:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Unable to open quiz"
            );
        }
    };


    /* ======================================================================
       COPY PUBLIC LINK
    ====================================================================== */

    const copyLink = async (quiz) => {

        if (!quiz?.public_token) {

            showMessage(
                "This quiz does not have a public link."
            );

            return;
        }

        const link =
            `${window.location.origin}/quiz/${quiz.public_token}`;


        try {

            await navigator.clipboard.writeText(
                link
            );

            showMessage(
                "Reusable quiz link copied successfully."
            );

        } catch {

            try {

                const textarea =
                    document.createElement(
                        "textarea"
                    );

                textarea.value = link;

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

                showMessage(
                    "Reusable quiz link copied successfully."
                );

            } catch {

                showMessage(
                    "Unable to copy quiz link."
                );
            }
        }
    };


    /* ======================================================================
       EMAIL SETTINGS
    ====================================================================== */

    const openEmailSettings = () => {

        if (!selected?.id) {

            showMessage(
                "Please select a quiz first."
            );

            return;
        }

        navigate(
            `/quiz/email-settings?quizId=${selected.id}`
        );
    };


    const sendQuizEmail = () => {

        if (!selected?.id) {

            showMessage(
                "Please select a quiz first."
            );

            return;
        }

        openEmailSettings();
    };


    /* ======================================================================
       CREATE / EDIT QUIZ
    ====================================================================== */

    const saveQuiz = async (event) => {

        event.preventDefault();

        setSaving(true);

        try {

            let response;

            if (quizForm?.id) {

                response =
                    await axios.put(
                        `/api/quiz/${quizForm.id}`,
                        quizForm
                    );

            } else {

                response =
                    await axios.post(
                        "/api/quiz",
                        quizForm
                    );
            }


            const savedQuiz =
                getResponseData(response);


            setShowQuiz(false);

            setQuizForm({
                ...emptyQuiz
            });


            await load();


            if (savedQuiz?.id) {

                await openQuiz(
                    savedQuiz.id
                );
            }


            showMessage(
                "Quiz saved successfully."
            );

        } catch (error) {

            console.error(
                "Save quiz error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Unable to save quiz"
            );

        } finally {

            setSaving(false);
        }
    };


    /* ======================================================================
       DELETE QUIZ
    ====================================================================== */

    const deleteQuiz = async (id) => {

        if (
            !window.confirm(
                "Delete this quiz and all of its questions/submissions?"
            )
        ) {
            return;
        }

        try {

            await axios.delete(
                `/api/quiz/${id}`
            );

            setSelected(null);

            await load();

            showMessage(
                "Quiz deleted successfully."
            );

        } catch (error) {

            console.error(
                "Delete quiz error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Unable to delete quiz"
            );
        }
    };


    /* ======================================================================
       OPEN ADD QUESTION
    ====================================================================== */

    const openAddQuestion = () => {

        setEditingQuestion(null);

        setImageFile(null);

        setVideoFile(null);

        setQuestionForm({
            ...emptyQuestion,
            options: [
                "",
                ""
            ]
        });

        setShowQuestion(true);
    };


    /* ======================================================================
       QUESTION TYPE CHANGE
    ====================================================================== */

    const changeQuestionType = (type) => {

        let options =
            questionForm.options || [];

        let correctAnswer =
            questionForm.correct_answer || "";


        if (type === "true_false") {

            options = [
                "True",
                "False"
            ];

            correctAnswer = "";

        } else if (type === "text") {

            options = [];

            correctAnswer = "";

        } else {

            if (!options.length) {

                options = [
                    "",
                    ""
                ];
            }
        }


        setQuestionForm({
            ...questionForm,
            question_type: type,
            options,
            correct_answer:
                correctAnswer
        });
    };


    /* ======================================================================
       UPDATE OPTION
    ====================================================================== */

    const updateOption = (
        index,
        value
    ) => {

        const options = [
            ...(questionForm.options || [])
        ];

        options[index] = value;

        setQuestionForm({
            ...questionForm,
            options
        });
    };


    /* ======================================================================
       ADD OPTION
    ====================================================================== */

    const addOption = () => {

        setQuestionForm({
            ...questionForm,
            options: [
                ...(questionForm.options || []),
                ""
            ]
        });
    };


    /* ======================================================================
       REMOVE OPTION
    ====================================================================== */

    const removeOption = (index) => {

        const options =
            (questionForm.options || [])
                .filter(
                    (_, optionIndex) =>
                        optionIndex !== index
                );

        setQuestionForm({
            ...questionForm,
            options
        });
    };


    /* ======================================================================
       SAVE QUESTION
    ====================================================================== */

    const saveQuestion = async (event) => {

        event.preventDefault();

        if (!selected?.id) {

            showMessage(
                "Please select a quiz first."
            );

            return;
        }


        const cleanedOptions =
            questionForm.question_type === "text"
                ? []
                : (
                    questionForm.options || []
                )
                    .map((value) =>
                        String(value).trim()
                    )
                    .filter(Boolean);


        if (
            questionForm.question_type !== "text" &&
            questionForm.question_type !== "true_false" &&
            cleanedOptions.length < 2
        ) {

            showMessage(
                "Please add at least two options."
            );

            return;
        }


        let correctAnswer =
            questionForm.correct_answer;


        if (
            questionForm.question_type ===
            "multiple_choice"
        ) {

            correctAnswer =
                String(
                    questionForm.correct_answer ||
                    ""
                )
                    .split(",")
                    .map((value) =>
                        value.trim()
                    )
                    .filter(Boolean);
        }


        const payload = {

            ...questionForm,

            options:
                cleanedOptions,

            correct_answer:
                correctAnswer,

        };


        /*
         * Image / video file information.
         *
         * The existing API accepts URL fields.
         * If your backend already has upload endpoints,
         * connect those endpoints here.
         */

        if (imageFile) {

            payload.image_file_name =
                imageFile.name;
        }

        if (videoFile) {

            payload.video_file_name =
                videoFile.name;
        }


        setSaving(true);

        try {

            if (editingQuestion) {

                await axios.put(
                    `/api/quiz/${selected.id}/questions/${editingQuestion.id}`,
                    payload
                );

            } else {

                await axios.post(
                    `/api/quiz/${selected.id}/questions`,
                    payload
                );
            }


            const detail =
                await axios.get(
                    `/api/quiz/${selected.id}`
                );


            setSelected(
                getResponseData(detail)
            );


            setShowQuestion(false);

            setEditingQuestion(null);

            setImageFile(null);

            setVideoFile(null);

            setQuestionForm({
                ...emptyQuestion
            });


            showMessage(
                "Question saved successfully."
            );

        } catch (error) {

            console.error(
                "Save question error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Unable to save question"
            );

        } finally {

            setSaving(false);
        }
    };


    /* ======================================================================
       EDIT QUESTION
    ====================================================================== */

    const editQuestion = (question) => {

        setEditingQuestion(
            question
        );

        setImageFile(null);

        setVideoFile(null);


        setQuestionForm({

            ...emptyQuestion,

            ...question,

            options:
                question?.options?.length
                    ? question.options
                    : (
                        question?.question_type ===
                        "text"
                            ? []
                            : [
                                "",
                                ""
                            ]
                    ),

            correct_answer:
                Array.isArray(
                    question?.correct_answer
                )
                    ? question.correct_answer.join(
                        ", "
                    )
                    : (
                        question?.correct_answer ||
                        ""
                    ),

        });


        setShowQuestion(true);
    };


    /* ======================================================================
       DELETE QUESTION
    ====================================================================== */

    const deleteQuestion = async (id) => {

        if (
            !window.confirm(
                "Delete this question?"
            )
        ) {
            return;
        }


        try {

            await axios.delete(
                `/api/quiz/${selected.id}/questions/${id}`
            );


            const detail =
                await axios.get(
                    `/api/quiz/${selected.id}`
                );


            setSelected(
                getResponseData(detail)
            );


            showMessage(
                "Question deleted successfully."
            );

        } catch (error) {

            console.error(
                "Delete question error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Unable to delete question"
            );
        }
    };


    /* ======================================================================
       DELETE ALL QUESTIONS
    ====================================================================== */

    const deleteAllQuestions = async () => {

        if (!selected?.id) {
            return;
        }

        const questions =
            selected.questions || [];

        if (!questions.length) {

            showMessage(
                "There are no questions to delete."
            );

            return;
        }


        if (
            !window.confirm(
                `Delete all ${questions.length} questions from this quiz?`
            )
        ) {
            return;
        }


        setSaving(true);

        try {

            /*
             * Delete individually because the existing
             * route already supports:
             *
             * DELETE /api/quiz/:id/questions/:questionId
             */

            for (
                const question
                of questions
            ) {

                await axios.delete(
                    `/api/quiz/${selected.id}/questions/${question.id}`
                );
            }


            const detail =
                await axios.get(
                    `/api/quiz/${selected.id}`
                );


            setSelected(
                getResponseData(detail)
            );


            showMessage(
                "All questions deleted successfully."
            );

        } catch (error) {

            console.error(
                "Delete all questions error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Unable to delete all questions"
            );

        } finally {

            setSaving(false);
        }
    };


    /* ======================================================================
       GENERATE QUESTION WITH AI
    ====================================================================== */

    const generateWithAI = async () => {

        if (
            !questionForm.question_text?.trim()
        ) {

            showMessage(
                "Enter a question/topic first so AI can generate the content."
            );

            return;
        }


        setGeneratingAI(true);


        try {

            const response =
                await axios.post(
                    AI_GENERATE_ENDPOINT,
                    {
                        question_text:
                            questionForm.question_text,

                        question_type:
                            questionForm.question_type,

                        options:
                            questionForm.options,

                        guideline:
                            questionForm.guideline,

                        points:
                            questionForm.points,

                        quiz_id:
                            selected?.id,
                    }
                );


            const result =
                getResponseData(response) || {};


            const generatedQuestion =
                result?.question ||
                result;


            const generatedOptions =
                Array.isArray(
                    generatedQuestion?.options
                )
                    ? generatedQuestion.options
                    : questionForm.options;


            let generatedCorrect =
                generatedQuestion?.correct_answer ??
                questionForm.correct_answer;


            if (
                Array.isArray(
                    generatedCorrect
                )
            ) {

                generatedCorrect =
                    generatedCorrect.join(
                        ", "
                    );
            }


            setQuestionForm({

                ...questionForm,

                question_text:
                    generatedQuestion?.question_text ||
                    questionForm.question_text,

                question_type:
                    generatedQuestion?.question_type ||
                    questionForm.question_type,

                options:
                    questionForm.question_type ===
                    "text"
                        ? []
                        : generatedOptions,

                correct_answer:
                    generatedCorrect,

                points:
                    generatedQuestion?.points ??
                    questionForm.points,

                guideline:
                    generatedQuestion?.guideline ??
                    questionForm.guideline,

            });


            showMessage(
                "Question generated with AI."
            );

        } catch (error) {

            console.error(
                "AI generation error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "AI generation failed. Check the AI API endpoint."
            );

        } finally {

            setGeneratingAI(false);
        }
    };


    /* ======================================================================
       BULK GENERATE
    ====================================================================== */

    const openBulkGenerate = () => {

        setBulkText("");

        setShowBulkModal(true);
    };


    const bulkGenerateQuestions = async () => {

        if (!selected?.id) {

            showMessage(
                "Please select a quiz first."
            );

            return;
        }


        const lines =
            bulkText
                .split("\n")
                .map((line) =>
                    line.trim()
                )
                .filter(Boolean);


        if (!lines.length) {

            showMessage(
                "Enter at least one question."
            );

            return;
        }


        setBulkGenerating(true);


        try {

            for (
                const questionText
                of lines
            ) {

                await axios.post(
                    `/api/quiz/${selected.id}/questions`,
                    {
                        ...emptyQuestion,

                        question_text:
                            questionText,

                        question_type:
                            "single_choice",

                        options: [
                            "",
                            ""
                        ],

                        correct_answer:
                            "",

                        points:
                            1,

                        is_mandatory:
                            true,

                        guideline:
                            "",
                    }
                );
            }


            const detail =
                await axios.get(
                    `/api/quiz/${selected.id}`
                );


            setSelected(
                getResponseData(detail)
            );


            setShowBulkModal(false);

            setBulkText("");


            showMessage(
                `${lines.length} questions generated successfully.`
            );

        } catch (error) {

            console.error(
                "Bulk generate error:",
                error
            );

            showMessage(
                error?.response?.data?.message ||
                "Bulk generation failed."
            );

        } finally {

            setBulkGenerating(false);
        }
    };


    /* ======================================================================
       TOTAL POINTS
    ====================================================================== */

    const totalPoints =
        useMemo(() => {

            return (
                selected?.questions || []
            ).reduce(
                (sum, question) =>
                    sum +
                    Number(
                        question?.points || 0
                    ),
                0
            );

        }, [selected]);


    /* ======================================================================
       RENDER
    ====================================================================== */

    return (

        <div className="quiz-page">


            {/* ==============================================================
                PAGE HEADER
            ============================================================== */}

            <div
                className="quiz-page-header"
                style={{
                    marginBottom: "18px"
                }}
            >

                <div>

                    <div className="quiz-eyebrow">
                        TRAINING & ASSESSMENT
                    </div>

                    <h1>
                        Quiz Setup
                    </h1>

                    <p>
                        Create reusable assessments,
                        manage questions and control access.
                    </p>

                </div>


                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap"
                    }}
                >

                    <button
                        type="button"
                        className="quiz-secondary"
                        onClick={() =>
                            navigate(
                                "/quiz/email-settings"
                            )
                        }
                    >

                        <FaEnvelope />

                        Email Settings

                    </button>


                    <button
                        type="button"
                        className="quiz-primary"
                        onClick={() => {

                            setQuizForm({
                                ...emptyQuiz
                            });

                            setShowQuiz(true);

                        }}
                    >

                        <FaPlus />

                        Create Quiz

                    </button>

                </div>

            </div>


            {/* ==============================================================
                MESSAGE
            ============================================================== */}

            {message && (

                <div className="quiz-toast">

                    <span>
                        {message}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setMessage("")
                        }
                    >

                        <FaTimes />

                    </button>

                </div>

            )}


            {/* ==============================================================
                GLOBAL SEARCH
            ============================================================== */}

            <div
                style={{
                    marginBottom: "14px",
                    display: "flex",
                    justifyContent: "flex-end"
                }}
            >

                <div
                    style={{
                        position: "relative",
                        width: "430px",
                        maxWidth: "100%"
                    }}
                >

                    <FaSearch
                        style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform:
                                "translateY(-50%)",
                            opacity: 0.5
                        }}
                    />

                    <input
                        value={searchQuestion}
                        onChange={(e) =>
                            setSearchQuestion(
                                e.target.value
                            )
                        }
                        placeholder="Search all categories and questions..."
                        style={{
                            width: "100%",
                            padding:
                                "12px 14px 12px 40px",
                            border:
                                "1px solid #d7d3e5",
                            borderRadius:
                                "5px",
                            outline: "none",
                            boxSizing:
                                "border-box"
                        }}
                    />

                </div>

            </div>


            {/* ==============================================================
                MAIN SCREEN
            ============================================================== */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "310px minmax(0, 1fr)",
                    gap: "18px",
                    alignItems: "start"
                }}
            >


                {/* ==========================================================
                    CATEGORIES
                ========================================================== */}

                <section
                    className="quiz-panel"
                    style={{
                        minHeight: "620px"
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            alignItems: "center",
                            padding:
                                "14px 14px 10px",
                            borderBottom:
                                "1px solid #ece9f2"
                        }}
                    >

                        <strong>
                            Categories
                        </strong>


                        <div
                            style={{
                                display: "flex",
                                gap: "6px"
                            }}
                        >

                            <button
                                type="button"
                                className="quiz-danger ghost"
                                style={{
                                    fontSize:
                                        "12px",
                                    padding:
                                        "7px 9px"
                                }}
                                onClick={() => {

                                    if (!selected) {

                                        showMessage(
                                            "Select a quiz first."
                                        );

                                        return;
                                    }

                                    deleteQuiz(
                                        selected.id
                                    );

                                }}
                            >
                                Delete All
                            </button>


                            <button
                                type="button"
                                className="quiz-primary"
                                style={{
                                    minWidth:
                                        "36px",
                                    padding:
                                        "7px 10px"
                                }}
                                onClick={() => {

                                    setQuizForm({
                                        ...emptyQuiz
                                    });

                                    setShowQuiz(true);

                                }}
                                title="Create category / quiz"
                            >
                                <FaPlus />
                            </button>

                        </div>

                    </div>


                    {/* CATEGORY SEARCH */}

                    <div
                        style={{
                            padding:
                                "10px 14px"
                        }}
                    >

                        <div
                            style={{
                                position:
                                    "relative"
                            }}
                        >

                            <FaSearch
                                style={{
                                    position:
                                        "absolute",
                                    left: "11px",
                                    top: "50%",
                                    transform:
                                        "translateY(-50%)",
                                    opacity: 0.5,
                                    fontSize:
                                        "13px"
                                }}
                            />

                            <input
                                value={searchQuiz}
                                onChange={(e) =>
                                    setSearchQuiz(
                                        e.target.value
                                    )
                                }
                                placeholder="Search categories..."
                                style={{
                                    width: "100%",
                                    boxSizing:
                                        "border-box",
                                    padding:
                                        "9px 10px 9px 32px",
                                    border:
                                        "1px solid #ddd8e8",
                                    borderRadius:
                                        "4px"
                                }}
                            />

                        </div>

                    </div>


                    {/* CATEGORY LIST */}

                    <div
                        style={{
                            padding:
                                "0 8px 12px",
                            maxHeight:
                                "540px",
                            overflowY:
                                "auto"
                        }}
                    >

                        {loading ? (

                            <div
                                className="quiz-empty"
                            >
                                Loading...
                            </div>

                        ) : filteredQuizzes.length === 0 ? (

                            <div
                                className="quiz-empty"
                            >

                                <FaQuestionCircle />

                                <strong>
                                    No categories
                                </strong>

                                <span>
                                    Create your first assessment.
                                </span>

                            </div>

                        ) : (

                            filteredQuizzes.map(
                                (quiz) => (

                                    <div
                                        key={quiz.id}
                                        onClick={() =>
                                            openQuiz(
                                                quiz.id
                                            )
                                        }
                                        style={{
                                            cursor:
                                                "pointer",
                                            padding:
                                                "12px 10px",
                                            marginBottom:
                                                "5px",
                                            borderRadius:
                                                "4px",
                                            background:
                                                selected?.id ===
                                                quiz.id
                                                    ? "#a696d0"
                                                    : "#fff",
                                            color:
                                                selected?.id ===
                                                quiz.id
                                                    ? "#fff"
                                                    : "#20202a",
                                            border:
                                                "1px solid " +
                                                (
                                                    selected?.id ===
                                                    quiz.id
                                                        ? "#9482c5"
                                                        : "#eeeaf4"
                                                )
                                        }}
                                    >

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "space-between",
                                                gap:
                                                    "8px"
                                            }}
                                        >

                                            <div
                                                style={{
                                                    minWidth:
                                                        0
                                                }}
                                            >

                                                <strong
                                                    style={{
                                                        display:
                                                            "block",
                                                        whiteSpace:
                                                            "nowrap",
                                                        overflow:
                                                            "hidden",
                                                        textOverflow:
                                                            "ellipsis"
                                                    }}
                                                >
                                                    {quiz.name}
                                                </strong>


                                                <small
                                                    style={{
                                                        opacity:
                                                            0.8
                                                    }}
                                                >
                                                    {
                                                        quiz.question_count ??
                                                        0
                                                    }{" "}
                                                    Questions
                                                </small>

                                            </div>


                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    gap:
                                                        "5px",
                                                    alignItems:
                                                        "center"
                                                }}
                                            >

                                                <button
                                                    type="button"
                                                    onClick={(e) => {

                                                        e.stopPropagation();

                                                        setQuizForm({
                                                            ...quiz
                                                        });

                                                        setShowQuiz(
                                                            true
                                                        );

                                                    }}
                                                    style={{
                                                        border:
                                                            "none",
                                                        background:
                                                            "transparent",
                                                        color:
                                                            selected?.id ===
                                                            quiz.id
                                                                ? "#fff"
                                                                : "#2969d8",
                                                        cursor:
                                                            "pointer"
                                                    }}
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={(e) => {

                                                        e.stopPropagation();

                                                        deleteQuiz(
                                                            quiz.id
                                                        );

                                                    }}
                                                    style={{
                                                        border:
                                                            "none",
                                                        background:
                                                            "transparent",
                                                        color:
                                                            selected?.id ===
                                                            quiz.id
                                                                ? "#fff"
                                                                : "#e53935",
                                                        cursor:
                                                            "pointer"
                                                    }}
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>

                                            </div>

                                        </div>

                                    </div>

                                )
                            )

                        )}

                    </div>

                </section>


                {/* ==========================================================
                    QUESTIONS PANEL
                ========================================================== */}

                <section
                    className="quiz-panel"
                    style={{
                        minHeight: "620px"
                    }}
                >

                    {!selected ? (

                        <div
                            className="quiz-empty large"
                            style={{
                                minHeight:
                                    "580px"
                            }}
                        >

                            <FaQuestionCircle />

                            <h2>
                                Select an assessment
                            </h2>

                            <p>
                                Choose a quiz from the
                                left to manage its
                                settings and questions.
                            </p>

                        </div>

                    ) : (

                        <>

                            {/* ==================================================
                                QUESTIONS HEADER
                            ================================================== */}

                            <div
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems:
                                        "center",
                                    gap:
                                        "12px",
                                    padding:
                                        "16px",
                                    borderBottom:
                                        "1px solid #e7e3ef",
                                    flexWrap:
                                        "wrap"
                                }}
                            >

                                <div>

                                    <h2
                                        style={{
                                            margin:
                                                0,
                                            fontSize:
                                                "17px"
                                        }}
                                    >

                                        Questions for:{" "}

                                        <span
                                            style={{
                                                color:
                                                    "#e95b29"
                                            }}
                                        >
                                            {selected.name}
                                        </span>

                                    </h2>

                                    <small
                                        style={{
                                            color:
                                                "#777"
                                        }}
                                    >
                                        {
                                            selected.questions
                                                ?.length ||
                                            0
                                        }{" "}
                                        questions ·{" "}
                                        {totalPoints} total points
                                    </small>

                                </div>


                                <div
                                    style={{
                                        display:
                                            "flex",
                                        gap:
                                            "7px",
                                        flexWrap:
                                            "wrap"
                                    }}
                                >

                                    <button
                                        type="button"
                                        className="quiz-danger"
                                        onClick={
                                            deleteAllQuestions
                                        }
                                    >
                                        Delete All Questions
                                    </button>


                                    <button
                                        type="button"
                                        className="quiz-secondary"
                                        onClick={
                                            openBulkGenerate
                                        }
                                    >
                                        <FaMagic />

                                        Bulk Generate
                                    </button>


                                    <button
                                        type="button"
                                        className="quiz-primary"
                                        onClick={
                                            openAddQuestion
                                        }
                                    >
                                        <FaPlus />

                                        Add Question
                                    </button>

                                </div>

                            </div>


                            {/* ==================================================
                                QUESTION SEARCH
                            ================================================== */}

                            <div
                                style={{
                                    padding:
                                        "12px 16px 4px"
                                }}
                            >

                                <div
                                    style={{
                                        position:
                                            "relative"
                                    }}
                                >

                                    <FaSearch
                                        style={{
                                            position:
                                                "absolute",
                                            left:
                                                "12px",
                                            top:
                                                "50%",
                                            transform:
                                                "translateY(-50%)",
                                            opacity:
                                                0.5
                                        }}
                                    />

                                    <input
                                        value={
                                            searchQuestion
                                        }
                                        onChange={(e) =>
                                            setSearchQuestion(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Search questions..."
                                        style={{
                                            width:
                                                "100%",
                                            boxSizing:
                                                "border-box",
                                            padding:
                                                "10px 12px 10px 35px",
                                            border:
                                                "1px solid #ddd8e8",
                                            borderRadius:
                                                "5px"
                                        }}
                                    />

                                </div>

                            </div>


                            {/* ==================================================
                                QUESTION LIST
                            ================================================== */}

                            <div
                                style={{
                                    padding:
                                        "10px 16px 18px"
                                }}
                            >

                                {filteredQuestions.length ===
                                0 ? (

                                    <div
                                        className="quiz-empty"
                                        style={{
                                            minHeight:
                                                "400px"
                                        }}
                                    >

                                        <FaQuestionCircle />

                                        <strong>
                                            No questions yet
                                        </strong>

                                        <span>
                                            Add your first
                                            question.
                                        </span>

                                        <button
                                            type="button"
                                            className="quiz-primary"
                                            onClick={
                                                openAddQuestion
                                            }
                                            style={{
                                                marginTop:
                                                    "10px"
                                            }}
                                        >
                                            <FaPlus />
                                            Add Question
                                        </button>

                                    </div>

                                ) : (

                                    filteredQuestions.map(
                                        (
                                            question,
                                            index
                                        ) => (

                                            <div
                                                key={
                                                    question.id
                                                }
                                                style={{
                                                    display:
                                                        "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems:
                                                        "center",
                                                    gap:
                                                        "15px",
                                                    padding:
                                                        "14px",
                                                    marginBottom:
                                                        "8px",
                                                    border:
                                                        "1px solid #e5e2eb",
                                                    borderRadius:
                                                        "7px",
                                                    background:
                                                        "#fff"
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        minWidth:
                                                            0,
                                                        flex:
                                                            1
                                                    }}
                                                >

                                                    <h4
                                                        style={{
                                                            margin:
                                                                0,
                                                            lineHeight:
                                                                1.5,
                                                            fontSize:
                                                                "14px"
                                                        }}
                                                    >

                                                        {index + 1}.{" "}

                                                        {question.question_text}

                                                    </h4>


                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            gap:
                                                                "8px",
                                                            flexWrap:
                                                                "wrap",
                                                            marginTop:
                                                                "7px"
                                                        }}
                                                    >

                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    "11px",
                                                                color:
                                                                    "#666"
                                                            }}
                                                        >
                                                            {questionTypeLabel(
                                                                question.question_type
                                                            )}
                                                        </span>


                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    "11px",
                                                                color:
                                                                    "#666"
                                                            }}
                                                        >
                                                            {question.points ||
                                                                0}{" "}
                                                            point
                                                        </span>


                                                        {question.is_mandatory ? (

                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        "11px",
                                                                    color:
                                                                        "#e53935",
                                                                    fontWeight:
                                                                        600
                                                                }}
                                                            >
                                                                Mandatory
                                                            </span>

                                                        ) : null}

                                                    </div>


                                                    {question.options
                                                        ?.length ? (

                                                        <div
                                                            style={{
                                                                display:
                                                                    "flex",
                                                                flexWrap:
                                                                    "wrap",
                                                                gap:
                                                                    "5px",
                                                                marginTop:
                                                                    "8px"
                                                            }}
                                                        >

                                                            {question.options.map(
                                                                (
                                                                    option,
                                                                    optionIndex
                                                                ) => (

                                                                    <span
                                                                        key={
                                                                            optionIndex
                                                                        }
                                                                        style={{
                                                                            padding:
                                                                                "4px 8px",
                                                                            border:
                                                                                "1px solid #e5e1ed",
                                                                            borderRadius:
                                                                                "4px",
                                                                            fontSize:
                                                                                "11px",
                                                                            background:
                                                                                "#faf9fc"
                                                                        }}
                                                                    >
                                                                        {
                                                                            option
                                                                        }
                                                                    </span>

                                                                )
                                                            )}

                                                        </div>

                                                    ) : null}

                                                </div>


                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        gap:
                                                            "8px",
                                                        flexShrink:
                                                            0
                                                    }}
                                                >

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            editQuestion(
                                                                question
                                                            )
                                                        }
                                                        style={{
                                                            border:
                                                                "none",
                                                            background:
                                                                "transparent",
                                                            color:
                                                                "#2563eb",
                                                            cursor:
                                                                "pointer"
                                                        }}
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteQuestion(
                                                                question.id
                                                            )
                                                        }
                                                        style={{
                                                            border:
                                                                "none",
                                                            background:
                                                                "transparent",
                                                            color:
                                                                "#e53935",
                                                            cursor:
                                                                "pointer"
                                                        }}
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </div>

                                        )
                                    )

                                )}

                            </div>

                        </>

                    )}

                </section>

            </div>


            {/* =================================================================
                CREATE / EDIT QUIZ MODAL
            ================================================================= */}

            {showQuiz && (

                <div className="quiz-modal-backdrop">

                    <form
                        className="quiz-modal"
                        onSubmit={
                            saveQuiz
                        }
                    >

                        <div className="quiz-modal-head">

                            <div>

                                <span>
                                    ASSESSMENT CONFIGURATION
                                </span>

                                <h2>
                                    {quizForm?.id
                                        ? "Edit Quiz"
                                        : "Create Quiz"}
                                </h2>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setShowQuiz(
                                        false
                                    )
                                }
                            >
                                <FaTimes />
                            </button>

                        </div>


                        <div className="quiz-form-grid">

                            <label className="full">

                                Quiz Name

                                <input
                                    required
                                    value={
                                        quizForm.name
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            name:
                                                e.target.value
                                        })
                                    }
                                    placeholder="e.g. Mi Arcus EOSS & BOGO Offer Quiz"
                                />

                            </label>


                            <label className="full">

                                Description

                                <textarea
                                    value={
                                        quizForm.description ||
                                        ""
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            description:
                                                e.target.value
                                        })
                                    }
                                    placeholder="Briefly describe the assessment"
                                />

                            </label>


                            <label>

                                Passing Score (%)

                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                        quizForm.passing_score
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            passing_score:
                                                e.target.value
                                        })
                                    }
                                />

                            </label>


                            <label>

                                Time Limit (minutes)

                                <input
                                    type="number"
                                    min="1"
                                    value={
                                        quizForm.time_limit_minutes ||
                                        ""
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            time_limit_minutes:
                                                e.target.value
                                        })
                                    }
                                    placeholder="Unlimited"
                                />

                            </label>


                            <label>

                                Attempts Allowed

                                <input
                                    type="number"
                                    min="0"
                                    value={
                                        quizForm.attempts_allowed
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            attempts_allowed:
                                                e.target.value
                                        })
                                    }
                                />

                            </label>


                            <label>

                                Status

                                <select
                                    value={
                                        quizForm.status
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            status:
                                                e.target.value
                                        })
                                    }
                                >

                                    <option value="Active">
                                        Active
                                    </option>

                                    <option value="Inactive">
                                        Inactive
                                    </option>

                                </select>

                            </label>

                        </div>


                        <div className="quiz-checks">

                            <label>

                                <input
                                    type="checkbox"
                                    checked={
                                        !!quizForm.require_camera
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            require_camera:
                                                e.target.checked
                                        })
                                    }
                                />

                                Camera verification

                            </label>


                            <label>

                                <input
                                    type="checkbox"
                                    checked={
                                        !!quizForm.require_location
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            require_location:
                                                e.target.checked
                                        })
                                    }
                                />

                                Location verification

                            </label>


                            <label>

                                <input
                                    type="checkbox"
                                    checked={
                                        !!quizForm.require_email_consent
                                    }
                                    onChange={(e) =>
                                        setQuizForm({
                                            ...quizForm,
                                            require_email_consent:
                                                e.target.checked
                                        })
                                    }
                                />

                                Email consent

                            </label>

                        </div>


                        <div className="quiz-modal-footer">

                            <button
                                type="button"
                                className="quiz-secondary"
                                onClick={() =>
                                    setShowQuiz(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>


                            <button
                                className="quiz-primary"
                                disabled={
                                    saving
                                }
                            >

                                <FaSave />

                                {saving
                                    ? "Saving..."
                                    : "Save Quiz"}

                            </button>

                        </div>

                    </form>

                </div>

            )}


            {/* =================================================================
                ADD / EDIT QUESTION MODAL
            ================================================================= */}

            {showQuestion && (

                <div
                    className="quiz-modal-backdrop"
                    style={{
                        alignItems:
                            "flex-start",
                        paddingTop:
                            "25px"
                    }}
                >

                    <form
                        className="quiz-modal wide"
                        onSubmit={
                            saveQuestion
                        }
                        style={{
                            maxHeight:
                                "92vh",
                            overflowY:
                                "auto"
                        }}
                    >

                        {/* =====================================================
                            MODAL HEADER
                        ===================================================== */}

                        <div className="quiz-modal-head">

                            <div>

                                <span>
                                    QUESTION BUILDER
                                </span>

                                <h2>
                                    {editingQuestion
                                        ? "Edit Question"
                                        : "Add Question"}
                                </h2>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setShowQuestion(
                                        false
                                    )
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        {/* =====================================================
                            QUESTION TYPE
                        ===================================================== */}

                        <div
                            style={{
                                padding:
                                    "0 0 5px"
                            }}
                        >

                            <label
                                style={{
                                    display:
                                        "block",
                                    fontWeight:
                                        600,
                                    marginBottom:
                                        "8px"
                                }}
                            >
                                Question Type
                            </label>


                            <select
                                value={
                                    questionForm.question_type
                                }
                                onChange={(e) =>
                                    changeQuestionType(
                                        e.target.value
                                    )
                                }
                                style={{
                                    width:
                                        "100%",
                                    padding:
                                        "11px",
                                    border:
                                        "1px solid #d8d4e2",
                                    borderRadius:
                                        "5px",
                                    fontSize:
                                        "15px"
                                }}
                            >

                                <option value="single_choice">
                                    Single Choice (Radio)
                                </option>

                                <option value="multiple_choice">
                                    Multiple Choice (Checkbox)
                                </option>

                                <option value="text">
                                    Text Input (Manual scoring in Training Report)
                                </option>

                                <option value="true_false">
                                    True / False
                                </option>

                            </select>

                        </div>


                        {/* =====================================================
                            QUESTION TEXT
                        ===================================================== */}

                        <div
                            style={{
                                marginTop:
                                    "15px"
                            }}
                        >

                            <label
                                style={{
                                    display:
                                        "block",
                                    fontWeight:
                                        600,
                                    marginBottom:
                                        "8px"
                                }}
                            >
                                Question
                            </label>


                            <textarea
                                required
                                value={
                                    questionForm.question_text
                                }
                                onChange={(e) =>
                                    setQuestionForm({
                                        ...questionForm,
                                        question_text:
                                            e.target.value
                                    })
                                }
                                placeholder="Enter the question text..."
                                rows={4}
                                style={{
                                    width:
                                        "100%",
                                    boxSizing:
                                        "border-box",
                                    resize:
                                        "vertical",
                                    padding:
                                        "11px",
                                    border:
                                        "1px solid #d8d4e2",
                                    borderRadius:
                                        "5px"
                                }}
                            />

                        </div>


                        {/* =====================================================
                            AI GENERATE
                        ===================================================== */}

                        <div
                            style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "flex-end",
                                marginTop:
                                    "10px"
                            }}
                        >

                            <button
                                type="button"
                                onClick={
                                    generateWithAI
                                }
                                disabled={
                                    generatingAI
                                }
                                style={{
                                    display:
                                        "inline-flex",
                                    alignItems:
                                        "center",
                                    gap:
                                        "7px",
                                    padding:
                                        "8px 14px",
                                    border:
                                        "2px solid #9a82c9",
                                    borderRadius:
                                        "7px",
                                    background:
                                        "#fff",
                                    color:
                                        "#8064b8",
                                    fontWeight:
                                        600,
                                    cursor:
                                        generatingAI
                                            ? "not-allowed"
                                            : "pointer"
                                }}
                            >

                                <FaMagic />

                                {generatingAI
                                    ? "Generating..."
                                    : "Generate with AI"}

                            </button>

                        </div>


                        {/* =====================================================
                            OPTIONS & SCORING
                        ===================================================== */}

                        {questionForm.question_type !==
                            "text" && (

                            <div
                                style={{
                                    marginTop:
                                        "20px"
                                }}
                            >

                                <h3
                                    style={{
                                        margin:
                                            "0 0 10px",
                                        fontSize:
                                            "16px"
                                    }}
                                >
                                    Options & Scoring (0-5)
                                </h3>


                                {(questionForm.options || [])
                                    .map(
                                        (
                                            option,
                                            index
                                        ) => (

                                            <div
                                                key={
                                                    index
                                                }
                                                style={{
                                                    display:
                                                        "grid",
                                                    gridTemplateColumns:
                                                        "20px minmax(0,1fr) 80px 25px",
                                                    gap:
                                                        "8px",
                                                    alignItems:
                                                        "center",
                                                    marginBottom:
                                                        "9px"
                                                }}
                                            >

                                                {/* RADIO / CHECKBOX */}

                                                <input
                                                    type={
                                                        questionForm.question_type ===
                                                        "multiple_choice"
                                                            ? "checkbox"
                                                            : "radio"
                                                    }
                                                    name={
                                                        questionForm.question_type ===
                                                        "multiple_choice"
                                                            ? `correct-${index}`
                                                            : "correct-option"
                                                    }
                                                    checked={
                                                        questionForm.question_type ===
                                                        "multiple_choice"
                                                            ? String(
                                                                questionForm.correct_answer ||
                                                                ""
                                                            )
                                                                .split(
                                                                    ","
                                                                )
                                                                .map(
                                                                    x =>
                                                                        x.trim()
                                                                )
                                                                .includes(
                                                                    option
                                                                )
                                                            : questionForm.correct_answer ===
                                                                option
                                                    }
                                                    onChange={() => {

                                                        if (
                                                            questionForm.question_type ===
                                                            "multiple_choice"
                                                        ) {

                                                            const existing =
                                                                String(
                                                                    questionForm.correct_answer ||
                                                                    ""
                                                                )
                                                                    .split(
                                                                        ","
                                                                    )
                                                                    .map(
                                                                        x =>
                                                                            x.trim()
                                                                    )
                                                                    .filter(
                                                                        Boolean
                                                                    );


                                                            const next =
                                                                existing.includes(
                                                                    option
                                                                )
                                                                    ? existing.filter(
                                                                        x =>
                                                                            x !==
                                                                            option
                                                                    )
                                                                    : [
                                                                        ...existing,
                                                                        option
                                                                    ];


                                                            setQuestionForm({
                                                                ...questionForm,
                                                                correct_answer:
                                                                    next.join(
                                                                        ", "
                                                                    )
                                                            });

                                                        } else {

                                                            setQuestionForm({
                                                                ...questionForm,
                                                                correct_answer:
                                                                    option
                                                            });

                                                        }

                                                    }}
                                                />


                                                {/* OPTION */}

                                                <input
                                                    value={
                                                        option
                                                    }
                                                    onChange={(e) =>
                                                        updateOption(
                                                            index,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder={`Option ${
                                                        index + 1
                                                    }`}
                                                    disabled={
                                                        questionForm.question_type ===
                                                        "true_false"
                                                    }
                                                    style={{
                                                        width:
                                                            "100%",
                                                        boxSizing:
                                                            "border-box",
                                                        padding:
                                                            "10px",
                                                        border:
                                                            "1px solid #d8d4e2",
                                                        borderRadius:
                                                            "5px"
                                                    }}
                                                />


                                                {/* SCORE */}

                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="5"
                                                    step="1"
                                                    value={
                                                        index ===
                                                        0
                                                            ? questionForm.points
                                                            : 0
                                                    }
                                                    onChange={(e) => {

                                                        if (
                                                            index ===
                                                            0
                                                        ) {

                                                            setQuestionForm({
                                                                ...questionForm,
                                                                points:
                                                                    e.target.value
                                                            });

                                                        }

                                                    }}
                                                    title="Question score"
                                                    style={{
                                                        width:
                                                            "100%",
                                                        boxSizing:
                                                            "border-box",
                                                        padding:
                                                            "10px 7px",
                                                        border:
                                                            "1px solid #d8d4e2",
                                                        borderRadius:
                                                            "5px"
                                                    }}
                                                />


                                                {/* DELETE OPTION */}

                                                {questionForm.question_type !==
                                                    "true_false" &&
                                                    (questionForm.options ||
                                                        []).length >
                                                        2 ? (

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeOption(
                                                                index
                                                            )
                                                        }
                                                        style={{
                                                            border:
                                                                "none",
                                                            background:
                                                                "transparent",
                                                            color:
                                                                "#f08080",
                                                            fontSize:
                                                                "18px",
                                                            cursor:
                                                                "pointer"
                                                        }}
                                                    >
                                                        <FaTimes />
                                                    </button>

                                                ) : (

                                                    <span />

                                                )}

                                            </div>

                                        )
                                    )}


                                {questionForm.question_type !==
                                    "true_false" && (

                                    <button
                                        type="button"
                                        className="quiz-text-button"
                                        onClick={
                                            addOption
                                        }
                                    >
                                        + Add Option
                                    </button>

                                )}

                            </div>

                        )}


                        {/* =====================================================
                            TEXT INPUT INFO
                        ===================================================== */}

                        {questionForm.question_type ===
                            "text" && (

                            <div
                                style={{
                                    marginTop:
                                        "18px",
                                    padding:
                                        "12px",
                                    background:
                                        "#f7f4fc",
                                    border:
                                        "1px solid #e2daf0",
                                    borderRadius:
                                        "6px"
                                }}
                            >

                                <strong>
                                    Text Input Question
                                </strong>

                                <p
                                    style={{
                                        margin:
                                            "5px 0 0",
                                        fontSize:
                                            "12px",
                                        color:
                                            "#666"
                                    }}
                                >
                                    Participants will type
                                    their answer manually.
                                    Scoring can be completed
                                    from the Training Report.
                                </p>

                            </div>

                        )}


                        {/* =====================================================
                            POINTS / CORRECT ANSWER
                        ===================================================== */}

                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "1fr 1fr",
                                gap:
                                    "14px",
                                marginTop:
                                    "18px"
                            }}
                        >

                            <label>

                                Points

                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    step="1"
                                    value={
                                        questionForm.points
                                    }
                                    onChange={(e) =>
                                        setQuestionForm({
                                            ...questionForm,
                                            points:
                                                e.target.value
                                        })
                                    }
                                />

                            </label>


                            {questionForm.question_type !==
                                "text" && (

                                <label>

                                    Correct Answer

                                    <input
                                        value={
                                            questionForm.correct_answer
                                        }
                                        onChange={(e) =>
                                            setQuestionForm({
                                                ...questionForm,
                                                correct_answer:
                                                    e.target.value
                                            })
                                        }
                                        placeholder={
                                            questionForm.question_type ===
                                            "multiple_choice"
                                                ? "Option 1, Option 2"
                                                : "Select an option or type answer"
                                        }
                                    />

                                </label>

                            )}

                        </div>


                        {/* =====================================================
                            MANDATORY
                        ===================================================== */}

                        <label
                            style={{
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                gap:
                                    "9px",
                                marginTop:
                                    "18px",
                                fontWeight:
                                    500
                            }}
                        >

                            <input
                                type="checkbox"
                                checked={
                                    !!questionForm.is_mandatory
                                }
                                onChange={(e) =>
                                    setQuestionForm({
                                        ...questionForm,
                                        is_mandatory:
                                            e.target.checked
                                    })
                                }
                            />

                            Answer is Mandatory

                        </label>


                        <p
                            style={{
                                margin:
                                    "5px 0 15px 25px",
                                fontSize:
                                    "12px",
                                color:
                                    "#777"
                            }}
                        >
                            If enabled, users must provide an
                            answer before they can move to the
                            next question.
                        </p>


                        {/* =====================================================
                            GUIDELINE
                        ===================================================== */}

                        <div
                            style={{
                                padding:
                                    "14px",
                                background:
                                    "#eef6ff",
                                border:
                                    "1px solid #bcd8ff",
                                borderRadius:
                                    "7px",
                                marginTop:
                                    "5px"
                            }}
                        >

                            <label>

                                <strong>
                                    Assessment guidelines
                                    (optional)
                                </strong>

                                <textarea
                                    value={
                                        questionForm.guideline ||
                                        ""
                                    }
                                    onChange={(e) =>
                                        setQuestionForm({
                                            ...questionForm,
                                            guideline:
                                                e.target.value
                                        })
                                    }
                                    rows={3}
                                    placeholder="e.g., Focus on customer empathy and clarity of reasoning. Or: Evaluate for retail relevance and prioritisation."
                                    style={{
                                        marginTop:
                                            "8px",
                                        width:
                                            "100%",
                                        boxSizing:
                                            "border-box"
                                    }}
                                />

                            </label>


                            <p
                                style={{
                                    fontSize:
                                        "12px",
                                    color:
                                        "#666",
                                    margin:
                                        "7px 0 0"
                                }}
                            >
                                Helps reviewers and AI identify
                                focus areas when assessing this
                                question. Questions can be outside
                                retail; guidelines steer the analysis.
                            </p>

                        </div>


                        {/* =====================================================
                            IMAGE
                        ===================================================== */}

                        <div
                            style={{
                                marginTop:
                                    "15px",
                                padding:
                                    "14px",
                                border:
                                    "1px solid #ddd",
                                borderRadius:
                                    "7px"
                            }}
                        >

                            <strong>
                                Attach Image (Optional)
                            </strong>


                            <div
                                style={{
                                    marginTop:
                                        "9px"
                                }}
                            >

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) =>
                                        setImageFile(
                                            e.target.files?.[0] ||
                                            null
                                        )
                                    }
                                />

                            </div>


                            {imageFile && (

                                <small>
                                    Selected:{" "}
                                    {imageFile.name}
                                </small>

                            )}

                        </div>


                        {/* =====================================================
                            VIDEO
                        ===================================================== */}

                        <div
                            style={{
                                marginTop:
                                    "15px",
                                padding:
                                    "14px",
                                border:
                                    "1px solid #ddd",
                                borderRadius:
                                    "7px"
                            }}
                        >

                            <strong>
                                Attach Video (Optional)
                            </strong>


                            <input
                                value={
                                    questionForm.video_url ||
                                    ""
                                }
                                onChange={(e) =>
                                    setQuestionForm({
                                        ...questionForm,
                                        video_url:
                                            e.target.value
                                    })
                                }
                                placeholder="Paste YouTube link here"
                                style={{
                                    marginTop:
                                        "9px"
                                }}
                            />


                            <div
                                style={{
                                    textAlign:
                                        "center",
                                    margin:
                                        "12px 0",
                                    color:
                                        "#777"
                                }}
                            >
                                OR
                            </div>


                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) =>
                                    setVideoFile(
                                        e.target.files?.[0] ||
                                        null
                                    )
                                }
                            />


                            {videoFile && (

                                <small>
                                    Selected:{" "}
                                    {videoFile.name}
                                </small>

                            )}

                        </div>


                        {/* =====================================================
                            FOOTER
                        ===================================================== */}

                        <div className="quiz-modal-footer">

                            <button
                                type="button"
                                className="quiz-secondary"
                                onClick={() =>
                                    setShowQuestion(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                className="quiz-primary"
                                disabled={
                                    saving
                                }
                            >

                                <FaSave />

                                {saving
                                    ? "Saving..."
                                    : "Save Question"}

                            </button>

                        </div>

                    </form>

                </div>

            )}


            {/* =================================================================
                BULK GENERATE MODAL
            ================================================================= */}

            {showBulkModal && (

                <div className="quiz-modal-backdrop">

                    <div
                        className="quiz-modal"
                        style={{
                            maxWidth:
                                "650px"
                        }}
                    >

                        <div className="quiz-modal-head">

                            <div>

                                <span>
                                    QUESTION GENERATOR
                                </span>

                                <h2>
                                    Bulk Generate
                                </h2>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setShowBulkModal(
                                        false
                                    )
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        <p
                            style={{
                                color:
                                    "#666",
                                fontSize:
                                    "13px"
                            }}
                        >
                            Enter one question per line.
                            Each line will be added to the
                            selected assessment.
                        </p>


                        <textarea
                            rows={10}
                            value={
                                bulkText
                            }
                            onChange={(e) =>
                                setBulkText(
                                    e.target.value
                                )
                            }
                            placeholder={
                                "Question 1\nQuestion 2\nQuestion 3"
                            }
                            style={{
                                width:
                                    "100%",
                                boxSizing:
                                    "border-box",
                                padding:
                                    "12px",
                                border:
                                    "1px solid #d8d4e2",
                                borderRadius:
                                    "6px",
                                resize:
                                    "vertical"
                            }}
                        />


                        <div className="quiz-modal-footer">

                            <button
                                type="button"
                                className="quiz-secondary"
                                onClick={() =>
                                    setShowBulkModal(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="quiz-primary"
                                disabled={
                                    bulkGenerating
                                }
                                onClick={
                                    bulkGenerateQuestions
                                }
                            >

                                <FaMagic />

                                {bulkGenerating
                                    ? "Generating..."
                                    : "Bulk Generate"}

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}


export default QuizSetup;