const DailyCollection = require("../models/dailyCollectionModel");
const controller = require("../controllers/dailyCollectionController");

const getIndiaNowParts = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(new Date());

    const value = (type) => parts.find((p) => p.type === type)?.value;
    return {
        year: Number(value("year")),
        month: Number(value("month")),
        day: Number(value("day")),
        hour: Number(value("hour")),
        minute: Number(value("minute"))
    };
};

const toDateString = (year, month, day) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, 10);
};

const yesterdayIndia = () => {
    const now = getIndiaNowParts();
    const date = new Date(Date.UTC(now.year, now.month - 1, now.day));
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
};

let running = false;

const runDailyCollectionDeadlineCheck = async () => {
    if (running) return;
    running = true;

    try {
        const now = getIndiaNowParts();
        const reportDate = yesterdayIndia();

        // Ensure every active store has a report row for the completed day.
        await DailyCollection.ensureDueRows(reportDate);
        const emailSettings = await DailyCollection.getEmailSettings();

        // At/just after midnight: notify admins + the linked store manager(s)
        // only when yesterday's report is still missing. The claim fields make
        // this safe when more than one server instance is running.
        const afterMidnightReminderWindow = now.hour > 0 || (now.hour === 0 && now.minute >= 1);
        if (afterMidnightReminderWindow && emailSettings.email_enabled) {
            const missing = await DailyCollection.getMissingReports(reportDate);
            for (const report of missing) {
                if (report.reminder_sent_at) continue;
                const claimed = await DailyCollection.claimReminder(report.id);
                if (!claimed) continue;
                try {
                    const result = await controller.sendMissingReminder(report);
                    if (result?.sent) {
                        await DailyCollection.markReminderSent(report.id);
                    } else {
                        await DailyCollection.releaseReminderClaim(report.id);
                    }
                } catch (error) {
                    await DailyCollection.releaseReminderClaim(report.id);
                    console.error("Daily collection reminder failed:", report.store_name, error.message);
                }
            }
        }

        // Twelve hours after the midnight deadline: block the store manager's
        // Daily Collection entry access. Blocking is independent of the email
        // toggle, so turning emails off never bypasses the security deadline.
        const afterTwelveHourEscalation = now.hour > 12 || (now.hour === 12 && now.minute >= 1);
        if (afterTwelveHourEscalation) {
            const missing = await DailyCollection.getMissingReports(reportDate);

            for (const report of missing) {
                const managers = await DailyCollection.blockUsersForStore(
                    report.store_id,
                    report.report_date,
                    "Daily collection not submitted within 12 hours of the midnight deadline.",
                    null
                );

                // Lock the report after access is blocked. The administrator
                // unblock action reopens it as 'missing' so the manager can submit.
                await DailyCollection.lockReport(report.id, false);

                if (emailSettings.email_enabled && !report.escalation_sent_at) {
                    const claimed = await DailyCollection.claimEscalation(report.id);
                    if (!claimed) continue;
                    try {
                        const result = await controller.sendEscalation(report, managers);
                        if (result?.sent) {
                            await DailyCollection.lockReport(report.id, true);
                        } else {
                            await DailyCollection.releaseEscalationClaim(report.id);
                        }
                    } catch (error) {
                        await DailyCollection.releaseEscalationClaim(report.id);
                        console.error("Daily collection escalation failed:", report.store_name, error.message);
                    }
                }
            }

            // Retry an escalation email if a previous email attempt failed after
            // the store was already blocked/locked.
            if (emailSettings.email_enabled) {
                const retryCandidates = await DailyCollection.getEscalationCandidates(reportDate);
                for (const report of retryCandidates) {
                    const managers = await DailyCollection.getStoreManagers(report.store_id);
                    const claimed = await DailyCollection.claimEscalation(report.id);
                    if (!claimed) continue;
                    try {
                        const result = await controller.sendEscalation(report, managers);
                        if (result?.sent) {
                            await DailyCollection.lockReport(report.id, true);
                        } else {
                            await DailyCollection.releaseEscalationClaim(report.id);
                        }
                    } catch (error) {
                        await DailyCollection.releaseEscalationClaim(report.id);
                        console.error("Daily collection escalation retry failed:", report.store_name, error.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Daily collection deadline check failed:", error.message);
    } finally {
        running = false;
    }
};

const startDailyCollectionScheduler = () => {
    const intervalMs = 5 * 60 * 1000;
    setTimeout(runDailyCollectionDeadlineCheck, 15000);
    setInterval(runDailyCollectionDeadlineCheck, intervalMs);
    console.log("⏰ Daily Collection deadline scheduler enabled (Asia/Kolkata; midnight + 12-hour escalation).");
};

module.exports = { startDailyCollectionScheduler, runDailyCollectionDeadlineCheck };
