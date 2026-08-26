const DailyCollection = require("../models/dailyCollectionModel");
const emailService = require("../services/emailService");
const XLSX = require("xlsx");
const fs = require("fs");

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

const normalizeHeader = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const parseImportDate = (value) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed?.y && parsed?.m && parsed?.d) {
            return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
        }
    }

    const text = String(value || "").trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const match = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (match) {
        const [, d, m, y] = match;
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return null;
};

const parseImportRows = (filePath) => {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("The uploaded file is empty.");

    const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!raw.length) throw new Error("The uploaded file is empty.");
    if (raw.length > 2000) throw new Error("Bulk upload is limited to 2,000 rows per file.");

    const headers = Object.keys(raw[0]);
    const aliases = {
        report_date: ["reportdate", "date", "collectiondate"],
        store_id: ["storeid"],
        store_code: ["storecode", "code"],
        store_name: ["storename", "store", "outlet", "shop"],
        upi_amount: ["upiamount", "upi"],
        cash_amount: ["cashamount", "cash"],
        bank_transfer_amount: ["banktransferamount", "banktransfer", "bank"],
        card_amount: ["cardamount", "card"],
        notes: ["notes", "note", "remarks", "remark"]
    };
    const map = {};
    for (const [key, list] of Object.entries(aliases)) {
        const index = headers.map(normalizeHeader).findIndex((header) => list.includes(header));
        map[key] = index >= 0 ? headers[index] : null;
    }

    const required = ["report_date", "upi_amount", "cash_amount", "bank_transfer_amount", "card_amount"];
    const missing = required.filter((key) => !map[key]);
    if (missing.length) {
        throw new Error(`Missing required columns: ${missing.join(", ")}. Store Code or Store Name is also required.`);
    }
    if (!map.store_id && !map.store_code && !map.store_name) {
        throw new Error("Store Code, Store Name or Store ID is required.");
    }

    return raw.map((row, index) => {
        const reportDate = parseImportDate(row[map.report_date]);
        const storeId = map.store_id ? Number(row[map.store_id]) || null : null;
        const storeCode = map.store_code ? String(row[map.store_code] || "").trim() : "";
        const storeName = map.store_name ? String(row[map.store_name] || "").trim() : "";
        const amounts = {
            upiAmount: Number(row[map.upi_amount] || 0),
            cashAmount: Number(row[map.cash_amount] || 0),
            bankTransferAmount: Number(row[map.bank_transfer_amount] || 0),
            cardAmount: Number(row[map.card_amount] || 0)
        };

        if (!reportDate) throw new Error(`Invalid report date on row ${index + 2}. Use YYYY-MM-DD or DD-MM-YYYY.`);
        if (![amounts.upiAmount, amounts.cashAmount, amounts.bankTransferAmount, amounts.cardAmount].every((n) => Number.isFinite(n) && n >= 0)) {
            throw new Error(`Invalid payment amount on row ${index + 2}. Amounts must be non-negative numbers.`);
        }

        return {
            rowNumber: index + 2,
            reportDate,
            storeId,
            storeCode,
            storeName,
            ...amounts,
            notes: map.notes ? String(row[map.notes] || "").trim() : ""
        };
    });
};

const getDailyCollection = async (req, res) => {
    try {
        const date = dateOnly(req.query.date) || indiaToday();
        await DailyCollection.ensureDueRows(date);
        const selectedStoreId = req.query.store_id ? Number(req.query.store_id) : null;
        const blocked = isAdmin(req) || !selectedStoreId ? null : await DailyCollection.getActiveBlock(actorId(req), selectedStoreId);
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
        const storeId = Number(req.body?.store_id);
        const reportDate = dateOnly(req.body?.report_date);
        let reportId = Number(req.body?.report_id) || 0;
        if (!storeId || !reportDate) {
            return res.status(400).json({ success: false, message: "Store and report date are required." });
        }

        // The report ID is an internal database identifier. Older Daily Collection
        // rows/frontends may not include it in the card payload, so resolve it
        // safely from the unique store + report-date pair instead of rejecting a
        // valid submission with a misleading "report ID required" error.
        if (!reportId) {
            const existingReport = await DailyCollection.getReportForStoreDate(storeId, reportDate);
            reportId = Number(existingReport?.id || 0);
        }
        if (!reportId) {
            return res.status(404).json({ success: false, message: "Daily Collection report was not found for the selected store and date." });
        }

        if (!isAdmin(req)) {
            const block = await DailyCollection.getActiveBlock(userId, storeId);
            if (block) {
                return res.status(423).json({
                    success: false,
                    blocked: true,
                    message: `Daily Collection access is blocked for ${block.store_name}. An administrator must restore access.`,
                    block
                });
            }
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

const getDailyCollectionById = async (req, res) => {
    try {
        const report = await DailyCollection.getReportById({
            id: req.params.id,
            userId: actorId(req),
            isAdmin: isAdmin(req)
        });
        if (!report) return res.status(404).json({ success: false, message: "Daily Collection record not found." });
        report.summary = await DailyCollection.getBillSummary(report.store_id, report.report_date);
        res.json({ success: true, data: report });
    } catch (error) {
        console.error("Daily collection view error:", error);
        res.status(500).json({ success: false, message: "Unable to load the Daily Collection record." });
    }
};

const deleteDailyCollection = async (req, res) => {
    try {
        const deleted = await DailyCollection.deleteReport(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: "Daily Collection record not found." });
        res.json({ success: true, message: "Daily Collection record deleted successfully." });
    } catch (error) {
        console.error("Daily collection delete error:", error);
        res.status(500).json({ success: false, message: "Unable to delete the Daily Collection record." });
    }
};

const deleteAllDailyCollections = async (req, res) => {
    try {
        const deleted = await DailyCollection.deleteAllReports();
        res.json({ success: true, deleted, message: "All Daily Collection records deleted successfully." });
    } catch (error) {
        console.error("Daily collection delete-all error:", error);
        res.status(500).json({ success: false, message: "Unable to delete all Daily Collection records." });
    }
};

const bulkUploadDailyCollections = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Please select a CSV or Excel file." });

    try {
        const rows = parseImportRows(req.file.path);
        const admin = isAdmin(req);
        const scope = admin ? null : await DailyCollection.getStoreScopeForUser(actorId(req));
        const scopeIds = new Set((scope || []).map((store) => Number(store.id)));
        const imported = [];

        for (const row of rows) {
            const store = await DailyCollection.getStoreByIdentifier({
                storeId: row.storeId,
                storeCode: row.storeCode,
                storeName: row.storeName
            });
            if (!store) throw new Error(`Store not found or inactive on row ${row.rowNumber}.`);
            if (!admin && !scopeIds.has(Number(store.id))) {
                throw new Error(`Row ${row.rowNumber}: you are not assigned to ${store.store_name}.`);
            }

            await DailyCollection.ensureDueRows(row.reportDate);
            const report = await DailyCollection.getReportForStoreDate(store.id, row.reportDate);
            if (!report) throw new Error(`Daily Collection report could not be created for ${store.store_name} on row ${row.rowNumber}.`);

            const saved = await DailyCollection.submitReport({
                reportId: report.id,
                storeId: store.id,
                reportDate: row.reportDate,
                submittedBy: actorId(req),
                upiAmount: row.upiAmount,
                cashAmount: row.cashAmount,
                bankTransferAmount: row.bankTransferAmount,
                cardAmount: row.cardAmount,
                notes: row.notes
            });
            imported.push(saved.reportId);
        }

        res.status(201).json({
            success: true,
            imported: imported.length,
            message: `${imported.length} Daily Collection record(s) imported successfully.`
        });
    } catch (error) {
        console.error("Daily collection bulk upload error:", error);
        res.status(400).json({ success: false, message: error.message || "Bulk upload failed." });
    } finally {
        fs.unlink(req.file.path, () => {});
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

const blockDailyCollection = async (req, res) => {
    try {
        const storeId = Number(req.body?.store_id);
        const reportDate = dateOnly(req.body?.report_date);
        const reason = String(req.body?.reason || "Blocked by administrator").trim().slice(0, 255);

        if (!storeId || !reportDate) {
            return res.status(400).json({ success: false, message: "Store and report date are required." });
        }

        const store = await DailyCollection.getActiveStore(storeId);
        if (!store) {
            return res.status(404).json({ success: false, message: "Active store was not found." });
        }

        await DailyCollection.ensureDueRows(reportDate);
        const users = await DailyCollection.blockUsersForStore(
            storeId,
            reportDate,
            reason || "Blocked by administrator",
            actorId(req)
        );

        if (!users.length) {
            return res.status(404).json({ success: false, message: "No active Daily Collection users are assigned to this store." });
        }

        const report = await DailyCollection.getReportForStoreDate(storeId, reportDate);
        if (report?.status === "missing") {
            await DailyCollection.lockReport(report.id, false);
        }

        res.json({ success: true, message: `Daily Collection access blocked for ${users.length} user(s).`, users });
    } catch (error) {
        console.error("Daily collection manual block error:", error);
        res.status(500).json({ success: false, message: "Unable to block Daily Collection access." });
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
    const settings = await DailyCollection.getEmailSettings();
    if (!settings.email_enabled) return { skipped: true, reason: "email_disabled" };

    const admins = await DailyCollection.getAdminRecipients();
    const managers = await DailyCollection.getStoreManagers(report.store_id);
    const recipients = [...new Set([
        ...admins.map((u) => u.email),
        ...managers.map((u) => u.email)
    ].filter(Boolean))];
    if (!recipients.length) return { skipped: true, reason: "no_recipients" };

    const subject = `Action required: Daily Collection missing — ${report.store_name} (${report.report_date})`;
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto">
            <h2>Daily Collection Report Missing</h2>
            <p>The daily collection report for <b>${esc(report.store_name)}</b> for <b>${esc(report.report_date)}</b> was not submitted before the 12:00 AM deadline.</p>
            <p>Please review the store report in Miarcus. The manager must enter the UPI, cash, bank transfer and card collection amounts and reconcile the total with the bills recorded for the store.</p>
            <p><b>12-hour escalation:</b> If it remains missing until 12:00 PM, Daily Collection access for the linked store manager will be blocked.</p>
        </div>`;
    await emailService.sendGenericEmail({ to: recipients.join(","), subject, html });
    return { sent: true };
};

const sendEscalation = async (report, managers) => {
    const settings = await DailyCollection.getEmailSettings();
    if (!settings.email_enabled) return { skipped: true, reason: "email_disabled" };

    const admins = await DailyCollection.getAdminRecipients();
    const recipients = [...new Set(admins.map((u) => u.email).filter(Boolean))];
    if (!recipients.length) return { skipped: true, reason: "no_admin_recipients" };

    const managerNames = managers.length ? managers.map((u) => u.name).join(", ") : "No linked store manager user";
    const subject = `URGENT: Daily Collection access blocked — ${report.store_name} (${report.report_date})`;
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto">
            <h2>Daily Collection Escalation</h2>
            <p>The collection report for <b>${esc(report.store_name)}</b> dated <b>${esc(report.report_date)}</b> is still missing 12 hours after the midnight deadline.</p>
            <p><b>Manager:</b> ${esc(managerNames)}</p>
            <p>Daily Collection access has been blocked for the linked manager account(s). Use the administrator control in Miarcus to restore access after the required report is reviewed.</p>
        </div>`;
    await emailService.sendGenericEmail({ to: recipients.join(","), subject, html });
    return { sent: true };
};

const getDailyCollectionEmailSettings = async (req, res) => {
    try {
        res.json({ success: true, settings: await DailyCollection.getEmailSettings() });
    } catch (error) {
        console.error("Daily collection email settings load error:", error);
        res.status(500).json({ success: false, message: "Unable to load Daily Collection email settings." });
    }
};

const updateDailyCollectionEmailSettings = async (req, res) => {
    try {
        const enabled = req.body?.email_enabled !== false && req.body?.email_enabled !== 0;
        const settings = await DailyCollection.updateEmailSettings(enabled, actorId(req));
        res.json({
            success: true,
            message: `Daily Collection email notifications ${enabled ? "enabled" : "disabled"}.`,
            settings
        });
    } catch (error) {
        console.error("Daily collection email settings update error:", error);
        res.status(500).json({ success: false, message: "Unable to update Daily Collection email settings." });
    }
};

module.exports = {
    getDailyCollection,
    getDailyCollectionById,
    getDailyCollectionStores,
    submitDailyCollection,
    bulkUploadDailyCollections,
    deleteDailyCollection,
    deleteAllDailyCollections,
    getBlockedDailyCollections,
    blockDailyCollection,
    unblockDailyCollection,
    getDailyCollectionEmailSettings,
    updateDailyCollectionEmailSettings,
    sendMissingReminder,
    sendEscalation
};
