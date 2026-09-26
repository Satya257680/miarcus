// ======================================================
// DELETE-ALL SCOPE (client side)
//
// Shared by every module's "Delete All" button:
//   - no filter / search applied  -> delete every record
//   - any filter / search applied -> delete ONLY the matching records
// ======================================================

const isEmptyValue = (value, key = "") => {
    if (value === undefined || value === null || value === false) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof Set) return value.size === 0;
    if (typeof value === "number") return false;
    const text = String(value).trim();
    if (!text) return true;
    const lower = text.toLowerCase();
    // "All", "All Stores", "All Types"... mean "no filter" (free-text
    // search keeps its value as typed).
    return lower === "all" || (!/search/i.test(key) && lower.startsWith("all "));
};

/** Returns only the filters that actually narrow the list. */
export const activeFilters = (filters = {}) => {
    const out = {};
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (!isEmptyValue(value, key)) {
            out[key] = typeof value === "string" ? value.trim() : value;
        }
    });
    return out;
};

/** true when at least one filter / search value is applied. */
export const hasActiveFilters = (filters = {}) =>
    Object.keys(activeFilters(filters)).length > 0;

/** Unique, positive numeric ids from a list of rows. */
export const collectIds = (rows = [], key = "id") => [
    ...new Set(
        (rows || [])
            .map((row) => Number(typeof key === "function" ? key(row) : row?.[key]))
            .filter((id) => Number.isInteger(id) && id > 0)
    ),
];

/** axios config for a filtered delete-all request. */
export const filteredDeleteConfig = ({ ids, filters } = {}, extra = {}) => {
    const data = { scope: "filtered" };
    if (ids) data.ids = ids;
    if (filters) data.filters = activeFilters(filters);
    return { ...extra, data };
};

/** Toolbar button label: "Delete All" or "Delete Filtered (12)". */
export const deleteAllLabel = (filtered, count) => {
    if (!filtered) return "Delete All";
    return Number.isFinite(Number(count))
        ? `Delete Filtered (${Number(count)})`
        : "Delete Filtered";
};

/** Confirmation text for the delete-all dialog. */
export const deleteAllMessage = (filtered, count, noun = "records", extra = "") => {
    const tail = extra ? ` ${extra}` : "";
    if (filtered) {
        const n = Number.isFinite(Number(count)) ? `${Number(count)} ` : "";
        return `Filters are applied. Only the ${n}${noun} matching the current filters will be deleted. Records outside the filters will NOT be touched.${tail}`;
    }
    return `No filter is applied. This will permanently delete ALL ${noun}.${tail}`;
};
