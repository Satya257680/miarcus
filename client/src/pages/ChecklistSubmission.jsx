import PremiumLoader from "../components/premium/PremiumLoader";
import { useEffect, useRef, useState } from "react";
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
  FaSyncAlt,
  FaArrowRight,
} from "react-icons/fa";
import checklistHeroArt from "../assets/premium/checklist-hero.png";
import checklistBulb from "../assets/premium/checklist-bulb.png";
import QuestionPhotoPicker from "../components/checklist/QuestionPhotoPicker";
import { releasePhoto } from "../utils/photoEvidence";
import {
  isPhotoRequiredQuestion,
  isYesNoType,
  expectedAnswerOf,
  unexpectedAnswerOf,
} from "../config/checklistPhotoRules";

const API = API_BASE_URL;

const CHECKLIST_STEPS = [
  { title: "Select Details", text: "Choose checklist, store and date", icon: FaFileAlt },
  { title: "Provide Information", text: "Fill the checklist answers", icon: FaListUl },
  { title: "Attach Evidence", text: "Upload images or files (optional)", icon: FaPaperclip },
  { title: "Review & Submit", text: "Verify and submit checklist", icon: FaCheck },
];


// ---------------------------------------------------------
// ANSWER HELPERS
// Every checklist question is mandatory. A whitespace-only
// text answer does not count as answered.
// ---------------------------------------------------------
const hasAnswerValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof File !== "undefined" && value instanceof File) return true;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
};

// ---------------------------------------------------------
// PHOTO EVIDENCE RULES
// ---------------------------------------------------------
// Decides, per question, whether a photo is needed:
//   • Admin setting (Questions → "Photo Evidence")
//       Required / Required on No / Optional / None
//   • Auto (no setting): "Image" answer type, or the question
//     text asks for a photo / picture / image  → Required
//   • Everything else → optional "Add Photo" next to Remarks
// ---------------------------------------------------------
const IMAGE_TYPES = ["image", "photo", "file", "picture"];
const PHOTO_WORDS = /\b(photos?|pictures?|pics?|images?|snaps?|selfies?|photographs?|click a pic)\b/i;

const questionType = (question) =>
  String(question.answer_type || question.question_type || question.type || "text")
    .trim()
    .toLowerCase();

const isImageQuestion = (question) => IMAGE_TYPES.includes(questionType(question));

const photoRule = (question, answerValue) => {
  const setting = String(question.photo_requirement || "").trim().toLowerCase();
  const text = question.question || question.question_text || question.title || "";

  if (isImageQuestion(question)) {
    return { mode: "required", reason: "Answer this question with a photo" };
  }
  if (setting === "none") return { mode: "none", reason: "" };
  if (setting === "required") return { mode: "required", reason: "" };
  if (setting === "required on no" || setting === "required_on_no") {
    return String(answerValue || "").trim().toLowerCase() === "no"
      ? { mode: "required", reason: "Required because the answer is No" }
      : { mode: "optional", reason: "" };
  }
  if (setting === "optional") return { mode: "optional", reason: "" };

  // Auto + Yes / No: photo only for the unexpected answer.
  //   expected No  ("Are there any paint issues?")  → Yes needs a photo
  //   expected Yes ("Is the fire extinguisher available?") → No needs a photo
  if (isYesNoType(questionType(question))) {
    const given = String(answerValue || "").trim().toLowerCase();
    const expected = expectedAnswerOf(question);
    const unexpected = unexpectedAnswerOf(question);

    if (given && given === unexpected.toLowerCase()) {
      return {
        mode: "required",
        reason: `Photo required because the answer is ${unexpected}`,
      };
    }

    return {
      mode: "optional",
      reason: "",
      hint: given ? "" : `Photo needed if answer is ${unexpected}`,
      expected,
    };
  }

  // Questions marked "Required" in the Opening / Closing checklist sheets
  if (isPhotoRequiredQuestion(text)) return { mode: "required", reason: "" };
  if (PHOTO_WORDS.test(text)) return { mode: "required", reason: "" };
  return { mode: "optional", reason: "" };
};

const answerToText = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof File !== "undefined" && value instanceof File) return value.name || "file";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).trim();
};

// Fixed submission windows use India Standard Time (Asia/Kolkata).
// Opening Checklist: 08:00 AM–02:00 PM. Closing Checklist: 08:00 PM–12:00 AM.
const getChecklistWindowStatus = (checklistName, now = new Date()) => {
  const name = String(checklistName || "").toLowerCase();
  const isOpening = name.includes("opening");
  const isClosing = name.includes("closing");
  if (!isOpening && !isClosing) return { restricted: false, allowed: true, label: "" };

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  const minutes = hour * 60 + minute;

  if (isOpening) {
    return {
      restricted: true,
      allowed: minutes >= 480 && minutes < 840,
      label: "Opening Checklist · 08:00 AM–02:00 PM",
    };
  }

  return {
    restricted: true,
    allowed: minutes >= 1200 && minutes < 1440,
    label: "Closing Checklist · 08:00 PM–12:00 AM",
  };
};


// ---------------------------------------------------------
// SEARCHABLE SELECT
// Custom dropdown used for Checklist Type and Store.
// The menu is intentionally anchored below the field.
// ---------------------------------------------------------
function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  onChange,
  getOptionLabel,
  getOptionValue,
  icon,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

  const selectedOption =
    options.find(
      (option) =>
        String(getOptionValue(option)) === String(value)
    ) || null;

  const filteredOptions = options.filter((option) =>
    String(getOptionLabel(option) || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    setOpen((current) => !current);
  };

  const handleSelect = (option) => {
    onChange(String(getOptionValue(option)));
    setOpen(false);
    setSearch("");
  };

  return (
    <div
      ref={wrapperRef}
      className={`cs-search-select ${open ? "is-open" : ""} ${
        disabled ? "is-disabled" : ""
      }`}
    >
      <button
        type="button"
        className="cs-search-select-trigger"
        onClick={handleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`cs-search-select-value ${!selectedOption ? "is-placeholder" : ""}`}>
          {selectedOption ? (
            <>
              {icon && <span className="cs-search-select-selected-icon">{icon}</span>}
              <span className="cs-search-select-selected-text">
                {getOptionLabel(selectedOption)}
              </span>
            </>
          ) : (
            placeholder
          )}
        </span>

        <span className="cs-search-select-chevron" aria-hidden="true">
          <span />
        </span>
      </button>

      {open && (
        <div className="cs-search-select-menu" role="listbox">
          <div className="cs-search-select-search">
            <span className="cs-search-icon" aria-hidden="true">⌕</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
              }}
              placeholder={searchPlaceholder}
              autoComplete="off"
              spellCheck="false"
              aria-label={searchPlaceholder}
            />
            {search && (
              <button
                type="button"
                className="cs-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="cs-search-select-results">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const optionValue = String(getOptionValue(option));
                const isSelected = String(value) === optionValue;

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    key={optionValue}
                    className={`cs-search-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="cs-search-option-text">
                      {getOptionLabel(option)}
                    </span>
                    {isSelected && <FaCheck className="cs-search-option-check" />}
                  </button>
                );
              })
            ) : (
              <div className="cs-search-empty">
                <span className="cs-search-empty-icon">⌕</span>
                <strong>No matching results</strong>
                <small>Try another name or keyword.</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [refreshingQuestions, setRefreshingQuestions] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Per-question photo evidence: { [questionId]: [{ id, kind, file|url, preview }] }
  const [photos, setPhotos] = useState({});
  const [photoMissing, setPhotoMissing] = useState(null);

  const clearPhotos = () => {
    setPhotos((previous) => {
      Object.values(previous).flat().forEach(releasePhoto);
      return {};
    });
    setPhotoMissing(null);
  };

  const setQuestionPhotos = (questionId, list) => {
    setPhotos((previous) => ({ ...previous, [questionId]: list }));
    if (list.length && String(photoMissing) === String(questionId)) setPhotoMissing(null);
  };

  const photosOf = (questionId) => photos[questionId] || [];

  // Image questions are answered by their photos.
  const effectiveAnswer = (question) => {
    const questionId = question.id || question.question_id;
    if (isImageQuestion(question)) {
      const count = photosOf(questionId).length;
      return count ? `Photo attached (${count})` : "";
    }
    return answers[questionId];
  };

  // =========================================================
  // UI STATES
  // =========================================================

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Refresh the current IST submission window while the page stays open.
  const [windowClock, setWindowClock] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setWindowClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // =========================================================
  // RBAC
  // =========================================================

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const draftStorageKey = `miarcus:checklist-submission:draft:${user.id || user.user_id || "current"}`;

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

  const selectedChecklistType = checklistTypes.find(
    (item) => String(item.id || item.checklist_type_id) === String(checklistTypeId)
  );
  const checklistWindow = getChecklistWindowStatus(
    selectedChecklistType?.checklist_name ||
      selectedChecklistType?.name ||
      selectedChecklistType?.title,
    new Date(windowClock)
  );

  const basicDetailsComplete =
    Boolean(checklistTypeId) &&
    Boolean(storeId) &&
    Boolean(submissionDate);

  // =========================================================
  // DRAFT PERSISTENCE
  // Keep the in-progress checklist when the user navigates to
  // another module, switches browser tabs, or the mobile browser
  // is interrupted by a phone call. Reset is the only action that
  // intentionally removes this draft.
  // =========================================================
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.checklistTypeId) setChecklistTypeId(String(draft.checklistTypeId));
        if (draft?.storeId) setStoreId(String(draft.storeId));
        if (draft?.submissionDate) setSubmissionDate(String(draft.submissionDate));
        if (draft?.answers && typeof draft.answers === "object") setAnswers(draft.answers);
        if (draft?.remarks && typeof draft.remarks === "object") setRemarks(draft.remarks);
        setDraftRestored(Boolean(draft?.checklistTypeId || draft?.storeId || Object.keys(draft?.answers || {}).length));
      }
    } catch (error) {
      console.warn("Unable to restore checklist draft:", error);
    } finally {
      setDraftHydrated(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      const hasDraft = Boolean(
        checklistTypeId ||
        storeId ||
        Object.keys(answers).length ||
        Object.keys(remarks).length
      );
      if (!hasDraft) {
        localStorage.removeItem(draftStorageKey);
        return;
      }
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          version: 1,
          checklistTypeId,
          storeId,
          submissionDate,
          answers,
          remarks,
          savedAt: Date.now(),
        })
      );
    } catch (error) {
      console.warn("Unable to save checklist draft:", error);
    }
  }, [
    draftHydrated,
    draftStorageKey,
    checklistTypeId,
    storeId,
    submissionDate,
    answers,
    remarks,
  ]);

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
    if (!draftHydrated) return;

    if (!canView) {
      setQuestions([]);
      clearPhotos();
      return;
    }

    // Do NOT load questions until all required
    // submission fields are completed.
    if (!basicDetailsComplete) {
      setQuestions([]);
      setLoadingQuestions(false);
      return;
    }

    fetchQuestions();
  }, [
    checklistTypeId,
    storeId,
    submissionDate,
    canView,
    draftHydrated,
  ]);

  // =========================================================
  // FETCH QUESTIONS
  // =========================================================

  const fetchQuestions = async ({ manual = false } = {}) => {
    try {
      // Initial load uses the page loader. Manual refresh keeps the
      // question cards visible while their definitions are reloaded.
      setLoadingQuestions(!manual);
      if (manual) setRefreshingQuestions(true);
      setErrorMessage("");

      const refreshToken = manual ? `&_refresh=${Date.now()}` : "";

      const response = await axios.get(
        `${API}/api/checklist-submissions/form-options/questions?checklist_type_id=${encodeURIComponent(checklistTypeId)}${refreshToken}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }
      );

      const allQuestions = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      const filteredQuestions = allQuestions.filter((question) => {
        const questionChecklistId =
          question.checklist_type_id ||
          question.checklistTypeId;

        return (
          String(questionChecklistId) ===
          String(checklistTypeId)
        );
      });

      const finalQuestions =
        filteredQuestions.length > 0
          ? filteredQuestions
          : allQuestions;

      setQuestions(finalQuestions);
    } catch (error) {
      console.error("Question Error:", error);

      // A manual refresh intentionally clears the old form values first.
      // Never restore the old answers/photos/remarks after a refresh failure.
      if (!manual) {
        setQuestions([]);
      }

      setErrorMessage(
        manual
          ? "Questions could not be refreshed. The form was cleared as requested; please try Refresh Questions again."
          : "Unable to load questions. Please try again."
      );
    } finally {
      setLoadingQuestions(false);
      setRefreshingQuestions(false);
    }
  };

  const refreshQuestionsManually = async () => {
    if (!basicDetailsComplete || loadingQuestions || refreshingQuestions) return;

    // TRUE REFRESH:
    // Keep Checklist Type + Store + Date.
    // Clear every answer, remark, question photo/evidence and attachment
    // immediately, then fetch the latest question definitions without
    // reloading the browser.
    setAnswers({});
    setRemarks({});
    clearPhotos();
    setAttachmentFile(null);
    setDraftRestored(false);
    setErrorMessage("");

    const fileInput = document.getElementById("checklist-attachment");
    if (fileInput) fileInput.value = "";

    await fetchQuestions({ manual: true });

    requestAnimationFrame(() => {
      document.getElementById("cs-questions")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // =========================================================
  // HANDLE CHECKLIST TYPE CHANGE
  // =========================================================

  const handleChecklistTypeChange = (value) => {
    setChecklistTypeId(value);

    // Reset previous answers when checklist changes.
    setQuestions([]);
    setAnswers({});
      clearPhotos();
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
      clearPhotos();
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
      .toLowerCase()
      // "Yes / No" (as saved by the Questions screen) → "yes/no"
      .replace(/\s+/g, "");

    const value =
      answers[questionId] || "";

    // =======================================================
    // YES / NO
    // =======================================================

    if (
      type === "yes/no" ||
      type === "yes_no" ||
      type === "yesno" ||
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
      type === "file" ||
      type === "picture"
    ) {
      // Answered with the photo evidence block below the question.
      return null;
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

    if (checklistWindow.restricted && !checklistWindow.allowed) {
      alert(`${checklistWindow.label} is currently closed. You can submit only during the allowed time window.`);
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

      // Every question of every checklist type is mandatory.
      const required = true;

      if (
        required &&
        !hasAnswerValue(effectiveAnswer(question))
      ) {
        const card = document.getElementById(`cs-q-${questionId}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("unanswered-highlight");
          setTimeout(() => card.classList.remove("unanswered-highlight"), 2500);
        }

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

    // -------------------------------------------------------
    // REQUIRED PHOTO EVIDENCE
    // -------------------------------------------------------

    for (const question of questions) {
      const questionId = question.id || question.question_id;
      const rule = photoRule(question, answers[questionId]);

      if (rule.mode === "required" && photosOf(questionId).length === 0) {
        setPhotoMissing(questionId);
        const card = document.getElementById(`cs-q-${questionId}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("unanswered-highlight");
          setTimeout(() => card.classList.remove("unanswered-highlight"), 2500);
        }
        alert(
          `Please add a photo for: ${
            question.question || question.question_text || question.title
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
              answerToText(effectiveAnswer(question)),

            remarks:
              remarks[questionId] || "",

            // Photos added "From Website" (links). Uploaded photos
            // are sent as files below (question_photos).
            photo_urls: photosOf(questionId)
              .filter((photo) => photo.kind === "url")
              .map((photo) => photo.url),
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
      // PER-QUESTION PHOTOS
      // question_photo_map[i] = question id of question_photos[i]
      // -----------------------------------------------------

      const photoMap = [];

      questions.forEach((question) => {
        const questionId = question.id || question.question_id;
        photosOf(questionId)
          .filter((photo) => photo.kind === "file" && photo.file)
          .forEach((photo) => {
            formData.append("question_photos", photo.file, photo.file.name || "photo.jpg");
            photoMap.push(questionId);
          });
      });

      formData.append(
        "question_photo_map",
        JSON.stringify(photoMap)
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

      try {
        localStorage.removeItem(draftStorageKey);
      } catch (error) {
        console.warn("Unable to clear submitted checklist draft:", error);
      }
      setDraftRestored(false);

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
      clearPhotos();
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

  const isAnswered = (question) => hasAnswerValue(effectiveAnswer(question));
  // All questions are mandatory for every checklist type.
  // eslint-disable-next-line no-unused-vars
  const isRequired = (question) => true;

  const answeredCount = questions.filter(isAnswered).length;
  const totalPhotos = Object.values(photos).reduce((sum, list) => sum + (list?.length || 0), 0);
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
    try {
      localStorage.removeItem(draftStorageKey);
    } catch (error) {
      console.warn("Unable to clear checklist draft:", error);
    }
    setDraftRestored(false);
    setChecklistTypeId("");
    setStoreId("");
    setSubmissionDate(new Date().toISOString().split("T")[0]);
    setQuestions([]);
    setAnswers({});
      clearPhotos();
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
          {draftRestored && (
            <div className="cs-draft-status" role="status">
              <span className="cs-draft-status-dot">✓</span>
              <span><strong>In Progress — Preserved</strong><small>Your selections and answers stay saved when you leave and return.</small></span>
            </div>
          )}
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

              <SearchableSelect
                value={checklistTypeId}
                options={checklistTypes}
                placeholder="Select Checklist Type"
                searchPlaceholder="Search checklist type..."
                onChange={handleChecklistTypeChange}
                getOptionValue={(checklist) =>
                  checklist.id || checklist.checklist_type_id
                }
                getOptionLabel={(checklist) =>
                  checklist.name ||
                  checklist.checklist_name ||
                  checklist.title ||
                  "Unnamed Checklist"
                }
                icon={<FaFileAlt />}
              />

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

              <SearchableSelect
                value={storeId}
                options={stores}
                placeholder="Select Store"
                searchPlaceholder="Search store name..."
                onChange={handleStoreChange}
                getOptionValue={(store) =>
                  store.id || store.store_id
                }
                getOptionLabel={(store) =>
                  store.store_name ||
                  store.name ||
                  "Unnamed Store"
                }
                icon={<FaStore />}
              />

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
                {totalPhotos > 0 && <> · <strong>{totalPhotos}</strong> photo{totalPhotos > 1 ? "s" : ""}</>}
                {requiredLeft > 0 ? <> · <strong>{requiredLeft}</strong> required remaining</> : " · all required questions answered"}
              </span>
            </div>
          )}

          {draftRestored && (
            <div className="cs-draft-restored-banner">
              <span className="cs-draft-restored-icon"><FaCheck /></span>
              <span><strong>Form restored successfully</strong><small>Your previous selections, answers and remarks are still intact.</small></span>
              <span className="cs-draft-restored-note">Navigation or a phone call will not reset this form.</span>
            </div>
          )}

          {checklistWindow.restricted && (
            <div className={`cs-submission-window ${checklistWindow.allowed ? "is-open" : "is-closed"}`}>
              <span>{checklistWindow.allowed ? "✓" : "⏰"}</span>
              <div>
                <strong>{checklistWindow.label}</strong>
                <small>
                  {checklistWindow.allowed
                    ? "Submission is currently allowed."
                    : "Submission is currently locked. Please return during the allowed window."}
                </small>
              </div>
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

                <div className="cs-question-header-actions">
                  <div className="question-count">
                    <strong>{questions.length}</strong>
                    <span>Questions</span>
                  </div>

                  <button
                    type="button"
                    className="cs-question-refresh-btn"
                    onClick={refreshQuestionsManually}
                    disabled={refreshingQuestions || loadingQuestions}
                    title="Reload the latest questions and clear all current answers, remarks and evidence"
                  >
                    <FaSyncAlt className={refreshingQuestions ? "cs-spin" : ""} />
                    {refreshingQuestions ? "Refreshing…" : "Refresh Questions"}
                  </button>

                  <small className="cs-question-refresh-help">
                    Clears current answers and evidence, then reloads the latest questions.
                  </small>
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

                    // Every question of every checklist type is mandatory.
                    const required = true;

                    const answered =
                      hasAnswerValue(effectiveAnswer(question));

                    const rule = photoRule(question, answers[questionId]);
                    const questionPhotos = photosOf(questionId);
                    const typeLabel =
                      question.answer_type || question.question_type || question.type || "Text";

                    return (
                      <div
                        className={`question-card ${
                          answered
                            ? "answered"
                            : ""
                        }`}
                        key={questionId}
                        id={`cs-q-${questionId}`}
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

                            <div className="cs-q-meta">
                              <span>Type: {typeLabel}</span>
                              {rule.mode === "required" && (
                                <span className="cs-q-photo-req">
                                  + Photo <b>(Required)</b>
                                </span>
                              )}
                              {rule.mode !== "required" && rule.hint && (
                                <span className="cs-q-photo-hint">
                                  📷 {rule.hint}
                                </span>
                              )}
                              {questionPhotos.length > 0 && (
                                <span className="cs-q-photo-count">
                                  📷 {questionPhotos.length}
                                </span>
                              )}
                            </div>

                            <div className="question-answer">
                              {renderQuestionInput(
                                question
                              )}
                            </div>

                            {rule.mode === "required" && (
                              <QuestionPhotoPicker
                                questionId={questionId}
                                mode="required"
                                reason={rule.reason}
                                photos={questionPhotos}
                                missing={String(photoMissing) === String(questionId)}
                                disabled={submitting}
                                onChange={(list) => setQuestionPhotos(questionId, list)}
                              />
                            )}

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

                              {rule.mode === "optional" && (
                                <QuestionPhotoPicker
                                  questionId={questionId}
                                  mode="optional"
                                  photos={questionPhotos}
                                  disabled={submitting}
                                  onChange={(list) => setQuestionPhotos(questionId, list)}
                                />
                              )}

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
                    submitting ||
                    (checklistWindow.restricted && !checklistWindow.allowed)
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