const ChecklistReport = require("../models/checklistReportModel");
const csv = require("csv-parser");
const fs = require("fs");
const db = require("../config/db");

// ======================================================
// DATE FORMAT HELPER
// ======================================================

function formatDate(dateValue) {

    if (!dateValue) {

        return new Date()
            .toISOString()
            .split("T")[0];

    }

    if (dateValue.includes("T")) {

        return dateValue.split("T")[0];

    }

    return dateValue;

}



// ======================================================
// GET ALL REPORTS
// ======================================================

exports.getAllReports = (req, res) => {

    const filters = {

        store_id: req.query.store_id || null,

        checklist_type_id: req.query.checklist_type_id || null,

        employee_id: req.query.employee_id || null,

        from_date: req.query.from_date || null,

        to_date: req.query.to_date || null,

        search: req.query.search || null

    };



    ChecklistReport.getAll(

        filters,

        (err, reports) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message: "Unable to fetch checklist reports.",

                    error: err.message

                });

            }



            return res.status(200).json({

                success: true,

                count: reports.length,

                data: reports || []

            });

        }

    );

};



// ======================================================
// GET REPORT DETAILS
// ======================================================

exports.getReportById = (req, res) => {

    const reportId = req.params.id;

    ChecklistReport.getById(

        reportId,

        (err, reports) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message: "Unable to fetch report details.",

                    error: err.message

                });

            }

            if (!reports || reports.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Checklist report not found."

                });

            }

            return res.status(200).json({

                success: true,

                totalQuestions: reports.length,

                data: reports

            });

        }

    );

};
// ======================================================
// UPDATE REPORT
// ======================================================

exports.updateReport = (req, res) => {

    const reportId = req.params.id;

    const {

        status,
        submission_date,
        device,
        answer,
        remarks

    } = req.body;



    // ============================
    // VALIDATION
    // ============================

    if (!status) {

        return res.status(400).json({

            success: false,

            message: "Status is required."

        });

    }



    const reportData = {

        status,

        submission_date,

        device,

        answer,

        remarks

    };


ChecklistReport.update(

    reportId,

    reportData,

    (err, result) => {

        if (err) {

            console.error("UPDATE ERROR:");
            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Unable to update checklist report.",

                error: err.message

            });

        }

        if (result.affectedRows === 0) {

            return res.status(404).json({

                success: false,

                message: "Checklist report not found."

            });

        }

        return res.status(200).json({

            success: true,

            message: "Checklist report updated successfully."

        });

    }

);
}



// ======================================================
// DELETE REPORT
// ======================================================

exports.deleteReport = (req, res) => {

    const reportId = req.params.id;

    ChecklistReport.delete(

        reportId,

        (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message: "Unable to delete checklist report.",

                    error: err.message

                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Checklist report not found."

                });

            }

            return res.status(200).json({

                success: true,

                message: "Checklist report deleted successfully."

            });

        }

    );

};
// ======================================================
// IMPORT CSV
// ======================================================

exports.importReportsCSV = (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "CSV file is required."

        });

    }

    const records = [];

    fs.createReadStream(req.file.path)

        .pipe(csv())

        .on("data", (row) => {

            records.push(row);

        })

        .on("end", async () => {

            try {

                if (records.length === 0) {

                    return res.status(400).json({

                        success: false,

                        message: "CSV file is empty."

                    });

                }

                let importedCount = 0;
                let failedCount = 0;

                for (const row of records) {

                    try {

                        console.log("CSV ROW:", row);

                        // =================================
                        // CHECKLIST
                        // =================================

                        const checklistName =
                            row.Checklist ||
                            row["Checklist Name"] ||
                            row["Checklist Type"];

                        const [checklist] = await db.promise().query(

                            `
                            SELECT id
                            FROM checklist_types
                            WHERE checklist_name = ?
                            `,

                            [checklistName]

                        );

                        if (checklist.length === 0) {

                            console.log(
                                "Checklist not found:",
                                checklistName
                            );

                            failedCount++;

                            continue;

                        }

                        const checklist_type_id =
                            checklist[0].id;

                        // =================================
                        // STORE
                        // =================================

                        const storeName =
                            row.Store ||
                            row["Store Name"];

                        const [store] = await db.promise().query(

                            `
                            SELECT id
                            FROM stores
                            WHERE store_name = ?
                            `,

                            [storeName]

                        );

                        if (store.length === 0) {

                            console.log(
                                "Store not found:",
                                storeName
                            );

                            failedCount++;

                            continue;

                        }

                        const store_id = store[0].id;
                                                // =================================
                        // EMPLOYEE
                        // =================================

                        const employeeId =
                            row["Employee ID"] ||
                            row["Employee Id"] ||
                            row["Emp ID"];

                        let submitted_by = null;

                        if (employeeId && employeeId !== "-") {

                            const [user] = await db.promise().query(

                                `
                                SELECT id
                                FROM users
                                WHERE employee_id = ?
                                `,

                                [employeeId]

                            );

                            if (user.length > 0) {

                                submitted_by = user[0].id;

                            }

                        }



                        // =================================
                        // INSERT SUBMISSION
                        // =================================

                        const [submission] = await db.promise().query(

                            `

                            INSERT INTO checklist_submissions

                            (

                                checklist_type_id,

                                store_id,

                                submitted_by,

                                submission_date,

                                device,

                                attachment,

                                status

                            )

                            VALUES (?,?,?,?,?,?,?)

                            `,

                            [

                                checklist_type_id,

                                store_id,

                                submitted_by,

                                formatDate(

                                    row["Submitted At"] ||
                                    row["Submitted Date"]

                                ),

                                row.Device || "CSV Import",

                                row.Attachment || null,

                                row.Status || "Submitted"

                            ]

                        );



                        const submission_id = submission.insertId;



                        // =================================
                        // QUESTION
                        // =================================

                        const questionText =
                            row.Question ||
                            row["Question Text"];

                        let question = [];

                        if (questionText) {

                            [question] = await db.promise().query(

                                `

                                SELECT id

                                FROM questions

                                WHERE checklist_type_id = ?

                                AND question LIKE ?

                                LIMIT 1

                                `,

                                [

                                    checklist_type_id,

                                    `%${questionText}%`

                                ]

                            );

                        }



                        if (question.length === 0) {

                            [question] = await db.promise().query(

                                `

                                SELECT id

                                FROM questions

                                WHERE checklist_type_id = ?

                                ORDER BY id ASC

                                LIMIT 1

                                `,

                                [

                                    checklist_type_id

                                ]

                            );

                        }
                                                // =================================
                        // INSERT ANSWER
                        // =================================

                        if (question.length > 0) {

                            await db.promise().query(

                                `

                                INSERT INTO checklist_submission_answers

                                (

                                    submission_id,

                                    question_id,

                                    answer,

                                    remarks

                                )

                                VALUES (?,?,?,?)

                                `,

                                [

                                    submission_id,

                                    question[0].id,

                                    row.Answer ||
                                    row.Response ||
                                    "",

                                    row.Comment ||
                                    row.Remarks ||
                                    ""

                                ]

                            );

                        }



                        importedCount++;

                    }

                    catch (rowError) {

                        console.log(

                            "ROW FAILED:",

                            rowError.message

                        );

                        failedCount++;

                    }

                }



                return res.status(200).json({

                    success: true,

                    message: "CSV import completed.",

                    imported: importedCount,

                    failed: failedCount

                });

            }

           catch (error) {

    console.error(

        "CSV DATABASE ERROR:",

        error

    );

    return res.status(500).json({

        success: false,

        message: "CSV database insert failed.",

        error: error.message

    });

}
        })

        .on("error", (error) => {

            console.error(

                "CSV READ ERROR:",

                error

            );

            return res.status(500).json({

                success: false,

                message: "Unable to read CSV file."

            });

        });

};

