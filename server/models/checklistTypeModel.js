const db = require("../config/db");

// ==========================================================
// GET ALL CHECKLIST TYPES
// ==========================================================

const getAllChecklistTypes = (callback) => {

    const sql = `

        SELECT

            ct.id,

            ct.checklist_name,

            ct.allow_past_submission,

            ct.cutoff_time,

            ct.status,

            ct.created_at,

            GROUP_CONCAT(

                DISTINCT d.department_name

                ORDER BY d.department_name

                SEPARATOR ', '

            ) AS departments

        FROM checklist_types ct

        LEFT JOIN checklist_type_departments ctd

            ON ct.id = ctd.checklist_type_id

        LEFT JOIN departments d

            ON d.id = ctd.department_id

        GROUP BY

            ct.id,

            ct.checklist_name,

            ct.allow_past_submission,

            ct.cutoff_time,

            ct.status,

            ct.created_at

        ORDER BY ct.created_at DESC

    `;

    db.query(

        sql,

        callback

    );

};
// ==========================================================
// GET CHECKLIST TYPE BY ID
// ==========================================================

const getChecklistTypeById = (

    id,

    callback

) => {

    const sql = `

        SELECT

            ct.*,

            (

                SELECT

                    GROUP_CONCAT(department_id)

                FROM checklist_type_departments

                WHERE checklist_type_id = ct.id

            ) AS department_ids,

            (

                SELECT

                    GROUP_CONCAT(user_id)

                FROM checklist_type_users

                WHERE checklist_type_id = ct.id

            ) AS user_ids

        FROM checklist_types ct

        WHERE ct.id = ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            id

        ],

        callback

    );

};
// ==========================================================
// CREATE CHECKLIST TYPE
// ==========================================================

const createChecklistType = (

    data,

    callback

) => {

    const sql = `

        INSERT INTO checklist_types
        (

            checklist_name,

            allow_past_submission,

            cutoff_time,

            status

        )

        VALUES
        (

            ?, ?, ?, ?

        )

    `;

    db.query(

        sql,

        [

            data.checklist_name,

            data.allow_past_submission ? 1 : 0,

            data.cutoff_time || null,

            data.status || "Active"

        ],

        callback

    );

};
// ==========================================================
// SAVE CHECKLIST TYPE DEPARTMENTS
// ==========================================================

const saveDepartments = (

    checklistId,

    departments,

    callback

) => {

    if (

        !departments ||

        departments.length === 0

    ) {

        return callback(null);

    }

    const values = departments.map(

        (departmentId) => [

            checklistId,

            departmentId

        ]

    );

    const sql = `

        INSERT INTO checklist_type_departments
        (

            checklist_type_id,

            department_id

        )

        VALUES ?

    `;

    db.query(

        sql,

        [

            values

        ],

        callback

    );

};

// ==========================================================
// SAVE CHECKLIST TYPE USERS
// ==========================================================

const saveUsers = (

    checklistId,

    users,

    callback

) => {

    if (

        !users ||

        users.length === 0

    ) {

        return callback(null);

    }

    const values = users.map(

        (userId) => [

            checklistId,

            userId

        ]

    );

    const sql = `

        INSERT INTO checklist_type_users
        (

            checklist_type_id,

            user_id

        )

        VALUES ?

    `;

    db.query(

        sql,

        [

            values

        ],

        callback

    );

};
// ==========================================================
// DELETE CHECKLIST TYPE DEPARTMENTS
// ==========================================================

const deleteDepartments = (

    checklistId,

    callback

) => {

    const sql = `

        DELETE

        FROM checklist_type_departments

        WHERE checklist_type_id = ?

    `;

    db.query(

        sql,

        [

            checklistId

        ],

        callback

    );

};

// ==========================================================
// DELETE CHECKLIST TYPE USERS
// ==========================================================

const deleteUsers = (

    checklistId,

    callback

) => {

    const sql = `

        DELETE

        FROM checklist_type_users

        WHERE checklist_type_id = ?

    `;

    db.query(

        sql,

        [

            checklistId

        ],

        callback

    );

};
// ==========================================================
// UPDATE CHECKLIST TYPE
// ==========================================================

const updateChecklistType = (

    id,

    data,

    callback

) => {

    const sql = `

        UPDATE checklist_types

        SET

            checklist_name = ?,

            allow_past_submission = ?,

            cutoff_time = ?,

            status = ?

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            data.checklist_name,

            data.allow_past_submission ? 1 : 0,

            data.cutoff_time || null,

            data.status || "Active",

            id

        ],

        callback

    );

};
// ==========================================================
// DELETE CHECKLIST TYPE
// ==========================================================

const deleteChecklistType = (

    id,

    callback

) => {

    const sql = `

        DELETE

        FROM checklist_types

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            id

        ],

        callback

    );

};

// ==========================================================
// DELETE ALL CHECKLIST TYPES
// ==========================================================

const deleteAllChecklistTypes = (

    callback

) => {

    const sql = `

        DELETE

        FROM checklist_types

    `;

    db.query(

        sql,

        callback

    );

};
// ==========================================================
// EXPORT CHECKLIST TYPES
// ==========================================================

const getChecklistTypesForExport = (

    callback

) => {

    const sql = `

        SELECT

            ct.checklist_name,

            GROUP_CONCAT(

                DISTINCT d.department_name

                ORDER BY d.department_name

                SEPARATOR ', '

            ) AS departments,

            ct.allow_past_submission,

            ct.cutoff_time,

            ct.status

        FROM checklist_types ct

        LEFT JOIN checklist_type_departments ctd

            ON ct.id = ctd.checklist_type_id

        LEFT JOIN departments d

            ON d.id = ctd.department_id

        GROUP BY

            ct.id,

            ct.checklist_name,

            ct.allow_past_submission,

            ct.cutoff_time,

            ct.status

        ORDER BY

            ct.id

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// EXPORT MODEL FUNCTIONS
// ==========================================================

module.exports = {

    getAllChecklistTypes,

    getChecklistTypeById,

    createChecklistType,

    saveDepartments,

    saveUsers,

    deleteDepartments,

    deleteUsers,

    updateChecklistType,

    deleteChecklistType,

    deleteAllChecklistTypes,

    getChecklistTypesForExport

};
