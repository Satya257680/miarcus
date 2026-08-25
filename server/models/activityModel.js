const db = require("../config/db");

const Activity = {};

// ======================================================
// GET ALL ACTIVITIES
// SEARCH + FILTER + PAGINATION
// ======================================================

Activity.getAll = (filters, user, callback) => {

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
        WHERE 1 = 1
          AND a.module_name <> 'Employee Location'
    `;

    const params = [];
        // ======================================================
    // RBAC - ADMIN CAN SEE ALL
    // NORMAL USER CAN SEE ONLY OWN OR ASSIGNED ACTIVITIES
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

    // ======================================================
    // SEARCH
    // ======================================================

    if (filters.search) {

        sql += `
            AND (
                a.title LIKE ?
                OR a.description LIKE ?
                OR a.module_name LIKE ?
            )
        `;

        const search = `%${filters.search}%`;

        params.push(search, search, search);

    }

    // ======================================================
    // MODULE FILTER
    // ======================================================

    if (filters.module_name) {

        sql += ` AND a.module_name = ? `;

        params.push(filters.module_name);

    }

    // ======================================================
    // STATUS FILTER
    // ======================================================

    if (filters.activity_type) {

        sql += ` AND a.activity_type = ? `;

        params.push(filters.activity_type);

    }

    if (filters.action) {
        sql += ` AND a.title LIKE ? `;
        params.push(`%${filters.action}%`);
    }

    if (filters.status) {

        sql += ` AND a.status = ? `;

        params.push(filters.status);

    }

    if (filters.date_from) {
        sql += ` AND DATE(a.created_at) >= ? `;
        params.push(filters.date_from);
    }

    if (filters.date_to) {
        sql += ` AND DATE(a.created_at) <= ? `;
        params.push(filters.date_to);
    }

    // ======================================================
    // PRIORITY FILTER
    // ======================================================

    if (filters.priority) {

        sql += ` AND a.priority = ? `;

        params.push(filters.priority);

    }

    if (filters.new_store_opening_id) {

        sql += ` AND a.module_name = 'New Store Openings' AND a.reference_id = ? `;

        params.push(filters.new_store_opening_id);

    }

    // ======================================================
    // ORDER
    // ======================================================

    sql += `
        ORDER BY a.created_at DESC
    `;

    // ======================================================
    // PAGINATION
    // ======================================================

    const page = Number(filters.page) || 1;

    const limit = Number(filters.limit) || 10;

    const offset = (page - 1) * limit;

    sql += `
        LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    db.query(sql, params, callback);

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

            status,

            priority,

            created_by,

            assigned_to

        )

        VALUES (?, ?, ?, ?, ?, ?, ?)

    `;


    db.query(

        sql,

        [

            data.title,

            data.description,

            data.module_name,

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
    let sql = `DELETE FROM activities WHERE 1 = 1 AND module_name <> 'Employee Location'`;
    const params = [];

    if (!user.is_admin) {
        sql += ` AND (created_by = ? OR assigned_to = ?)`;
        params.push(user.id, user.id);
    }

    if (filters.search) {
        sql += ` AND (title LIKE ? OR description LIKE ? OR module_name LIKE ?)`;
        const q = `%${filters.search}%`;
        params.push(q, q, q);
    }
    if (filters.module_name) {
        sql += ` AND module_name = ?`;
        params.push(filters.module_name);
    }
    if (filters.status) {
        sql += ` AND status = ?`;
        params.push(filters.status);
    }
    if (filters.priority) {
        sql += ` AND priority = ?`;
        params.push(filters.priority);
    }
    if (filters.activity_type) {
        sql += ` AND activity_type = ?`;
        params.push(filters.activity_type);
    }
    if (filters.action) {
        sql += ` AND title LIKE ?`;
        params.push(`%${filters.action}%`);
    }
    if (filters.date_from) {
        sql += ` AND DATE(created_at) >= ?`;
        params.push(filters.date_from);
    }
    if (filters.date_to) {
        sql += ` AND DATE(created_at) <= ?`;
        params.push(filters.date_to);
    }
    if (filters.new_store_opening_id) {
        sql += ` AND module_name = 'New Store Openings' AND reference_id = ?`;
        params.push(filters.new_store_opening_id);
    }

    // Delete child rows first so installations without cascading foreign keys
    // behave consistently.
    const selectSql = sql.replace(/^DELETE FROM activities/, "SELECT id FROM activities");
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
            if (index >= children.length) return callback(null, { deleted: ids.length });
            db.query(children[index], ids, (err) => {
                if (err) return callback(err);
                run(index + 1);
            });
        };
        run(0);
    });
};

module.exports = Activity;