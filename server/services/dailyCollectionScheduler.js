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

        await DailyCollection.ensureDueRows(reportDate);
        const missing = await DailyCollection.getMissingReports(reportDate);

        if (!missing.length) return;

        const afterMidnightReminderWindow = now.hour > 0 || (now.hour === 0 && now.minute >= 5);
        const afterTwelveHourEscalation = now.hour > 12 || (now.hour === 12 && now.minute >= 5);

        if (afterMidnightReminderWindow) {
            for (const report of missing) {
                if (!report.reminder_sent_at) {
                    try {
                        await controller.sendMissingReminder(report);
                        await DailyCollection.markReminderSent(report.id);
                    } catch (error) {
                        console.error("Daily collection reminder failed:", report.store_name, error.message);
                    }
                }
            }
        }

        if (afterTwelveHourEscalation) {
            for (const report of missing) {
                const managers = await DailyCollection.blockManagersForStore(
                    report.store_id,
                    report.report_date,
                    "Daily collection not submitted within 12 hours of the midnight deadline."
                );

                if (!report.escalation_sent_at) {
                    try {
                        await controller.sendEscalation(report, managers);
                        await DailyCollection.lockReport(report.id);
                    } catch (error) {
                        console.error("Daily collection escalation failed:", report.store_name, error.message);
                    }
                } else {
                    await DailyCollection.lockReport(report.id);
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
