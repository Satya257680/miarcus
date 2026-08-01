const db = require("../config/db");

// ==========================================================
// GET ALL USERS
// ==========================================================

const getAllUsers = (callback) => {

    const sql = `

        SELECT

            u.id,

            u.employee_id,

            u.name,

            u.email,

            u.call_contact,

            u.whatsapp_contact,

            u.password,

            u.profile_photo,

            u.reports_to,

            u.status,

            u.created_at,

            u.department_id,

            d.department_name AS department,

            u.designation_id,

            dg.designation_name AS designation,

            u.is_admin,

            u.is_activated,

            u.activated_at,

            GROUP_CONCAT(

                DISTINCT us.store_id

            ) AS store_ids

        FROM users u

        LEFT JOIN departments d

            ON u.department_id = d.id

        LEFT JOIN designations dg

            ON u.designation_id = dg.id

        LEFT JOIN user_stores us

            ON u.id = us.user_id

        GROUP BY u.id

        ORDER BY u.id DESC

    `;

    db.query(

        sql,

        (err, users) => {

            if (err) {

                return callback(err);

            }

            // ======================================
            // Restore Stores Array
            // ======================================

            users.forEach((user) => {

                user.stores = user.store_ids

                    ? user.store_ids
                        .split(",")
                        .map(Number)

                    : [];

                delete user.store_ids;

                user.permissions = {};

            });

            // ======================================
            // Load User Permissions
            // ======================================

            db.query(

                `
                SELECT

                    user_id,

                    module_name,

                    permission

                FROM user_permissions
                `,

                (permissionErr, permissions) => {

                    if (permissionErr) {

                        return callback(permissionErr);

                    }

                    permissions.forEach((row) => {

                        const user = users.find(

                            (u) => u.id === row.user_id

                        );

                        if (user) {

                            user.permissions[row.module_name] =
                                row.permission;

                        }

                    });

                    return callback(

                        null,

                        users

                    );

                }

            );

        }

    );

};
// ==========================
// CHECK EXISTING EMAIL
// ==========================

const checkEmailExists = (

    email,

    callback

) => {

    db.query(

        `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
        `,

        [email],

        callback

    );

};

// ==========================
// CHECK EXISTING EMPLOYEE ID
// ==========================

const checkEmployeeIdExists = (

    employeeId,

    callback

) => {

    db.query(

        `
        SELECT id
        FROM users
        WHERE employee_id = ?
        LIMIT 1
        `,

        [employeeId],

        callback

    );

};

// ==========================
// ADD USER
// ==========================

const addUser = (

    user,

    callback

) => {

    const sql = `

        INSERT INTO users
        (

            employee_id,

            name,

            email,

            call_contact,

            whatsapp_contact,

            password,

            department_id,

            designation_id,

            reports_to,

            status,

            is_activated

        )

        VALUES

        (

            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?

        )

    `;

    db.query(

        sql,

        [

            user.employeeId,

            user.fullName,

            user.email,

            user.callContact,

            user.whatsappContact,

            null,

            user.department_id,

            user.designation_id,

            user.reportsTo

                ? user.reportsTo.name || user.reportsTo

                : "",

            user.active

                ? "Active"

                : "Inactive",

            0

        ],

        (err, result) => {

            if (err) {

                return callback(err);

            }

            const userId = result.insertId;

            // ======================================
            // SAVE USER STORES
            // ======================================

            saveUserStores(

                userId,

                user.stores || [],

                (storeErr) => {

                    if (storeErr) {

                        return callback(storeErr);

                    }

                    // ======================================
                    // SAVE USER PERMISSIONS
                    // ======================================

                    saveUserPermissions(

                        userId,

                        user.permissions || {},

                        (permissionErr) => {

                            if (permissionErr) {

                                return callback(permissionErr);

                            }

                            return callback(

                                null,

                                result

                            );

                        }

                    );

                }

            );

        }

    );

};
// ==========================
// SAVE USER STORES
// ==========================

const saveUserStores = (

    userId,

    stores,

    callback

) => {

    // ======================================
    // NO STORES TO SAVE
    // ======================================

    if (!stores || stores.length === 0) {

        return callback(null);

    }

    const values = stores.map(

        (storeId) => [

            userId,

            storeId

        ]

    );

    db.query(

        `
        INSERT INTO user_stores
        (

            user_id,

            store_id

        )

        VALUES ?

        `,

        [

            values

        ],

        callback

    );

};
// ==========================
// SAVE USER PERMISSIONS
// ==========================

const saveUserPermissions = (

    userId,

    permissions,

    callback

) => {

    // ======================================
    // NO PERMISSIONS TO SAVE
    // ======================================

    if (

        !permissions ||

        Object.keys(permissions).length === 0

    ) {

        return callback(null);

    }

    const values = Object.entries(

        permissions

    ).map(

        ([moduleName, permission]) => [

            userId,

            moduleName,

            permission

        ]

    );

    db.query(

        `
        INSERT INTO user_permissions
        (

            user_id,

            module_name,

            permission

        )

        VALUES ?

        `,

        [

            values

        ],

        callback

    );

};
// ==========================
// SAVE ACTIVATION TOKEN
// ==========================

const saveActivationToken = (

    userId,

    token,

    expiresAt,

    callback

) => {

    const sql = `

        INSERT INTO user_activation_tokens
        (

            user_id,

            token,

            expires_at

        )

        VALUES (?, ?, ?)

    `;

    db.query(

        sql,

        [

            userId,

            token,

            expiresAt

        ],

        callback

    );

};

// ==========================
// GET ACTIVATION TOKEN
// ==========================

const getActivationToken = (

    token,

    callback

) => {

    const sql = `

        SELECT *

        FROM user_activation_tokens

        WHERE token = ?

        AND used = 0

        LIMIT 1

    `;

    db.query(

        sql,

        [

            token

        ],

        callback

    );

};

// ==========================
// ACTIVATE USER
// ==========================

const activateUser = (

    userId,

    password,

    callback

) => {

    const sql = `

        UPDATE users

        SET

            password = ?,

            is_activated = 1,

            activated_at = NOW()

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            password,

            userId

        ],

        callback

    );

};

// ==========================
// MARK TOKEN AS USED
// ==========================

const markTokenUsed = (

    token,

    callback

) => {

    db.query(

        `

        UPDATE user_activation_tokens

        SET used = 1

        WHERE token = ?

        `,

        [

            token

        ],

        callback

    );

};
// ==========================
// GET DEPARTMENT ID BY NAME
// ==========================

const getDepartmentIdByName = (

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

// ==========================
// GET DESIGNATION ID BY NAME
// ==========================

const getDesignationIdByName = (

    designationName,

    callback

) => {

    const sql = `

        SELECT

            id

        FROM designations

        WHERE designation_name = ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            designationName

        ],

        callback

    );

};
// ==========================
// UPDATE USER
// ==========================

const updateUser = (

    id,

    user,

    callback

) => {

    const sql = `

        UPDATE users

        SET

            employee_id = ?,

            name = ?,

            email = ?,

            call_contact = ?,

            whatsapp_contact = ?,

            department_id = ?,

            designation_id = ?,

            reports_to = ?,

            status = ?,

            is_admin = ?

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            user.employeeId,

            user.fullName,

            user.email,

            user.callContact,

            user.whatsappContact,

            user.department_id,

            user.designation_id,

            user.reportsTo

                ? user.reportsTo.name || user.reportsTo

                : "",

            user.active

                ? "Active"

                : "Inactive",

            user.administrator ? 1 : 0,

            id

        ],

        (err) => {

            if (err) {

                return callback(err);

            }

            // ======================================
            // UPDATE USER STORES
            // ======================================

            updateUserStores(

                id,

                user.stores || [],

                (storeErr) => {

                    if (storeErr) {

                        return callback(storeErr);

                    }

                    // ======================================
                    // UPDATE USER PERMISSIONS
                    // ======================================

                    updateUserPermissions(

                        id,

                        user.permissions || {},

                        callback

                    );

                }

            );

        }

    );

};
// ==========================
// UPDATE USER STORES
// ==========================

const updateUserStores = (

    userId,

    stores,

    callback

) => {

    db.query(

        `
        DELETE
        FROM user_stores
        WHERE user_id = ?
        `,

        [

            userId

        ],

        (err) => {

            if (err) {

                return callback(err);

            }

            // ======================================
            // NO STORES TO SAVE
            // ======================================

            if (

                !stores ||

                stores.length === 0

            ) {

                return callback(null);

            }

            const values = stores.map(

                (storeId) => [

                    userId,

                    storeId

                ]

            );

            db.query(

                `
                INSERT INTO user_stores
                (

                    user_id,

                    store_id

                )

                VALUES ?

                `,

                [

                    values

                ],

                callback

            );

        }

    );

};

// ==========================
// UPDATE USER PERMISSIONS
// ==========================

const updateUserPermissions = (

    userId,

    permissions,

    callback

) => {

    db.query(

        `
        DELETE
        FROM user_permissions
        WHERE user_id = ?
        `,

        [

            userId

        ],

        (err) => {

            if (err) {

                return callback(err);

            }

            // ======================================
            // NO PERMISSIONS
            // ======================================

            if (

                !permissions ||

                Object.keys(permissions).length === 0

            ) {

                return callback(null);

            }

            const values = Object.entries(

                permissions

            ).map(

                ([moduleName, permission]) => [

                    userId,

                    moduleName,

                    permission

                ]

            );

            db.query(

                `
                INSERT INTO user_permissions
                (

                    user_id,

                    module_name,

                    permission

                )

                VALUES ?

                `,

                [

                    values

                ],

                callback

            );

        }

    );

};
// ==========================
// DISABLE USER
// ==========================

const disableUser = (

    id,

    callback

) => {

    db.query(

        `
        UPDATE users
        SET status = 'Inactive'
        WHERE id = ?
        `,

        [

            id

        ],

        callback

    );

};

// ==========================
// DELETE USER
// ==========================

const deleteUser = (

    id,

    callback

) => {

    db.query(

        `
        DELETE
        FROM users
        WHERE id = ?
        `,

        [

            id

        ],

        callback

    );

};

// ==========================
// DELETE ALL USERS EXCEPT ADMIN
// ==========================

const deleteAllUsers = (

    callback

) => {

    db.query(

        `
        DELETE
        FROM users
        WHERE is_admin = 0
        `,

        callback

    );

};

// ==========================
// GET USER BY ID
// ==========================

const getUserById = (

    id,

    callback

) => {

    const sql = `

        SELECT

            id,

            name,

            email,

            call_contact,

            whatsapp_contact,

            is_activated

        FROM users

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

// ==========================
// GET USER NAMES
// ==========================

const getUserNames = (

    callback

) => {

    const sql = `

        SELECT

            id,

            name

        FROM users

        WHERE status = 'Active'

        ORDER BY name ASC

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

    // ======================================
    // User Retrieval
    // ======================================

    getAllUsers,

    getUserById,

    getUserNames,

    // ======================================
    // Validation
    // ======================================

    checkEmailExists,

    checkEmployeeIdExists,

    getDepartmentIdByName,

    getDesignationIdByName,

    // ======================================
    // User Creation
    // ======================================

    addUser,

    saveUserStores,

    saveUserPermissions,

    // ======================================
    // User Update
    // ======================================

    updateUser,

    updateUserStores,

    updateUserPermissions,

    // ======================================
    // Account Activation
    // ======================================

    saveActivationToken,

    getActivationToken,

    activateUser,

    markTokenUsed,

    // ======================================
    // User Status
    // ======================================

    disableUser,

    deleteUser,

    deleteAllUsers

};