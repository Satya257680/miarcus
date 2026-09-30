// ======================================================
// STORE MANAGER MATCHER
// ------------------------------------------------------
// Turns the HR sheet's store names (data/storeManagers.js)
// into `stores.id` values. HR names and Mi Arcus names are
// written slightly differently, e.g.
//
//   "Mrpl - Goldust Patiala"  -> "MRPL - GOLDUST CITY CENTRE PATIALA"
//   "MRPL-MODELTOWN LDH"      -> "MRPL - MODEL TOWN LUDHIANA"
//
// Order (stops at the first hit):
//   1. STORE_ALIASES override (exact store_name / store_code)
//   2. Exact match after normalising (case, spaces, dashes, "MRPL")
//   3. Same letters with all spaces removed ("MODELTOWN" = "MODEL TOWN")
//   4. Word match: every word of one name is inside the other.
//      Used ONLY when exactly one store fits, both names have 2+
//      words and the store was not already matched exactly, so a
//      short name like "MRPL-SRINAGAR" or "MRPL-JAMMU" is never
//      attached to the wrong Srinagar / Jammu store.
// ======================================================

// Common short forms used in the HR sheet.
const WORD_ALIASES = {
    LDH: "LUDHIANA",
    CHD: "CHANDIGARH",
    GGN: "GURUGRAM",
    GURGAON: "GURUGRAM",
    ASR: "AMRITSAR",
    JAL: "JALANDHAR",
    JALLANDHAR: "JALANDHAR",
    DDN: "DEHRADUN",
    MALVIA: "MALVIYA",
    CENTER: "CENTRE",
    ALLAHABAD: "PRAYAGRAJ"
};

// Words that carry no meaning for matching.
const STOP_WORDS = new Set(["MRPL", "THE", "OF", "AND", "STORE"]);

const words = (value) =>
    String(value || "")
        .toUpperCase()
        .replace(/&/g, " AND ")
        .replace(/[^A-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => WORD_ALIASES[w] || w)
        .filter((w) => !STOP_WORDS.has(w));

const normalize = (value) => words(value).join(" ");
const compact = (value) => words(value).join("");

const isSubset = (small, big) => small.length > 0 && small.every((w) => big.has(w));

/**
 * @param {Array<{id:number, store_name:string, store_code?:string}>} stores
 * @param {Array<{store:string}>} managers  rows from data/storeManagers.js
 * @param {Object} aliases                  STORE_ALIASES
 * @returns {{ byStoreId: Map<number, Array>, unmatched: Array }}
 */
const matchManagersToStores = (stores, managers, aliases = {}) => {
    const prepared = stores.map((s) => {
        const w = words(s.store_name);
        return {
            id: Number(s.id),
            name: String(s.store_name || ""),
            code: String(s.store_code || "").trim().toUpperCase(),
            norm: w.join(" "),
            compact: w.join(""),
            set: new Set(w)
        };
    });

    const aliasMap = new Map(
        Object.entries(aliases || {}).map(([k, v]) => [normalize(k), String(v).trim().toUpperCase()])
    );

    // Pass 1: alias / exact / same-letters matches only.
    const strictResolve = (label) => {
        const key = normalize(label);

        const alias = aliasMap.get(key);
        if (alias) {
            const hit =
                prepared.find((s) => s.name.toUpperCase() === alias || s.code === alias) ||
                prepared.find((s) => s.norm === normalize(alias));
            if (hit) return hit.id;
        }

        let hits = prepared.filter((s) => s.norm === key);
        if (hits.length === 1) return hits[0].id;

        const c = compact(label);
        hits = prepared.filter((s) => s.compact === c);
        if (hits.length === 1) return hits[0].id;

        return null;
    };

    const resolved = new Map();
    const claimed = new Set();

    managers.forEach((row) => {
        const key = normalize(row.store);
        if (resolved.has(key)) return;
        const id = strictResolve(row.store);
        if (id) {
            resolved.set(key, id);
            claimed.add(id);
        }
    });

    // Pass 2: unique word match for what is left. Both names must
    // have at least 2 words, and stores already matched exactly to
    // another sheet name are skipped.
    managers.forEach((row) => {
        const key = normalize(row.store);
        if (resolved.has(key)) return;

        const labelWords = words(row.store);
        let id = null;

        if (labelWords.length >= 2) {
            const labelSet = new Set(labelWords);
            const hits = prepared.filter(
                (s) =>
                    !claimed.has(s.id) &&
                    s.set.size >= 2 &&
                    (isSubset(labelWords, s.set) || isSubset([...s.set], labelSet))
            );
            if (hits.length === 1) id = hits[0].id;
        }

        resolved.set(key, id);
    });

    const byStoreId = new Map();
    const unmatched = [];

    managers.forEach((row) => {
        const id = resolved.get(normalize(row.store));
        if (!id) {
            unmatched.push(row);
            return;
        }
        if (!byStoreId.has(id)) byStoreId.set(id, []);
        byStoreId.get(id).push(row);
    });

    return { byStoreId, unmatched };
};

// "040168", "EMP40168", "40168" -> "40168"
const normalizeEmployeeId = (value) => {
    const digits = String(value || "").replace(/\D+/g, "").replace(/^0+/, "");
    return digits || null;
};

module.exports = {
    matchManagersToStores,
    normalizeEmployeeId,
    normalizeStoreName: normalize
};
