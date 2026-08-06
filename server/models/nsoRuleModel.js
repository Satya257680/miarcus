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
// ======================================================

const createRuleWithDepartments = (

    rule,

    callback

) => {

    db.beginTransaction((err) => {

        if (err) {

            return callback(err);

        }

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

        db.query(

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

                db.query(

                    departmentSql,

                    [

                        values

                    ],

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

                            callback(

                                null,

                                result

                            );

                        });

                    }

                );

            }

        );

    });

};



// ======================================================
// BULK CREATE RULES
// WITH CREATED BY
// ======================================================

const bulkCreateRules = (

    rules,

    createdBy,

    callback

) => {

    const connection = db;

    const insertRules = async () => {

        try {

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

                const result = await new Promise(

                    (resolve, reject) => {

                        connection.query(

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

                            ],

                            (err, res) => {

                                if (err) {

                                    reject(err);

                                }

                                else {

                                    resolve(res);

                                }

                            }

                        );

                    }

                );

                const ruleId = result.insertId;

                if (

                    rule.department_ids &&

                    rule.department_ids.length > 0

                ) {

                    for (

                        const departmentId of rule.department_ids

                    ) {

                        await new Promise(

                            (resolve, reject) => {

                                connection.query(

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

                                    ],

                                    (err) => {

                                        if (err) {

                                            reject(err);

                                        }

                                        else {

                                            resolve();

                                        }

                                    }

                                );

                            }

                        );

                    }

                }

            }

            callback(null);

        }

        catch (err) {

            callback(err);

        }

    };

    insertRules();

};

// ======================================================
// UPDATE RULE + DEPARTMENTS
// TRANSACTION
// ======================================================

const updateRuleWithDepartments = (

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

    db.beginTransaction((err) => {

        if (err) {

            return callback(err);

        }

        // ==============================
        // UPDATE RULE
        // ==============================

        db.query(

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

            ],

            (err) => {

                if (err) {

                    return db.rollback(() => {

                        callback(err);

                    });

                }

                // ==============================
                // REMOVE OLD DEPARTMENTS
                // ==============================

                db.query(

                    `

                    DELETE FROM nso_rule_departments

                    WHERE rule_id = ?

                    `,

                    [

                        id

                    ],

                    (err) => {

                        if (err) {

                            return db.rollback(() => {

                                callback(err);

                            });

                        }

                        // ==============================
                        // INSERT NEW DEPARTMENTS
                        // ==============================

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

                        const values = departments.map(

                            (departmentId) => [

                                id,

                                departmentId

                            ]

                        );

                        db.query(

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

                            ],

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


// ======================================================
// DELETE SINGLE RULE
// ======================================================

const deleteRule = (

    id,

    callback

) => {


    db.beginTransaction((err)=>{


        if(err){

            return callback(err);

        }



        // Delete mapping first

        db.query(

            `

            DELETE FROM nso_rule_departments

            WHERE rule_id = ?

            `,

            [

                id

            ],

            (err)=>{


                if(err){

                    return db.rollback(()=>{

                        callback(err);

                    });

                }



                // Delete main rule

                db.query(

                    `

                    DELETE FROM nso_rules

                    WHERE id = ?

                    `,

                    [

                        id

                    ],

                    (err,result)=>{


                        if(err){

                            return db.rollback(()=>{

                                callback(err);

                            });

                        }



                        db.commit((err)=>{


                            if(err){

                                return db.rollback(()=>{

                                    callback(err);

                                });

                            }


                            callback(null,result);


                        });



                    }

                );



            }

        );



    });


};





// ======================================================
// DELETE ALL RULES
// ======================================================

const deleteAllRules = (

    callback

) => {


    db.beginTransaction((err)=>{


        if(err){

            return callback(err);

        }



        db.query(

            `

            DELETE FROM nso_rule_departments

            `,

            (err)=>{


                if(err){

                    return db.rollback(()=>{

                        callback(err);

                    });

                }



                db.query(

                    `

                    DELETE FROM nso_rules

                    `,

                    (err,result)=>{


                        if(err){

                            return db.rollback(()=>{

                                callback(err);

                            });

                        }



                        db.commit((err)=>{


                            if(err){

                                return db.rollback(()=>{

                                    callback(err);

                                });

                            }



                            callback(null,result);



                        });



                    }

                );



            }

        );



    });


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