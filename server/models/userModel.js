const db = require("../config/db");

// ==========================
// Get All Users
// ==========================

const getAllUsers = (callback) => {

    const sql = `
        SELECT
            u.id,
            u.employee_id,
            u.name,
            u.email,
            u.password,
            u.profile_photo,
            u.reports_to,
            u.status,
            u.is_admin,
            u.created_at,

            u.department_id,
            d.department_name AS department,

            u.designation_id,
            dg.designation_name AS designation,

            u.is_activated,
            u.activated_at,

            GROUP_CONCAT(DISTINCT us.store_id) AS store_ids,

            GROUP_CONCAT(
                DISTINCT CONCAT(
                    up.module_name,
                    ':',
                    up.permission
                )
            ) AS permission_data

        FROM users u

        LEFT JOIN departments d
            ON u.department_id = d.id

        LEFT JOIN designations dg
            ON u.designation_id = dg.id

        LEFT JOIN user_stores us
            ON u.id = us.user_id

        LEFT JOIN user_permissions up
            ON u.id = up.user_id

        GROUP BY u.id

        ORDER BY u.id DESC
    `;

    db.query(sql, (err, rows) => {

        if (err) {

            return callback(err);

        }

        rows.forEach((user) => {

            user.stores = user.store_ids
                ? user.store_ids
                      .split(",")
                      .map(Number)
                : [];

            delete user.store_ids;

            // ==========================
            // Restore Permissions
            // ==========================

            const permissionString =
                user.permission_data;

            user.permissions = {};

            if (permissionString) {

                permissionString
                    .split(",")
                    .forEach((item) => {

                        const [module, permission] =
                            item.split(":");

                        user.permissions[module] =
                            permission;

                    });

            }

            delete user.permission_data;

        });

        callback(null, rows);

    });

};
// ==========================
// Check Existing Email
// ==========================

const checkEmailExists = (email, callback) => {

    db.query(

        "SELECT id FROM users WHERE email=?",

        [email],

        callback

    );

};

// ==========================
// Check Existing Employee ID
// ==========================

const checkEmployeeIdExists = (employeeId, callback) => {

    db.query(

        "SELECT id FROM users WHERE employee_id=?",

        [employeeId],

        callback

    );

};
// ==========================
// Add User
// ==========================

const addUser = (user, callback) => {
    if (user.administrator) {

    user.active = true;

    user.permissions = {
        Dashboard: "Full",
        Users: "Full",
        Stores: "Full",
        Departments: "Full",
        Designations: "Full",
        "Action Points": "Full",
        Tasks: "Full",
        Inventory: "Full",
        Reports: "Full",
        Settings: "Full",
    };

}

  const sql = `
    INSERT INTO users
    (
        employee_id,
        name,
        email,
        password,
        department_id,
        designation_id,
        reports_to,
        status,
        is_activated,
        is_admin
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    db.query(

        sql,
[
    user.employeeId,

    user.fullName,

    user.email,

    null,

    user.department_id || null,

    user.designation_id || null,

    user.reportsTo || null,

    user.active
        ? "Active"
        : "Inactive",

    0,

    user.administrator ? 1 : 0
],

        (err, result) => {

            if (err) {

                return callback(err);

            }

            const userId = result.insertId;

            saveUserStores(

    userId,

    user.stores || [],

    (storeErr) => {

        if (storeErr) {

            return callback(storeErr);

        }

        saveUserPermissions(

            userId,

            user.permissions || {},

            (permissionErr) => {

                if (permissionErr) {

                    return callback(permissionErr);

                }

                callback(null, result);

            }

        );

    }

);

        }

    );

};
// ==========================
// Save User Stores
// ==========================

const saveUserStores = (

    userId,

    stores,

    callback

) => {

    if (!stores || stores.length === 0) {

        return callback(null);

    }

    const values = stores.map((storeId) => [

        userId,

        storeId

    ]);

    db.query(

        `
        INSERT INTO user_stores
        (
            user_id,
            store_id
        )
        VALUES ?
        `,

        [values],

        callback

    );

};
// ==========================
// Save User Permissions
// ==========================

const saveUserPermissions = (

    userId,

    permissions,

    callback

) => {

    if (!permissions || Object.keys(permissions).length === 0) {

        return callback(null);

    }

    const values = Object.entries(permissions).map(

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

        [values],

        callback

    );

};
// ==========================
// Save Activation Token
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
// Get Activation Token
// ==========================

const getActivationToken = (

    token,

    callback

) => {

    const sql = `
        SELECT *
        FROM user_activation_tokens
        WHERE token=?
        AND used=0
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
// Activate User
// ==========================

const activateUser = (

    userId,

    password,

    callback

) => {

    const sql = `
        UPDATE users
        SET
            password=?,
            is_activated=1,
            activated_at=NOW()
        WHERE id=?
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
// Mark Token Used
// ==========================

const markTokenUsed = (

    token,

    callback

) => {

    db.query(

        `
        UPDATE user_activation_tokens
        SET used=1
        WHERE token=?
        `,

        [

            token

        ],

        callback

    );

};

// ==========================
// Bulk Insert Users
// ==========================

const bulkInsertUsers = (users, callback) => {

    const sql = `
        INSERT INTO users
        (
            employee_id,
            name,
            email,
            password,
            department,
            designation,
            reports_to,
            status
        )
        VALUES ?
    `;

    const values = users.map((user) => [

        user["Employee ID"] || "",

        user["Name"] || "",

        user["Email"] || "",

        null,

        user["Department"] || "",

        user["Designation"] || "",

        user["Reports To"] || "",

        user["Status"] || "Active",

    ]);

    db.query(sql, [values], callback);

};
// ==========================
// Update User
// ==========================

const updateUser = (

    id,

    user,

    callback

) => {

    // ==========================================
    // Administrator always gets Full Access
    // ==========================================

    if (user.administrator) {

        user.active = true;

        user.permissions = {

            Dashboard: "Full",

            Users: "Full",

            Stores: "Full",

            Departments: "Full",

            Designations: "Full",

            "Action Points": "Full",

            Tasks: "Full",

            Inventory: "Full",

            Reports: "Full",

            Settings: "Full"

        };

    }

    const sql = `
        UPDATE users
        SET
            employee_id=?,
            name=?,
            email=?,
            department_id=?,
            designation_id=?,
            reports_to=?,
            status=?,
            is_admin=?
        WHERE id=?
    `;

    db.query(

        sql,

        [

            user.employeeId,

            user.fullName,

            user.email,

            user.department_id || null,

            user.designation_id || null,

            user.reportsTo || null,

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

            updateUserStores(

                id,

                user.stores || [],

                (storeErr) => {

                    if (storeErr) {

                        return callback(storeErr);

                    }

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
// Update User Stores
// ==========================

const updateUserStores = (

    userId,

    stores,

    callback

) => {

    db.query(

        "DELETE FROM user_stores WHERE user_id=?",

        [userId],

        (err) => {

            if (err) {

                return callback(err);

            }

            if (!stores || stores.length === 0) {

                return callback(null);

            }

            const values = stores.map((storeId) => [

                userId,

                storeId

            ]);

            db.query(

                `
                INSERT INTO user_stores
                (
                    user_id,
                    store_id
                )
                VALUES ?
                `,

                [values],

                callback

            );

        }

    );

};
// ==========================
// Update User Permissions
// ==========================

const updateUserPermissions = (

    userId,

    permissions,

    callback

) => {

    db.query(

        "DELETE FROM user_permissions WHERE user_id=?",

        [userId],

        (err) => {

            if (err) {

                return callback(err);

            }

            if (!permissions || Object.keys(permissions).length === 0) {

                return callback(null);

            }

            const values = Object.entries(permissions).map(

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

                [values],

                callback

            );

        }

    );

};
// ==========================
// Disable User
// ==========================

const disableUser = (

    id,

    callback

) => {

    db.query(

        "UPDATE users SET status='Inactive' WHERE id=?",

        [

            id

        ],

        callback

    );

};

// ==========================
// Delete User
// ==========================

const deleteUser = (

    id,

    callback

) => {

    db.query(

        "DELETE FROM users WHERE id=?",

        [

            id

        ],

        callback

    );

};

// ==========================
// Delete All Users
// ==========================

const deleteAllUsers = (callback) => {

    db.query(

        "DELETE FROM users",

        callback

    );

};

/// ==========================
// Get User By ID
// ==========================

const getUserById = (id, callback) => {

    const sql = `
        SELECT
            id,
            name,
            email,
            is_activated
        FROM users
        WHERE id=?
        LIMIT 1
    `;

    db.query(sql, [id], callback);

};

// ==========================
// Get User Names
// ==========================

const getUserNames = (callback) => {

    const sql = `
        SELECT
            id,
            name
        FROM users
        WHERE status='Active'
        ORDER BY name ASC
    `;

    db.query(sql, callback);

};

module.exports = {

    getAllUsers,

    checkEmailExists,

    checkEmployeeIdExists,

    addUser,

    saveUserStores,

    saveUserPermissions,

    updateUser,

    updateUserStores,

    updateUserPermissions,

    saveActivationToken,

    getActivationToken,

    activateUser,

    markTokenUsed,

    getUserById,

    bulkInsertUsers,

    disableUser,

    deleteUser,

    deleteAllUsers,

    getUserNames

};