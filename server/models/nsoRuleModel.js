const db = require("../config/db");
// ==============================
// Get All Rules
// Search + Pagination
// ==============================

const getAllRules = (filters, callback) => {

    let sql = `
        SELECT
            nr.id,
            nr.trigger_column,
            GROUP_CONCAT(
                d.department_name
                ORDER BY d.department_name
                SEPARATOR ', '
            ) AS departments
        FROM nso_rules nr
        LEFT JOIN nso_rule_departments nrd
            ON nr.id = nrd.rule_id
        LEFT JOIN departments d
            ON nrd.department_id = d.id
        WHERE 1 = 1
    `;

    const params = [];

    if (filters.search) {

        sql += `
            AND (
                nr.trigger_column LIKE ?
                OR d.department_name LIKE ?
            )
        `;

        params.push(
            `%${filters.search}%`,
            `%${filters.search}%`
        );

    }

    sql += `
        GROUP BY nr.id
        ORDER BY nr.created_at DESC
    `;

    if (filters.page && filters.limit) {

        const page = parseInt(filters.page);

        const limit = parseInt(filters.limit);

        const offset = (page - 1) * limit;

        sql += `
            LIMIT ?
            OFFSET ?
        `;

        params.push(limit, offset);

    }

    db.query(sql, params, callback);

};

// ==============================
// Create Rule + Departments
// Transaction
// ==============================

const createRuleWithDepartments = (rule, callback) => {

    db.beginTransaction((err) => {

        if (err) {
            return callback(err);
        }

        const createRuleSql = `
            INSERT INTO nso_rules
            (
                trigger_column,
                created_by
            )
            VALUES (?, ?)
        `;

        db.query(

            createRuleSql,

            [
                rule.trigger_column,
                rule.created_by
            ],

            (err, result) => {

                if (err) {

                    return db.rollback(() => {
                        callback(err);
                    });

                }

                const ruleId = result.insertId;

                if (
                    !rule.departments ||
                    rule.departments.length === 0
                ) {

                    return db.commit((err) => {

                        if (err) {

                            return db.rollback(() => {
                                callback(err);
                            });

                        }

                        callback(null, result);

                    });

                }

                const values = rule.departments.map(dep => [

                    ruleId,

                    dep

                ]);

                const departmentSql = `
                    INSERT INTO nso_rule_departments
                    (
                        rule_id,
                        department_id
                    )
                    VALUES ?
                `;

                db.query(

                    departmentSql,

                    [values],

                    (err) => {

                        if (err) {

                            return db.rollback(() => {
                                callback(err);
                            });

                        }

                        db.commit((err) => {

                            if (err) {

                                return db.rollback(() => {
                                    callback(err);
                                });

                            }

                            callback(null, result);

                        });

                    }

                );

            }

        );

    });

};
// ======================================================
// Bulk Create Rules
// ======================================================

const bulkCreateRules = async (rules, callback) => {

    const connection = db;

    try {

        for (const rule of rules) {

            const insertRule = `
                INSERT INTO nso_rules
                (trigger_column)
                VALUES (?)
            `;

            const result = await new Promise((resolve, reject) => {

                connection.query(
                    insertRule,
                    [rule.trigger_column],
                    (err, res) => {

                        if (err) return reject(err);

                        resolve(res);

                    }
                );

            });

            const ruleId = result.insertId;

            for (const departmentId of rule.department_ids) {

                await new Promise((resolve, reject) => {

                    connection.query(

                        `INSERT INTO nso_rule_departments
                        (rule_id, department_id)
                        VALUES (?, ?)`,
                        [ruleId, departmentId],

                        (err) => {

                            if (err) return reject(err);

                            resolve();

                        }

                    );

                });

            }

        }

        callback(null);

    } catch (err) {

        callback(err);

    }

};

// ==============================
// Update Rule + Departments
// Transaction
// ==============================

const updateRuleWithDepartments = (

    id,

    triggerColumn,

    departments,

    callback

) => {

    db.beginTransaction((err) => {

        if (err) {
            return callback(err);
        }

        db.query(

            `
            UPDATE nso_rules
            SET trigger_column = ?
            WHERE id = ?
            `,

            [
                triggerColumn,
                id
            ],

            (err) => {

                if (err) {

                    return db.rollback(() => {
                        callback(err);
                    });

                }

                db.query(

                    `
                    DELETE
                    FROM nso_rule_departments
                    WHERE rule_id = ?
                    `,

                    [id],

                    (err) => {

                        if (err) {

                            return db.rollback(() => {
                                callback(err);
                            });

                        }

                        if (
                            !departments ||
                            departments.length === 0
                        ) {

                            return db.commit((err) => {

                                if (err) {

                                    return db.rollback(() => {
                                        callback(err);
                                    });

                                }

                                callback(null);

                            });

                        }

                        const values = departments.map(dep => [

                            id,

                            dep

                        ]);

                        db.query(

                            `
                            INSERT INTO nso_rule_departments
                            (
                                rule_id,
                                department_id
                            )
                            VALUES ?
                            `,

                            [values],

                            (err) => {

                                if (err) {

                                    return db.rollback(() => {
                                        callback(err);
                                    });

                                }

                                db.commit((err) => {

                                    if (err) {

                                        return db.rollback(() => {
                                            callback(err);
                                        });

                                    }

                                    callback(null);

                                });

                            }

                        );

                    }

                );

            }

        );

    });

};

// ==============================
// Delete Rule
// ==============================

const deleteRule = (id, callback) => {

    db.query(

        `
        DELETE
        FROM nso_rules
        WHERE id = ?
        `,

        [id],

        callback

    );

};
// ==============================
// Delete All Rules
// ==============================

const deleteAllRules = (callback) => {

    db.query(

        `
        DELETE
        FROM nso_rules
        `,

        callback

    );

};
// ==============================
// Export Rules
// ==============================

const exportRules = (callback) => {

    const sql = `

        SELECT

            nr.trigger_column,

            GROUP_CONCAT(

                d.department_name

                ORDER BY d.department_name

                SEPARATOR ', '

            ) AS departments

        FROM nso_rules nr

        LEFT JOIN nso_rule_departments nrd

            ON nr.id = nrd.rule_id

        LEFT JOIN departments d

            ON nrd.department_id = d.id

        GROUP BY nr.id

        ORDER BY nr.created_at DESC

    `;

    db.query(sql, callback);

};
// ==============================
// Check Duplicate Trigger Column
// ==============================

const checkDuplicateTriggerColumn = (
    triggerColumn,
    callback
) => {

    const sql = `
        SELECT id
        FROM nso_rules
        WHERE trigger_column = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [triggerColumn],
        callback
    );

};

// ==============================
// Check Duplicate While Updating
// ==============================

const checkDuplicateForUpdate = (
    id,
    triggerColumn,
    callback
) => {

    const sql = `
        SELECT id
        FROM nso_rules
        WHERE trigger_column = ?
        AND id <> ?
        LIMIT 1
    `;

    db.query(
        sql,
        [
            triggerColumn,
            id
        ],
        callback
    );

};

module.exports = {

    getAllRules,

    exportRules,

    checkDuplicateTriggerColumn,

    checkDuplicateForUpdate,

    createRuleWithDepartments,

    bulkCreateRules,

    updateRuleWithDepartments,

    deleteRule,

    deleteAllRules

};