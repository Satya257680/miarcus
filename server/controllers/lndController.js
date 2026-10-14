const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../config/db");
const { JWT_SECRET } = require("../config/security");
const { uploadPath } = require("../config/storage");
const lnd = require("../utils/lndAccess");
const { ensureSchema } = require("../services/lndSchema");
const SEED = require("../services/lndSeed");
const { KIND_BY_EXT, MIME_BY_EXT } = require("../middleware/lndUpload");

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

const removeFile = (stored) => {
    if (!stored) return;
    try {
        fs.unlink(uploadPath("lnd", stored), () => {});
    } catch (_) { /* ignore */ }
};

// -------- visibility --------
const VISIBLE_SQL = `
    p.status = 'Active' AND EXISTS (
        SELECT 1 FROM lnd_assignments a WHERE a.program_id = p.id AND (
            a.kind = 'all'
            OR (a.kind = 'user' AND a.ref_id = ?)
            OR (a.kind = 'designation' AND a.ref_id = (SELECT designation_id FROM users WHERE id = ?))
            OR (a.kind = 'store' AND a.ref_id IN (SELECT store_id FROM user_stores WHERE user_id = ?))
        )
    )`;

const loadProgram = async (req, programId) => {
    const manager = await isManager(req);
    const rows = manager
        ? await db.query("SELECT p.* FROM lnd_programs p WHERE p.id = ?", [programId])
        : await db.query(`SELECT p.* FROM lnd_programs p WHERE p.id = ? AND ${VISIBLE_SQL}`, [
              programId, req.user.id, req.user.id, req.user.id,
          ]);
    return rows?.[0] || null;
};

// Active modules of a program with this user's progress + lock state.
const loadModules = async (req, programId, manager) => {
    const modules = await db.query(
        `SELECT m.*, (SELECT COUNT(*) FROM lnd_questions q WHERE q.module_id = m.id) AS question_count
         FROM lnd_modules m WHERE m.program_id = ? ${manager ? "" : "AND m.status = 'Active'"}
         ORDER BY m.sort_order, m.id`,
        [programId]
    );
    const ids = modules.map((m) => m.id);
    const progress = ids.length
        ? await db.query("SELECT * FROM lnd_progress WHERE user_id = ? AND module_id IN (?)", [req.user.id, ids])
        : [];
    const byModule = Object.fromEntries(progress.map((p) => [p.module_id, p]));

    let blocked = false;
    return modules.map((m) => {
        const p = byModule[m.id];
        const completed = !!p?.completed;
        const locked = !manager && blocked && m.status === "Active";
        if (!completed && m.mandatory && m.status === "Active") blocked = true;
        return {
            id: m.id,
            programId: m.program_id,
            title: m.title,
            description: m.description || "",
            highlights: String(m.highlights || "").split("|").map((s) => s.trim()).filter(Boolean),
            durationMin: m.duration_min,
            mandatory: !!m.mandatory,
            status: m.status,
            hasExam: Number(m.question_count) > 0,
            questionCount: Number(m.question_count),
            passMark: m.pass_mark,
            examMinutes: m.exam_minutes,
            allowDownload: !!m.allow_download,
            videoUrl: m.video_url || "",
            sortOrder: m.sort_order,
            thumbMediaId: m.thumb_media_id,
            completed,
            bestScore: p?.best_score ?? null,
            attempts: p?.attempts || 0,
            started: !!p,
            locked,
        };
    });
};

const programStats = (modules) => {
    const active = modules.filter((m) => m.status === "Active");
    const done = active.filter((m) => m.completed).length;
    return {
        moduleCount: active.length,
        completedCount: done,
        percent: active.length ? Math.round((done / active.length) * 100) : 0,
        durationMin: active.reduce((s, m) => s + (m.durationMin || 0), 0),
        nextModuleId: (active.find((m) => !m.completed && !m.locked) || {}).id || null,
        started: active.some((m) => m.started),
    };
};

const programThumb = async (program) => {
    if (!program.thumb_media_id) return null;
    return mediaUrl(program.thumb_media_id);
};

// ======================================================
// LEARNER ENDPOINTS (View)
// ======================================================

const overview = wrap(async (req, res) => {
    const manager = await isManager(req);
    const programs = manager
        ? await db.query("SELECT p.* FROM lnd_programs p WHERE p.status = 'Active' ORDER BY p.id")
        : await db.query(`SELECT p.* FROM lnd_programs p WHERE ${VISIBLE_SQL} ORDER BY p.id`, [
              req.user.id, req.user.id, req.user.id,
          ]);

    const out = [];
    for (const p of programs) {
        const modules = await loadModules(req, p.id, false);
        out.push({
            id: p.id,
            title: p.title,
            description: p.description || "",
            audience: p.audience,
            thumbUrl: await programThumb(p),
            ...programStats(modules),
        });
    }
    return res.json({ success: true, manager, programs: out });
});

const programDetail = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await loadProgram(req, id));
    if (!program) return bad(res, "Program not found", 404);

    const modules = await loadModules(req, id, false);
    const stats = programStats(modules);
    const cert = await db.query("SELECT code, issued_at FROM lnd_certificates WHERE user_id = ? AND program_id = ?", [req.user.id, id]);

    return res.json({
        success: true,
        program: {
            id: program.id, title: program.title, description: program.description || "",
            audience: program.audience, thumbUrl: await programThumb(program),
        },
        modules,
        stats,
        certificateReady: stats.moduleCount > 0 && stats.completedCount === stats.moduleCount,
        certificateIssued: !!cert?.length,
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
    const modules = await loadModules(req, mod.program_id, false);
    const me = modules.find((m) => m.id === id);
    if (!me || (me.locked && !manager)) return bad(res, "Complete the previous module first.", 403);

    await db.query(
        "INSERT INTO lnd_progress (user_id, module_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_viewed = CURRENT_TIMESTAMP",
        [req.user.id, id]
    );

    const media = await db.query("SELECT * FROM lnd_media WHERE module_id = ? ORDER BY id", [id]);
    const stats = programStats(modules);
    const index = modules.findIndex((m) => m.id === id);

    return res.json({
        success: true,
        program: { id: program.id, title: program.title, audience: program.audience },
        module: { ...me, started: true },
        position: { index: index + 1, total: modules.length },
        modules: modules.map((m) => ({ id: m.id, title: m.title, durationMin: m.durationMin, completed: m.completed, locked: m.locked })),
        media: media.map((m) => shapeMedia(m, mod.allow_download)),
        stats,
        certificateReady: stats.moduleCount > 0 && stats.completedCount === stats.moduleCount,
    });
});

// Modules without an exam can be marked complete manually.
const markComplete = wrap(async (req, res) => {
    const id = int(req.params.id);
    const rows = id ? await db.query("SELECT * FROM lnd_modules WHERE id = ? AND status = 'Active'", [id]) : [];
    const mod = rows?.[0];
    if (!mod || !(await loadProgram(req, mod.program_id))) return bad(res, "Module not found", 404);

    const modules = await loadModules(req, mod.program_id, false);
    const me = modules.find((m) => m.id === id);
    if (me?.locked && !(await isManager(req))) return bad(res, "Complete the previous module first.", 403);
    if (me?.hasExam) return bad(res, "Pass the assessment to complete this module.", 400);

    await db.query(
        `INSERT INTO lnd_progress (user_id, module_id, completed, completed_at) VALUES (?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE completed = 1, completed_at = COALESCE(completed_at, VALUES(completed_at))`,
        [req.user.id, id, now()]
    );
    return res.json({ success: true });
});

// -------- exam --------
const examStart = wrap(async (req, res) => {
    const id = int(req.params.id);
    const rows = id ? await db.query("SELECT * FROM lnd_modules WHERE id = ? AND status = 'Active'", [id]) : [];
    const mod = rows?.[0];
    if (!mod || !(await loadProgram(req, mod.program_id))) return bad(res, "Module not found", 404);

    const modules = await loadModules(req, mod.program_id, false);
    if (modules.find((m) => m.id === id)?.locked && !(await isManager(req)))
        return bad(res, "Complete the previous module first.", 403);

    const questions = await db.query("SELECT id, question, options FROM lnd_questions WHERE module_id = ? ORDER BY sort_order, id", [id]);
    if (!questions.length) return bad(res, "This module has no assessment.");

    const result = await db.query("INSERT INTO lnd_attempts (user_id, module_id, started_at) VALUES (?, ?, ?)", [req.user.id, id, now()]);

    return res.json({
        success: true,
        attemptId: result.insertId,
        minutes: mod.exam_minutes,
        passMark: mod.pass_mark,
        title: mod.title,
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
    if (attempt.submitted_at) return bad(res, "This attempt was already submitted.");

    const mod = (await db.query("SELECT * FROM lnd_modules WHERE id = ?", [attempt.module_id]))[0];
    const questions = await db.query("SELECT * FROM lnd_questions WHERE module_id = ? ORDER BY sort_order, id", [attempt.module_id]);
    if (!mod || !questions.length) return bad(res, "Assessment not available");

    const timedOut = Date.now() - new Date(attempt.started_at).getTime() > (mod.exam_minutes + 1) * 60 * 1000;
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

    await db.query("UPDATE lnd_attempts SET submitted_at = ?, score = ?, passed = ? WHERE id = ?", [now(), score, passed ? 1 : 0, attemptId]);
    await db.query(
        `INSERT INTO lnd_progress (user_id, module_id, completed, completed_at, best_score, passed, attempts)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE attempts = attempts + 1,
           best_score = GREATEST(COALESCE(best_score, 0), VALUES(best_score)),
           passed = IF(VALUES(passed) = 1, 1, passed),
           completed = IF(VALUES(completed) = 1, 1, completed),
           completed_at = IF(VALUES(completed) = 1, COALESCE(completed_at, VALUES(completed_at)), completed_at)`,
        [req.user.id, attempt.module_id, passed ? 1 : 0, passed ? now() : null, score, passed ? 1 : 0]
    );

    return res.json({
        success: true,
        score, passed, timedOut, correct, total: questions.length, passMark: mod.pass_mark,
        // The answer key is revealed only once the learner has passed.
        review: review.map((r) => ({
            id: r.id, correct: r.correct,
            ...(passed ? { correctIndex: r.correctIndex, explanation: r.explanation } : {}),
        })),
    });
});

// -------- certificate --------
const certificate = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await loadProgram(req, id));
    if (!program) return bad(res, "Program not found", 404);

    const modules = await loadModules(req, id, false);
    const stats = programStats(modules);
    if (!stats.moduleCount || stats.completedCount < stats.moduleCount)
        return bad(res, "Complete all modules to get your certificate.", 403);

    let rows = await db.query("SELECT * FROM lnd_certificates WHERE user_id = ? AND program_id = ?", [req.user.id, id]);
    if (!rows.length) {
        const issued = now();
        const code = `MIA-${id}-${req.user.id}-${issued.toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
        await db.query("INSERT INTO lnd_certificates (user_id, program_id, code, issued_at) VALUES (?, ?, ?, ?)", [req.user.id, id, code, issued]);
        rows = await db.query("SELECT * FROM lnd_certificates WHERE user_id = ? AND program_id = ?", [req.user.id, id]);
    }
    const user = (await db.query("SELECT name FROM users WHERE id = ?", [req.user.id]))[0];

    return res.json({
        success: true,
        certificate: { code: rows[0].code, issuedAt: rows[0].issued_at, name: user?.name || "", program: program.title },
    });
});

const myCertificates = wrap(async (req, res) => {
    const rows = await db.query(
        `SELECT c.code, c.issued_at, p.id AS program_id, p.title FROM lnd_certificates c
         JOIN lnd_programs p ON p.id = c.program_id WHERE c.user_id = ? ORDER BY c.issued_at DESC`,
        [req.user.id]
    );
    return res.json({ success: true, certificates: rows.map((r) => ({ code: r.code, issuedAt: r.issued_at, programId: r.program_id, title: r.title })) });
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

        const file = uploadPath("lnd", media.stored_name);
        if (!fs.existsSync(file)) return bad(res, "File missing", 404);

        const download = req.query.dl === "1" && Number(media.allow_download) === 1;
        res.set({
            "Content-Type": MIME_BY_EXT[path.extname(media.stored_name).toLowerCase()] || "application/octet-stream",
            "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(media.original_name)}"`,
            "Cross-Origin-Resource-Policy": "cross-origin",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
        });
        return res.sendFile(file); // supports HTTP range requests (video seeking)
    } catch (error) {
        console.error("L&D media error:", error);
        if (!res.headersSent) bad(res, "Unable to load file", 500);
    }
};

// ======================================================
// ADMIN ENDPOINTS
// ======================================================

const adminPrograms = wrap(async (req, res) => {
    const programs = await db.query("SELECT * FROM lnd_programs ORDER BY id");
    const out = [];
    for (const p of programs) {
        const [{ n: moduleCount }] = await db.query("SELECT COUNT(*) AS n FROM lnd_modules WHERE program_id = ?", [p.id]);
        const assignments = await db.query("SELECT kind, ref_id FROM lnd_assignments WHERE program_id = ?", [p.id]);
        out.push({
            id: p.id, title: p.title, description: p.description || "", audience: p.audience, status: p.status,
            moduleCount: Number(moduleCount), thumbUrl: await programThumb(p),
            assignments: assignments.map((a) => ({ kind: a.kind, refId: a.ref_id })),
        });
    }
    return res.json({ success: true, programs: out });
});

const programBody = (body) => {
    const title = str(body?.title, 200);
    if (!title) return null;
    return {
        title,
        description: str(body?.description, 2000),
        audience: str(body?.audience, 80) || "All Staff",
        status: body?.status === "Inactive" ? "Inactive" : "Active",
    };
};

const createProgram = wrap(async (req, res) => {
    const b = programBody(req.body);
    if (!b) return bad(res, "Program title is required");
    const r = await db.query(
        "INSERT INTO lnd_programs (title, description, audience, status, created_by) VALUES (?, ?, ?, ?, ?)",
        [b.title, b.description, b.audience, b.status, req.user.id]
    );
    return res.status(201).json({ success: true, id: r.insertId });
});

const updateProgram = wrap(async (req, res) => {
    const id = int(req.params.id);
    const b = programBody(req.body);
    if (!id || !b) return bad(res, "Invalid program");
    await db.query("UPDATE lnd_programs SET title = ?, description = ?, audience = ?, status = ? WHERE id = ?",
        [b.title, b.description, b.audience, b.status, id]);
    return res.json({ success: true });
});

const removeModuleData = async (moduleIds) => {
    if (!moduleIds.length) return;
    const media = await db.query("SELECT stored_name FROM lnd_media WHERE module_id IN (?)", [moduleIds]);
    media.forEach((m) => removeFile(m.stored_name));
    await db.query("DELETE FROM lnd_media WHERE module_id IN (?)", [moduleIds]);
    await db.query("DELETE FROM lnd_questions WHERE module_id IN (?)", [moduleIds]);
    await db.query("DELETE FROM lnd_progress WHERE module_id IN (?)", [moduleIds]);
    await db.query("DELETE FROM lnd_attempts WHERE module_id IN (?)", [moduleIds]);
    await db.query("DELETE FROM lnd_modules WHERE id IN (?)", [moduleIds]);
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
    await db.query("DELETE FROM lnd_programs WHERE id = ?", [id]);
    return res.json({ success: true });
});

const saveAssignments = wrap(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return bad(res, "Invalid program");
    const list = Array.isArray(req.body?.assignments) ? req.body.assignments.slice(0, 500) : [];
    const rows = [];
    for (const a of list) {
        if (a?.kind === "all") rows.push([id, "all", null]);
        else if (["designation", "store", "user"].includes(a?.kind) && int(a?.refId)) rows.push([id, a.kind, int(a.refId)]);
    }
    await db.query("DELETE FROM lnd_assignments WHERE program_id = ?", [id]);
    if (rows.length) await db.query("INSERT INTO lnd_assignments (program_id, kind, ref_id) VALUES ?", [rows]);
    return res.json({ success: true, count: rows.length });
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

const adminProgram = wrap(async (req, res) => {
    const id = int(req.params.id);
    const program = id && (await db.query("SELECT * FROM lnd_programs WHERE id = ?", [id]))?.[0];
    if (!program) return bad(res, "Program not found", 404);

    const modules = await db.query(
        `SELECT m.*, (SELECT COUNT(*) FROM lnd_questions q WHERE q.module_id = m.id) AS question_count
         FROM lnd_modules m WHERE m.program_id = ? ORDER BY m.sort_order, m.id`, [id]);
    const ids = modules.map((m) => m.id);
    const media = ids.length ? await db.query("SELECT * FROM lnd_media WHERE module_id IN (?) ORDER BY id", [ids]) : [];

    return res.json({
        success: true,
        modules: modules.map((m) => ({
            id: m.id, title: m.title, description: m.description || "", highlights: m.highlights || "",
            durationMin: m.duration_min, mandatory: !!m.mandatory, allowDownload: !!m.allow_download,
            status: m.status, sortOrder: m.sort_order, passMark: m.pass_mark, examMinutes: m.exam_minutes,
            videoUrl: m.video_url || "", questionCount: Number(m.question_count),
            media: media.filter((x) => x.module_id === m.id).map((x) => shapeMedia(x, true)),
        })),
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
         status, sort_order, pass_mark, exam_minutes, video_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [programId, b.title, b.description, b.highlights, b.durationMin, b.mandatory, b.allowDownload, b.status, n, b.passMark, b.examMinutes, b.videoUrl || null]
    );
    return res.status(201).json({ success: true, id: r.insertId });
});

const updateModule = wrap(async (req, res) => {
    const id = int(req.params.id);
    const b = moduleBody(req.body);
    if (!id || !b) return bad(res, "Invalid module");
    if (b.error) return bad(res, b.error);
    await db.query(
        `UPDATE lnd_modules SET title=?, description=?, highlights=?, duration_min=?, mandatory=?, allow_download=?,
         status=?, pass_mark=?, exam_minutes=?, video_url=? WHERE id=?`,
        [b.title, b.description, b.highlights, b.durationMin, b.mandatory, b.allowDownload, b.status, b.passMark, b.examMinutes, b.videoUrl || null, id]
    );
    return res.json({ success: true });
});

const reorderModules = wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(int).filter(Boolean).slice(0, 200) : [];
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
    if (rows.length) await db.query("INSERT INTO lnd_questions (module_id, question, options, correct_index, explanation, sort_order) VALUES ?", [rows]);
    return res.json({ success: true, count: rows.length });
});

const lookups = wrap(async (req, res) => {
    const [designations, stores, users] = await Promise.all([
        db.query("SELECT id, designation_name AS name FROM designations ORDER BY designation_name"),
        db.query("SELECT id, store_name AS name FROM stores ORDER BY store_name"),
        db.query("SELECT id, name, email FROM users WHERE status = 'Active' ORDER BY name"),
    ]);
    return res.json({ success: true, designations, stores, users });
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
        const r = await db.query("INSERT INTO lnd_programs (title, description, audience, created_by) VALUES (?,?,?,?)",
            [p.title, p.description, p.audience, req.user.id]);
        let order = 1;
        for (const m of p.modules) {
            const mr = await db.query(
                `INSERT INTO lnd_modules (program_id, title, description, highlights, duration_min, sort_order)
                 VALUES (?,?,?,?,?,?)`, [r.insertId, m.title, m.description, m.highlights, m.minutes, order++]);
            const qs = m.questions.map((q, i) => [mr.insertId, q.question, JSON.stringify(q.options), q.correct, q.explanation, i]);
            if (qs.length) await db.query("INSERT INTO lnd_questions (module_id, question, options, correct_index, explanation, sort_order) VALUES ?", [qs]);
        }
    }
    return res.json({ success: true, message: "Starter programs created from the L&D deck." });
});

module.exports = {
    overview, programDetail, moduleDetail, markComplete, examStart, examSubmit, certificate, myCertificates, streamMedia,
    adminPrograms, createProgram, updateProgram, deleteProgram, saveAssignments, setProgramThumb, adminProgram,
    createModule, updateModule, reorderModules, deleteModule, uploadModuleMedia, deleteMedia,
    getQuestions, saveQuestions, lookups, report, reportCertificate, updateReportProgress, deleteReportProgress, seed,
};
