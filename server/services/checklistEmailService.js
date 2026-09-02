const db = require("../config/db");
const { sendGenericEmail } = require("./emailService");
const ChecklistEmailSettings = require("../models/checklistEmailSettingsModel");

const EVENTS = {
    CHECKLIST_SUBMITTED: "checklist_submitted_enabled",
    ACTION_POINT_CREATED: "action_point_created_enabled",
    ACTION_POINT_STATUS: "action_point_status_enabled",
    ACTION_POINT_COMPLETED: "action_point_completed_enabled"
};

const APP_URL = String(
    process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_URL || ""
).trim().replace(/\/+$/, "");

const toAppUrl = (path) => APP_URL ? `${APP_URL}${path}` : null;

const validEmail = (value) => {
    const email = String(value || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getAdmins = async () => db.query(`
    SELECT id, name, email
    FROM users
    WHERE is_admin = 1
      AND status = 'Active'
      AND is_activated = 1
      AND email IS NOT NULL
      AND TRIM(email) <> ''
    ORDER BY id ASC
`);

const getStoreManager = async (storeId) => {
    if (!storeId) return null;
    const rows = await db.query(`
        SELECT m.user_id, u.name, u.email
        FROM chat_store_managers m
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.store_id = ?
          AND u.status = 'Active'
          AND u.is_activated = 1
        LIMIT 1
    `, [Number(storeId)]);
    return rows?.[0] || null;
};

const getSubmissionContext = async (submissionId) => {
    const rows = await db.query(`
        SELECT
            cs.id,
            cs.store_id,
            cs.submission_date,
            cs.inspection_score,
            cs.status,
            cs.submitted_by,
            s.store_name,
            s.city,
            s.state,
            ct.checklist_name,
            u.name AS submitted_by_name,
            u.email AS submitted_by_email
        FROM checklist_submissions cs
        LEFT JOIN stores s ON s.id = cs.store_id
        LEFT JOIN checklist_types ct ON ct.id = cs.checklist_type_id
        LEFT JOIN users u ON u.id = cs.submitted_by
        WHERE cs.id = ?
        LIMIT 1
    `, [Number(submissionId)]);
    return rows?.[0] || null;
};

const getActionPointContext = async (actionPointId) => {
    const rows = await db.query(`
        SELECT
            ap.id,
            ap.submission_id,
            ap.store_id,
            ap.question_id,
            ap.priority,
            ap.status,
            ap.remarks,
            ap.comment,
            ap.created_at,
            ap.updated_at,
            ap.completed_at,
            s.store_name,
            s.city,
            s.state,
            q.question,
            cs.submission_date,
            cs.submitted_by,
            csa.action_taken,
            csa.action_remarks,
            su.name AS submitted_by_name,
            au.name AS assigned_to_name,
            au.email AS assigned_to_email
        FROM action_points ap
        LEFT JOIN stores s ON s.id = ap.store_id
        LEFT JOIN questions q ON q.id = ap.question_id
        LEFT JOIN checklist_submissions cs ON cs.id = ap.submission_id
        LEFT JOIN checklist_submission_answers csa ON csa.id = ap.submission_answer_id
        LEFT JOIN users su ON su.id = cs.submitted_by
        LEFT JOIN users au ON au.id = ap.assigned_to
        WHERE ap.id = ?
        LIMIT 1
    `, [Number(actionPointId)]);
    return rows?.[0] || null;
};

const getRecipients = async (storeId, settings) => {
    const recipients = new Set();
    const details = [];

    if (Number(settings.admin_recipients_enabled) === 1) {
        for (const admin of await getAdmins()) {
            const email = validEmail(admin.email);
            if (email) {
                recipients.add(email);
                details.push({ type: "Admin", name: admin.name, email });
            }
        }
    }

    if (Number(settings.store_manager_recipients_enabled) === 1) {
        const manager = await getStoreManager(storeId);
        const email = validEmail(manager?.email);
        if (email) {
            recipients.add(email);
            details.push({ type: "Store Manager", name: manager.name, email });
        }
    }

    return { recipients: Array.from(recipients), details };
};

const eventEnabled = async (event) => {
    const settings = await ChecklistEmailSettings.getSettings();
    const key = EVENTS[event];
    return { settings, enabled: Boolean(key && Number(settings[key]) === 1) };
};

const tableRow = (label, value) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;width:34%;"><b>${escapeHtml(label)}</b></td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(value || "-")}</td></tr>`;

const buildEmail = ({ subject, eyebrow, intro, rows, actionLabel, actionLink }) => `
<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#172033;">
  <div style="max-width:760px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <div style="padding:22px 26px;background:#2563eb;color:#fff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;opacity:.9;">${escapeHtml(eyebrow)}</div>
      <h2 style="margin:7px 0 0;font-size:22px;">${escapeHtml(subject)}</h2>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 18px;color:#475569;line-height:1.6;">${escapeHtml(intro)}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${rows.join("")}</table>
      ${actionLink ? `<div style="margin-top:22px;"><a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:11px 17px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">${escapeHtml(actionLabel || "Open Mi Arcus")}</a></div>` : ""}
      <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;">This email was generated automatically by the Mi Arcus Checklist workflow.</p>
    </div>
  </div>
</div>`;

const sendChecklistSubmitted = async (submissionId) => {
    const { settings, enabled } = await eventEnabled("CHECKLIST_SUBMITTED");
    if (!enabled) return { sent: false, skipped: true, reason: "Checklist submission email is disabled." };

    const submission = await getSubmissionContext(submissionId);
    if (!submission) return { sent: false, reason: "Checklist submission not found." };

    const { recipients } = await getRecipients(submission.store_id, settings);
    if (!recipients.length) return { sent: false, reason: "No valid Checklist email recipients configured." };

    const subject = `Checklist Submitted - ${submission.store_name || "Store"}`;
    const rows = [
        tableRow("Store", submission.store_name),
        tableRow("City", [submission.city, submission.state].filter(Boolean).join(", ")),
        tableRow("Checklist", submission.checklist_name),
        tableRow("Submitted By", submission.submitted_by_name),
        tableRow("Submission Date", submission.submission_date),
        tableRow("Inspection Score", submission.inspection_score == null ? "-" : `${submission.inspection_score}%`),
        tableRow("Status", submission.status || "Completed")
    ];

    const html = buildEmail({
        subject,
        eyebrow: "CHECKLIST SUBMISSION",
        intro: "A store checklist has been submitted. Please review the submission and any Action Points raised by the inspection workflow.",
        rows,
        actionLabel: "Open Checklist Reports",
        actionLink: toAppUrl("/checklist-reports")
    });

    await sendGenericEmail({
        to: recipients,
        subject,
        html,
        text: `${subject}\nStore: ${submission.store_name || "-"}\nChecklist: ${submission.checklist_name || "-"}\nSubmitted by: ${submission.submitted_by_name || "-"}`
    });

    return { sent: true, recipients };
};

const sendActionPointEvent = async (actionPointId, event, extra = {}) => {
    const { settings, enabled } = await eventEnabled(event);
    if (!enabled) return { sent: false, skipped: true, reason: "Action Point email event is disabled." };

    const actionPoint = await getActionPointContext(actionPointId);
    if (!actionPoint) return { sent: false, reason: "Action Point not found." };

    const { recipients } = await getRecipients(actionPoint.store_id, settings);
    if (!recipients.length) return { sent: false, reason: "No valid Checklist email recipients configured." };

    const status = extra.status || actionPoint.status || "Open";
    const isCompleted = event === "ACTION_POINT_COMPLETED" || status === "Closed";
    const subject = isCompleted
        ? `Action Point Completed - ${actionPoint.store_name || "Store"}`
        : event === "ACTION_POINT_CREATED"
            ? `Action Point Generated - ${actionPoint.store_name || "Store"}`
            : `Action Point Status: ${status} - ${actionPoint.store_name || "Store"}`;

    const rows = [
        tableRow("Action Point", `#${actionPoint.id}`),
        tableRow("Store", actionPoint.store_name),
        tableRow("City", [actionPoint.city, actionPoint.state].filter(Boolean).join(", ")),
        tableRow("Checklist Date", actionPoint.submission_date),
        tableRow("Question / Problem", actionPoint.question),
        tableRow("Priority", actionPoint.priority),
        tableRow("Status", status),
        tableRow("Assigned To", actionPoint.assigned_to_name),
        tableRow(isCompleted ? "Action Taken" : "Remarks", actionPoint.action_taken || extra.remarks || actionPoint.remarks),
        tableRow(isCompleted ? "Completion Remarks" : "Remarks", actionPoint.action_remarks || extra.remarks || actionPoint.remarks),
        tableRow("Comment", extra.comment || actionPoint.comment)
    ];

    const html = buildEmail({
        subject,
        eyebrow: isCompleted ? "CHECKLIST ACTION POINT" : "ACTION POINT WORKFLOW",
        intro: isCompleted
            ? "The Action Point has been completed. The related checklist answer is now available in Checklist Reports."
            : event === "ACTION_POINT_CREATED"
                ? "A new Action Point has been generated from a checklist and requires action."
                : `The Action Point status has been changed to ${status}.`,
        rows,
        actionLabel: isCompleted ? "Open Checklist Reports" : "Open Action Points",
        actionLink: toAppUrl(isCompleted ? "/checklist-reports" : "/action-points")
    });

    await sendGenericEmail({
        to: recipients,
        subject,
        html,
        text: `${subject}\nAction Point: #${actionPoint.id}\nStore: ${actionPoint.store_name || "-"}\nStatus: ${status}\nQuestion: ${actionPoint.question || "-"}`
    });

    return { sent: true, recipients };
};

module.exports = {
    EVENTS,
    sendChecklistSubmitted,
    sendActionPointEvent
};
