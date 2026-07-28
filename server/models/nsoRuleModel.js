const db = require("../config/db");

// ==============================
// Get All Rules
// ==============================

const getAllRules = (callback) => {

    const sql = `
        SELECT
            nr.id,
            nr.trigger_column,
            GROUP_CONCAT(d.department_name ORDER BY d.department_name SEPARATOR ', ') AS departments
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
// Create Rule
// ==============================

const createRule = (rule, callback) => {

    const sql = `
        INSERT INTO nso_rules
        (
            trigger_column,
            created_by
        )
        VALUES (?, ?)
    `;

    db.query(
        sql,
        [
            rule.trigger_column,
            rule.created_by
        ],
        callback
    );

};

// ==============================
// Insert Rule Departments
// ==============================

const addDepartments = (ruleId, departments, callback) => {

    if (!departments || departments.length === 0) {
        return callback(null);
    }

    const values = departments.map(dep => [
        ruleId,
        dep
    ]);

    const sql = `
        INSERT INTO nso_rule_departments
        (
            rule_id,
            department_id
        )
        VALUES ?
    `;

    db.query(sql, [values], callback);

};

// ==============================
// Delete Rule Departments
// ==============================

const deleteDepartments = (ruleId, callback) => {

    db.query(
        "DELETE FROM nso_rule_departments WHERE rule_id=?",
        [ruleId],
        callback
    );

};

// ==============================
// Update Rule
// ==============================

const updateRule = (id, triggerColumn, callback) => {

    db.query(
        `
        UPDATE nso_rules
        SET trigger_column=?
        WHERE id=?
        `,
        [
            triggerColumn,
            id
        ],
        callback
    );

};

// ==============================
// Delete Rule
// ==============================

const deleteRule = (id, callback) => {

    db.query(
        "DELETE FROM nso_rules WHERE id=?",
        [id],
        callback
    );

};

module.exports = {

    getAllRules,

    createRule,

    addDepartments,

    deleteDepartments,

    updateRule,

    deleteRule

};