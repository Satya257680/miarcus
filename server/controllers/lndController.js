const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../config/db");
const { JWT_SECRET } = require("../config/security");
const { resolveUploadFile } = require("../config/storage");
const lnd = require("../utils/lndAccess");
const { ensureSchema } = require("../services/lndSchema");
const SEED = require("../services/lndSeed");
const { KIND_BY_EXT, MIME_BY_EXT } = require("../middleware/lndUpload");
const notifications = require("../services/lndNotificationService");

// =================================================================
// LEARNING & DEVELOPMENT — API
// -----------------------------------------------------------------
// Lifecycle:  Draft → configure modules → assign → Publish (emails the
// assigned learners) → learners complete modules IN ORDER → assessment
// (if configured) → certificate issued AUTOMATICALLY when every
// mandatory module is complete.
//
// Everything that matters is enforced here on the server: who can see a
// program (assignment + L&D access), module locking, lesson-before-
// assessment, attempt limits, grading, double-submission, certificate
// eligibility. The browser is never trusted with scores, progress or
// answer keys.
// =================================================================

// ======================================================
// HELPERS
// ======================================================

const wrap = (fn) => async (req, res) => {
    try {
        await ensureSchema();
        await fn(req, res);
    } catch (error) {
        console.error("L&D error:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Something went wrong" });
        }
    }
};

const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const int = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
const str = (v, max) => String(v ?? "").trim().slice(0, max);
const now = () => new Date();
const placeholders = (list) => list.map(() => "?").join(", ");

const isManager = async (req) => {
    if (req._lndManager === undefined) {
        const level = await lnd.getEffectiveLevel(req.user.id);
        req._lndManager = lnd.levelSatisfies(level, "Edit");
    }
    return req._lndManager;
};

// -------- signed, expiring media URLs --------
const sign = (id, exp) =>
    crypto.createHmac("sha256", JWT_SECRET).update(`lnd-media:${id}:${exp}`).digest("hex");

const mediaUrl = (id) => {
    const exp = Date.now() + 2 * 60 * 60 * 1000;
    return `/api/lnd/media/${id}/file?exp=${exp}&sig=${sign(id, exp)}`;
};

const shapeMedia = (m, allowDownload = true) => ({
    id: m.id,
    kind: m.kind,
    name: m.original_name,
    size: Number(m.size),
    url: mediaUrl(m.id),
    allowDownload: !!allowDownload,
});

// Delete a stored L&D file. Uses resolveUploadFile (no mkdir): the old
// uploadPath() call threw EEXIST for every real file, so nothing was ever
// deleted from disk.
const removeFile = (stored) => {
    const file = resolveUploadFile("lnd", stored);
    if (!file) return;
    fs.unlink(file, (error) => {
        if (error && error.code !== "ENOENT") {
            console.error(`[L&D] Could not delete stored file "${stored}": ${error.code || error.message}`);
        }
    });
};

// -------- visibility (published + assigned to this user) --------
// One parameter: the user id.
const VISIBLE_SQL = `
    p.status = 'Active' AND EXISTS (
        SELECT 1 FROM lnd_assignments a
        JOIN users vu ON vu.id = ?
        WHERE a.program_id = p.id AND (
            a.kind = 'all'
            OR (a.kind = 'user' AND a.ref_id = vu.id)
            OR (a.kind = 'designation' AND a.ref_id = vu.designation_id)
            OR (a.kind = 'department' AND a.ref_id = vu.department_id)
            OR (a.kind = 'store' AND a.ref_id IN (SELECT us.store_id FROM user_stores us WHERE us.user_id = vu.id))
        )
    )`;

const isAssigned = async (userId, programId) => {
    const rows = await db.query(`SELECT p.id FROM lnd_programs p WHERE p.id = ? AND ${VISIBLE_SQL}`, [programId, userId]);
    return Boolean(rows?.length);
};

// Managers may open (preview) any program; learners only assigned ones.
const loadProgram = async (req, programId) => {
    const manager = await isManager(req);
    const rows = manager
        ? await db.query("SELECT p.* FROM lnd_programs p WHERE p.id = ?", [programId])
        : await db.query(`SELECT p.* FROM lnd_programs p WHERE p.id = ? AND ${VISIBLE_SQL}`, [programId, req.user.id]);
    return rows?.[0] || null;
};

// -------- progress rows (portable upsert: INSERT IGNORE + UPDATE) --------
const ensureProgress = (userId, moduleId) =>
    db.query("INSERT IGNORE INTO lnd_progress (user_id, module_id) VALUES (?, ?)", [userId, moduleId]);

// Active modules of a program with this user's progress + lock state.
const loadModules = async (userId, programId, manager) => {
    const modules = await db.query(
        `SELECT m.*,
                (SELECT COUNT(*) FROM lnd_questions q WHERE q.module_id = m.id) AS question_count,
                (SELECT COUNT(*) FROM lnd_media md WHERE md.module_id = m.id) AS media_count
         FROM lnd_modules m WHERE m.program_id = ? ${manager ? "" : "AND m.status = 'Active'"}
         ORDER BY m.sort_order, m.id`,
        [programId]
    );
    const ids = modules.map((m) => m.id);
    const progress = ids.length
        ? await db.query(`SELECT * FROM lnd_progress WHERE user_id = ? AND module_id IN (${placeholders(ids)})`, [userId, ...ids])
        : [];
    const byModule = Object.fromEntries(progress.map((p) => [p.module_id, p]));

    let blocked = false;
    return modules.map((m) => {
        const p = byModule[m.id];
        const completed = !!Number(p?.completed || 0);
        const locked = !manager && blocked && m.status === "Active";
        if (!completed && Number(m.mandatory) && m.status === "Active") blocked = true;
        const maxAttempts = Number(m.max_attempts || 0);
        const attempts = Number(p?.attempts || 0);
        return {
            id: m.id,
            programId: m.program_id,
            title: m.title,
            description: m.description || "",
            highlights: String(m.highlights || "").split("|").map((s) => s.trim()).filter(Boolean),
            durationMin: m.duration_min,
            mandatory: !!Number(m.mandatory),
            status: m.status,
            hasExam: Number(m.question_count) > 0,
            questionCount: Number(m.question_count),
            hasContent: Number(m.media_count) > 0 || Boolean(m.video_url),
            mediaCount: Number(m.media_count),
            passMark: m.pass_mark,
            examMinutes: m.exam_minutes,
            maxAttempts,
            attemptsLeft: maxAttempts > 0 ? Math.max(0, maxAttempts - attempts) : null,
            allowDownload: !!Number(m.allow_download),
            videoUrl: m.video_url || "",
            sortOrder: m.sort_order,
            thumbMediaId: m.thumb_media_id,
            thumbUrl: m.thumb_media_id ? mediaUrl(m.thumb_media_id) : null,
            completed,
            contentDone: completed || !!Number(p?.content_done || 0),
            passed: !!Number(p?.passed || 0),
            bestScore: p?.best_score ?? null,
            attempts,
            started: !!p,
            locked,
        };
    });
};

// Certificate eligibility = every MANDATORY active module completed
// (if a program has no mandatory module, every active module).
const programStats = (modules) => {
    const active = modules.filter((m) => m.status === "Active");
    const done = active.filter((m) => m.completed).length;
    const mandatory = active.filter((m) => m.mandatory);
    const required = mandatory.length ? mandatory : active;
    const requiredDone = required.filter((m) => m.completed).length;
    return {
        moduleCount: active.length,
        completedCount: done,
        requiredCount: required.length,
        requiredDone,
        eligible: required.length > 0 && requiredDone === required.length,
        percent: active.length ? Math.round((done / active.length) * 100) : 0,
        durationMin: active.reduce((s, m) => s + (m.durationMin || 0), 0),
        nextModuleId: (active.find((m) => !m.completed && !m.locked) || {}).id || null,
        started: active.some((m) => m.started),
    };
};

const programThumb = (program) => (program.thumb_media_id ? mediaUrl(program.thumb_media_id) : null);

const learnerStatus = (stats, certificate) =>
    certificate || stats.eligible ? "Completed" : stats.started ? "In Progress" : "Not Started";

// -------- certificates (idempotent, server-side eligibility) --------
const certificateCode = (programId, userId, issued) =>
    `MIA-${programId}-${userId}-${issued.toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

const getCertificate = async (userId, programId) =>
    (await db.query("SELECT * FROM lnd_certificates WHERE user_id = ? AND program_id = ? LIMIT 1", [userId, programId]))?.[0] || null;

// Issues the certificate once the learner (assigned to the published
// program) has completed every mandatory module. Safe to call repeatedly.
const issueCertificateIfEligible = async (userId, programId) => {
    const existing = await getCertificate(userId, programId);
    if (existing) return existing;
    if (!(await isAssigned(userId, programId))) return null;
    const stats = programStats(await loadModules(userId, programId, false));
    if (!stats.eligible) return null;
    const issued = now();
    await db.query(
        "INSERT IGNORE INTO lnd_certificates (user_id, program_id, code, issued_at) VALUES (?, ?, ?, ?)",
        [userId, programId, certificateCode(programId, userId, issued), issued]
    );
    return getCertificate(userId, programId);
};

const shapeCertificate = (row) => (row ? { code: row.code, issuedAt: row.issued_at } : null);

// ======================================================
// LEARNER ENDPOINTS (View)
// ======================================================

// My Training: ONLY programs assigned to the signed-in user (managers
// preview other programs from Program Management).
const overview = wrap(async (req, res) => {
    const manager = await isManager(req);
    const programs = await db.query(`SELECT p.* FROM lnd_programs p WHERE ${VISIBLE_SQL} ORDER BY p.id`, [req.user.id]);

    const out = [];
    for (const p of programs) {
        const modules = await loadModules(req.user.id, p.id, false);
        const stats = programStats(modules);
        const certificate = stats.eligible ? await issueCertificateIfEligible(req.user.id, p.id) : await getCertificate(req.user.id, p.id);
        out.push({
            id: p.id,
            title: p.title,
            description: p.description || "",
            audience: p.audience,
            thumbUrl: programThumb(p),
            ...stats,
            learnerStatus: learnerStatus(stats, certificate),
            certificate: shapeCertificate(certificate),
        });
    }
    return res.json({ success: true, manager, programs: out });
});

const programDetail = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await loadProgram(req, id));
    if (!program) return bad(res, "Program not found", 404);

    const modules = await loadModules(req.user.id, id, false);
    const stats = programStats(modules);
    const certificate = stats.eligible ? await issueCertificateIfEligible(req.user.id, id) : await getCertificate(req.user.id, id);

    return res.json({
        success: true,
        program: {
            id: program.id, title: program.title, description: program.description || "",
            audience: program.audience, thumbUrl: programThumb(program), status: program.status,
            highlights: String(program.highlights || "").split("|").map((s) => s.trim()).filter(Boolean),
        },
        modules,
        stats,
        learnerStatus: learnerStatus(stats, certificate),
        certificateReady: stats.eligible,
        certificateIssued: Boolean(certificate),
        certificate: shapeCertificate(certificate),
    });
});

const moduleDetail = wrap(async (req, res) => {
    const id = int(req.params.id);
    const rows = id ? await db.query("SELECT * FROM lnd_modules WHERE id = ?", [id]) : [];
    const mod = rows?.[0];
    if (!mod) return bad(res, "Module not found", 404);

    const program = await loadProgram(req, mod.program_id);
    if (!program) return bad(res, "Module not found", 404);

    const manager = await isManager(req);
    const modules = await loadModules(req.user.id, mod.program_id, false);
    const me = modules.find((m) => m.id === id);
    if (!me) return bad(res, "Module not found", 404);
    if (me.locked && !manager) return bad(res, "Complete the previous module first.", 403);

    // Track progress for learners of this program only — a manager who
    // just previews an unassigned program must not appear as a learner.
    if (!manager || (await isAssigned(req.user.id, mod.program_id))) {
        await ensureProgress(req.user.id, id);
        await db.query("UPDATE lnd_progress SET last_viewed = CURRENT_TIMESTAMP WHERE user_id = ? AND module_id = ?", [req.user.id, id]);
    }

    const media = await db.query("SELECT * FROM lnd_media WHERE module_id = ? ORDER BY id", [id]);
    const stats = programStats(modules);
    const index = modules.findIndex((m) => m.id === id);
    const next = modules[index + 1] || null;
    const certificate = await getCertificate(req.user.id, mod.program_id);
    const attemptsBlocked = me.maxAttempts > 0 && me.attemptsLeft === 0;

    return res.json({
        success: true,
        program: { id: program.id, title: program.title, audience: program.audience },
        module: {
            ...me,
            started: true,
            examReady: me.hasExam && (!me.hasContent || me.contentDone) && !attemptsBlocked,
            attemptsBlocked,
        },
        position: { index: index + 1, total: modules.length },
        modules: modules.map((m) => ({ id: m.id, title: m.title, durationMin: m.durationMin, completed: m.completed, locked: m.locked, mandatory: m.mandatory })),
        nextModuleId: next ? next.id : null,
        prevModuleId: index > 0 ? modules[index - 1].id : null,
        media: media.map((m) => shapeMedia(m, mod.allow_download)),
        stats,
        certificateReady: stats.eligible,
        certificate: shapeCertificate(certificate),
    });
});

// "I have completed this lesson":
//   • module WITHOUT assessment → module completed (+ certificate check)
//   • module WITH assessment    → lesson content done; the assessment
//                                 is now unlocked (module completes on pass)
const markComplete = wrap(async (req, res) => {
    const id = int(req.params.id);
    const rows = id ? await db.query("SELECT * FROM lnd_modules WHERE id = ? AND status = 'Active'", [id]) : [];
    const mod = rows?.[0];
    if (!mod || !(await loadProgram(req, mod.program_id))) return bad(res, "Module not found", 404);

    const modules = await loadModules(req.user.id, mod.program_id, false);
    const me = modules.find((m) => m.id === id);
    if (!me) return bad(res, "Module not found", 404);
    if (me.locked && !(await isManager(req))) return bad(res, "Complete the previous module first.", 403);

    await ensureProgress(req.user.id, id);
    const at = now();

    if (me.hasExam) {
        await db.query(
            "UPDATE lnd_progress SET content_done = 1, content_done_at = COALESCE(content_done_at, ?) WHERE user_id = ? AND module_id = ?",
            [at, req.user.id, id]
        );
        return res.json({ success: true, contentDone: true, completed: me.completed, needsAssessment: !me.completed });
    }

    await db.query(
        `UPDATE lnd_progress
            SET completed = 1, completed_at = COALESCE(completed_at, ?),
                content_done = 1, content_done_at = COALESCE(content_done_at, ?)
          WHERE user_id = ? AND module_id = ?`,
        [at, at, req.user.id, id]
    );
    const certificate = await issueCertificateIfEligible(req.user.id, mod.program_id);
    return res.json({ success: true, contentDone: true, completed: true, certificateIssued: Boolean(certificate), certificate: shapeCertificate(certificate) });
});

// -------- exam --------
const EXAM_GRACE_SECONDS = 60;

// Attempts left open past their time are closed as failed (score 0) so
// closing the tab cannot dodge the attempt limit.
const closeExpiredAttempts = async (userId, mod) => {
    const cutoff = new Date(Date.now() - (Number(mod.exam_minutes) * 60 + EXAM_GRACE_SECONDS) * 1000);
    const open = await db.query(
        "SELECT id, started_at FROM lnd_attempts WHERE user_id = ? AND module_id = ? AND submitted_at IS NULL",
        [userId, mod.id]
    );
    for (const attempt of open) {
        if (new Date(attempt.started_at).getTime() >= cutoff.getTime()) continue;
        const claimed = await db.query(
            "UPDATE lnd_attempts SET submitted_at = ?, score = 0, passed = 0 WHERE id = ? AND submitted_at IS NULL",
            [now(), attempt.id]
        );
        if (Number(claimed?.affectedRows || 0)) {
            await ensureProgress(userId, mod.id);
            await db.query("UPDATE lnd_progress SET attempts = attempts + 1 WHERE user_id = ? AND module_id = ?", [userId, mod.id]);
        }
    }
};

const examStart = wrap(async (req, res) => {
    const id = int(req.params.id);
    const rows = id ? await db.query("SELECT * FROM lnd_modules WHERE id = ? AND status = 'Active'", [id]) : [];
    const mod = rows?.[0];
    const program = mod && (await loadProgram(req, mod.program_id));
    if (!mod || !program) return bad(res, "Module not found", 404);

    const manager = await isManager(req);
    let modules = await loadModules(req.user.id, mod.program_id, false);
    let me = modules.find((m) => m.id === id);
    if (!me) return bad(res, "Module not found", 404);
    if (me.locked && !manager) return bad(res, "Complete the previous module first.", 403);

    const questions = await db.query("SELECT id, question, options FROM lnd_questions WHERE module_id = ? ORDER BY sort_order, id", [id]);
    if (!questions.length) return bad(res, "This module has no assessment.");

    if (me.hasContent && !me.contentDone) {
        return bad(res, "Finish the lesson first: open the video / materials and press “I have completed this lesson”.", 403);
    }

    await closeExpiredAttempts(req.user.id, mod);
    modules = await loadModules(req.user.id, mod.program_id, false);
    me = modules.find((m) => m.id === id);

    // Re-use the open attempt (a page refresh must NOT restart the timer).
    const open = (await db.query(
        "SELECT * FROM lnd_attempts WHERE user_id = ? AND module_id = ? AND submitted_at IS NULL ORDER BY id DESC LIMIT 1",
        [req.user.id, id]
    ))?.[0];

    let attemptId;
    let startedAt;
    if (open) {
        attemptId = open.id;
        startedAt = new Date(open.started_at);
    } else {
        if (me.maxAttempts > 0 && me.attempts >= me.maxAttempts) {
            return bad(res, `You have used all ${me.maxAttempts} attempt(s) for this assessment. Please contact your trainer.`, 403);
        }
        startedAt = now();
        const result = await db.query("INSERT INTO lnd_attempts (user_id, module_id, started_at) VALUES (?, ?, ?)", [req.user.id, id, startedAt]);
        attemptId = result.insertId;
    }

    const totalSeconds = Number(mod.exam_minutes) * 60;
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);

    return res.json({
        success: true,
        attemptId,
        resumed: Boolean(open),
        minutes: mod.exam_minutes,
        secondsLeft: Math.max(0, totalSeconds - elapsed),
        passMark: mod.pass_mark,
        title: mod.title,
        program: { id: program.id, title: program.title },
        moduleId: mod.id,
        attemptNumber: me.attempts + 1,
        maxAttempts: me.maxAttempts,
        // Correct answers are NEVER sent to the browser.
        questions: questions.map((q) => ({ id: q.id, question: q.question, options: JSON.parse(q.options) })),
    });
});

const examSubmit = wrap(async (req, res) => {
    const attemptId = int(req.params.attemptId);
    const attempts = attemptId
        ? await db.query("SELECT * FROM lnd_attempts WHERE id = ? AND user_id = ?", [attemptId, req.user.id])
        : [];
    const attempt = attempts?.[0];
    if (!attempt) return bad(res, "Attempt not found", 404);
    if (attempt.submitted_at) {
        return res.status(409).json({ success: false, message: "This attempt was already submitted.", score: attempt.score, passed: !!Number(attempt.passed) });
    }

    const mod = (await db.query("SELECT * FROM lnd_modules WHERE id = ?", [attempt.module_id]))[0];
    const questions = await db.query("SELECT * FROM lnd_questions WHERE module_id = ? ORDER BY sort_order, id", [attempt.module_id]);
    if (!mod || !questions.length) return bad(res, "Assessment not available");
    if (!(await loadProgram(req, mod.program_id))) return bad(res, "Module not found", 404);

    // Claim the attempt atomically: a double click / second tab cannot
    // grade the same attempt twice.
    const claimedAt = now();
    const claimed = await db.query(
        "UPDATE lnd_attempts SET submitted_at = ? WHERE id = ? AND user_id = ? AND submitted_at IS NULL",
        [claimedAt, attemptId, req.user.id]
    );
    if (!Number(claimed?.affectedRows || 0)) return bad(res, "This attempt was already submitted.", 409);

    const elapsedSeconds = (claimedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000;
    const timedOut = elapsedSeconds > Number(mod.exam_minutes) * 60 + EXAM_GRACE_SECONDS;
    const given = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};

    let correct = 0;
    const review = questions.map((q) => {
        const answer = Number.isInteger(Number(given[q.id])) ? Number(given[q.id]) : -1;
        const ok = !timedOut && answer === q.correct_index;
        if (ok) correct += 1;
        return { id: q.id, correct: ok, answer, explanation: q.explanation || "", correctIndex: q.correct_index };
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = !timedOut && score >= mod.pass_mark;

    await db.query("UPDATE lnd_attempts SET score = ?, passed = ? WHERE id = ?", [score, passed ? 1 : 0, attemptId]);
    await ensureProgress(req.user.id, attempt.module_id);
    await db.query(
        `UPDATE lnd_progress SET
            attempts = attempts + 1,
            best_score = CASE WHEN best_score IS NULL OR best_score < ? THEN ? ELSE best_score END,
            passed = CASE WHEN ? = 1 THEN 1 ELSE passed END,
            completed = CASE WHEN ? = 1 THEN 1 ELSE completed END,
            completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN ? ELSE completed_at END,
            content_done = CASE WHEN ? = 1 THEN 1 ELSE content_done END
          WHERE user_id = ? AND module_id = ?`,
        [score, score, passed ? 1 : 0, passed ? 1 : 0, passed ? 1 : 0, claimedAt, passed ? 1 : 0, req.user.id, attempt.module_id]
    );

    const certificate = passed ? await issueCertificateIfEligible(req.user.id, mod.program_id) : null;
    const modules = await loadModules(req.user.id, mod.program_id, false);
    const me = modules.find((m) => m.id === mod.id);
    const index = modules.findIndex((m) => m.id === mod.id);
    const next = modules[index + 1] || null;

    return res.json({
        success: true,
        score, passed, timedOut, correct, total: questions.length, passMark: mod.pass_mark,
        attemptsUsed: me?.attempts ?? null,
        maxAttempts: me?.maxAttempts ?? 0,
        attemptsLeft: me?.attemptsLeft ?? null,
        programId: mod.program_id,
        nextModuleId: passed && next && !next.locked ? next.id : null,
        certificateIssued: Boolean(certificate),
        certificate: shapeCertificate(certificate),
        // The answer key is revealed only once the learner has passed.
        review: review.map((r) => ({
            id: r.id, correct: r.correct,
            ...(passed ? { correctIndex: r.correctIndex, explanation: r.explanation } : {}),
        })),
    });
});

// -------- certificate (always the signed-in learner's own) --------
const certificate = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return bad(res, "Program not found", 404);

    let row = await getCertificate(req.user.id, id);
    if (!row) {
        if (!(await loadProgram(req, id))) return bad(res, "Program not found", 404);
        row = await issueCertificateIfEligible(req.user.id, id);
        if (!row) return bad(res, "Complete all required modules to get your certificate.", 403);
    }
    const program = (await db.query("SELECT title, description FROM lnd_programs WHERE id = ?", [id]))?.[0];
    const user = (await db.query("SELECT name FROM users WHERE id = ?", [req.user.id]))[0];

    return res.json({
        success: true,
        certificate: {
            code: row.code, issuedAt: row.issued_at, name: user?.name || "",
            program: program?.title || "", description: program?.description || "", programId: id,
        },
    });
});

const myCertificates = wrap(async (req, res) => {
    const rows = await db.query(
        `SELECT c.code, c.issued_at, p.id AS program_id, p.title, p.description, p.thumb_media_id FROM lnd_certificates c
         JOIN lnd_programs p ON p.id = c.program_id WHERE c.user_id = ? ORDER BY c.issued_at DESC`,
        [req.user.id]
    );
    return res.json({
        success: true,
        certificates: rows.map((r) => ({
            code: r.code, issuedAt: r.issued_at, programId: r.program_id, title: r.title,
            description: r.description || "", thumbUrl: r.thumb_media_id ? mediaUrl(r.thumb_media_id) : null,
        })),
    });
});

// -------- media streaming (signed URL, no auth header needed) --------
const streamMedia = async (req, res) => {
    try {
        await ensureSchema();
        const id = int(req.params.id);
        const exp = Number(req.query.exp);
        const sig = String(req.query.sig || "");
        if (!id || !exp || exp < Date.now()) return bad(res, "Link expired", 403);

        const expected = sign(id, exp);
        if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
            return bad(res, "Invalid link", 403);

        const rows = await db.query(
            `SELECT m.*, COALESCE(md.allow_download, 1) AS allow_download FROM lnd_media m
             LEFT JOIN lnd_modules md ON md.id = m.module_id WHERE m.id = ?`, [id]);
        const media = rows?.[0];
        if (!media) return bad(res, "Not found", 404);

        // Read-only resolution (never mkdir) confined to <UPLOAD_DIR>/lnd.
        const file = resolveUploadFile("lnd", media.stored_name);
        if (!file) {
            console.error(`[L&D] Media #${id} has an invalid stored name; refusing to serve it.`);
            return bad(res, "File not found", 404);
        }
        let stat = null;
        try { stat = fs.statSync(file); } catch (statError) {
            if (statError.code !== "ENOENT") console.error(`[L&D] Media #${id} stat failed: ${statError.code || statError.message}`);
        }
        if (!stat || !stat.isFile()) {
            // Missing on this server (or an empty folder left behind by the
            // old mkdir bug) → a clear 404, logged for administrators.
            console.error(`[L&D] Media #${id} file missing on disk (stored name "${media.stored_name}"). Re-upload it in the module editor.`);
            return bad(res, "File not found on the server. Please ask an administrator to re-upload it.", 404);
        }

        const download = req.query.dl === "1" && Number(media.allow_download) === 1;
        const safeName = String(media.original_name || media.stored_name).replace(/["\\\r\n]/g, "_");
        res.set({
            "Content-Type": MIME_BY_EXT[path.extname(media.stored_name).toLowerCase()] || "application/octet-stream",
            "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
            "Cross-Origin-Resource-Policy": "cross-origin",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
            "Accept-Ranges": "bytes",
        });
        // root + relative name: the dot-file / traversal checks of `send`
        // only apply to the stored name, not to the configured UPLOAD_DIR.
        // sendFile answers HTTP Range requests (video seeking / duration).
        return res.sendFile(path.basename(file), { root: path.dirname(file), dotfiles: "deny" }, (sendError) => {
            if (!sendError) return;
            if (sendError.code === "ECONNABORTED" || sendError.code === "ECANCELED" || res.headersSent) return; // viewer closed / seeked
            console.error(`[L&D] Media #${id} could not be sent: ${sendError.code || sendError.message}`);
            const status = Number(sendError.status || sendError.statusCode) === 404 ? 404 : 500;
            bad(res, status === 404 ? "File not found" : "Unable to load file", status);
        });
    } catch (error) {
        console.error("L&D media error:", error);
        if (!res.headersSent) bad(res, "Unable to load file", 500);
    }
};

// ======================================================
// ADMIN ENDPOINTS
// ======================================================

const PROGRAM_STATUSES = ["Draft", "Active", "Inactive"];

const programCounts = async (programId) => {
    const learnerCount = await notifications.countLearners(programId);
    const certRows = await db.query("SELECT COUNT(*) AS n FROM lnd_certificates WHERE program_id = ?", [programId]);
    const startedRows = await db.query(
        `SELECT COUNT(DISTINCT lp.user_id) AS n FROM lnd_progress lp JOIN lnd_modules m ON m.id = lp.module_id WHERE m.program_id = ?`,
        [programId]
    );
    const certificateCount = Number(certRows?.[0]?.n || 0);
    return {
        learnerCount,
        certificateCount,
        startedCount: Number(startedRows?.[0]?.n || 0),
        completionRate: learnerCount ? Math.min(100, Math.round((certificateCount / learnerCount) * 100)) : 0,
    };
};

const shapeProgram = (p) => ({
    id: p.id, title: p.title, description: p.description || "", audience: p.audience, status: p.status,
    highlights: p.highlights || "", thumbUrl: programThumb(p), publishedAt: p.published_at || null,
    contentVersion: Number(p.content_version || 1), lastNotifiedAt: p.last_notified_at || null,
    createdAt: p.created_at || null, updatedAt: p.updated_at || null,
});

const adminPrograms = wrap(async (req, res) => {
    const programs = await db.query("SELECT * FROM lnd_programs ORDER BY id DESC");
    const out = [];
    let learnerSum = 0;
    let certSum = 0;
    for (const p of programs) {
        const moduleRows = await db.query(
            "SELECT COUNT(*) AS n, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active FROM lnd_modules WHERE program_id = ?",
            [p.id]
        );
        const assignments = await db.query("SELECT kind, ref_id FROM lnd_assignments WHERE program_id = ?", [p.id]);
        const counts = await programCounts(p.id);
        if (p.status === "Active") {
            learnerSum += counts.learnerCount;
            certSum += Math.min(counts.certificateCount, counts.learnerCount);
        }
        out.push({
            ...shapeProgram(p),
            moduleCount: Number(moduleRows?.[0]?.n || 0),
            activeModuleCount: Number(moduleRows?.[0]?.active || 0),
            assignments: assignments.map((a) => ({ kind: a.kind, refId: a.ref_id })),
            ...counts,
        });
    }

    // Distinct learners across all published programs (one person in two
    // programs counts once).
    const access = await lnd.accessibleUserSql("u");
    const distinct = await db.query(
        `SELECT COUNT(*) AS n FROM users u
          WHERE u.status = 'Active' AND ${access.sql} AND EXISTS (
            SELECT 1 FROM lnd_programs p WHERE p.status = 'Active' AND ${notifications.assignedUserSql("u").replace("a.program_id = ?", "a.program_id = p.id")}
          )`,
        access.params
    );

    return res.json({
        success: true,
        programs: out,
        summary: {
            programs: out.length,
            published: out.filter((p) => p.status === "Active").length,
            learners: Number(distinct?.[0]?.n || 0),
            modules: out.reduce((s, p) => s + p.moduleCount, 0),
            completionRate: learnerSum ? Math.round((certSum / learnerSum) * 100) : 0,
        },
    });
});

const programBody = (body) => {
    const title = str(body?.title, 200);
    if (!title) return null;
    return {
        title,
        description: str(body?.description, 2000),
        audience: str(body?.audience, 80) || "All Staff",
        highlights: str(body?.highlights, 500),
        status: PROGRAM_STATUSES.includes(body?.status) ? body.status : null,
    };
};

// New programs always start as Draft: add modules, assign, then Publish.
const createProgram = wrap(async (req, res) => {
    const b = programBody(req.body);
    if (!b) return bad(res, "Program title is required");
    const r = await db.query(
        "INSERT INTO lnd_programs (title, description, audience, highlights, status, created_by, updated_by, updated_at) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?)",
        [b.title, b.description, b.audience, b.highlights, req.user.id, req.user.id, now()]
    );
    return res.status(201).json({ success: true, id: r.insertId, status: "Draft", message: "Program saved as draft. Add modules, assign learners, then publish." });
});

// Publish validation: title, ≥1 active module, ≥1 assignment rule.
const publishProblems = async (programId) => {
    const problems = [];
    const program = (await db.query("SELECT * FROM lnd_programs WHERE id = ?", [programId]))?.[0];
    if (!program) return ["Program not found"];
    if (!String(program.title || "").trim()) problems.push("Add a program title.");
    const modules = await db.query("SELECT COUNT(*) AS n FROM lnd_modules WHERE program_id = ? AND status = 'Active'", [programId]);
    if (!Number(modules?.[0]?.n || 0)) problems.push("Add at least one active module.");
    const assigned = await db.query("SELECT COUNT(*) AS n FROM lnd_assignments WHERE program_id = ?", [programId]);
    if (!Number(assigned?.[0]?.n || 0)) problems.push("Assign the program to at least one role, department, store or user.");
    return problems;
};

const publishInternal = async (programId, userId) => {
    const problems = await publishProblems(programId);
    if (problems.length) return { ok: false, problems };
    await db.query(
        "UPDATE lnd_programs SET status = 'Active', published_at = COALESCE(published_at, ?), updated_by = ?, updated_at = ? WHERE id = ?",
        [now(), userId, now(), programId]
    );
    const notify = await notifications.notifyProgram({ programId, noticeKey: "invite", kind: "invite" });
    return { ok: true, notify };
};

const updateProgram = wrap(async (req, res) => {
    const id = int(req.params.id);
    const b = programBody(req.body);
    if (!id || !b) return bad(res, "Invalid program");
    const current = (await db.query("SELECT * FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!current) return bad(res, "Program not found", 404);

    await db.query(
        "UPDATE lnd_programs SET title = ?, description = ?, audience = ?, highlights = ?, updated_by = ?, updated_at = ? WHERE id = ?",
        [b.title, b.description, b.audience, b.highlights, req.user.id, now(), id]
    );

    // Status changes go through the same rules as the buttons.
    let publish = null;
    if (b.status && b.status !== current.status) {
        if (b.status === "Active") {
            publish = await publishInternal(id, req.user.id);
            if (!publish.ok) return bad(res, `Saved, but not published: ${publish.problems.join(" ")}`);
        } else {
            await db.query("UPDATE lnd_programs SET status = ? WHERE id = ?", [b.status, id]);
        }
    }
    return res.json({ success: true, notify: publish?.notify || null });
});

const publishProgram = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return bad(res, "Invalid program");
    const result = await publishInternal(id, req.user.id);
    if (!result.ok) return res.status(400).json({ success: false, message: result.problems.join(" "), problems: result.problems });
    const { notify } = result;
    return res.json({
        success: true,
        notify,
        message: `Published. ${notify.queued} learner(s) will be emailed${notify.alreadyNotified ? `, ${notify.alreadyNotified} already notified earlier` : ""}.`,
    });
});

// Retry invite emails that failed (or are stuck in "queued") for one
// program. Explicit admin action; bounded and duplicate-safe (see
// lndNotificationService.retryFailed).
const retryEmails = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await db.query("SELECT id, status FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!program) return bad(res, "Program not found", 404);
    if (program.status !== "Active") return bad(res, "Publish the program first — emails are only sent for published programs.");
    const result = await notifications.retryFailed({ programId: id, noticeKey: "invite" });
    return res.json({
        success: true,
        ...result,
        message: result.retried
            ? `Retrying ${result.retried} email(s). Refresh in a minute to see the result.${result.skipped ? ` ${result.skipped} skipped (no longer assigned or no email).` : ""}`
            : "There are no failed emails to retry.",
    });
});

// Unpublish keeps every learner's progress and certificates.
const unpublishProgram = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return bad(res, "Invalid program");
    const r = await db.query("UPDATE lnd_programs SET status = 'Inactive', updated_by = ?, updated_at = ? WHERE id = ?", [req.user.id, now(), id]);
    if (!Number(r?.affectedRows || 0)) return bad(res, "Program not found", 404);
    return res.json({ success: true, message: "Unpublished. Learners no longer see it; their progress and certificates are kept." });
});

// "Notify learners" after a material update (new module, new content,
// changed assessment …). Explicit, so typo fixes never spam anyone.
const notifyUpdate = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await db.query("SELECT * FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!program) return bad(res, "Program not found", 404);
    if (program.status !== "Active") return bad(res, "Publish the program first — learners are notified when it is published.");

    // Compared inside the database (created_at is a DB timestamp), so a
    // different MySQL / Node time zone cannot break the 60-second guard.
    const recent = await db.query(
        "SELECT COUNT(*) AS n FROM lnd_notifications WHERE program_id = ? AND notice_key LIKE 'update-%' AND created_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 60 SECOND)",
        [id]
    );
    if (Number(recent?.[0]?.n || 0)) return bad(res, "Learners were notified less than a minute ago.", 409);

    const version = Number(program.content_version || 1) + 1;
    await db.query("UPDATE lnd_programs SET content_version = ?, updated_by = ?, updated_at = ? WHERE id = ?", [version, req.user.id, now(), id]);
    const notify = await notifications.notifyProgram({
        programId: id, noticeKey: `update-v${version}`, kind: "update", message: str(req.body?.message, 400),
    });
    return res.json({ success: true, notify, message: `${notify.queued} learner(s) will be emailed about the update.` });
});

const removeModuleData = async (moduleIds) => {
    if (!moduleIds.length) return;
    const list = placeholders(moduleIds);
    const thumbs = await db.query(`SELECT thumb_media_id FROM lnd_modules WHERE id IN (${list}) AND thumb_media_id IS NOT NULL`, moduleIds);
    const thumbIds = thumbs.map((t) => t.thumb_media_id).filter(Boolean);
    const media = await db.query(
        `SELECT stored_name FROM lnd_media WHERE module_id IN (${list})${thumbIds.length ? ` OR id IN (${placeholders(thumbIds)})` : ""}`,
        [...moduleIds, ...thumbIds]
    );
    media.forEach((m) => removeFile(m.stored_name));
    await db.query(`DELETE FROM lnd_media WHERE module_id IN (${list})`, moduleIds);
    if (thumbIds.length) await db.query(`DELETE FROM lnd_media WHERE id IN (${placeholders(thumbIds)})`, thumbIds);
    await db.query(`DELETE FROM lnd_questions WHERE module_id IN (${list})`, moduleIds);
    await db.query(`DELETE FROM lnd_progress WHERE module_id IN (${list})`, moduleIds);
    await db.query(`DELETE FROM lnd_attempts WHERE module_id IN (${list})`, moduleIds);
    await db.query(`DELETE FROM lnd_modules WHERE id IN (${list})`, moduleIds);
};

const deleteProgram = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return bad(res, "Invalid program");
    const mods = await db.query("SELECT id FROM lnd_modules WHERE program_id = ?", [id]);
    await removeModuleData(mods.map((m) => m.id));
    const thumbs = await db.query("SELECT stored_name FROM lnd_media WHERE program_id = ?", [id]);
    thumbs.forEach((t) => removeFile(t.stored_name));
    await db.query("DELETE FROM lnd_media WHERE program_id = ?", [id]);
    await db.query("DELETE FROM lnd_assignments WHERE program_id = ?", [id]);
    await db.query("DELETE FROM lnd_certificates WHERE program_id = ?", [id]);
    await db.query("DELETE FROM lnd_notifications WHERE program_id = ?", [id]);
    await db.query("DELETE FROM lnd_programs WHERE id = ?", [id]);
    return res.json({ success: true });
});

const ASSIGN_KINDS = ["designation", "department", "store", "user"];

const saveAssignments = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return bad(res, "Invalid program");
    const program = (await db.query("SELECT id, status FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!program) return bad(res, "Program not found", 404);

    const list = Array.isArray(req.body?.assignments) ? req.body.assignments.slice(0, 2000) : [];
    const seen = new Set();
    const rows = [];
    for (const a of list) {
        let row = null;
        if (a?.kind === "all") row = [id, "all", null];
        else if (ASSIGN_KINDS.includes(a?.kind) && int(a?.refId)) row = [id, a.kind, int(a.refId)];
        if (!row) continue;
        const key = `${row[1]}:${row[2] ?? ""}`;
        if (seen.has(key)) continue; // no duplicate rules
        seen.add(key);
        rows.push(row);
    }
    await db.query("DELETE FROM lnd_assignments WHERE program_id = ?", [id]);
    for (const row of rows) {
        await db.query("INSERT INTO lnd_assignments (program_id, kind, ref_id) VALUES (?, ?, ?)", row);
    }

    const learnerCount = await notifications.countLearners(id);
    // Published program → email only the learners who were never told
    // (the unique notice key skips everybody already notified).
    const notify = program.status === "Active"
        ? await notifications.notifyProgram({ programId: id, noticeKey: "invite", kind: "invite" })
        : null;

    return res.json({ success: true, count: rows.length, learnerCount, notify });
});

const setProgramThumb = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id || !req.file) return bad(res, "Image required");
    const old = (await db.query("SELECT thumb_media_id FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!old) { removeFile(req.file.filename); return bad(res, "Program not found", 404); }
    const ext = path.extname(req.file.filename).toLowerCase();
    const r = await db.query(
        "INSERT INTO lnd_media (program_id, kind, stored_name, original_name, mime, size) VALUES (?, 'image', ?, ?, ?, ?)",
        [id, req.file.filename, str(req.file.originalname, 250), MIME_BY_EXT[ext] || "image/jpeg", req.file.size]
    );
    await db.query("UPDATE lnd_programs SET thumb_media_id = ? WHERE id = ?", [r.insertId, id]);
    if (old.thumb_media_id) {
        const prev = (await db.query("SELECT stored_name FROM lnd_media WHERE id = ?", [old.thumb_media_id]))?.[0];
        if (prev) removeFile(prev.stored_name);
        await db.query("DELETE FROM lnd_media WHERE id = ?", [old.thumb_media_id]);
    }
    return res.json({ success: true, thumbUrl: mediaUrl(r.insertId) });
});

// Module cover image: stored WITHOUT module_id so it is not listed as a
// lesson image; linked through lnd_modules.thumb_media_id.
const setModuleThumb = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id || !req.file) return bad(res, "Image required");
    const mod = (await db.query("SELECT id, program_id, thumb_media_id FROM lnd_modules WHERE id = ?", [id]))?.[0];
    if (!mod) { removeFile(req.file.filename); return bad(res, "Module not found", 404); }
    const ext = path.extname(req.file.filename).toLowerCase();
    const r = await db.query(
        "INSERT INTO lnd_media (program_id, kind, stored_name, original_name, mime, size) VALUES (?, 'image', ?, ?, ?, ?)",
        [mod.program_id, req.file.filename, str(req.file.originalname, 250), MIME_BY_EXT[ext] || "image/jpeg", req.file.size]
    );
    await db.query("UPDATE lnd_modules SET thumb_media_id = ? WHERE id = ?", [r.insertId, id]);
    if (mod.thumb_media_id) {
        const prev = (await db.query("SELECT stored_name FROM lnd_media WHERE id = ?", [mod.thumb_media_id]))?.[0];
        if (prev) removeFile(prev.stored_name);
        await db.query("DELETE FROM lnd_media WHERE id = ?", [mod.thumb_media_id]);
    }
    return res.json({ success: true, thumbUrl: mediaUrl(r.insertId) });
});

const adminProgram = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await db.query("SELECT * FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!program) return bad(res, "Program not found", 404);

    const modules = await db.query(
        `SELECT m.*, (SELECT COUNT(*) FROM lnd_questions q WHERE q.module_id = m.id) AS question_count
         FROM lnd_modules m WHERE m.program_id = ? ORDER BY m.sort_order, m.id`, [id]);
    const ids = modules.map((m) => m.id);
    const media = ids.length ? await db.query(`SELECT * FROM lnd_media WHERE module_id IN (${placeholders(ids)}) ORDER BY id`, ids) : [];
    const assignments = await db.query("SELECT kind, ref_id FROM lnd_assignments WHERE program_id = ?", [id]);
    const counts = await programCounts(id);
    const problems = await publishProblems(id);

    return res.json({
        success: true,
        program: {
            ...shapeProgram(program),
            assignments: assignments.map((a) => ({ kind: a.kind, refId: a.ref_id })),
            ...counts,
            publishProblems: problems,
        },
        modules: modules.map((m) => {
            const files = media.filter((x) => x.module_id === m.id).map((x) => shapeMedia(x, true));
            return {
                id: m.id, title: m.title, description: m.description || "", highlights: m.highlights || "",
                durationMin: m.duration_min, mandatory: !!Number(m.mandatory), allowDownload: !!Number(m.allow_download),
                status: m.status, sortOrder: m.sort_order, passMark: m.pass_mark, examMinutes: m.exam_minutes,
                maxAttempts: Number(m.max_attempts || 0),
                videoUrl: m.video_url || "", questionCount: Number(m.question_count),
                thumbUrl: m.thumb_media_id ? mediaUrl(m.thumb_media_id) : null,
                contentTypes: [
                    ...(m.video_url || files.some((f) => f.kind === "video") ? ["video"] : []),
                    ...(files.some((f) => f.kind === "pdf") ? ["pdf"] : []),
                    ...(files.some((f) => f.kind === "image") ? ["image"] : []),
                    ...(String(m.description || "").trim() ? ["notes"] : []),
                ],
                media: files,
            };
        }),
    });
});

// Learners of one program: everybody assigned now + anybody with history
// (progress / certificate) — history is never hidden.
const programLearners = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await db.query("SELECT id, title FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!program) return bad(res, "Program not found", 404);

    const assigned = await notifications.resolveLearners(id);
    const assignedIds = new Set(assigned.map((u) => Number(u.id)));

    const modules = await db.query("SELECT id, mandatory FROM lnd_modules WHERE program_id = ? AND status = 'Active'", [id]);
    const totalModules = modules.length;

    const progress = await db.query(
        `SELECT lp.user_id,
                SUM(CASE WHEN lp.completed = 1 AND m.status = 'Active' THEN 1 ELSE 0 END) AS done,
                MAX(lp.last_viewed) AS last_activity,
                ROUND(AVG(lp.best_score)) AS avg_score
           FROM lnd_progress lp JOIN lnd_modules m ON m.id = lp.module_id
          WHERE m.program_id = ?
          GROUP BY lp.user_id`,
        [id]
    );
    const certs = await db.query("SELECT user_id, code, issued_at FROM lnd_certificates WHERE program_id = ?", [id]);
    const invites = await db.query("SELECT user_id, status, sent_at, error FROM lnd_notifications WHERE program_id = ? AND notice_key = 'invite'", [id]);

    const byProgress = new Map(progress.map((p) => [Number(p.user_id), p]));
    const byCert = new Map(certs.map((c) => [Number(c.user_id), c]));
    const byInvite = new Map(invites.map((n) => [Number(n.user_id), n]));

    const historyIds = [...new Set([...byProgress.keys(), ...byCert.keys()])].filter((uid) => !assignedIds.has(uid));
    const historyUsers = historyIds.length
        ? await db.query(`SELECT id, name, email FROM users WHERE id IN (${placeholders(historyIds)})`, historyIds)
        : [];

    const designations = await db.query(
        `SELECT u.id, dg.designation_name AS designation FROM users u LEFT JOIN designations dg ON dg.id = u.designation_id
          WHERE u.id IN (${placeholders([...assignedIds, ...historyIds, 0])})`,
        [...assignedIds, ...historyIds, 0]
    );
    const byDesignation = new Map(designations.map((d) => [Number(d.id), d.designation || ""]));

    const rows = [...assigned.map((u) => ({ ...u, assigned: true })), ...historyUsers.map((u) => ({ ...u, assigned: false }))]
        .map((u) => {
            const p = byProgress.get(Number(u.id));
            const c = byCert.get(Number(u.id));
            const n = byInvite.get(Number(u.id));
            const done = Number(p?.done || 0);
            const percent = totalModules ? Math.min(100, Math.round((done / totalModules) * 100)) : 0;
            return {
                userId: u.id, name: u.name, email: u.email, designation: byDesignation.get(Number(u.id)) || "",
                assigned: u.assigned,
                done, total: totalModules, percent,
                avgScore: p?.avg_score === null || p?.avg_score === undefined ? null : Number(p.avg_score),
                lastActivity: p?.last_activity || null,
                status: c ? "Completed" : p ? "In Progress" : "Not Started",
                certificate: c ? { code: c.code, issuedAt: c.issued_at } : null,
                // Invite ("New training assigned") email — the only learner
                // email this module sends. emailError is the sanitised
                // reason recorded by lndNotificationService.
                emailStatus: n ? n.status : null,
                emailSentAt: n?.sent_at || null,
                emailError: n && n.status === "failed" ? String(n.error || "Send failed") : null,
            };
        });

    return res.json({
        success: true,
        program: { id: program.id, title: program.title },
        summary: {
            assigned: assigned.length,
            notStarted: rows.filter((r) => r.assigned && r.status === "Not Started").length,
            inProgress: rows.filter((r) => r.status === "In Progress").length,
            completed: rows.filter((r) => r.status === "Completed").length,
            certificates: certs.length,
        },
        learners: rows,
    });
});

const moduleBody = (b) => {
    const title = str(b?.title, 200);
    if (!title) return null;
    const url = str(b?.videoUrl, 500);
    if (url && !/^https:\/\//i.test(url)) return { error: "External video URL must start with https://" };
    const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Math.round(Number(v)) : d));
    return {
        title,
        description: str(b?.description, 4000),
        highlights: str(b?.highlights, 500),
        durationMin: clamp(b?.durationMin, 1, 600, 10),
        mandatory: b?.mandatory === false ? 0 : 1,
        allowDownload: b?.allowDownload === false ? 0 : 1,
        status: b?.status === "Inactive" ? "Inactive" : "Active",
        passMark: clamp(b?.passMark, 1, 100, 70),
        examMinutes: clamp(b?.examMinutes, 1, 240, 15),
        maxAttempts: clamp(b?.maxAttempts, 0, 20, 0),
        videoUrl: url,
    };
};

const createModule = wrap(async (req, res) => {
    const programId = int(req.body?.programId);
    const b = moduleBody(req.body);
    if (!programId || !b) return bad(res, "Program and module title are required");
    if (b.error) return bad(res, b.error);
    const exists = (await db.query("SELECT id FROM lnd_programs WHERE id = ?", [programId]))?.[0];
    if (!exists) return bad(res, "Program not found", 404);
    const [{ n }] = await db.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM lnd_modules WHERE program_id = ?", [programId]);
    const r = await db.query(
        `INSERT INTO lnd_modules (program_id, title, description, highlights, duration_min, mandatory, allow_download,
         status, sort_order, pass_mark, exam_minutes, max_attempts, video_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [programId, b.title, b.description, b.highlights, b.durationMin, b.mandatory, b.allowDownload, b.status, n, b.passMark, b.examMinutes, b.maxAttempts, b.videoUrl || null]
    );
    await db.query("UPDATE lnd_programs SET updated_by = ?, updated_at = ? WHERE id = ?", [req.user.id, now(), programId]);
    return res.status(201).json({ success: true, id: r.insertId });
});

const updateModule = wrap(async (req, res) => {
    const id = int(req.params.id);
    const b = moduleBody(req.body);
    if (!id || !b) return bad(res, "Invalid module");
    if (b.error) return bad(res, b.error);
    const r = await db.query(
        `UPDATE lnd_modules SET title=?, description=?, highlights=?, duration_min=?, mandatory=?, allow_download=?,
         status=?, pass_mark=?, exam_minutes=?, max_attempts=?, video_url=? WHERE id=?`,
        [b.title, b.description, b.highlights, b.durationMin, b.mandatory, b.allowDownload, b.status, b.passMark, b.examMinutes, b.maxAttempts, b.videoUrl || null, id]
    );
    if (!Number(r?.affectedRows || 0)) return bad(res, "Module not found", 404);
    return res.json({ success: true });
});

const reorderModules = wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(int).filter(Boolean).slice(0, 200) : [];
    if (!ids.length) return bad(res, "Nothing to reorder");
    const rows = await db.query(`SELECT id, program_id FROM lnd_modules WHERE id IN (${placeholders(ids)})`, ids);
    const programs = new Set(rows.map((r) => Number(r.program_id)));
    if (rows.length !== ids.length || programs.size !== 1) return bad(res, "Modules must belong to the same program.");
    for (let i = 0; i < ids.length; i += 1) {
        await db.query("UPDATE lnd_modules SET sort_order = ? WHERE id = ?", [i + 1, ids[i]]);
    }
    return res.json({ success: true });
});

const deleteModule = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return bad(res, "Invalid module");
    await removeModuleData([id]);
    return res.json({ success: true });
});

const uploadModuleMedia = wrap(async (req, res) => {
    const id = int(req.params.id);
    const files = req.files || [];
    const mod = id && (await db.query("SELECT id FROM lnd_modules WHERE id = ?", [id]))?.[0];
    if (!mod) { files.forEach((f) => removeFile(f.filename)); return bad(res, "Module not found", 404); }
    if (!files.length) return bad(res, "Choose at least one file");

    const created = [];
    for (const f of files) {
        const ext = path.extname(f.filename).toLowerCase();
        const kind = KIND_BY_EXT[ext];
        const r = await db.query(
            "INSERT INTO lnd_media (module_id, kind, stored_name, original_name, mime, size) VALUES (?,?,?,?,?,?)",
            [id, kind, f.filename, str(f.originalname, 250), MIME_BY_EXT[ext], f.size]
        );
        created.push(r.insertId);
    }
    return res.status(201).json({ success: true, ids: created });
});

const deleteMedia = wrap(async (req, res) => {
    const id = int(req.params.id);
    const media = id && (await db.query("SELECT * FROM lnd_media WHERE id = ?", [id]))?.[0];
    if (!media) return bad(res, "File not found", 404);
    removeFile(media.stored_name);
    await db.query("DELETE FROM lnd_media WHERE id = ?", [id]);
    return res.json({ success: true });
});

const getQuestions = wrap(async (req, res) => {
    const id = int(req.params.id);
    const rows = id ? await db.query("SELECT * FROM lnd_questions WHERE module_id = ? ORDER BY sort_order, id", [id]) : [];
    return res.json({
        success: true,
        questions: rows.map((q) => ({ question: q.question, options: JSON.parse(q.options), correct: q.correct_index, explanation: q.explanation || "" })),
    });
});

const saveQuestions = wrap(async (req, res) => {
    const id = int(req.params.id);
    const list = Array.isArray(req.body?.questions) ? req.body.questions.slice(0, 100) : null;
    if (!id || !list) return bad(res, "Invalid request");
    const mod = (await db.query("SELECT id FROM lnd_modules WHERE id = ?", [id]))?.[0];
    if (!mod) return bad(res, "Module not found", 404);

    const rows = [];
    for (let i = 0; i < list.length; i += 1) {
        const q = list[i];
        const options = Array.isArray(q?.options) ? q.options.map((o) => str(o, 300)).filter(Boolean) : [];
        const correct = Number(q?.correct);
        if (!str(q?.question, 1000) || options.length < 2 || options.length > 6 || !Number.isInteger(correct) || correct < 0 || correct >= options.length)
            return bad(res, `Question ${i + 1}: needs text, 2–6 options and one correct answer.`);
        rows.push([id, str(q.question, 1000), JSON.stringify(options), correct, str(q.explanation, 1000), i]);
    }
    await db.query("DELETE FROM lnd_questions WHERE module_id = ?", [id]);
    for (const row of rows) {
        await db.query("INSERT INTO lnd_questions (module_id, question, options, correct_index, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?)", row);
    }
    return res.json({ success: true, count: rows.length });
});

const lookups = wrap(async (req, res) => {
    const [designations, departments, stores, users] = await Promise.all([
        db.query("SELECT id, designation_name AS name FROM designations ORDER BY designation_name"),
        db.query("SELECT id, department_name AS name FROM departments ORDER BY department_name"),
        db.query("SELECT id, store_name AS name FROM stores ORDER BY store_name"),
        db.query("SELECT id, name, email FROM users WHERE status = 'Active' ORDER BY name"),
    ]);
    return res.json({ success: true, designations, departments, stores, users });
});

const report = wrap(async (req, res) => {
    const rows = await db.query(
        `SELECT u.id, u.name, u.email, dg.designation_name AS designation,
                p.id AS program_id, p.title AS program,
                (SELECT COUNT(*) FROM lnd_modules m WHERE m.program_id = p.id AND m.status = 'Active') AS total,
                (SELECT COUNT(*) FROM lnd_progress lp JOIN lnd_modules m ON m.id = lp.module_id
                  WHERE lp.user_id = u.id AND m.program_id = p.id AND m.status = 'Active' AND lp.completed = 1) AS done,
                (SELECT ROUND(AVG(lp.best_score)) FROM lnd_progress lp JOIN lnd_modules m ON m.id = lp.module_id
                  WHERE lp.user_id = u.id AND m.program_id = p.id AND lp.best_score IS NOT NULL) AS avg_score,
                (SELECT issued_at FROM lnd_certificates c WHERE c.user_id = u.id AND c.program_id = p.id) AS certified_at
         FROM users u
         JOIN lnd_programs p ON p.status = 'Active'
         LEFT JOIN designations dg ON dg.id = u.designation_id
         WHERE u.status = 'Active' AND EXISTS (SELECT 1 FROM lnd_progress x JOIN lnd_modules m ON m.id = x.module_id
                                               WHERE x.user_id = u.id AND m.program_id = p.id)
         ORDER BY p.id, u.name LIMIT 2000`
    );
    return res.json({
        success: true,
        rows: rows.map((r) => ({
            userId: r.id, name: r.name, email: r.email, designation: r.designation || "",
            programId: r.program_id, program: r.program, total: Number(r.total), done: Number(r.done),
            percent: Number(r.total) ? Math.round((Number(r.done) / Number(r.total)) * 100) : 0,
            avgScore: r.avg_score === null ? null : Number(r.avg_score), certifiedAt: r.certified_at,
        })),
    });
});

const reportCertificate = wrap(async (req, res) => {
    const userId = int(req.params.userId);
    const programId = int(req.params.programId);
    if (!userId || !programId) return bad(res, "Invalid learner or program.");
    const rows = await db.query(
        `SELECT c.code, c.issued_at, u.name, u.email, p.title AS program
         FROM lnd_certificates c
         JOIN users u ON u.id = c.user_id
         JOIN lnd_programs p ON p.id = c.program_id
         WHERE c.user_id = ? AND c.program_id = ? LIMIT 1`, [userId, programId]
    );
    if (!rows.length) return bad(res, "No certificate has been issued for this learner and program.", 404);
    const c = rows[0];
    return res.json({ success: true, certificate: {
        code: c.code, issuedAt: c.issued_at, name: c.name || "", email: c.email || "", program: c.program || ""
    }});
});

const updateReportProgress = wrap(async (req, res) => {
    const userId = int(req.params.userId);
    const programId = int(req.params.programId);
    if (!userId || !programId) return bad(res, "Invalid learner or program.");
    const completed = req.body?.completed === true;
    const users = await db.query("SELECT id FROM users WHERE id = ? AND status = 'Active' LIMIT 1", [userId]);
    const programs = await db.query("SELECT id FROM lnd_programs WHERE id = ? LIMIT 1", [programId]);
    if (!users.length || !programs.length) return bad(res, "Learner or program not found.", 404);
    const modules = await db.query("SELECT id FROM lnd_modules WHERE program_id = ? AND status = 'Active'", [programId]);
    if (!modules.length) return bad(res, "This program has no active modules.");
    await db.query(
        `INSERT INTO lnd_progress (user_id, module_id, completed, completed_at)
         SELECT ?, id, ?, IF(? = 1, CURRENT_TIMESTAMP, NULL)
         FROM lnd_modules WHERE program_id = ? AND status = 'Active'
         ON DUPLICATE KEY UPDATE completed = VALUES(completed), completed_at = VALUES(completed_at)`,
        [userId, completed ? 1 : 0, completed ? 1 : 0, programId]
    );
    if (!completed) await db.query("DELETE FROM lnd_certificates WHERE user_id = ? AND program_id = ?", [userId, programId]);
    else await issueCertificateIfEligible(userId, programId);
    return res.json({ success: true, message: completed ? "Learner marked as completed." : "Learner progress reset." });
});

const deleteReportProgress = wrap(async (req, res) => {
    const userId = int(req.params.userId);
    const programId = int(req.params.programId);
    if (!userId || !programId) return bad(res, "Invalid learner or program.");
    await db.query(
        "DELETE lp FROM lnd_progress lp JOIN lnd_modules m ON m.id = lp.module_id WHERE lp.user_id = ? AND m.program_id = ?",
        [userId, programId]
    );
    await db.query("DELETE FROM lnd_certificates WHERE user_id = ? AND program_id = ?", [userId, programId]);
    return res.json({ success: true, message: "Learner report activity deleted." });
});

const seed = wrap(async (req, res) => {
    const [{ n }] = await db.query("SELECT COUNT(*) AS n FROM lnd_programs");
    if (Number(n) > 0 && req.body?.force !== true) return bad(res, "Programs already exist.");
    for (const p of SEED) {
        const r = await db.query("INSERT INTO lnd_programs (title, description, audience, status, created_by) VALUES (?,?,?,'Draft',?)",
            [p.title, p.description, p.audience, req.user.id]);
        let order = 1;
        for (const m of p.modules) {
            const mr = await db.query(
                `INSERT INTO lnd_modules (program_id, title, description, highlights, duration_min, sort_order)
                 VALUES (?,?,?,?,?,?)`, [r.insertId, m.title, m.description, m.highlights, m.minutes, order++]);
            for (let i = 0; i < m.questions.length; i += 1) {
                const q = m.questions[i];
                await db.query("INSERT INTO lnd_questions (module_id, question, options, correct_index, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                    [mr.insertId, q.question, JSON.stringify(q.options), q.correct, q.explanation, i]);
            }
        }
    }
    return res.json({ success: true, message: "Starter programs created as drafts. Assign learners and publish them." });
});

module.exports = {
    overview, programDetail, moduleDetail, markComplete, examStart, examSubmit, certificate, myCertificates, streamMedia,
    adminPrograms, createProgram, updateProgram, deleteProgram, saveAssignments, setProgramThumb, adminProgram,
    publishProgram, unpublishProgram, notifyUpdate, retryEmails, programLearners, setModuleThumb,
    createModule, updateModule, reorderModules, deleteModule, uploadModuleMedia, deleteMedia,
    getQuestions, saveQuestions, lookups, report, reportCertificate, updateReportProgress, deleteReportProgress, seed,
};
