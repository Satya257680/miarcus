const db = require("../config/db");

// ======================================================
// STORE PRESENCE MODEL
// ======================================================
// Every logged-in browser sends a heartbeat every ~30 s.
//
// A STORE's status is decided ONLY by that store's own
// manager (NOT by admins / ASMs / regional heads who are
// assigned to "All Stores"):
//
//   1. Users with designation "Store Manager" assigned to
//      the store (and to only a few stores).
//   2. If the store has no Store Manager -> "Assistant Store
//      Manager" is used instead.
//   3. If neither exists -> status "No Manager".
//
//   ONLINE   -> the manager sent a heartbeat within
//               ONLINE_WINDOW_SECONDS and did not log out.
//   OFFLINE  -> otherwise. The exact time they went offline
//               (logout / tab closed / last heartbeat) is
//               returned so the page can show it.
// ======================================================

const ONLINE_WINDOW_SECONDS = 90;

// A user assigned to more stores than this is a head-office /
// area level user and never decides a single store's status.
const MAX_STORES_FOR_STORE_USER = 3;

const normalizeId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const isStoreManager = (designation) =>
    /^\s*store\s*manager\s*$/i.test(String(designation || ""));

const isAssistantStoreManager = (designation) =>
    /assistant\s*store\s*manager|asst\.?\s*store\s*manager/i.test(String(designation || ""));

// ------------------------------------------------------
// TABLES
// ------------------------------------------------------

const ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_presence (
            user_id INT PRIMARY KEY,
            is_online TINYINT(1) NOT NULL DEFAULT 1,
            last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            went_offline_at DATETIME NULL,
            last_path VARCHAR(255) NULL,
            user_agent VARCHAR(255) NULL,
            ip_address VARCHAR(64) NULL,
            first_seen_today DATETIME NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_presence_last_seen (last_seen)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Upgrade for installations created by the first version.
    try {
        await db.query(`
            ALTER TABLE user_presence
            ADD COLUMN went_offline_at DATETIME NULL AFTER last_seen
        `);
    } catch (error) {
        if (error?.code !== "ER_DUP_FIELDNAME") throw error;
    }
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
            (user_id, is_online, last_seen, went_offline_at, last_path, user_agent, ip_address, first_seen_today)
        VALUES (?, 1, CURRENT_TIMESTAMP, NULL, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            first_seen_today = CASE
                WHEN first_seen_today IS NULL
                  OR DATE(first_seen_today) <> CURRENT_DATE()
                THEN CURRENT_TIMESTAMP
                ELSE first_seen_today
            END,
            is_online = 1,
            last_seen = CURRENT_TIMESTAMP,
            went_offline_at = NULL,
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
        `
        UPDATE user_presence
        SET is_online = 0,
            went_offline_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        `,
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
            status
        FROM stores
        ORDER BY store_name ASC
    `);

    // Every active user linked to a store, with presence and
    // the number of stores the user is linked to.
    const rows = await db.query(
        `
        SELECT
            us.store_id,
            u.id AS user_id,
            u.name,
            u.email,
            u.employee_id,
            u.call_contact,
            dg.designation_name AS designation,
            sc.store_count,
            p.last_seen,
            p.last_path,
            p.first_seen_today,
            CASE
                WHEN p.last_seen IS NULL THEN NULL
                ELSE TIMESTAMPDIFF(SECOND, p.last_seen, CURRENT_TIMESTAMP)
            END AS seen_seconds_ago,
            CASE
                WHEN p.went_offline_at IS NULL THEN NULL
                ELSE TIMESTAMPDIFF(SECOND, p.went_offline_at, CURRENT_TIMESTAMP)
            END AS offline_seconds_ago,
            CASE
                WHEN p.first_seen_today IS NULL
                  OR DATE(p.first_seen_today) <> CURRENT_DATE()
                THEN NULL
                ELSE TIMESTAMPDIFF(SECOND, p.first_seen_today, CURRENT_TIMESTAMP)
            END AS first_today_seconds_ago,
            CASE
                WHEN p.is_online = 1
                 AND p.last_seen >= (CURRENT_TIMESTAMP - INTERVAL ? SECOND)
                THEN 1 ELSE 0
            END AS is_online
        FROM user_stores us
        INNER JOIN users u
            ON u.id = us.user_id
        INNER JOIN (
            SELECT user_id, COUNT(DISTINCT store_id) AS store_count
            FROM user_stores
            GROUP BY user_id
        ) sc
            ON sc.user_id = u.id
        LEFT JOIN designations dg
            ON dg.id = u.designation_id
        LEFT JOIN user_presence p
            ON p.user_id = u.id
        WHERE u.status = 'Active'
          AND sc.store_count <= ?
        `,
        [ONLINE_WINDOW_SECONDS, MAX_STORES_FOR_STORE_USER]
    );

    const nowMs = Date.now();

    // Seconds-ago values are computed by MySQL itself, then turned
    // into real timestamps here — no timezone mismatch possible.
    const agoToIso = (seconds) =>
        seconds === null || seconds === undefined
            ? null
            : new Date(nowMs - Number(seconds) * 1000).toISOString();

    const toPerson = (row) => {
        const online = Number(row.is_online) === 1;

        // Exact time the person went offline:
        //  - explicit logout / tab closed -> went_offline_at
        //  - otherwise the last heartbeat received
        let offlineSecondsAgo = null;
        if (!online) {
            offlineSecondsAgo =
                row.offline_seconds_ago !== null && row.offline_seconds_ago !== undefined
                    ? Number(row.offline_seconds_ago)
                    : row.seen_seconds_ago !== null && row.seen_seconds_ago !== undefined
                        ? Number(row.seen_seconds_ago)
                        : null;
        }

        return {
            user_id: row.user_id,
            name: row.name,
            email: row.email,
            employee_id: row.employee_id,
            contact: row.call_contact || null,
            designation: row.designation || null,
            is_online: online,
            last_seen_at: agoToIso(row.seen_seconds_ago),
            last_seen_seconds_ago:
                row.seen_seconds_ago === null || row.seen_seconds_ago === undefined
                    ? null
                    : Number(row.seen_seconds_ago),
            offline_since: agoToIso(offlineSecondsAgo),
            offline_seconds_ago: offlineSecondsAgo,
            online_since_today: agoToIso(row.first_today_seconds_ago),
            last_path: row.last_path || null,
            never_logged_in: row.last_seen === null || row.last_seen === undefined
        };
    };

    const byStore = new Map();
    stores.forEach((s) => byStore.set(Number(s.id), []));

    rows.forEach((row) => {
        const list = byStore.get(Number(row.store_id));
        if (list) list.push(row);
    });

    return stores.map((store) => {
        const linked = byStore.get(Number(store.id)) || [];

        let managerRows = linked.filter((r) => isStoreManager(r.designation));
        let managerRole = "Store Manager";

        if (!managerRows.length) {
            managerRows = linked.filter((r) => isAssistantStoreManager(r.designation));
            managerRole = "Assistant Store Manager";
        }

        const managers = managerRows
            .map(toPerson)
            .sort((a, b) => {
                if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
                return (a.last_seen_seconds_ago ?? Infinity) - (b.last_seen_seconds_ago ?? Infinity);
            });

        const staff = linked
            .filter((r) => !managerRows.includes(r))
            .map(toPerson)
            .sort((a, b) => {
                if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
                return String(a.name || "").localeCompare(String(b.name || ""));
            });

        const primary = managers[0] || null;
        const onlineManagers = managers.filter((m) => m.is_online);

        let status = "no_manager";
        if (managers.length) {
            status = onlineManagers.length ? "online" : "offline";
        }

        // Most recent offline time among the store's manager(s).
        const offlineSince =
            status === "offline"
                ? managers
                    .filter((m) => m.offline_since)
                    .sort((a, b) => a.offline_seconds_ago - b.offline_seconds_ago)[0] || null
                : null;

        return {
            id: store.id,
            store_name: store.store_name,
            store_code: store.store_code,
            city: store.city,
            state: store.state,
            store_status: store.status,
            store_contact: store.contact_number,

            status,
            is_online: status === "online",

            manager_role: managers.length ? managerRole : null,
            manager_name: primary?.name || null,
            manager: primary,
            managers,

            offline_since: offlineSince?.offline_since || null,
            offline_seconds_ago: offlineSince?.offline_seconds_ago ?? null,
            never_logged_in: managers.length > 0 && managers.every((m) => m.never_logged_in),

            staff,
            staff_count: staff.length,
            staff_online: staff.filter((p) => p.is_online).length
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
