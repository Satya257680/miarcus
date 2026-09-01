const db = require("../config/db");

// ==========================================================
// QUIZ / RBAC PERMISSION CONFIGURATION
// ==========================================================
//
// The Quiz module must use the exact key "Quiz" because the
// Quiz routes check:
//
//     permissionMiddleware("Quiz", level)
//
// ==========================================================

const RBAC_MODULES = [
    "Dashboard",
    "Activity Center",
    "Action Points",
    "Quiz",
    "Checklist Reports",
    "Checklist Submission",
    "Checklist Types",
    "Questions",
    "Departments",
    "Designations",
    "Store Management",
    "Users",
    "Reports To",
    "NSO Rules",
    "New Store Openings",
    "Announcements",
    "Gallery",
    "Asset Master",
    "Employee Location",
    "Attendance",
    "Expenses",
    "Petty Cash",
    "Billing",
    "Daily Collection",
    "Visit Planner",
    "Travel Plan",
    "Travel Plan Approvals",
    "Sales Review",
    "Listing Tracker",
    "Inventory Planning",
    "Collection Tracking",
    "Chat",
    "Profile",
    "Settings"
];

const RBAC_LEVELS = new Set([
    "None",
    "View",
    "Add",
    "Edit",
    "Full"
]);


// ==========================================================
// NORMALIZE PERMISSIONS
// ==========================================================

const normalizePermissions = (
    permissions = {},
    administrator = false
) => {

    const input =
        permissions &&
        typeof permissions === "object"
            ? permissions
            : {};

    const normalized = {};

    RBAC_MODULES.forEach(
        (moduleName) => {

            const requested =
                input[moduleName];

            if (administrator) {

                normalized[moduleName] =
                    "Full";

            } else if (
                RBAC_LEVELS.has(
                    requested
                )
            ) {

                normalized[moduleName] =
                    moduleName === "Daily Collection" && requested === "Full"
                        ? "Edit"
                        : requested;

            } else {

                normalized[moduleName] =
                    "None";
            }
        }
    );

    return normalized;
};


// ==========================================================
// GET ALL USERS
// ==========================================================

const getAllUsers = (
    callback
) => {

    const sql = `

        SELECT

            u.id,

            u.employee_id,

            u.name,

            u.email,

            u.call_contact,

            u.whatsapp_contact,

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
            ) AS store_ids,

            GROUP_CONCAT(
                DISTINCT s.store_name
                ORDER BY s.store_name
                SEPARATOR '|||'
            ) AS store_names,

            (
                SELECT COUNT(*)
                FROM stores
            ) AS total_store_count

        FROM users u

        LEFT JOIN departments d
            ON u.department_id = d.id

        LEFT JOIN designations dg
            ON u.designation_id = dg.id

        LEFT JOIN user_stores us
            ON u.id = us.user_id

        LEFT JOIN stores s
            ON s.id = us.store_id

        GROUP BY u.id

        ORDER BY u.id DESC

    `;


    db.query(

        sql,

        (
            err,
            users
        ) => {

            if (err) {

                return callback(err);
            }


            // ======================================
            // RESTORE STORES ARRAY
            // ======================================

            users.forEach(
                (user) => {

                    user.stores =
                        user.store_ids
                            ? user.store_ids
                                .split(",")
                                .map(Number)
                                .filter(Number.isFinite)
                            : [];

                    user.store_names =
                        user.store_names
                            ? user.store_names
                                .split("|||")
                                .map((name) => name.trim())
                                .filter(Boolean)
                            : [];

                    user.total_store_count =
                        Number(user.total_store_count) || 0;

                    delete user.store_ids;

                    user.permissions = {};
                }
            );


            // ======================================
            // LOAD USER PERMISSIONS
            // ======================================

            db.query(

                `

                    SELECT

                        user_id,

                        module_name,

                        permission

                    FROM user_permissions

                `,

                (
                    permissionErr,
                    permissions
                ) => {

                    if (permissionErr) {

                        return callback(
                            permissionErr
                        );
                    }


                    permissions.forEach(
                        (row) => {

                            const user =
                                users.find(
                                    (u) =>
                                        u.id ===
                                        row.user_id
                                );


                            if (user) {

                                user.permissions[
                                    row.module_name
                                ] =
                                    row.permission;
                            }
                        }
                    );


                    // ======================================
                    // NORMALIZE RETURNED PERMISSIONS
                    // ======================================

                    users.forEach(
                        (user) => {

                            const administrator =
                                user.is_admin === 1 ||
                                user.is_admin === true;


                            user.permissions =
                                normalizePermissions(
                                    user.permissions,
                                    administrator
                                );
                        }
                    );


                    return callback(
                        null,
                        users
                    );
                }
            );
        }
    );
};


// ==========================================================
// CHECK EXISTING EMAIL
// ==========================================================

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

        [
            email
        ],

        callback
    );
};


// ==========================================================
// CHECK EXISTING EMPLOYEE ID
// ==========================================================

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

        [
            employeeId
        ],

        callback
    );
};


// ==========================================================
// ADD USER
// ==========================================================

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

                ? user.reportsTo.name ||
                  user.reportsTo

                : "",

            user.active
                ? "Active"
                : "Inactive",

            0

        ],

        (
            err,
            result
        ) => {

            if (err) {

                return callback(err);
            }


            const userId =
                result.insertId;


            // ======================================
            // SAVE USER STORES
            // ======================================

            saveUserStores(

                userId,

                user.stores || [],

                (
                    storeErr
                ) => {

                    if (storeErr) {

                        return callback(
                            storeErr
                        );
                    }


                    // ======================================
                    // SAVE USER PERMISSIONS
                    // ======================================

                    saveUserPermissions(

                        userId,

                        user.permissions || {},

                        (
                            permissionErr
                        ) => {

                            if (
                                permissionErr
                            ) {

                                return callback(
                                    permissionErr
                                );
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


// ==========================================================
// SAVE USER STORES
// ==========================================================

const saveUserStores = (

    userId,

    stores,

    callback

) => {

    // ======================================
    // NO STORES TO SAVE
    // ======================================

    if (
        !stores ||
        stores.length === 0
    ) {

        return callback(null);
    }


    const values =
        stores.map(
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


// ==========================================================
// SAVE USER PERMISSIONS
// ==========================================================

const saveUserPermissions = (

    userId,

    permissions,

    callback

) => {

    const normalized =
        normalizePermissions(
            permissions || {},
            false
        );


    const values =
        Object.entries(
            normalized
        ).map(
            (
                [
                    moduleName,
                    permission
                ]
            ) => [

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


// ==========================================================
// SAVE ACTIVATION TOKEN
// ==========================================================

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


// ==========================================================
// GET ACTIVATION TOKEN
// ==========================================================

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


// ==========================================================
// ACTIVATE USER
// ==========================================================

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


// ==========================================================
// MARK TOKEN AS USED
// ==========================================================

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


// ==========================================================
// GET DEPARTMENT ID BY NAME
// ==========================================================

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


// ==========================================================
// GET DESIGNATION ID BY NAME
// ==========================================================

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


// ==========================================================
// UPDATE USER
// ==========================================================

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

                ? user.reportsTo.name ||
                  user.reportsTo

                : "",

            user.active
                ? "Active"
                : "Inactive",

            user.administrator
                ? 1
                : 0,

            id

        ],

        (
            err
        ) => {

            if (err) {

                return callback(err);
            }


            // ======================================
            // UPDATE USER STORES
            // ======================================

            updateUserStores(

                id,

                user.stores || [],

                (
                    storeErr
                ) => {

                    if (storeErr) {

                        return callback(
                            storeErr
                        );
                    }


                    // ======================================
                    // UPDATE USER PERMISSIONS
                    // ======================================

                    updateUserPermissions(

                        id,

                        user.permissions || {},

                        user.administrator === true ||
                        user.administrator === 1 ||
                        user.administrator === "1",

                        callback
                    );
                }
            );
        }
    );
};


// ==========================================================
// UPDATE USER STORES
// ==========================================================

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

        (
            err
        ) => {

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


            const values =
                stores.map(
                    (
                        storeId
                    ) => [

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


// ==========================================================
// UPDATE USER PERMISSIONS
// ==========================================================

const updateUserPermissions = (

    userId,

    permissions,

    administrator,

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

        (
            err
        ) => {

            if (err) {

                return callback(err);
            }


            const normalized =
                normalizePermissions(

                    permissions || {},

                    administrator === true ||
                    administrator === 1 ||
                    administrator === "1"

                );


            const values =
                Object.entries(
                    normalized
                ).map(
                    (
                        [
                            moduleName,
                            permission
                        ]
                    ) => [

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


// ==========================================================
// DISABLE USER
// ==========================================================

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


// ==========================================================
// ENABLE USER
// ==========================================================

const enableUser = (

    id,

    callback

) => {

    db.query(

        `

            UPDATE users

            SET status = 'Active'

            WHERE id = ?

        `,

        [
            id
        ],

        callback
    );
};


// ==========================================================
// DELETE USER - DEPENDENCY CLEANUP
// ==========================================================
//
// Several Mi Arcus modules intentionally use ON DELETE RESTRICT
// for user-owned operational data. A direct DELETE FROM users
// therefore fails when one of those records exists.
//
// User deletion is an explicit admin action, so we clean only
// records that are owned by the user and would otherwise block
// deletion, then delete the user in the same database transaction.
//
// Nullable foreign-key columns are preserved by setting them to
// NULL. Non-nullable restrictive references are removed because
// retaining them would make the requested user deletion impossible.
//
// The cleanup is driven from INFORMATION_SCHEMA so newly-added
// restrictive user foreign keys are handled without requiring
// another code change.
// ==========================================================

const quoteIdentifier = (value) => {

    return "`" +
        String(value || "")
            .replace(/`/g, "``") +
        "`";

};

const cleanupRestrictiveUserReferences = async (
    connection,
    userId
) => {

    const databaseName = String(
        process.env.DB_NAME || "defaultdb"
    ).trim();

    const references = await connection.query(
        `
            SELECT
                kcu.TABLE_NAME AS table_name,
                kcu.COLUMN_NAME AS column_name,
                kcu.CONSTRAINT_NAME AS constraint_name,
                rc.DELETE_RULE AS delete_rule,
                c.IS_NULLABLE AS is_nullable
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
                AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            INNER JOIN INFORMATION_SCHEMA.COLUMNS c
                ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                AND c.TABLE_NAME = kcu.TABLE_NAME
                AND c.COLUMN_NAME = kcu.COLUMN_NAME
            WHERE
                kcu.CONSTRAINT_SCHEMA = ?
                AND kcu.REFERENCED_TABLE_NAME = 'users'
                AND kcu.REFERENCED_COLUMN_NAME = 'id'
                AND rc.DELETE_RULE IN ('RESTRICT', 'NO ACTION')
            ORDER BY
                kcu.TABLE_NAME ASC,
                kcu.CONSTRAINT_NAME ASC,
                kcu.ORDINAL_POSITION ASC
        `,
        [databaseName]
    );

    const rows = references[0] || [];

    for (const reference of rows) {

        const tableName = quoteIdentifier(reference.table_name);
        const columnName = quoteIdentifier(reference.column_name);

        // Never process the users table itself.
        if (
            String(reference.table_name).toLowerCase() === "users"
        ) {
            continue;
        }

        if (
            String(reference.is_nullable).toUpperCase() === "YES"
        ) {

            await connection.query(
                `
                    UPDATE ${tableName}
                    SET ${columnName} = NULL
                    WHERE ${columnName} = ?
                `,
                [userId]
            );

        } else {

            await connection.query(
                `
                    DELETE FROM ${tableName}
                    WHERE ${columnName} = ?
                `,
                [userId]
            );
        }
    }
};

const performDeleteUser = async (
    connection,
    userId
) => {

    await connection.beginTransaction();

    try {

        // Remove the user's direct RBAC/profile relationship rows
        // even on installations where these tables do not have
        // cascading foreign keys.
        const relationshipTables = [
            "user_permissions",
            "user_stores",
            "user_theme_preferences",
            "user_activation_tokens"
        ];

        for (const tableName of relationshipTables) {

            await connection.query(
                `
                    DELETE FROM ${quoteIdentifier(tableName)}
                    WHERE user_id = ?
                `,
                [userId]
            );
        }

        // Handle every remaining restrictive FK that points to users.id.
        await cleanupRestrictiveUserReferences(
            connection,
            userId
        );

        // ON DELETE CASCADE / SET NULL foreign keys are handled by MySQL.
        const [result] = await connection.query(
            `
                DELETE
                FROM users
                WHERE id = ?
            `,
            [userId]
        );

        if (!result || result.affectedRows !== 1) {

            throw new Error(
                "User was not found or could not be deleted."
            );
        }

        await connection.commit();

        return result;

    } catch (error) {

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error(
                "User delete rollback failed:",
                rollbackError
            );
        }

        throw error;

    }
};

// ==========================================================
// DELETE USER
// ==========================================================

const deleteUser = (
    id,
    callback
) => {

    const operation = (async () => {

        const connection =
            await db.getConnection();

        try {

            return await performDeleteUser(
                connection,
                id
            );

        } finally {

            connection.release();

        }

    })();

    if (typeof callback === "function") {

        operation
            .then((result) => callback(null, result))
            .catch((error) => callback(error));

        return undefined;
    }

    return operation;
};


// ==========================================================
// DELETE ALL USERS EXCEPT ADMIN
// ==========================================================

const deleteAllUsers = (
    callback
) => {

    const operation = (async () => {

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            try {

                const [users] = await connection.query(
                    `
                        SELECT id
                        FROM users
                        WHERE is_admin = 0
                        ORDER BY id ASC
                    `
                );

                for (const user of (users || [])) {

                    const userId = user.id;

                    const relationshipTables = [
                        "user_permissions",
                        "user_stores",
                        "user_theme_preferences",
                        "user_activation_tokens"
                    ];

                    for (const tableName of relationshipTables) {

                        await connection.query(
                            `
                                DELETE FROM ${quoteIdentifier(tableName)}
                                WHERE user_id = ?
                            `,
                            [userId]
                        );
                    }

                    await cleanupRestrictiveUserReferences(
                        connection,
                        userId
                    );
                }

                const [result] = await connection.query(
                    `
                        DELETE
                        FROM users
                        WHERE is_admin = 0
                    `
                );

                await connection.commit();

                return result;

            } catch (error) {

                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Delete-all rollback failed:",
                        rollbackError
                    );
                }

                throw error;
            }

        } finally {

            connection.release();

        }

    })();

    if (typeof callback === "function") {

        operation
            .then((result) => callback(null, result))
            .catch((error) => callback(error));

        return undefined;
    }

    return operation;
};


// ==========================================================
// GET USER BY ID
// ==========================================================

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


// ==========================================================
// GET USER NAMES
// ==========================================================

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

    enableUser,

    deleteUser,

    deleteAllUsers

};