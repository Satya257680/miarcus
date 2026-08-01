const fs = require("fs");
const XLSX = require("xlsx");

const Report = require("../models/reportsToModel");
const { logActivity } = require("../utils/activityLogger");

// ======================================================
// GET ALL REPORTS TO
// ======================================================

const getReports = (req, res) => {

    Report.getAllReports(

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            return res.json({

                success: true,

                reports: result

            });

        }

    );

};
// ======================================================
// ADD REPORT
// ======================================================

const createReport = (req, res) => {

    const {

        manager_name,

        department,

        designation,

        status

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if (

        !manager_name ||

        !manager_name.trim()

    ) {

        return res.status(400).json({

            success: false,

            message: "Manager Name is required."

        });

    }

    Report.addReport(

        {

            manager_name: manager_name.trim(),

            department,

            designation,

            status: status || "Active"

        },

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to add manager"

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Reports To",

                reference_id: result.insertId,

                title: "Manager Added",

                description: `${manager_name} was added to Reports To`,

                module_name: "Reports To",

                status: "Open",

                priority: "Medium",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.status(201).json({

                success: true,

                message: "Manager Added Successfully",

                id: result.insertId

            });

        }

    );

};
// ======================================================
// BULK UPLOAD REPORTS
// ======================================================

const bulkUploadReports = (req, res) => {

    try {

        // ======================================
        // CHECK FILE
        // ======================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "No file uploaded"

            });

        }

        // ======================================
        // READ EXCEL FILE
        // ======================================

        const workbook = XLSX.readFile(

            req.file.path

        );

        const sheet = workbook.Sheets[

            workbook.SheetNames[0]

        ];

        const reports = XLSX.utils.sheet_to_json(

            sheet,

            {

                defval: "",

                blankrows: false

            }

        );

        // ======================================
        // FILTER EMPTY ROWS
        // ======================================

        const filteredReports = reports.filter(

            (item) => {

                return String(

                    item["Manager Name"] || ""

                ).trim() !== "";

            }

        );

        if (

            filteredReports.length === 0

        ) {

            if (

                fs.existsSync(req.file.path)

            ) {

                fs.unlinkSync(req.file.path);

            }

            return res.status(400).json({

                success: false,

                message: "No valid managers found."

            });

        }

        // ======================================
        // INSERT RECORDS
        // ======================================

        Report.bulkInsertReports(

            filteredReports,

            (err, result) => {

                // ======================================
                // DELETE TEMP FILE
                // ======================================

                if (

                    fs.existsSync(req.file.path)

                ) {

                    fs.unlinkSync(req.file.path);

                }

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: "Bulk Upload Failed",

                        error: err.sqlMessage

                    });

                }

                // ======================================
                // LOG ACTIVITY
                // ======================================

                logActivity({

                    activity_type: "Reports To",

                    reference_id: 0,

                    title: "Managers Imported",

                    description: `${result.affectedRows} managers imported from Excel`,

                    module_name: "Reports To",

                    status: "Closed",

                    priority: "Medium",

                    created_by: req.user.id,

                    assigned_to: null

                });

                return res.json({

                    success: true,

                    message: `${result.affectedRows} managers uploaded successfully`,

                    imported: result.affectedRows

                });

            }

        );

    }

    catch (err) {

        console.error(err);

        if (

            req.file &&

            fs.existsSync(req.file.path)

        ) {

            fs.unlinkSync(req.file.path);

        }

        return res.status(500).json({

            success: false,

            message: "Upload Error"

        });

    }

};
// ======================================================
// UPDATE REPORT
// ======================================================

const editReport = (req, res) => {

    const id = req.params.id;

    const {

        manager_name,

        department,

        designation,

        status

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if (

        !manager_name ||

        !manager_name.trim()

    ) {

        return res.status(400).json({

            success: false,

            message: "Manager Name is required."

        });

    }

    // ======================================
    // UPDATE REPORT
    // ======================================

    Report.updateReport(

        id,

        {

            manager_name: manager_name.trim(),

            department,

            designation,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Update Failed"

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Reports To",

                reference_id: id,

                title: "Manager Updated",

                description: `${manager_name} was updated in Reports To`,

                module_name: "Reports To",

                status: "Open",

                priority: "Medium",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.json({

                success: true,

                message: "Manager Updated Successfully"

            });

        }

    );

};
// ======================================================
// DELETE REPORT
// ======================================================

const removeReport = (req, res) => {

    const id = req.params.id;

    // ======================================
    // GET REPORT DETAILS
    // ======================================

    Report.getAllReports(

        (err, reports) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            const report = reports.find(

                (item) => item.id == id

            );

            if (!report) {

                return res.status(404).json({

                    success: false,

                    message: "Manager not found"

                });

            }

            // ======================================
            // DELETE REPORT
            // ======================================

            Report.deleteReport(

                id,

                (err) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: "Delete Failed"

                        });

                    }

                    // ======================================
                    // LOG ACTIVITY
                    // ======================================

                    logActivity({

                        activity_type: "Reports To",

                        reference_id: id,

                        title: "Manager Deleted",

                        description: `${report.manager_name} was removed from Reports To`,

                        module_name: "Reports To",

                        status: "Closed",

                        priority: "High",

                        created_by: req.user.id,

                        assigned_to: null

                    });

                    return res.json({

                        success: true,

                        message: "Manager Deleted Successfully"

                    });

                }

            );

        }

    );

};
// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

module.exports = {

    getReports,

    createReport,

    bulkUploadReports,

    editReport,

    removeReport

};