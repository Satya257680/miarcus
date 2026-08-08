import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
    FaUser,
    FaEnvelope,
    FaPhone,
    FaClipboardList,
    FaCheckCircle,
    FaCalendarAlt,
    FaEye,
    FaEnvelopeOpen,
    FaCommentDots,
    FaPhoneAlt,
    FaUserSlash,
    FaHistory
} from "react-icons/fa";
import {
    getActivityDetails,
    getActivityTimeline,
    getActivityComments,
    addActivityComment,
    getActivityFiles,
    uploadActivityFile,
    deleteActivityFile
} from "../../services/activityService";

import "../../styles/pages/ActivityDetails.css";

function ActivityDetails() {

    const { id } = useParams();

    // ======================================================
    // STATES
    // ======================================================

    const [activity, setActivity] = useState(null);

    const [timeline, setTimeline] = useState([]);

    const [comments, setComments] = useState([]);

const [newComment, setNewComment] = useState("");

const [postingComment, setPostingComment] = useState(false);

 // ======================================================
// ATTACHMENTS
// ======================================================

const [files, setFiles] = useState([]);

const [selectedFile, setSelectedFile] = useState(null);

const [uploadingFile, setUploadingFile] = useState(false);

    const [loading, setLoading] = useState(true);
   

    // ======================================================
    // LOAD DATA
    // ======================================================

    useEffect(() => {

        loadActivity();

    }, [id]);

    const loadActivity = async () => {

        try {

            setLoading(true);
const [
    activityResponse,
    timelineResponse,
    commentsResponse,
    filesResponse
] = await Promise.all([

    getActivityDetails(id),

    getActivityTimeline(id),

    getActivityComments(id),

    getActivityFiles(id)

]);

            setActivity(activityResponse.data.data);

            setTimeline(timelineResponse.data.data || []);

            setComments(commentsResponse.data.data || []);

            setFiles(filesResponse.data.data || []);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    };

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {

        return (
            <div className="activity-details-page">
                Loading...
            </div>
        );

    }

    if (!activity) {

        return (
            <div className="activity-details-page">
                Activity Not Found
            </div>
        );

    }

   const handleAddComment = async () => {

    if (!newComment.trim()) return;

    try {

        setPostingComment(true);

        await addActivityComment(id, newComment);

        setNewComment("");

        const response = await getActivityComments(id);

        setComments(response.data.data || []);

    } catch (err) {

        console.error(err);

        alert("Failed to add comment.");

    } finally {

        setPostingComment(false);

    }

};

// ======================================================
// UPLOAD FILE
// ======================================================

const handleUploadFile = async () => {

    if (!selectedFile) return;

    try {

        setUploadingFile(true);

        await uploadActivityFile(

            id,

            selectedFile

        );

        setSelectedFile(null);

        const response = await getActivityFiles(id);

        setFiles(response.data.data || []);

    } catch (err) {

        console.error(err);

        alert("Failed to upload file.");

    } finally {

        setUploadingFile(false);

    }

};

// ======================================================
// DELETE FILE
// ======================================================

const handleDeleteFile = async (fileId) => {

    if (!window.confirm("Delete this file?")) {

        return;

    }

    try {

        await deleteActivityFile(fileId);

        const response = await getActivityFiles(id);

        setFiles(response.data.data || []);

    } catch (err) {

        console.error(err);

        alert("Failed to delete file.");

    }

};

    return (

        <div className="activity-details-page">

            <h2>Activity Details</h2>

            {/* ======================================================
                USER INFORMATION
            ====================================================== */}

            <div className="details-card">

                <h3>

                    <FaUser />

                    User Information

                </h3>

                <div className="details-grid">

                    <div>

                        <label>Employee ID</label>

                        <p>{activity.assigned_employee_id || "-"}</p>

                    </div>

                    <div>

                        <label>Name</label>

                        <p>{activity.assigned_to_name || "-"}</p>

                    </div>

                    <div>

                        <label>Department</label>

                        <p>{activity.department_name || "-"}</p>

                    </div>

                    <div>

                        <label>Designation</label>

                        <p>{activity.designation_name || "-"}</p>

                    </div>

                    <div>

                        <label>

                            <FaEnvelope />

                            Email

                        </label>

                        <p>{activity.assigned_to_email || "-"}</p>

                    </div>

                    <div>

                        <label>

                            <FaPhone />

                            Phone

                        </label>

                        <p>{activity.phone || "-"}</p>

                    </div>

                </div>

            </div>

            {/* ======================================================
                ACTIVITY INFORMATION
            ====================================================== */}

            <div className="details-card">

                <h3>

                    <FaClipboardList />

                    Activity Information

                </h3>

                <div className="details-grid">

                    <div>

                        <label>Title</label>

                        <p>{activity.title || "-"}</p>

                    </div>

                    <div>

                        <label>Activity Type</label>

                        <p>{activity.activity_type || "-"}</p>

                    </div>

                    <div>

                        <label>Module</label>

                        <p>{activity.module_name || "-"}</p>

                    </div>

                    <div>

                        <label>Status</label>

                        <p>{activity.status || "-"}</p>

                    </div>

                    <div>

                        <label>Priority</label>

                        <p>{activity.priority || "-"}</p>

                    </div>

                    <div>

                        <label>Created By</label>

                        <p>{activity.created_by_name || "-"}</p>

                    </div>

                    <div>

                        <label>

                            <FaCalendarAlt />

                            Created At

                        </label>

                        <p>

                            {activity.created_at
                                ? new Date(activity.created_at).toLocaleString()
                                : "-"}

                        </p>

                    </div>

                </div>

            </div>
                        {/* ======================================================
                DESCRIPTION
            ====================================================== */}

            <div className="details-card">

                <h3>Description</h3>

                <p>
                    {activity.description || "No description available."}
                </p>

            </div>

            {/* ======================================================
                STATUS
            ====================================================== */}

            <div className="details-card">

                <h3>

                    <FaCheckCircle />

                    Status

                </h3>

                <span className="status-badge">

                    {activity.status}

                </span>

            </div>

            {/* ======================================================
                TIMELINE
            ====================================================== */}

            <div className="details-card">

                <h3>

                    <FaHistory />

                    Activity Timeline

                </h3>

                {timeline.length === 0 ? (

                    <div className="no-timeline">

                        No timeline events available.

                    </div>

                ) : (

                    <div className="timeline">

                        {timeline.map((item, index) => (

                            <div
                                className="timeline-item"
                                key={item.id || index}
                            >

                                <div className="timeline-dot"></div>

                                <div className="timeline-content">

                                    <h4>

                                        {item.event_type}

                                    </h4>

                                    <p>

                                        {item.event_description}

                                    </p>

                                    <small>

                                        By{" "}

                                        <strong>

                                            {item.name || "System"}

                                        </strong>

                                        {" • "}

                                        {item.created_at
                                            ? new Date(
                                                item.created_at
                                            ).toLocaleString()
                                            : "-"}

                                    </small>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

            {/* ======================================================
    COMMENTS
====================================================== */}

<div className="details-card">

    <h3>

        <FaCommentDots />

        Comments

    </h3>

    <div className="comments-list">

        {comments.length === 0 ? (

            <div className="no-comments">

                No comments yet.

            </div>

        ) : (

            comments.map((comment) => (

                <div
                    className="comment-item"
                    key={comment.id}
                >

                    <div className="comment-avatar">

                        {(comment.name || "U")
                            .charAt(0)
                            .toUpperCase()}

                    </div>

                    <div className="comment-content">

                        <div className="comment-header">

                            <strong>

                                {comment.name || "Unknown User"}

                            </strong>

                            <span>

                                {new Date(
                                    comment.created_at
                                ).toLocaleString()}

                            </span>

                        </div>

                        <p>

                            {comment.comment}

                        </p>

                    </div>

                </div>

            ))

        )}

    </div>

    <div className="comment-form">

        <textarea

            placeholder="Write a comment..."

            value={newComment}

            onChange={(e) =>
                setNewComment(e.target.value)
            }

        />

        <button

            onClick={handleAddComment}

            disabled={postingComment}

        >

            {postingComment
                ? "Posting..."
                : "Post Comment"}

        </button>

    </div>

</div>

{/* ======================================================
    ATTACHMENTS
====================================================== */}

<div className="details-card">

    <h3>

        Attachments

    </h3>

    <div className="attachment-upload">

        <input

            type="file"

            onChange={(e) =>

                setSelectedFile(e.target.files[0])

            }

        />

        <button

            onClick={handleUploadFile}

            disabled={uploadingFile}

        >

            {uploadingFile

                ? "Uploading..."

                : "Upload File"}

        </button>

    </div>

    <div className="attachments-list">

        {files.length === 0 ? (

            <div className="no-comments">

                No attachments available.

            </div>

        ) : (

            files.map((file) => (

                <div

                    className="attachment-item"

                    key={file.id}

                >

                    <div>

                        <strong>

                            {file.file_name}

                        </strong>

                    </div>

                    <div className="attachment-actions">

                        <a

                            href={`https://miarcus-backend.onrender.com/uploads/${file.file_path}`}

                            target="_blank"

                            rel="noreferrer"

                        >

                            Download

                        </a>

                        <button

                            className="danger"

                            onClick={() =>

                                handleDeleteFile(file.id)

                            }

                        >

                            Delete

                        </button>

                    </div>

                </div>

            ))

        )}

    </div>

</div>

            {/* ======================================================
                QUICK ACTIONS
            ====================================================== */}

            <div className="details-card">

                <h3>

                    Quick Actions

                </h3>

                <div className="action-buttons">

                    <button>

                        <FaEye />

                        View User

                    </button>

                    <button>

                        <FaEnvelopeOpen />

                        Send Email

                    </button>

                    <button>

                        <FaCommentDots />

                        Message

                    </button>

                    <button>

                        <FaPhoneAlt />

                        Call

                    </button>

                    <button className="danger">

                        <FaUserSlash />

                        Deactivate

                    </button>

                </div>

            </div>

        </div>

    );

}

export default ActivityDetails;