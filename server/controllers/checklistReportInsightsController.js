const db = require("../config/db");

// ======================================================
// GET /api/checklist-reports/summary
// KPI numbers for the premium Checklist Reports header.
//
//   reported_answers   answers visible in Checklist Reports
//                      (no Action Point, or its Action Point is closed)
//   action_completed   answers that reached the report after an
//                      Action Point was closed
//   pending_action     answers held back in Action Points (still open)
//   submissions        checklist submissions
//   average_score      average inspection score
// ======================================================
exports.getChecklistReportSummary = async (req, res) => {
    try {
        const params = [];
        let where = "WHERE 1=1";

        if (req.query.store_id) {
            where += " AND cs.store_id = ?";
            params.push(Number(req.query.store_id));
        }
        if (req.query.checklist_type_id) {
            where += " AND cs.checklist_type_id = ?";
            params.push(Number(req.query.checklist_type_id));
        }
        if (req.query.start_date) {
            where += " AND DATE(cs.submission_date) >= ?";
            params.push(req.query.start_date);
        }
        if (req.query.end_date) {
            where += " AND DATE(cs.submission_date) <= ?";
            params.push(req.query.end_date);
        }

        const answerRows = await db.query(`
            SELECT
                COUNT(*) AS total_answers,
                SUM(CASE WHEN ap.id IS NULL THEN 1 ELSE 0 END) AS no_action_needed,
                SUM(CASE WHEN ap.id IS NOT NULL AND LOWER(COALESCE(ap.status,'Open')) = 'closed' THEN 1 ELSE 0 END) AS action_completed,
                SUM(CASE WHEN ap.id IS NOT NULL AND LOWER(COALESCE(ap.status,'Open')) <> 'closed' THEN 1 ELSE 0 END) AS pending_action
            FROM checklist_submission_answers csa
            INNER JOIN checklist_submissions cs ON cs.id = csa.submission_id
            LEFT JOIN action_points ap
                ON ap.id = (
                    SELECT ap1.id FROM action_points ap1
                    WHERE ap1.submission_answer_id = csa.id
                    ORDER BY ap1.id DESC LIMIT 1
                )
            ${where}
        `, params);

        const submissionRows = await db.query(`
            SELECT COUNT(*) AS submissions, AVG(cs.inspection_score) AS average_score
            FROM checklist_submissions cs
            ${where}
        `, params);

        const a = answerRows?.[0] || {};
        const s = submissionRows?.[0] || {};
        const noAction = Number(a.no_action_needed || 0);
        const completed = Number(a.action_completed || 0);

        return res.json({
            success: true,
            data: {
                submissions: Number(s.submissions || 0),
                average_score: s.average_score == null ? null : Number(Number(s.average_score).toFixed(1)),
                reported_answers: noAction + completed,
                no_action_needed: noAction,
                action_completed: completed,
                pending_action: Number(a.pending_action || 0)
            }
        });
    } catch (error) {
        console.error("CHECKLIST REPORT SUMMARY ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load Checklist Report summary." });
    }
};
