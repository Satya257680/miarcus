const db = require("../config/db");
const { sendGenericEmail } = require("./emailService");
const NsoEmailSettings = require("../models/nsoEmailSettingsModel");
const { getAppUrl } = require("../config/appUrl");
const {
    buildNsoEmail,
    formatIST,
    formatShortDate
} = require("../utils/emailTemplates/premiumNotification");

// ======================================================
// NEW STORE OPENING – PREMIUM NOTIFICATION EMAIL
// ======================================================
// One email per create / update event, sent to the NSO email
// contacts (Settings → New Store Openings → Email Routing) plus
// the people whose emails are entered on the project.
// ======================================================

const validEmail = (value) => {
    const email = String(value || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

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

const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const toYmd = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(value);
    }
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

const milestone = (label, value) => {
    const ymd = toYmd(value);
    return {
        label,
        date: value ? formatShortDate(value) : null,
        done: Boolean(ymd && ymd < todayIST())
    };
};

const sendProjectNotification = async (projectId, event = "created") => {
    const project = await getProject(projectId);
    if (!project) return { sent: false, reason: "Project not found" };

    const configured = await NsoEmailSettings.getRecipientsForEvent(event);
    const recipients = new Set(configured.map((row) => validEmail(row.email)).filter(Boolean));
    for (const [emailField] of directEmailFields) {
        const email = validEmail(project[emailField]);
        if (email) recipients.add(email);
    }
    if (!recipients.size) return { sent: false, reason: "No valid recipients configured" };

    const isUpdate = event === "updated";
    const storeName = first(project.store_name, project.location, "New Store");
    const city = [project.city, project.state].filter(Boolean).join(", ");
    const storeCode = first(project.store_code, project.code, `NSO-${String(project.id).padStart(3, "0")}`);

    const formatValue = first(project.store_format, project.format, project.store_type);
    const carpet = first(project.carpet_area);
    const formatLabel = formatValue ? "Store Format" : carpet ? "Carpet Area" : "Store Format";
    const formatDisplay = formatValue || (carpet ? `${carpet} sq ft` : "-");

    const onsite = first(project.onsite_incharge, project.site_incharge);

    const people = [
        ["Approver", project.approver_name],
        ["Construction Vendor", project.construction_vendor],
        ["Project Taken By", project.project_taken_by],
        onsite ? ["Onsite Incharge", onsite] : ["Broker", project.broker_name],
        ["Operations Head", project.operation_head_assigned],
        ["ASM", project.asm_assigned]
    ];

    const milestones = [
        milestone("Layout by NSO", project.layout_by_nso),
        milestone("Revised Layout", project.revised_layout_by_nso),
        milestone("Approvals", project.approval_deadline),
        milestone("Visit by OP", project.visit_by_op_team),
        milestone("GST", project.gst_deadline),
        milestone("Store Launch", first(project.billing_start_date, project.nso_handover_deadline))
    ];

    const link = `${getAppUrl()}/new-store-openings`;

    const { html, attachments } = buildNsoEmail({
        event,
        storeName,
        city,
        status: project.status || "Planning",
        dateLabel: isUpdate ? "Updated Date & Time" : "Created Date & Time",
        dateValue: formatIST(new Date()),
        storeCode,
        formatLabel,
        formatValue: formatDisplay,
        people,
        milestones,
        link
    });

    const subject = `${isUpdate ? "New Store Opening Updated" : "New Store Opening Created"} – ${storeName}`;

    await sendGenericEmail({
        to: Array.from(recipients),
        subject,
        html,
        attachments,
        text: [
            subject,
            `City: ${city || "-"}`,
            `Status: ${project.status || "Planning"}`,
            `Store Code: ${storeCode}`,
            ...milestones.map((m) => `${m.label}: ${m.date || "Planned"}`),
            `View on MI ARCUS Portal: ${link}`
        ].join("\n")
    });

    return { sent: true, recipients: Array.from(recipients) };
};

module.exports = { sendProjectNotification };
