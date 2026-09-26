const db = require("../config/db");
const { sendGenericEmail } = require("./emailService");
const ChecklistEmailSettings = require("../models/checklistEmailSettingsModel");

// ======================================================
// CHECKLIST & ACTION POINT EMAILS
// ======================================================
//
// Recipients (per event):
//   • Checklist email contacts (Settings → Checklist & Controls →
//     Email Routing) that are enabled for the event – same idea as the
//     New Store Opening contact list.
//   • The manager of THAT store only (Chat Store Manager, falling back
//     to the email saved on the store in Store Management).
//   • Optionally the employee who submitted the checklist.
//
// Administrators are no longer broadcast to automatically.
// ======================================================

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

// ------------------------------------------------------
// STORE MANAGER – only the manager of the given store
// ------------------------------------------------------
const getStoreManagers = async (storeId) => {
    if (!storeId) return [];
    const managers = [];

    try {
        const rows = await db.query(`
            SELECT u.name, u.email
            FROM chat_store_managers m
            INNER JOIN users u ON u.id = m.user_id
            WHERE m.store_id = ?
              AND (u.status = 'Active' OR u.status IS NULL)
        `, [Number(storeId)]);
        for (const row of rows || []) managers.push(row);
    } catch (error) {
        console.warn("Checklist email: chat store manager lookup failed:", error.message);
    }

    // Fallback: the manager email saved on the store itself.
    if (!managers.some((row) => validEmail(row.email))) {
        try {
            const rows = await db.query(
                `SELECT manager_name AS name, email FROM stores WHERE id = ? LIMIT 1`,
                [Number(storeId)]
            );
            if (rows?.[0]) managers.push(rows[0]);
        } catch (error) {
            console.warn("Checklist email: store email lookup failed:", error.message);
        }
    }

    return managers;
};

const getUserContact = async (userId) => {
    if (!userId) return null;
    const rows = await db.query(`SELECT name, email FROM users WHERE id = ? LIMIT 1`, [Number(userId)]);
    return rows?.[0] || null;
};

// ------------------------------------------------------
// CONTEXT
// ------------------------------------------------------
const getSubmissionContext = async (submissionId) => {
    const rows = await db.query(`
        SELECT
            cs.id,
            cs.store_id,
            DATE_FORMAT(cs.submission_date, '%d %b %Y, %h:%i %p') AS submission_date,
            cs.inspection_score,
            cs.status,
            cs.submitted_by,
            s.store_name,
            s.city,
            s.state,
            ct.checklist_name,
            COALESCE(u.name, cs.submitted_by_name) AS submitted_by_name,
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

const getSubmissionIssues = async (submissionId) => {
    try {
        return await db.query(`
            SELECT ap.id, ap.priority, q.question, csa.answer, csa.remarks
            FROM action_points ap
            LEFT JOIN questions q ON q.id = ap.question_id
            LEFT JOIN checklist_submission_answers csa ON csa.id = ap.submission_answer_id
            WHERE ap.submission_id = ?
            ORDER BY ap.id ASC
        `, [Number(submissionId)]);
    } catch (error) {
        return [];
    }
};

const getAnswerCount = async (submissionId) => {
    try {
        const rows = await db.query(
            `SELECT COUNT(*) AS total FROM checklist_submission_answers WHERE submission_id = ?`,
            [Number(submissionId)]
        );
        return Number(rows?.[0]?.total || 0);
    } catch (error) {
        return 0;
    }
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
            DATE_FORMAT(cs.submission_date, '%d %b %Y, %h:%i %p') AS submission_date,
            cs.submitted_by,
            csa.answer,
            csa.remarks AS answer_remarks,
            csa.action_taken,
            csa.action_remarks,
            COALESCE(su.name, cs.submitted_by_name) AS submitted_by_name,
            su.email AS submitted_by_email,
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

// ------------------------------------------------------
// RECIPIENTS
// ------------------------------------------------------
const getRecipients = async ({ event, storeId, settings, submitter }) => {
    const recipients = new Map();
    const add = (email, type, name) => {
        const valid = validEmail(email);
        if (valid && !recipients.has(valid)) recipients.set(valid, { type, name: name || "", email: valid });
    };

    // 1. Contact list (like NSO email routing)
    for (const contact of await ChecklistEmailSettings.getContactsForEvent(event)) {
        add(contact.email, contact.role_label || "Contact", contact.contact_name);
    }

    // 2. Manager of this specific store only
    if (Number(settings.store_manager_recipients_enabled) === 1) {
        for (const manager of await getStoreManagers(storeId)) {
            add(manager.email, "Store Manager", manager.name);
        }
    }

    // 3. The person who submitted the checklist
    if (Number(settings.submitter_recipients_enabled) === 1 && submitter) {
        add(submitter.email, "Submitted By", submitter.name);
    }

    const details = Array.from(recipients.values());
    return { recipients: details.map((row) => row.email), details };
};

const eventEnabled = async (event) => {
    const settings = await ChecklistEmailSettings.getSettings();
    const key = EVENTS[event];
    return { settings, enabled: Boolean(key && Number(settings[key]) === 1) };
};

// ------------------------------------------------------
// TEMPLATE
// ------------------------------------------------------
const PRIORITY_COLORS = {
    critical: ["#fee2e2", "#b91c1c"],
    high: ["#ffedd5", "#c2410c"],
    medium: ["#fef9c3", "#a16207"],
    low: ["#dcfce7", "#15803d"]
};

const STATUS_COLORS = {
    open: ["#e0e7ff", "#4338ca"],
    "in progress": ["#fef3c7", "#b45309"],
    closed: ["#dcfce7", "#15803d"],
    completed: ["#dcfce7", "#15803d"]
};

const coloredPill = (value, bg, fg) =>
    `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:700;">${escapeHtml(value || "-")}</span>`;

const pill = (value, palette) => {
    const [bg, fg] = palette[String(value || "").toLowerCase()] || ["#f1f5f9", "#334155"];
    return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:700;">${escapeHtml(value || "-")}</span>`;
};

const tableRow = (label, value, { html = false } = {}) =>
    `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;width:34%;color:#64748b;font-size:13px;">${escapeHtml(label)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;color:#0f172a;font-size:14px;font-weight:600;">${html ? value : escapeHtml(value || "-")}</td>
    </tr>`;

const buildEmail = ({ subject, eyebrow, intro, rows, extraHtml = "", actionLabel, actionLink, accent = "#6d28d9" }) => `
<div style="font-family:'Segoe UI',Arial,sans-serif;background:#f3f1fb;padding:28px 12px;color:#172033;">
  <div style="max-width:720px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(76,29,149,.12);">
    <div style="padding:26px 30px;background:linear-gradient(135deg,${accent},#8b5cf6 60%,#a78bfa);color:#fff;">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;opacity:.85;">${escapeHtml(eyebrow)}</div>
      <h2 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${escapeHtml(subject)}</h2>
    </div>
    <div style="padding:26px 30px;">
      <p style="margin:0 0 20px;color:#475569;line-height:1.65;font-size:14px;">${escapeHtml(intro)}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eef2f7;border-radius:12px;overflow:hidden;">${rows.join("")}</table>
      ${extraHtml}
      ${actionLink ? `<div style="margin-top:24px;"><a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:12px 20px;background:${accent};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">${escapeHtml(actionLabel || "Open Mi Arcus")}</a></div>` : ""}
      <p style="margin:26px 0 0;color:#94a3b8;font-size:12px;">This email was generated automatically by the Mi Arcus Checklist workflow.</p>
    </div>
  </div>
</div>`;

// ------------------------------------------------------
// CHECKLIST SUBMITTED
// ------------------------------------------------------
const sendChecklistSubmitted = async (submissionId) => {
    const { settings, enabled } = await eventEnabled("CHECKLIST_SUBMITTED");
    if (!enabled) return { sent: false, skipped: true, reason: "Checklist submission email is disabled." };

    const submission = await getSubmissionContext(submissionId);
    if (!submission) return { sent: false, reason: "Checklist submission not found." };

    const { recipients } = await getRecipients({
        event: "CHECKLIST_SUBMITTED",
        storeId: submission.store_id,
        settings,
        submitter: { name: submission.submitted_by_name, email: submission.submitted_by_email }
    });
    if (!recipients.length) return { sent: false, reason: "No valid Checklist email recipients configured." };

    const issues = await getSubmissionIssues(submissionId);
    const totalAnswers = await getAnswerCount(submissionId);

    const subject = `Checklist Submitted - ${submission.store_name || "Store"}`;
    const rows = [
        tableRow("Store", submission.store_name),
        tableRow("City", [submission.city, submission.state].filter(Boolean).join(", ")),
        tableRow("Checklist", submission.checklist_name),
        tableRow("Submitted By", submission.submitted_by_name),
        tableRow("Submission Date", submission.submission_date),
        tableRow("Inspection Score", submission.inspection_score == null ? "-" : `${submission.inspection_score}%`),
        tableRow("Questions Answered", String(totalAnswers)),
        tableRow("Action Points Raised", issues.length
            ? coloredPill(`${issues.length} need action`, "#fee2e2", "#b91c1c")
            : coloredPill("None – all clear", "#dcfce7", "#15803d"), { html: true })
    ];

    const issuesHtml = issues.length
        ? `<h3 style="margin:24px 0 10px;font-size:15px;color:#0f172a;">Issues that need action</h3>
           <table style="width:100%;border-collapse:collapse;border:1px solid #eef2f7;">
             <thead><tr>
               <th style="text-align:left;padding:9px 12px;background:#f8f7ff;color:#6d28d9;font-size:12px;">Question</th>
               <th style="text-align:left;padding:9px 12px;background:#f8f7ff;color:#6d28d9;font-size:12px;">Answer</th>
               <th style="text-align:left;padding:9px 12px;background:#f8f7ff;color:#6d28d9;font-size:12px;">Priority</th>
             </tr></thead>
             <tbody>${issues.map((issue) => `
               <tr>
                 <td style="padding:9px 12px;border-top:1px solid #eef2f7;font-size:13px;">${escapeHtml(issue.question || "-")}${issue.remarks ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">${escapeHtml(issue.remarks)}</div>` : ""}</td>
                 <td style="padding:9px 12px;border-top:1px solid #eef2f7;font-size:13px;font-weight:600;">${escapeHtml(issue.answer || "-")}</td>
                 <td style="padding:9px 12px;border-top:1px solid #eef2f7;">${pill(issue.priority || "Medium", PRIORITY_COLORS)}</td>
               </tr>`).join("")}
             </tbody>
           </table>`
        : "";

    const html = buildEmail({
        subject,
        eyebrow: "CHECKLIST SUBMISSION",
        intro: issues.length
            ? "A store checklist has been submitted. The answers below report a problem and have been raised as Action Points. Everything else is available in Checklist Reports."
            : "A store checklist has been submitted and no problems were reported. All answers are available in Checklist Reports.",
        rows,
        extraHtml: issuesHtml,
        actionLabel: issues.length ? "Open Action Points" : "Open Checklist Reports",
        actionLink: toAppUrl(issues.length ? "/action-points" : "/checklist-reports")
    });

    await sendGenericEmail({
        to: recipients,
        subject,
        html,
        text: `${subject}\nStore: ${submission.store_name || "-"}\nChecklist: ${submission.checklist_name || "-"}\nSubmitted by: ${submission.submitted_by_name || "-"}\nAction Points raised: ${issues.length}`
    });

    return { sent: true, recipients };
};

// ------------------------------------------------------
// ACTION POINT EVENTS
// ------------------------------------------------------
const sendActionPointEvent = async (actionPointId, event, extra = {}) => {
    const { settings, enabled } = await eventEnabled(event);
    if (!enabled) return { sent: false, skipped: true, reason: "Action Point email event is disabled." };

    const actionPoint = await getActionPointContext(actionPointId);
    if (!actionPoint) return { sent: false, reason: "Action Point not found." };

    let submitter = null;
    if (actionPoint.submitted_by_email) {
        submitter = { name: actionPoint.submitted_by_name, email: actionPoint.submitted_by_email };
    } else if (actionPoint.submitted_by) {
        submitter = await getUserContact(actionPoint.submitted_by);
    }

    const { recipients } = await getRecipients({
        event,
        storeId: actionPoint.store_id,
        settings,
        submitter
    });
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
        tableRow("Submitted By", actionPoint.submitted_by_name),
        tableRow("Question / Problem", actionPoint.question),
        tableRow("Answer Given", actionPoint.answer),
        tableRow("Store Remarks", actionPoint.answer_remarks),
        tableRow("Priority", pill(actionPoint.priority || "Medium", PRIORITY_COLORS), { html: true }),
        tableRow("Status", pill(status, STATUS_COLORS), { html: true }),
        tableRow("Assigned To", actionPoint.assigned_to_name)
    ];

    if (isCompleted) {
        rows.push(tableRow("Action Taken", actionPoint.action_taken || extra.remarks));
        rows.push(tableRow("Completion Remarks", actionPoint.action_remarks || extra.remarks || actionPoint.remarks));
    } else if (extra.remarks) {
        rows.push(tableRow("Remarks", extra.remarks));
    }
    if (extra.comment || actionPoint.comment) {
        rows.push(tableRow("Comment", extra.comment || actionPoint.comment));
    }

    const html = buildEmail({
        subject,
        eyebrow: isCompleted ? "ACTION POINT COMPLETED" : "ACTION POINT WORKFLOW",
        intro: isCompleted
            ? "The Action Point has been completed. The related checklist answer is now available in Checklist Reports."
            : event === "ACTION_POINT_CREATED"
                ? "A checklist answer reported a problem at this store. An Action Point has been raised and needs action."
                : `The Action Point status has been changed to ${status}.`,
        rows,
        accent: isCompleted ? "#15803d" : "#6d28d9",
        actionLabel: isCompleted ? "Open Checklist Reports" : "Open Action Points",
        actionLink: toAppUrl(isCompleted ? "/checklist-reports" : "/action-points")
    });

    await sendGenericEmail({
        to: recipients,
        subject,
        html,
        text: `${subject}\nAction Point: #${actionPoint.id}\nStore: ${actionPoint.store_name || "-"}\nStatus: ${status}\nQuestion: ${actionPoint.question || "-"}\nAnswer: ${actionPoint.answer || "-"}`
    });

    return { sent: true, recipients };
};

module.exports = {
    EVENTS,
    getRecipients,
    sendChecklistSubmitted,
    sendActionPointEvent
};
