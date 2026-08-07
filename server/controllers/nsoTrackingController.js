const NSOTracking = require("../models/nsoTrackingModel");

const Audit = require("../models/auditModel");

const { Parser } = require("json2csv");

const { logActivity } = require("../utils/activityLogger");


// ======================================================
// HELPER
// GET CURRENT USER ID
// ======================================================

const getUserId = (req) => {

    return req.user?.id || null;

};


// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

exports.getAllNSOTracking = (req, res) => {

    try {

        // ==================================================
        // PAGE
        // ==================================================

        let page = parseInt(
            req.query.page,
            10
        );

        if (
            !Number.isInteger(page) ||
            page < 1
        ) {
            page = 1;
        }


        // ==================================================
        // LIMIT
        // ==================================================

        let limit = parseInt(
            req.query.limit,
            10
        );

        if (
            !Number.isInteger(limit) ||
            limit < 1
        ) {
            limit = 10;
        }


        // ==================================================
        // OFFSET
        // ==================================================

        const offset =
            (page - 1) * limit;


        // ==================================================
        // FILTERS
        // ==================================================

        const filters = {

            search:
                req.query.search || "",

            offset,

            limit

        };


        // ==================================================
        // GET DATA
        // ==================================================

        NSOTracking.getAll(

            filters,

            (err, data) => {

                if (err) {

                    console.error(
                        "❌ NSO Tracking Get All Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                // ==================================================
                // GET COUNT
                // ==================================================

                NSOTracking.count(

                    filters,

                    (countError, countResult) => {

                        if (countError) {

                            console.error(
                                "❌ NSO Tracking Count Error:",
                                countError
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    countError.message

                            });

                        }


                        const total =
                            Number(
                                countResult?.[0]?.total || 0
                            );


                        // ==================================================
                        // RESPONSE
                        // ==================================================

                        return res.json({

                            success: true,

                            page,

                            limit,

                            total,

                            totalPages:
                                Math.ceil(
                                    total / limit
                                ),

                            data:
                                data || []

                        });

                    }

                );

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Get All NSO Tracking Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// GET NSO TRACKING BY ID
// ======================================================

exports.getNSOTrackingById = (
    req,
    res
) => {

    try {

        const id =
            req.params.id;


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Tracking ID is required."

            });

        }


        NSOTracking.getById(

            id,

            (err, result) => {

                if (err) {

                    console.error(
                        "❌ Get NSO Tracking By ID Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                if (
                    !result ||
                    result.length === 0
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Tracking not found."

                    });

                }


                return res.json({

                    success: true,

                    data:
                        result[0]

                });

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Get NSO Tracking By ID Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// GET TRACKING BY NEW STORE OPENING
// ======================================================

exports.getByStoreOpening = (
    req,
    res
) => {

    try {

        const id =
            req.params.id;


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "New Store Opening ID is required."

            });

        }


        NSOTracking.getByStoreOpening(

            id,

            (err, result) => {

                if (err) {

                    console.error(
                        "❌ Get Tracking By Store Opening Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                return res.json({

                    success: true,

                    data:
                        result || []

                });

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Get Tracking By Store Opening Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// CREATE NSO TRACKING
// ======================================================

exports.createNSOTracking = (
    req,
    res
) => {

    try {

        const userId =
            getUserId(req);


        // ==================================================
        // USER VALIDATION
        // ==================================================

        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "User authentication required."

            });

        }


        // ==================================================
        // REQUEST DATA
        // ==================================================

        const data = {

            ...req.body,

            created_by:
                userId,

            updated_by:
                userId

        };


        // ==================================================
        // CREATE
        // ==================================================

        NSOTracking.create(

            data,

            async (
                err,
                result
            ) => {

                if (err) {

                    console.error(
                        "❌ Create NSO Tracking Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                try {

                    // ==================================================
                    // ACTIVITY LOG
                    // ==================================================

                    if (
                        typeof logActivity ===
                        "function"
                    ) {

                        await logActivity({

                            activity_type:
                                "CREATE",

                            reference_id:
                                result.insertId,

                            title:
                                "NSO Tracking Created",

                            description:
                                "Created NSO Tracking",

                            module_name:
                                "NSO Tracking",

                            created_by:
                                userId

                        });

                    }


                    // ==================================================
                    // AUDIT LOG
                    // ==================================================

                    if (
                        Audit &&
                        typeof Audit.create ===
                        "function"
                    ) {

                        await Audit.create({

                            module_name:
                                "NSO Tracking",

                            reference_id:
                                result.insertId,

                            action:
                                "CREATE",

                            old_data:
                                null,

                            new_data:
                                data,

                            changed_by:
                                userId

                        });

                    }


                    // ==================================================
                    // RESPONSE
                    // ==================================================

                    return res.status(201).json({

                        success: true,

                        message:
                            "NSO Tracking Created Successfully",

                        id:
                            result.insertId

                    });

                }

                catch (logError) {

                    console.error(
                        "❌ NSO Tracking Logging Error:",
                        logError
                    );

                    return res.status(201).json({

                        success: true,

                        message:
                            "NSO Tracking Created Successfully",

                        id:
                            result.insertId,

                        warning:
                            "Tracking created but logging failed."

                    });

                }

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Create NSO Tracking Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// UPDATE NSO TRACKING
// ======================================================

exports.updateNSOTracking = (
    req,
    res
) => {

    try {

        const userId =
            getUserId(req);


        // ==================================================
        // USER VALIDATION
        // ==================================================

        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "User authentication required."

            });

        }


        const id =
            req.params.id;


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Tracking ID is required."

            });

        }


        // ==================================================
        // REQUEST DATA
        // ==================================================

        const data = {

            ...req.body,

            updated_by:
                userId

        };


        // ==================================================
        // UPDATE
        // ==================================================

        NSOTracking.update(

            id,

            data,

            async (
                err,
                result
            ) => {

                if (err) {

                    console.error(
                        "❌ Update NSO Tracking Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                // ==================================================
                // CHECK RECORD
                // ==================================================

                if (
                    !result ||
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Tracking not found."

                    });

                }


                try {

                    // ==================================================
                    // ACTIVITY LOG
                    // ==================================================

                    if (
                        typeof logActivity ===
                        "function"
                    ) {

                        await logActivity({

                            activity_type:
                                "UPDATE",

                            reference_id:
                                id,

                            title:
                                "NSO Tracking Updated",

                            description:
                                "Updated NSO Tracking",

                            module_name:
                                "NSO Tracking",

                            created_by:
                                userId

                        });

                    }


                    // ==================================================
                    // AUDIT LOG
                    // ==================================================

                    if (
                        Audit &&
                        typeof Audit.create ===
                        "function"
                    ) {

                        await Audit.create({

                            module_name:
                                "NSO Tracking",

                            reference_id:
                                id,

                            action:
                                "UPDATE",

                            old_data:
                                null,

                            new_data:
                                data,

                            changed_by:
                                userId

                        });

                    }


                    // ==================================================
                    // RESPONSE
                    // ==================================================

                    return res.json({

                        success: true,

                        message:
                            "NSO Tracking Updated Successfully"

                    });

                }

                catch (logError) {

                    console.error(
                        "❌ NSO Tracking Update Logging Error:",
                        logError
                    );

                    return res.json({

                        success: true,

                        message:
                            "NSO Tracking Updated Successfully",

                        warning:
                            "Tracking updated but logging failed."

                    });

                }

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Update NSO Tracking Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// UPDATE NSO TRACKING STATUS
// ======================================================

exports.updateStatus = (
    req,
    res
) => {

    try {

        const userId =
            getUserId(req);


        // ==================================================
        // USER VALIDATION
        // ==================================================

        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "User authentication required."

            });

        }


        const id =
            req.params.id;


        const status =
            req.body.status;


        // ==================================================
        // VALIDATION
        // ==================================================

        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Tracking ID is required."

            });

        }


        if (
            !status ||
            String(status).trim() === ""
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Status is required."

            });

        }


        // ==================================================
        // UPDATE STATUS
        // ==================================================

        NSOTracking.updateStatus(

            id,

            status,

            userId,

            async (
                err,
                result
            ) => {

                if (err) {

                    console.error(
                        "❌ Update NSO Tracking Status Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                // ==================================================
                // CHECK RECORD
                // ==================================================

                if (
                    !result ||
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Tracking not found."

                    });

                }


                try {

                    // ==================================================
                    // ACTIVITY LOG
                    // ==================================================

                    if (
                        typeof logActivity ===
                        "function"
                    ) {

                        await logActivity({

                            activity_type:
                                "STATUS UPDATE",

                            reference_id:
                                id,

                            title:
                                "NSO Tracking Status Changed",

                            description:
                                `Status changed to ${status}`,

                            module_name:
                                "NSO Tracking",

                            created_by:
                                userId

                        });

                    }


                    // ==================================================
                    // AUDIT LOG
                    // ==================================================

                    if (
                        Audit &&
                        typeof Audit.create ===
                        "function"
                    ) {

                        await Audit.create({

                            module_name:
                                "NSO Tracking",

                            reference_id:
                                id,

                            action:
                                "STATUS UPDATE",

                            old_data:
                                null,

                            new_data: {

                                status

                            },

                            changed_by:
                                userId

                        });

                    }


                    // ==================================================
                    // RESPONSE
                    // ==================================================

                    return res.json({

                        success: true,

                        message:
                            "Status Updated Successfully"

                    });

                }

                catch (logError) {

                    console.error(
                        "❌ NSO Tracking Status Logging Error:",
                        logError
                    );

                    return res.json({

                        success: true,

                        message:
                            "Status Updated Successfully",

                        warning:
                            "Status updated but logging failed."

                    });

                }

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Update NSO Tracking Status Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// DELETE NSO TRACKING
// ======================================================

exports.deleteNSOTracking = (
    req,
    res
) => {

    try {

        const userId =
            getUserId(req);


        // ==================================================
        // USER VALIDATION
        // ==================================================

        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "User authentication required."

            });

        }


        const id =
            req.params.id;


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Tracking ID is required."

            });

        }


        // ==================================================
        // DELETE
        // ==================================================

        NSOTracking.delete(

            id,

            async (
                err,
                result
            ) => {

                if (err) {

                    console.error(
                        "❌ Delete NSO Tracking Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                // ==================================================
                // CHECK RECORD
                // ==================================================

                if (
                    !result ||
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Tracking not found."

                    });

                }


                try {

                    // ==================================================
                    // ACTIVITY LOG
                    // ==================================================

                    if (
                        typeof logActivity ===
                        "function"
                    ) {

                        await logActivity({

                            activity_type:
                                "DELETE",

                            reference_id:
                                id,

                            title:
                                "NSO Tracking Deleted",

                            description:
                                "Deleted NSO Tracking",

                            module_name:
                                "NSO Tracking",

                            created_by:
                                userId

                        });

                    }


                    // ==================================================
                    // AUDIT LOG
                    // ==================================================

                    if (
                        Audit &&
                        typeof Audit.create ===
                        "function"
                    ) {

                        await Audit.create({

                            module_name:
                                "NSO Tracking",

                            reference_id:
                                id,

                            action:
                                "DELETE",

                            old_data:
                                null,

                            new_data:
                                null,

                            changed_by:
                                userId

                        });

                    }


                    // ==================================================
                    // RESPONSE
                    // ==================================================

                    return res.json({

                        success: true,

                        message:
                            "Deleted Successfully"

                    });

                }

                catch (logError) {

                    console.error(
                        "❌ NSO Tracking Delete Logging Error:",
                        logError
                    );

                    return res.json({

                        success: true,

                        message:
                            "Deleted Successfully",

                        warning:
                            "Tracking deleted but logging failed."

                    });

                }

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Delete NSO Tracking Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// DELETE ALL NSO TRACKING
// ======================================================

exports.deleteAllNSOTracking = (
    req,
    res
) => {

    try {

        const userId =
            getUserId(req);


        // ==================================================
        // USER VALIDATION
        // ==================================================

        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "User authentication required."

            });

        }


        // ==================================================
        // DELETE ALL
        // ==================================================

        NSOTracking.deleteAll(

            async (
                err,
                result
            ) => {

                if (err) {

                    console.error(
                        "❌ Delete All NSO Tracking Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                try {

                    // ==================================================
                    // ACTIVITY LOG
                    // ==================================================

                    if (
                        typeof logActivity ===
                        "function"
                    ) {

                        await logActivity({

                            activity_type:
                                "DELETE ALL",

                            title:
                                "All NSO Tracking Deleted",

                            description:
                                "Deleted all NSO Tracking records",

                            module_name:
                                "NSO Tracking",

                            created_by:
                                userId

                        });

                    }


                    // ==================================================
                    // AUDIT LOG
                    // ==================================================

                    if (
                        Audit &&
                        typeof Audit.create ===
                        "function"
                    ) {

                        await Audit.create({

                            module_name:
                                "NSO Tracking",

                            reference_id:
                                null,

                            action:
                                "DELETE ALL",

                            old_data:
                                null,

                            new_data:
                                null,

                            changed_by:
                                userId

                        });

                    }


                    // ==================================================
                    // RESPONSE
                    // ==================================================

                    return res.json({

                        success: true,

                        message:
                            "All Tracking Deleted",

                        deletedRows:
                            result?.affectedRows || 0

                    });

                }

                catch (logError) {

                    console.error(
                        "❌ Delete All NSO Tracking Logging Error:",
                        logError
                    );

                    return res.json({

                        success: true,

                        message:
                            "All Tracking Deleted",

                        deletedRows:
                            result?.affectedRows || 0,

                        warning:
                            "Records deleted but logging failed."

                    });

                }

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Delete All NSO Tracking Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// EXPORT NSO TRACKING CSV
// ======================================================

exports.exportNSOTracking = (
    req,
    res
) => {

    try {

        NSOTracking.export(

            (err, data) => {

                if (err) {

                    console.error(
                        "❌ Export NSO Tracking Error:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            err.message

                    });

                }


                // ==================================================
                // PARSER
                // ==================================================

                const parser =
                    new Parser();


                const csv =
                    parser.parse(
                        data || []
                    );


                // ==================================================
                // HEADERS
                // ==================================================

                res.header(
                    "Content-Type",
                    "text/csv"
                );


                res.attachment(
                    "nso_tracking.csv"
                );


                // ==================================================
                // SEND CSV
                // ==================================================

                return res.send(
                    csv
                );

            }

        );

    }

    catch (error) {

        console.error(
            "❌ Export NSO Tracking Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};