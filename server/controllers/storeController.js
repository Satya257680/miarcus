const { readDeleteScope } = require("../utils/deleteScope");
const Store = require("../models/storeModel");

const { logActivity } = require("../utils/activityLogger");
const { runBulkUpload, call: bulkCall, sql: bulkSql, isEmail, parseYesNo } = require("../utils/bulkUploadEngine");


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

    // Search / status filter applied on the page -> only the matching
    // store ids sent by the client are deleted.
    const scope = readDeleteScope(req);
    const ids = scope.filtered ? (scope.ids || []) : null;

    Store.deleteAllStores(

        ids,

        (err, result) => {

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

                title: ids ? "Filtered Stores Deleted" : "All Stores Deleted",

                description: ids
                    ? `${Number(result?.affectedRows || 0)} filtered store(s) were deleted`
                    : "All stores were deleted",

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

                message: ids
                    ? `${Number(result?.affectedRows || 0)} filtered store(s) deleted successfully.`
                    : "All stores deleted successfully."

            });

        }

    );

};

// ======================================================
// IMPORT STORES  (global bulk-upload engine)
// Any format: Excel / CSV / Word / PDF / photo. Each row on its own:
// duplicates (same Store Code), invalid email etc. are reported with
// row / column / value / reason and all valid rows are saved. Extra
// columns are kept with the store (bulk_extra_data).
// ======================================================

exports.importStoresFromCSV = (req, res) =>
    runBulkUpload({
        req,
        res,
        module: "stores",

        prepare: async (ctx) => {
            const rows = await bulkSql("SELECT store_code FROM stores WHERE store_code IS NOT NULL");
            ctx.data.codes = new Set(rows.map((r) => String(r.store_code).trim().toLowerCase()));
        },

        validateRow: (row, ctx) => {
            const code = ctx.text("Store Code");
            if (code && ctx.data.codes.has(code.toLowerCase())) {
                ctx.duplicate("Store Code", code, `Store Code ${code} already exists in the database.`);
            }

            const email = ctx.text("Email");
            if (email && !isEmail(email)) ctx.fail("Email", email, "Invalid email address.");

            const status = ctx.text("Status");
            if (status && !["active", "inactive"].includes(status.toLowerCase())) {
                ctx.fail("Status", status, "Status must be Active or Inactive.");
            }
        },

        duplicateKey: (row, ctx) => ({
            key: ctx.text("Store Code").toLowerCase(),
            column: "Store Code",
            value: ctx.text("Store Code")
        }),

        processRow: async (row, ctx) => {
            const result = await bulkCall(Store.createStore, {
                store_name: ctx.text("Store Name"),
                store_code: ctx.text("Store Code"),
                country: ctx.text("Country") || null,
                city: ctx.text("City") || null,
                state: ctx.text("State") || null,
                address: ctx.text("Address") || null,
                manager_name: ctx.text("Manager Name") || null,
                contact_number: ctx.text("Contact Number") || null,
                email: ctx.text("Email") || null,
                status: ctx.text("Status").toLowerCase() === "inactive" ? "Inactive" : "Active"
            });
            return { id: result.insertId };
        },

        finalize: async (ctx) => {
            if (!ctx.report.uploaded) return;
            logActivity({
                activity_type: "Store",
                reference_id: 0,
                title: "Stores Imported",
                description: `${ctx.report.uploaded} stores imported`,
                module_name: "Stores",
                status: "Closed",
                priority: "Medium",
                created_by: req.user.id,
                assigned_to: null
            });
        }
    });

