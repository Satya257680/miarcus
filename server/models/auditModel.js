const db = require("../config/db");

const Audit = {};


// ======================================================
// CREATE AUDIT LOG
// ======================================================

Audit.create = (

    data,

    callback

) => {


    const sql = `

        INSERT INTO audit_logs

        (

            module_name,

            reference_id,

            action,

            old_data,

            new_data,

            changed_by

        )

        VALUES (?, ?, ?, ?, ?, ?)

    `;


    db.query(

        sql,

        [

            data.module_name,

            data.reference_id || null,

            data.action,

            data.old_data
                ? JSON.stringify(data.old_data)
                : null,


            data.new_data
                ? JSON.stringify(data.new_data)
                : null,


            data.changed_by


        ],

        callback

    );


};



// ======================================================
// GET AUDIT LOGS
// ======================================================

Audit.getByReference = (

    module_name,

    reference_id,

    callback

) => {


    const sql = `

        SELECT *

        FROM audit_logs

        WHERE module_name = ?

        AND reference_id = ?

        ORDER BY id DESC

    `;


    db.query(

        sql,

        [

            module_name,

            reference_id

        ],

        callback

    );


};


module.exports = Audit;