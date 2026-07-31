const db = require("../config/db");

const Activity = {};

// ======================================================
// GET ALL ACTIVITIES
// SEARCH + FILTER + PAGINATION
// ======================================================

Activity.getAll = (filters, callback) => {

    let sql = `
        SELECT
            a.*,
            u.name AS created_by_name,
            au.name AS assigned_to_name
        FROM activities a
        LEFT JOIN users u
            ON a.created_by = u.id
        LEFT JOIN users au
            ON a.assigned_to = au.id
        WHERE 1 = 1
    `;

    const params = [];

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

    if (filters.status) {

        sql += ` AND a.status = ? `;

        params.push(filters.status);

    }

    // ======================================================
    // PRIORITY FILTER
    // ======================================================

    if (filters.priority) {

        sql += ` AND a.priority = ? `;

        params.push(filters.priority);

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
// GET ACTIVITY BY ID
// ======================================================

Activity.getById = (id, callback) => {

    const sql = `
        SELECT
            a.*,
            u.name AS created_by_name,
            au.name AS assigned_to_name
        FROM activities a
        LEFT JOIN users u
            ON a.created_by = u.id
        LEFT JOIN users au
            ON a.assigned_to = au.id
        WHERE a.id = ?
    `;

    db.query(sql, [id], callback);

};

// ======================================================
// GET ACTIVITY DETAILS
// ======================================================

Activity.getDetails = (id, callback) => {

    const sql = `
        SELECT

            a.*,

            creator.employee_id      AS created_by_employee_id,
            creator.name             AS created_by_name,
            creator.email            AS created_by_email,

            assignee.employee_id     AS assigned_employee_id,
            assignee.name            AS assigned_to_name,
            assignee.email           AS assigned_to_email,

            d.department_name,

            des.designation_name

        FROM activities a

        LEFT JOIN users creator
            ON creator.id = a.created_by

        LEFT JOIN users assignee
            ON assignee.id = a.assigned_to

        LEFT JOIN departments d
            ON d.id = assignee.department_id

        LEFT JOIN designations des
            ON des.id = assignee.designation_id

        WHERE a.id = ?
    `;

    db.query(sql, [id], callback);

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

module.exports = Activity;