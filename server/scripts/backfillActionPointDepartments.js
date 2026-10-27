#!/usr/bin/env node
// ======================================================================
// BACKFILL action_points.department_id FROM THE QUESTION'S DEPARTMENTS
// ======================================================================
//
// WHY
//   Before the department fix, checklist-generated Action Points were
//   saved with department_id = NULL (the inspection engine read the
//   department from the Issue Control rule, which never carries one).
//   The Action Points page now resolves those rows through
//   question_departments at read time, so this backfill is OPTIONAL —
//   it only makes the stored column correct as well (Filter Access
//   scope, exports, search by department name).
//
// RULE (same as new submissions — inspectionService.buildActionPointData)
//   department_id = the LOWEST department_id configured for the
//   Action Point's question in question_departments.
//
// SAFETY
//   * Only rows with department_id IS NULL AND question_id IS NOT NULL
//     whose question HAS at least one department are touched.
//   * Rows with a department already set are never changed.
//   * Rows with no question, or a question with no department, are
//     reported and left NULL — no department is ever guessed.
//   * --apply first copies every affected row (id, old department_id,
//     new department_id) into action_points_department_backfill_log.
//   * Re-running is safe: already-filled rows no longer match.
//   * The question's CURRENT department mapping is used (there is no
//     historical mapping table). Review the dry-run output first.
//
// USAGE (from the server/ folder, with the normal .env)
//   node scripts/backfillActionPointDepartments.js            # dry run
//   node scripts/backfillActionPointDepartments.js --apply    # write
//
// ROLLBACK
//   UPDATE action_points ap
//   INNER JOIN action_points_department_backfill_log l ON l.action_point_id = ap.id
//   SET ap.department_id = l.old_department_id
//   WHERE ap.department_id = l.new_department_id;
// ======================================================================

const db = require("../config/db");

const APPLY = process.argv.includes("--apply");

const RESOLVABLE_SQL = `
    SELECT
        ap.id AS action_point_id,
        ap.department_id AS old_department_id,
        qd.department_id AS new_department_id
    FROM action_points ap
    INNER JOIN (
        SELECT question_id, MIN(department_id) AS department_id
        FROM question_departments
        WHERE department_id IS NOT NULL
        GROUP BY question_id
    ) qd ON qd.question_id = ap.question_id
    INNER JOIN departments d ON d.id = qd.department_id
    WHERE ap.department_id IS NULL
      AND ap.question_id IS NOT NULL
`;

const main = async () => {
    const [totals] = await db.query(`
        SELECT
            COUNT(*) AS total,
            SUM(ap.department_id IS NULL) AS null_department,
            SUM(ap.department_id IS NULL AND ap.question_id IS NULL) AS null_no_question
        FROM action_points ap
    `);

    const resolvable = await db.query(RESOLVABLE_SQL);

    const [unresolvable] = await db.query(`
        SELECT COUNT(*) AS c
        FROM action_points ap
        WHERE ap.department_id IS NULL
          AND ap.question_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM question_departments qd
              INNER JOIN departments d ON d.id = qd.department_id
              WHERE qd.question_id = ap.question_id
          )
    `);

    const byDepartment = await db.query(`
        SELECT d.department_name, COUNT(*) AS rows_to_fill
        FROM (${RESOLVABLE_SQL}) r
        INNER JOIN departments d ON d.id = r.new_department_id
        GROUP BY d.department_name
        ORDER BY rows_to_fill DESC
    `);

    console.log("Action Points total ..................", Number(totals.total || 0));
    console.log("department_id NULL ...................", Number(totals.null_department || 0));
    console.log("  resolvable from question mapping ...", resolvable.length);
    console.log("  question has no department (kept) ..", Number(unresolvable.c || 0));
    console.log("  no question link (kept NULL) .......", Number(totals.null_no_question || 0));
    console.table(byDepartment);
    console.log("Sample:", resolvable.slice(0, 10));

    if (!APPLY) {
        console.log("\nDry run only. Re-run with --apply to write (back up the database first).");
        return;
    }

    if (!resolvable.length) {
        console.log("Nothing to backfill.");
        return;
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS action_points_department_backfill_log (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            action_point_id INT NOT NULL,
            old_department_id INT NULL,
            new_department_id INT NOT NULL,
            backfilled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_apdbl_action_point (action_point_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`
            INSERT INTO action_points_department_backfill_log
                (action_point_id, old_department_id, new_department_id)
            SELECT action_point_id, old_department_id, new_department_id
            FROM (${RESOLVABLE_SQL}) r
        `);

        const [result] = await connection.query(`
            UPDATE action_points ap
            INNER JOIN (
                SELECT question_id, MIN(department_id) AS department_id
                FROM question_departments
                WHERE department_id IS NOT NULL
                GROUP BY question_id
            ) qd ON qd.question_id = ap.question_id
            INNER JOIN departments d ON d.id = qd.department_id
            SET ap.department_id = qd.department_id
            WHERE ap.department_id IS NULL
              AND ap.question_id IS NOT NULL
        `);

        await connection.commit();
        console.log(`\nBackfilled ${result.affectedRows} Action Point(s). Log: action_points_department_backfill_log`);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

main()
    .catch((error) => {
        console.error("Backfill failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => db.closePool());
