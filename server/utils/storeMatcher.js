// ==========================================================
// SHARED STORE NAME/CODE RESOLVER
// ==========================================================
//
// Every bulk upload that accepts a free-text "Store" column
// (Action Points, Checklist Reports, and any module added later)
// needs to turn a human-typed/exported store label into a numeric
// store_id. A real file usually contains whatever the on-screen
// "Store Name" cell shows, which in Mi Arcus is often a composite
// string such as:
//
//     "MRPL - MVN DEHRADUN (589)"
//
// (a brand/code prefix, the store name, and a trailing store code
// in parentheses). A plain exact/substring match against the
// `store_name` column alone misses that composite format, which
// silently fails every single row of an otherwise valid file.
//
// This resolver is shared by every bulk-upload path so a store
// recognized in one module (e.g. Checklist Reports) is recognized
// the same way everywhere else (e.g. Action Points). It tries, in
// order, and stops at the first hit:
//
//   1. A bare numeric value, treated as the store id directly.
//   2. An exact (case-insensitive) match on store_name or store_code.
//   3. The code inside a trailing "(...)" segment, matched against
//      store_code or id.
//   4. A bidirectional partial match — the given text contains the
//      store_name, OR the store_name contains the given text, OR
//      the store_code appears in the text — preferring the longest
//      store_name match so a short code doesn't match many stores.
//
// Returns the matching store id, or null when nothing matches.
// ==========================================================

const db = require("../config/db");

const queryOne = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows?.[0] || null);
        });
    });

const resolveStoreIdFuzzy = async (storeText) => {

    const raw = String(storeText || "").trim();

    if (!raw) return null;

    // 1. A bare numeric value is almost certainly already a store id.
    if (/^\d+$/.test(raw)) {

        const byId = await queryOne(
            `SELECT id FROM stores WHERE id = ? LIMIT 1`,
            [Number(raw)]
        );

        if (byId?.id) return byId.id;
    }

    // 2. Exact (case-insensitive) match on name or code.
    let store = await queryOne(
        `SELECT id FROM stores
         WHERE LOWER(store_name) = LOWER(?) OR LOWER(store_code) = LOWER(?)
         LIMIT 1`,
        [raw, raw]
    );

    if (store?.id) return store.id;

    // 3. A trailing "(CODE)" segment, e.g. "MRPL - MVN DEHRADUN (589)".
    const trailingCode = raw.match(/\(([^()]+)\)\s*$/);

    if (trailingCode) {

        const code = trailingCode[1].trim();

        store = await queryOne(
            `SELECT id FROM stores
             WHERE LOWER(store_code) = LOWER(?) OR id = ?
             LIMIT 1`,
            [code, /^\d+$/.test(code) ? Number(code) : 0]
        );

        if (store?.id) return store.id;
    }

    // 4. Bidirectional partial match, preferring the longest/most
    // specific store_name so a short code doesn't match many stores.
    store = await queryOne(
        `SELECT id FROM stores
         WHERE store_name LIKE CONCAT('%', ?, '%')
            OR ? LIKE CONCAT('%', store_name, '%')
            OR store_code LIKE CONCAT('%', ?, '%')
         ORDER BY LENGTH(store_name) DESC
         LIMIT 1`,
        [raw, raw, raw]
    );

    return store?.id || null;
};

module.exports = { resolveStoreIdFuzzy };
