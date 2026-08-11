const db = require("../config/db");


// ======================================================
// GET ALL RULES
// SEARCH + PAGINATION
// ======================================================

const getAllRules = (

    filters,

    callback

) => {

    let sql = `

        SELECT

            nr.id,

            nr.trigger_column,

            nr.expected_answer,

            nr.priority,

            nr.sla_days,

            nr.create_action_point,

            nr.mandatory,

            nr.is_active,

            nr.created_by,

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

        WHERE 1=1

    `;

    const params = [];

    // ==============================
    // SEARCH
    // ==============================

    if (filters.search) {

        sql += `

            AND (

                nr.trigger_column LIKE ?

                OR d.department_name LIKE ?

            )

        `;

        const search = `%${filters.search}%`;

        params.push(

            search,

            search

        );

    }

    sql += `

        GROUP BY nr.id

        ORDER BY nr.created_at DESC

    `;

    // ==============================
    // PAGINATION
    // ==============================

    if (filters.page && filters.limit) {

        const page = Number(filters.page);

        const limit = Number(filters.limit);

        const offset = (page - 1) * limit;

        sql += `

            LIMIT ?

            OFFSET ?

        `;

        params.push(

            limit,

            offset

        );

    }

    db.query(

        sql,

        params,

        callback

    );

};



// ======================================================
// COUNT RULES
// PAGINATION TOTAL
// ======================================================

const countRules = (

    filters,

    callback

) => {


    let sql = `

        SELECT COUNT(DISTINCT nr.id) AS total

        FROM nso_rules nr


        LEFT JOIN nso_rule_departments nrd

            ON nr.id = nrd.rule_id


        LEFT JOIN departments d

            ON nrd.department_id = d.id


        WHERE 1=1

    `;


    const params = [];



    if(filters.search){


        sql += `

            AND (

                nr.trigger_column LIKE ?

                OR d.department_name LIKE ?

            )

        `;


        const search = `%${filters.search}%`;


        params.push(

            search,

            search

        );


    }



    db.query(

        sql,

        params,

        callback

    );


};




// ======================================================
// GET RULE BY ID
// USED FOR AUDIT OLD DATA
// ======================================================

const getRuleById = (

    id,

    callback

) => {

    const sql = `

        SELECT

            nr.id,

            nr.trigger_column,

            nr.expected_answer,

            nr.priority,

            nr.sla_days,

            nr.create_action_point,

            nr.mandatory,

            nr.is_active,

            GROUP_CONCAT(

                d.department_name

                SEPARATOR ', '

            ) AS departments

        FROM nso_rules nr

        LEFT JOIN nso_rule_departments nrd

            ON nr.id = nrd.rule_id

        LEFT JOIN departments d

            ON nrd.department_id = d.id

        WHERE nr.id = ?

        GROUP BY nr.id

    `;

    db.query(

        sql,

        [

            id

        ],

        callback

    );

};


// ======================================================
// CREATE RULE + DEPARTMENTS
// TRANSACTION
//
// FIX:
// "../config/db" wraps a mysql2/promise pool and exposes
// { pool, query, execute, getConnection, ... }. It has NO
// beginTransaction / commit / rollback of its own — those
// only exist on a single connection obtained via
// pool.getConnection(). This version gets a dedicated
// connection, drives the transaction with async/await, and
// always releases the connection back to the pool. The
// external callback(err, result) signature is unchanged so
// nothing in the controller needs to change.
// ======================================================

const createRuleWithDepartments = async (

    rule,

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        const createRuleSql = `

            INSERT INTO nso_rules

            (

                trigger_column,

                expected_answer,

                priority,

                sla_days,

                create_action_point,

                mandatory,

                is_active,

                created_by

            )

            VALUES (?,?,?,?,?,?,?,?)

        `;

        const [result] = await connection.query(

            createRuleSql,

            [

                rule.trigger_column,

                rule.expected_answer || "No",

                rule.priority || "Medium",

                rule.sla_days || 3,

                rule.create_action_point ?? 1,

                rule.mandatory ?? 1,

                rule.is_active ?? 1,

                rule.created_by

            ]

        );

        const ruleId = result.insertId;

        if (

            rule.departments &&

            rule.departments.length > 0

        ) {

            const values = rule.departments.map(

                (departmentId) => [

                    ruleId,

                    departmentId

                ]

            );

            const departmentSql = `

                INSERT INTO nso_rule_departments

                (

                    rule_id,

                    department_id

                )

                VALUES ?

            `;

            await connection.query(

                departmentSql,

                [

                    values

                ]

            );

        }

        await connection.commit();

        callback(null, result);

    }

    catch (err) {

        if (connection) {

            await connection.rollback();

        }

        callback(err);

    }

    finally {

        if (connection) {

            connection.release();

        }

    }

};



// ======================================================
// BULK CREATE RULES
// WITH CREATED BY
//
// FIX:
// Now runs inside a single transaction via a dedicated
// connection, so a failure partway through a large CSV
// rolls back everything already inserted instead of
// leaving the table half-populated.
// ======================================================

const bulkCreateRules = async (

    rules,

    createdBy,

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        for (const rule of rules) {

            const insertRuleSql = `

                INSERT INTO nso_rules

                (

                    trigger_column,

                    expected_answer,

                    priority,

                    sla_days,

                    create_action_point,

                    mandatory,

                    is_active,

                    created_by

                )

                VALUES (?,?,?,?,?,?,?,?)

            `;

            const [result] = await connection.query(

                insertRuleSql,

                [

                    rule.trigger_column,

                    rule.expected_answer || "No",

                    rule.priority || "Medium",

                    rule.sla_days || 3,

                    rule.create_action_point ?? 1,

                    rule.mandatory ?? 1,

                    rule.is_active ?? 1,

                    createdBy

                ]

            );

            const ruleId = result.insertId;

            if (

                rule.department_ids &&

                rule.department_ids.length > 0

            ) {

                for (

                    const departmentId of rule.department_ids

                ) {

                    await connection.query(

                        `

                        INSERT INTO nso_rule_departments

                        (

                            rule_id,

                            department_id

                        )

                        VALUES (?,?)

                        `,

                        [

                            ruleId,

                            departmentId

                        ]

                    );

                }

            }

        }

        await connection.commit();

        callback(null);

    }

    catch (err) {

        if (connection) {

            await connection.rollback();

        }

        callback(err);

    }

    finally {

        if (connection) {

            connection.release();

        }

    }

};

// ======================================================
// UPDATE RULE + DEPARTMENTS
// TRANSACTION
// ======================================================

const updateRuleWithDepartments = async (

    id,

    triggerColumn,

    expectedAnswer,

    priority,

    slaDays,

    createActionPoint,

    mandatory,

    isActive,

    departments,

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        // ==============================
        // UPDATE RULE
        // ==============================

        await connection.query(

            `

            UPDATE nso_rules

            SET

                trigger_column = ?,

                expected_answer = ?,

                priority = ?,

                sla_days = ?,

                create_action_point = ?,

                mandatory = ?,

                is_active = ?

            WHERE id = ?

            `,

            [

                triggerColumn,

                expectedAnswer,

                priority,

                slaDays,

                createActionPoint,

                mandatory,

                isActive,

                id

            ]

        );

        // ==============================
        // REMOVE OLD DEPARTMENTS
        // ==============================

        await connection.query(

            `

            DELETE FROM nso_rule_departments

            WHERE rule_id = ?

            `,

            [

                id

            ]

        );

        // ==============================
        // INSERT NEW DEPARTMENTS
        // ==============================

        if (

            departments &&

            departments.length > 0

        ) {

            const values = departments.map(

                (departmentId) => [

                    id,

                    departmentId

                ]

            );

            await connection.query(

                `

                INSERT INTO nso_rule_departments

                (

                    rule_id,

                    department_id

                )

                VALUES ?

                `,

                [

                    values

                ]

            );

        }

        await connection.commit();

        callback(null);

    }

    catch (err) {

        if (connection) {

            await connection.rollback();

        }

        callback(err);

    }

    finally {

        if (connection) {

            connection.release();

        }

    }

};


// ======================================================
// DELETE SINGLE RULE
// ======================================================

const deleteRule = async (

    id,

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        // Delete mapping first

        await connection.query(

            `

            DELETE FROM nso_rule_departments

            WHERE rule_id = ?

            `,

            [

                id

            ]

        );

        // Delete main rule

        const [result] = await connection.query(

            `

            DELETE FROM nso_rules

            WHERE id = ?

            `,

            [

                id

            ]

        );

        await connection.commit();

        callback(null, result);

    }

    catch (err) {

        if (connection) {

            await connection.rollback();

        }

        callback(err);

    }

    finally {

        if (connection) {

            connection.release();

        }

    }

};



// ======================================================
// DELETE ALL RULES
// ======================================================

const deleteAllRules = async (

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        await connection.query(

            `

            DELETE FROM nso_rule_departments

            `

        );

        const [result] = await connection.query(

            `

            DELETE FROM nso_rules

            `

        );

        await connection.commit();

        callback(null, result);

    }

    catch (err) {

        if (connection) {

            await connection.rollback();

        }

        callback(err);

    }

    finally {

        if (connection) {

            connection.release();

        }

    }

};
// ======================================================
// EXPORT RULES
// ======================================================

const exportRules = (

    callback

) => {

    const sql = `

        SELECT

            nr.trigger_column,

            nr.expected_answer,

            nr.priority,

            nr.sla_days,

            nr.create_action_point,

            nr.mandatory,

            nr.is_active,

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

    db.query(

        sql,

        callback

    );

};



// ======================================================
// CHECK DUPLICATE TRIGGER COLUMN
// CREATE
// ======================================================

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

        [

            triggerColumn

        ],

        callback

    );


};





// ======================================================
// CHECK DUPLICATE TRIGGER COLUMN
// UPDATE
// ======================================================

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





// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = {


    // GET

    getAllRules,

    getRuleById,

    countRules,



    // CREATE

    createRuleWithDepartments,

    bulkCreateRules,



    // UPDATE

    updateRuleWithDepartments,



    // DELETE

    deleteRule,

    deleteAllRules,



    // EXPORT

    exportRules,



    // VALIDATION

    checkDuplicateTriggerColumn,

    checkDuplicateForUpdate


};