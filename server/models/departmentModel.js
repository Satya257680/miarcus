const db = require("../config/db");

// ==========================================================
// GET ALL DEPARTMENTS
// ==========================================================

const getAllDepartments = (callback) => {

    const sql = `

        SELECT *

        FROM departments

        ORDER BY created_at DESC

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// GET DEPARTMENT BY ID
// ==========================================================

const getDepartmentById = (

    id,

    callback

) => {

    const sql = `

        SELECT *

        FROM departments

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
// CHECK DEPARTMENT EXISTS
// ==========================================================

const checkDepartmentExists = (

    departmentName,

    callback

) => {

    const sql = `

        SELECT

            id

        FROM departments

        WHERE department_name = ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            departmentName

        ],

        callback

    );

};

// ==========================================================
// CREATE DEPARTMENT
// ==========================================================

const createDepartment = (

    department,

    callback

) => {

    const sql = `

        INSERT INTO departments
        (

            department_name,

            description,

            status

        )

        VALUES
        (

            ?, ?, ?

        )

    `;

    db.query(

        sql,

        [

            department.department_name,

            department.description,

            department.status

        ],

        callback

    );

};

// ==========================================================
// UPDATE DEPARTMENT
// ==========================================================

const updateDepartment = (

    id,

    department,

    callback

) => {

    const sql = `

        UPDATE departments

        SET

            department_name = ?,

            description = ?,

            status = ?

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            department.department_name,

            department.description,

            department.status,

            id

        ],

        callback

    );

};

// ==========================================================
// DELETE DEPARTMENT
// ==========================================================

const deleteDepartment = (id, callback) => {

    db.query(

        `
        UPDATE users
        SET department_id = NULL
        WHERE department_id = ?
        `,
        [id],

        (err) => {

            if (err) return callback(err);

            db.query(

                `
                DELETE FROM department_users
                WHERE department_id = ?
                `,
                [id],

                (err) => {

                    if (err) return callback(err);

                    db.query(

                        `
                        DELETE FROM departments
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
// ASSIGN USERS TO DEPARTMENT
// ==========================================================

const assignUsers = (

    departmentId,

    userIds,

    callback

) => {

    if (

        !userIds ||

        userIds.length === 0

    ) {

        return callback(null);

    }

    const sql = `

        INSERT INTO department_users
        (

            department_id,

            user_id

        )

        VALUES ?

    `;

    const values = userIds.map(

        (userId) => [

            departmentId,

            userId

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
// REMOVE ASSIGNED USERS
// ==========================================================

const removeAssignedUsers = (

    departmentId,

    callback

) => {

    const sql = `

        DELETE

        FROM department_users

        WHERE department_id = ?

    `;

    db.query(

        sql,

        [

            departmentId

        ],

        callback

    );

};

// ==========================================================
// GET ASSIGNED USERS
// ==========================================================

const getAssignedUsers = (

    departmentId,

    callback

) => {

    const sql = `

        SELECT

            user_id

        FROM department_users

        WHERE department_id = ?

    `;

    db.query(

        sql,

        [

            departmentId

        ],

        callback

    );

};

// ==========================================================
// EXPORT DEPARTMENTS
// ==========================================================

const exportDepartments = (callback) => {

    const sql = `

        SELECT

            id,

            department_name,

            description,

            status,

            created_at

        FROM departments

        ORDER BY department_name ASC

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// DELETE ALL DEPARTMENTS
// ==========================================================

const deleteAllDepartments = (callback) => {

    db.query(

        `
        UPDATE users
        SET department_id = NULL
        `,

        (err) => {

            if (err) return callback(err);

            db.query(

                `
                DELETE FROM department_users
                `,

                (err) => {

                    if (err) return callback(err);

                    db.query(

                        `
                        DELETE FROM departments
                        `,
                        callback

                    );

                }

            );

        }

    );

};

// ==========================================================
// BULK INSERT DEPARTMENTS
// ==========================================================

const bulkInsertDepartments = (

    departments,

    callback

) => {

    const sql = `

        INSERT INTO departments

        (

            department_name,

            description,

            status

        )

        VALUES ?

    `;

    const values = departments.map(

        (item) => [

            item.department_name,

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
// EXPORT MODEL FUNCTIONS
// ==========================================================

module.exports = {

    getAllDepartments,

    getDepartmentById,

    checkDepartmentExists,

    createDepartment,

    updateDepartment,

    deleteDepartment,

    deleteAllDepartments,

    exportDepartments,

    bulkInsertDepartments,

    // ======================================
    // Employee Assignment
    // ======================================

    assignUsers,

    removeAssignedUsers,

    getAssignedUsers

};