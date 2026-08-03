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

const deleteDesignation = (id, callback) => {

    db.query(

        `
        UPDATE users
        SET designation_id = NULL
        WHERE designation_id = ?
        `,
        [id],

        (err) => {

            if (err) return callback(err);

            db.query(

                `
                DELETE FROM designation_users
                WHERE designation_id = ?
                `,
                [id],

                (err) => {

                    if (err) return callback(err);

                    db.query(

                        `
                        DELETE FROM designations
                        WHERE id = ?
                        `,
                        [id],

                        callback

                    );

                }

            );

        }

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
// EXPORT DESIGNATIONS
// ==========================================================

const exportDesignations = (callback) => {

    const sql = `

        SELECT

            d.id,

            dep.department_name,

            d.designation_name,

            d.description,

            d.status,

            d.created_at

        FROM designations d

        INNER JOIN departments dep
            ON d.department_id = dep.id

        ORDER BY d.designation_name ASC

    `;

    db.query(sql, callback);

};

// ==========================================================
// DELETE ALL DESIGNATIONS
// ==========================================================

const deleteAllDesignations = (callback) => {

    db.query(

        `
        UPDATE users
        SET designation_id = NULL
        `,

        (err) => {

            if (err) return callback(err);

            db.query(

                `
                DELETE FROM designation_users
                `,

                (err) => {

                    if (err) return callback(err);

                    db.query(

                        `
                        DELETE FROM designations
                        `,

                        callback

                    );

                }

            );

        }

    );

};

// ==========================================================
// CHECK DUPLICATE DESIGNATION EXCLUDING CURRENT
// ==========================================================

const checkDuplicateForUpdate = (

    id,

    designation_name,

    department_id,

    callback

) => {

    const sql = `

        SELECT id

        FROM designations

        WHERE designation_name = ?

        AND department_id = ?

        AND id <> ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            designation_name,

            department_id,

            id

        ],

        callback

    );

};

// ==========================================================
// BULK INSERT DESIGNATIONS
// ==========================================================

const bulkInsertDesignations = (

    designations,

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

        VALUES ?

    `;

    const values = designations.map(

        (item) => [

            item.department_id,

            item.designation_name,

            item.description || "",

            item.status || "Active"

        ]

    );

    db.query(

        sql,

        [

            values

        ],

        callback

    );

};
// ==========================================================
// GET DEPARTMENT BY NAME
// ==========================================================

const getDepartmentByName = (departmentName, callback) => {

    const sql = `
        SELECT id
        FROM departments
        WHERE TRIM(department_name) = TRIM(?)
        LIMIT 1
    `;

    db.query(sql, [departmentName], callback);

};

// Module Exports

module.exports = {

    getAllDesignations,

    getDesignationById,

    checkDesignationExists,

    checkDuplicateForUpdate,

    createDesignation,

    updateDesignation,

    deleteDesignation,

    deleteAllDesignations,

    exportDesignations,

    bulkInsertDesignations,

    assignUsers,

    removeAssignedUsers,

    getAssignedUsers,

    getDepartmentByName

};