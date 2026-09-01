const db = require("../config/db");
const { sendGenericEmail } = require("./emailService");
const NsoEmailSettings = require("../models/nsoEmailSettingsModel");

const validEmail = (value) => {
    const email = String(value || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const getProject = async (id) => {
    const rows = await db.query(`SELECT * FROM new_store_openings WHERE id=? LIMIT 1`, [id]);
    return rows?.[0] || null;
};
const directEmailFields = [
    ["approver_email", "approver_name", "Approver"],
    ["construction_vendor_email", "construction_vendor", "Construction Vendor"],
    ["project_taken_by_email", "project_taken_by", "Project Taken By"],
    ["broker_email", "broker_name", "Broker"],
    ["operation_head_email", "operation_head_assigned", "Operation Head"],
    ["asm_email", "asm_assigned", "ASM"]
];
const sendProjectNotification = async (projectId, event = "created") => {
    const project = await getProject(projectId);
    if (!project) return { sent: false, reason: "Project not found" };
    const configured = await NsoEmailSettings.getRecipientsForEvent(event);
    const recipients = new Set(configured.map(row => validEmail(row.email)).filter(Boolean));
    for (const [emailField] of directEmailFields) {
        const email = validEmail(project[emailField]);
        if (email) recipients.add(email);
    }
    if (!recipients.size) return { sent: false, reason: "No valid recipients configured" };
    const modeLabel = String(project.timeline_mode || "automatic").toLowerCase() === "manual" ? "Manual" : "Automatic";
    const subject = `${event === "updated" ? "New Store Opening Updated" : "New Store Opening Created"} - ${project.location || "New Store"}`;
    const people = directEmailFields.filter(([emailField, nameField]) => project[emailField] || project[nameField]).map(([emailField, nameField, label]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb"><b>${escapeHtml(label)}</b></td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(project[nameField] || "-")}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(project[emailField] || "-")}</td></tr>`
    ).join("");
    const milestones = [
        ["Layout By NSO", "layout_by_nso"], ["Revised Layout", "revised_layout_by_nso"], ["Approval", "approval_deadline"], ["Visit By OP", "visit_by_op_team"], ["GST", "gst_deadline"], ["HR Hiring", "hr_hiring_deadline"], ["Team Training", "team_training_deadline"], ["NSO Visit", "visit_by_nso_team_deadline"], ["Plan Of Stock", "plan_of_stock_deadline"], ["Collaterals", "plan_of_collaterals_deadline"], ["Field Training", "on_field_training_deadline"], ["Dispatch", "dispatch_stock_deadline"], ["NSO Handover", "nso_handover_deadline"], ["VM Handover", "vm_handover_deadline"], ["Scanning", "scanning_deadline"], ["Billing", "billing_start_date"]
    ];
    const timelineRows = milestones.map(([label, field]) => `<tr><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</td><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(project[field] || "-")}</td></tr>`).join("");
    const html = `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#172033"><div style="max-width:760px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><div style="padding:22px 26px;background:#2563eb;color:#fff"><h2 style="margin:0">${escapeHtml(subject)}</h2><p style="margin:7px 0 0">Mi Arcus New Store Opening workflow</p></div><div style="padding:24px"><h3>Store Details</h3><table style="width:100%;border-collapse:collapse"><tr><td style="padding:7px 12px"><b>Location</b></td><td style="padding:7px 12px">${escapeHtml(project.location || "-")}</td></tr><tr><td style="padding:7px 12px"><b>City</b></td><td style="padding:7px 12px">${escapeHtml(project.city || "-")}</td></tr><tr><td style="padding:7px 12px"><b>Status</b></td><td style="padding:7px 12px">${escapeHtml(project.status || "Planning")}</td></tr><tr><td style="padding:7px 12px"><b>Timeline</b></td><td style="padding:7px 12px">${modeLabel}</td></tr></table><h3 style="margin-top:24px">Responsible People</h3><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px 12px;background:#f1f5f9">Role</th><th style="text-align:left;padding:8px 12px;background:#f1f5f9">Name</th><th style="text-align:left;padding:8px 12px;background:#f1f5f9">Email</th></tr></thead><tbody>${people || '<tr><td colspan="3" style="padding:10px">No direct contacts added.</td></tr>'}</tbody></table><h3 style="margin-top:24px">Project Timeline</h3><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px 12px;background:#f1f5f9">Milestone</th><th style="text-align:left;padding:8px 12px;background:#f1f5f9">Date</th></tr></thead><tbody>${timelineRows}</tbody></table></div></div></div>`;
    await sendGenericEmail({ to: Array.from(recipients), subject, html, text: `${subject}\nLocation: ${project.location || "-"}\nCity: ${project.city || "-"}\nTimeline: ${modeLabel}` });
    return { sent: true, recipients: Array.from(recipients) };
};
module.exports = { sendProjectNotification };
