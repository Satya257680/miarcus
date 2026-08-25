import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios, { API_BASE_URL } from "../../axiosConfig.js";
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
    FaHistory,
    FaPaperPlane,
    FaTimes,
    FaComments,
} from "react-icons/fa";
import {
    getActivityDetails,
    getActivityTimeline,
    getActivityComments,
    addActivityComment,
    getActivityFiles,
    uploadActivityFile,
    deleteActivityFile,
    getActivityMessages,
    sendActivityMessage,
    markActivityMessagesRead,
    sendActivityEmail,
} from "../../services/activityService";

import "../../styles/pages/ActivityDetails.css";

const API = API_BASE_URL + '/api';

function ActivityDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [activity, setActivity] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [comments, setComments] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [showEmail, setShowEmail] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatMessage, setChatMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const token = localStorage.getItem("token");
    const currentUserId = Number(localStorage.getItem("userId") || 0);
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    const canDeactivate = currentUser?.is_admin || permissions?.Users === "Full";

    const loadActivity = async () => {
        try {
            setLoading(true);
            const [activityResponse, timelineResponse, commentsResponse, filesResponse] = await Promise.all([
                getActivityDetails(id),
                getActivityTimeline(id),
                getActivityComments(id),
                getActivityFiles(id),
            ]);
            setActivity(activityResponse.data.data);
            setTimeline(timelineResponse.data.data || []);
            setComments(commentsResponse.data.data || []);
            setFiles(filesResponse.data.data || []);
        } catch (err) {
            console.error("Activity details error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActivity();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const recipientName = activity?.assigned_to_name || activity?.created_by_name || "User";
    const recipientEmail = activity?.assigned_to_email || activity?.created_by_email || "";
    const recipientPhone = activity?.phone || activity?.call_contact || "";
    const recipientId = Number(activity?.assigned_to || activity?.created_by || 0);

    const defaultEmailSubject = useMemo(
        () => `${activity?.module_name || "MIARCUS"}: ${activity?.title || "Activity Update"}`,
        [activity]
    );

    useEffect(() => {
        if (showEmail && !emailSubject) setEmailSubject(defaultEmailSubject);
    }, [showEmail, emailSubject, defaultEmailSubject]);

    const loadMessages = async () => {
        try {
            setLoadingMessages(true);
            const response = await getActivityMessages(id);
            setMessages(response.data.data || []);
            await markActivityMessagesRead(id);
        } catch (error) {
            console.error("Chat load error:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        if (!showChat) return undefined;
        loadMessages();
        const timer = window.setInterval(loadMessages, 4000);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showChat, id]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            setPostingComment(true);
            await addActivityComment(id, newComment.trim());
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

    const handleUploadFile = async () => {
        if (!selectedFile) return;
        try {
            setUploadingFile(true);
            await uploadActivityFile(id, selectedFile);
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

    const handleDeleteFile = async (fileId) => {
        if (!window.confirm("Delete this file?")) return;
        try {
            await deleteActivityFile(fileId);
            const response = await getActivityFiles(id);
            setFiles(response.data.data || []);
        } catch (err) {
            console.error(err);
            alert("Failed to delete file.");
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail) {
            alert("No email address is available for this activity.");
            return;
        }
        if (!emailSubject.trim() || !emailMessage.trim()) {
            alert("Please enter a subject and message.");
            return;
        }
        try {
            setSendingEmail(true);
            const response = await sendActivityEmail(id, {
                subject: emailSubject.trim(),
                message: emailMessage.trim(),
            });
            alert(response.data?.message || "Email sent successfully.");
            setEmailMessage("");
            setShowEmail(false);
        } catch (error) {
            alert(error.response?.data?.message || "Email could not be sent.");
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSendMessage = async (event) => {
        event?.preventDefault();
        if (!chatMessage.trim() || sendingMessage) return;
        try {
            setSendingMessage(true);
            await sendActivityMessage(id, chatMessage.trim());
            setChatMessage("");
            await loadMessages();
        } catch (error) {
            alert(error.response?.data?.message || "Message could not be sent.");
        } finally {
            setSendingMessage(false);
        }
    };

    const handleViewUser = () => {
        if (!recipientId) {
            alert("No user is linked to this activity.");
            return;
        }
        navigate("/settings/users", { state: { viewUserId: recipientId } });
    };

    const handleCall = () => {
        if (!recipientPhone) {
            alert("No phone number is available for this user.");
            return;
        }
        window.location.href = `tel:${recipientPhone}`;
    };

    const handleDeactivate = async () => {
        if (!recipientId) {
            alert("No user is linked to this activity.");
            return;
        }
        if (!window.confirm(`Deactivate ${recipientName}?`)) return;
        try {
            const response = await axios.put(
                `${API}/users/disable/${recipientId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(response.data?.message || `${recipientName} deactivated successfully.`);
            await loadActivity();
        } catch (error) {
            alert(error.response?.data?.message || "Unable to deactivate this user.");
        }
    };

    if (loading) return <div className="activity-details-page">Loading activity details...</div>;
    if (!activity) return <div className="activity-details-page">Activity Not Found</div>;

    return (
        <div className="activity-details-page">
            <div className="details-page-heading">
                <div>
                    <h2>Activity Details</h2>
                    <p>{activity.module_name || "System"} • #{activity.id}</p>
                </div>
                <button className="details-back-btn" onClick={() => navigate("/activity-center")}>Back to Activity Center</button>
            </div>

            <div className="details-card">
                <h3><FaUser /> User Information</h3>
                <div className="details-grid">
                    <div><label>Employee ID</label><p>{activity.assigned_employee_id || "-"}</p></div>
                    <div><label>Name</label><p>{activity.assigned_to_name || activity.created_by_name || "-"}</p></div>
                    <div><label>Department</label><p>{activity.department_name || "-"}</p></div>
                    <div><label>Designation</label><p>{activity.designation_name || "-"}</p></div>
                    <div><label><FaEnvelope /> Email</label><p>{recipientEmail || "-"}</p></div>
                    <div><label><FaPhone /> Phone</label><p>{recipientPhone || "-"}</p></div>
                </div>
            </div>

            <div className="details-card">
                <h3><FaClipboardList /> Activity Information</h3>
                <div className="details-grid">
                    <div><label>Title</label><p>{activity.title || "-"}</p></div>
                    <div><label>Activity Type</label><p>{activity.activity_type || "-"}</p></div>
                    <div><label>Module</label><p>{activity.module_name || "-"}</p></div>
                    <div><label>Status</label><p>{activity.status || "-"}</p></div>
                    <div><label>Priority</label><p>{activity.priority || "-"}</p></div>
                    <div><label>Created By</label><p>{activity.created_by_name || "-"}</p></div>
                    <div><label><FaCalendarAlt /> Created At</label><p>{activity.created_at ? new Date(activity.created_at).toLocaleString() : "-"}</p></div>
                </div>
            </div>

            <div className="details-card">
                <h3>Description</h3>
                <p>{activity.description || "No description available."}</p>
            </div>

            <div className="details-card">
                <h3><FaCheckCircle /> Status</h3>
                <span className="status-badge">{activity.status || "Open"}</span>
            </div>

            <div className="details-card">
                <h3><FaHistory /> Activity Timeline</h3>
                {timeline.length === 0 ? <div className="no-timeline">No timeline events available.</div> : (
                    <div className="timeline">
                        {timeline.map((item, index) => (
                            <div className="timeline-item" key={item.id || index}>
                                <div className="timeline-dot" />
                                <div className="timeline-content">
                                    <h4>{item.event_type}</h4>
                                    <p>{item.event_description}</p>
                                    <small>By <strong>{item.name || "System"}</strong> • {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="details-card">
                <h3><FaCommentDots /> Comments</h3>
                <div className="comments-list">
                    {comments.length === 0 ? <div className="no-comments">No comments yet.</div> : comments.map((comment) => (
                        <div className="comment-item" key={comment.id}>
                            <div className="comment-avatar">{(comment.name || "U").charAt(0).toUpperCase()}</div>
                            <div className="comment-content">
                                <div className="comment-header"><strong>{comment.name || "Unknown User"}</strong><span>{new Date(comment.created_at).toLocaleString()}</span></div>
                                <p>{comment.comment}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="comment-form">
                    <textarea placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                    <button onClick={handleAddComment} disabled={postingComment}>{postingComment ? "Posting..." : "Post Comment"}</button>
                </div>
            </div>

            <div className="details-card">
                <h3>Attachments</h3>
                <div className="attachment-upload">
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <button onClick={handleUploadFile} disabled={uploadingFile}>{uploadingFile ? "Uploading..." : "Upload File"}</button>
                </div>
                <div className="attachments-list">
                    {files.length === 0 ? <div className="no-comments">No attachments available.</div> : files.map((file) => (
                        <div className="attachment-item" key={file.id}>
                            <strong>{file.file_name}</strong>
                            <div className="attachment-actions">
                                <a href={`${API.replace("/api", "")}/uploads/${file.file_path}`} target="_blank" rel="noreferrer">Download</a>
                                <button className="danger" onClick={() => handleDeleteFile(file.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="details-card quick-actions-card">
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                    <button onClick={handleViewUser}><FaEye /> View User</button>
                    <button onClick={() => setShowEmail(true)}><FaEnvelopeOpen /> Send Email</button>
                    <button onClick={() => setShowChat(true)}><FaCommentDots /> Message</button>
                    <button onClick={handleCall}><FaPhoneAlt /> Call</button>
                    {canDeactivate && <button className="danger" onClick={handleDeactivate}><FaUserSlash /> Deactivate</button>}
                </div>
            </div>

            {showEmail && (
                <div className="activity-modal-overlay" onMouseDown={() => !sendingEmail && setShowEmail(false)}>
                    <div className="activity-modal email-modal" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="activity-modal-header"><div><h3>Send Email</h3><span>To: {recipientEmail || "No email"}</span></div><button onClick={() => setShowEmail(false)}><FaTimes /></button></div>
                        <label>Subject</label>
                        <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                        <label>Message</label>
                        <textarea rows="9" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} placeholder={`Write your message to ${recipientName}...`} />
                        <div className="modal-actions"><button className="secondary" onClick={() => setShowEmail(false)}>Cancel</button><button className="primary" onClick={handleSendEmail} disabled={sendingEmail}>{sendingEmail ? "Sending..." : "Send Email"}</button></div>
                    </div>
                </div>
            )}

            {showChat && (
                <div className="activity-modal-overlay" onMouseDown={() => setShowChat(false)}>
                    <div className="chat-modal" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="chat-header">
                            <div className="chat-user-avatar">{recipientName.charAt(0).toUpperCase()}</div>
                            <div><strong>{recipientName}</strong><span>{recipientEmail || "Activity chat"}</span></div>
                            <button onClick={() => setShowChat(false)}><FaTimes /></button>
                        </div>
                        <div className="chat-context">{activity.title} • {activity.module_name}</div>
                        <div className="chat-messages">
                            {loadingMessages && messages.length === 0 ? <div className="chat-empty">Loading messages...</div> : messages.length === 0 ? <div className="chat-empty"><FaComments /><p>No messages yet.</p><span>Start the conversation below.</span></div> : messages.map((message) => {
                                const mine = Number(message.sender_id) === currentUserId;
                                return <div className={`chat-row ${mine ? "mine" : "theirs"}`} key={message.id}><div className="chat-bubble"><div>{message.message}</div><small>{mine ? (currentUser?.name || "You") : (message.sender_name || recipientName)} • {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div></div>;
                            })}
                        </div>
                        <form className="chat-composer" onSubmit={handleSendMessage}>
                            <input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder={`Message ${recipientName}...`} autoFocus />
                            <button type="submit" disabled={!chatMessage.trim() || sendingMessage}><FaPaperPlane /></button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ActivityDetails;
