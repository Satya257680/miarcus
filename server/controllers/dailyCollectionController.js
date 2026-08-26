const DailyCollection = require("../models/dailyCollectionModel");
const emailService = require("../services/emailService");

const actorId = (req) => Number(req.user?.id || req.user?.user_id || 0);
const isAdmin = (req) => Number(req.user?.is_admin) === 1;

const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const indiaToday = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const dateOnly = (value) => {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    return text;
};

const getDailyCollection = async (req, res) => {
    try {
        const date = dateOnly(req.query.date) || indiaToday();
        await DailyCollection.ensureDueRows(date);
        const blocked = isAdmin(req) ? null : await DailyCollection.getActiveBlock(actorId(req));
        if (blocked) {
            return res.status(423).json({
                success: false,
                blocked: true,
                message: `Daily Collection access is blocked for ${blocked.store_name}. An administrator must restore access.`,
                block: blocked
            });
        }

        const rows = await DailyCollection.getReport({
            userId: actorId(req),
            isAdmin: isAdmin(req),
            storeId: req.query.store_id ? Number(req.query.store_id) : null,
            date
        });

        const enriched = await Promise.all(rows.map(async (row) => ({
            ...row,
            summary: await DailyCollection.getBillSummary(row.store_id, row.report_date)
        })));

        res.json({
            success: true,
            date,
            blocked: false,
            block: null,
            reports: enriched
        });
    } catch (error) {
        console.error("Daily collection list error:", error);
        res.status(500).json({ success: false, message: "Unable to load daily collection reports." });
    }
};

const getDailyCollectionStores = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            const blocked = await DailyCollection.getActiveBlock(actorId(req));
            if (blocked) {
                return res.status(423).json({
                    success: false,
                    blocked: true,
                    message: `Daily Collection access is blocked for ${blocked.store_name}. An administrator must restore access.`,
                    block: blocked
                });
            }
        }
        const stores = isAdmin(req)
            ? await DailyCollection.getStores()
            : await DailyCollection.getStoreScopeForUser(actorId(req));
        res.json({ success: true, stores });
    } catch (error) {
        console.error("Daily collection stores error:", error);
        res.status(500).json({ success: false, message: "Unable to load stores." });
    }
};

const submitDailyCollection = async (req, res) => {
    try {
        const userId = actorId(req);
        if (!isAdmin(req)) {
            const block = await DailyCollection.getActiveBlock(userId);
            if (block) {
                return res.status(423).json({
                    success: false,
                    blocked: true,
                    message: `Daily Collection access is blocked for ${block.store_name}. An administrator must restore access.`,
                    block
                });
            }
        }

        const storeId = Number(req.body?.store_id);
        const reportDate = dateOnly(req.body?.report_date);
        const reportId = Number(req.body?.report_id);
        if (!storeId || !reportDate || !reportId) {
            return res.status(400).json({ success: false, message: "Store, report date and report ID are required." });
        }

        if (!isAdmin(req)) {
            const scope = await DailyCollection.getStoreScopeForUser(userId);
            if (!scope.some((store) => Number(store.id) === storeId)) {
                return res.status(403).json({ success: false, message: "You are not assigned to this store." });
            }
        }

        const report = await DailyCollection.submitReport({
            reportId,
            storeId,
            reportDate,
            submittedBy: userId,
            upiAmount: req.body?.upi_amount,
            cashAmount: req.body?.cash_amount,
            bankTransferAmount: req.body?.bank_transfer_amount,
            cardAmount: req.body?.card_amount,
            notes: req.body?.notes
        });

        res.json({ success: true, message: "Daily collection submitted successfully.", report });
    } catch (error) {
        console.error("Daily collection submit error:", error);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || "Unable to submit daily collection."
        });
    }
};

const getBlockedDailyCollections = async (req, res) => {
    try {
        const blocked = await DailyCollection.getBlockedReports();
        res.json({ success: true, blocked });
    } catch (error) {
        console.error("Daily collection blocked list error:", error);
        res.status(500).json({ success: false, message: "Unable to load blocked collection access." });
    }
};

const unblockDailyCollection = async (req, res) => {
    try {
        const controlId = Number(req.params.controlId);
        if (!controlId) return res.status(400).json({ success: false, message: "Invalid control ID." });

        const updated = await DailyCollection.unblock(controlId, actorId(req));
        if (!updated) return res.status(404).json({ success: false, message: "Block is already cleared or was not found." });

        res.json({ success: true, message: "Daily Collection access restored." });
    } catch (error) {
        console.error("Daily collection unblock error:", error);
        res.status(500).json({ success: false, message: "Unable to restore daily collection access." });
    }
};

const sendMissingReminder = async (report) => {
    const managers = await DailyCollection.getStoreManagers(report.store_id);
    const admins = await DailyCollection.getAdminRecipients();
    const managerEmails = managers.map((u) => u.email).filter(Boolean);
    const adminEmails = admins.map((u) => u.email).filter(Boolean);
    const recipients = [...new Set([...managerEmails, ...adminEmails])];
    if (!recipients.length) return;

    const subject = `Action required: Daily Collection missing — ${report.store_name} (${report.report_date})`;
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto">
            <h2>Daily Collection Report Pending</h2>
            <p>The daily collection report for <b>${esc(report.store_name)}</b> for <b>${esc(report.report_date)}</b> was not submitted before the 12:00 AM deadline.</p>
            <p>Please enter the UPI, cash, bank transfer and card collection amounts in Miarcus and ensure the total matches the bills recorded for the store.</p>
            <p><b>12-hour escalation:</b> If it remains missing until 12:00 PM, Daily Collection permission for the store manager will be blocked and an administrator will need to restore access.</p>
        </div>`;
    await emailService.sendGenericEmail({ to: recipients.join(","), subject, html });
};

const sendEscalation = async (report, managers) => {
    const admins = await DailyCollection.getAdminRecipients();
    const recipients = admins.map((u) => u.email).filter(Boolean);
    if (!recipients.length) return;

    const managerNames = managers.length ? managers.map((u) => u.name).join(", ") : "No linked store manager user";
    const subject = `URGENT: Daily Collection access blocked — ${report.store_name} (${report.report_date})`;
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto">
            <h2>Daily Collection Escalation</h2>
            <p>The collection report for <b>${esc(report.store_name)}</b> dated <b>${esc(report.report_date)}</b> is still missing 12 hours after the midnight deadline.</p>
            <p><b>Manager:</b> ${esc(managerNames)}</p>
            <p>Daily Collection permission has been blocked for the linked manager account(s). Review the report and use the administrator control in Miarcus to restore access after the required permission is approved.</p>
        </div>`;
    await emailService.sendGenericEmail({ to: [...new Set(recipients)].join(","), subject, html });
};

module.exports = {
    getDailyCollection,
    getDailyCollectionStores,
    submitDailyCollection,
    getBlockedDailyCollections,
    unblockDailyCollection,
    sendMissingReminder,
    sendEscalation
};
