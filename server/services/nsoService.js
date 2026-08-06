const NewStoreOpening = require("../models/newStoreOpeningModel");

// ======================================================
// DATE HELPERS
// ======================================================

const addDays = (date, days) => {

    if (!date) return null;

    const d = new Date(date);

    d.setDate(d.getDate() + Number(days));

    return d.toISOString().split("T")[0];

};

const differenceInDays = (start, end) => {

    if (!start || !end) return 0;

    const s = new Date(start);

    const e = new Date(end);

    return Math.ceil(

        (e - s) / (1000 * 60 * 60 * 24)

    );

};

// ======================================================
// VALIDATE
// ======================================================

const validateInput = (data) => {

    if (!data.location)
        throw new Error("Location is required");

    if (!data.city)
        throw new Error("City is required");

    if (!data.possession_date_loi)
        throw new Error("Possession Date is required");

};

// ======================================================
// DEAL DAYS
// ======================================================

const calculateDealDays = (data) => {

    if (

        data.possession_date_loi &&

        data.actual_possession_date

    ) {

        data.deal_days = differenceInDays(

            data.possession_date_loi,

            data.actual_possession_date

        );

    }

    return data;

};

// ======================================================
// DELAY
// ======================================================

const calculateDelay = (data) => {

    if (

        data.possession_date_loi &&

        data.possession_date_broker

    ) {

        data.delay_loi_vs_broker = differenceInDays(

            data.possession_date_loi,

            data.possession_date_broker

        );

    }

    if (

        data.possession_date_broker &&

        data.actual_possession_date

    ) {

        data.possession_delay = differenceInDays(

            data.possession_date_broker,

            data.actual_possession_date

        );

    }

    return data;

};
// ======================================================
// TIMELINE GENERATOR
// ======================================================

const generateTimeline = (data) => {

    const possessionDate = data.actual_possession_date
        || data.possession_date_broker
        || data.possession_date_loi;

    if (!possessionDate) {

        return data;

    }

    // ------------------------------------------
    // PLANNING
    // ------------------------------------------

    data.layout_by_nso = addDays(

        possessionDate,

        2

    );

    data.revised_layout_by_nso = addDays(

        data.layout_by_nso,

        2

    );

    // ------------------------------------------
    // APPROVAL
    // ------------------------------------------

    data.approval_deadline = addDays(

        data.revised_layout_by_nso,

        3

    );

    // ------------------------------------------
    // CONSTRUCTION
    // ------------------------------------------

    data.visit_by_op_team = addDays(

        data.approval_deadline,

        5

    );

    // ------------------------------------------
    // COMPLIANCE
    // ------------------------------------------

    data.gst_deadline = addDays(

        data.visit_by_op_team,

        2

    );

    data.hr_hiring_deadline = addDays(

        data.gst_deadline,

        2

    );

    // ------------------------------------------
    // TRAINING
    // ------------------------------------------

    data.team_training_deadline = addDays(

        data.hr_hiring_deadline,

        7

    );

    data.visit_by_nso_team_deadline = addDays(

        data.team_training_deadline,

        0

    );

    // ------------------------------------------
    // STORE READY
    // ------------------------------------------

    data.plan_of_stock_deadline = addDays(

        data.visit_by_nso_team_deadline,

        5

    );

    data.plan_of_collaterals_deadline = addDays(

        data.plan_of_stock_deadline,

        0

    );

    data.on_field_training_deadline = addDays(

        data.plan_of_collaterals_deadline,

        5

    );

    // ------------------------------------------
    // FINAL HANDOVER
    // ------------------------------------------

    data.dispatch_stock_deadline = addDays(

        data.on_field_training_deadline,

        5

    );

    data.nso_handover_deadline = addDays(

        data.dispatch_stock_deadline,

        4

    );

    data.vm_handover_deadline = addDays(

        data.nso_handover_deadline,

        0

    );

    data.scanning_deadline = addDays(

        data.vm_handover_deadline,

        0

    );

    data.billing_start_date = addDays(

        data.scanning_deadline,

        5

    );

    return data;

};
// ======================================================
// CREATE PROJECT
// ======================================================

const createProject = (

    data,

    userId,

    file

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            try {

                // ==========================================
                // VALIDATE
                // ==========================================

                validateInput(

                    data

                );

                // ==========================================
                // FILE
                // ==========================================

                if (

                    file

                ) {

                    data.attachment =

                        file.path;

                }

                // ==========================================
                // DEFAULT VALUES
                // ==========================================

                data.status =

                    "Planning";

                data.created_by =

                    userId;

                data.updated_by =

                    userId;

                // ==========================================
                // SAVE PROJECT
                // ==========================================

                NewStoreOpening.create(

                    data,

                    (

                        err,

                        result

                    ) => {

                        if (

                            err

                        ) {

                            return reject(

                                err

                            );

                        }

                        return resolve({

                            success: true,

                            id: result.insertId,

                            message:

                                "New Store Opening created successfully."

                        });

                    }

                );

            }

            catch (

                error

            ) {

                return reject(

                    error

                );

            }

        }

    );

};
// ======================================================
// UPDATE PROJECT
// ======================================================

const updateProject = (

    id,

    data,

    userId,

    file

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            try {

                // ==========================================
                // VALIDATE
                // ==========================================

                validateInput(

                    data

                );

                // ==========================================
                // FILE
                // ==========================================

                if (

                    file

                ) {

                    data.attachment =

                        file.path;

                }

                // ==========================================
                // UPDATE VALUES
                // ==========================================

                data.updated_by =

                    userId;

                // ==========================================
                // UPDATE PROJECT
                // ==========================================

                NewStoreOpening.update(

                    id,

                    data,

                    (

                        err

                    ) => {

                        if (

                            err

                        ) {

                            return reject(

                                err

                            );

                        }

                        return resolve({

                            success: true,

                            message:

                                "Project updated successfully."

                        });

                    }

                );

            }

            catch (

                error

            ) {

                return reject(

                    error

                );

            }

        }

    );

};

// ======================================================
// GET PROJECT BY ID
// ======================================================

const getProjectById = (

    id

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            NewStoreOpening.getById(

                id,

                (

                    err,

                    rows

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    if (

                        !rows ||

                        rows.length === 0

                    ) {

                        return reject(

                            new Error(

                                "Project not found."

                            )

                        );

                    }

                    return resolve(

                        rows[0]

                    );

                }

            );

        }

    );

};
// ======================================================
// GET ALL PROJECTS
// ======================================================

const getProjects = (

    filters

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            NewStoreOpening.getAll(

                filters,

                (

                    err,

                    rows

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    NewStoreOpening.count(

                        filters,

                        (

                            countErr,

                            countRows

                        ) => {

                            if (

                                countErr

                            ) {

                                return reject(

                                    countErr

                                );

                            }

                            return resolve({

                                success: true,

                                data: rows,

                                total:

                                    countRows[0].total

                            });

                        }

                    );

                }

            );

        }

    );

};

// ======================================================
// DELETE PROJECT
// ======================================================

const deleteProject = (

    id,

    userId

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            NewStoreOpening.delete(

                id,

                (

                    err

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    return resolve({

                        success: true,

                        message:

                            "Project deleted successfully."

                    });

                }

            );

        }

    );

};

// ======================================================
// DELETE ALL PROJECTS
// ======================================================

const deleteAllProjects = (

    userId

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            NewStoreOpening.deleteAll(

                (

                    err

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    return resolve({

                        success: true,

                        message:

                            "All projects deleted successfully."

                    });

                }

            );

        }

    );

};
// ======================================================
// EXPORT PROJECTS
// ======================================================

const exportProjects = () => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            NewStoreOpening.getForExport(

                (

                    err,

                    rows

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    return resolve(

                        rows

                    );

                }

            );

        }

    );

};

// ======================================================
// BULK CREATE PROJECTS
// ======================================================

const bulkCreateProjects = (

    records

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            NewStoreOpening.bulkCreate(

                records,

                (

                    err,

                    result

                ) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    return resolve(

                        result

                    );

                }

            );

        }

    );

};

// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = {

    validateInput,

    calculateDealDays,

    calculateDelay,

    generateTimeline,

    createProject,

    updateProject,

    getProjectById,

    getProjects,

    deleteProject,

    deleteAllProjects,

    exportProjects,

    bulkCreateProjects

};