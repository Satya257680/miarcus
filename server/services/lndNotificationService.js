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

const deliver = async (jobs) => {
    const send = getSender();
    for (const job of jobs) {
        try {
            const mail = lndProgramEmail(job.payload);
            await send({ to: job.email, subject: mail.subject, html: mail.html, text: mail.text });
            await db.query("UPDATE lnd_notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error = NULL WHERE id = ?", [job.id]);
        } catch (error) {
            console.error(`[L&D] Email to user #${job.userId} failed:`, error.message);
            await db.query("UPDATE lnd_notifications SET status = 'failed', error = ? WHERE id = ?", [String(error.message || "Send failed").slice(0, 500), job.id])
                .catch(() => {});
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

module.exports = { assignedUserSql, resolveLearners, countLearners, notifyProgram, _deliver: deliver };
