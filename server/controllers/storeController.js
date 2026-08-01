const Store = require("../models/storeModel");

const { logActivity } = require("../utils/activityLogger");

const fs = require("fs");

const csv = require("csv-parser");

// ======================================================
// GET ALL STORES
// ======================================================

exports.getStores = (req, res) => {

    Store.getAllStores(

        (err, results) => {

            if (err) {

                console.error(

                    "Get Stores Error:",

                    err

                );

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch stores"

                });

            }

            return res.status(200).json({

                success: true,

                count: results.length,

                data: results

            });

        }

    );

};
// ======================================================
// CREATE STORE
// ======================================================

exports.createStore = (req, res) => {

    let {

        store_name,

        store_code,

        country,

        city,

        state,

        address,

        manager_name,

        contact_number,

        email,

        status

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    store_name = store_name?.trim();

    store_code = store_code?.trim();

    if (

        !store_name ||

        !store_code

    ) {

        return res.status(400).json({

            success: false,

            message: "Store Name and Store Code are required."

        });

    }

    status = status || "Active";

    // ======================================
    // CHECK STORE NAME
    // ======================================

    Store.checkStoreNameExists(

        store_name,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (result.length > 0) {

                return res.status(409).json({

                    success: false,

                    message: "Store Name already exists."

                });

            }

            // ======================================
            // CHECK STORE CODE
            // ======================================

            Store.checkStoreCodeExists(

                store_code,

                (err, result) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: err.message

                        });

                    }

                    if (result.length > 0) {

                        return res.status(409).json({

                            success: false,

                            message: "Store Code already exists."

                        });

                    }

                    // ======================================
                    // CREATE STORE
                    // ======================================

                    Store.createStore(

                        {

                            store_name,

                            store_code,

                            country,

                            city,

                            state,

                            address,

                            manager_name,

                            contact_number,

                            email,

                            status

                        },
                                                (err, data) => {

                            if (err) {

                                console.error(err);

                                return res.status(500).json({

                                    success: false,

                                    message: err.message

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Store",

                                reference_id: data.insertId,

                                title: "Store Created",

                                description: `${store_name} store was created`,

                                module_name: "Stores",

                                status: "Open",

                                priority: "Medium",

                                // Logged-in User
                                created_by: req.user.id,

                                // No specific assignee
                                assigned_to: null

                            });

                            return res.status(201).json({

                                success: true,

                                message: "Store created successfully.",

                                id: data.insertId

                            });

                        }

                    );

                }

            );

        }

    );

};
 // ======================================================
// GET STORE BY ID
// ======================================================

exports.getStoreById = (req, res) => {

    const id = req.params.id;


    Store.getStoreById(

        id,

        (err, results)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }



            if(results.length === 0){

                return res.status(404).json({

                    success:false,

                    message:"Store not found"

                });

            }



            return res.json({

                success:true,

                data:results[0]

            });


        }

    );

};


// ======================================================
// UPDATE STORE
// ======================================================

exports.updateStore = (req, res) => {

    const id = req.params.id;

    let {

        store_name,

        store_code,

        country,

        city,

        state,

        address,

        manager_name,

        contact_number,

        email,

        status

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    store_name = store_name?.trim();

    store_code = store_code?.trim();

    if (

        !store_name ||

        !store_code

    ) {

        return res.status(400).json({

            success: false,

            message: "Store Name and Store Code are required."

        });

    }
    
    // ======================================
    // UPDATE STORE
    // ======================================

    Store.updateStore(

        id,

        {

            store_name,

            store_code,

            country,

            city,

            state,

            address,

            manager_name,

            contact_number,

            email,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Store",

                reference_id: id,

                title: "Store Updated",

                description: `${store_name} store was updated`,

                module_name: "Stores",

                status: "Open",

                priority: "Medium",

                // Logged-in User
                created_by: req.user.id,

                // No specific assignee
                assigned_to: null

            });

            return res.status(200).json({

                success: true,

                message: "Store updated successfully."

            });

        }

    );

};
// ======================================================
// DELETE STORE
// ======================================================

exports.deleteStore = (req, res) => {

    const id = req.params.id;

    // ======================================
    // GET STORE DETAILS
    // ======================================

    Store.getStoreById(

        id,

        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch store."

                });

            }

            if (results.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Store not found."

                });

            }

            const store = results[0];
           
            // ======================================
            // DELETE STORE
            // ======================================

            Store.deleteStore(

                id,

                (err) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: err.message

                        });

                    }

                    // ======================================
                    // LOG ACTIVITY
                    // ======================================

                    logActivity({

                        activity_type: "Store",

                        reference_id: id,

                        title: "Store Deleted",

                        description: `${store.store_name} store was deleted`,

                        module_name: "Stores",

                        status: "Closed",

                        priority: "High",

                        // Logged-in User
                        created_by: req.user.id,

                        // No specific assignee
                        assigned_to: null

                    });

                    return res.json({

                        success: true,

                        message: "Store deleted successfully."

                    });

                }

            );

        }

    );

};
// ======================================================
// DELETE ALL STORES
// ======================================================

exports.deleteAllStores = (req, res) => {

    Store.deleteAllStores(

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Store",

                reference_id: 0,

                title: "All Stores Deleted",

                description: "All stores were deleted",

                module_name: "Stores",

                status: "Closed",

                priority: "High",

                // Administrator / Logged-in User
                created_by: req.user.id,

                // No specific assignee
                assigned_to: null

            });

            return res.json({

                success: true,

                message: "All stores deleted successfully."

            });

        }

    );

};

// ======================================================
// IMPORT STORES FROM CSV
// ======================================================

exports.importStoresFromCSV = (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "Please upload a CSV file."

        });

    }

    const stores = [];

    fs.createReadStream(req.file.path)

        .pipe(csv())

        .on("data", (row) => {

            stores.push({

                store_name:

                    row.store_name ||

                    row.StoreName ||

                    row["Store Name"],

                store_code:

                    row.store_code ||

                    row.StoreCode ||

                    row["Store Code"],

                country:

                    row.country ||

                    row.Country,

                city:

                    row.city ||

                    row.City,

                state:

                    row.state ||

                    row.State,

                address:

                    row.address ||

                    row.Address,

                manager_name:

                    row.manager_name ||

                    row.Manager ||

                    row["Manager Name"],

                contact_number:

                    row.contact_number ||

                    row.Contact ||

                    row["Contact Number"],

                email:

                    row.email ||

                    row.Email,

                status:

                    row.status ||

                    row.Status ||

                    "Active"

            });

        })

        .on("end", () => {

            Store.bulkInsertStores(

                stores,

                (err, result) => {

                    // ======================================
                    // DELETE TEMP FILE
                    // ======================================

                    fs.unlink(

                        req.file.path,

                        () => {}

                    );

                    if (err) {

                        console.error(

                            "CSV IMPORT DATABASE ERROR:",

                            err

                        );

                        return res.status(500).json({

                            success: false,

                            message: err.message,

                            error: err

                        });

                    }

                    // ======================================
                    // LOG ACTIVITY
                    // ======================================

                    logActivity({

                        activity_type: "Store",

                        reference_id: 0,

                        title: "Stores Imported",

                        description: `${result.affectedRows} stores imported from CSV`,

                        module_name: "Stores",

                        status: "Closed",

                        priority: "Medium",

                        created_by: req.user.id,

                        assigned_to: null

                    });

                    return res.json({

                        success: true,

                        message: `${result.affectedRows} stores imported successfully.`,

                        imported: result.affectedRows

                    });

                }

            );

        })

        .on("error", (err) => {

            fs.unlink(

                req.file.path,

                () => {}

            );

            console.error(

                "CSV READ ERROR:",

                err

            );

            return res.status(500).json({

                success: false,

                message: err.message

            });

        });

};
