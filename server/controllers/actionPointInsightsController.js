const db = require("../config/db");
const { reclassify } = require("../services/actionPointReclassifyService");

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

        const rows = await db.query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'Open')) = 'open' THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'')) = 'in progress' THEN 1 ELSE 0 END) AS in_progress_count,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'')) = 'closed' THEN 1 ELSE 0 END) AS closed_count,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'Open')) <> 'closed'
                          AND ap.priority IN ('High','Critical') THEN 1 ELSE 0 END) AS high_priority_count,
                SUM(CASE WHEN LOWER(COALESCE(ap.status,'Open')) <> 'closed'
                          AND COALESCE(ap.sla_minutes, 0) > 0
                          AND DATE_ADD(ap.created_at, INTERVAL ap.sla_minutes MINUTE) < NOW()
                         THEN 1 ELSE 0 END) AS overdue_count
            FROM action_points ap
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
                overdue: Number(r.overdue_count || 0)
            }
        });
    } catch (error) {
        console.error("ACTION POINT SUMMARY ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load Action Point summary." });
    }
};

// ======================================================
// POST /api/action-points/reclassify
// body: { dryRun: true|false, store_id?, start_date?, end_date? }
//
// Re-checks existing checklist answers with the polarity-aware
// classifier: removes wrongly created OPEN Action Points (answer is
// fine → Checklist Reports) and raises missing ones (answer reports a
// problem → Action Points).
// ======================================================
exports.reclassifyActionPoints = async (req, res) => {
    try {
        const body = req.body || {};
        const dryRun = !(body.dryRun === false || body.dryRun === "false" || body.apply === true);

        const summary = await reclassify({
            dryRun,
            userId: req.user?.id || null,
            filters: {
                store_id: body.store_id || null,
                start_date: body.start_date || null,
                end_date: body.end_date || null,
                submission_id: body.submission_id || null
            }
        });

        return res.json({
            success: true,
            data: summary,
            message: dryRun
                ? "Preview ready."
                : `Re-check complete: ${summary.removed_action_points} moved to Checklist Reports, ${summary.created_action_points} new Action Point(s) raised.`
        });
    } catch (error) {
        console.error("ACTION POINT RECLASSIFY ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to re-check checklist answers.", error: error.message });
    }
};
