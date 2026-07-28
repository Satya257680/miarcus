const NSORule = require("../models/nsoRuleModel");

// ==============================
// Get All Rules
// ==============================

exports.getRules = (req, res) => {

    NSORule.getAllRules((err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: err.message,
            });

        }

        res.status(200).json({
            success: true,
            count: results.length,
            data: results,
        });

    });

};

// ==============================
// Create Rule
// ==============================

exports.createRule = (req, res) => {

    const {

        trigger_column,

        departments

    } = req.body;

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

    NSORule.createRule({

        trigger_column,

        created_by: req.user?.id || null

    }, (err, result) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: err.message

            });

        }

        const ruleId = result.insertId;

        NSORule.addDepartments(

            ruleId,

            departments,

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

    });

};

// ==============================
// Update Rule
// ==============================

exports.updateRule = (req, res) => {

    const id = req.params.id;

    const {

        trigger_column,

        departments

    } = req.body;

    NSORule.updateRule(

        id,

        trigger_column,

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            NSORule.deleteDepartments(

                id,

                (err) => {

                    if (err) {

                        return res.status(500).json({

                            success: false,

                            message: err.message

                        });

                    }

                    NSORule.addDepartments(

                        id,

                        departments,

                        (err) => {

                            if (err) {

                                return res.status(500).json({

                                    success: false,

                                    message: err.message

                                });

                            }

                            res.json({

                                success: true,

                                message: "Rule updated successfully."

                            });

                        }

                    );

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

            res.json({

                success: true,

                message: "Rule deleted successfully."

            });

        }

    );

};

module.exports = exports;