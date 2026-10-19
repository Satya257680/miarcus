// ======================================================
// L&D — LEARNER RESOLUTION + EMAIL NOTIFICATIONS
// ======================================================
//
// assignedUserSql()  → "user u is assigned to program ?" (all / user /
//                      designation / department / store rules), the
//                      same rules the learner pages use.
// resolveLearners()  → active users who are assigned AND may open L&D
//                      (owner / access mode / grants — utils/lndAccess).
// notifyProgram()    → one personal email per learner. Every send is
//                      first recorded in lnd_notifications with a
//                      UNIQUE (program, user, notice) key, so a retried
//                      publish / assignment save never emails anybody
//                      twice. Emails go out in the background: a mail
//                      failure never blocks or rolls back the save; it
//                      is recorded as status = 'failed' with the error.
//
// Notice keys
//   invite      → "New training assigned" (first publish, or a learner
//                 newly assigned to an already published program)
//   update-vN   → "Training updated" (admin pressed "Notify learners")
// ======================================================

const db = require("../config/db");
const lnd = require("../utils/lndAccess");
const lndProgramEmail = require("../utils/emailTemplates/lndProgramEmail");

const assignedUserSql = (alias = "u") => `EXISTS (
    SELECT 1 FROM lnd_assignments a WHERE a.program_id = ? AND (
        a.kind = 'all'
        OR (a.kind = 'user' AND a.ref_id = ${alias}.id)
        OR (a.kind = 'designation' AND a.ref_id = ${alias}.designation_id)
        OR (a.kind = 'department' AND a.ref_id = ${alias}.department_id)
        OR (a.kind = 'store' AND a.ref_id IN (SELECT us.store_id FROM user_stores us WHERE us.user_id = ${alias}.id))
    )
)`;

const resolveLearners = async (programId) => {
    const access = await lnd.accessibleUserSql("u");
    return db.query(
        `SELECT u.id, u.name, u.email
           FROM users u
          WHERE u.status = 'Active'
            AND ${assignedUserSql("u")}
            AND ${access.sql}
          ORDER BY u.name`,
        [programId, ...access.params]
    );
};

const countLearners = async (programId) => {
    const access = await lnd.accessibleUserSql("u");
    const rows = await db.query(
        `SELECT COUNT(*) AS n FROM users u
          WHERE u.status = 'Active' AND ${assignedUserSql("u")} AND ${access.sql}`,
        [programId, ...access.params]
    );
    return Number(rows?.[0]?.n || 0);
};

let sendEmailFn = null;
const getSender = () => {
    if (!sendEmailFn) {
        // Lazy: the email service pulls in the mailer configuration.
        sendEmailFn = require("./emailService").sendEmail;
    }
    return sendEmailFn;
};

// Short, secret-free reason stored in lnd_notifications.error and shown to
// L&D managers. Never contains tokens, OAuth secrets or the message body.
const failureReason = (error) => {
    const code = String(error?.code || "").toUpperCase();
    const message = String(error?.message || "");
    if (code === "GMAIL_API_AUTH_FAILED") return "Mail server login failed (Gmail OAuth token invalid or expired) — IT must renew GMAIL_REFRESH_TOKEN.";
    if (code === "GMAIL_API_PERMISSION_FAILED") return "Mail account is missing the Gmail send permission — IT must re-authorise the gmail.send scope.";
    if (code === "GMAIL_API_CONFIG_ERROR" || code === "EMAIL_TRANSPORT_INVALID") return "Email is not configured on the server (MAIL_TRANSPORT / GMAIL_* settings).";
    if (code === "EMAIL_RECIPIENT_INVALID" || /invalid recipient/i.test(message)) return "Learner email address is invalid — correct it in Users, then retry.";
    const status = Number(error?.status || error?.statusCode || 0);
    if (status === 429 || /rate limit|quota/i.test(message)) return "Mail provider rate limit / daily quota reached — retry later.";
    // Generic: strip anything that looks like a credential before storing.
    return (message || "Send failed")
        .replace(/(token|secret|password|authorization|bearer)\S*\s*[:=]?\s*\S+/gi, "$1 [redacted]")
        .slice(0, 300);
};

const deliver = async (jobs) => {
    const send = getSender();
    for (const job of jobs) {
        let sent = false;
        try {
            const mail = lndProgramEmail(job.payload);
            await send({ to: job.email, subject: mail.subject, html: mail.html, text: mail.text });
            sent = true;
        } catch (error) {
            const reason = failureReason(error);
            console.error(`[L&D] Email (notification #${job.id}, user #${job.userId}, notice "${job.noticeKey || "?"}") failed: ${error?.code || ""} ${reason}`);
            await db.query("UPDATE lnd_notifications SET status = 'failed', error = ? WHERE id = ?", [reason.slice(0, 500), job.id])
                .catch((dbError) => console.error(`[L&D] Could not record failure of notification #${job.id}:`, dbError.message));
        }
        // Recorded separately: a database hiccup AFTER the provider accepted
        // the email must not mark it "failed" (a retry would then send the
        // learner a duplicate).
        if (sent) {
            await db.query("UPDATE lnd_notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error = NULL WHERE id = ?", [job.id])
                .catch((dbError) => console.error(`[L&D] Email #${job.id} was accepted by the provider but its status could not be saved:`, dbError.message));
        }
    }
};

/**
 * notifyProgram({ programId, noticeKey, kind: "invite"|"update", message, onlyUserIds })
 * → { recipients, queued, alreadyNotified, noEmail }
 */
const notifyProgram = async ({ programId, noticeKey, kind = "invite", message = "", onlyUserIds = null }) => {
    const program = (await db.query("SELECT id, title, description, status FROM lnd_programs WHERE id = ? LIMIT 1", [programId]))?.[0];
    if (!program || program.status !== "Active") return { recipients: 0, queued: 0, alreadyNotified: 0, noEmail: 0 };

    let learners = await resolveLearners(programId);
    if (Array.isArray(onlyUserIds)) {
        const allow = new Set(onlyUserIds.map(Number));
        learners = learners.filter((u) => allow.has(Number(u.id)));
    }

    const moduleRows = await db.query("SELECT COUNT(*) AS n FROM lnd_modules WHERE program_id = ? AND status = 'Active'", [programId]);
    const moduleCount = Number(moduleRows?.[0]?.n || 0);

    const jobs = [];
    let alreadyNotified = 0;
    let noEmail = 0;

    for (const learner of learners) {
        if (!String(learner.email || "").trim()) { noEmail += 1; continue; }
        const inserted = await db.query(
            "INSERT IGNORE INTO lnd_notifications (program_id, user_id, notice_key, status) VALUES (?, ?, ?, 'queued')",
            [programId, learner.id, noticeKey]
        );
        if (!Number(inserted?.affectedRows || 0)) { alreadyNotified += 1; continue; }
        jobs.push({
            id: inserted.insertId,
            noticeKey,
            userId: learner.id,
            email: learner.email,
            payload: { kind, learnerName: learner.name, program, moduleCount, message },
        });
    }

    if (jobs.length) {
        await db.query("UPDATE lnd_programs SET last_notified_at = CURRENT_TIMESTAMP WHERE id = ?", [programId]).catch(() => {});
        setImmediate(() => {
            deliver(jobs).catch((error) => console.error("[L&D] Email delivery batch failed:", error));
        });
    }

    return { recipients: learners.length, queued: jobs.length, alreadyNotified, noEmail };
};

/**
 * retryFailed({ programId, noticeKey = "invite" }) → { retried, skipped }
 *
 * Explicit, admin-triggered retry for one program's emails that FAILED (or
 * that have been stuck in "queued" for 15+ minutes, e.g. the server
 * restarted mid-send). Bounded and duplicate-safe:
 *   • only learners who are still assigned and have an email are retried;
 *   • each row is flipped back to "queued" with a conditional UPDATE, so two
 *     concurrent clicks can never send the same email twice;
 *   • rows already "sent" are never touched.
 */
const STALE_QUEUED_MINUTES = 15;
const retryFailed = async ({ programId, noticeKey = "invite" }) => {
    const program = (await db.query("SELECT id, title, description, status FROM lnd_programs WHERE id = ? LIMIT 1", [programId]))?.[0];
    if (!program || program.status !== "Active") return { retried: 0, skipped: 0, notActive: true };

    const rows = await db.query(
        `SELECT id, user_id, notice_key, status FROM lnd_notifications
          WHERE program_id = ? AND notice_key = ?
            AND (status = 'failed' OR (status = 'queued' AND created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${STALE_QUEUED_MINUTES} MINUTE)))`,
        [programId, noticeKey]
    );
    if (!rows.length) return { retried: 0, skipped: 0 };

    const learners = new Map((await resolveLearners(programId)).map((u) => [Number(u.id), u]));
    const moduleRows = await db.query("SELECT COUNT(*) AS n FROM lnd_modules WHERE program_id = ? AND status = 'Active'", [programId]);
    const moduleCount = Number(moduleRows?.[0]?.n || 0);
    const kind = String(noticeKey).startsWith("update-") ? "update" : "invite";

    const jobs = [];
    let skipped = 0;
    for (const row of rows) {
        const learner = learners.get(Number(row.user_id));
        if (!learner || !String(learner.email || "").trim()) { skipped += 1; continue; }
        // Atomic claim: the same condition as the SELECT, and created_at is
        // refreshed so a second, concurrent retry can no longer match it.
        const claimed = await db.query(
            `UPDATE lnd_notifications SET status = 'queued', error = NULL, created_at = CURRENT_TIMESTAMP
              WHERE id = ? AND (status = 'failed' OR (status = 'queued' AND created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${STALE_QUEUED_MINUTES} MINUTE)))`,
            [row.id]
        );
        if (!Number(claimed?.affectedRows || 0)) { skipped += 1; continue; } // someone else retried it
        jobs.push({
            id: row.id,
            noticeKey: row.notice_key,
            userId: learner.id,
            email: learner.email,
            payload: { kind, learnerName: learner.name, program, moduleCount, message: "" },
        });
    }

    if (jobs.length) {
        setImmediate(() => {
            deliver(jobs).catch((error) => console.error("[L&D] Email retry batch failed:", error));
        });
    }
    return { retried: jobs.length, skipped };
};

module.exports = { assignedUserSql, resolveLearners, countLearners, notifyProgram, retryFailed, failureReason, _deliver: deliver };
