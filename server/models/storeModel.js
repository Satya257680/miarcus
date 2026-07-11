const db = require("../config/db");

const getAllStores = (callback) => {

    const sql = `
        SELECT
            id,
            store_name,
            store_code,
            city,
            state
        FROM stores
        ORDER BY store_name ASC
    `;

    db.query(sql, callback);

};

module.exports = {
    getAllStores,
};