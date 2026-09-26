// ======================================================
// DELETE-ALL SCOPE HELPER
//
// Every "Delete All" endpoint in the portal now understands two modes:
//
//   1. Unfiltered  -> DELETE /.../delete-all            (no body)
//                     Removes every record, exactly as before.
//
//   2. Filtered    -> DELETE /.../delete-all
//                     body: { scope: "filtered", ids: [1, 2, 3] }
//                     and/or { scope: "filtered", filters: {...} }
//                     Removes ONLY the records that match the filters
//                     currently applied on the page.
//
// Safety rule: when the request says it is filtered, the endpoint must
// never fall back to "delete everything" — an empty id list means
// "nothing matched", so nothing is deleted.
// ======================================================

const MAX_IDS = 200000;

const parseIds = (raw) => {
    if (raw === undefined || raw === null || raw === "") return null;

    let list = raw;

    if (typeof list === "string") {
        const trimmed = list.trim();
        if (trimmed.startsWith("[")) {
            try {
                list = JSON.parse(trimmed);
            } catch {
                list = trimmed.split(",");
            }
        } else {
            list = trimmed.split(",");
        }
    }

    if (!Array.isArray(list)) list = [list];

    const ids = [...new Set(
        list
            .map((value) => Number(String(value).trim()))
            .filter((value) => Number.isInteger(value) && value > 0)
    )];

    return ids.slice(0, MAX_IDS);
};

const parseFilters = (raw) => {
    if (!raw) return {};
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }
    return typeof raw === "object" ? raw : {};
};

const cleanFilters = (filters = {}) => {
    const out = {};
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return;
            const lower = trimmed.toLowerCase();
            // "All", "All Stores", "All Types"... mean "no filter" (free-text
            // search keeps its value as typed).
            if (lower === "all" || (!/search/i.test(key) && lower.startsWith("all "))) return;
            out[key] = trimmed;
            return;
        }
        if (Array.isArray(value) && !value.length) return;
        out[key] = value;
    });
    return out;
};

/**
 * Reads the delete-all scope from a request.
 *
 * @returns {{ filtered: boolean, ids: number[]|null, filters: object }}
 *   filtered - true when only matching records must be removed
 *   ids      - explicit record ids to remove (null when not supplied)
 *   filters  - cleaned filter values (empty/"all" values dropped)
 */
const readDeleteScope = (req = {}) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const query = req.query || {};

    const rawIds = body.ids !== undefined ? body.ids : query.ids;
    const ids = parseIds(rawIds);

    const filters = cleanFilters({
        ...parseFilters(query.filters),
        ...parseFilters(body.filters),
    });

    const scope = String(body.scope || query.scope || "").toLowerCase();

    const filtered =
        scope === "filtered" ||
        ids !== null ||
        Object.keys(filters).length > 0;

    return { filtered, ids, filters };
};

/** Builds "?, ?, ?" for an IN (...) clause. */
const placeholders = (ids = []) => ids.map(() => "?").join(", ");

/** Splits a large id list so IN (...) clauses stay a sensible size. */
const chunk = (ids = [], size = 1000) => {
    const out = [];
    for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
    return out;
};

/** Wraps a node-style callback function into a promise. */
const cbToPromise = (fn, ...args) =>
    new Promise((resolve, reject) => {
        try {
            const maybe = fn(...args, (err, result) => (err ? reject(err) : resolve(result)));
            if (maybe && typeof maybe.then === "function") maybe.then(resolve, reject);
        } catch (error) {
            reject(error);
        }
    });

/**
 * Runs an existing single-record delete for every id, one after
 * another, so each record keeps its normal clean-up (files, history,
 * child rows, ...). Returns { deleted, failed }.
 */
const eachId = async (ids = [], fn) => {
    let deleted = 0;
    const failed = [];
    for (const id of ids) {
        try {
            await fn(id);
            deleted += 1;
        } catch (error) {
            failed.push({ id, message: error?.message || String(error) });
        }
    }
    return { deleted, failed };
};

/**
 * Standard JSON reply for a filtered delete.
 * result: { deleted, failed }  noun: e.g. "store(s)"
 */
const sendFilteredResult = (res, result = {}, noun = "record(s)") => {
    const deleted = Number(result.deleted || 0);
    const failed = Array.isArray(result.failed) ? result.failed : [];
    let message = `${deleted} filtered ${noun} deleted successfully.`;
    if (failed.length) {
        message += ` ${failed.length} could not be deleted (they may still be in use).`;
    }
    return res.status(200).json({
        success: true,
        filtered: true,
        deleted,
        failed: failed.length,
        failures: failed.slice(0, 50),
        message,
    });
};

/** Human readable summary used in activity / audit logs. */
const describeScope = (scope) =>
    scope?.filtered ? "filtered records" : "all records";

module.exports = {
    readDeleteScope,
    parseIds,
    cleanFilters,
    placeholders,
    chunk,
    cbToPromise,
    eachId,
    sendFilteredResult,
    describeScope,
};
