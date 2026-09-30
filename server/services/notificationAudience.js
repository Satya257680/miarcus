const db = require("../config/db");

// ======================================================
// NOTIFICATION AUDIENCE
// ------------------------------------------------------
// Decides WHO receives an in-app notification.
//
//   • Administrator / Super Admin  → every notification
//   • All-store users (ASM, RM, Area / Regional / Zonal /
//     City / Cluster Manager, Head, Director, VP, GM, CEO …
//     or anyone mapped to more than ALL_STORE_THRESHOLD
//     stores)                      → every store's
//     notification, for the modules they can access
//   • Store users (store manager, staff …)
//                                   → only notifications of
//     THEIR stores, and only for modules they can access
//
// Before this, every business change was sent to every
// active user.
//
// Configuration (optional, .env):
//   NOTIFICATION_ALL_STORE_DESIGNATIONS="asm,rm,area manager,..."
//   NOTIFICATION_ALL_STORE_THRESHOLD=3
// ======================================================

const ALL_STORE_THRESHOLD =
    Number(process.env.NOTIFICATION_ALL_STORE_THRESHOLD) > 0
        ? Number(process.env.NOTIFICATION_ALL_STORE_THRESHOLD)
        : 3;

const DEFAULT_ALL_STORE_DESIGNATIONS = [
    "asm", "area sales manager", "area manager", "area head",
    "rm", "regional manager", "regional head", "rsm",
    "zm", "zonal manager", "zonal head", "zsm",
    "city manager", "city head", "cluster manager", "cluster head",
    "operations manager", "operation manager", "ops manager", "operations head", "head of operations",
    "retail head", "business head", "sales head", "national head",
    "director", "vp", "avp", "vice president",
    "gm", "agm", "dgm", "general manager",
    "ceo", "coo", "cfo", "cto", "md", "managing director",
    "founder", "co founder", "owner",
    "super admin", "administrator"
];

const ADMIN_DESIGNATIONS = ["super admin", "superadmin", "administrator", "admin"];

const normalize = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const ALL_STORE_DESIGNATIONS = (process.env.NOTIFICATION_ALL_STORE_DESIGNATIONS || "")
    .split(",")
    .map(normalize)
    .filter(Boolean);

const allStoreDesignations = ALL_STORE_DESIGNATIONS.length
    ? ALL_STORE_DESIGNATIONS
    : DEFAULT_ALL_STORE_DESIGNATIONS;

// word-level match: "ASM - Punjab" ✓, "Assistant Store Manager" ✗ for "asm"
const designationMatches = (designation, list) => {
    const text = ` ${normalize(designation)} `;
    if (!text.trim()) return false;
    return list.some((item) => text.includes(` ${item} `));
};

// Only a designation that IS "Admin" / "Super Admin" / "Administrator"
// ("Admin Executive" is not an administrator).
const isAdminDesignation = (designation) => ADMIN_DESIGNATIONS.includes(normalize(designation));

const isAllStoreDesignation = (designation) => {
    // "Store Manager" / "Store Head" / "Assistant Store Manager" are store level.
    if (/\bstore\b/.test(normalize(designation))) return false;
    return designationMatches(designation, allStoreDesignations);
};

// ------------------------------------------------------
// Module → permission names (user_permissions.module_name)
// ------------------------------------------------------
const MODULE_PERMISSIONS = {
    "Action Points": ["Action Points"],
    "Checklist": ["Checklist Submission", "Checklist Submit", "Checklist Reports"],
    "Checklist Submission": ["Checklist Submission", "Checklist Submit", "Checklist Reports"],
    "Checklist Reports": ["Checklist Reports"],
    "Checklist Types": ["Checklist Types"],
    "Questions": ["Questions"],
    "Departments": ["Departments"],
    "Designations": ["Designations"],
    "Stores": ["Store Management", "Stores"],
    "Users": ["Users"],
    "Reports To": ["Reports To"],
    "Announcements": ["Announcements"],
    "New Store Openings": ["New Store Openings"],
    "NSO Rules": ["NSO Rules"],
    "NSO Tracking": ["NSO Tracking", "New Store Openings"],
    "Expenses": ["Expenses"],
    "Petty Cash": ["Petty Cash"],
    "Asset Master": ["Asset Master"],
    "Attendance": ["Attendance"],
    "Collection Tracking": ["Collection Tracking"],
    "Travel Plan": ["Travel Plan", "Visit Planner", "Sales Team"],
    "Sales Team": ["Sales Team", "Travel Plan", "Visit Planner", "Sales Review"],
    "Gallery": ["Gallery"],
    "Quiz": ["Quiz"],
    "Activity Center": ["Activity Center"],
    "Daily Collection": ["Daily Collection"],
    "Billing": ["Billing"]
};

// Modules whose records belong to a store. Store users only hear
// about their own stores here.
const STORE_SCOPED = new Set([
    "Action Points",
    "Checklist",
    "Checklist Submission",
    "Checklist Reports",
    "New Store Openings",
    "NSO Tracking",
    "Expenses",
    "Petty Cash",
    "Asset Master",
    "Attendance",
    "Collection Tracking",
    "Gallery",
    "Daily Collection",
    "Billing"
]);

// Tables used to find the store of a record (by id)
const STORE_TABLES = {
    "Action Points": "action_points",
    "Checklist": "checklist_submissions",
    "Checklist Submission": "checklist_submissions",
    "Checklist Reports": "checklist_submissions",
    "Expenses": "expenses",
    "Attendance": "attendance_records",
    "Gallery": "gallery_photos",
    "New Store Openings": "new_store_openings",
    "Asset Master": "marketing_assets"
};

const permissionsFor = (moduleName) => MODULE_PERMISSIONS[moduleName] || [moduleName];

const isStoreScoped = (moduleName) => STORE_SCOPED.has(moduleName);

const toIds = (values) =>
    [...new Set((Array.isArray(values) ? values : [values])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0))];

// ------------------------------------------------------
// Store of a record (cached column check)
// ------------------------------------------------------
const columnCache = new Map();

const hasStoreColumn = async (table) => {
    if (columnCache.has(table)) return columnCache.get(table);
    try {
        const rows = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'store_id'`);
        const ok = rows.length > 0;
        columnCache.set(table, ok);
        return ok;
    } catch {
        columnCache.set(table, false);
        return false;
    }
};

async function getRecordStoreId(moduleName, recordId) {
    const table = STORE_TABLES[moduleName];
    const id = Number(recordId);
    if (!table || !Number.isInteger(id) || id <= 0) return null;
    if (!(await hasStoreColumn(table))) return null;
    try {
        const rows = await db.query(`SELECT store_id FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
        const storeId = Number(rows[0]?.store_id);
        return Number.isInteger(storeId) && storeId > 0 ? storeId : null;
    } catch {
        return null;
    }
}

// ------------------------------------------------------
// Everyone's access profile (small table, cached 60s)
// ------------------------------------------------------
let profileCache = { at: 0, users: [] };

async function loadProfiles() {
    if (Date.now() - profileCache.at < 60 * 1000) return profileCache.users;

    const users = await db.query(`
        SELECT
            u.id,
            u.is_admin,
            dg.designation_name
        FROM users u
        LEFT JOIN designations dg ON dg.id = u.designation_id
        WHERE u.status = 'Active'
    `);

    let stores = [];
    try {
        stores = await db.query(`SELECT user_id, store_id FROM user_stores`);
    } catch {
        stores = [];
    }

    let permissions = [];
    try {
        permissions = await db.query(`
            SELECT user_id, module_name
            FROM user_permissions
            WHERE permission IN ('View', 'Add', 'Edit', 'Full')
        `);
    } catch {
        permissions = [];
    }

    const storeMap = new Map();
    stores.forEach((row) => {
        const uid = Number(row.user_id);
        if (!storeMap.has(uid)) storeMap.set(uid, new Set());
        storeMap.get(uid).add(Number(row.store_id));
    });

    const permMap = new Map();
    permissions.forEach((row) => {
        const uid = Number(row.user_id);
        if (!permMap.has(uid)) permMap.set(uid, new Set());
        permMap.get(uid).add(String(row.module_name || "").toLowerCase());
    });

    const profiles = users.map((row) => {
        const id = Number(row.id);
        const storeSet = storeMap.get(id) || new Set();
        const admin =
            Number(row.is_admin) === 1 ||
            row.is_admin === true ||
            isAdminDesignation(row.designation_name);
        return {
            id,
            admin,
            allStores: admin || storeSet.size > ALL_STORE_THRESHOLD || isAllStoreDesignation(row.designation_name),
            stores: storeSet,
            modules: permMap.get(id) || new Set()
        };
    });

    profileCache = { at: Date.now(), users: profiles };
    return profiles;
}

const clearCache = () => {
    profileCache = { at: 0, users: [] };
};

// ------------------------------------------------------
// getAudience
//   moduleName   – "Checklist", "Action Points", …
//   storeIds     – stores the event belongs to (optional)
//   actorId      – who made the change
//   includeActor – also notify the actor (default false)
//   extraUserIds – always notified (assignee, owner …)
// ------------------------------------------------------
async function getAudience({
    moduleName,
    storeIds = [],
    actorId = null,
    includeActor = false,
    extraUserIds = []
} = {}) {
    const profiles = await loadProfiles();
    const moduleKeys = permissionsFor(moduleName).map((name) => name.toLowerCase());
    const stores = toIds(storeIds);
    const storeScoped = isStoreScoped(moduleName);
    const actor = Number(actorId) || 0;

    const recipients = new Set(toIds(extraUserIds));

    for (const user of profiles) {
        if (user.id === actor && !includeActor) continue;

        if (user.admin) {
            recipients.add(user.id);
            continue;
        }

        // Module access
        if (!moduleKeys.some((key) => user.modules.has(key))) continue;

        // Store access
        if (!storeScoped || user.allStores) {
            recipients.add(user.id);
            continue;
        }

        if (stores.length && stores.some((storeId) => user.stores.has(storeId))) {
            recipients.add(user.id);
        }
        // Store user + unknown store → not notified (was: everyone).
    }

    if (actor && !includeActor) recipients.delete(actor);

    // extra users must still be active
    const activeIds = new Set(profiles.map((p) => p.id));
    return [...recipients].filter((id) => activeIds.has(id));
}

module.exports = {
    getAudience,
    getRecordStoreId,
    isStoreScoped,
    permissionsFor,
    isAllStoreDesignation,
    clearCache
};
