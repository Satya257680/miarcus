// ==========================================================
// MI ARCUS — GLOBAL BULK UPLOAD ENGINE
// ==========================================================
//
// One pipeline shared by EVERY module that has a Bulk Upload:
//
//   Upload file (Excel / CSV / Word / PDF / photo / JSON)
//        ↓
//   Read the file            (utils/bulkFileParser.js)
//        ↓
//   Detect + validate headers (matched / auto-corrected / extra / missing)
//        ↓
//   Validate & save EACH ROW on its own
//        ├─ valid row   → inserted / updated
//        └─ invalid row → exact error recorded (row, column, value, reason)
//        ↓
//   Finish ALL rows (one bad row never stops the others)
//        ↓
//   Standard report: total / uploaded / failed / skipped + every error
//
// Extra columns that a module has no field for are NOT discarded:
// they are saved, with their exact header names, into a JSON column
// `bulk_extra_data` on the module's table (added automatically the
// first time it is needed) and shown again in the module's table.
//
// Every module only has to describe its columns (config/bulkUploadModules.js)
// and supply a `processRow` function. See controllers/salesTeamController.js
// (importVisitPlans) for a complete example.
// ==========================================================

const fs = require("fs");
const db = require("../config/db");
const { parseBulkFile, sourceLabel } = require("./bulkFileParser");
const { getBulkModule, aliasesOf } = require("../config/bulkUploadModules");

// ==========================================================
// SMALL PROMISE HELPERS
// ==========================================================

// Calls a callback-style model function and returns a promise.
//   const rows = await call(Model.findByName, name);
function call(fn, ...args) {
    return new Promise((resolve, reject) => {
        try {
            const maybe = fn(...args, (err, result) => (err ? reject(err) : resolve(result)));
            if (maybe && typeof maybe.then === "function") maybe.then(resolve, reject);
        } catch (error) {
            reject(error);
        }
    });
}

function sql(query, params = []) {
    return db.query(query, params);
}

function removeUploadedFile(file) {
    if (!file?.path) return;
    fs.unlink(file.path, () => {});
}

// ==========================================================
// VALUE HELPERS (shared validators)
// ==========================================================

function text(value) {
    if (value === undefined || value === null) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).trim();
}

function isBlank(value) {
    return text(value) === "";
}

const MONTHS = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
    september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
};

function pad(n) {
    return String(n).padStart(2, "0");
}

function validYmd(y, m, d) {
    if (!y || !m || !d) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function fullYear(y) {
    const n = Number(y);
    if (String(y).length <= 2) return n + (n < 70 ? 2000 : 1900);
    return n;
}

// Accepts every date shape people actually type:
//   01/10/2026, 1-10-26, 01.10.2026, 2026-10-01, 1 Oct 2026, Oct 1 2026,
//   Excel serial numbers (46296) and real Date objects.
// Day-first (Indian) order is used for ambiguous numeric dates.
// Returns "YYYY-MM-DD" or null.
function parseDate(value) {
    if (value === undefined || value === null || value === "") return null;

    if (value instanceof Date && !isNaN(value)) {
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    }

    if (typeof value === "number" && isFinite(value)) {
        if (value > 20000 && value < 80000) {
            const ms = Math.round((value - 25569) * 86400 * 1000);
            const d = new Date(ms);
            return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        }
        return null;
    }

    const raw = String(value).trim().replace(/\s+/g, " ");
    if (!raw) return null;

    if (/^\d{5}(\.\d+)?$/.test(raw)) return parseDate(Number(raw));

    // Drop a trailing time part: "01/10/2026 10:30", "2026-10-01T10:30:00Z"
    const dateOnly = raw.replace(/[T ]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\s*(am|pm)?\s*(z|[+-]\d{2}:?\d{2})?$/i, "").trim();

    let m = dateOnly.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) {
        const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
        return validYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
    }

    m = dateOnly.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (m) {
        let d = Number(m[1]);
        let mo = Number(m[2]);
        const y = fullYear(m[3]);
        // 10/31/2026 is clearly month-first.
        if (mo > 12 && d <= 12) [d, mo] = [mo, d];
        return validYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
    }

    m = dateOnly.match(/^(\d{1,2})(?:st|nd|rd|th)?[ \-/.,]+([a-z]{3,9})[ \-/.,]+(\d{2}|\d{4})$/i);
    if (m && MONTHS[m[2].toLowerCase()]) {
        const d = Number(m[1]);
        const mo = MONTHS[m[2].toLowerCase()];
        const y = fullYear(m[3]);
        return validYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
    }

    m = dateOnly.match(/^([a-z]{3,9})[ \-/.,]+(\d{1,2})(?:st|nd|rd|th)?[ \-/.,]+(\d{2}|\d{4})$/i);
    if (m && MONTHS[m[1].toLowerCase()]) {
        const d = Number(m[2]);
        const mo = MONTHS[m[1].toLowerCase()];
        const y = fullYear(m[3]);
        return validYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
    }

    return null;
}

function formatDmy(ymd) {
    if (!ymd) return "";
    const [y, m, d] = String(ymd).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
}

const YES = ["yes", "y", "true", "1", "on", "active", "leave", "weekoff", "week off"];
const NO = ["no", "n", "false", "0", "off", "inactive", "-", ""];

// Returns true / false, or null when the value is not a recognisable yes/no.
function parseYesNo(value, defaultValue = false) {
    if (value === undefined || value === null || String(value).trim() === "") return defaultValue;
    if (typeof value === "boolean") return value;
    const v = String(value).trim().toLowerCase();
    if (YES.includes(v)) return true;
    if (NO.includes(v)) return false;
    return null;
}

function parseNumber(value) {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    if (typeof value === "number") return isFinite(value) ? value : NaN;
    const cleaned = String(value).replace(/[₹$,%\s]/g, "").replace(/^rs\.?/i, "");
    if (cleaned === "" || cleaned === "-") return null;
    const n = Number(cleaned);
    return isFinite(n) ? n : NaN;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
    return EMAIL_REGEX.test(text(value));
}

// Matches a value against an allowed list case-insensitively and
// returns the canonical spelling, or null.
function pickAllowed(value, allowed = []) {
    const v = text(value).toLowerCase();
    return allowed.find((a) => String(a).toLowerCase() === v) || null;
}

// ==========================================================
// DATABASE ERROR → PLAIN LANGUAGE
// ==========================================================

function humanize(column) {
    return String(column || "")
        .replace(/_id$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

// Turns a mysql2 error into { column, reason, duplicate } that a
// non-technical user can act on. `columnLabels` maps DB column names
// to the spreadsheet column names of the module (e.g. store_id -> "Store Code").
// Column name from MySQL / MariaDB messages:
//   column 'cam'   |   column `db`.`table`.`cam`   |   Column 'cam'
function columnFromMessage(message) {
    const m = String(message || "").match(/column\s+((?:[`'"][^`'"]+[`'"]\.?)+)/i);
    if (!m) return "";
    const parts = m[1].match(/[`'"]([^`'"]+)[`'"]/g) || [];
    const last = parts[parts.length - 1] || "";
    return last.replace(/[`'"]/g, "");
}

function translateDbError(err, columnLabels = {}) {
    const code = err?.code || "";
    const message = String(err?.sqlMessage || err?.message || "");
    const label = (dbColumn) => columnLabels[dbColumn] || humanize(dbColumn);

    let m;

    if (code === "ER_DUP_ENTRY") {
        m = message.match(/Duplicate entry '(.*)' for key '([^']+)'/);
        const value = m ? m[1] : "";
        const key = m ? m[2].split(".").pop() : "";
        return {
            column: columnLabels[key] || humanize(key.replace(/^(uq|uniq|unique|idx)_?/i, "")) || "Record",
            value,
            reason: `${value ? `"${value}" ` : "This record "}already exists in the database (duplicate).`,
            duplicate: true
        };
    }

    if (code === "ER_NO_REFERENCED_ROW_2" || code === "ER_NO_REFERENCED_ROW") {
        m = message.match(/FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)`/);
        const column = m ? m[1] : "";
        const table = m ? m[2] : "";
        return {
            column: label(column),
            reason: `${label(column)} was not found in ${humanize(table) || "the database"}.`
        };
    }

    if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") {
        return { column: "Record", reason: "This record is linked to other data and cannot be replaced." };
    }

    if (code === "ER_DATA_TOO_LONG") {
        const column = columnFromMessage(message);
        return { column: label(column), reason: `${label(column)} is too long. Please shorten the text.` };
    }

    if (["ER_TRUNCATED_WRONG_VALUE", "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD", "WARN_DATA_TRUNCATED", "ER_WRONG_VALUE", "ER_WRONG_VALUE_FOR_TYPE"].includes(code)) {
        m = message.match(/Incorrect (\w+) value: '([^']*)'/i);
        const column = columnFromMessage(message);
        if (m) {
            const kind = m[1].toLowerCase();
            return {
                column: label(column),
                value: m[2],
                reason: kind === "date" || kind === "datetime"
                    ? `Invalid date for ${label(column)}. Use DD/MM/YYYY format.`
                    : `Invalid ${kind} value for ${label(column) || "a column"}.`
            };
        }
        return { column: label(column), reason: `Invalid value for ${label(column) || "a column"}.` };
    }

    if (code === "ER_WARN_DATA_OUT_OF_RANGE") {
        const column = columnFromMessage(message);
        return { column: label(column), reason: `${label(column)} is out of the allowed number range.` };
    }

    if (code === "ER_BAD_NULL_ERROR") {
        m = message.match(/Column '([^']+)'/);
        const column = m ? m[1] : "";
        return { column: label(column), reason: `${label(column)} is required.` };
    }

    if (code === "ER_NO_DEFAULT_FOR_FIELD") {
        m = message.match(/Field '([^']+)'/);
        const column = m ? m[1] : "";
        return { column: label(column), reason: `${label(column)} is required.` };
    }

    if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "PROTOCOL_CONNECTION_LOST", "ECONNRESET", "ETIMEDOUT"].includes(code)) {
        return { column: "", reason: "The database was busy and this row was not saved. Upload this row again." };
    }

    if (code === "ER_BAD_FIELD_ERROR" || code === "ER_NO_SUCH_TABLE") {
        return { column: "", reason: "The database structure for this module is out of date. Restart the server so it can upgrade itself, then upload again." };
    }

    if (err && err.bulkColumn) {
        return { column: err.bulkColumn, value: err.bulkValue, reason: err.message };
    }

    return {
        column: "",
        reason: message ? `Could not be saved: ${message}` : "Could not be saved."
    };
}

// A validation error a processRow function can throw to fail the row
// on a specific column:   throw rowError("Store Code", value, "Store not found");
function rowError(column, value, reason) {
    const error = new Error(reason);
    error.bulkColumn = column;
    error.bulkValue = value;
    error.isRowError = true;
    return error;
}

// ==========================================================
// EXTRA (UNMAPPED) COLUMNS → `bulk_extra_data`
// ==========================================================

const EXTRA_COLUMN = "bulk_extra_data";
const extraColumnReady = new Map();

function ensureExtraColumn(table) {
    if (!table || !/^[A-Za-z0-9_]+$/.test(table)) return Promise.resolve(false);
    if (extraColumnReady.has(table)) return extraColumnReady.get(table);

    const promise = (async () => {
        const rows = await sql(
            `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [table, EXTRA_COLUMN]
        );
        if (Number(rows?.[0]?.n || 0) === 0) {
            await sql(`ALTER TABLE \`${table}\` ADD COLUMN \`${EXTRA_COLUMN}\` LONGTEXT NULL`);
        }
        return true;
    })().catch((error) => {
        extraColumnReady.delete(table);
        console.error(`[bulk-upload] Could not add ${EXTRA_COLUMN} to ${table}:`, error.message);
        return false;
    });

    extraColumnReady.set(table, promise);
    return promise;
}

function cleanExtras(extra) {
    const out = {};
    Object.entries(extra || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || String(value).trim() === "") return;
        out[String(key).trim()] = value instanceof Date ? value.toISOString().slice(0, 10) : value;
    });
    return out;
}

// Saves (merges) extra columns for one record.
// mode "merge"  -> new values replace old values for the same column
// mode "append" -> different values for the same column are kept side by
//                  side ("Car, Train") — used when many rows feed one record
async function saveExtraData(table, id, extra, { idColumn = "id", mode = "merge" } = {}) {
    const clean = cleanExtras(extra);
    if (!table || !id || !Object.keys(clean).length) return false;
    if (!(await ensureExtraColumn(table))) return false;

    let merged = clean;
    try {
        const existing = await sql(
            `SELECT \`${EXTRA_COLUMN}\` AS extra FROM \`${table}\` WHERE \`${idColumn}\` = ? LIMIT 1`,
            [id]
        );
        if (existing?.[0]?.extra) {
            const previous = JSON.parse(existing[0].extra) || {};
            if (mode === "append") {
                merged = { ...previous };
                Object.entries(clean).forEach(([key, value]) => {
                    const before = previous[key];
                    if (before === undefined || before === null || String(before).trim() === "") {
                        merged[key] = value;
                        return;
                    }
                    const parts = String(before).split(", ").map((p) => p.trim());
                    if (!parts.includes(String(value).trim())) {
                        merged[key] = `${before}, ${value}`;
                    }
                });
            } else {
                merged = { ...previous, ...clean };
            }
        }
    } catch {
        merged = clean;
    }

    await sql(
        `UPDATE \`${table}\` SET \`${EXTRA_COLUMN}\` = ? WHERE \`${idColumn}\` = ?`,
        [JSON.stringify(merged), id]
    );
    return true;
}

// ==========================================================
// READ + HEADER VALIDATION
// ==========================================================

function requiredGroups(spec) {
    // Returns [[col], [colA, colB], ...] — each inner list needs at least one.
    const groups = {};
    Object.entries(spec.columns || {}).forEach(([name, col]) => {
        if (!col.required || name.startsWith("__")) return;
        const key = col.required === true ? name : String(col.required);
        groups[key] = groups[key] || [];
        groups[key].push(name);
    });
    return Object.values(groups);
}

function headerValidation(spec, headers) {
    const matched = new Set(headers?.matched || []);
    const missing = requiredGroups(spec)
        .filter((group) => !group.some((name) => matched.has(name)))
        .map((group) => group.join(" / "));

    const columns = (headers?.columns || []).map((c) => ({
        ...c,
        target: c.status === "ignored" ? null : c.target,
        required: Boolean(c.target && spec.columns?.[c.target]?.required),
        label:
            c.status === "matched"
                ? "Matched"
                : c.status === "corrected"
                    ? `Read as "${c.target}"`
                    : c.status === "ignored"
                        ? "System column — not needed"
                        : "Extra column — will be saved"
    }));

    // An OLD error report (Row / Column / Value / Error Reason only) has
    // no record data at all — say so instead of failing every row.
    const sources = (headers?.columns || []).map((c) => String(c.source || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
    const looksLikeErrorReport =
        sources.includes("errorreason") &&
        (sources.includes("excelrow") || sources.includes("value")) &&
        (headers?.matched || []).length <= 1 &&
        missing.length > 0;

    return {
        columns,
        matched: headers?.matched || [],
        corrected: headers?.corrected || [],
        extra: headers?.extra || [],
        missingRequired: missing,
        ignored: headers?.ignored || [],
        looksLikeErrorReport,
        optionalNotFound: (headers?.notFound || []).filter(
            (name) => !missing.some((group) => group.split(" / ").includes(name))
        ),
        ok: missing.length === 0
    };
}

// Reads the uploaded file with the module's column definitions.
async function readUpload(file, moduleKey, onProgress) {
    const spec = typeof moduleKey === "string" ? getBulkModule(moduleKey) : moduleKey;
    if (!spec) throw new Error(`Unknown bulk upload module: ${moduleKey}`);

    const parsed = await parseBulkFile(
        file.path,
        file.originalname,
        file.mimetype,
        aliasesOf(spec),
        onProgress
    );

    const headers = headerValidation(spec, parsed.headers);
    const warnings = [...(parsed.warnings || [])];

    headers.corrected.forEach((c) => {
        warnings.push(`Column "${c.source}" is not an exact column name — it was read as "${c.target}". Please correct the header in your file.`);
    });

    return {
        spec,
        rows: parsed.rows,
        sourceType: parsed.sourceType,
        sourceFormat: parsed.sourceFormat,
        sourceLabel: parsed.sourceLabel || sourceLabel(parsed.sourceFormat),
        headers,
        warnings
    };
}

// Returns the value for a column, or "" — also looks at the raw header
// text so modules can read optional columns by their plain name.
function cell(row, column) {
    if (!row) return "";
    if (Object.prototype.hasOwnProperty.call(row, column)) return row[column];
    const raw = row.__raw || {};
    const key = Object.keys(raw).find((k) => k.trim().toLowerCase() === String(column).toLowerCase());
    return key ? raw[key] : "";
}

// ==========================================================
// REPORT
// ==========================================================

class BulkReport {
    constructor({ module, title, fileName, sourceLabel: label, headers, warnings, total }) {
        this.module = module;
        this.title = title;
        this.fileName = fileName;
        this.sourceLabel = label;
        this.headers = headers;
        this.warnings = [...(warnings || [])];
        this.total = total || 0;
        this.details = [];
        this.extraSaved = 0;
        this.ids = [];
        this.errorCount = 0;
        this.items = { saved: 0, failed: 0, skipped: 0 };
        // key -> { ok, updated, err, dup, row, sheet, values }
        this.rows = new Map();
    }

    key(row) {
        return `${row?.__sheet || ""}#${row?.__row ?? ""}`;
    }

    state(row) {
        const k = this.key(row);
        if (!this.rows.has(k)) {
            this.rows.set(k, {
                ok: false,
                updated: false,
                err: false,
                dup: false,
                row: row?.__row ?? null,
                sheet: row?.__sheet || null,
                values: row?.__display || row?.__raw || null
            });
        }
        return this.rows.get(k);
    }

    // Records an error for a row. A row may have several errors (or
    // several store visits failing) — it is still counted once.
    fail(row, column, value, reason, type = "error") {
        const st = this.state(row);
        if (type === "duplicate") st.dup = true;
        else if (type !== "warning") st.err = true;
        if (type !== "warning") this.errorCount += 1;
        this.details.push({
            row: row?.__row ?? null,
            sheet: row?.__sheet || null,
            column: column || "",
            value: value === undefined || value === null ? "" : value instanceof Date ? value.toISOString().slice(0, 10) : String(value),
            reason: String(reason || "Invalid value"),
            type
        });
    }

    duplicate(row, column, value, reason) {
        this.fail(row, column, value, reason || `"${value}" already exists in the database.`, "duplicate");
    }

    // A note about a row that WAS saved (e.g. "Department X not found,
    // question saved without it"). Does not fail the row.
    note(row, column, value, reason) {
        this.fail(row, column, value, reason, "warning");
    }

    hasError(row) {
        const st = this.rows.get(this.key(row));
        return Boolean(st && (st.err || st.dup));
    }

    ok(row, { updated = false, id = null } = {}) {
        const st = this.state(row);
        if (!st.ok) st.updated = Boolean(updated);
        st.ok = true;
        this.items.saved += 1;
        if (id) this.ids.push(id);
    }

    warn(message) {
        if (message && !this.warnings.includes(message)) this.warnings.push(message);
    }

    // ---- row based counts ----
    // uploaded = rows with at least one record saved
    // failed   = rows with an error and nothing saved
    // skipped  = rows that were only duplicates
    // partial  = rows where some records saved and some failed
    get uploaded() {
        return [...this.rows.values()].filter((r) => r.ok).length;
    }

    get updated() {
        return [...this.rows.values()].filter((r) => r.ok && r.updated).length;
    }

    get created() {
        return this.uploaded - this.updated;
    }

    get failed() {
        return [...this.rows.values()].filter((r) => !r.ok && r.err).length;
    }

    get skipped() {
        return [...this.rows.values()].filter((r) => !r.ok && !r.err && r.dup).length;
    }

    get partial() {
        return [...this.rows.values()].filter((r) => r.ok && (r.err || r.dup)).length;
    }

    legacyErrors() {
        return this.details.filter((d) => d.type !== "warning").map((d) => {
            const where = d.row ? `${d.sheet ? `${d.sheet} · ` : ""}Row ${d.row}` : "File";
            const col = d.column ? ` · ${d.column}` : "";
            const val = d.value !== "" ? ` (${d.value})` : "";
            return `${where}${col}${val}: ${d.reason}`;
        });
    }

    message() {
        const parts = [];
        parts.push(`${this.uploaded} of ${this.total} row${this.total === 1 ? "" : "s"} uploaded`);
        if (this.updated) parts.push(`${this.updated} updated`);
        if (this.partial) parts.push(`${this.partial} partly uploaded`);
        if (this.failed) parts.push(`${this.failed} failed`);
        if (this.skipped) parts.push(`${this.skipped} skipped as duplicate${this.skipped === 1 ? "" : "s"}`);
        return `Bulk upload completed: ${parts.join(", ")}.`;
    }

    // Every row that was not completely saved, with ALL of its original
    // columns (exact header names, as shown in the file) and the reasons.
    // The client turns this into an Error Report that can be corrected and
    // uploaded again as it is.
    failedRowData() {
        const reasons = new Map();
        this.details.forEach((d) => {
            if (d.type === "warning" || d.row === null) return;
            const k = `${d.sheet || ""}#${d.row}`;
            const text = `${d.column ? `${d.column}: ` : ""}${d.reason}`;
            reasons.set(k, [...(reasons.get(k) || []), text]);
        });

        return [...this.rows.entries()]
            .filter(([, r]) => r.row !== null && (r.err || r.dup))
            .map(([k, r]) => ({
                row: r.row,
                sheet: r.sheet,
                status: r.ok ? "Partly uploaded" : r.err ? "Failed" : "Skipped (duplicate)",
                values: r.values || {},
                reasons: [...new Set(reasons.get(k) || [])]
            }))
            .sort((a, b) => String(a.sheet || "").localeCompare(String(b.sheet || "")) || a.row - b.row)
            .slice(0, 20000);
    }

    toJSON(extra = {}) {
        const summary = {
            total: this.total,
            uploaded: this.uploaded,
            created: this.created,
            updated: this.updated,
            failed: this.failed,
            skipped: this.skipped,
            partial: this.partial,
            recordsSaved: this.items.saved
        };

        const sourceColumns = (this.headers?.columns || [])
            .filter((c) => c.status !== "ignored")
            .map((c) => c.source)
            .filter((name, i, arr) => arr.indexOf(name) === i);

        const report = {
            module: this.module,
            title: this.title,
            fileName: this.fileName,
            sourceLabel: this.sourceLabel,
            summary,
            columns: this.headers,
            sourceColumns,
            failedRows: this.failedRowData(),
            errorDetails: this.details,
            warnings: this.warnings,
            finishedAt: new Date().toISOString()
        };

        return {
            success: this.uploaded > 0 || this.failed === 0,
            completed: true,
            message: this.message(),
            ...summary,
            imported: this.uploaded,
            inserted: this.uploaded,
            count: this.uploaded,
            errors: this.legacyErrors(),
            warnings: this.warnings,
            errorDetails: this.details,
            report,
            ...extra
        };
    }
}

// ==========================================================
// RUNNER
// ==========================================================
//
// runBulkUpload({
//   req, res,                       // express objects (res optional if you want the JSON back)
//   module: "visit-plans",          // key in config/bulkUploadModules.js
//   prepare: async (ctx) => {},     // optional — load lookups once (stores, users...)
//   validateRow: (row, ctx) => {},  // optional — call ctx.fail(...) for every problem found
//   processRow: async (row, ctx) => ({ id, updated }),   // save ONE valid row
//   finalize: async (ctx) => {},    // optional
//   duplicateKey: (row) => "key",   // optional — same key twice in the file = duplicate
//   expandRow: async (row, ctx) => [item, ...], // optional — one row holds several records
//                                   //  (each item is validated/saved on its own as ctx.item)
//   validateItem: async (row, ctx) => {},       // optional — per-item checks (ctx.item)
//   onProgress: ({processed,total,created,failed}) => {}  // optional (background jobs)
// })
//
// ctx gives: spec, rows, report, user, fail(column, value, reason), cell(column),
// date(column, {required}), yesNo(column), number(column), extra (row.__extra).
// ==========================================================

async function runBulkUpload(options) {
    const {
        req,
        res,
        file = req?.file,
        module: moduleKey,
        prepare,
        validateRow,
        processRow,
        finalize,
        duplicateKey,
        expandRow,
        validateItem,
        onProgress,
        onReadProgress,
        keepFile = false,
        respond = true
    } = options;

    const spec = getBulkModule(moduleKey);

    if (!file) {
        const body = {
            success: false,
            completed: false,
            message: "Please choose a file to upload (Excel, CSV, Word, PDF or a photo of the list)."
        };
        if (res && respond) res.status(400).json(body);
        return body;
    }

    let upload;

    try {
        upload = await readUpload(file, spec, onReadProgress);
    } catch (error) {
        if (!keepFile) removeUploadedFile(file);
        const body = {
            success: false,
            completed: false,
            message: error.message || "This file could not be read.",
            errors: [error.message || "This file could not be read."],
            errorDetails: [{ row: null, column: "", value: file.originalname, reason: error.message || "This file could not be read.", type: "file" }]
        };
        if (res && respond) res.status(error.status || 400).json(body);
        return body;
    }

    const report = new BulkReport({
        module: moduleKey,
        title: spec.title,
        fileName: file.originalname,
        sourceLabel: upload.sourceLabel,
        headers: upload.headers,
        warnings: upload.warnings,
        total: upload.rows.length
    });

    if (upload.headers.looksLikeErrorReport) {
        if (!keepFile) removeUploadedFile(file);
        const message =
            "This file is an old Error Report — it only lists the problems (row, column, reason) and has no record data, so there is nothing to upload. " +
            "Download the new Error Report (it contains the full failed rows with all their columns), correct those rows and upload that file.";
        const body = {
            success: false,
            completed: false,
            message,
            errors: [message],
            errorDetails: [{ row: null, column: "", value: file.originalname, reason: message, type: "file" }]
        };
        if (res && respond) res.status(400).json(body);
        return body;
    }

    if (!upload.rows.length) {
        report.fail(
            { __row: null },
            "",
            file.originalname,
            upload.sourceFormat === "pdf" || upload.sourceFormat === "photo"
                ? `No rows could be read from this ${upload.sourceLabel}. Make sure it contains a table whose header row uses the column names from the sample file.`
                : "The file has no data rows under the header row."
        );
    }

    if (upload.headers.missingRequired.length) {
        report.warn(
            `Required column${upload.headers.missingRequired.length === 1 ? "" : "s"} not found in the file: ${upload.headers.missingRequired.join(", ")}. Rows that need ${upload.headers.missingRequired.length === 1 ? "it" : "them"} are listed as failed.`
        );
    }

    if (upload.headers.extra.length) {
        report.warn(
            `Extra column${upload.headers.extra.length === 1 ? "" : "s"} saved with the uploaded records: ${upload.headers.extra.join(", ")}.`
        );
    }

    const base = {
        spec,
        report,
        rows: upload.rows,
        user: req?.user,
        req,
        headers: upload.headers,
        data: {}
    };

    try {
        if (prepare) await prepare(base);
    } catch (error) {
        if (!keepFile) removeUploadedFile(file);
        const t = translateDbError(error);
        const body = {
            success: false,
            completed: false,
            message: `Bulk upload could not start: ${t.reason}`,
            errors: [t.reason]
        };
        if (res && respond) res.status(500).json(body);
        return body;
    }

    const seen = new Map();
    const columnLabels = spec.dbLabels || {};
    let processed = 0;

    for (const row of upload.rows) {
        const before = report.errorCount;

        const ctx = {
            ...base,
            row,
            extra: row.__extra || {},
            fail: (column, value, reason) => report.fail(row, column, value, reason),
            duplicate: (column, value, reason) => report.duplicate(row, column, value, reason),
            note: (column, value, reason) => report.note(row, column, value, reason),
            cell: (column) => cell(row, column),
            text: (column) => text(cell(row, column)),
            date: (column, { required = false, label } = {}) => {
                const value = cell(row, column);
                if (isBlank(value)) {
                    if (required) report.fail(row, label || column, "", `${label || column} is required.`);
                    return null;
                }
                const parsed = parseDate(value);
                if (!parsed) report.fail(row, label || column, value, "Invalid date. Use DD/MM/YYYY format.");
                return parsed;
            },
            yesNo: (column, defaultValue = false) => {
                const value = cell(row, column);
                const parsed = parseYesNo(value, defaultValue);
                if (parsed === null) {
                    report.fail(row, column, value, `${column} must be Yes or No.`);
                    return defaultValue;
                }
                return parsed;
            },
            number: (column, { required = false, min } = {}) => {
                const value = cell(row, column);
                const parsed = parseNumber(value);
                if (parsed === null) {
                    if (required) report.fail(row, column, "", `${column} is required.`);
                    return null;
                }
                if (Number.isNaN(parsed)) {
                    report.fail(row, column, value, `${column} must be a number.`);
                    return null;
                }
                if (min !== undefined && parsed < min) {
                    report.fail(row, column, value, `${column} cannot be less than ${min}.`);
                    return null;
                }
                return parsed;
            },
            require: (...columns) => {
                // require("Employee ID", "Employee Name") = at least one of them.
                const has = columns.some((c) => !isBlank(cell(row, c)));
                if (!has) {
                    const missingInFile = columns.every((c) => !upload.headers.matched.includes(c));
                    report.fail(
                        row,
                        columns.join(" / "),
                        "",
                        missingInFile
                            ? `Column "${columns.join(" / ")}" is missing from the file.`
                            : `${columns.join(" or ")} is required.`
                    );
                }
                return has;
            }
        };

        // Saves ONE record (a row, or one item of an expanded row).
        const saveOne = async (itemCtx) => {
            const itemBefore = report.errorCount;
            try {
                if (validateItem) await validateItem(row, itemCtx);

                // In-file duplicate check.
                if (duplicateKey && report.errorCount === itemBefore) {
                    // duplicateKey may return "key" or { key, column, value }
                    const dk = duplicateKey(row, itemCtx);
                    const key = dk && typeof dk === "object" ? dk.key : dk;
                    if (key) {
                        if (seen.has(key)) {
                            report.duplicate(
                                row,
                                (dk && dk.column) || spec.duplicateColumn || "Row",
                                dk && dk.value !== undefined ? dk.value : String(key).replace(/\|/g, " · "),
                                `Same record as row ${seen.get(key)} in this file — skipped as a duplicate.`
                            );
                        } else {
                            seen.set(key, row.__row);
                        }
                    }
                }

                if (report.errorCount !== itemBefore) return;

                const result = (await processRow(row, itemCtx)) || {};
                if (result.skipped || report.errorCount !== itemBefore) return;

                report.ok(row, result);

                const extra = result.extra !== undefined ? result.extra : row.__extra;
                const id = result.id;
                const table = result.table || spec.table;
                if (id && table && extra && Object.keys(cleanExtras(extra)).length) {
                    try {
                        if (await saveExtraData(table, id, extra, { idColumn: spec.idColumn || "id" })) {
                            report.extraSaved += 1;
                        }
                    } catch (error) {
                        report.warn(`Row ${row.__row}: the record was saved, but its extra columns could not be stored (${error.message}).`);
                    }
                }
            } catch (error) {
                const t = error?.isRowError
                    ? { column: error.bulkColumn, value: error.bulkValue, reason: error.message }
                    : translateDbError(error, columnLabels);
                if (!error?.isRowError) {
                    console.error(`[bulk-upload:${moduleKey}] row ${row.__row}:`, error?.code || "", error?.sqlMessage || error?.message);
                }
                const value = t.value !== undefined ? t.value : t.column ? cell(row, t.column) : "";
                if (t.duplicate) report.duplicate(row, t.column, value, t.reason);
                else report.fail(row, t.column, value, t.reason);
            }
        };

        try {
            // 1. Generic required-column check (from the module definition).
            requiredGroups(spec).forEach((group) => {
                if (spec.skipAutoRequired?.includes(group[0])) return;
                ctx.require(...group);
            });

            // 2. Module validation (collects every problem in the row).
            if (validateRow) await validateRow(row, ctx);

            // 3. Save — only when the row itself has no problems.
            if (report.errorCount === before) {
                // A row may hold several records (e.g. 14 stores listed in
                // one "Planned Stores" cell): each one is saved on its own,
                // so one bad store never blocks the others.
                const items = expandRow ? await expandRow(row, ctx) : null;

                if (Array.isArray(items)) {
                    if (!items.length && report.errorCount === before) {
                        report.fail(row, "", "", "Nothing to upload in this row.");
                    }
                    for (const item of items) {
                        await saveOne({ ...ctx, item });
                    }
                } else if (report.errorCount === before) {
                    await saveOne(ctx);
                }
            }
        } catch (error) {
            const t = error?.isRowError
                ? { column: error.bulkColumn, value: error.bulkValue, reason: error.message }
                : translateDbError(error, columnLabels);
            if (!error?.isRowError) {
                console.error(`[bulk-upload:${moduleKey}] row ${row.__row}:`, error?.code || "", error?.sqlMessage || error?.message);
            }
            const value = t.value !== undefined ? t.value : t.column ? cell(row, t.column) : "";
            if (t.duplicate) report.duplicate(row, t.column, value, t.reason);
            else report.fail(row, t.column, value, t.reason);
        }

        processed += 1;
        if (onProgress && (processed % 25 === 0 || processed === upload.rows.length)) {
            try {
                onProgress({
                    processed,
                    total: upload.rows.length,
                    created: report.uploaded,
                    failed: report.failed + report.skipped,
                    report
                });
            } catch {
                // progress reporting must never break the import
            }
        }

        if (processed % 200 === 0) await new Promise((r) => setImmediate(r));
    }

    try {
        if (finalize) await finalize(base);
    } catch (error) {
        report.warn(`Post-upload step failed: ${error.message}`);
    }

    if (!keepFile) removeUploadedFile(file);

    const body = report.toJSON();
    if (res && respond) res.status(200).json(body);
    return body;
}

module.exports = {
    runBulkUpload,
    readUpload,
    BulkReport,
    translateDbError,
    rowError,
    saveExtraData,
    ensureExtraColumn,
    cleanExtras,
    removeUploadedFile,
    call,
    sql,
    text,
    isBlank,
    parseDate,
    formatDmy,
    parseYesNo,
    parseNumber,
    isEmail,
    pickAllowed,
    cell,
    EXTRA_COLUMN
};
