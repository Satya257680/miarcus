const db = require("../config/db");

// ==========================================================
// GET ALL DESIGNATIONS
// ==========================================================

const getAllDesignations = (callback) => {

    const sql = `

        SELECT

            d.id,

            d.department_id,

            dep.department_name,

            d.designation_name,

            d.description,

            d.status,

            d.created_at,

            COUNT(du.user_id) AS assigned_users

        FROM designations d

        INNER JOIN departments dep
            ON d.department_id = dep.id

        LEFT JOIN designation_users du
            ON d.id = du.designation_id

        GROUP BY

            d.id,

            d.department_id,

            dep.department_name,

            d.designation_name,

            d.description,

            d.status,

            d.created_at

        ORDER BY d.id DESC

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// GET DESIGNATION BY ID
// ==========================================================

const getDesignationById = (

    id,

    callback

) => {

    const sql = `

        SELECT *

        FROM designations

        WHERE id = ?

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
// CHECK DESIGNATION EXISTS
// ==========================================================

const checkDesignationExists = (

    designation_name,

    department_id,

    callback

) => {

    const sql = `

        SELECT

            id

        FROM designations

        WHERE designation_name = ?

        AND department_id = ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            designation_name,

            department_id

        ],

        callback

    );

};

// ==========================================================
// CREATE DESIGNATION
// ==========================================================

const createDesignation = (

    data,

    callback

) => {

    const sql = `

        INSERT INTO designations
        (

            department_id,

            designation_name,

            description,

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

            data.department_id,

            data.designation_name,

            data.description,

            data.status

        ],

        callback

    );

};

// ==========================================================
// UPDATE DESIGNATION
// ==========================================================

const updateDesignation = (

    id,

    data,

    callback

) => {

    const sql = `

        UPDATE designations

        SET

            department_id = ?,

            designation_name = ?,

            description = ?,

            status = ?

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            data.department_id,

            data.designation_name,

            data.description,

            data.status,

            id

        ],

        callback

    );

};

// ==========================================================
// DELETE DESIGNATION
// ==========================================================

const deleteDesignation = (

    id,

    callback

) => {

    const sql = `

        DELETE

        FROM designations

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
// ASSIGN USERS
// ==========================================================

const assignUsers = (

    designationId,

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

            designationId,

            userId

        ]

    );

    const sql = `

        INSERT INTO designation_users
        (

            designation_id,

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
// REMOVE ASSIGNED USERS
// ==========================================================

const removeAssignedUsers = (

    designationId,

    callback

) => {

    const sql = `

        DELETE

        FROM designation_users

        WHERE designation_id = ?

    `;

    db.query(

        sql,

        [

            designationId

        ],

        callback

    );

};

// ==========================================================
// GET ASSIGNED USERS
// ==========================================================

const getAssignedUsers = (

    designationId,

    callback

) => {

    const sql = `

        SELECT

            user_id

        FROM designation_users

        WHERE designation_id = ?

    `;

    db.query(

        sql,

        [

            designationId

        ],

        callback

    );

};

// ==========================================================
// EXPORT MODEL FUNCTIONS
// ==========================================================

module.exports = {

    getAllDesignations,

    getDesignationById,

    checkDesignationExists,

    createDesignation,

    updateDesignation,

    deleteDesignation,

    assignUsers,

    removeAssignedUsers,

    getAssignedUsers

};