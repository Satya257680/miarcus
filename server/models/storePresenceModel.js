const db = require("../config/db");

// ======================================================
// STORE PRESENCE MODEL
// ======================================================
// Tracks which users currently have the Mi Arcus website
// open (heartbeat every ~45 seconds from the browser) and
// rolls that up per store:
//
//   Store is ONLINE  -> at least one user assigned to the
//                       store (or its manager) sent a
//                       heartbeat within ONLINE_WINDOW_SECONDS
//   Store is OFFLINE -> nobody from that store is active
// ======================================================

const ONLINE_WINDOW_SECONDS = 120;

const normalizeId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// ------------------------------------------------------
// TABLES
// ------------------------------------------------------

const ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_presence (
            user_id INT PRIMARY KEY,
            is_online TINYINT(1) NOT NULL DEFAULT 1,
            last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_path VARCHAR(255) NULL,
            user_agent VARCHAR(255) NULL,
            ip_address VARCHAR(64) NULL,
            first_seen_today DATETIME NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_presence_last_seen (last_seen)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
};

// ------------------------------------------------------
// HEARTBEAT / OFFLINE
// ------------------------------------------------------

const heartbeat = async (userId, { path = null, userAgent = null, ip = null } = {}) => {
    const id = normalizeId(userId);
    if (!id) return;

    await db.query(
        `
        INSERT INTO user_presence
            (user_id, is_online, last_seen, last_path, user_agent, ip_address, first_seen_today)
        VALUES (?, 1, CURRENT_TIMESTAMP, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            first_seen_today = CASE
                WHEN first_seen_today IS NULL
                  OR DATE(first_seen_today) <> CURRENT_DATE()
                THEN CURRENT_TIMESTAMP
                ELSE first_seen_today
            END,
            is_online = 1,
            last_seen = CURRENT_TIMESTAMP,
            last_path = VALUES(last_path),
            user_agent = VALUES(user_agent),
            ip_address = VALUES(ip_address)
        `,
        [
            id,
            path ? String(path).slice(0, 255) : null,
            userAgent ? String(userAgent).slice(0, 255) : null,
            ip ? String(ip).slice(0, 64) : null
        ]
    );
};

const markOffline = async (userId) => {
    const id = normalizeId(userId);
    if (!id) return;

    await db.query(
        `UPDATE user_presence SET is_online = 0 WHERE user_id = ?`,
        [id]
    );
};

// ------------------------------------------------------
// STORE STATUS (ADMIN)
// ------------------------------------------------------

const getStoreStatus = async () => {

    const stores = await db.query(`
        SELECT
            id,
            store_name,
            store_code,
            city,
            state,
            manager_name,
            contact_number,
            email,
            status
        FROM stores
        ORDER BY store_name ASC
    `);

    // Every active user assigned to a store + their presence.
    const staffRows = await db.query(
        `
        SELECT
            us.store_id,
            u.id AS user_id,
            u.name,
            u.email,
            u.employee_id,
            u.call_contact,
            dg.designation_name AS designation,
            p.last_seen,
            p.last_path,
            p.first_seen_today,
            CASE
                WHEN p.last_seen IS NULL THEN NULL
                ELSE TIMESTAMPDIFF(SECOND, p.last_seen, CURRENT_TIMESTAMP)
            END AS seconds_ago,
            CASE
                WHEN p.is_online = 1
                 AND p.last_seen >= (CURRENT_TIMESTAMP - INTERVAL ? SECOND)
                THEN 1 ELSE 0
            END AS is_online
        FROM user_stores us
        INNER JOIN users u
            ON u.id = us.user_id
        LEFT JOIN designations dg
            ON dg.id = u.designation_id
        LEFT JOIN user_presence p
            ON p.user_id = u.id
        WHERE u.status = 'Active'
        `,
        [ONLINE_WINDOW_SECONDS]
    );

    // Explicit store managers (Team Chat → store manager mapping).
    let managerRows = [];
    try {
        managerRows = await db.query(
            `
            SELECT
                m.store_id,
                u.id AS user_id,
                u.name,
                u.email,
                u.employee_id,
                u.call_contact,
                dg.designation_name AS designation,
                p.last_seen,
                p.last_path,
                p.first_seen_today,
                CASE
                    WHEN p.last_seen IS NULL THEN NULL
                    ELSE TIMESTAMPDIFF(SECOND, p.last_seen, CURRENT_TIMESTAMP)
                END AS seconds_ago,
                CASE
                    WHEN p.is_online = 1
                     AND p.last_seen >= (CURRENT_TIMESTAMP - INTERVAL ? SECOND)
                    THEN 1 ELSE 0
                END AS is_online
            FROM chat_store_managers m
            INNER JOIN users u
                ON u.id = m.user_id
            LEFT JOIN designations dg
                ON dg.id = u.designation_id
            LEFT JOIN user_presence p
                ON p.user_id = u.id
            WHERE u.status = 'Active'
            `,
            [ONLINE_WINDOW_SECONDS]
        );
    } catch (error) {
        if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
        managerRows = [];
    }

    const toPerson = (row, role) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        employee_id: row.employee_id,
        contact: row.call_contact || null,
        designation: row.designation || null,
        role,
        is_online: Number(row.is_online) === 1,
        last_seen: row.last_seen || null,
        seconds_ago: row.seconds_ago === null || row.seconds_ago === undefined
            ? null
            : Number(row.seconds_ago),
        last_path: row.last_path || null,
        first_seen_today: row.first_seen_today || null
    });

    const byStore = new Map();

    stores.forEach((store) => {
        byStore.set(Number(store.id), { people: new Map(), managerUser: null });
    });

    managerRows.forEach((row) => {
        const bucket = byStore.get(Number(row.store_id));
        if (!bucket) return;
        const person = toPerson(row, "Manager");
        bucket.managerUser = person;
        bucket.people.set(person.user_id, person);
    });

    staffRows.forEach((row) => {
        const bucket = byStore.get(Number(row.store_id));
        if (!bucket) return;
        if (bucket.people.has(row.user_id)) return;
        const isManagerByDesignation = /manager/i.test(String(row.designation || ""));
        bucket.people.set(row.user_id, toPerson(row, isManagerByDesignation ? "Manager" : "Staff"));
    });

    const latest = (list) =>
        list
            .filter((p) => p.seconds_ago !== null)
            .sort((a, b) => a.seconds_ago - b.seconds_ago)[0] || null;

    return stores.map((store) => {
        const bucket = byStore.get(Number(store.id));
        const people = [...bucket.people.values()];

        // Manager resolution: mapped manager → user whose name matches
        // the store's manager_name → first staff with "manager" designation.
        const storeManagerName = String(store.manager_name || "").trim();

        let manager =
            bucket.managerUser ||
            (storeManagerName
                ? people.find(
                    (p) => String(p.name || "").trim().toLowerCase() === storeManagerName.toLowerCase()
                )
                : null) ||
            people.find((p) => p.role === "Manager") ||
            null;

        const onlineUsers = people
            .filter((p) => p.is_online)
            .sort((a, b) => a.seconds_ago - b.seconds_ago);

        const lastActive = latest(people);

        return {
            id: store.id,
            store_name: store.store_name,
            store_code: store.store_code,
            city: store.city,
            state: store.state,
            store_status: store.status,
            store_contact: store.contact_number,
            store_email: store.email,

            manager_name: storeManagerName || manager?.name || null,
            manager_user: manager,
            manager_online: Boolean(manager?.is_online),

            is_online: onlineUsers.length > 0,
            online_count: onlineUsers.length,
            staff_count: people.length,
            online_users: onlineUsers,
            staff: people.sort((a, b) => {
                if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
                return String(a.name || "").localeCompare(String(b.name || ""));
            }),

            last_active_at: lastActive?.last_seen || null,
            last_active_seconds_ago: lastActive?.seconds_ago ?? null,
            last_active_by: lastActive?.name || null
        };
    });
};

module.exports = {
    ONLINE_WINDOW_SECONDS,
    ensureTables,
    heartbeat,
    markOffline,
    getStoreStatus
};
