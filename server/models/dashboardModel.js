const db = require("../config/db");


const Dashboard = {};




// ======================================================
// GET DASHBOARD STATISTICS
// ======================================================


Dashboard.getStats = (callback) => {


    const sql = `


    SELECT



        (

            SELECT COUNT(*)

            FROM users

        ) AS totalUsers,




        (

            SELECT COUNT(*)

            FROM stores

        ) AS totalStores,





        (

            SELECT COUNT(*)

            FROM checklist_submissions

        ) AS totalChecklists,






        (

            SELECT COUNT(*)

            FROM checklist_submission_answers

            WHERE 

                answer IS NULL

                OR answer = ''

        ) AS pendingActionPoints,







        (

            SELECT COUNT(*)

            FROM action_points

        ) AS totalActionPoints,







        (

            SELECT COUNT(*)

            FROM new_store_openings

        ) AS totalNewStoreOpenings,







        (
            SELECT COUNT(*)
            FROM nso_rules
        ) AS totalNSORules,

        (
            SELECT COUNT(*)
            FROM new_store_openings
            WHERE status = 'On Hold'
        ) AS onHoldNSO,

        (
            SELECT COUNT(*)
            FROM new_store_openings
            WHERE status = 'Ready For Opening'
        ) AS readyForOpeningNSO,

        (
            SELECT COUNT(*)
            FROM new_store_openings
            WHERE status = 'Opened'
        ) AS openedNSO,

        (
            SELECT COUNT(*)
            FROM action_points
            WHERE status IN ('Open', 'Pending', 'In Progress')
        ) AS openActionPoints,

        (
            SELECT COUNT(*)
            FROM action_points
            WHERE sla_value > 0
              AND DATE_ADD(
                    DATE(created_at),
                    INTERVAL sla_value DAY
                  ) < CURDATE()
              AND status NOT IN ('Closed', 'Completed')
        ) AS overdueActionPoints





    `;




    db.query(

        sql,

        callback

    );



};











// ======================================================
// GET RECENT ACTIVITIES
// ======================================================


Dashboard.getRecentActivities = (callback) => {

    const sql = `
        SELECT
            a.id,
            a.activity_type AS type,
            a.title,
            a.description AS activity,
            a.module_name,
            a.reference_id,
            nso.location AS nso_location,
            nso.city AS nso_city,
            nso.status AS nso_status,
            a.created_at
        FROM activities a
        LEFT JOIN new_store_openings nso
            ON a.module_name = 'New Store Openings'
            AND nso.id = a.reference_id
        WHERE a.module_name <> 'Employee Location'
        ORDER BY a.created_at DESC
        LIMIT 10
    `;

    db.query(sql, callback);

};




// ======================================================
// GET CHECKLIST SUMMARY
// ======================================================


Dashboard.getChecklistSummary = (callback)=>{


    const sql = `


    SELECT


        status,


        COUNT(*) AS total



    FROM checklist_submissions



    GROUP BY status



    `;




    db.query(

        sql,

        callback

    );


};







// ======================================================
// GET ACTION POINT SUMMARY
// ======================================================


Dashboard.getActionPointSummary = (callback)=>{


    const sql = `



    SELECT



        CASE



            WHEN answer IS NULL

            OR answer = ''


            THEN 'Pending'



            ELSE 'Completed'



        END AS status,



        COUNT(*) AS total



    FROM checklist_submission_answers



    GROUP BY status



    `;



    db.query(

        sql,

        callback

    );


};








// ======================================================
// GET NSO BUSINESS SUMMARY
// ======================================================

Dashboard.getNSOSummary = (callback) => {

    const sql = `
        SELECT
            COUNT(*) AS total,
            SUM(status = 'Planning') AS planning,
            SUM(status = 'Layout Pending') AS layout_pending,
            SUM(status = 'Approval Pending') AS approval_pending,
            SUM(status = 'Construction') AS construction,
            SUM(status = 'Training') AS training,
            SUM(status = 'Ready For Opening') AS ready_for_opening,
            SUM(status = 'Opened') AS opened,
            SUM(status = 'Completed') AS completed,
            SUM(status = 'On Hold') AS on_hold,
            SUM(status = 'Cancelled') AS cancelled
        FROM new_store_openings
    `;

    db.query(sql, callback);
};


// ======================================================
// BUSINESS ANALYTICS — ALL MODULES
// ======================================================

const ANALYTICS_MODULES = [
    { key: "dashboard", name: "Dashboard", tables: ["users", "stores", "action_points", "checklist_submissions", "new_store_openings"] },
    { key: "action-points", name: "Action Points", tables: ["action_points"] },
    { key: "announcements", name: "Announcements", tables: ["announcements", "announcement_recipients"] },
    { key: "gallery", name: "Gallery", tables: ["gallery_photos", "gallery_mobile_sessions"] },
    { key: "asset-master", name: "Asset Master", tables: ["marketing_assets", "legal_assets"] },
    { key: "attendance", name: "Attendance", tables: ["attendance_records"] },
    { key: "attendance-reports", name: "Attendance Reports", tables: ["attendance_records"] },
    { key: "employee-location", name: "Employee Location", tables: ["location_records", "location_access_logs", "location_devices"] },
    { key: "checklist-reports", name: "Checklist Reports", tables: ["checklist_submissions", "checklist_submission_answers"] },
    { key: "checklist-submit", name: "Checklist Submission", tables: ["checklist_submissions", "checklist_submission_answers"] },
    { key: "checklist-types", name: "Checklist Types", tables: ["checklist_types"] },
    { key: "questions", name: "Questions", tables: ["questions"] },
    { key: "departments", name: "Departments", tables: ["departments"] },
    { key: "designations", name: "Designations", tables: ["designations"] },
    { key: "stores", name: "Store Management", tables: ["stores"] },
    { key: "users", name: "Users", tables: ["users"] },
    { key: "reports-to", name: "Reports To", tables: ["reports_to"] },
    { key: "new-store-openings", name: "New Store Openings", tables: ["new_store_openings"] },
    { key: "nso-rules", name: "NSO Rules", tables: ["nso_rules"] },
    { key: "nso-tracking", name: "NSO Tracking", tables: ["nso_tracking"] },
    { key: "expenses", name: "Expenses", tables: ["expenses", "expense_items", "expense_checks"] },
    { key: "petty-cash", name: "Petty Cash", tables: ["petty_cash_advances", "petty_cash_deposits", "petty_cash_expenses", "petty_cash_settlements"] },
    { key: "billing", name: "Billing", tables: ["bills", "bill_items", "payments"] },
    { key: "quiz", name: "Quiz", tables: ["quizzes", "quiz_questions", "quiz_submissions", "quiz_submission_answers"] },
    { key: "listing-tracker", name: "Listing Tracker", tables: ["listing_tracker_products"] },
    { key: "activity-center", name: "Activity Center", tables: ["activities", "activity_comments", "activity_files", "activity_notifications", "activity_mentions", "activity_timeline"] },
    { key: "sales-team", name: "Sales Team", tables: ["sales_visit_plans", "sales_visit_plan_stores", "sales_visit_history", "sales_review_records"] },
    { key: "profile", name: "Profile", tables: ["users"] },
    { key: "settings", name: "Settings", tables: ["user_theme_preferences", "user_permissions"] }
];

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, "``")}\``;

const safeAnalyticsTable = (table) =>
    ANALYTICS_MODULES.some((module) => module.tables.includes(table));

const getTableColumns = async (table) => {
    if (!safeAnalyticsTable(table)) return [];

    const rows = await db.query(
        `
            SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `,
        [table]
    );

    return Array.isArray(rows) ? rows : [];
};

const firstColumn = (columns, candidates) => {
    for (const candidate of candidates) {
        const found = columns.find(
            (column) => String(column.name).toLowerCase() === candidate
        );
        if (found) return found.name;
    }
    return null;
};

const buildTrendRange = async (table, dateColumn, range = "sevenDays") => {
    if (!dateColumn) return [];

    const config = {
        sevenDays: { days: 7 },
        daily: { days: 30 },
        monthly: { months: 12 },
        yearly: { years: 5 }
    };

    if (!config[range]) return [];

    let rows = [];
    let result = [];

    if (range === "sevenDays" || range === "daily") {
        const days = config[range].days;
        rows = await db.query(
            `
                SELECT DATE(${quoteIdentifier(dateColumn)}) AS period, COUNT(*) AS total
                FROM ${quoteIdentifier(table)}
                WHERE ${quoteIdentifier(dateColumn)} >= DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)
                  AND ${quoteIdentifier(dateColumn)} < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                GROUP BY DATE(${quoteIdentifier(dateColumn)})
                ORDER BY period ASC
            `
        );

        const lookup = new Map(
            (rows || []).map((row) => [
                String(row.period).slice(0, 10),
                Number(row.total || 0)
            ])
        );

        for (let offset = days - 1; offset >= 0; offset -= 1) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - offset);
            const day = date.toISOString().slice(0, 10);
            result.push({
                period: day,
                day,
                label: date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short"
                }),
                total: lookup.get(day) || 0
            });
        }
    } else if (range === "monthly") {
        rows = await db.query(
            `
                SELECT DATE_FORMAT(${quoteIdentifier(dateColumn)}, '%Y-%m') AS period,
                       COUNT(*) AS total
                FROM ${quoteIdentifier(table)}
                WHERE ${quoteIdentifier(dateColumn)} >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
                  AND ${quoteIdentifier(dateColumn)} < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)
                GROUP BY DATE_FORMAT(${quoteIdentifier(dateColumn)}, '%Y-%m')
                ORDER BY period ASC
            `
        );

        const lookup = new Map(
            (rows || []).map((row) => [
                String(row.period).slice(0, 7),
                Number(row.total || 0)
            ])
        );

        for (let offset = 11; offset >= 0; offset -= 1) {
            const date = new Date();
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            date.setMonth(date.getMonth() - offset);
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            result.push({
                period,
                label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
                total: lookup.get(period) || 0
            });
        }
    } else if (range === "yearly") {
        rows = await db.query(
            `
                SELECT YEAR(${quoteIdentifier(dateColumn)}) AS period,
                       COUNT(*) AS total
                FROM ${quoteIdentifier(table)}
                WHERE ${quoteIdentifier(dateColumn)} >= MAKEDATE(YEAR(CURDATE()) - 4, 1)
                  AND ${quoteIdentifier(dateColumn)} < DATE_ADD(MAKEDATE(YEAR(CURDATE()), 1), INTERVAL 1 YEAR)
                GROUP BY YEAR(${quoteIdentifier(dateColumn)})
                ORDER BY period ASC
            `
        );

        const lookup = new Map(
            (rows || []).map((row) => [
                String(row.period),
                Number(row.total || 0)
            ])
        );

        const currentYear = new Date().getFullYear();
        for (let offset = 4; offset >= 0; offset -= 1) {
            const year = currentYear - offset;
            const period = String(year);
            result.push({
                period,
                label: period,
                total: lookup.get(period) || 0
            });
        }
    }

    return result;
};

const buildTrend = async (table, dateColumn) => buildTrendRange(table, dateColumn, "sevenDays");

const getTableAnalytics = async (table) => {
    try {
        const columns = await getTableColumns(table);

        if (!columns.length) {
            return null;
        }

        const countRows = await db.query(
            `SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`
        );

        const total = Number(countRows?.[0]?.total || 0);

        const statusColumn = firstColumn(columns, [
            "status",
            "approval_status",
            "payment_status",
            "approvalstatus"
        ]);

        let status = [];

        if (statusColumn) {
            const statusRows = await db.query(
                `
                    SELECT
                        COALESCE(NULLIF(TRIM(CAST(${quoteIdentifier(statusColumn)} AS CHAR)), ''), 'Unknown') AS label,
                        COUNT(*) AS total
                    FROM ${quoteIdentifier(table)}
                    GROUP BY ${quoteIdentifier(statusColumn)}
                    ORDER BY total DESC
                    LIMIT 8
                `
            );

            status = (statusRows || []).map((row) => ({
                label: String(row.label || "Unknown"),
                total: Number(row.total || 0)
            }));
        }

        if (!status.length && total > 0) {
            status = [{ label: "Records", total }];
        }

        const dateColumn = firstColumn(columns, [
            "created_at",
            "createdat",
            "updated_at",
            "updatedat",
            "date_of_issue",
            "check_in",
            "submission_date",
            "date"
        ]);

        const trendRanges = {
            sevenDays: await buildTrendRange(table, dateColumn, "sevenDays"),
            daily: await buildTrendRange(table, dateColumn, "daily"),
            monthly: await buildTrendRange(table, dateColumn, "monthly"),
            yearly: await buildTrendRange(table, dateColumn, "yearly")
        };

        const trend = trendRanges.sevenDays;

        const numericColumn = columns.find((column) =>
            ["decimal", "double", "float", "int", "bigint"].includes(
                String(column.dataType).toLowerCase()
            ) && [
                "amount",
                "total_amount",
                "grand_total",
                "rate",
                "expense_amount",
                "advance_amount"
            ].includes(String(column.name).toLowerCase())
        );

        let valueTotal = null;

        if (numericColumn) {
            const valueRows = await db.query(
                `
                    SELECT COALESCE(SUM(${quoteIdentifier(numericColumn.name)}), 0) AS total
                    FROM ${quoteIdentifier(table)}
                `
            );
            valueTotal = Number(valueRows?.[0]?.total || 0);
        }

        return {
            table,
            total,
            status,
            trend,
            trendRanges,
            valueTotal,
            dateColumn
        };
    } catch (error) {
        console.error(`ANALYTICS TABLE ERROR [${table}]:`, error.message);
        return null;
    }
};

Dashboard.getAnalytics = async (callback) => {
    try {
        const modules = [];

        for (const module of ANALYTICS_MODULES) {
            const tableResults = [];

            for (const table of module.tables) {
                const result = await getTableAnalytics(table);
                if (result) tableResults.push(result);
            }

            const total = tableResults.reduce(
                (sum, item) => sum + Number(item.total || 0),
                0
            );

            const valueTotal = tableResults.reduce(
                (sum, item) => sum + Number(item.valueTotal || 0),
                0
            );

            const statusMap = new Map();
            for (const item of tableResults) {
                for (const entry of item.status || []) {
                    statusMap.set(
                        entry.label,
                        (statusMap.get(entry.label) || 0) + Number(entry.total || 0)
                    );
                }
            }

            const aggregateTrendRange = (range) => {
                const map = new Map();
                for (const item of tableResults) {
                    for (const point of item.trendRanges?.[range] || []) {
                        const key = point.period || point.day;
                        map.set(key, (map.get(key) || 0) + Number(point.total || 0));
                    }
                }

                const template = tableResults.find((item) => item.trendRanges?.[range]?.length)?.trendRanges?.[range] || [];
                return template.map((point) => ({
                    ...point,
                    total: map.get(point.period || point.day) || 0
                }));
            };

            const trendRanges = {
                sevenDays: aggregateTrendRange("sevenDays"),
                daily: aggregateTrendRange("daily"),
                monthly: aggregateTrendRange("monthly"),
                yearly: aggregateTrendRange("yearly")
            };

            const trend = trendRanges.sevenDays;

            const previousPeriod = trend.slice(0, 3).reduce(
                (sum, point) => sum + point.total,
                0
            );
            const currentPeriod = trend.slice(-3).reduce(
                (sum, point) => sum + point.total,
                0
            );

            const change = previousPeriod === 0
                ? (currentPeriod > 0 ? 100 : 0)
                : ((currentPeriod - previousPeriod) / previousPeriod) * 100;

            modules.push({
                key: module.key,
                name: module.name,
                total,
                valueTotal,
                status: Array.from(statusMap.entries())
                    .map(([label, count]) => ({ label, total: count }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 8),
                trend,
                trendRanges,
                change: Number(change.toFixed(1)),
                direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
                tables: tableResults.map((item) => item.table)
            });
        }

        callback(null, modules);
    } catch (error) {
        callback(error);
    }
};

// ======================================================
// EXPORT MODEL
// ======================================================


module.exports = Dashboard;