const NewStoreOpening = require("../models/newStoreOpeningModel");

const { Parser } = require("json2csv");
// ======================================================
// GET ALL NEW STORE OPENINGS
// ======================================================

exports.getAllNewStoreOpenings = (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;

        const limit = parseInt(req.query.limit) || 10;

        const offset = (page - 1) * limit;

        const filters = {

            search: req.query.search || null,

            offset,

            limit

        };

        NewStoreOpening.getAll(

            filters,

            (err, data) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message: "Unable to fetch records",

                        error: err.message

                    });

                }

                NewStoreOpening.count(

                    filters,

                    (err, count) => {

                        if (err) {

                            return res.status(500).json({

                                success: false,

                                error: err.message

                            });

                        }

                        const total = count[0]?.total || 0;

                        return res.json({

                            success: true,

                            page,

                            limit,

                            total,

                            totalPages: Math.ceil(total / limit),

                            data

                        });

                    }

                );

            }

        );

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            error: error.message

        });

    }

};
// ======================================================
// GET BY ID
// ======================================================

exports.getNewStoreOpeningById = (req, res) => {

    const id = req.params.id;

    NewStoreOpening.getById(

        id,

        (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    error: err.message

                });

            }

            if (result.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Record not found"

                });

            }

            return res.json({

                success: true,

                data: result[0]

            });

        }

    );

};
// ======================================================
// EXPORT CSV
// ======================================================

exports.exportNewStoreOpeningsCSV = (req, res) => {

    const filters = {

        search: req.query.search || null,

        offset: 0,

        limit: 100000

    };

    NewStoreOpening.getAll(

        filters,

        (err, data) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    error: err.message

                });

            }

            try {

                const parser = new Parser();

                const csv = parser.parse(data);

                res.header("Content-Type", "text/csv");

                res.attachment("new_store_openings.csv");

                return res.send(csv);

            }

            catch (error) {

                return res.status(500).json({

                    success: false,

                    error: error.message

                });

            }

        }

    );

};
// ======================================================
// CREATE NEW STORE OPENING
// ======================================================

exports.createNewStoreOpening = (req, res) => {

    try {

        const data = {

            ...req.body,

            attachment: req.file
                ? req.file.path.replace(/\\/g, "/")
                : null,

            created_by: req.user.id,

            updated_by: req.user.id

        };

        NewStoreOpening.create(

            data,

            (err, result) => {

                if (err) {

                    console.error("CREATE ERROR:", err);

                    return res.status(500).json({

                        success: false,

                        message: "Unable to create record",

                        error: err.message

                    });

                }

                return res.status(201).json({

                    success: true,

                    message: "New Store Opening Created Successfully",

                    id: result.insertId

                });

            }

        );

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
// ======================================================
// UPDATE NEW STORE OPENING
// ======================================================

exports.updateNewStoreOpening = (req, res) => {

    const id = req.params.id;

    const data = {

        ...req.body,

        attachment: req.file
            ? req.file.path.replace(/\\/g, "/")
            : req.body.attachment,

        updated_by: req.user.id

    };

    NewStoreOpening.update(

        id,

        data,

        (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    error: err.message

                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Record not found"

                });

            }

            return res.json({

                success: true,

                message: "New Store Opening Updated Successfully"

            });

        }

    );

};
// ======================================================
// DELETE NEW STORE OPENING
// ======================================================

exports.deleteNewStoreOpening = (req, res) => {

    const id = req.params.id;

    NewStoreOpening.delete(

        id,

        (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    error: err.message

                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Record not found"

                });

            }

            return res.json({

                success: true,

                message: "New Store Opening Deleted Successfully"

            });

        }

    );

};
