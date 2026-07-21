import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/ChecklistSubmission.css";

function ChecklistSubmission() {
  const [checklistTypes, setChecklistTypes] = useState([]);
  const [stores, setStores] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [checklistTypeId, setChecklistTypeId] = useState("");
  const [storeId, setStoreId] = useState("");

  const [submissionDate, setSubmissionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [answers, setAnswers] = useState({});
  const [remarks, setRemarks] = useState({});
  const [attachmentFile, setAttachmentFile] = useState(null);

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // Load Checklist Types + Stores
  // ==========================================

  useEffect(() => {
    fetchChecklistTypes();
    fetchStores();
  }, []);

  const fetchChecklistTypes = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/checklist-types"
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      setChecklistTypes(data);
    } catch (error) {
      console.error("Checklist Type Error:", error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/stores"
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      setStores(data);
    } catch (error) {
      console.error("Store Error:", error);
    }
  };

  // ==========================================
  // Load Questions when Checklist changes
  // ==========================================

  useEffect(() => {
    if (!checklistTypeId) {
      setQuestions([]);
      setAnswers({});
      setRemarks({});
      return;
    }

    fetchQuestions();
  }, [checklistTypeId]);

  const fetchQuestions = async () => {
    try {
      setLoadingQuestions(true);

      const response = await axios.get(
        `http://localhost:5000/api/questions?checklist_type_id=${checklistTypeId}`
      );

      const allQuestions = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      // Extra protection if backend returns all questions
      const filteredQuestions = allQuestions.filter((question) => {
        const questionChecklistId =
          question.checklist_type_id ||
          question.checklistTypeId;

        return (
          String(questionChecklistId) ===
          String(checklistTypeId)
        );
      });

      setQuestions(
        filteredQuestions.length > 0
          ? filteredQuestions
          : allQuestions
      );

      setAnswers({});
      setRemarks({});
    } catch (error) {
      console.error("Question Error:", error);
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ==========================================
  // Answer handling
  // ==========================================

  const handleAnswerChange = (questionId, value) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  };

  const handleRemarkChange = (questionId, value) => {
    setRemarks((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  };

  // ==========================================
  // Render Question Input
  // ==========================================

  const renderQuestionInput = (question) => {
    const questionId = question.id || question.question_id;

    const type = (
      question.answer_type ||
      question.question_type ||
      question.type ||
      "text"
    )
      .toString()
      .toLowerCase();

    const value = answers[questionId] || "";

    // YES / NO

    if (
      type === "yes/no" ||
      type === "yes_no" ||
      type === "boolean"
    ) {
      return (
        <div className="yes-no-options">

          <label>
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

            Yes
          </label>

          <label>
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

            No
          </label>

        </div>
      );
    }

    // NUMBER

    if (type === "number" || type === "numeric") {
      return (
        <input
          type="number"
          className="answer-input"
          placeholder="Enter answer"
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

    // DATE

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

    // DROPDOWN

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
            Select Answer
          </option>

          {options.map((option, index) => (
            <option
              key={index}
              value={option}
            >
              {option}
            </option>
          ))}

        </select>
      );
    }

    // IMAGE

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
              e.target.files[0]
            )
          }
        />
      );
    }

    // DEFAULT TEXT

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

// ==========================================
// Get Current Location
// ==========================================

const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },

      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              "Geolocation is required. Please enable location services and reload."
            );
            break;

          case error.POSITION_UNAVAILABLE:
            reject("Location information is unavailable.");
            break;

          case error.TIMEOUT:
            reject("Location request timed out.");
            break;

          default:
            reject("Unable to get your current location.");
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};
// ==========================================
// Get Device Information
// ==========================================

const getDeviceInfo = () => {

  return navigator.userAgent;

};

// ==========================================
// Submit Checklist
// ==========================================

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!checklistTypeId) {
    alert("Please select Checklist Type.");
    return;
  }

  if (!storeId) {
    alert("Please select Store.");
    return;
  }

  if (questions.length === 0) {
    alert("No questions are available for this checklist.");
    return;
  }

  // Validate required questions
  for (const question of questions) {
    const questionId = question.id || question.question_id;

    const required =
      question.required === true ||
      question.required === 1 ||
      question.is_required === true ||
      question.is_required === 1;

    if (required && !answers[questionId]) {
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

    // Check browser permission first
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });

      if (permission.state === "denied") {
        alert(
          "Geolocation is required. Please enable location services and reload."
        );
        setSubmitting(false);
        return;
      }
    }

    // Get current location
    let location;

    try {
      location = await getCurrentLocation();
    } catch (error) {
      alert(error);
      setSubmitting(false);
      return;
    }

    // Continue with your existing code from here...
      const user =
        JSON.parse(
          localStorage.getItem("user")
        ) || {};

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

      const payload = {
        checklist_type_id:
          checklistTypeId,

        store_id:
          storeId,

        submission_date:
          submissionDate,

        submitted_by:
          user.id ||
          user.user_id ||
          null,

        latitude:
          location.latitude,

        longitude:
          location.longitude,

        answers:
          formattedAnswers,
      };

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
user.id || user.user_id || null
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



if(attachmentFile){

formData.append(
"attachment",
attachmentFile
);

}



formData.append(
"answers",
JSON.stringify(formattedAnswers)
);



await axios.post(

"http://localhost:5000/api/checklist-submissions",

formData,

{
headers:{
"Content-Type":"multipart/form-data"
}
}

);
      alert(
        "Checklist submitted successfully!"
      );

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

    } catch (error) {
      console.error(
        "Checklist Submission Error:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Unable to submit checklist."
      );

    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="checklist-submission-page">

      <div className="checklist-page-header">

        <h2>
          Checklist Submission
        </h2>

        <p>
          Complete and submit store checklist
        </p>

      </div>

      <form
        onSubmit={handleSubmit}
        className="checklist-form"
      >

        {/* TOP FILTERS */}

        <div className="checklist-selection-card">

          <div className="checklist-field">

            <label>
              Checklist Type
              <span>*</span>
            </label>

            <select
              value={checklistTypeId}
              onChange={(e) =>
                setChecklistTypeId(
                  e.target.value
                )
              }
            >

              <option value="">
                Select Checklist Type
              </option>

              {checklistTypes.map(
                (checklist) => (

                  <option
                    key={
                      checklist.id ||
                      checklist.checklist_type_id
                    }
                    value={
                      checklist.id ||
                      checklist.checklist_type_id
                    }
                  >

                    {checklist.name ||
                      checklist.checklist_name ||
                      checklist.title}

                  </option>

                )
              )}

            </select>

          </div>

          <div className="checklist-field">

            <label>
              Store
              <span>*</span>
            </label>

            <select
              value={storeId}
              onChange={(e) =>
                setStoreId(
                  e.target.value
                )
              }
            >

              <option value="">
                Select Store
              </option>

              {stores.map((store) => (

                <option
                  key={
                    store.id ||
                    store.store_id
                  }
                  value={
                    store.id ||
                    store.store_id
                  }
                >

                  {store.store_name ||
                    store.name}

                </option>

              ))}

            </select>

          </div>

          <div className="checklist-field">

            <label>
              Date
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

          </div>
          <div className="checklist-field">

<label>
Attachment
</label>

<input

type="file"

onChange={(e)=>
setAttachmentFile(
e.target.files[0]
)
}

/>

</div>

        </div>

        {/* QUESTIONS */}

        {loadingQuestions && (

          <div className="checklist-message">
            Loading questions...
          </div>

        )}

        {!loadingQuestions &&
          checklistTypeId &&
          questions.length === 0 && (

            <div className="checklist-message">

              No questions found for this
              checklist type.

            </div>

          )}

        {questions.length > 0 && (

          <div className="questions-section">

            <div className="questions-heading">

              <h3>
                Checklist Questions
              </h3>

              <span>
                {questions.length} Questions
              </span>

            </div>

            {questions.map(
              (question, index) => {

                const questionId =
                  question.id ||
                  question.question_id;

                return (

                  <div
                    className="question-card"
                    key={questionId}
                  >

                    <div className="question-title">

                      <span className="question-number">
                        {index + 1}
                      </span>

                      <div>

                        <h4>

                          {question.question ||
                            question.question_text ||
                            question.title}

                          {(question.required ||
                            question.is_required) && (

                            <span className="required-star">
                              *
                            </span>

                          )}

                        </h4>

                      </div>

                    </div>

                    <div className="question-answer">

                      {renderQuestionInput(
                        question
                      )}

                    </div>

                    <textarea
                      className="remarks-input"
                      placeholder="Add remarks (optional)"
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

                );
              }
            )}

            <div className="submit-area">

              <button
                type="submit"
                className="submit-checklist-btn"
                disabled={submitting}
              >

                {submitting
                  ? "Submitting..."
                  : "Submit Checklist"}

              </button>

            </div>

          </div>

        )}

      </form>

    </div>
  );
}

export default ChecklistSubmission;