const Store = require("../models/storeModel");
const fs = require("fs");
const csv = require("csv-parser");

// ==============================
// Get All Stores
// ==============================

exports.getStores = (req, res) => {
  Store.getAllStores((err, results) => {
    if (err) {
      console.error("Get Stores Error:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch stores",
        error: err.message,
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
// Create Store
// ==============================

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
    status,
  } = req.body;

  store_name = store_name?.trim();
  store_code = store_code?.trim();

  if (!store_name || !store_code) {
    return res.status(400).json({
      success: false,
      message: "Store Name and Store Code are required.",
    });
  }

  status = status || "Active";

  Store.checkStoreNameExists(store_name, (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    if (result.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Store Name already exists.",
      });
    }

    Store.checkStoreCodeExists(store_code, (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      if (result.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Store Code already exists.",
        });
      }

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
          status,
        },
        (err, data) => {
          if (err) {
            console.error(err);

            return res.status(500).json({
              success: false,
              message: err.message,
            });
          }

          res.status(201).json({
            success: true,
            message: "Store created successfully.",
            id: data.insertId,
          });
        }
      );
    });
  });
};

// ==============================
// Update Store
// ==============================

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
    status,
  } = req.body;

  store_name = store_name?.trim();
  store_code = store_code?.trim();

  if (!store_name || !store_code) {
    return res.status(400).json({
      success: false,
      message: "Store Name and Store Code are required.",
    });
  }

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
      status,
    },
    (err) => {
      if (err) {
        console.error(err);

        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "Store updated successfully.",
      });
    }
  );
};

// ==============================
// Delete Store
// ==============================

exports.deleteStore = (req, res) => {
  Store.deleteStore(req.params.id, (err) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "Store deleted successfully.",
    });
  });
};

// ==============================
// Delete All Stores
// ==============================

exports.deleteAllStores = (req, res) => {
  Store.deleteAllStores((err) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "All stores deleted successfully.",
    });
  });
};

// ==============================
// Import Stores From CSV
// ==============================

exports.importStoresFromCSV = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload a CSV file.",
    });
  }

  const stores = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      stores.push({
        store_name: row.store_name || row.StoreName || row["Store Name"],
        store_code: row.store_code || row.StoreCode || row["Store Code"],
        country: row.country || row.Country,
        city: row.city || row.City,
        state: row.state || row.State,
        address: row.address || row.Address,
        manager_name:
          row.manager_name ||
          row.Manager ||
          row["Manager Name"],
        contact_number:
          row.contact_number ||
          row.Contact ||
          row["Contact Number"],
        email: row.email || row.Email,
        status: row.status || row.Status || "Active",
      });
    })
    .on("end", () => {
      Store.bulkInsertStores(stores, (err, result) => {
        fs.unlink(req.file.path, () => {});

        if (err) {
          console.log("=================================");
          console.log("CSV IMPORT DATABASE ERROR");
          console.log(err);
          console.log("=================================");

          return res.status(500).json({
            success: false,
            message: err.message,
            error: err,
          });
        }

        res.json({
          success: true,
          message: `${result.affectedRows} stores imported successfully.`,
        });
      });
    })
    .on("error", (err) => {
      fs.unlink(req.file.path, () => {});

      console.log("CSV READ ERROR");
      console.log(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    });
};

module.exports = exports;