const db = require("../config/db");

// ==========================================================
// GET ALL REPORTS TO
// ==========================================================

const getAllReports = (callback) => {

    const sql = `

        SELECT *

        FROM reports_to

        ORDER BY id DESC

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// ADD REPORT
// ==========================================================

const addReport = (

    data,

    callback

) => {

    const sql = `

        INSERT INTO reports_to
        (

            manager_name,

            department,

            designation,

            status

        )

        VALUES
        (

            ?, ?, ?, ?

        )

    `;

    db.query(

        sql,

        [

            data.manager_name,

            data.department,

            data.designation,

            data.status

        ],

        callback

    );

};

// ==========================================================
// BULK INSERT REPORTS
// ==========================================================

const bulkInsertReports = (

    reports,

    callback

) => {

    if (

        !reports ||

        reports.length === 0

    ) {

        return callback(

            null,

            {

                affectedRows: 0

            }

        );

    }

    const sql = `

        INSERT INTO reports_to
        (

            manager_name,

            department,

            designation,

            status

        )

        VALUES ?

    `;

    const values = reports.map(

        (report) => [

            report["Manager Name"] || "",

            report["Department"] || "",

            report["Designation"] || "",

            report["Status"] || "Active"

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
// UPDATE REPORT
// ==========================================================

const updateReport = (

    id,

    data,

    callback

) => {

    const sql = `

        UPDATE reports_to

        SET

            manager_name = ?,

            department = ?,

            designation = ?,

            status = ?

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            data.manager_name,

            data.department,

            data.designation,

            data.status,

            id

        ],

        callback

    );

};

// ==========================================================
// DELETE REPORT
// ==========================================================

const deleteReport = (

    id,

    callback

) => {

    const sql = `

        DELETE

        FROM reports_to

        WHERE id = ?

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
// EXPORT MODEL FUNCTIONS
// ==========================================================

module.exports = {

    getAllReports,

    addReport,

    bulkInsertReports,

    updateReport,

    deleteReport

};