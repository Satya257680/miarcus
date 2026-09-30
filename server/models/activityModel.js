const db = require("../config/db");

const Activity = {};

// ======================================================
// GET ALL ACTIVITIES
// SEARCH + FILTER + PAGINATION
// ======================================================

// ======================================================
// SHARED FILTER BUILDER
// Used by the list, the count and "Delete Filtered", so all
// three always work on exactly the same set of records.
// Expects the query to alias activities as "a" and users
// (creator) as "u".
// ======================================================

const buildActivityWhere = (filters = {}, user) => {


    // --------------------------------------------------
    // WHERE clause is built ONCE and shared by the list
    // query and the count query, so the total (and the
    // "Page X of Y" pager) always matches the rows.
    // --------------------------------------------------
    const where = ["a.module_name <> 'Employee Location'"];
    const params = [];

    // RBAC - admin sees all, others see own / assigned
    if (!user || !user.is_admin) {
        where.push("(a.created_by = ? OR a.assigned_to = ?)");
        params.push(user?.id || 0, user?.id || 0);
    }

    const text = (value) => String(value ?? "").trim();

    const search = text(filters.search);
    if (search) {
        const like = `%${search}%`;
        where.push(`(
            a.title LIKE ?
            OR a.description LIKE ?
            OR a.module_name LIKE ?
            OR a.activity_type LIKE ?
            OR u.name LIKE ?
            OR CAST(a.id AS CHAR) = ?
        )`);
        params.push(like, like, like, like, like, search);
    }

    // Case / whitespace insensitive matching so values such as
    // "open", "Open " or "OPEN" stored by older modules still match.
    const exact = (column, value) => {
        const v = text(value);
        if (!v) return;
        where.push(`LOWER(TRIM(${column})) = LOWER(?)`);
        params.push(v);
    };

    exact("a.module_name", filters.module_name);
    exact("a.activity_type", filters.activity_type);
    exact("a.status", filters.status);
    exact("a.priority", filters.priority);

    const action = text(filters.action);
    if (action) {
        where.push("(a.title LIKE ? OR a.description LIKE ?)");
        params.push(`%${action}%`, `%${action}%`);
    }

    const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(text(value));

    if (isDate(filters.date_from)) {
        where.push("a.created_at >= ?");
        params.push(`${text(filters.date_from)} 00:00:00`);
    }

    if (isDate(filters.date_to)) {
        where.push("a.created_at <= ?");
        params.push(`${text(filters.date_to)} 23:59:59`);
    }

    const nsoId = Number(filters.new_store_opening_id);
    if (Number.isInteger(nsoId) && nsoId > 0) {
        where.push("a.module_name = 'New Store Openings' AND a.reference_id = ?");
        params.push(nsoId);
    }

    return { whereSql: `WHERE ${where.join("\n          AND ")}`, params };
};

Activity.getAll = (filters, user, callback) => {

    const { whereSql, params } = buildActivityWhere(filters, user);


    const joins = `
        LEFT JOIN new_store_openings nso
            ON a.module_name = 'New Store Openings'
            AND nso.id = a.reference_id
        LEFT JOIN users u
            ON a.created_by = u.id
        LEFT JOIN users au
            ON a.assigned_to = au.id
    `;

    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 10, 1), 200);
    const offset = (page - 1) * limit;

    const listSql = `
        SELECT
            a.*,
            u.name AS created_by_name,
            au.name AS assigned_to_name,
            CASE WHEN a.module_name = 'New Store Openings' AND a.reference_id > 0 THEN nso.location ELSE NULL END AS nso_location,
            CASE WHEN a.module_name = 'New Store Openings' AND a.reference_id > 0 THEN nso.city ELSE NULL END AS nso_city,
            CASE WHEN a.module_name = 'New Store Openings' AND a.reference_id > 0 THEN nso.status ELSE NULL END AS nso_status
        FROM activities a
        ${joins}
        ${whereSql}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const countSql = `
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN DATE(a.created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS today,
            COALESCE(SUM(CASE WHEN LOWER(a.priority) IN ('high', 'critical') THEN 1 ELSE 0 END), 0) AS high_count,
            COALESCE(SUM(CASE WHEN LOWER(a.status) IN ('open', 'in progress', 'pending') THEN 1 ELSE 0 END), 0) AS open_count
        FROM activities a
        ${joins}
        ${whereSql}
    `;

    db.query(countSql, params, (countErr, countRows) => {
        if (countErr) {
            console.error("ACTIVITY COUNT ERROR:", countErr.message);
        }

        db.query(listSql, params, (err, rows) => {
            if (err) return callback(err);

            const list = rows || [];
            const c = countErr ? {} : (countRows?.[0] || {});

            // If the count ever fails, still let the pager move forward
            // when this page is full.
            const total = countErr
                ? offset + list.length + (list.length === limit ? 1 : 0)
                : Number(c.total || 0);

            // Sl. No. = position counted from the OLDEST matching record,
            // so the first activity logged after a Delete All is #1.
            const data = list.map((row, index) => ({
                ...row,
                sl_no: Math.max(total - offset - index, 1)
            }));

            const summary = {
                total,
                today: Number(c.today || 0),
                high_priority: Number(c.high_count || 0),
                open: Number(c.open_count || 0)
            };

            callback(null, data, {
                total,
                page,
                limit,
                total_pages: Math.max(Math.ceil(total / limit), 1),
                has_more: offset + list.length < total,
                summary
            });
        });
    });

};

// ======================================================
// FILTER OPTIONS (distinct values actually stored)
// ======================================================

Activity.getFilterOptions = async (user) => {
    const where = ["module_name <> 'Employee Location'"];
    const params = [];

    if (!user || !user.is_admin) {
        where.push("(created_by = ? OR assigned_to = ?)");
        params.push(user?.id || 0, user?.id || 0);
    }

    const distinct = async (column) => {
        const rows = await db.query(
            `SELECT DISTINCT TRIM(${column}) AS value
             FROM activities
             WHERE ${where.join(" AND ")}
               AND ${column} IS NOT NULL
               AND TRIM(${column}) <> ''
             ORDER BY value ASC
             LIMIT 200`,
            params
        );
        return (rows || []).map((row) => String(row.value));
    };

    const [modules, activityTypes, statuses, priorities] = await Promise.all([
        distinct("module_name"),
        distinct("activity_type"),
        distinct("status"),
        distinct("priority")
    ]);

    return { modules, activity_types: activityTypes, statuses, priorities };
};

// ======================================================
// GET ACTIVITY BY ID (RBAC)
// ======================================================

Activity.getById = (activityId, user, callback) => {

    let sql = `
        SELECT
            a.*,
            u.name AS created_by_name,
            au.name AS assigned_to_name,
            CASE
                WHEN a.module_name = 'New Store Openings' AND a.reference_id > 0 THEN nso.location
                ELSE NULL
            END AS nso_location,
            CASE
                WHEN a.module_name = 'New Store Openings' AND a.reference_id > 0 THEN nso.city
                ELSE NULL
            END AS nso_city,
            CASE
                WHEN a.module_name = 'New Store Openings' AND a.reference_id > 0 THEN nso.status
                ELSE NULL
            END AS nso_status
        FROM activities a
        LEFT JOIN new_store_openings nso
            ON a.module_name = 'New Store Openings'
            AND nso.id = a.reference_id
        LEFT JOIN users u
            ON a.created_by = u.id
        LEFT JOIN users au
            ON a.assigned_to = au.id
        WHERE a.id = ?
          AND a.module_name <> 'Employee Location'
    `;

    const params = [activityId];

    // ======================================================
    // RBAC
    // ======================================================

    if (!user.is_admin) {

        sql += `
            AND (
                a.created_by = ?
                OR a.assigned_to = ?
            )
        `;

        params.push(user.id, user.id);

    }

    db.query(sql, params, callback);

};

// ======================================================
// GET ACTIVITY DETAILS (RBAC)
// ======================================================

Activity.getDetails = (activityId, user, callback) => {

    let sql = `
        SELECT

            a.*,

            creator.employee_id AS created_by_employee_id,
            creator.name AS created_by_name,
            creator.email AS created_by_email,

            assignee.employee_id AS assigned_employee_id,
            assignee.name AS assigned_to_name,
            assignee.email AS assigned_to_email,
            assignee.call_contact AS phone,

            d.department_name,

            des.designation_name,

            nso.location AS nso_location,
            nso.city AS nso_city,
            nso.status AS nso_status

        FROM activities a

        LEFT JOIN new_store_openings nso
            ON a.module_name = 'New Store Openings' AND nso.id = a.reference_id

        LEFT JOIN users creator
            ON creator.id = a.created_by

        LEFT JOIN users assignee
            ON assignee.id = a.assigned_to

        LEFT JOIN departments d
            ON d.id = assignee.department_id

        LEFT JOIN designations des
            ON des.id = assignee.designation_id

        WHERE a.id = ?
          AND a.module_name <> 'Employee Location'
    `;

    const params = [activityId];

    // ======================================================
    // RBAC
    // ======================================================

    if (!user.is_admin) {

        sql += `
            AND (
                a.created_by = ?
                OR a.assigned_to = ?
            )
        `;

        params.push(user.id, user.id);

    }

    db.query(sql, params, callback);

};
// ======================================================
// GET ACTIVITY COMMENTS
// ======================================================

Activity.getComments = (activityId, callback) => {

    const sql = `
        SELECT

            ac.*,

            u.name

        FROM activity_comments ac

        LEFT JOIN users u
            ON u.id = ac.user_id

        WHERE ac.activity_id = ?

        ORDER BY ac.created_at ASC
    `;

    db.query(sql, [activityId], callback);

};

// ======================================================
// GET ACTIVITY FILES
// ======================================================

Activity.getFiles = (activityId, callback) => {

    const sql = `
        SELECT *

        FROM activity_files

        WHERE activity_id = ?
    `;

    db.query(sql, [activityId], callback);

};

// ======================================================
// GET ACTIVITY NOTIFICATIONS
// ======================================================

Activity.getNotifications = (activityId, callback) => {

    const sql = `
        SELECT *

        FROM activity_notifications

        WHERE activity_id = ?

        ORDER BY created_at DESC
    `;

    db.query(sql, [activityId], callback);

};

// ======================================================
// GET ACTIVITY MENTIONS
// ======================================================

Activity.getMentions = (activityId, callback) => {

    const sql = `
        SELECT

            am.*,

            u.name

        FROM activity_mentions am

        LEFT JOIN users u
            ON u.id = am.mentioned_user_id

        WHERE am.activity_id = ?
    `;

    db.query(sql, [activityId], callback);

};
// ======================================================
// GET ACTIVITY TIMELINE
// ======================================================

Activity.getTimeline = (activityId, callback) => {

    const sql = `
        SELECT

            t.id,

            t.activity_id,

            t.event_type,

            t.event_description,

            t.created_at,

            u.id AS user_id,

            u.employee_id,

            u.name,

            u.email

        FROM activity_timeline t

        LEFT JOIN users u
            ON u.id = t.created_by

        WHERE t.activity_id = ?

        ORDER BY t.created_at ASC
    `;

    db.query(sql, [activityId], callback);

};
// ======================================================
// ADD ACTIVITY COMMENT
// ======================================================

Activity.addComment = (activityId, userId, comment, callback) => {

    const sql = `
        INSERT INTO activity_comments (

            activity_id,

            user_id,

            comment

        )
        VALUES (?, ?, ?)
    `;

    db.query(

        sql,

        [

            activityId,

            userId,

            comment

        ],

        callback

    );

};
// ======================================================
// UPLOAD ACTIVITY FILE
// ======================================================

Activity.uploadFile = (

    activityId,

    uploadedBy,

    fileName,

    filePath,

    callback

) => {

    const sql = `
        INSERT INTO activity_files (

            activity_id,

            uploaded_by,

            file_name,

            file_path

        )
        VALUES (?, ?, ?, ?)
    `;

    db.query(

        sql,

        [

            activityId,

            uploadedBy,

            fileName,

            filePath

        ],

        callback

    );

};

// ======================================================
// DELETE ACTIVITY FILE
// ======================================================

Activity.deleteFile = (

    fileId,

    callback

) => {

    const sql = `
        DELETE
        FROM activity_files
        WHERE id = ?
    `;

    db.query(

        sql,

        [fileId],

        callback

    );

};
// ======================================================
// CHECK ACTIVITY ACCESS (RBAC)
// ======================================================

Activity.hasAccess = (activityId, user, callback) => {

    let sql = `
        SELECT id
        FROM activities
        WHERE id = ?
          AND module_name <> 'Employee Location'
    `;

    const params = [activityId];

    // ======================================================
    // NORMAL USER
    // ======================================================

    if (!user.is_admin) {

        sql += `
            AND (
                created_by = ?
                OR assigned_to = ?
            )
        `;

        params.push(user.id, user.id);

    }

    db.query(sql, params, (err, results) => {

        if (err) {

            return callback(err);

        }

        callback(null, results.length > 0);

    });

};
// ======================================================
// GET ACTIVITY ID BY FILE ID
// ======================================================

Activity.getActivityIdByFileId = (fileId, callback) => {

    const sql = `
        SELECT activity_id
        FROM activity_files
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [fileId], callback);

};
// ======================================================
// CREATE ACTIVITY
// ======================================================

Activity.create = (

    data,

    callback

) => {


    const sql = `

        INSERT INTO activities

        (

            title,

            description,

            module_name,

            activity_type,

            status,

            priority,

            created_by,

            assigned_to

        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?)

    `;


    db.query(

        sql,

        [

            data.title,

            data.description,

            data.module_name,

            data.activity_type || "General Activity",

            data.status || "Open",

            data.priority || "Medium",

            data.created_by,

            data.assigned_to || null

        ],

        callback

    );


};
// ======================================================
// ACTIVITY CENTER SUPPORT TABLES
// ======================================================

Activity.ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS activity_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            activity_id BIGINT NOT NULL,
            sender_id INT NOT NULL,
            receiver_id INT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (id),
            KEY idx_activity_messages_activity (activity_id),
            KEY idx_activity_messages_sender (sender_id),
            KEY idx_activity_messages_receiver (receiver_id),
            KEY idx_activity_messages_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

// ======================================================
// ACTIVITY MESSAGES / CHAT
// ======================================================

Activity.getMessages = (activityId, user, callback) => {
    Activity.hasAccess(activityId, user, (accessErr, allowed) => {
        if (accessErr) return callback(accessErr);
        if (!allowed) return callback(null, []);

        const sql = `
            SELECT
                m.id,
                m.activity_id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.created_at,
                m.read_at,
                u.name AS sender_name,
                u.email AS sender_email
            FROM activity_messages m
            LEFT JOIN users u ON u.id = m.sender_id
            WHERE m.activity_id = ?
            ORDER BY m.created_at ASC, m.id ASC
        `;
        db.query(sql, [activityId], callback);
    });
};

Activity.addMessage = (activityId, senderId, receiverId, message, callback) => {
    const sql = `
        INSERT INTO activity_messages
        (activity_id, sender_id, receiver_id, message)
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [activityId, senderId, receiverId || null, message], callback);
};

Activity.markMessagesRead = (activityId, userId, callback) => {
    const sql = `
        UPDATE activity_messages
        SET read_at = CURRENT_TIMESTAMP
        WHERE activity_id = ?
          AND receiver_id = ?
          AND read_at IS NULL
    `;
    db.query(sql, [activityId, userId], callback);
};

// ======================================================
// DELETE ACTIVITY
// ======================================================

Activity.deleteById = (activityId, user, callback) => {
    Activity.hasAccess(activityId, user, (accessErr, allowed) => {
        if (accessErr) return callback(accessErr);
        if (!allowed) return callback(null, { forbidden: true });

        const id = Number(activityId);
        const queries = [
            ["DELETE FROM activity_messages WHERE activity_id = ?", [id]],
            ["DELETE FROM activity_comments WHERE activity_id = ?", [id]],
            ["DELETE FROM activity_files WHERE activity_id = ?", [id]],
            ["DELETE FROM activity_mentions WHERE activity_id = ?", [id]],
            ["DELETE FROM activity_notifications WHERE activity_id = ?", [id]],
            ["DELETE FROM activity_timeline WHERE activity_id = ?", [id]],
            ["DELETE FROM activities WHERE id = ?", [id]],
        ];

        const run = (index) => {
            if (index >= queries.length) return callback(null, { forbidden: false });
            db.query(queries[index][0], queries[index][1], (err) => {
                if (err) return callback(err);
                run(index + 1);
            });
        };
        run(0);
    });
};

Activity.deleteAll = (filters, user, callback) => {
    const { whereSql, params } = buildActivityWhere(filters, user);

    // Delete child rows first so installations without cascading foreign keys
    // behave consistently.
    const selectSql = `
        SELECT a.id
        FROM activities a
        LEFT JOIN users u ON a.created_by = u.id
        ${whereSql}
    `;
    db.query(selectSql, params, (selectErr, rows) => {
        if (selectErr) return callback(selectErr);
        const ids = rows.map((row) => Number(row.id)).filter(Boolean);
        if (!ids.length) return callback(null, { deleted: 0 });

        const placeholders = ids.map(() => "?").join(",");
        const children = [
            `DELETE FROM activity_messages WHERE activity_id IN (${placeholders})`,
            `DELETE FROM activity_comments WHERE activity_id IN (${placeholders})`,
            `DELETE FROM activity_files WHERE activity_id IN (${placeholders})`,
            `DELETE FROM activity_mentions WHERE activity_id IN (${placeholders})`,
            `DELETE FROM activity_notifications WHERE activity_id IN (${placeholders})`,
            `DELETE FROM activity_timeline WHERE activity_id IN (${placeholders})`,
            `DELETE FROM activities WHERE id IN (${placeholders})`,
        ];

        const run = (index) => {
            if (index >= children.length) {
                // Reset the counter so fresh records start from 1 again.
                // MySQL automatically clamps this to MAX(id) + 1, so it is
                // always safe even when some rows remain.
                const resetSql = [
                    "activities",
                    "activity_messages",
                    "activity_comments",
                    "activity_files",
                    "activity_mentions",
                    "activity_notifications",
                    "activity_timeline",
                ].map((table) => `ALTER TABLE ${table} AUTO_INCREMENT = 1`);

                const reset = (i) => {
                    if (i >= resetSql.length) return callback(null, { deleted: ids.length });
                    db.query(resetSql[i], [], () => reset(i + 1));
                };
                return reset(0);
            }
            db.query(children[index], ids, (err) => {
                if (err) return callback(err);
                run(index + 1);
            });
        };
        run(0);
    });
};

module.exports = Activity;