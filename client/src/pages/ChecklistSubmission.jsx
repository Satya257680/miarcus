import PremiumLoader from "../components/premium/PremiumLoader";
import { useEffect, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import "../styles/ChecklistSubmission.css";
import "../styles/pages/ChecklistSubmissionPremium.css";
import {
  FaFileAlt,
  FaStore,
  FaCalendarAlt,
  FaPaperclip,
  FaListUl,
  FaCheck,
  FaInfoCircle,
  FaRedoAlt,
  FaArrowRight,
} from "react-icons/fa";
import checklistHeroArt from "../assets/premium/checklist-hero.png";
import checklistBulb from "../assets/premium/checklist-bulb.png";

const API = API_BASE_URL;

const CHECKLIST_STEPS = [
  { title: "Select Details", text: "Choose checklist, store and date", icon: FaFileAlt },
  { title: "Provide Information", text: "Fill the checklist answers", icon: FaListUl },
  { title: "Attach Evidence", text: "Upload images or files (optional)", icon: FaPaperclip },
  { title: "Review & Submit", text: "Verify and submit checklist", icon: FaCheck },
];

function ChecklistSubmission() {
  // =========================================================
  // DATA
  // =========================================================

  const [checklistTypes, setChecklistTypes] = useState([]);
  const [stores, setStores] = useState([]);
  const [questions, setQuestions] = useState([]);

  // =========================================================
  // FORM
  // =========================================================

  const [checklistTypeId, setChecklistTypeId] = useState("");
  const [storeId, setStoreId] = useState("");

  const [submissionDate, setSubmissionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [answers, setAnswers] = useState({});
  const [remarks, setRemarks] = useState({});
  const [attachmentFile, setAttachmentFile] = useState(null);

  // =========================================================
  // UI STATES
  // =========================================================

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // RBAC
  // =========================================================

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const permissions = JSON.parse(
    localStorage.getItem("permissions") || "{}"
  );

  const isAdmin =
    user.administrator === true ||
    user.administrator === 1 ||
    user.is_admin === true ||
    user.is_admin === 1;

  // The server stores this module as "Checklist Submission";
  // "Checklist Submit" is the old name kept for older sessions.
  const modulePermission = isAdmin
    ? "Full"
    : permissions["Checklist Submission"] ||
      permissions["Checklist Submit"] ||
      "None";

  const canView = [
    "View",
    "Add",
    "Edit",
    "Full",
  ].includes(modulePermission);

  const canAdd = [
    "Add",
    "Edit",
    "Full",
  ].includes(modulePermission);

  // =========================================================
  // CHECK WHETHER BASIC DETAILS ARE COMPLETE
  // =========================================================

  const basicDetailsComplete =
    Boolean(checklistTypeId) &&
    Boolean(storeId) &&
    Boolean(submissionDate);

  // =========================================================
  // LOAD CHECKLIST TYPES + STORES
  // =========================================================

  useEffect(() => {
    if (!canView) return;

    fetchChecklistTypes();
    fetchStores();
  }, [canView]);

  // =========================================================
  // FETCH CHECKLIST TYPES
  // =========================================================

  const fetchChecklistTypes = async () => {
    try {
      const response = await axios.get(
        `${API}/api/checklist-submissions/form-options/checklist-types`
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setChecklistTypes(data);
    } catch (error) {
      console.error(
        "Checklist Type Error:",
        error
      );
    }
  };

  // =========================================================
  // FETCH STORES
  // =========================================================

  const fetchStores = async () => {
    try {
      const response = await axios.get(
        `${API}/api/checklist-submissions/form-options/stores`
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setStores(data);
    } catch (error) {
      console.error(
        "Store Error:",
        error
      );
    }
  };

  // =========================================================
  // LOAD QUESTIONS ONLY AFTER ALL BASIC FIELDS
  // ARE COMPLETED
  // =========================================================

  useEffect(() => {
    if (!canView) {
      setQuestions([]);
      setAnswers({});
      setRemarks({});
      return;
    }

    // Do NOT load questions until all required
    // submission fields are completed.
    if (!basicDetailsComplete) {
      setQuestions([]);
      setAnswers({});
      setRemarks({});
      setLoadingQuestions(false);
      return;
    }

    fetchQuestions();
  }, [
    checklistTypeId,
    storeId,
    submissionDate,
    canView,
  ]);

  // =========================================================
  // FETCH QUESTIONS
  // =========================================================

  const fetchQuestions = async () => {
    try {
      setLoadingQuestions(true);
      setErrorMessage("");

      const response = await axios.get(
        `${API}/api/checklist-submissions/form-options/questions?checklist_type_id=${encodeURIComponent(checklistTypeId)}`
      );

      const allQuestions = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      const filteredQuestions = allQuestions.filter(
        (question) => {
          const questionChecklistId =
            question.checklist_type_id ||
            question.checklistTypeId;

          return (
            String(questionChecklistId) ===
            String(checklistTypeId)
          );
        }
      );

      const finalQuestions =
        filteredQuestions.length > 0
          ? filteredQuestions
          : allQuestions;

      setQuestions(finalQuestions);
      setAnswers({});
      setRemarks({});
    } catch (error) {
      console.error(
        "Question Error:",
        error
      );

      setQuestions([]);
      setErrorMessage(
        "Unable to load questions. Please try again."
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  // =========================================================
  // HANDLE CHECKLIST TYPE CHANGE
  // =========================================================

  const handleChecklistTypeChange = (value) => {
    setChecklistTypeId(value);

    // Reset previous answers when checklist changes.
    setQuestions([]);
    setAnswers({});
    setRemarks({});
    setErrorMessage("");
  };

  // =========================================================
  // HANDLE STORE CHANGE
  // =========================================================

  const handleStoreChange = (value) => {
    setStoreId(value);

    // Clear old questions until the new
    // combination is loaded.
    setQuestions([]);
    setAnswers({});
    setRemarks({});
    setErrorMessage("");
  };

  // =========================================================
  // ANSWER
  // =========================================================

  const handleAnswerChange = (
    questionId,
    value
  ) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  };

  // =========================================================
  // REMARK
  // =========================================================

  const handleRemarkChange = (
    questionId,
    value
  ) => {
    setRemarks((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  };

  // =========================================================
  // ATTACHMENT
  // =========================================================

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;

    setAttachmentFile(file);
  };

  // =========================================================
  // QUESTION TYPE
  // =========================================================

  const renderQuestionInput = (question) => {
    const questionId =
      question.id ||
      question.question_id;

    const type = (
      question.answer_type ||
      question.question_type ||
      question.type ||
      "text"
    )
      .toString()
      .toLowerCase();

    const value =
      answers[questionId] || "";

    // =======================================================
    // YES / NO
    // =======================================================

    if (
      type === "yes/no" ||
      type === "yes_no" ||
      type === "boolean"
    ) {
      return (
        <div className="answer-choice-group">
          <label
            className={`choice-option ${
              value === "Yes"
                ? "selected"
                : ""
            }`}
          >
            <input
              type="radio"
              name={`question-${questionId}`}
              value="Yes"
              checked={value === "Yes"}
              onChange={(e) =>
                handleAnswerChange(
                  questionId,
                  e.target.value
                )
              }
            />

            <span className="choice-circle">
              ✓
            </span>

            <span>Yes</span>
          </label>

          <label
            className={`choice-option ${
              value === "No"
                ? "selected"
                : ""
            }`}
          >
            <input
              type="radio"
              name={`question-${questionId}`}
              value="No"
              checked={value === "No"}
              onChange={(e) =>
                handleAnswerChange(
                  questionId,
                  e.target.value
                )
              }
            />

            <span className="choice-circle">
              ✕
            </span>

            <span>No</span>
          </label>
        </div>
      );
    }

    // =======================================================
    // NUMBER
    // =======================================================

    if (
      type === "number" ||
      type === "numeric"
    ) {
      return (
        <input
          type="number"
          className="answer-input"
          placeholder="Enter your answer"
          value={value}
          onChange={(e) =>
            handleAnswerChange(
              questionId,
              e.target.value
            )
          }
        />
      );
    }

    // =======================================================
    // DATE
    // =======================================================

    if (type === "date") {
      return (
        <input
          type="date"
          className="answer-input"
          value={value}
          onChange={(e) =>
            handleAnswerChange(
              questionId,
              e.target.value
            )
          }
        />
      );
    }

    // =======================================================
    // DROPDOWN
    // =======================================================

    if (
      type === "dropdown" ||
      type === "select"
    ) {
      let options = [];

      if (Array.isArray(question.options)) {
        options = question.options;
      } else if (question.options) {
        options = question.options
          .split(",")
          .map((option) => option.trim());
      }

      return (
        <select
          className="answer-input"
          value={value}
          onChange={(e) =>
            handleAnswerChange(
              questionId,
              e.target.value
            )
          }
        >
          <option value="">
            Select an answer
          </option>

          {options.map(
            (option, index) => (
              <option
                key={index}
                value={option}
              >
                {option}
              </option>
            )
          )}
        </select>
      );
    }

    // =======================================================
    // IMAGE / FILE
    // =======================================================

    if (
      type === "image" ||
      type === "photo" ||
      type === "file"
    ) {
      return (
        <input
          type="file"
          className="answer-input"
          accept="image/*"
          onChange={(e) =>
            handleAnswerChange(
              questionId,
              e.target.files?.[0] || null
            )
          }
        />
      );
    }

    // =======================================================
    // DEFAULT TEXT
    // =======================================================

    return (
      <textarea
        className="answer-textarea"
        placeholder="Enter your answer"
        value={value}
        onChange={(e) =>
          handleAnswerChange(
            questionId,
            e.target.value
          )
        }
      />
    );
  };

  // =========================================================
  // LOCATION
  // =========================================================

  const getCurrentLocation = () => {
    return new Promise(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(
            "Geolocation is not supported by this browser."
          );
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude:
                position.coords.latitude,
              longitude:
                position.coords.longitude,
            });
          },
          (error) => {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                reject(
                  "Location permission is required to submit the checklist."
                );
                break;

              case error.POSITION_UNAVAILABLE:
                reject(
                  "Location information is unavailable."
                );
                break;

              case error.TIMEOUT:
                reject(
                  "Location request timed out."
                );
                break;

              default:
                reject(
                  "Unable to get your current location."
                );
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    );
  };

  // =========================================================
  // DEVICE
  // =========================================================

  const getDeviceInfo = () => {
    return navigator.userAgent;
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canAdd) {
      alert(
        "You don't have permission to submit checklists."
      );
      return;
    }

    // -------------------------------------------------------
    // REQUIRED BASIC FIELDS
    // -------------------------------------------------------

    if (!checklistTypeId) {
      alert("Please select Checklist Type.");
      return;
    }

    if (!storeId) {
      alert("Please select Store.");
      return;
    }

    if (!submissionDate) {
      alert("Please select Date.");
      return;
    }

    if (questions.length === 0) {
      alert(
        "No questions are available for this checklist."
      );
      return;
    }

    // -------------------------------------------------------
    // REQUIRED QUESTIONS
    // -------------------------------------------------------

    for (const question of questions) {
      const questionId =
        question.id ||
        question.question_id;

      const required =
        question.required === true ||
        question.required === 1 ||
        question.is_required === true ||
        question.is_required === 1;

      if (
        required &&
        (
          answers[questionId] === undefined ||
          answers[questionId] === null ||
          answers[questionId] === ""
        )
      ) {
        alert(
          `Please answer: ${
            question.question ||
            question.question_text ||
            question.title
          }`
        );

        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      // -----------------------------------------------------
      // LOCATION
      // -----------------------------------------------------

      let location;

      try {
        location =
          await getCurrentLocation();
      } catch (error) {
        alert(error);
        setSubmitting(false);
        return;
      }

      // -----------------------------------------------------
      // USER
      // -----------------------------------------------------

      const currentUser =
        JSON.parse(
          localStorage.getItem("user") ||
            "{}"
        );

      // -----------------------------------------------------
      // FORMAT ANSWERS
      // -----------------------------------------------------

      const formattedAnswers =
        questions.map((question) => {
          const questionId =
            question.id ||
            question.question_id;

          return {
            question_id: questionId,

            answer:
              answers[questionId] || "",

            remarks:
              remarks[questionId] || "",
          };
        });

      // -----------------------------------------------------
      // FORM DATA
      // -----------------------------------------------------

      const formData = new FormData();

      formData.append(
        "checklist_type_id",
        checklistTypeId
      );

      formData.append(
        "store_id",
        storeId
      );

      formData.append(
        "submission_date",
        submissionDate
      );

      formData.append(
        "submitted_by",
        currentUser.id ||
          currentUser.user_id ||
          ""
      );

      formData.append(
        "latitude",
        location.latitude
      );

      formData.append(
        "longitude",
        location.longitude
      );

      formData.append(
        "device",
        getDeviceInfo()
      );

      // -----------------------------------------------------
      // ATTACHMENT IS OPTIONAL
      // -----------------------------------------------------

      if (attachmentFile) {
        formData.append(
          "attachment",
          attachmentFile
        );
      }

      formData.append(
        "answers",
        JSON.stringify(
          formattedAnswers
        )
      );

      // -----------------------------------------------------
      // API
      // -----------------------------------------------------

      await axios.post(
        `${API}/api/checklist-submissions`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      alert(
        "Checklist submitted successfully!"
      );

      // -----------------------------------------------------
      // RESET
      // -----------------------------------------------------

      setChecklistTypeId("");
      setStoreId("");

      setSubmissionDate(
        new Date()
          .toISOString()
          .split("T")[0]
      );

      setQuestions([]);
      setAnswers({});
      setRemarks({});
      setAttachmentFile(null);

      // Reset file input visually.
      const fileInput =
        document.getElementById(
          "checklist-attachment"
        );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error(
        "Checklist Submission Error:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Unable to submit checklist.";

      setErrorMessage(message);

      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // PERMISSION
  // =========================================================

  if (!canView) {
    return (
      <div className="no-permission">
        <div className="permission-icon">
          🔒
        </div>

        <h2>Access Denied</h2>

        <p>
          You don't have permission to view
          Checklist Submission.
        </p>
      </div>
    );
  }

  // =========================================================
  // PREMIUM STEPPER STATE
  // =========================================================

  const questionKey = (question) => question.id || question.question_id;
  const isAnswered = (question) => {
    const value = answers[questionKey(question)];
    return value !== undefined && value !== null && value !== "";
  };
  const isRequired = (question) =>
    question.required === true ||
    question.required === 1 ||
    question.is_required === true ||
    question.is_required === 1;

  const answeredCount = questions.filter(isAnswered).length;
  const requiredLeft = questions.filter((question) => isRequired(question) && !isAnswered(question)).length;
  const allAnswered = questions.length > 0 && requiredLeft === 0 && answeredCount > 0;

  // Attach Evidence is optional, so once every required answer is filled
  // the flow moves straight to Review & Submit.
  const currentStep = !basicDetailsComplete || !questions.length
    ? 0
    : !allAnswered
      ? 1
      : 3;

  const goToQuestions = () => {
    const target = document.getElementById("cs-questions");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetSubmission = () => {
    setChecklistTypeId("");
    setStoreId("");
    setSubmissionDate(new Date().toISOString().split("T")[0]);
    setQuestions([]);
    setAnswers({});
    setRemarks({});
    setAttachmentFile(null);
    setErrorMessage("");
    const fileInput = document.getElementById("checklist-attachment");
    if (fileInput) fileInput.value = "";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="checklist-submission-page cs-premium">

      {/* ====================================================
          PREMIUM HERO
      ==================================================== */}

      <section className="cs-hero">
        <div className="cs-hero-text">
          <span className="cs-eyebrow">
            <FaListUl /> CHECKLIST MODULE
          </span>
          <div className="cs-title-row">
            <h1>Checklist Submission</h1>
            <span className="cs-live"><i /> Live</span>
          </div>
          <p>Complete the required details and submit your store checklist.</p>
        </div>
        <img className="cs-hero-art" src={checklistHeroArt} alt="" draggable="false" />
        <div className="cs-quote">
          <img src={checklistBulb} alt="" draggable="false" />
          <p>“Accurate checklists help maintain quality and drive better operations.”</p>
        </div>
      </section>

      {/* ====================================================
          STEPPER
      ==================================================== */}

      <section className="cs-stepper-card">
        <div className="cs-stepper">
          {CHECKLIST_STEPS.map((step, index) => {
            const state = index < currentStep ? "done" : index === currentStep ? "active" : "todo";
            const Icon = step.icon;
            return (
              <div key={step.title} className={`cs-step is-${state}`}>
                {index > 0 && (
                  <span className="cs-step-line">
                    <i style={{ width: index <= currentStep ? "100%" : index === currentStep + 1 ? "40%" : "0%" }} />
                  </span>
                )}
                <span className="cs-step-icon">
                  {state === "done" ? <FaCheck /> : <Icon />}
                </span>
                <b>{index + 1}. {step.title}</b>
                <small>{step.text}</small>
              </div>
            );
          })}
        </div>

      {/* ====================================================
          FORM
      ==================================================== */}

      <form
        onSubmit={handleSubmit}
        className="checklist-form"
      >

        {/* ==================================================
            BASIC INFORMATION
        ================================================== */}

        <div className="checklist-selection-card cs-details-card">

          <div className="cs-section-heading">
            <div className="cs-section-number">
              1
            </div>

            <div>
              <h3>
                Submission Details
              </h3>

              <p>
                Select the checklist type, store and date you want to inspect.
              </p>
            </div>
          </div>

          <div className="selection-grid cs-fields">

            {/* CHECKLIST TYPE */}

            <div className="checklist-field cs-field">

              <span className="cs-field-icon"><FaFileAlt /></span>

              <div className="cs-field-body">

              <label>
                Checklist Type
                <span>*</span>
              </label>

              <select
                value={checklistTypeId}
                onChange={(e) =>
                  handleChecklistTypeChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Checklist Type
                </option>

                {checklistTypes.map(
                  (checklist) => {
                    const id =
                      checklist.id ||
                      checklist.checklist_type_id;

                    return (
                      <option
                        key={id}
                        value={id}
                      >
                        {checklist.name ||
                          checklist.checklist_name ||
                          checklist.title}
                      </option>
                    );
                  }
                )}
              </select>

              <small>
                Choose the checklist you want
                to complete.
              </small>

              </div>

            </div>

            {/* STORE */}

            <div className="checklist-field cs-field">

              <span className="cs-field-icon"><FaStore /></span>

              <div className="cs-field-body">

              <label>
                Store
                <span>*</span>
              </label>

              <select
                value={storeId}
                onChange={(e) =>
                  handleStoreChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Store
                </option>

                {stores.map((store) => {
                  const id =
                    store.id ||
                    store.store_id;

                  return (
                    <option
                      key={id}
                      value={id}
                    >
                      {store.store_name ||
                        store.name}
                    </option>
                  );
                })}
              </select>

              <small>
                Select the store being inspected.
              </small>

              </div>

            </div>

            {/* DATE */}

            <div className="checklist-field cs-field">

              <span className="cs-field-icon"><FaCalendarAlt /></span>

              <div className="cs-field-body">

              <label>
                Submission Date
                <span>*</span>
              </label>

              <input
                type="date"
                value={submissionDate}
                onChange={(e) =>
                  setSubmissionDate(
                    e.target.value
                  )
                }
              />

              <small>
                Date of the checklist inspection.
              </small>

              </div>

            </div>

            {/* ATTACHMENT */}

            <div className="checklist-field cs-field">

              <span className="cs-field-icon"><FaPaperclip /></span>

              <div className="cs-field-body">

              <label>
                Attachment
                <span className="optional-label">
                  Optional
                </span>
              </label>

              <div className="file-upload-wrapper cs-file">

                <input
                  id="checklist-attachment"
                  type="file"
                  className="cs-file-input"
                  onChange={
                    handleAttachmentChange
                  }
                />

                <label htmlFor="checklist-attachment" className="cs-file-btn">
                  Choose File
                </label>

                <span className="cs-file-name" title={attachmentFile?.name || ""}>
                  {attachmentFile ? attachmentFile.name : "No file chosen"}
                </span>

              </div>

              <small>
                Add supporting evidence if required.
              </small>

              </div>

            </div>

          </div>

          {/* BASIC FIELD STATUS */}

          {!basicDetailsComplete ? (
            <div className="form-hint cs-hint">

              <span className="cs-hint-icon">
                <FaInfoCircle />
              </span>

              <span>
                Select the <strong>Checklist Type</strong>,
                <strong> Store</strong>, and
                <strong> Date</strong> to load
                the checklist questions.
              </span>

            </div>
          ) : questions.length > 0 && (
            <div className="form-hint cs-hint cs-hint-ok">
              <span className="cs-hint-icon"><FaCheck /></span>
              <span>
                <strong>{questions.length}</strong> questions loaded ·{" "}
                <strong>{answeredCount}</strong> answered
                {requiredLeft > 0 ? <> · <strong>{requiredLeft}</strong> required remaining</> : " · all required questions answered"}
              </span>
            </div>
          )}

          <div className="cs-actions">
            <button type="button" className="cs-btn cs-btn-ghost" onClick={resetSubmission} disabled={submitting}>
              <FaRedoAlt /> Reset
            </button>
            <button
              type="button"
              className="cs-btn cs-btn-primary"
              onClick={goToQuestions}
              disabled={!basicDetailsComplete || loadingQuestions}
            >
              Next <FaArrowRight />
            </button>
          </div>

        </div>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loadingQuestions && (
          <div className="questions-loading">

            <PremiumLoader compact title="Loading checklist questions" />

          </div>
        )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {errorMessage && (
          <div className="checklist-error">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ==================================================
            QUESTIONS
        ================================================== */}

        {!loadingQuestions &&
          basicDetailsComplete &&
          questions.length > 0 && (

            <div className="questions-section" id="cs-questions">

              <div className="questions-heading">

                <div className="section-heading">
                  <div className="section-icon">
                    2
                  </div>

                  <div>
                    <h3>
                      Checklist Questions
                    </h3>

                    <p>
                      Answer all required questions
                      before submitting.
                    </p>
                  </div>
                </div>

                <div className="question-count">
                  <strong>
                    {questions.length}
                  </strong>

                  <span>
                    Questions
                  </span>
                </div>

              </div>

              {/* QUESTIONS */}

              <div className="question-list">

                {questions.map(
                  (question, index) => {

                    const questionId =
                      question.id ||
                      question.question_id;

                    const questionText =
                      question.question ||
                      question.question_text ||
                      question.title ||
                      "Checklist Question";

                    const required =
                      question.required === true ||
                      question.required === 1 ||
                      question.is_required === true ||
                      question.is_required === 1;

                    const answered =
                      answers[questionId] !==
                        undefined &&
                      answers[questionId] !==
                        null &&
                      answers[questionId] !== "";

                    return (
                      <div
                        className={`question-card ${
                          answered
                            ? "answered"
                            : ""
                        }`}
                        key={questionId}
                      >

                        <div className="question-top">

                          <div className="question-number">
                            {index + 1}
                          </div>

                          <div className="question-content">

                            <div className="question-title">

                              <h4>
                                {questionText}

                                {required && (
                                  <span className="required-star">
                                    *
                                  </span>
                                )}
                              </h4>

                              {answered && (
                                <span className="answered-badge">
                                  ✓ Answered
                                </span>
                              )}

                            </div>

                            <div className="question-answer">
                              {renderQuestionInput(
                                question
                              )}
                            </div>

                            <div className="remarks-wrapper">

                              <label>
                                Remarks
                                <span>
                                  Optional
                                </span>
                              </label>

                              <textarea
                                className="remarks-input"
                                placeholder="Add any additional observation or remark..."
                                value={
                                  remarks[
                                    questionId
                                  ] || ""
                                }
                                onChange={(e) =>
                                  handleRemarkChange(
                                    questionId,
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

              {/* =================================================
                  SUBMIT
              ================================================= */}

              <div className="submit-area">

                <div className="submit-info">
                  <span className="submit-check">
                    ✓
                  </span>

                  <span>
                    Your answers will be recorded
                    securely.
                  </span>
                </div>

                <button
                  type="submit"
                  className="submit-checklist-btn"
                  disabled={
                    !canAdd ||
                    submitting
                  }
                >
                  {submitting ? (
                    <>
                      <span className="button-spinner"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Checklist
                      <span>
                        →
                      </span>
                    </>
                  )}
                </button>

              </div>

            </div>
          )}

        {/* ==================================================
            NO QUESTIONS
        ================================================== */}

        {!loadingQuestions &&
          basicDetailsComplete &&
          questions.length === 0 &&
          !errorMessage && (

            <div className="empty-questions">

              <div className="empty-icon">
                ✓
              </div>

              <h3>
                No Questions Found
              </h3>

              <p>
                No questions are configured
                for the selected checklist type.
              </p>

            </div>
          )}

      </form>

      </section>

    </div>
  );
}

export default ChecklistSubmission;