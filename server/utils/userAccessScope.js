const db = require("../config/db");
const parseJson = (value) => { if (value == null || value === "") return null; if (Array.isArray(value)) return value; if (typeof value === "object") return value; try { return JSON.parse(value); } catch { return null; } };
const isAdministrator = (user) => [1, "1", true].includes(user?.is_admin) || [1, "1", true].includes(user?.is_super_admin);
async function getUserContext(req) {
    const userId = Number(req.user?.id);
    if (!userId) throw new Error("Authenticated user ID is missing");
    const rows = await db.query(`SELECT u.id, u.department_id, u.designation_id, d.department_name, dg.designation_name FROM users u LEFT JOIN departments d ON d.id=u.department_id LEFT JOIN designations dg ON dg.id=u.designation_id WHERE u.id=? LIMIT 1`, [userId]);
    const user = rows?.[0] || { id: userId };
    let override = null;
    try {
        const accessRows = await db.query(`SELECT department_ids, all_departments, store_ids, all_stores, checklist_type_ids, all_checklist_types FROM user_access_overrides WHERE user_id=? LIMIT 1`, [userId]);
        override = accessRows?.[0] || null;
    } catch (error) { if (error?.code !== "ER_NO_SUCH_TABLE") throw error; }
    const bool = (v) => v == null ? null : Boolean(v);
    return { userId, user, override: {
        department_ids: parseJson(override?.department_ids), all_departments: bool(override?.all_departments),
        store_ids: parseJson(override?.store_ids), all_stores: bool(override?.all_stores),
        checklist_type_ids: parseJson(override?.checklist_type_ids), all_checklist_types: bool(override?.all_checklist_types)
    }};
}
const idsFrom = (v) => Array.isArray(v) ? v.map(Number).filter((id) => Number.isInteger(id) && id > 0) : null;
function matchesDesignationChecklist(name, designation) {
    const checklist = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const role = String(designation || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!checklist || !role) return false;
    if (checklist.includes(role)) return true;
    const tokens = role.split(/\s+/).filter((token) => token.length >= 3);
    const acronym = role.split(/\s+/).map((token) => token[0]).join("");
    if (acronym.length >= 2 && acronym.length <= 6 && checklist.split(/\s+/).includes(acronym)) return true;
    return tokens.some((token) => checklist.split(/\s+/).includes(token));
}
async function filterReferenceRows(req, kind, rows) {
    if (isAdministrator(req.user)) return rows;
    const { userId, user, override } = await getUserContext(req);
    const list = Array.isArray(rows) ? rows : [];
    if (kind === "departments") {
        if (override.all_departments === true) return list;
        const ids = idsFrom(override.department_ids);
        if (override.all_departments === false) return list.filter((r) => ids?.includes(Number(r.id)));
        if (ids) return list.filter((r) => ids.includes(Number(r.id)));
        return user.department_id == null ? [] : list.filter((r) => Number(r.id) === Number(user.department_id));
    }
    if (kind === "stores") {
        if (override.all_stores === true) return list;
        const ids = idsFrom(override.store_ids);
        if (override.all_stores === false) return list.filter((r) => ids?.includes(Number(r.id)));
        if (ids) return list.filter((r) => ids.includes(Number(r.id)));
        // No explicit override: users the portal already treats as
        // all-store (e.g. ASM-type designations, see
        // services/notificationAudience.getStoreScope) see every store;
        // everyone else sees the stores assigned to them.
        try {
            const { getStoreScope } = require("../services/notificationAudience");
            const storeScope = await getStoreScope(userId);
            if (storeScope?.allStores) return list;
        } catch (error) {
            console.warn("Store scope lookup failed, using assigned stores:", error.message);
        }
        try {
            const assigned = await db.query("SELECT store_id FROM user_stores WHERE user_id=?", [userId]);
            const assignedIds = (assigned || []).map((r) => Number(r.store_id)).filter(Number.isFinite);
            if (assignedIds.length) return list.filter((r) => assignedIds.includes(Number(r.id)));
            return [];
        } catch (error) {
            if (error?.code === "ER_NO_SUCH_TABLE") return [];
            throw error;
        }
    }
    if (kind === "checklistTypes") {
        if (override.all_checklist_types === true) return list;
        const ids = idsFrom(override.checklist_type_ids);
        if (override.all_checklist_types === false) return list.filter((r) => ids?.includes(Number(r.id)));
        if (ids) return list.filter((r) => ids.includes(Number(r.id)));
        const assigned = list.filter((r) => Array.isArray(r.user_ids) && r.user_ids.map(Number).includes(userId));
        if (assigned.length) return assigned;
        const deptId = Number(user.department_id);
        const departmentMatches = list.filter((r) => {
            const deptIds = Array.isArray(r.department_ids) ? r.department_ids.map(Number) : String(r.department_ids || "").split(",").map(Number).filter(Number.isFinite);
            return deptId > 0 && deptIds.includes(deptId);
        });
        if (departmentMatches.length) return departmentMatches;
        const designationMatches = list.filter((r) => matchesDesignationChecklist(r.checklist_name, user.designation_name));
        if (designationMatches.length) return designationMatches;
        return [];
    }
    return list;
}
module.exports = { filterReferenceRows };
