const db = require("../config/db");

const NSOTracking = {};




// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

NSOTracking.getAll = (

    filters,

    callback

) => {


    let sql = `

        SELECT *

        FROM nso_tracking

        WHERE 1=1

    `;


    const values = [];


    // ==========================================
    // SEARCH
    // ==========================================

    if (filters.search) {


        sql += `

            AND (

                trigger_column LIKE ?

                OR status LIKE ?

                OR remarks LIKE ?

            )

        `;


        const key = `%${filters.search}%`;


        values.push(

            key,

            key,

            key

        );


    }



    // ==========================================
    // ORDER + PAGINATION
    // ==========================================

    sql += `

        ORDER BY id DESC

        LIMIT ?, ?

    `;


    values.push(

        filters.offset,

        filters.limit

    );



    db.query(

        sql,

        values,

        callback

    );


};





// ======================================================
// COUNT NSO TRACKING
// ======================================================

NSOTracking.count = (

    filters,

    callback

) => {


    let sql = `

        SELECT COUNT(*) AS total

        FROM nso_tracking

        WHERE 1=1

    `;


    const values = [];



    if(filters.search){


        sql += `

            AND (

                trigger_column LIKE ?

                OR status LIKE ?

                OR remarks LIKE ?

            )

        `;


        const key = `%${filters.search}%`;


        values.push(

            key,

            key,

            key

        );


    }



    db.query(

        sql,

        values,

        callback

    );


};






// ======================================================
// CREATE TRACKING
// ======================================================

NSOTracking.create = (

    data,

    callback

) => {



    const sql = `

        INSERT INTO nso_tracking

        (

            new_store_opening_id,

            rule_id,

            department_id,

            trigger_column,

            status,

            due_date,

            remarks,

            created_by,

            updated_by

        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

    `;



    db.query(

        sql,

        [

            data.new_store_opening_id,

            data.rule_id,

            data.department_id,

            data.trigger_column,

            data.status || "Pending",

            data.due_date,

            data.remarks,

            data.created_by,

            data.updated_by

        ],

        callback

    );


};






// ======================================================
// GET BY ID
// ======================================================

NSOTracking.getById = (

    id,

    callback

) => {


    db.query(

        `

        SELECT *

        FROM nso_tracking

        WHERE id = ?

        `,

        [

            id

        ],

        callback

    );


};






// ======================================================
// GET BY NEW STORE OPENING ID
// ======================================================

NSOTracking.getByStoreOpening = (

    id,

    callback

) => {


    db.query(

        `

        SELECT *

        FROM nso_tracking

        WHERE new_store_opening_id = ?

        ORDER BY id DESC

        `,

        [

            id

        ],

        callback

    );


};







// ======================================================
// UPDATE TRACKING
// ======================================================

NSOTracking.update = (

    id,

    data,

    callback

) => {



    const sql = `

        UPDATE nso_tracking

        SET


            rule_id=?,

            department_id=?,

            trigger_column=?,

            status=?,

            due_date=?,

            remarks=?,

            updated_by=?


        WHERE id=?

    `;



    db.query(

        sql,

        [

            data.rule_id,

            data.department_id,

            data.trigger_column,

            data.status,

            data.due_date,

            data.remarks,

            data.updated_by,

            id

        ],

        callback

    );


};







// ======================================================
// UPDATE STATUS
// ======================================================

NSOTracking.updateStatus = (

    id,

    status,

    callback

) => {



    db.query(

        `

        UPDATE nso_tracking

        SET status = ?

        WHERE id = ?

        `,

        [

            status,

            id

        ],

        callback

    );


};








// ======================================================
// DELETE TRACKING
// ======================================================

NSOTracking.delete = (

    id,

    callback

) => {


    db.query(

        `

        DELETE

        FROM nso_tracking

        WHERE id = ?

        `,

        [

            id

        ],

        callback

    );


};







// ======================================================
// DELETE ALL TRACKING
// ======================================================

NSOTracking.deleteAll = (

    callback

) => {


    db.query(

        `

        DELETE

        FROM nso_tracking

        `,

        callback

    );


};







// ======================================================
// EXPORT TRACKING
// ======================================================

NSOTracking.export = (

    callback

) => {


    db.query(

        `

        SELECT *

        FROM nso_tracking

        ORDER BY id DESC

        `,

        callback

    );


};






module.exports = NSOTracking;