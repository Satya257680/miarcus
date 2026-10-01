const db = require("../config/db");
const { sendGenericEmail } = require("./emailService");
const TravelPlanEmailSettings = require("../models/travelPlanEmailSettingsModel");
const { getAppUrl } = require("../config/appUrl");

// ======================================================
// TRAVEL PLAN EMAILS (Visit Planner / Travel Plan / Approvals)
// ======================================================
//
// Every Travel Plan email goes through this service and is
// controlled by Settings → Travel Plan Email Routing:
//
//   master OFF            -> nobody receives anything
//   event OFF             -> nobody receives that event
//   master ON + event ON  -> specific contacts ticked for the event
//                            + the employee who filled the visit plan
//                              (and its creator) when enabled
//                            + approvers (reporting manager / admins)
//                              for "submitted for approval" when enabled
//
// Emails are best-effort: a failure is logged and never breaks the
// saved visit plan / approval.
// ======================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SUBJECTS = {
    plan_submitted: "Travel Plan Submitted for Approval",
    plan_approved: "Travel Plan Approved",
    plan_rejected: "Travel Plan Rejected",
    actual_updated: "Travel Plan – Actual Stores Updated",
    remark_added: "Travel Plan – New Remark",
    plan_deleted: "Travel Plan Deleted"
};

const ACCENTS = {
    plan_submitted: "#6d28d9",
    plan_approved: "#047857",
    plan_rejected: "#b91c1c",
    actual_updated: "#1d4ed8",
    remark_added: "#7c3aed",
    plan_deleted: "#9f1239"
};

// ------------------------------------------------------
// DATA
// ------------------------------------------------------
const getPlanSnapshot = async (planId) => {
    if (!planId) return null;
    const rows = await db.query(`
        SELECT v.id, v.employee_id, v.created_by, v.week_off, v.city, v.reason_to_travel,
               v.approval_status,
               DATE_FORMAT(v.visit_date, '%d %b %Y') AS from_label,
               DATE_FORMAT(COALESCE(v.end_date, v.visit_date), '%d %b %Y') AS to_label,
               u.name AS employee_name, u.email AS employee_email, u.employee_id AS employee_code,
               c.name AS created_by_name, c.email AS created_by_email
        FROM sales_visit_plans v
        LEFT JOIN users u ON u.id = v.employee_id
        LEFT JOIN users c ON c.id = v.created_by
        WHERE v.id = ?
        LIMIT 1
    `, [Number(planId)]);
    const plan = rows?.[0];
    if (!plan) return null;

    let stores = [];
    try {
        stores = await db.query(`
            SELECT s.store_name, s.store_code, s.city, ps.store_kind,
                   DATE_FORMAT(ps.visit_date, '%d %b %Y') AS visit_label
            FROM sales_visit_plan_stores ps
            LEFT JOIN stores s ON s.id = ps.store_id
            WHERE ps.plan_id = ?
            ORDER BY ps.store_kind, ps.visit_date, s.store_name
        `, [Number(planId)]);
    } catch {
        try {
            stores = await db.query(`
                SELECT s.store_name, s.store_code, s.city, ps.store_kind, NULL AS visit_label
                FROM sales_visit_plan_stores ps
                LEFT JOIN stores s ON s.id = ps.store_id
                WHERE ps.plan_id = ?
                ORDER BY ps.store_kind, s.store_name
            `, [Number(planId)]);
        } catch {
            stores = [];
        }
    }

    return { ...plan, stores: stores || [] };
};

const getMonthPlans = async (employeeId, month) => {
    const rows = await db.query(`
        SELECT id FROM sales_visit_plans
        WHERE employee_id = ? AND DATE_FORMAT(visit_date, '%Y-%m') = ?
        ORDER BY visit_date
    `, [Number(employeeId), String(month)]);
    const plans = [];
    for (const row of rows || []) {
        const snap = await getPlanSnapshot(row.id);
        if (snap) plans.push(snap);
    }
    return plans;
};

const getUsers = async (ids) => {
    const clean = Array.from(new Set((ids || []).map(Number).filter(Boolean)));
    if (!clean.length) return [];
    return db.query(
        `SELECT id, name, email FROM users WHERE id IN (${clean.map(() => "?").join(",")})`,
        clean
    );
};

const getApprovers = async (employeeId) => {
    try {
        return await db.query(`
            SELECT DISTINCT u.id, u.name, u.email
            FROM users u
            LEFT JOIN users employee ON employee.id = ?
            WHERE (u.status = 'Active' OR u.status IS NULL)
              AND (u.id = employee.reports_to OR u.is_admin = 1)
        `, [Number(employeeId)]);
    } catch (error) {
        console.warn("Travel Plan email: approver lookup failed:", error.message);
        return [];
    }
};

// ------------------------------------------------------
// TEMPLATE
// ------------------------------------------------------
const row = (label, value) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;width:34%;color:#64748b;font-size:13px;">${esc(label)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;color:#0f172a;font-size:14px;font-weight:600;">${value}</td>
    </tr>`;

const planBlock = (plan) => {
    const planned = plan.stores.filter((s) => s.store_kind !== "actual");
    const actual = plan.stores.filter((s) => s.store_kind === "actual");
    const storeTable = (title, list) => !list.length ? "" : `
      <div style="margin-top:12px;font-size:12px;font-weight:800;color:#4c1d95;text-transform:uppercase;letter-spacing:.5px;">${esc(title)} (${list.length})</div>
      <table style="width:100%;border-collapse:collapse;margin-top:6px;">
        ${list.map((s, i) => `
          <tr>
            <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:28px;">${i + 1}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:600;">${esc(s.store_name || "Store")}${s.store_code ? ` <span style="color:#94a3b8;font-weight:400;">(${esc(s.store_code)})</span>` : ""}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${esc(s.city || "")}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;text-align:right;">${esc(s.visit_label || "")}</td>
          </tr>`).join("")}
      </table>`;

    return `
      <div style="margin-top:16px;border:1px solid #ede9fe;border-radius:12px;padding:14px 16px;background:#faf8ff;">
        <div style="font-size:14px;font-weight:800;color:#1e1b4b;">${esc(plan.from_label)}${plan.to_label && plan.to_label !== plan.from_label ? ` → ${esc(plan.to_label)}` : ""}
          ${Number(plan.week_off) === 1 ? `<span style="margin-left:8px;padding:2px 9px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;">Week off / Leave</span>` : ""}
        </div>
        <div style="margin-top:4px;font-size:13px;color:#475569;">${plan.city ? `City: <b>${esc(plan.city)}</b> · ` : ""}Status: <b>${esc(plan.approval_status || "Pending")}</b></div>
        ${plan.reason_to_travel ? `<div style="margin-top:6px;font-size:13px;color:#334155;">Reason: ${esc(plan.reason_to_travel)}</div>` : ""}
        ${storeTable("Planned stores", planned)}
        ${storeTable("Actual stores visited", actual)}
      </div>`;
};

const buildHtml = ({ event, intro, rows, plans, link, linkLabel }) => {
    const accent = ACCENTS[event] || "#6d28d9";
    return `
<div style="font-family:'Segoe UI',Arial,sans-serif;background:#f3f1fb;padding:28px 12px;color:#172033;">
  <div style="max-width:720px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(76,29,149,.12);">
    <div style="padding:24px 30px;background:linear-gradient(135deg,${accent},#8b5cf6);color:#fff;">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;opacity:.85;">MI ARCUS · SALES TEAM · TRAVEL PLAN</div>
      <h2 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${esc(SUBJECTS[event])}</h2>
    </div>
    <div style="padding:24px 30px;">
      <p style="margin:0 0 18px;color:#475569;line-height:1.65;font-size:14px;">${intro}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eef2f7;">${rows.join("")}</table>
      ${(plans || []).map(planBlock).join("")}
      <div style="margin-top:24px;"><a href="${esc(link)}" style="display:inline-block;padding:12px 20px;background:${accent};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">${esc(linkLabel)}</a></div>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">You receive this email because of Settings → Travel Plan Email Routing in Mi Arcus.</p>
    </div>
  </div>
</div>`;
};

// ------------------------------------------------------
// SEND
// ------------------------------------------------------
//
// options:
//   planId     – single plan events
//   snapshot   – plan captured before it was deleted
//   employeeId + month – approval / rejection (month level)
//   actorId    – user who did the action
//   reason / remark / attachment – extra details
//
const send = async (event, options = {}) => {
    try {
        const settings = await TravelPlanEmailSettings.getSettings();
        if (!settings.master_enabled) return { sent: false, skipped: true, reason: "Travel Plan emails are switched OFF." };
        if (!settings[event]) return { sent: false, skipped: true, reason: `${event} email is switched OFF.` };

        let plans = [];
        if (options.snapshot) plans = [options.snapshot];
        else if (options.planId) {
            const snap = await getPlanSnapshot(options.planId);
            if (snap) plans = [snap];
        } else if (options.employeeId && options.month) {
            plans = await getMonthPlans(options.employeeId, options.month);
        }

        const employeeId = Number(options.employeeId || plans[0]?.employee_id || 0);
        const [employee] = await getUsers([employeeId]);
        const [actor] = await getUsers([options.actorId]);

        const recipients = new Map();
        const add = (email, name) => {
            const value = String(email || "").trim().toLowerCase();
            if (EMAIL_RE.test(value) && !recipients.has(value)) recipients.set(value, name || "");
        };

        // 1. Specific contacts ticked for this event
        for (const contact of await TravelPlanEmailSettings.getContactsForEvent(event)) {
            add(contact.email, contact.contact_name);
        }

        // 2. The employee who filled the visit plan (+ its creator)
        if (settings.include_employee) {
            if (employee) add(employee.email, employee.name);
            const creatorIds = plans.map((p) => p.created_by).filter((id) => Number(id) && Number(id) !== employeeId);
            for (const creator of await getUsers(creatorIds)) add(creator.email, creator.name);
        }

        // 3. Approvers for the approval request
        if (settings.include_approvers && event === "plan_submitted" && employeeId) {
            for (const approver of await getApprovers(employeeId)) add(approver.email, approver.name);
        }

        const to = Array.from(recipients.keys());
        if (!to.length) return { sent: false, reason: "No Travel Plan email recipients." };

        const employeeName = employee?.name || plans[0]?.employee_name || "Employee";
        const monthLabel = options.monthLabel || options.month || "";

        const intros = {
            plan_submitted: `<b>${esc(employeeName)}</b> submitted a visit plan. It is <b>Pending</b> and waiting for approval in Travel Plan Approvals.`,
            plan_approved: `The travel plan of <b>${esc(employeeName)}</b>${monthLabel ? ` for <b>${esc(monthLabel)}</b>` : ""} has been <b style="color:#047857;">approved</b>${actor ? ` by ${esc(actor.name)}` : ""}.`,
            plan_rejected: `The travel plan of <b>${esc(employeeName)}</b>${monthLabel ? ` for <b>${esc(monthLabel)}</b>` : ""} has been <b style="color:#b91c1c;">rejected</b>${actor ? ` by ${esc(actor.name)}` : ""}. Please review it in Visit Planner.`,
            actual_updated: `<b>${esc(actor?.name || employeeName)}</b> updated the actual stores visited on a travel plan.`,
            remark_added: `<b>${esc(actor?.name || employeeName)}</b> added a remark on a travel plan.`,
            plan_deleted: `A visit plan of <b>${esc(employeeName)}</b> was deleted${actor ? ` by ${esc(actor.name)}` : ""}.`
        };

        const rows = [
            row("Employee", `${esc(employeeName)}${plans[0]?.employee_code ? ` (${esc(plans[0].employee_code)})` : ""}`),
            row("Plans", String(plans.length || 1))
        ];
        if (monthLabel) rows.push(row("Month", esc(monthLabel)));
        if (actor) rows.push(row("Action by", esc(actor.name)));
        if (options.reason) rows.push(row("Rejection reason", esc(options.reason)));
        if (options.remark) rows.push(row("Remark", esc(options.remark)));
        if (options.attachment) rows.push(row("Attachment", "Attached in Mi Arcus"));

        const links = {
            plan_submitted: ["/travel-plan-approval", "Open Travel Plan Approvals"],
            plan_approved: ["/travel-plan", "Open Travel Plan"],
            plan_rejected: ["/visit-planner", "Open Visit Planner"],
            actual_updated: ["/travel-plan", "Open Travel Plan"],
            remark_added: ["/travel-plan", "Open Travel Plan"],
            plan_deleted: ["/visit-planner", "Open Visit Planner"]
        };
        const [path, linkLabel] = links[event] || ["/visit-planner", "Open Mi Arcus"];

        const subject = `MIARCUS – ${SUBJECTS[event]} – ${employeeName}`;
        await sendGenericEmail({
            to,
            subject,
            html: buildHtml({ event, intro: intros[event] || "", rows, plans, link: `${getAppUrl()}${path}`, linkLabel }),
            text: `${SUBJECTS[event]}\nEmployee: ${employeeName}\n${options.reason ? `Reason: ${options.reason}\n` : ""}${options.remark ? `Remark: ${options.remark}\n` : ""}Open: ${getAppUrl()}${path}`
        });

        console.log(`✉️  Travel Plan email (${event}) sent to ${to.length} recipient(s).`);
        return { sent: true, recipients: to };
    } catch (error) {
        console.error(`Travel Plan email (${event}) failed:`, error.message || error);
        return { sent: false, error: error.message };
    }
};

// Fire-and-forget helper used by the controllers.
const notify = (event, options) => {
    send(event, options).catch(() => {});
};

// Test email to every enabled contact.
const sendTest = async () => {
    const settings = await TravelPlanEmailSettings.getSettings();
    const to = settings.recipients
        .filter((r) => r.enabled && EMAIL_RE.test(String(r.email || "").trim()))
        .map((r) => r.email.trim().toLowerCase());
    if (!to.length) {
        const err = new Error("No enabled contacts with an email address. Add and save contacts first.");
        err.statusCode = 400;
        throw err;
    }
    await sendGenericEmail({
        to,
        subject: "MIARCUS Travel Plan – test email",
        html: buildHtml({
            event: "plan_submitted",
            intro: "This is a <b>test message</b> from Travel Plan Email Routing. If you received it, your address is set up correctly.",
            rows: [row("Master switch", settings.master_enabled ? "ON" : "OFF")],
            plans: [],
            link: `${getAppUrl()}/settings/travel-plan-email`,
            linkLabel: "Open Email Routing"
        })
    });
    return { sent: to.length };
};

module.exports = { send, notify, sendTest, getPlanSnapshot };
