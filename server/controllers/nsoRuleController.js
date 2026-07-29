const NSORule = require("../models/nsoRuleModel");
const XLSX = require("xlsx");
// ==============================
// Get All Rules
// ==============================

exports.getRules = (req, res) => {

    const filters = {

        search: req.query.search || "",

        page: req.query.page || null,

        limit: req.query.limit || null

    };

    NSORule.getAllRules(filters, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: err.message

            });

        }

        res.status(200).json({

            success: true,

            count: results.length,

            data: results

        });

    });

};

// ==============================
// Create Rule
// ==============================

exports.createRule = (req, res) => {

    const { trigger_column, departments } = req.body;

    if (!trigger_column) {

        return res.status(400).json({

            success: false,

            message: "Trigger Column is required."

        });

    }

    if (!departments || departments.length === 0) {

        return res.status(400).json({

            success: false,

            message: "Select at least one department."

        });

    }

    NSORule.checkDuplicateTriggerColumn(

        trigger_column,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length > 0) {

                return res.status(400).json({

                    success: false,

                    message: "Trigger Column already exists."

                });

            }

            NSORule.createRuleWithDepartments(

                {

                    trigger_column,

                    departments,

                    created_by: req.user?.id || null

                },

                (err) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: err.message

                        });

                    }

                    res.status(201).json({

                        success: true,

                        message: "Rule created successfully."

                    });

                }

            );

        }

    );

};
// ==============================
// Bulk Upload Rules
// ==============================

exports.bulkUploadRules = (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "Please upload an Excel file."

        });

    }

    try {

        const workbook = XLSX.readFile(req.file.path);

        const sheet = workbook.Sheets[
            workbook.SheetNames[0]
        ];

        const rows = XLSX.utils.sheet_to_json(sheet);

        const rules = rows.map(row => ({

            trigger_column: row["Trigger Column"],

            department_ids: String(row["Department IDs"])
                .split(",")
                .map(id => Number(id.trim()))

        }));

        NSORule.bulkCreateRules(

            rules,

            (err) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: err.message

                    });

                }

                res.status(200).json({

                    success: true,

                    message: "Rules uploaded successfully."

                });

            }

        );

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Invalid Excel file."

        });

    }

};
// ==============================
// Update Rule
// ==============================

exports.updateRule = (req, res) => {

    const id = req.params.id;

    const { trigger_column, departments } = req.body;

    if (!trigger_column) {

        return res.status(400).json({

            success: false,

            message: "Trigger Column is required."

        });

    }

    if (!departments || departments.length === 0) {

        return res.status(400).json({

            success: false,

            message: "Select at least one department."

        });

    }

    NSORule.checkDuplicateForUpdate(

        id,

        trigger_column,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length > 0) {

                return res.status(400).json({

                    success: false,

                    message: "Trigger Column already exists."

                });

            }

            NSORule.updateRuleWithDepartments(

                id,

                trigger_column,

                departments,

                (err) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: err.message

                        });

                    }

                    res.status(200).json({

                        success: true,

                        message: "Rule updated successfully."

                    });

                }

            );

        }

    );

};

// ==============================
// Delete Rule
// ==============================

exports.deleteRule = (req, res) => {

    NSORule.deleteRule(

        req.params.id,

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            res.status(200).json({

                success: true,

                message: "Rule deleted successfully."

            });

        }

    );

};
// ==============================
// Delete All Rules
// ==============================

exports.deleteAllRules = (req, res) => {

    NSORule.deleteAllRules((err) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: err.message

            });

        }

        res.status(200).json({

            success: true,

            message: "All rules deleted successfully."

        });

    });

};
// ==============================
// Export Rules (CSV)
// ==============================

exports.exportRules = (req, res) => {

    NSORule.exportRules((err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: err.message

            });

        }

        let csv = "Trigger Column,Departments\n";

        results.forEach((rule) => {

            csv += `"${rule.trigger_column}","${rule.departments}"\n`;

        });

        res.setHeader(
            "Content-Type",
            "text/csv"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=NSO_Rules.csv"
        );

        res.status(200).send(csv);

    });

};

console.log("Controller Loaded");
console.log("Available Exports:", exports);

module.exports = exports;