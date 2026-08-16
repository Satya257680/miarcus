import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../axiosConfig";
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaTimes,
    FaMagic,
    FaSearch,
    FaLink,
    FaSave,
    FaChevronDown,
} from "react-icons/fa";
import "../../styles/pages/Quiz.css";

// ======================================================
// DEFAULT QUIZ
// ======================================================

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

// ======================================================
// DEFAULT QUESTION
// ======================================================

const emptyQuestion = {
    question_text: "",
    question_type: "single_choice",
    options: ["", ""],
    option_scores: [0, 0],
    correct_answer: "",
    points: 1,
    is_mandatory: true,
    guideline: "",
    image_url: "",
    video_url: "",
};

// ======================================================
// QUESTION TYPE LABEL
// ======================================================

const typeLabel = (type) => {
    if (type === "single_choice") {
        return "Single Choice (Radio)";
    }

    if (type === "multiple_choice") {
        return "Multiple Choice (Checkbox)";
    }

    if (type === "text") {
        return "Text Input (Manual scoring in Training Report)";
    }

    return String(type || "").replaceAll("_", " ");
};

// ======================================================
// RESPONSE HELPER
// ======================================================

const responseData = (response) =>
    response?.data?.data ??
    response?.data ??
    null;

// ======================================================
// NORMALIZE CORRECT ANSWER
// ======================================================

const parseStoredCorrectAnswer = (value) => {
    if (value === null || value === undefined) return value;

    let parsed = value;

    // Backends commonly return JSON arrays/strings as serialized JSON.
    // Decode them so the edit modal can restore the selected option.
    for (let i = 0; i < 3; i += 1) {
        if (typeof parsed !== "string") break;

        const text = parsed.trim();
        if (!text) return "";

        try {
            const next = JSON.parse(text);
            if (next === parsed) break;
            parsed = next;
        } catch {
            break;
        }
    }

    // Support objects returned by some API/model implementations.
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (parsed.correct_answer !== undefined) {
            return parseStoredCorrectAnswer(parsed.correct_answer);
        }
        if (parsed.answers !== undefined) {
            return parseStoredCorrectAnswer(parsed.answers);
        }
        if (parsed.answer !== undefined) {
            return parseStoredCorrectAnswer(parsed.answer);
        }
        if (parsed.value !== undefined) {
            return parseStoredCorrectAnswer(parsed.value);
        }
    }

    return parsed;
};

const getStoredCorrectAnswer = (question) => {
    if (!question) return "";

    const candidates = [
        question.correct_answer,
        question.correct_answer_json,
        question.correct_answer_value,
        question.correct_answers,
        question.correct_options
    ];

    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined) continue;

        const parsed = parseStoredCorrectAnswer(candidate);

        if (Array.isArray(parsed) && parsed.length) return parsed;
        if (!Array.isArray(parsed) && String(parsed ?? "").trim()) {
            return parsed;
        }
    }

    return "";
};

const normalizeCorrectAnswer = (
    questionType,
    correctAnswer
) => {
    const parsed = parseStoredCorrectAnswer(correctAnswer);

    if (questionType === "multiple_choice") {
        if (Array.isArray(parsed)) {
            return parsed
                .map((x) => String(x ?? "").trim())
                .filter(Boolean);
        }

        const text = String(parsed ?? "").trim();
        if (!text) return [];

        return text
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
    }

    if (Array.isArray(parsed)) {
        return String(parsed[0] ?? "").trim();
    }

    return String(parsed ?? "").trim();
};

// ======================================================
// CASE-INSENSITIVE OPTION MATCH
// ======================================================

const optionMatchesAnswer = (
    option,
    answer
) => {

    return (
        String(option || "")
            .trim()
            .toLowerCase() ===
        String(answer || "")
            .trim()
            .toLowerCase()
    );
};

// ======================================================
// BUILD OPTION SCORES
//
// IMPORTANT:
//
// If question points = 1
//
// Correct option:
//     1
//
// Wrong option:
//     0
//
// This prevents:
//     correct_answer = Peacock
//     option_scores = [0,0,0]
//
// which was causing 0 / 1 even when Peacock
// was selected.
// ======================================================

const buildOptionScores = (
    questionType,
    options,
    correctAnswer,
    points
) => {

    if (
        questionType ===
        "text"
    ) {
        return [];
    }

    const correct =
        normalizeCorrectAnswer(
            questionType,
            correctAnswer
        );

    const pointValue =
        Math.min(
            5,
            Math.max(
                0,
                Number(
                    points || 0
                )
            )
        );

    return options.map(
        (option) => {

            const value =
                String(
                    option || ""
                ).trim();

            if (!value) {
                return 0;
            }

            if (
                questionType ===
                "multiple_choice"
            ) {

                return correct.some(
                    (answer) =>
                        optionMatchesAnswer(
                            value,
                            answer
                        )
                )
                    ? pointValue
                    : 0;
            }

            return optionMatchesAnswer(
                value,
                correct
            )
                ? pointValue
                : 0;
        }
    );
};

// ======================================================
// FIND AI CORRECT ANSWER
//
// AI may return:
//     "Peacock"
//     "peacock"
//     "A"
//     "A) Peacock"
//     "Option A"
// ======================================================

const resolveGeneratedCorrectAnswer = (
    generatedCorrect,
    options,
    questionType
) => {

    if (
        questionType ===
        "text"
    ) {
        return "";
    }

    const raw =
        normalizeCorrectAnswer(
            questionType,
            generatedCorrect
        );

    if (
        questionType ===
        "multiple_choice"
    ) {

        return raw
            .map((answer) => {

                const index =
                    options.findIndex(
                        (option) =>
                            optionMatchesAnswer(
                                option,
                                answer
                            )
                    );

                if (
                    index >= 0
                ) {
                    return options[index];
                }

                const upper =
                    String(
                        answer || ""
                    )
                        .trim()
                        .toUpperCase();

                const letterIndex =
                    upper.match(
                        /^[A-Z]$/
                    );

                if (
                    letterIndex
                ) {

                    const idx =
                        upper.charCodeAt(
                            0
                        ) -
                        65;

                    return (
                        options[idx] ||
                        answer
                    );
                }

                const prefixed =
                    upper.match(
                        /^OPTION\s*([A-Z])/
                    );

                if (
                    prefixed
                ) {

                    const idx =
                        prefixed[1]
                            .charCodeAt(
                                0
                            ) -
                        65;

                    return (
                        options[idx] ||
                        answer
                    );
                }

                return answer;
            })
            .filter(Boolean);
    }

    const exactIndex =
        options.findIndex(
            (option) =>
                optionMatchesAnswer(
                    option,
                    raw
                )
        );

    if (
        exactIndex >= 0
    ) {

        return options[
            exactIndex
        ];
    }

    const upper =
        String(
            raw || ""
        )
            .trim()
            .toUpperCase();

    if (
        /^[A-Z]$/.test(
            upper
        )
    ) {

        const index =
            upper.charCodeAt(
                0
            ) -
            65;

        if (
            options[index]
        ) {

            return options[
                index
            ];
        }
    }

    const prefixed =
        upper.match(
            /^OPTION\s*([A-Z])/
        );

    if (
        prefixed
    ) {

        const index =
            prefixed[1]
                .charCodeAt(
                    0
                ) -
            65;

        if (
            options[index]
        ) {

            return options[
                index
            ];
        }
    }

    return "";
};

// ======================================================
// COMPONENT
// ======================================================

const QuizSetup = () => {

    const navigate =
        useNavigate();

    // ==================================================
    // QUIZ STATE
    // ==================================================

    const [
        quizzes,
        setQuizzes
    ] = useState([]);

    const [
        selected,
        setSelected
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        saving,
        setSaving
    ] = useState(false);

    const [
        message,
        setMessage
    ] = useState("");

    // ==================================================
    // SEARCH
    // ==================================================

    const [
        categorySearch,
        setCategorySearch
    ] = useState("");

    const [
        globalSearch,
        setGlobalSearch
    ] = useState("");

    const [
        questionSearch,
        setQuestionSearch
    ] = useState("");

    // ==================================================
    // QUIZ MODAL
    // ==================================================

    const [
        showQuiz,
        setShowQuiz
    ] = useState(false);

    const [
        quizForm,
        setQuizForm
    ] = useState({
        ...emptyQuiz
    });

    // ==================================================
    // QUESTION MODAL
    // ==================================================

    const [
        showQuestion,
        setShowQuestion
    ] = useState(false);

    const [
        editingQuestion,
        setEditingQuestion
    ] = useState(null);

    const [
        questionForm,
        setQuestionForm
    ] = useState({
        ...emptyQuestion
    });

    const [
        imageFile,
        setImageFile
    ] = useState(null);

    const [
        videoFile,
        setVideoFile
    ] = useState(null);

    // ==================================================
    // AI
    // ==================================================

    const [
        generatingAI,
        setGeneratingAI
    ] = useState(false);

    // ==================================================
    // BULK
    // ==================================================

    const [
        showBulk,
        setShowBulk
    ] = useState(false);

    const [
        bulkText,
        setBulkText
    ] = useState("");

    const [
        bulkGenerating,
        setBulkGenerating
    ] = useState(false);

    // ==================================================
    // FLASH MESSAGE
    // ==================================================

    const flash = (
        text
    ) => {

        setMessage(
            text
        );

        window.setTimeout(
            () =>
                setMessage(""),
            3500
        );
    };

    // ==================================================
    // LOAD QUIZZES
    // ==================================================

    const loadQuizzes = async (
        keepSelected = true
    ) => {

        setLoading(true);

        try {

            const response =
                await axios.get(
                    "/api/quiz"
                );

            const data =
                responseData(
                    response
                );

            const list =
                Array.isArray(data)
                    ? data
                    : [];

            setQuizzes(
                list
            );

            if (
                keepSelected &&
                selected?.id
            ) {

                try {

                    const detail =
                        await axios.get(
                            `/api/quiz/${selected.id}`
                        );

                    setSelected(
                        responseData(
                            detail
                        )
                    );

                } catch {
                    setSelected(
                        null
                    );
                }
            }

        } catch (error) {

            console.error(
                "loadQuizzes:",
                error
            );

            flash(
                error?.response
                    ?.data
                    ?.message ||
                "Unable to load quizzes."
            );

        } finally {

            setLoading(
                false
            );
        }
    };

    // ==================================================
    // OPEN QUIZ
    // ==================================================

    const openQuiz = async (
        id
    ) => {

        try {

            const response =
                await axios.get(
                    `/api/quiz/${id}`
                );

            setSelected(
                responseData(
                    response
                )
            );

            setQuestionSearch("");

        } catch (error) {

            console.error(
                "openQuiz:",
                error
            );

            flash(
                error?.response
                    ?.data
                    ?.message ||
                "Unable to open quiz."
            );
        }
    };

    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(
        () => {

            loadQuizzes(
                false
            );

        },
        []
    );

    // ==================================================
    // FILTER QUIZZES
    // ==================================================

    const filteredQuizzes =
        useMemo(
            () => {

                const query =
                    `${categorySearch} ${globalSearch}`
                        .trim()
                        .toLowerCase();

                if (!query) {
                    return quizzes;
                }

                return quizzes.filter(
                    (quiz) =>
                        `${quiz?.name || ""} ${
                            quiz?.description || ""
                        }`
                            .toLowerCase()
                            .includes(
                                query
                            )
                );
            },
            [
                quizzes,
                categorySearch,
                globalSearch
            ]
        );

    // ==================================================
    // FILTER QUESTIONS
    // ==================================================

    const filteredQuestions =
        useMemo(
            () => {

                const query =
                    `${questionSearch} ${globalSearch}`
                        .trim()
                        .toLowerCase();

                const questions =
                    selected?.questions ||
                    [];

                if (!query) {
                    return questions;
                }

                return questions.filter(
                    (question) =>
                        `${question?.question_text || ""} ${
                            question?.question_type || ""
                        }`
                            .toLowerCase()
                            .includes(
                                query
                            )
                );
            },
            [
                selected,
                questionSearch,
                globalSearch
            ]
        );

    // ==================================================
    // TOTAL POINTS
    // ==================================================

    const totalPoints =
        useMemo(
            () =>
                (
                    selected?.questions ||
                    []
                ).reduce(
                    (
                        sum,
                        question
                    ) =>
                        sum +
                        Number(
                            question.points ||
                            0
                        ),
                    0
                ),
            [
                selected
            ]
        );

    // ==================================================
    // CREATE CATEGORY
    // ==================================================

    const createCategory =
        () => {

            setQuizForm({
                ...emptyQuiz
            });

            setShowQuiz(
                true
            );
        };

    // ==================================================
    // EDIT CATEGORY
    // ==================================================

    const editCategory =
        (quiz) => {

            setQuizForm({
                ...emptyQuiz,
                ...quiz,
                time_limit_minutes:
                    quiz.time_limit_minutes ||
                    ""
            });

            setShowQuiz(
                true
            );
        };

    // ==================================================
    // SAVE QUIZ
    // ==================================================

    const saveQuiz =
        async (
            event
        ) => {

            event.preventDefault();

            setSaving(
                true
            );

            try {

                let response;

                if (
                    quizForm.id
                ) {

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

                const saved =
                    responseData(
                        response
                    );

                setShowQuiz(
                    false
                );

                setQuizForm({
                    ...emptyQuiz
                });

                await loadQuizzes(
                    false
                );

                if (
                    saved?.id
                ) {

                    await openQuiz(
                        saved.id
                    );
                }

                flash(
                    "Quiz saved successfully."
                );

            } catch (error) {

                console.error(
                    "saveQuiz:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "Unable to save quiz."
                );

            } finally {

                setSaving(
                    false
                );
            }
        };

    // ==================================================
    // DELETE QUIZ
    // ==================================================

    const deleteQuiz =
        async (
            id
        ) => {

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

                if (
                    Number(
                        selected?.id
                    ) ===
                    Number(id)
                ) {

                    setSelected(
                        null
                    );
                }

                await loadQuizzes(
                    false
                );

                flash(
                    "Quiz deleted successfully."
                );

            } catch (error) {

                console.error(
                    "deleteQuiz:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "Unable to delete quiz."
                );
            }
        };

    // ==================================================
    // DELETE ALL QUIZZES
    // ==================================================

    const deleteAllQuizzes =
        async () => {

            if (
                !quizzes.length
            ) {

                flash(
                    "There are no categories to delete."
                );

                return;
            }

            if (
                !window.confirm(
                    `Delete all ${quizzes.length} quizzes and their data?`
                )
            ) {

                return;
            }

            setSaving(
                true
            );

            try {

                await axios.delete(
                    "/api/quiz/bulk/all"
                );

                setSelected(
                    null
                );

                await loadQuizzes(
                    false
                );

                flash(
                    "All quizzes deleted successfully."
                );

            } catch (error) {

                console.error(
                    "deleteAllQuizzes:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "Unable to delete all quizzes."
                );

            } finally {

                setSaving(
                    false
                );
            }
        };

    // ==================================================
    // RESET QUESTION
    // ==================================================

    const resetQuestion =
        () => {

            setEditingQuestion(
                null
            );

            setQuestionForm({
                ...emptyQuestion,
                options: [
                    "",
                    ""
                ],
                option_scores: [
                    0,
                    0
                ]
            });

            setImageFile(
                null
            );

            setVideoFile(
                null
            );
        };

    // ==================================================
    // ADD QUESTION
    // ==================================================

    const openAddQuestion =
        () => {

            resetQuestion();

            setShowQuestion(
                true
            );
        };

    // ==================================================
    // CHANGE QUESTION TYPE
    // ==================================================

    const changeQuestionType =
        (type) => {

            if (
                type ===
                "text"
            ) {

                setQuestionForm(
                    (prev) => ({
                        ...prev,
                        question_type:
                            type,
                        options: [],
                        option_scores: [],
                        correct_answer:
                            ""
                    })
                );

                return;
            }

            const options =
                type ===
                "true_false"
                    ? [
                        "True",
                        "False"
                    ]
                    : (
                        questionForm.options
                            ?.length >=
                        2
                    )
                        ? questionForm.options
                        : [
                            "",
                            ""
                        ];

            const correct =
                type ===
                "multiple_choice"
                    ? []
                    : "";

            setQuestionForm(
                (prev) => ({
                    ...prev,
                    question_type:
                        type,
                    options,
                    option_scores:
                        buildOptionScores(
                            type,
                            options,
                            correct,
                            prev.points
                        ),
                    correct_answer:
                        correct
                })
            );
        };

    // ==================================================
    // UPDATE OPTION
    //
    // If the option text changes and it was the
    // correct answer, update correct_answer too.
    // ==================================================

    const updateOption =
        (
            index,
            value
        ) => {

            setQuestionForm(
                (prev) => {

                    const previousOption =
                        String(
                            prev.options?.[
                                index
                            ] ||
                            ""
                        ).trim();

                    const options =
                        [
                            ...(prev.options ||
                                [])
                        ];

                    options[
                        index
                    ] = value;

                    let correct_answer =
                        prev.correct_answer;

                    if (
                        prev.question_type ===
                        "multiple_choice"
                    ) {

                        const current =
                            normalizeCorrectAnswer(
                                prev.question_type,
                                prev.correct_answer
                            );

                        if (
                            current.some(
                                (answer) =>
                                    optionMatchesAnswer(
                                        answer,
                                        previousOption
                                    )
                            )
                        ) {

                            correct_answer =
                                current.map(
                                    (answer) =>
                                        optionMatchesAnswer(
                                            answer,
                                            previousOption
                                        )
                                            ? String(
                                                value
                                            ).trim()
                                            : answer
                                );
                        }

                    } else if (
                        optionMatchesAnswer(
                            prev.correct_answer,
                            previousOption
                        )
                    ) {

                        correct_answer =
                            String(
                                value
                            ).trim();
                    }

                    return {
                        ...prev,
                        options,
                        correct_answer,
                        option_scores:
                            buildOptionScores(
                                prev.question_type,
                                options,
                                correct_answer,
                                prev.points
                            )
                    };
                }
            );
        };

    // ==================================================
    // UPDATE OPTION SCORE
    //
    // Manual score is still allowed, but selecting
    // the correct answer automatically sets its score.
    // ==================================================

    const updateOptionScore =
        (
            index,
            value
        ) => {

            setQuestionForm(
                (prev) => {

                    const option_scores =
                        [
                            ...(prev.option_scores ||
                                [])
                        ];

                    option_scores[
                        index
                    ] = Math.min(
                        5,
                        Math.max(
                            0,
                            Number(
                                value ||
                                0
                            )
                        )
                    );

                    return {
                        ...prev,
                        option_scores
                    };
                }
            );
        };

    // ==================================================
    // ADD OPTION
    // ==================================================

    const addOption =
        () => {

            setQuestionForm(
                (prev) => ({
                    ...prev,
                    options: [
                        ...(prev.options ||
                            []),
                        ""
                    ],
                    option_scores: [
                        ...(prev.option_scores ||
                            []),
                        0
                    ]
                })
            );
        };

    // ==================================================
    // REMOVE OPTION
    // ==================================================

    const removeOption =
        (index) => {

            setQuestionForm(
                (prev) => {

                    const options =
                        [
                            ...(prev.options ||
                                [])
                        ];

                    const scores =
                        [
                            ...(prev.option_scores ||
                                [])
                        ];

                    const removed =
                        options[
                            index
                        ];

                    options.splice(
                        index,
                        1
                    );

                    scores.splice(
                        index,
                        1
                    );

                    let correct =
                        prev.correct_answer;

                    if (
                        Array.isArray(
                            correct
                        )
                    ) {

                        correct =
                            correct.filter(
                                (x) =>
                                    !optionMatchesAnswer(
                                        x,
                                        removed
                                    )
                            );

                    } else if (
                        optionMatchesAnswer(
                            correct,
                            removed
                        )
                    ) {

                        correct =
                            "";
                    }

                    return {
                        ...prev,
                        options,
                        option_scores:
                            buildOptionScores(
                                prev.question_type,
                                options,
                                correct,
                                prev.points
                            ),
                        correct_answer:
                            correct
                    };
                }
            );
        };

    // ==================================================
    // TOGGLE CORRECT ANSWER
    //
    // THIS IS THE MAIN FIX.
    //
    // When Peacock is selected:
    //
    // correct_answer = Peacock
    // option_scores = [1,0,0]
    //
    // ==================================================

    const toggleCorrect =
        (option) => {

            setQuestionForm(
                (prev) => {

                    const optionValue =
                        String(
                            option ||
                            ""
                        ).trim();

                    if (
                        !optionValue
                    ) {
                        return prev;
                    }

                    let correct_answer;

                    if (
                        prev.question_type ===
                        "multiple_choice"
                    ) {

                        const current =
                            normalizeCorrectAnswer(
                                prev.question_type,
                                prev.correct_answer
                            );

                        const alreadySelected =
                            current.some(
                                (answer) =>
                                    optionMatchesAnswer(
                                        answer,
                                        optionValue
                                    )
                            );

                        correct_answer =
                            alreadySelected
                                ? current.filter(
                                    (answer) =>
                                        !optionMatchesAnswer(
                                            answer,
                                            optionValue
                                        )
                                )
                                : [
                                    ...current,
                                    optionValue
                                ];

                    } else {

                        correct_answer =
                            optionValue;
                    }

                    return {
                        ...prev,
                        correct_answer,
                        option_scores:
                            buildOptionScores(
                                prev.question_type,
                                prev.options ||
                                    [],
                                correct_answer,
                                prev.points
                            )
                    };
                }
            );
        };

    // ==================================================
    // EDIT QUESTION
    //
    // Also repairs old questions where correct_answer
    // exists but option_scores are all zero.
    // ==================================================

    const openEditQuestion =
        (question) => {

            const options =
                Array.isArray(
                    question.options
                ) &&
                question.options.length
                    ? question.options.map(
                        (x) =>
                            String(
                                x ??
                                ""
                            )
                    )
                    : question.question_type ===
                        "text"
                        ? []
                        : [
                            "",
                            ""
                        ];

            // IMPORTANT: restore the answer from whichever field the API returns.
            // Older records may have it in correct_answer_json, while newer
            // records may use correct_answer. Both JSON strings and arrays are supported.
            const correct_answer =
                normalizeCorrectAnswer(
                    question.question_type,
                    getStoredCorrectAnswer(question)
                );

            const points =
                Number(
                    question.points ||
                    1
                );

            const option_scores =
                buildOptionScores(
                    question.question_type,
                    options,
                    correct_answer,
                    points
                );

            setEditingQuestion(
                question
            );

            setQuestionForm({
                ...emptyQuestion,
                ...question,
                options,
                option_scores,
                correct_answer,
                points
            });

            setImageFile(
                null
            );

            setVideoFile(
                null
            );

            setShowQuestion(
                true
            );
        };

    // ==================================================
    // UPLOAD QUESTION FILES
    // ==================================================

    const uploadQuestionFiles =
        async (
            questionId
        ) => {

            if (
                !imageFile &&
                !videoFile
            ) {

                return;
            }

            const formData =
                new FormData();

            if (
                imageFile
            ) {

                formData.append(
                    "image",
                    imageFile
                );
            }

            if (
                videoFile
            ) {

                formData.append(
                    "video",
                    videoFile
                );
            }

            await axios.post(
                `/api/quiz/${selected.id}/questions/${questionId}/upload`,
                formData,
                {
                    headers: {
                        "Content-Type":
                            "multipart/form-data"
                    }
                }
            );
        };

    // ==================================================
    // SAVE QUESTION
    //
    // MAIN BACKEND PAYLOAD FIX
    // ==================================================

    const saveQuestion =
        async (
            event
        ) => {

            event.preventDefault();

            if (
                !selected?.id
            ) {

                flash(
                    "Please select a category first."
                );

                return;
            }

            const type =
                questionForm.question_type;

            const options =
                type === "text"
                    ? []
                    : (
                        questionForm.options ||
                        []
                    )
                        .map(
                            (x) =>
                                String(
                                    x
                                ).trim()
                        )
                        .filter(Boolean);

            if (
                type !==
                    "text" &&
                options.length <
                    2
            ) {

                flash(
                    "Please add at least two options."
                );

                return;
            }

            const points =
                Math.min(
                    5,
                    Math.max(
                        0,
                        Number(
                            questionForm.points ||
                            1
                        )
                    )
                );

            let correct_answer =
                normalizeCorrectAnswer(
                    type,
                    questionForm.correct_answer
                );

            // ==========================================
            // VALIDATE CORRECT ANSWER AGAINST OPTIONS
            // ==========================================

            if (
                type !==
                "text"
            ) {

                if (
                    type ===
                    "multiple_choice"
                ) {

                    correct_answer =
                        correct_answer.filter(
                            (answer) =>
                                options.some(
                                    (option) =>
                                        optionMatchesAnswer(
                                            option,
                                            answer
                                        )
                                )
                        );

                    correct_answer =
                        correct_answer.map(
                            (answer) => {

                                const match =
                                    options.find(
                                        (option) =>
                                            optionMatchesAnswer(
                                                option,
                                                answer
                                            )
                                    );

                                return (
                                    match ||
                                    answer
                                );
                            }
                        );

                } else {

                    const match =
                        options.find(
                            (option) =>
                                optionMatchesAnswer(
                                    option,
                                    correct_answer
                                )
                        );

                    correct_answer =
                        match ||
                        "";
                }

            } else {

                correct_answer =
                    "";
            }

            // ==========================================
            // CORRECT ANSWER REQUIRED
            // ==========================================

            if (
                type !==
                "text" &&
                (
                    !correct_answer ||
                    (
                        Array.isArray(
                            correct_answer
                        ) &&
                        !correct_answer.length
                    )
                )
            ) {

                flash(
                    "Please select the correct answer before saving."
                );

                return;
            }

            // ==========================================
            // BUILD CORRECT SCORES
            //
            // Example:
            //
            // options:
            //   Peacock
            //   Eagle
            //   Sparrow
            //
            // correct:
            //   Peacock
            //
            // points:
            //   1
            //
            // result:
            //   [1, 0, 0]
            // ==========================================

            const option_scores =
                buildOptionScores(
                    type,
                    options,
                    correct_answer,
                    points
                );

            const payload = {
                question_text:
                    String(
                        questionForm.question_text ||
                        ""
                    ).trim(),

                question_type:
                    type,

                options,

                option_scores,

                // Primary field
                correct_answer,

                // Compatibility field for backend. Keep this as valid JSON so
                // MySQL JSON columns and older controllers can both read it.
                correct_answer_json:
                    JSON.stringify(correct_answer),

                points,

                is_mandatory:
                    !!questionForm.is_mandatory,

                guideline:
                    questionForm.guideline ||
                    "",

                image_url:
                    questionForm.image_url ||
                    "",

                video_url:
                    questionForm.video_url ||
                    ""
            };

            console.log(
                "QUIZ QUESTION SAVE PAYLOAD:",
                payload
            );

            setSaving(
                true
            );

            try {

                let response;

                if (
                    editingQuestion
                ) {

                    response =
                        await axios.put(
                            `/api/quiz/${selected.id}/questions/${editingQuestion.id}`,
                            payload
                        );

                } else {

                    response =
                        await axios.post(
                            `/api/quiz/${selected.id}/questions`,
                            payload
                        );
                }

                const savedId =
                    response?.data?.id ||
                    response?.data?.data?.id ||
                    editingQuestion?.id;

                if (
                    savedId
                ) {

                    await uploadQuestionFiles(
                        savedId
                    );
                }

                const detail =
                    await axios.get(
                        `/api/quiz/${selected.id}`
                    );

                setSelected(
                    responseData(
                        detail
                    )
                );

                setShowQuestion(
                    false
                );

                resetQuestion();

                flash(
                    "Question saved successfully. Correct answer and scoring are ready."
                );

            } catch (error) {

                console.error(
                    "saveQuestion:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "Unable to save question."
                );

            } finally {

                setSaving(
                    false
                );
            }
        };

    // ==================================================
    // DELETE QUESTION
    // ==================================================

    const deleteQuestion =
        async (
            id
        ) => {

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
                    responseData(
                        detail
                    )
                );

                flash(
                    "Question deleted successfully."
                );

            } catch (error) {

                console.error(
                    "deleteQuestion:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "Unable to delete question."
                );
            }
        };

    // ==================================================
    // DELETE ALL QUESTIONS
    // ==================================================

    const deleteAllQuestions =
        async () => {

            if (
                !selected?.id ||
                !selected.questions?.length
            ) {

                flash(
                    "There are no questions to delete."
                );

                return;
            }

            if (
                !window.confirm(
                    `Delete all ${selected.questions.length} questions from this category?`
                )
            ) {

                return;
            }

            setSaving(
                true
            );

            try {

                await axios.delete(
                    `/api/quiz/${selected.id}/questions/bulk/all`
                );

                const detail =
                    await axios.get(
                        `/api/quiz/${selected.id}`
                    );

                setSelected(
                    responseData(
                        detail
                    )
                );

                flash(
                    "All questions deleted successfully."
                );

            } catch (error) {

                console.error(
                    "deleteAllQuestions:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "Unable to delete all questions."
                );

            } finally {

                setSaving(
                    false
                );
            }
        };

    // ==================================================
    // GENERATE QUESTION WITH AI
    //
    // MAIN AI FIX
    //
    // AI answer is converted into the actual option
    // and the correct option receives question points.
    // ==================================================

    const generateWithAI =
        async () => {

            if (
                !questionForm.question_text.trim()
            ) {

                flash(
                    "Enter a question topic or full text first."
                );

                return;
            }

            setGeneratingAI(
                true
            );

            try {

                const response =
                    await axios.post(
                        "/api/quiz/ai/generate-question",
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
                                selected?.id
                        }
                    );

                const generated =
                    responseData(
                        response
                    )?.question ||
                    responseData(
                        response
                    ) ||
                    {};

                const generatedType =
                    generated.question_type ||
                    questionForm.question_type;

                const generatedOptions =
                    Array.isArray(
                        generated.options
                    )
                        ? generated.options
                            .map(
                                (x) =>
                                    String(
                                        x ??
                                        ""
                                    ).trim()
                            )
                            .filter(Boolean)
                        : (
                            questionForm.options ||
                            []
                        )
                            .map(
                                (x) =>
                                    String(
                                        x ??
                                        ""
                                    ).trim()
                            )
                            .filter(Boolean);

                const generatedPoints =
                    Math.min(
                        5,
                        Math.max(
                            0,
                            Number(
                                generated.points ??
                                questionForm.points ??
                                1
                            )
                        )
                    );

                const generatedCorrectRaw =
                    generated.correct_answer ??
                    "";

                const finalCorrect =
                    resolveGeneratedCorrectAnswer(
                        generatedCorrectRaw,
                        generatedOptions,
                        generatedType
                    );

                const finalScores =
                    generatedType ===
                        "text"
                        ? []
                        : buildOptionScores(
                            generatedType,
                            generatedOptions,
                            finalCorrect,
                            generatedPoints
                        );

                console.log(
                    "AI GENERATED QUESTION:",
                    {
                        generated,
                        finalCorrect,
                        finalScores
                    }
                );

                setQuestionForm(
                    (prev) => ({
                        ...prev,

                        question_text:
                            generated.question_text ||
                            prev.question_text,

                        question_type:
                            generatedType,

                        options:
                            generatedType ===
                                "text"
                                ? []
                                : generatedOptions,

                        option_scores:
                            finalScores,

                        correct_answer:
                            finalCorrect,

                        points:
                            generatedPoints,

                        guideline:
                            generated.guideline ??
                            prev.guideline
                    })
                );

                if (
                    generatedType !==
                        "text" &&
                    finalCorrect
                ) {

                    flash(
                        "Question generated with AI. Correct answer and scoring are set automatically."
                    );

                } else {

                    flash(
                        "Question generated with AI. Please select the correct answer before saving."
                    );
                }

            } catch (error) {

                console.error(
                    "generateWithAI:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "AI generation failed."
                );

            } finally {

                setGeneratingAI(
                    false
                );
            }
        };

    // ==================================================
    // BULK GENERATE
    // ==================================================

    const bulkGenerate =
        async () => {

            const questions =
                bulkText
                    .split("\n")
                    .map(
                        (x) =>
                            x.trim()
                    )
                    .filter(Boolean);

            if (
                !selected?.id
            ) {

                return;
            }

            if (
                !questions.length
            ) {

                flash(
                    "Enter at least one question."
                );

                return;
            }

            setBulkGenerating(
                true
            );

            try {

                await axios.post(
                    `/api/quiz/${selected.id}/questions/bulk`,
                    {
                        questions:
                            questions.map(
                                (
                                    question_text
                                ) => ({
                                    question_text,

                                    question_type:
                                        "single_choice",

                                    options: [
                                        "",
                                        ""
                                    ],

                                    option_scores: [
                                        0,
                                        0
                                    ],

                                    correct_answer:
                                        "",

                                    correct_answer_json:
                                        "",

                                    points:
                                        1,

                                    is_mandatory:
                                        true
                                })
                            )
                    }
                );

                const detail =
                    await axios.get(
                        `/api/quiz/${selected.id}`
                    );

                setSelected(
                    responseData(
                        detail
                    )
                );

                setShowBulk(
                    false
                );

                setBulkText(
                    ""
                );

                flash(
                    `${questions.length} questions added successfully.`
                );

            } catch (error) {

                console.error(
                    "bulkGenerate:",
                    error
                );

                flash(
                    error?.response
                        ?.data
                        ?.message ||
                    "Bulk generation failed."
                );

            } finally {

                setBulkGenerating(
                    false
                );
            }
        };

    // ==================================================
    // COPY LINK
    // ==================================================

    const copyLink =
        async () => {

            if (
                !selected?.public_token
            ) {

                return;
            }

            const link =
                `${window.location.origin}/quiz/${selected.public_token}`;

            try {

                await navigator.clipboard.writeText(
                    link
                );

                flash(
                    "Reusable quiz link copied."
                );

            } catch {

                flash(
                    "Unable to copy quiz link."
                );
            }
        };

    // ==================================================
    // CHECK CORRECT OPTION
    // ==================================================

    const isCorrectOption =
        (option) => {

            if (
                questionForm.question_type ===
                "multiple_choice"
            ) {

                const answers =
                    normalizeCorrectAnswer(
                        questionForm.question_type,
                        questionForm.correct_answer
                    );

                return answers.some(
                    (answer) =>
                        optionMatchesAnswer(
                            answer,
                            option
                        )
                );
            }

            return optionMatchesAnswer(
                questionForm.correct_answer,
                option
            );
        };

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="quiz-page quiz-setup-v2">

            {/* ==========================================
                PAGE HEADER
            ========================================== */}

            <div className="quiz-setup-top">

                <h1>
                    Quiz Setup
                </h1>

                <div className="quiz-global-search">

                    <FaSearch />

                    <input
                        value={
                            globalSearch
                        }
                        onChange={
                            (e) =>
                                setGlobalSearch(
                                    e.target.value
                                )
                        }
                        placeholder="Search all categories and questions..."
                    />

                </div>

            </div>

            {/* ==========================================
                TOAST
            ========================================== */}

            {message && (
                <div className="quiz-setup-toast">

                    <span>
                        {message}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setMessage(
                                ""
                            )
                        }
                    >
                        <FaTimes />
                    </button>

                </div>
            )}

            {/* ==========================================
                MAIN GRID
            ========================================== */}

            <div className="quiz-setup-grid">

                {/* ======================================
                    CATEGORY PANEL
                ====================================== */}

                <section className="quiz-category-panel">

                    <div className="quiz-category-head">

                        <strong>
                            Categories
                        </strong>

                        <div>

                            <button
                                type="button"
                                className="quiz-danger-small"
                                onClick={
                                    deleteAllQuizzes
                                }
                                disabled={
                                    saving
                                }
                            >
                                Delete All
                            </button>

                            <button
                                type="button"
                                className="quiz-icon-add"
                                onClick={
                                    createCategory
                                }
                                title="Add category"
                            >
                                <FaPlus />
                            </button>

                        </div>

                    </div>

                    <div className="quiz-category-search">

                        <input
                            value={
                                categorySearch
                            }
                            onChange={
                                (e) =>
                                    setCategorySearch(
                                        e.target.value
                                    )
                            }
                            placeholder="Search categories..."
                        />

                    </div>

                    <div className="quiz-category-list">

                        {loading ? (

                            <div className="quiz-list-loading">
                                Loading...
                            </div>

                        ) : filteredQuizzes.length ? (

                            filteredQuizzes.map(
                                (quiz) => (

                                    <div
                                        key={
                                            quiz.id
                                        }
                                        className={`quiz-category-item ${
                                            Number(
                                                selected?.id
                                            ) ===
                                            Number(
                                                quiz.id
                                            )
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            openQuiz(
                                                quiz.id
                                            )
                                        }
                                    >

                                        <div className="quiz-category-title">

                                            <span>
                                                {
                                                    quiz.name
                                                }
                                            </span>

                                            {Number(
                                                selected?.id
                                            ) ===
                                                Number(
                                                    quiz.id
                                                ) && (
                                                    <FaChevronDown />
                                                )}

                                        </div>

                                        <div className="quiz-category-meta">

                                            {
                                                quiz.description ||
                                                "All Stores"
                                            }

                                        </div>

                                        <div className="quiz-category-actions">

                                            <button
                                                type="button"
                                                className="quiz-link-icon"
                                                title="Copy quiz link"
                                                onClick={(
                                                    e
                                                ) => {

                                                    e.stopPropagation();

                                                    const link =
                                                        `${window.location.origin}/quiz/${quiz.public_token}`;

                                                    navigator.clipboard?.writeText(
                                                        link
                                                    );

                                                    flash(
                                                        "Quiz link copied."
                                                    );
                                                }}
                                            >
                                                <FaLink />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(
                                                    e
                                                ) => {

                                                    e.stopPropagation();

                                                    editCategory(
                                                        quiz
                                                    );
                                                }}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(
                                                    e
                                                ) => {

                                                    e.stopPropagation();

                                                    deleteQuiz(
                                                        quiz.id
                                                    );
                                                }}
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </div>
                                )
                            )

                        ) : (

                            <div className="quiz-list-empty">
                                No categories found.
                            </div>

                        )}

                    </div>

                </section>

                {/* ======================================
                    QUESTION PANEL
                ====================================== */}

                <section className="quiz-question-panel">

                    {!selected ? (

                        <div className="quiz-no-selection">

                            <h2>
                                Select a category
                            </h2>

                            <p>
                                Choose a category from the left to manage its questions.
                            </p>

                            <button
                                type="button"
                                className="quiz-primary"
                                onClick={
                                    createCategory
                                }
                            >
                                <FaPlus />
                                Add Category
                            </button>

                        </div>

                    ) : (

                        <>

                            <div className="quiz-question-head">

                                <div>

                                    <h2>

                                        Questions for:{" "}

                                        <span>
                                            {
                                                selected.name
                                            }
                                        </span>

                                    </h2>

                                </div>

                                <div className="quiz-question-actions">

                                    <button
                                        type="button"
                                        className="quiz-danger"
                                        onClick={
                                            deleteAllQuestions
                                        }
                                        disabled={
                                            saving
                                        }
                                    >
                                        Delete All Questions
                                    </button>

                                    <button
                                        type="button"
                                        className="quiz-secondary"
                                        onClick={() =>
                                            setShowBulk(
                                                true
                                            )
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

                            <div className="quiz-question-search">

                                <FaSearch />

                                <input
                                    value={
                                        questionSearch
                                    }
                                    onChange={
                                        (e) =>
                                            setQuestionSearch(
                                                e.target.value
                                            )
                                    }
                                    placeholder="Search questions..."
                                />

                            </div>

                            <div className="quiz-question-list">

                                {filteredQuestions.length ? (

                                    filteredQuestions.map(
                                        (
                                            question,
                                            index
                                        ) => (

                                            <div
                                                className="quiz-question-card"
                                                key={
                                                    question.id
                                                }
                                            >

                                                <div className="quiz-question-number">
                                                    {index + 1}.
                                                </div>

                                                <div className="quiz-question-text">

                                                    <strong>
                                                        {
                                                            question.question_text
                                                        }
                                                    </strong>

                                                </div>

                                                <div className="quiz-question-card-actions">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditQuestion(
                                                                question
                                                            )
                                                        }
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
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </div>
                                        )
                                    )

                                ) : (

                                    <div className="quiz-empty-question">

                                        <strong>
                                            No questions yet.
                                        </strong>

                                        <span>
                                            Add your first question.
                                        </span>

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

                                )}

                            </div>

                        </>
                    )}

                </section>

            </div>

            {/* ==========================================
                CREATE / EDIT QUIZ MODAL
            ========================================== */}

            {showQuiz && (

                <div className="quiz-modal-backdrop">

                    <form
                        className="quiz-modal quiz-category-modal"
                        onSubmit={
                            saveQuiz
                        }
                    >

                        <div className="quiz-modal-head">

                            <div>

                                <span>
                                    CATEGORY / QUIZ
                                </span>

                                <h2>
                                    {
                                        quizForm.id
                                            ? "Edit Category"
                                            : "Add Category"
                                    }
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

                                Category / Quiz Name

                                <input
                                    required
                                    value={
                                        quizForm.name
                                    }
                                    onChange={
                                        (e) =>
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

                                Scope / Description

                                <input
                                    value={
                                        quizForm.description ||
                                        ""
                                    }
                                    onChange={
                                        (e) =>
                                            setQuizForm({
                                                ...quizForm,
                                                description:
                                                    e.target.value
                                            })
                                    }
                                    placeholder="e.g. All Stores"
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
                                    onChange={
                                        (e) =>
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
                                    onChange={
                                        (e) =>
                                            setQuizForm({
                                                ...quizForm,
                                                time_limit_minutes:
                                                    e.target.value
                                            })
                                    }
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
                                    onChange={
                                        (e) =>
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
                                    onChange={
                                        (e) =>
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
                                    onChange={
                                        (e) =>
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
                                    onChange={
                                        (e) =>
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
                                    onChange={
                                        (e) =>
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

                                {
                                    saving
                                        ? "Saving..."
                                        : "Save Category"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}

            {/* ==========================================
                QUESTION MODAL
            ========================================== */}

            {showQuestion && (

                <div className="quiz-modal-backdrop quiz-question-modal-backdrop">

                    <form
                        className="quiz-modal wide quiz-question-modal"
                        onSubmit={
                            saveQuestion
                        }
                    >

                        <div className="quiz-modal-head">

                            <div>

                                <span>
                                    QUESTION BUILDER
                                </span>

                                <h2>
                                    {
                                        editingQuestion
                                            ? "Edit Question"
                                            : "Add Question"
                                    }
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

                        <div className="quiz-question-form-body">

                            {/* QUESTION TYPE */}

                            <label>

                                Question Type

                                <select
                                    value={
                                        questionForm.question_type
                                    }
                                    onChange={
                                        (e) =>
                                            changeQuestionType(
                                                e.target.value
                                            )
                                    }
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

                                </select>

                            </label>

                            {/* QUESTION */}

                            <label className="question-text-label">

                                Question

                                <textarea
                                    required
                                    rows={4}
                                    value={
                                        questionForm.question_text
                                    }
                                    onChange={
                                        (e) =>
                                            setQuestionForm({
                                                ...questionForm,
                                                question_text:
                                                    e.target.value
                                            })
                                    }
                                    placeholder="Enter question topic or full text..."
                                />

                            </label>

                            {/* AI BUTTON */}

                            <div className="quiz-ai-row">

                                <button
                                    type="button"
                                    className="quiz-ai-button"
                                    onClick={
                                        generateWithAI
                                    }
                                    disabled={
                                        generatingAI
                                    }
                                >

                                    <FaMagic />

                                    {
                                        generatingAI
                                            ? "Generating..."
                                            : "Generate with AI"
                                    }

                                </button>

                            </div>

                            {/* OPTIONS */}

                            {questionForm.question_type !==
                                "text" && (

                                <div className="quiz-options-section">

                                    <h3>
                                        Options &amp; Scoring (0-5)
                                    </h3>

                                    {(
                                        questionForm.options ||
                                        []
                                    ).map(
                                        (
                                            option,
                                            index
                                        ) => (

                                            <div
                                                className="quiz-option-row"
                                                key={
                                                    index
                                                }
                                            >

                                                {/* CORRECT ANSWER */}

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
                                                            ? `correct-option-${editingQuestion?.id || "new"}`
                                                            : "correct-option"
                                                    }
                                                    checked={
                                                        isCorrectOption(
                                                            option
                                                        )
                                                    }
                                                    onChange={() =>
                                                        toggleCorrect(
                                                            option
                                                        )
                                                    }
                                                    title="Mark as correct answer"
                                                />

                                                {/* OPTION TEXT */}

                                                <input
                                                    value={
                                                        option
                                                    }
                                                    onChange={
                                                        (e) =>
                                                            updateOption(
                                                                index,
                                                                e.target.value
                                                            )
                                                    }
                                                    placeholder={`Option ${index + 1}`}
                                                />

                                                {/* SCORE */}

                                                <input
                                                    className="quiz-score-input"
                                                    type="number"
                                                    min="0"
                                                    max="5"
                                                    step="1"
                                                    value={
                                                        questionForm.option_scores?.[
                                                            index
                                                        ] ??
                                                        0
                                                    }
                                                    onChange={
                                                        (e) =>
                                                            updateOptionScore(
                                                                index,
                                                                e.target.value
                                                            )
                                                    }
                                                />

                                                {/* REMOVE */}

                                                <button
                                                    type="button"
                                                    className="quiz-option-remove"
                                                    onClick={() =>
                                                        removeOption(
                                                            index
                                                        )
                                                    }
                                                    disabled={
                                                        (
                                                            questionForm.options ||
                                                            []
                                                        ).length <=
                                                        2
                                                    }
                                                >
                                                    <FaTimes />
                                                </button>

                                            </div>
                                        )
                                    )}

                                    {/* ADD OPTION */}

                                    <button
                                        type="button"
                                        className="quiz-text-button"
                                        onClick={
                                            addOption
                                        }
                                    >
                                        + Add Option
                                    </button>

                                    {/* CORRECT ANSWER DISPLAY */}

                                    <div className="quiz-correct-answer-hint">

                                        <strong>
                                            Correct answer:
                                        </strong>{" "}

                                        {
                                            questionForm.question_type ===
                                            "multiple_choice"
                                                ? (
                                                    Array.isArray(
                                                        questionForm.correct_answer
                                                    )
                                                        ? questionForm.correct_answer.join(
                                                            ", "
                                                        )
                                                        : ""
                                                )
                                                : (
                                                    questionForm.correct_answer ||
                                                    "Not selected"
                                                )
                                        }

                                        <span>
                                            Correct option(s) automatically receive{" "}
                                            {
                                                Number(
                                                    questionForm.points ||
                                                    1
                                                )
                                            }{" "}
                                            point(s).
                                        </span>

                                    </div>

                                </div>
                            )}

                            {/* MANDATORY */}

                            <label className="quiz-mandatory-row">

                                <input
                                    type="checkbox"
                                    checked={
                                        !!questionForm.is_mandatory
                                    }
                                    onChange={
                                        (e) =>
                                            setQuestionForm({
                                                ...questionForm,
                                                is_mandatory:
                                                    e.target.checked
                                            })
                                    }
                                />

                                <span>

                                    <strong>
                                        Answer is Mandatory
                                    </strong>

                                    <small>
                                        If enabled, users must provide an answer before they can move to the next question.
                                    </small>

                                </span>

                            </label>

                            {/* GUIDELINE */}

                            <div className="quiz-guideline-box">

                                <strong>
                                    Assessment guidelines (optional)
                                </strong>

                                <textarea
                                    rows={3}
                                    value={
                                        questionForm.guideline ||
                                        ""
                                    }
                                    onChange={
                                        (e) =>
                                            setQuestionForm({
                                                ...questionForm,
                                                guideline:
                                                    e.target.value
                                            })
                                    }
                                    placeholder="e.g., Focus on customer empathy and clarity of reasoning. Or: Evaluate for retail relevance and prioritisation."
                                />

                                <small>
                                    Helps reviewers and AI identify focus areas when assessing this question. Questions can be outside retail; guidelines steer the analysis. If left empty, assess based on the response only.
                                </small>

                            </div>

                            {/* IMAGE */}

                            <div className="quiz-attachment-box">

                                <strong>
                                    Attach Image (Optional)
                                </strong>

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={
                                        (e) =>
                                            setImageFile(
                                                e.target.files?.[
                                                    0
                                                ] ||
                                                null
                                            )
                                    }
                                />

                                {questionForm.image_url && (
                                    <small>
                                        Existing:{" "}
                                        {
                                            questionForm.image_url
                                        }
                                    </small>
                                )}

                            </div>

                            {/* VIDEO */}

                            <div className="quiz-attachment-box">

                                <strong>
                                    Attach Video (Optional)
                                </strong>

                                <input
                                    value={
                                        questionForm.video_url ||
                                        ""
                                    }
                                    onChange={
                                        (e) =>
                                            setQuestionForm({
                                                ...questionForm,
                                                video_url:
                                                    e.target.value
                                            })
                                    }
                                    placeholder="Paste YouTube link here"
                                />

                                <div className="quiz-or">
                                    OR
                                </div>

                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={
                                        (e) =>
                                            setVideoFile(
                                                e.target.files?.[
                                                    0
                                                ] ||
                                                null
                                            )
                                    }
                                />

                                {questionForm.video_url && (
                                    <small>
                                        Existing:{" "}
                                        {
                                            questionForm.video_url
                                        }
                                    </small>
                                )}

                            </div>

                        </div>

                        {/* FOOTER */}

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

                                {
                                    saving
                                        ? "Saving..."
                                        : "Save Question"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}

            {/* ==========================================
                BULK GENERATE MODAL
            ========================================== */}

            {showBulk && (

                <div className="quiz-modal-backdrop">

                    <div className="quiz-modal quiz-bulk-modal">

                        <div className="quiz-modal-head">

                            <div>

                                <span>
                                    BULK QUESTION IMPORT
                                </span>

                                <h2>
                                    Bulk Generate
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowBulk(
                                        false
                                    )
                                }
                            >
                                <FaTimes />
                            </button>

                        </div>

                        <label>

                            One question per line

                            <textarea
                                rows={12}
                                value={
                                    bulkText
                                }
                                onChange={
                                    (e) =>
                                        setBulkText(
                                            e.target.value
                                        )
                                }
                                placeholder={
                                    "Question one...\nQuestion two...\nQuestion three..."
                                }
                            />

                        </label>

                        <div className="quiz-modal-footer">

                            <button
                                type="button"
                                className="quiz-secondary"
                                onClick={() =>
                                    setShowBulk(
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
                                    bulkGenerate
                                }
                            >

                                <FaMagic />

                                {
                                    bulkGenerating
                                        ? "Generating..."
                                        : "Generate Questions"
                                }

                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
};

export default QuizSetup;