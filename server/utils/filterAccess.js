// ======================================================
// FILTER ACCESS CONTROL
// ======================================================
//
// Three separate layers:
//
//   1. RBAC (user_permissions + permissionMiddleware) decides whether a
//      user may open a module and what they may do there. UNCHANGED.
//
//   2. Filter Access (this file + table user_filter_access) decides,
//      per user and per module, which Department / Designation / Store /
//      Checklist Type / NSO Project values the user may filter by and
//      see data for. It never grants a module: every route still runs
//      permissionMiddleware first.
//
//   3. Data scope: the same policies are turned into SQL and applied by
//      the backend to lists, counts, KPI cards, exports and single-record
//      routes, so hiding a dropdown option is never the only protection.
//
// Policy per filter (one row per user + module + filter):
//
//   default  – no row stored. Existing behaviour is kept exactly:
//              data is not narrowed, dropdowns follow the existing
//              reference rules (utils/userAccessScope.js).
//   all      – every value; data not narrowed.
//   selected – only value_ids. An empty selection means NOTHING, never
//              "everything".
//   none     – the filter is hidden and records that carry a value for
//              that dimension are denied.
//
// Precedence for every filter (resolveScope):
//
//   1. the module's own rule      (user_filter_access, module_name = module)
//   2. the user's global default  (user_filter_access, module_name = "*")
//   3. existing role-based rules  (nothing stored = "default")
//
// Global defaults for Department / Store / Checklist Type are also
// mirrored into the older user_access_overrides table, which trims those
// dropdown lists across the rest of the portal, so both stay in step.
// Rows that exist only in user_access_overrides (set before this
// feature) are read as global defaults.
//
// Policies are read from the database on every request (two indexed
// queries), so a change made by an administrator applies to the user's
// very next request without a redeploy or cache flush.
// ======================================================

const db = require("../config/db");
const { filterReferenceRows } = require("./userAccessScope");

const POLICIES = ["default", "all", "selected", "none"];

const FILTER_KEYS = ["department", "designation", "store", "checklist_type", "nso_project"];

const FILTER_LABELS = {
    department: "Department",
    designation: "Designation",
    store: "Store",
    checklist_type: "Checklist Type",
    nso_project: "NSO Project",
};

// Request parameter that carries each filter's value (query string or body).
const FILTER_PARAMS = {
    department: "department_id",
    designation: "designation_id",
    store: "store_id",
    checklist_type: "checklist_type_id",
    nso_project: "new_store_opening_id",
};

// Other spellings some modules use for the same value.
const FILTER_PARAM_ALIASES = {
    store: ["store_id", "storeId"],
};

// Modules whose backend enforces Filter Access. Only these are offered in
// the admin screen, so nothing is configurable that would not be enforced.
//   filters  – the filter types that module really has (only these are
//              shown to admins and applied)
//   rbac     – existing RBAC module + level needed to read its filter
//              options (same level its list endpoint already requires)
//   guard    – "pettyCash" for modules with their own permission check
//   note     – shown under the module picker in the admin screen
const MODULES = {
    "Action Points": {
        filters: ["department", "designation", "store", "checklist_type", "nso_project"],
        rbac: ["Action Points", "View"],
        note: "List, search, KPI cards, exports and every record action.",
    },
    "Checklist Reports": {
        filters: ["store"],
        rbac: ["Checklist Reports", "View"],
        note: "Report list, KPI cards, export, delete and report details.",
    },
    "Checklist Tracker": {
        filters: ["store"],
        rbac: ["Checklist Reports", "View"],
        note: "Store compliance shown on the Checklist Tracker page.",
    },
    "Attendance Reports": {
        filters: ["store"],
        rbac: ["Attendance", "Full"],
        note: "Attendance report rows, store list and delete.",
    },
    "Billing": {
        filters: ["store"],
        rbac: ["Billing", "View"],
        note: "Bills list, bill details, Daily Billing Report and store list.",
    },
    "Petty Cash": {
        filters: ["store"],
        guard: "pettyCash",
        note: "Advances, expenses, deposits, audit trail, summary and store list.",
    },
};

// Pseudo-module name for a user's global defaults (all modules).
const GLOBAL = "*";

// Global keys that are mirrored into user_access_overrides.
const LEGACY_FIELDS = {
    department: { ids: "department_ids", all: "all_departments" },
    store: { ids: "store_ids", all: "all_stores" },
    checklist_type: { ids: "checklist_type_ids", all: "all_checklist_types" },
};

const isAdministrator = (user) =>
    [1, "1", true].includes(user?.is_admin) ||
    [1, "1", true].includes(user?.is_super_admin);

const toIds = (value) => {
    if (value == null || value === "") return [];
    let list = value;
    if (typeof list === "string") {
        try { list = JSON.parse(list); } catch { list = list.split(","); }
    }
    if (!Array.isArray(list)) list = [list];
    return [...new Set(list.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
};

// ------------------------------------------------------
// TABLE
// ------------------------------------------------------

let tableReady = null;

const ensureTable = () => {
    if (!tableReady) {
        tableReady = db.query(`
            CREATE TABLE IF NOT EXISTS user_filter_access (
                user_id BIGINT NOT NULL,
                module_name VARCHAR(100) NOT NULL,
                filter_key VARCHAR(40) NOT NULL,
                policy ENUM('all','selected','none') NOT NULL,
                value_ids JSON NULL,
                updated_by BIGINT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, module_name, filter_key),
                INDEX idx_user_filter_access_module (module_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `).catch((error) => {
            tableReady = null;
            throw error;
        });
    }
    return tableReady;
};

// ------------------------------------------------------
// READ POLICIES
// ------------------------------------------------------

const emptyPolicies = (moduleName) => {
    const keys = moduleName === GLOBAL ? FILTER_KEYS : (MODULES[moduleName]?.filters || FILTER_KEYS);
    return Object.fromEntries(keys.map((key) => [key, { policy: "default", ids: [] }]));
};

const getPolicies = async (userId, moduleName) => {
    await ensureTable();
    const policies = emptyPolicies(moduleName);
    const rows = await db.query(
        `SELECT filter_key, policy, value_ids
         FROM user_filter_access
         WHERE user_id = ? AND module_name = ?`,
        [Number(userId), moduleName]
    );
    for (const row of rows || []) {
        if (!policies[row.filter_key]) continue;
        if (!POLICIES.includes(row.policy)) continue;
        policies[row.filter_key] = {
            policy: row.policy,
            ids: row.policy === "selected" ? toIds(row.value_ids) : [],
        };
    }
    return policies;
};

// Older per-user overrides (user_access_overrides) read as global rules.
const readLegacyGlobal = async (userId) => {
    let row = null;
    try {
        const rows = await db.query(
            `SELECT department_ids, all_departments, store_ids, all_stores,
                    checklist_type_ids, all_checklist_types
             FROM user_access_overrides WHERE user_id = ? LIMIT 1`,
            [Number(userId)]
        );
        row = rows?.[0] || null;
    } catch (error) {
        if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
    }
    const result = {};
    if (!row) return result;
    for (const [key, field] of Object.entries(LEGACY_FIELDS)) {
        const all = row[field.all];
        const ids = row[field.ids] == null ? null : toIds(row[field.ids]);
        if (all != null && Number(all) === 1) result[key] = { policy: "all", ids: [] };
        else if (all != null || ids) result[key] = { policy: "selected", ids: ids || [] };
    }
    return result;
};

// A user's global defaults: "*" rows first, older overrides as fallback.
const getGlobalPolicies = async (userId) => {
    const policies = await getPolicies(userId, GLOBAL);
    const legacy = await readLegacyGlobal(userId);
    for (const [key, rule] of Object.entries(legacy)) {
        if (policies[key]?.policy === "default") policies[key] = rule;
    }
    return policies;
};

// Module rule > global default > existing rules. `sources` says which
// layer decided each filter ("module" | "global" | "default").
const getEffectivePolicies = async (userId, moduleName) => {
    const own = await getPolicies(userId, moduleName);
    const global = await getGlobalPolicies(userId);
    const policies = {};
    const sources = {};
    for (const key of Object.keys(own)) {
        if (own[key].policy !== "default") {
            policies[key] = own[key];
            sources[key] = "module";
        } else if (global[key] && global[key].policy !== "default") {
            policies[key] = global[key];
            sources[key] = "global";
        } else {
            policies[key] = { policy: "default", ids: [] };
            sources[key] = "default";
        }
    }
    return { policies, sources };
};

// Resolves the effective scope for the signed-in user. Administrators
// bypass Filter Access exactly like they bypass RBAC.
const resolveScope = async (req, moduleName) => {
    if (isAdministrator(req.user)) {
        return { module: moduleName, admin: true, restricted: false, policies: emptyPolicies(moduleName), sources: {} };
    }
    const { policies, sources } = await getEffectivePolicies(req.user.id, moduleName);
    const restricted = Object.values(policies).some((p) => p.policy === "selected" || p.policy === "none");
    return { module: moduleName, admin: false, restricted, policies, sources };
};

// ------------------------------------------------------
// WRITE (admin) – shared by single-user save and bulk assignment
// ------------------------------------------------------

// Validates { key: { policy, ids } } for a module (or GLOBAL). Returns
// { changes } or { error }. IDs must exist in their master table.
const validateChanges = async (moduleName, input) => {
    if (moduleName !== GLOBAL && !MODULES[moduleName]) {
        return { error: "Filter access is not available for this module." };
    }
    if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length) {
        return { error: "No filter settings were sent." };
    }
    const allowedKeys = moduleName === GLOBAL ? FILTER_KEYS : MODULES[moduleName].filters;
    const changes = [];
    for (const [key, value] of Object.entries(input)) {
        if (!allowedKeys.includes(key)) {
            return { error: `Unknown filter "${key}".` };
        }
        const policy = String(value?.policy || "").toLowerCase();
        if (!POLICIES.includes(policy)) {
            return { error: `Invalid access policy for ${FILTER_LABELS[key]}.` };
        }
        const ids = policy === "selected" ? toIds(value?.ids) : [];
        if (policy === "selected" && ids.length) {
            const rows = await loadMaster(key, ids);
            const valid = new Set(rows.map((r) => Number(r.id)));
            if (ids.some((id) => !valid.has(id))) {
                return { error: `Some selected ${FILTER_LABELS[key]} values no longer exist. Refresh and try again.` };
            }
        }
        changes.push({ key, policy, ids });
    }
    return { changes };
};

let legacyReady = null;
const ensureLegacyTable = () => {
    if (!legacyReady) {
        legacyReady = db.query(`CREATE TABLE IF NOT EXISTS user_access_overrides (
            user_id BIGINT NOT NULL PRIMARY KEY,
            department_ids JSON NULL,
            all_departments TINYINT(1) NULL,
            store_ids JSON NULL,
            all_stores TINYINT(1) NULL,
            checklist_type_ids JSON NULL,
            all_checklist_types TINYINT(1) NULL,
            module_names JSON NULL,
            updated_by BIGINT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_access_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch((error) => {
            legacyReady = null;
            throw error;
        });
    }
    return legacyReady;
};

// Keeps user_access_overrides (portal-wide list trimming) in step with a
// global Department / Store / Checklist Type rule. Other columns
// (e.g. module_names) are never touched.
const mirrorLegacy = async (userId, change, actorId) => {
    const field = LEGACY_FIELDS[change.key];
    if (!field) return;
    let all = null;
    let ids = null;
    if (change.policy === "all") all = 1;
    if (change.policy === "selected") { all = 0; ids = JSON.stringify(change.ids); }
    if (change.policy === "none") { all = 0; ids = JSON.stringify([]); }
    await ensureLegacyTable();
    await db.query(
        `INSERT INTO user_access_overrides (user_id, ${field.ids}, ${field.all}, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE ${field.ids} = VALUES(${field.ids}),
                                 ${field.all} = VALUES(${field.all}),
                                 updated_by = VALUES(updated_by)`,
        [Number(userId), ids, all, actorId || null]
    );
};

// Applies already-validated changes for one user. Filters not listed in
// `changes` are left exactly as they were.
const applyRules = async (userId, moduleName, changes, actorId) => {
    await ensureTable();
    for (const change of changes) {
        if (change.policy === "default") {
            await db.query(
                `DELETE FROM user_filter_access WHERE user_id = ? AND module_name = ? AND filter_key = ?`,
                [Number(userId), moduleName, change.key]
            );
        } else {
            await db.query(
                `INSERT INTO user_filter_access (user_id, module_name, filter_key, policy, value_ids, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE policy = VALUES(policy), value_ids = VALUES(value_ids),
                                         updated_by = VALUES(updated_by)`,
                [
                    Number(userId),
                    moduleName,
                    change.key,
                    change.policy,
                    change.policy === "selected" ? JSON.stringify(change.ids) : null,
                    actorId || null,
                ]
            );
        }
        if (moduleName === GLOBAL) await mirrorLegacy(userId, change, actorId);
    }
};

// Clears every global default (both tables) for a user.
const clearGlobal = async (userId, actorId) => {
    await applyRules(
        userId,
        GLOBAL,
        FILTER_KEYS.map((key) => ({ key, policy: "default", ids: [] })),
        actorId
    );
};

// ------------------------------------------------------
// GROUP MATCHING (bulk assignment)
// ------------------------------------------------------
// Users in ANY of the chosen departments AND ANY of the chosen
// designations AND assigned to ANY of the chosen stores (only the
// groups that were chosen count).
const findUsersByGroup = async ({ department_ids, designation_ids, store_ids } = {}) => {
    const dept = toIds(department_ids);
    const desig = toIds(designation_ids);
    const stores = toIds(store_ids);
    if (!dept.length && !desig.length && !stores.length) return null;

    const where = ["COALESCE(u.status, 'Active') <> 'Deleted'"];
    const params = [];
    if (dept.length) { where.push("u.department_id IN (?)"); params.push(dept); }
    if (desig.length) { where.push("u.designation_id IN (?)"); params.push(desig); }
    if (stores.length) {
        where.push("EXISTS (SELECT 1 FROM user_stores gus WHERE gus.user_id = u.id AND gus.store_id IN (?))");
        params.push(stores);
    }

    return (await db.query(
        `SELECT u.id, u.name, u.employee_id, u.status, u.is_admin,
                d.department_name AS department, dg.designation_name AS designation,
                (SELECT GROUP_CONCAT(s.store_name ORDER BY s.store_name SEPARATOR ', ')
                 FROM user_stores us INNER JOIN stores s ON s.id = us.store_id
                 WHERE us.user_id = u.id) AS stores
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         LEFT JOIN designations dg ON dg.id = u.designation_id
         WHERE ${where.join(" AND ")}
         ORDER BY u.name`,
        params
    )) || [];
};

// ------------------------------------------------------
// VALIDATION
// ------------------------------------------------------

const isValueAllowed = (scope, key, id) => {
    const rule = scope?.policies?.[key];
    if (!rule || scope.admin) return true;
    if (rule.policy === "default" || rule.policy === "all") return true;
    if (rule.policy === "none") return false;
    return rule.ids.includes(Number(id));
};

// Checks every filter value the browser sent (query string and/or body).
// Returns a list of { key, value } that are outside the user's scope.
const findViolations = (scope, ...sources) => {
    const violations = [];
    if (!scope || scope.admin) return violations;
    for (const key of Object.keys(scope.policies)) {
        const params = FILTER_PARAM_ALIASES[key] || [FILTER_PARAMS[key]];
        for (const source of sources) {
            if (!source || typeof source !== "object") continue;
            for (const param of params) {
                const raw = source[param];
                if (raw === undefined || raw === null || raw === "") continue;
                for (const id of String(raw).split(",").map((v) => v.trim()).filter(Boolean)) {
                    if (!isValueAllowed(scope, key, id)) violations.push({ key, value: id });
                }
            }
        }
    }
    return violations;
};

// ------------------------------------------------------
// SQL – ACTION POINTS (alias `ap`)
// ------------------------------------------------------
//
// Only references `ap.*` (plus self-contained sub-queries), so it can be
// appended to any Action Points query regardless of its joins.
//
// Department of an Action Point = its own department_id, otherwise the
// department of the employee who submitted the checklist.
// Designation of an Action Point = the submitting employee's designation.

const AP_SUBMITTER = (column) => `(
    SELECT fa_u.${column}
    FROM checklist_submissions fa_cs
    INNER JOIN users fa_u ON fa_u.id = fa_cs.submitted_by
    WHERE fa_cs.id = ap.submission_id
    LIMIT 1
)`;

const AP_COLUMNS = {
    store: "ap.store_id",
    department: `COALESCE(ap.department_id, ${AP_SUBMITTER("department_id")})`,
    designation: AP_SUBMITTER("designation_id"),
    nso_project: "ap.new_store_opening_id",
    checklist_type: `(
        SELECT fa_q.checklist_type_id
        FROM questions fa_q
        WHERE fa_q.id = ap.question_id
        LIMIT 1
    )`,
};

const buildScopeSql = (scope, columns = AP_COLUMNS) => {
    const parts = [];
    const params = [];
    if (!scope || scope.admin) return { sql: "", params };
    for (const [key, rule] of Object.entries(scope.policies)) {
        const column = columns[key];
        if (!column) continue;
        if (rule.policy === "selected") {
            if (!rule.ids.length) {
                parts.push("1 = 0");
            } else {
                parts.push(`${column} IN (?)`);
                params.push(rule.ids);
            }
        } else if (rule.policy === "none") {
            parts.push(`${column} IS NULL`);
        }
    }
    return { sql: parts.length ? `(${parts.join(" AND ")})` : "", params };
};

// Store restriction for modules that only have a Store filter.
// `column` is the store column in that module's query, e.g. "cs.store_id".
// Returns { sql, params } ("" when the user is not restricted by store).
const storeScopeSql = (scope, column) => {
    if (!scope || scope.admin) return { sql: "", params: [] };
    const rule = scope.policies?.store;
    if (!rule || rule.policy === "default" || rule.policy === "all") return { sql: "", params: [] };
    if (rule.policy === "none" || !rule.ids.length) return { sql: "1 = 0", params: [] };
    return { sql: `${column} IN (?)`, params: [rule.ids] };
};

// The store IDs the user may see in a module, or null = no restriction.
const allowedStoreIds = (scope) => {
    if (!scope || scope.admin) return null;
    const rule = scope.policies?.store;
    if (!rule || rule.policy === "default" || rule.policy === "all") return null;
    if (rule.policy === "none") return [];
    return rule.ids;
};

// Keeps only rows whose store is allowed (for small lookup lists).
const filterRowsByStore = (scope, rows, key = "id") => {
    const allowed = allowedStoreIds(scope);
    if (!allowed) return rows;
    const set = new Set(allowed.map(Number));
    return (rows || []).filter((row) => set.has(Number(row?.[key])));
};

// Returns the subset of `ids` (Action Point IDs) inside the scope.
const actionPointIdsInScope = async (scope, ids = null) => {
    const { sql, params } = buildScopeSql(scope);
    const where = [];
    const values = [];
    if (Array.isArray(ids)) {
        const clean = toIds(ids);
        if (!clean.length) return [];
        where.push("ap.id IN (?)");
        values.push(clean);
    }
    if (sql) { where.push(sql); values.push(...params); }
    const rows = await db.query(
        `SELECT ap.id FROM action_points ap ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
        values
    );
    return (rows || []).map((r) => Number(r.id));
};

const isActionPointInScope = async (scope, id) => {
    if (!scope || !scope.restricted) return true;
    const found = await actionPointIdsInScope(scope, [id]);
    return found.length > 0;
};

// ------------------------------------------------------
// LOOKUP OPTIONS (read-only, no master-module permission needed)
// ------------------------------------------------------

const ACTIVE = (alias) => `LOWER(COALESCE(${alias}.status, 'Active')) = 'active'`;

const MASTER = {
    department: async (ids) => db.query(
        `SELECT d.id, d.department_name
         FROM departments d
         WHERE ${ids ? "d.id IN (?)" : ACTIVE("d")}
         ORDER BY d.department_name`,
        ids ? [ids] : []
    ),
    designation: async (ids) => db.query(
        `SELECT dg.id, dg.designation_name, dg.department_id
         FROM designations dg
         WHERE ${ids ? "dg.id IN (?)" : ACTIVE("dg")}
         ORDER BY dg.designation_name`,
        ids ? [ids] : []
    ),
    store: async (ids) => db.query(
        `SELECT s.id, s.store_name, s.store_code, s.city, s.state
         FROM stores s
         WHERE ${ids ? "s.id IN (?)" : ACTIVE("s")}
         ORDER BY s.store_name`,
        ids ? [ids] : []
    ),
    checklist_type: async (ids) => db.query(
        `SELECT ct.id, ct.checklist_name,
                (SELECT GROUP_CONCAT(ctd.department_id)
                 FROM checklist_type_departments ctd
                 WHERE ctd.checklist_type_id = ct.id) AS department_ids,
                (SELECT GROUP_CONCAT(ctu.user_id)
                 FROM checklist_type_users ctu
                 WHERE ctu.checklist_type_id = ct.id) AS user_ids
         FROM checklist_types ct
         WHERE ${ids ? "ct.id IN (?)" : ACTIVE("ct")}
         ORDER BY ct.checklist_name`,
        ids ? [ids] : []
    ),
    nso_project: async (ids) => db.query(
        `SELECT nso.id, nso.location, nso.city, nso.status
         FROM new_store_openings nso
         ${ids ? "WHERE nso.id IN (?)" : ""}
         ORDER BY nso.id DESC`,
        ids ? [ids] : []
    ),
};

// Existing reference rules used when a filter is left on "Use default".
const DEFAULT_RULE_KIND = {
    department: "departments",
    store: "stores",
    checklist_type: "checklistTypes",
};

const loadMaster = async (key, ids = null) => {
    try {
        return (await MASTER[key](ids)) || [];
    } catch (error) {
        // A missing optional table (e.g. checklist_type_users) must not
        // break every dropdown.
        if (error?.code === "ER_NO_SUCH_TABLE" || error?.code === "ER_BAD_FIELD_ERROR") {
            if (key === "checklist_type") {
                return (await db.query(
                    `SELECT ct.id, ct.checklist_name FROM checklist_types ct
                     WHERE ${ids ? "ct.id IN (?)" : "1 = 1"} ORDER BY ct.checklist_name`,
                    ids ? [ids] : []
                )) || [];
            }
            console.warn(`Filter access: ${key} lookup unavailable:`, error.message);
            return [];
        }
        throw error;
    }
};

const stripInternal = (rows) => rows.map(({ user_ids, department_ids, ...rest }) => rest);

const getAuthorizedOptions = async (req, scope) => {
    const result = {};
    for (const [key, rule] of Object.entries(scope.policies)) {
        let options = [];
        if (scope.admin || rule.policy === "all") {
            options = await loadMaster(key);
        } else if (rule.policy === "selected") {
            options = rule.ids.length ? await loadMaster(key, rule.ids) : [];
        } else if (rule.policy === "none") {
            options = [];
        } else {
            const rows = await loadMaster(key);
            options = DEFAULT_RULE_KIND[key]
                ? await filterReferenceRows(req, DEFAULT_RULE_KIND[key], rows)
                : rows;
        }
        result[key] = {
            policy: scope.admin ? "all" : rule.policy,
            hidden: !scope.admin && rule.policy === "none",
            options: stripInternal(options),
        };
    }
    return result;
};

module.exports = {
    GLOBAL,
    LEGACY_FIELDS,
    POLICIES,
    FILTER_KEYS,
    FILTER_LABELS,
    FILTER_PARAMS,
    MODULES,
    isAdministrator,
    toIds,
    ensureTable,
    getPolicies,
    getGlobalPolicies,
    getEffectivePolicies,
    resolveScope,
    validateChanges,
    applyRules,
    clearGlobal,
    findUsersByGroup,
    isValueAllowed,
    findViolations,
    buildScopeSql,
    storeScopeSql,
    allowedStoreIds,
    filterRowsByStore,
    actionPointIdsInScope,
    isActionPointInScope,
    loadMaster,
    getAuthorizedOptions,
};
