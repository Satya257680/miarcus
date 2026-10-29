const db = require("../config/db");
const ActionPoint = require("../models/actionPointModel");
const { reclassify, preview: previewRecheck, apply: applyRecheck } = require("../services/actionPointReclassifyService");
const recheckJobs = require("../utils/bulkImportJobManager");
const { buildScopeSql } = require("../utils/filterAccess");

// ======================================================
// GET /api/action-points/summary
// KPI numbers for the premium Action Points header.
// ======================================================
exports.getActionPointSummary = async (req, res) => {
    try {
        const params = [];
        let where = "WHERE 1=1";

        if (req.query.store_id) {
            where += " AND ap.store_id = ?";
            params.push(Number(req.query.store_id));
        }

        // KPI cards count only what the user's Filter Access allows.
        const scope = buildScopeSql(req.filterScope);
        if (scope.sql) {
            where += ` AND ${scope.sql}`;
            params.push(...scope.params);
        }

        // Same SLA rule as the list's view=overdue filter and the live
        // countdown in the table (sla_minutes, else legacy sla_value days).
        const SLA_MIN = ActionPoint.AP_SLA_MINUTES_SQL;

        // Rows the Action Points list shows (every Completed / Closed
        // Action Point moves to Completed Action Points) – used for
        // "Total" and "Today" so the card count equals the records shown
        // when it is clicked.
        const VISIBLE = ActionPoint.ACTIVE_ONLY_SQL;

        const rows = await db.query(`
            SELECT
                SUM(CASE WHEN ${VISIBLE} THEN 1 ELSE 0 END) AS total,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'Open')) = 'open' THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'')) = 'in progress' THEN 1 ELSE 0 END) AS in_progress_count,
                -- "Completed" card = what Completed Action Points lists
                -- (archived completed records are excluded).
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'')) = 'closed'
                          AND ap.completed_archived_at IS NULL THEN 1 ELSE 0 END) AS closed_count,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'Open')) <> 'closed'
                          AND ap.priority IN ('High','Critical') THEN 1 ELSE 0 END) AS high_priority_count,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'Open')) <> 'closed'
                          AND ${SLA_MIN} > 0
                          AND DATE_ADD(ap.created_at, INTERVAL ${SLA_MIN} MINUTE) <= NOW()
                         THEN 1 ELSE 0 END) AS overdue_count,
                SUM(CASE WHEN DATE(ap.created_at) = CURDATE() AND ${VISIBLE}
                         THEN 1 ELSE 0 END) AS today_count
            FROM action_points ap
            INNER JOIN stores s ON s.id = ap.store_id
            ${where}
        `, params);

        const r = rows?.[0] || {};
        return res.json({
            success: true,
            data: {
                total: Number(r.total || 0),
                open: Number(r.open_count || 0),
                in_progress: Number(r.in_progress_count || 0),
                closed: Number(r.closed_count || 0),
                high_priority: Number(r.high_priority_count || 0),
                overdue: Number(r.overdue_count || 0),
                today: Number(r.today_count || 0)
            }
        });
    } catch (error) {
        console.error("ACTION POINT SUMMARY ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load Action Point summary." });
    }
};

// ======================================================
// POST /api/action-points/reclassify
// body: {
//   dryRun: true|false,
//   async: true            -> run as a background job (recommended;
//                              large data never hits the HTTP timeout)
//   include_missing, from_date, to_date, store_id
// }
//
// Reconciles existing Action Points with the ACTIVE Issue Control
// Center rules (see services/actionPointReclassifyService.js).
// Preview never writes. Apply writes in small transactional batches.
// ======================================================
const recheckOptions = (body = {}) => ({
    include_missing: body.include_missing === true || body.include_missing === "true",
    from_date: body.from_date || body.start_date || null,
    to_date: body.to_date || body.end_date || null,
    store_id: body.store_id || null
});

exports.reclassifyActionPoints = async (req, res) => {
    const body = req.body || {};
    const dryRun = !(body.dryRun === false || body.dryRun === "false" || body.apply === true);
    const options = recheckOptions(body);
    const userId = req.user?.id || null;

    // ---------- background job (used by the Re-check dialog) ----------
    if (body.async === true || body.async === "true") {
        const job = recheckJobs.createJob(dryRun ? "action-point-recheck-preview" : "action-point-recheck-apply", userId, { originalname: "Re-check" });
        recheckJobs.updateJob(job.id, {
            status: "running",
            startedAt: new Date().toISOString(),
            message: dryRun ? "Preparing preview…" : "Applying re-check…",
            phase: dryRun ? "Preparing preview…" : "Applying re-check…",
            result: null
        });

        const onProgress = (p = {}) => {
            const patch = {};
            if (p.phase) { patch.phase = p.phase; patch.message = p.phase; }
            if (Number.isFinite(p.total)) patch.total = p.total;
            if (Number.isFinite(p.processed)) patch.processed = p.processed;
            recheckJobs.updateJob(job.id, patch);
        };

        setImmediate(async () => {
            try {
                const result = dryRun
                    ? await previewRecheck(options, onProgress)
                    : await applyRecheck(options, { userId, onProgress });
                const failed = !dryRun && result.errors && result.errors.length > 0;
                recheckJobs.finishJob(job.id, {
                    status: failed ? "failed" : "completed",
                    success: !failed,
                    message: failed
                        ? `Re-check stopped: ${result.errors[0].message}`
                        : (dryRun ? "Preview ready." : "Re-check applied."),
                    result
                });
            } catch (error) {
                console.error("ACTION POINT RECHECK JOB ERROR:", error);
                recheckJobs.finishJob(job.id, {
                    status: "failed",
                    success: false,
                    message: error.message || "Re-check failed.",
                    result: null
                });
            }
        });

        return res.status(202).json({
            success: true,
            processing: true,
            jobId: job.id,
            statusUrl: `/api/action-points/reclassify/status/${job.id}`
        });
    }

    // ---------- synchronous (backwards compatible) ----------
    try {
        const summary = dryRun
            ? await previewRecheck(options)
            : await applyRecheck(options, { userId });

        const failed = !dryRun && summary.errors && summary.errors.length > 0;
        return res.status(failed ? 500 : 200).json({
            success: !failed,
            data: summary,
            message: dryRun
                ? "Preview ready."
                : failed
                    ? `Re-check stopped: ${summary.errors[0].message}`
                    : `Re-check applied: ${summary.applied.moved} moved to Checklist Reports, ${summary.applied.created} Action Point(s) created.`
        });
    } catch (error) {
        console.error("ACTION POINT RECLASSIFY ERROR:", error);
        return res.status(error.status || 500).json({ success: false, message: error.message || "Unable to re-check checklist answers." });
    }
};

// GET /api/action-points/reclassify/status/:jobId
exports.getReclassifyStatus = (req, res) => {
    const job = recheckJobs.getJob(req.params.jobId, req.user?.id);
    if (!job || !String(job.type || "").startsWith("action-point-recheck")) {
        return res.status(404).json({ success: false, message: "Re-check job was not found or has expired." });
    }
    return res.json({
        success: true,
        job: {
            id: job.id,
            type: job.type,
            status: job.status,
            success: Boolean(job.success),
            message: job.message,
            phase: job.phase || job.message,
            total: Number(job.total) || 0,
            processed: Number(job.processed) || 0,
            startedAt: job.startedAt,
            finishedAt: job.finishedAt
        },
        result: job.result || null
    });
};
