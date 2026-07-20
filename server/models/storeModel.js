const db = require("../config/db");

// ==============================
// Get All Stores
// ==============================

const getAllStores = (callback) => {
  const sql = `
    SELECT *
    FROM stores
    ORDER BY created_at DESC
  `;

  db.query(sql, callback);
};

// ==============================
// Get Store By ID
// ==============================

const getStoreById = (id, callback) => {
  const sql = `
    SELECT *
    FROM stores
    WHERE id = ?
  `;

  db.query(sql, [id], callback);
};

// ==============================
// Check Duplicate Store Name
// ==============================

const checkStoreNameExists = (storeName, callback) => {
  const sql = `
    SELECT id
    FROM stores
    WHERE store_name = ?
  `;

  db.query(sql, [storeName], callback);
};

// ==============================
// Check Duplicate Store Code
// ==============================

const checkStoreCodeExists = (storeCode, callback) => {
  const sql = `
    SELECT id
    FROM stores
    WHERE store_code = ?
  `;

  db.query(sql, [storeCode], callback);
};

// ==============================
// Create Store
// ==============================

const createStore = (store, callback) => {
  const sql = `
    INSERT INTO stores
    (
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
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      store.store_name,
      store.store_code,
      store.country,
      store.city,
      store.state,
      store.address,
      store.manager_name,
      store.contact_number,
      store.email,
      store.status,
    ],
    callback
  );
};

// ==============================
// Bulk Insert Stores (CSV Import)
// ==============================

const bulkInsertStores = (stores, callback) => {

  if (!stores || stores.length === 0) {
    return callback(null, { affectedRows: 0 });
  }

  const sql = `
    INSERT INTO stores
    (
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
    )
    VALUES ?
  `;

  const values = stores.map((store) => [
    store.store_name,
    store.store_code,
    store.country,
    store.city,
    store.state,
    store.address,
    store.manager_name,
    store.contact_number,
    store.email,
    store.status || "Active",
  ]);

  db.query(sql, [values], callback);
};

// ==============================
// Update Store
// ==============================

const updateStore = (id, store, callback) => {
  const sql = `
    UPDATE stores
    SET
      store_name = ?,
      store_code = ?,
      country = ?,
      city = ?,
      state = ?,
      address = ?,
      manager_name = ?,
      contact_number = ?,
      email = ?,
      status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      store.store_name,
      store.store_code,
      store.country,
      store.city,
      store.state,
      store.address,
      store.manager_name,
      store.contact_number,
      store.email,
      store.status,
      id,
    ],
    callback
  );
};

// ==============================
// Delete Store
// ==============================

const deleteStore = (id, callback) => {
  const sql = `
    DELETE FROM stores
    WHERE id = ?
  `;

  db.query(sql, [id], callback);
};

// ==============================
// Delete All Stores
// ==============================

const deleteAllStores = (callback) => {
  const sql = `
    DELETE FROM stores
  `;

  db.query(sql, callback);
};

module.exports = {
  getAllStores,
  getStoreById,
  checkStoreNameExists,
  checkStoreCodeExists,
  createStore,
  bulkInsertStores,
  updateStore,
  deleteStore,
  deleteAllStores,
};