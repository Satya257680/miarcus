const db = require("../config/db");

// ==========================================================
// GET ALL STORES
// ==========================================================

const getAllStores = (callback) => {

    const sql = `

        SELECT *

        FROM stores

        ORDER BY created_at DESC

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// GET STORE BY ID
// ==========================================================

const getStoreById = (

    id,

    callback

) => {

    const sql = `

        SELECT *

        FROM stores

        WHERE id = ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            id

        ],

        callback

    );

};

// ==========================================================
// CHECK STORE NAME
// ==========================================================

const checkStoreNameExists = (

    storeName,

    callback

) => {

    const sql = `

        SELECT

            id

        FROM stores

        WHERE store_name = ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            storeName

        ],

        callback

    );

};

// ==========================================================
// CHECK STORE CODE
// ==========================================================

const checkStoreCodeExists = (

    storeCode,

    callback

) => {

    const sql = `

        SELECT

            id

        FROM stores

        WHERE store_code = ?

        LIMIT 1

    `;

    db.query(

        sql,

        [

            storeCode

        ],

        callback

    );

};

// ==========================================================
// CREATE STORE
// ==========================================================

const createStore = (

    store,

    callback

) => {

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

        VALUES
        (

            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?

        )

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

            store.status

        ],

        callback

    );

};

// ==========================================================
// BULK INSERT STORES
// ==========================================================

const bulkInsertStores = (

    stores,

    callback

) => {

    if (

        !stores ||

        stores.length === 0

    ) {

        return callback(

            null,

            {

                affectedRows: 0

            }

        );

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

    const values = stores.map(

        (store) => [

            store.store_name,

            store.store_code,

            store.country,

            store.city,

            store.state,

            store.address,

            store.manager_name,

            store.contact_number,

            store.email,

            store.status || "Active"

        ]

    );

    db.query(

        sql,

        [

            values

        ],

        callback

    );

};

// ==========================================================
// UPDATE STORE
// ==========================================================

const updateStore = (

    id,

    store,

    callback

) => {

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

            id

        ],

        callback

    );

};

// ==========================================================
// DELETE STORE
// ==========================================================

const deleteStore = (

    id,

    callback

) => {

    const sql = `

        DELETE

        FROM stores

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            id

        ],

        callback

    );

};

// ==========================================================
// DELETE ALL STORES
// ==========================================================

const deleteAllStores = (

    callback

) => {

    const sql = `

        DELETE

        FROM stores

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// EXPORT MODEL FUNCTIONS
// ==========================================================

module.exports = {

    getAllStores,

    getStoreById,

    checkStoreNameExists,

    checkStoreCodeExists,

    createStore,

    bulkInsertStores,

    updateStore,

    deleteStore,

    deleteAllStores

};