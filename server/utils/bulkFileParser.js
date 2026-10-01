// ==========================================================
// MI ARCUS — UNIVERSAL BULK FILE PARSER  (v2)
// ==========================================================
//
// Turns ANY bulk-upload source file into a plain array of row
// objects keyed by column header so every module can validate and
// import rows the same way, whatever the admin actually attached:
//
//   .csv / .tsv / .txt      -> streamed, delimiter auto-detected
//                              ( , ; TAB | )
//   .xlsx / .xlsm / .xlsb /
//   .xls / .ods             -> every sheet that looks like a table
//   .docx                   -> every Word table (or "Field: value"
//                              text when the document has no table)
//   .doc                    -> legacy Word, best-effort table/text read
//   .pdf                    -> text/table extraction (pdf-parse)
//   .json                   -> array of objects
//   .jpg/.jpeg/.png/.webp   -> resized + OCR (sharp + tesseract.js)
//
// WHAT CHANGED IN v2
// ----------------------------------------------------------
// 1. NO COLUMN IS DROPPED ANY MORE. Columns that match a known field
//    are returned under the field's canonical name exactly as before.
//    Every other column is kept on the row as `row.__extra`
//    ({ "Transport Mode": "Car", "Travel Cost": 3500 }) using the
//    exact header text from the file, so the importer can save it.
//
// 2. EVERY ROW KNOWS WHERE IT CAME FROM. `row.__row` is the real
//    line number the user sees in Excel / the CSV (header = its own
//    line number, first data row = header + 1, blank lines counted),
//    and `row.__sheet` is the sheet / table name. Error reports can
//    therefore say "Row 7 · Store Code · ABC123 · Store not found".
//
// 3. HEADER TOLERANCE. Header matching ignores case, spaces,
//    punctuation, "*" required markers and "(dd/mm/yyyy)" style hints.
//    A header that is only slightly misspelt ("Viste Date") is mapped
//    to the closest known column and reported back as auto-corrected.
//
// 4. HEADER REPORT. The result includes `headers`, a list of every
//    column found in the file with its status (matched / corrected /
//    extra), used by the Column Validation screen and the final
//    upload report.
//
// The extra metadata fields are NON-ENUMERABLE, so existing callers
// that spread / JSON.stringify rows see exactly the same objects as
// before — this file is fully backward-compatible with v1 callers.
// ==========================================================

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const csvParser = require("csv-parser");

function safeRequire(name) {
    try {
        return require(name);
    } catch {
        return null;
    }
}

const pdfParse = safeRequire("pdf-parse");
const sharp = safeRequire("sharp");
const Tesseract = safeRequire("tesseract.js");

// ==========================================================
// DEFAULT COLUMN ALIASES (Users) — kept for v1 callers
// ==========================================================

const DEFAULT_COLUMN_ALIASES = {
    "Employee ID": ["employeeid", "empid", "employee id", "id", "staffid", "employeecode", "empcode"],
    "Name": ["name", "fullname", "employeename", "staffname"],
    "Email": ["email", "emailaddress", "mail", "emailid"],
    "Call Contact": ["callcontact", "contact", "phone", "mobile", "mobilenumber", "phonenumber", "contactnumber"],
    "WhatsApp Contact": ["whatsappcontact", "whatsapp", "whatsappnumber"],
    "Department": ["department", "dept", "departmentname"],
    "Designation": ["designation", "role", "position", "title", "designationname"],
    "Reports To": ["reportsto", "reporting", "manager", "supervisor", "reportingmanager"],
    "Status": ["status", "active"]
};

// ==========================================================
// HEADER NORMALISATION / MATCHING
// ==========================================================

function normalizeKey(key) {
    return String(key ?? "")
        .replace(/^﻿/, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// "Visit Date (dd/mm/yyyy) *" -> "visitdate"
function normalizeHeaderLoose(key) {
    return normalizeKey(
        String(key ?? "")
            .replace(/\([^)]*\)/g, " ")
            .replace(/\[[^\]]*\]/g, " ")
            .replace(/\*/g, " ")
    );
}

function buildAliasLookup(columnAliases) {
    const lookup = {};
    for (const [canonical, aliases] of Object.entries(columnAliases || {})) {
        lookup[normalizeKey(canonical)] = canonical;
        for (const alias of aliases || []) {
            const key = normalizeKey(alias);
            if (key && !lookup[key]) lookup[key] = canonical;
        }
    }
    return lookup;
}

function canonicalHeaderFor(rawHeader, aliasLookup) {
    if (rawHeader === undefined || rawHeader === null) return null;
    return (
        aliasLookup[normalizeKey(rawHeader)] ||
        aliasLookup[normalizeHeaderLoose(rawHeader)] ||
        null
    );
}

function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const curr = [i];
        for (let j = 1; j <= b.length; j++) {
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        prev = curr;
    }
    return prev[b.length];
}

function similarity(a, b) {
    if (!a || !b) return 0;
    const max = Math.max(a.length, b.length);
    return max ? 1 - levenshtein(a, b) / max : 0;
}

// Closest known column for a header that did not match exactly.
function fuzzyCanonicalFor(rawHeader, aliasLookup, minScore = 0.75) {
    const key = normalizeHeaderLoose(rawHeader);
    if (key.length < 4) return null;

    let best = null;
    let bestScore = 0;

    for (const [alias, canonical] of Object.entries(aliasLookup)) {
        if (alias.length < 4) continue;
        const score = similarity(key, alias);
        if (score > bestScore) {
            bestScore = score;
            best = canonical;
        }
    }

    return bestScore >= minScore ? best : null;
}

// ==========================================================
// SMALL HELPERS
// ==========================================================

const YIELD_EVERY_N_ROWS = 1000;

function yieldToEventLoop() {
    return new Promise((resolve) => setImmediate(resolve));
}

function isEmptyCell(cell) {
    return cell === undefined || cell === null || String(cell).trim() === "";
}

function isBlankRow(cells) {
    return !cells || cells.every(isEmptyCell);
}

function nonEmptyCount(cells) {
    return (cells || []).filter((c) => !isEmptyCell(c)).length;
}

function columnLetter(index) {
    let n = index + 1;
    let s = "";
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

function defineHidden(obj, key, value) {
    Object.defineProperty(obj, key, {
        value,
        enumerable: false,
        writable: true,
        configurable: true
    });
}

function scoreHeaderRow(cells, aliasLookup) {
    return (cells || []).filter((cell) => canonicalHeaderFor(cell, aliasLookup)).length;
}

// Index (into `candidates`) of the most header-like row among the first
// 15 non-blank rows. Falls back to the first row that has at least two
// text cells, then to 0.
function isHeaderLikeText(cell) {
    if (isEmptyCell(cell)) return false;
    const text = String(cell).trim();
    return isNaN(Number(text)) && text.length <= 40;
}

function findHeaderIndex(candidates, aliasLookup) {
    let bestIndex = -1;
    let bestScore = 0;
    const limit = Math.min(candidates.length, 15);

    for (let i = 0; i < limit; i++) {
        const score = scoreHeaderRow(candidates[i], aliasLookup);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }

    // Two or more known column names on one row = certainly the header.
    if (bestScore >= 2) return { index: bestIndex, score: bestScore };

    // Otherwise a single match may just be a DATA value that happens to
    // look like a column name (e.g. "Store Name" written inside an error
    // report). Prefer the first row that looks like a header row
    // (several short text cells) when it comes before that match.
    let firstText = -1;
    for (let i = 0; i < limit; i++) {
        const textCells = (candidates[i] || []).filter(isHeaderLikeText).length;
        if (textCells >= 2) {
            firstText = i;
            break;
        }
    }

    if (firstText !== -1 && (bestIndex === -1 || firstText <= bestIndex)) {
        return { index: firstText, score: scoreHeaderRow(candidates[firstText], aliasLookup) };
    }

    if (bestIndex !== -1) return { index: bestIndex, score: bestScore };
    return { index: firstText === -1 ? 0 : firstText, score: 0 };
}

// ==========================================================
// HEADER PLAN — decides, for every column of the header row,
// which canonical field it maps to (or that it is an extra column).
// ==========================================================

function buildHeaderPlan(headerCells, aliasLookup, sheetName) {
    const used = new Set();
    const plan = [];

    // Pass 1 — exact / loose matches.
    (headerCells || []).forEach((cell, idx) => {
        const label = isEmptyCell(cell) ? "" : String(cell).replace(/^﻿/, "").trim();
        const canonical = label ? canonicalHeaderFor(label, aliasLookup) : null;

        if (canonical && canonical.startsWith("__")) {
            // Columns that MIARCUS itself adds to reports/exports (Error
            // Reason, Excel Row, Upload Status ...): recognised, not data.
            plan[idx] = { index: idx, source: label, target: canonical, status: "ignored", sheet: sheetName };
        } else if (canonical && !used.has(canonical)) {
            used.add(canonical);
            plan[idx] = { index: idx, source: label, target: canonical, status: "matched", sheet: sheetName };
        } else {
            plan[idx] = { index: idx, source: label, target: null, status: "extra", sheet: sheetName };
        }
    });

    // Pass 2 — fuzzy matches for the remaining labelled columns.
    plan.forEach((entry) => {
        if (!entry || entry.target || !entry.source) return;
        const guess = fuzzyCanonicalFor(entry.source, aliasLookup);
        if (guess && !used.has(guess)) {
            used.add(guess);
            entry.target = guess;
            entry.status = "corrected";
        }
    });

    // Unlabelled columns get a stable spreadsheet-style name.
    plan.forEach((entry) => {
        if (entry && !entry.source) entry.source = `Column ${columnLetter(entry.index)}`;
    });

    return plan;
}

// Turn one data row (cells array) into a row object using the plan.
// `display` is an optional parallel array of formatted strings (Excel's
// displayed text) used for extra columns so dates/percentages keep the
// look the user typed.
function buildRow(cells, plan, rowNumber, sheetName, display) {
    const row = {};
    const extra = {};
    const raw = {};
    const display_ = {};
    let recognised = 0;
    let filled = 0;

    const width = Math.max(cells.length, plan.length);

    for (let idx = 0; idx < width; idx++) {
        const value = cells[idx];
        if (isEmptyCell(value)) continue;
        filled++;

        const entry = plan[idx] || {
            index: idx,
            source: `Column ${columnLetter(idx)}`,
            target: null,
            status: "extra"
        };

        const shown =
            display && !isEmptyCell(display[idx]) ? display[idx] : value;

        raw[entry.source] = value;
        display_[entry.source] = typeof shown === "string" ? shown.trim() : shown;

        if (entry.target && entry.target.startsWith("__")) {
            continue;
        }

        if (entry.target) {
            row[entry.target] = typeof value === "string" ? value.trim() : value;
            recognised++;
        } else {
            extra[entry.source] = typeof shown === "string" ? shown.trim() : shown;
        }
    }

    // Skip rows with nothing useful: either completely blank, or a lone
    // note line ("Note: ...") that only fills an unrecognised column.
    if (!filled) return null;
    if (!recognised && filled < 2) return null;

    defineHidden(row, "__row", rowNumber);
    defineHidden(row, "__sheet", sheetName || null);
    defineHidden(row, "__extra", extra);
    defineHidden(row, "__raw", raw);
    defineHidden(row, "__display", display_);

    return row;
}

// ==========================================================
// GENERIC TABLE -> ROWS (used by Excel, Word, PDF, JSON paths)
// table = { name, rows: [{ cells, rowNumber, display? }] }
// ==========================================================

async function tableToRows(table, aliasLookup, onProgress) {
    const nonBlank = table.rows.filter((r) => !isBlankRow(r.cells));
    if (!nonBlank.length) return { rows: [], plan: [], score: 0 };

    const { index, score } = findHeaderIndex(
        nonBlank.map((r) => r.cells),
        aliasLookup
    );

    const headerEntry = nonBlank[index];
    const plan = buildHeaderPlan(headerEntry.cells, aliasLookup, table.name);
    const rows = [];

    const startPos = table.rows.indexOf(headerEntry) + 1;

    for (let i = startPos; i < table.rows.length; i++) {
        const entry = table.rows[i];
        if (isBlankRow(entry.cells)) continue;

        const row = buildRow(entry.cells, plan, entry.rowNumber, table.name, entry.display);
        if (row) rows.push(row);

        if ((i - startPos) % YIELD_EVERY_N_ROWS === 0 && i !== startPos) {
            if (onProgress) onProgress(rows.length);
            await yieldToEventLoop();
        }
    }

    return { rows, plan, score };
}

// Pick which tables (sheets / Word tables) to import.
function pickTables(evaluated) {
    const withRows = evaluated.filter((t) => t.result.rows.length);
    if (!withRows.length) return evaluated.slice(0, 1);

    const best = Math.max(...withRows.map((t) => t.result.score));
    if (best <= 1) return [withRows.find((t) => t.result.score === best)];

    return withRows.filter((t) => t.result.score >= Math.max(2, Math.ceil(best * 0.6)));
}

// ==========================================================
// CSV / TSV / TXT — STREAMED
// ==========================================================

function sniffDelimiter(filePath) {
    let sample = "";
    try {
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(16384);
        const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);
        sample = buffer.subarray(0, bytes).toString("utf8");
    } catch {
        return ",";
    }

    const lines = sample.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
    if (!lines.length) return ",";

    const candidates = [",", ";", "\t", "|"];
    let best = ",";
    let bestScore = 0;

    for (const delimiter of candidates) {
        const counts = lines.map((line) => line.split(delimiter).length - 1);
        const max = Math.max(...counts);
        if (!max) continue;
        // Prefer a delimiter that appears consistently on many lines.
        const consistent = counts.filter((c) => c === counts[0] || c === max).length;
        const score = max * consistent;
        if (score > bestScore) {
            bestScore = score;
            best = delimiter;
        }
    }

    return best;
}

function rawCsvRowToArray(rawRow) {
    return Object.keys(rawRow)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => rawRow[key]);
}

function parseCsvStream(filePath, aliasLookup, onProgress) {
    return new Promise((resolve, reject) => {
        const separator = sniffDelimiter(filePath);
        const headerBuffer = []; // { cells, rowNumber }
        let plan = null;
        const rows = [];
        let lineNumber = 0;
        let settled = false;
        let headerScore = 0;

        const source = fs.createReadStream(filePath);
        const parser = csvParser({ headers: false, separator });

        const fail = (err) => {
            if (settled) return;
            settled = true;
            source.destroy();
            parser.destroy();
            reject(err);
        };

        const pushDataRow = (cells, rowNumber) => {
            const row = buildRow(cells, plan, rowNumber, null);
            if (row) rows.push(row);
        };

        const finalizeHeader = () => {
            const found = findHeaderIndex(headerBuffer.map((r) => r.cells), aliasLookup);
            headerScore = found.score;
            const header = headerBuffer[found.index];
            plan = buildHeaderPlan(header ? header.cells : [], aliasLookup, null);
            for (let i = found.index + 1; i < headerBuffer.length; i++) {
                pushDataRow(headerBuffer[i].cells, headerBuffer[i].rowNumber);
            }
            headerBuffer.length = 0;
        };

        parser.on("data", (rawRow) => {
            lineNumber += 1;
            const cells = rawCsvRowToArray(rawRow);

            if (lineNumber === 1 && typeof cells[0] === "string") {
                cells[0] = cells[0].replace(/^﻿/, "");
            }

            if (isBlankRow(cells)) return;

            if (!plan) {
                headerBuffer.push({ cells, rowNumber: lineNumber });
                if (headerBuffer.length >= 15) finalizeHeader();
            } else {
                pushDataRow(cells, lineNumber);
            }

            if (lineNumber % YIELD_EVERY_N_ROWS === 0) {
                if (onProgress) onProgress(lineNumber);
                parser.pause();
                yieldToEventLoop().then(() => {
                    if (!settled) parser.resume();
                });
            }
        });

        parser.on("end", () => {
            if (!plan) finalizeHeader();
            if (onProgress) onProgress(lineNumber);
            if (settled) return;
            settled = true;
            resolve({ rows, plan: plan || [], warnings: [], score: headerScore });
        });

        parser.on("error", fail);
        source.on("error", fail);
        source.pipe(parser);
    });
}

// ==========================================================
// EXCEL (all SheetJS-readable workbooks)
// ==========================================================

const LARGE_XLSX_WARNING_BYTES = 20 * 1024 * 1024;

function sheetToTable(sheet, name) {
    const ref = sheet && sheet["!ref"];
    if (!ref) return { name, rows: [] };

    const range = XLSX.utils.decode_range(ref);
    const rows = [];

    // Vertically merged cells (e.g. one Employee cell merged across the
    // 5 store rows of that employee) only hold their value in the first
    // cell — copy it down so every row gets the value it visually shows.
    (sheet["!merges"] || []).forEach((merge) => {
        if (merge.e.r <= merge.s.r) return;
        const top = sheet[XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })];
        if (!top || top.v === undefined || top.v === null || top.v === "") return;
        for (let r = merge.s.r + 1; r <= merge.e.r; r++) {
            const address = XLSX.utils.encode_cell({ r, c: merge.s.c });
            if (!sheet[address] || sheet[address].v === undefined || sheet[address].v === "") {
                sheet[address] = { ...top };
            }
        }
    });

    for (let r = range.s.r; r <= range.e.r; r++) {
        const cells = [];
        const display = [];
        let any = false;

        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            const idx = c - range.s.c;
            if (!cell || cell.v === undefined || cell.v === null) {
                cells[idx] = "";
                display[idx] = "";
                continue;
            }
            cells[idx] = cell.v;
            display[idx] = cell.w !== undefined ? cell.w : cell.v;
            if (!isEmptyCell(cell.v)) any = true;
        }

        rows.push({ cells: any ? cells : [], display, rowNumber: r + 1 });
    }

    return { name, rows };
}

async function parseWorkbook(filePath, aliasLookup, onProgress) {
    await yieldToEventLoop();

    const workbook = XLSX.readFile(filePath);
    const evaluated = [];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const table = sheetToTable(sheet, sheetName);
        const result = await tableToRows(table, aliasLookup, onProgress);
        evaluated.push({ name: sheetName, result });
    }

    const picked = pickTables(evaluated);
    const multi = picked.length > 1;
    const rows = [];
    const plans = [];

    for (const table of picked) {
        if (!table) continue;
        table.result.rows.forEach((row) => {
            if (!multi) row.__sheet = null;
            rows.push(row);
        });
        plans.push(...table.result.plan.filter(Boolean).map((p) => ({ ...p, sheet: multi ? table.name : null })));
    }

    const warnings = [];
    if (multi) {
        warnings.push(
            `Rows were read from ${picked.length} sheets: ${picked.map((t) => t.name).join(", ")}.`
        );
    }

    if (onProgress) onProgress(rows.length);
    return { rows, plan: plans, warnings, score: picked[0]?.result?.score || 0 };
}

// ==========================================================
// WORD (.docx / .doc)
// ==========================================================

function decodeXmlEntities(text) {
    return String(text || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&amp;/g, "&");
}

function xmlParagraphText(xml) {
    // Paragraph -> text of its runs, tabs and breaks preserved.
    const tokens = xml.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g) || [];
    return decodeXmlEntities(
        tokens
            .map((token) => {
                if (token.startsWith("<w:tab")) return "\t";
                if (token.startsWith("<w:br")) return " ";
                return token.replace(/^<w:t(?:\s[^>]*)?>/, "").replace(/<\/w:t>$/, "");
            })
            .join("")
    );
}

function readDocxXml(filePath) {
    const cfb = XLSX.CFB.read(fs.readFileSync(filePath), { type: "buffer" });
    const entry = XLSX.CFB.find(cfb, "/word/document.xml");
    if (!entry || !entry.content) {
        const error = new Error("This Word file could not be opened. Save it again as .docx (or export the table to Excel) and upload it.");
        error.status = 400;
        throw error;
    }
    return Buffer.from(entry.content).toString("utf8");
}

function docxTables(xml) {
    const tables = [];
    const tableRe = /<w:tbl(?:\s[^>]*)?>([\s\S]*?)<\/w:tbl>/g;
    let match;
    let tableNo = 0;

    while ((match = tableRe.exec(xml))) {
        tableNo += 1;
        const rows = [];
        const rowRe = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
        let rowMatch;
        let rowNo = 0;

        while ((rowMatch = rowRe.exec(match[1]))) {
            rowNo += 1;
            const cells = [];
            const cellRe = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
            let cellMatch;
            while ((cellMatch = cellRe.exec(rowMatch[0]))) {
                const paragraphs = cellMatch[1].match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
                cells.push(paragraphs.map(xmlParagraphText).join(" ").trim());
            }
            rows.push({ cells, rowNumber: rowNo });
        }

        tables.push({ name: `Table ${tableNo}`, rows });
    }

    return tables;
}

function docxText(xml) {
    const body = xml.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, "\n");
    const paragraphs = body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    return paragraphs.map(xmlParagraphText).join("\n");
}

// Legacy binary .doc — best-effort. Text lives in the WordDocument
// stream; table cells end with 0x07 and a row ends with an extra 0x07.
function readDocText(filePath) {
    const cfb = XLSX.CFB.read(fs.readFileSync(filePath), { type: "buffer" });
    const entry = XLSX.CFB.find(cfb, "/WordDocument") || XLSX.CFB.find(cfb, "WordDocument");
    if (!entry || !entry.content) {
        const error = new Error("This .doc file could not be read. Open it in Word and save it as .docx (or copy the table into Excel) and upload again.");
        error.status = 400;
        throw error;
    }

    const buf = Buffer.from(entry.content);
    const candidates = [buf.toString("utf16le"), buf.toString("latin1")];

    const clean = (text) =>
        text
            .replace(/[^\x07\t\r\n\x20-\x7E -￿]/g, "\u0000")
            .split("\u0000")
            .filter((chunk) => chunk.replace(/[\x07\s]/g, "").length >= 2)
            .join("\r");

    const scored = candidates.map((text) => {
        const cleaned = clean(text);
        const letters = (cleaned.match(/[A-Za-z0-9]/g) || []).length;
        return { cleaned, letters };
    });

    scored.sort((a, b) => b.letters - a.letters);
    return scored[0].cleaned;
}

function docTextToTable(text) {
    if (!text.includes("\x07")) return null;

    const rows = [];
    let current = [];
    let rowNumber = 0;

    const parts = text.split("\x07");
    for (let i = 0; i < parts.length; i++) {
        let piece = parts[i];
        // The first cell of a row also carries any paragraphs that came
        // before the table — keep only the text after the last paragraph mark.
        if (!current.length && piece.includes("\r")) piece = piece.slice(piece.lastIndexOf("\r") + 1);
        const cellText = piece.replace(/\r/g, " ").trim();
        if (parts[i] === "" && current.length) {
            rowNumber += 1;
            rows.push({ cells: current, rowNumber });
            current = [];
            continue;
        }
        current.push(cellText);
    }
    // Anything after the last row-end mark is document text after the
    // table (or binary noise), not a table row.

    return rows.length ? { name: "Table 1", rows } : null;
}

// ==========================================================
// TEXT -> ROWS (PDF, Word paragraphs, OCR)
// ==========================================================

function splitTextLine(line) {
    if (line.includes("|")) {
        return line.split("|").map((c) => c.trim()).filter((c, i, arr) => !(c === "" && (i === 0 || i === arr.length - 1)));
    }
    if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
    if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim());
    if ((line.match(/,/g) || []).length >= 2) return line.split(",").map((c) => c.trim());
    return [line.trim()];
}

function textTable(lines, aliasLookup) {
    for (let i = 0; i < Math.min(lines.length, 25); i++) {
        const cells = splitTextLine(lines[i]);
        if (scoreHeaderRow(cells, aliasLookup) >= 2) {
            const table = {
                name: null,
                rows: lines.slice(i).map((line, k) => ({
                    cells: splitTextLine(line),
                    rowNumber: k + 1
                }))
            };
            return table;
        }
    }
    return null;
}

// "Field: value" blocks — one record per block; a repeated field
// starts a new record.
function keyValueRecords(lines, aliasLookup) {
    const records = [];
    let current = null;
    let currentLine = 0;
    const KV = /^([^:]{2,60}?)\s*[:=–-]\s*(.*)$/;

    lines.forEach((line, idx) => {
        const match = line.match(KV);
        if (!match) return;
        const canonical = canonicalHeaderFor(match[1], aliasLookup) || fuzzyCanonicalFor(match[1], aliasLookup);
        const label = match[1].trim();
        const value = match[2].trim();

        if (!current || (canonical && Object.prototype.hasOwnProperty.call(current.row, canonical))) {
            if (current) records.push(current);
            current = { row: {}, extra: {}, line: idx + 1 };
            currentLine = idx + 1;
        }

        if (canonical) current.row[canonical] = value;
        else current.extra[label] = value;
    });

    if (current) records.push(current);

    return records
        .filter((rec) => Object.keys(rec.row).length >= 2)
        .map((rec, i) => {
            const row = rec.row;
            defineHidden(row, "__row", i + 1);
            defineHidden(row, "__sheet", null);
            defineHidden(row, "__extra", rec.extra);
            defineHidden(row, "__raw", { ...rec.row, ...rec.extra });
            defineHidden(row, "__line", rec.line || currentLine);
            return row;
        });
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const ID_TOKEN_PATTERN = /\b(?=[A-Z0-9]{3,10}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])[A-Z0-9]{3,10}\b/i;

function parseLineMode(lines, aliasLookup) {
    const targets = Object.values(aliasLookup);
    if (!targets.includes("Email")) return [];

    const idCanonical = targets.includes("Employee ID") ? "Employee ID" : null;
    const nameCanonical = targets.includes("Name") ? "Name" : null;
    const rows = [];

    lines.forEach((line, idx) => {
        const emailMatch = line.match(EMAIL_PATTERN);
        if (!emailMatch) return;

        const email = emailMatch[0];
        let name = line.slice(0, emailMatch.index).trim();
        let idToken = "";
        const idMatch = line.match(ID_TOKEN_PATTERN);
        if (idMatch && idMatch[0].toLowerCase() !== email.split("@")[0].toLowerCase()) {
            idToken = idMatch[0];
            name = name.replace(idMatch[0], "").trim();
        }
        name = name.replace(/^[-,|:\s]+|[-,|:\s]+$/g, "");

        const row = { Email: email };
        if (nameCanonical) row[nameCanonical] = name;
        if (idCanonical && idToken) row[idCanonical] = idToken;
        defineHidden(row, "__row", idx + 1);
        defineHidden(row, "__sheet", null);
        defineHidden(row, "__extra", {});
        defineHidden(row, "__raw", { ...row });
        rows.push(row);
    });

    return rows;
}

async function parseTextToRows(text, aliasLookup) {
    const lines = String(text || "")
        .split(/\r?\n|\r/)
        .map((l) => l.replace(/\s+$/g, "").trim())
        .filter(Boolean);

    const table = textTable(lines, aliasLookup);
    if (table) {
        const result = await tableToRows(table, aliasLookup);
        if (result.rows.length) return { rows: result.rows, plan: result.plan, mode: "table" };
    }

    const kv = keyValueRecords(lines, aliasLookup);
    if (kv.length) {
        const seen = new Map();
        kv.forEach((row) => {
            Object.keys(row).forEach((k) => seen.set(k, { source: k, target: k, status: "matched" }));
            Object.keys(row.__extra).forEach((k) => {
                if (!seen.has(k)) seen.set(k, { source: k, target: null, status: "extra" });
            });
        });
        return { rows: kv, plan: [...seen.values()], mode: "fields" };
    }

    const lineRows = parseLineMode(lines, aliasLookup);
    return {
        rows: lineRows,
        plan: lineRows.length
            ? [{ source: "Email", target: "Email", status: "matched" }]
            : [],
        mode: "line"
    };
}

// ==========================================================
// PDF
// ==========================================================

// Reads every text fragment WITH its position, so table columns can be
// rebuilt from where the text sits on the page (plain PDF text loses the
// gaps between cells: "Emp IDEmployee NameFrom Date").
async function readPdfItems(buffer) {
    const pages = [];
    let pageNo = 0;

    const pagerender = (pageData) => {
        pageNo += 1;
        const current = pageNo;
        return pageData
            .getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false })
            .then((content) => {
                const items = (content.items || [])
                    .filter((item) => String(item.str || "").trim() !== "")
                    .map((item) => ({
                        str: String(item.str),
                        x: item.transform[4],
                        y: item.transform[5],
                        w: Number(item.width) || String(item.str).length * 5,
                        h: Math.abs(item.transform[3]) || 10
                    }));
                pages.push({ page: current, items });
                return items.map((i) => i.str).join(" ");
            });
    };

    const result = await pdfParse(buffer, { pagerender });
    pages.sort((a, b) => a.page - b.page);
    return { pages, text: result.text || "" };
}

// Groups positioned fragments into text lines (top to bottom). Each
// fragment keeps its x position and width.
function pdfLines(pages) {
    const lines = [];

    pages.forEach(({ page, items }) => {
        const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
        const pageLines = [];

        sorted.forEach((item) => {
            const tolerance = Math.max(2, item.h * 0.4);
            const line = pageLines.find((l) => Math.abs(l.y - item.y) <= tolerance);
            if (line) line.items.push(item);
            else pageLines.push({ y: item.y, items: [item] });
        });

        pageLines.sort((a, b) => b.y - a.y);

        pageLines.forEach((line) => {
            const cells = line.items
                .sort((a, b) => a.x - b.x)
                .map((item) => ({ text: item.str.replace(/\s+/g, " ").trim(), x: item.x, w: item.w, h: item.h }))
                .filter((c) => c.text);
            if (cells.length) lines.push({ page, y: line.y, cells });
        });
    });

    return lines;
}

// Header fragments -> header cells. Neighbouring fragments are joined only
// when that produces a known column name ("Reason" + "to Travel"), or
// when neither part is a known column and they are a word-space apart.
function pdfHeaderCells(cells, aliasLookup) {
    const out = [];
    cells.forEach((cell) => {
        const last = out[out.length - 1];
        if (last) {
            const joined = `${last.text} ${cell.text}`;
            const gap = cell.x - (last.x + last.w);
            const lastKnown = canonicalHeaderFor(last.text, aliasLookup);
            const cellKnown = canonicalHeaderFor(cell.text, aliasLookup);
            if (
                canonicalHeaderFor(joined, aliasLookup) && !(lastKnown && cellKnown) ||
                (!lastKnown && !cellKnown && gap > 0.5 && gap < Math.max(3, cell.h * 0.35))
            ) {
                last.text = joined;
                last.w = cell.x + cell.w - last.x;
                return;
            }
        }
        out.push({ ...cell });
    });
    return out;
}

function joinFragments(a, b) {
    if (!a) return b;
    if (!b) return a;
    // "01/10/202" + "6" (a wrapped number/date) joins without a space.
    return /[\d/\-.]$/.test(a) && /^[\d/\-.]/.test(b) ? a + b : `${a} ${b}`;
}

// Builds a table from the positioned lines: the header line fixes the
// column positions and every fragment below goes to the column it sits
// under. Wrapped header/data lines are joined back, repeated headers on
// later pages and "Page x of y" footers are skipped.
function pdfTableFromLines(lines, aliasLookup) {
    let headerIdx = -1;
    let header = null;

    for (let i = 0; i < Math.min(lines.length, 60); i++) {
        const cells = pdfHeaderCells(lines[i].cells, aliasLookup);
        if (scoreHeaderRow(cells.map((c) => c.text), aliasLookup) >= 2) {
            headerIdx = i;
            header = cells;
            break;
        }
    }

    if (!header) return null;

    const columnFor = (cell) => {
        const center = cell.x + cell.w / 2;
        let best = 0;
        let bestScore = -Infinity;
        header.forEach((h, i) => {
            const overlap = Math.min(cell.x + cell.w, h.x + h.w) - Math.max(cell.x, h.x);
            const score = overlap > 0 ? overlap : -Math.abs(center - (h.x + h.w / 2));
            if (score > bestScore) {
                bestScore = score;
                best = i;
            }
        });
        return best;
    };

    const place = (line) => {
        const cells = new Array(header.length).fill("");
        line.cells.forEach((cell) => {
            const idx = columnFor(cell);
            cells[idx] = joinFragments(cells[idx], cell.text);
        });
        return cells;
    };

    let next = headerIdx + 1;

    // Wrapped header ("Employee" / "ID"): following text-only lines that
    // improve the header are merged into it.
    for (let k = 0; k < 2 && next < lines.length; k++) {
        const texts = lines[next].cells.map((c) => c.text);
        if (texts.some((t) => /\d/.test(t))) break;
        const placed = place(lines[next]);
        const merged = header.map((h, i) => (placed[i] ? `${h.text} ${placed[i]}` : h.text));
        if (scoreHeaderRow(merged, aliasLookup) >= scoreHeaderRow(header.map((h) => h.text), aliasLookup)) {
            header = header.map((h, i) => ({ ...h, text: merged[i] }));
            next += 1;
        } else {
            break;
        }
    }

    const headerTexts = header.map((h) => h.text);
    const rows = [{ cells: headerTexts, rowNumber: 1 }];
    let rowNumber = 1;
    let lastRow = null;
    // Row that was cut by a page break (its tail continues under the
    // header repeated on the next page) and whether we are still
    // inside a (multi-line) repeated header.
    let carryRow = null;
    let inRepeatedHeader = false;

    const headerWords = headerTexts.map((h) => String(h || "").toLowerCase().replace(/\s+/g, " ").trim());
    const isHeaderFragment = (list) => {
        const parts = list.map((t) => String(t || "").toLowerCase().replace(/\s+/g, " ").trim()).filter(Boolean);
        return (
            parts.length > 0 &&
            parts.every((t) => headerWords.some((h) => h === t || h.endsWith(` ${t}`) || h.startsWith(`${t} `) || h.includes(` ${t} `)))
        );
    };

    for (let i = next; i < lines.length; i++) {
        const texts = lines[i].cells.map((c) => c.text);
        const joinedText = texts.join(" ");
        if (/^page\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(joinedText)) continue;

        const headerLike = pdfHeaderCells(lines[i].cells, aliasLookup);
        const headerScore = scoreHeaderRow(headerLike.map((c) => c.text), aliasLookup);
        const sameAsHeader =
            texts.length >= 2 &&
            texts.filter((t) => headerWords.includes(String(t || "").toLowerCase().replace(/\s+/g, " ").trim())).length >= Math.max(2, Math.ceil(header.length / 2));
        const startsWithHeader = isHeaderFragment(texts) && texts.length >= Math.max(2, Math.ceil(header.length / 3));
        if (headerScore >= Math.max(2, Math.ceil(header.length / 2)) || sameAsHeader || startsWithHeader) {
            if (lastRow) carryRow = lastRow;
            lastRow = null;
            inRepeatedHeader = true;
            continue; // header repeated on a new page
        }

        // Second / third line of a wrapped repeated header ("ID", "Name", ...)
        if (inRepeatedHeader && isHeaderFragment(texts)) continue;
        inRepeatedHeader = false;

        const cells = place(lines[i]);

        // Tail of a row that the PDF split across a page break: first
        // column empty, right below the repeated header.
        if (carryRow && !lastRow && !cells[0] && cells.filter(Boolean).length <= Math.max(1, Math.floor(header.length / 2))) {
            cells.forEach((value, idx) => {
                if (value) carryRow.cells[idx] = joinFragments(carryRow.cells[idx], value);
            });
            continue;
        }
        if (cells[0]) carryRow = null;

        // Continuation of a wrapped row: first column empty and the line
        // only fills a few columns of the row above.
        const filled = cells.filter(Boolean).length;
        const lineHeight = Math.max(...lines[i].cells.map((c) => c.h || 10));
        const closeBelow = lastRow && lastRow.page === lines[i].page && Math.abs(lastRow.y - lines[i].y) <= lineHeight * 1.6;
        if (
            lastRow &&
            !cells[0] &&
            lastRow.page === lines[i].page &&
            (closeBelow || filled <= Math.max(1, Math.floor(header.length / 2)))
        ) {
            cells.forEach((value, idx) => {
                if (value) lastRow.cells[idx] = joinFragments(lastRow.cells[idx], value);
            });
            lastRow.y = lines[i].y;
            continue;
        }

        rowNumber += 1;
        lastRow = { cells, rowNumber, page: lines[i].page, y: lines[i].y };
        rows.push(lastRow);
    }

    return { name: null, rows: rows.map(({ cells, rowNumber: n }) => ({ cells, rowNumber: n })) };
}

async function parsePdf(filePath, aliasLookup) {
    if (!pdfParse) {
        const error = new Error("PDF bulk upload requires the 'pdf-parse' package. Run `npm install pdf-parse` in the server folder.");
        error.code = "PDF_PARSE_NOT_INSTALLED";
        throw error;
    }

    let pdf;
    try {
        pdf = await readPdfItems(fs.readFileSync(filePath));
    } catch (error) {
        const e = new Error(`This PDF could not be opened (${error.message}). Open it and save / print it again as PDF, or upload the original Excel/CSV file.`);
        e.status = 400;
        throw e;
    }

    const totalItems = pdf.pages.reduce((n, p) => n + p.items.length, 0);
    if (!totalItems && !String(pdf.text || "").trim()) {
        const error = new Error("No text could be read from this PDF. It looks like a scanned image — upload a photo (JPG/PNG) of the page so it can be read with OCR, or upload the original Excel/CSV.");
        error.status = 400;
        throw error;
    }

    // 1. Positional table (best for PDFs exported from Excel / printed tables)
    const lines = pdfLines(pdf.pages);
    const table = pdfTableFromLines(lines, aliasLookup);
    if (table) {
        const result = await tableToRows(table, aliasLookup);
        if (result.rows.length) return { rows: result.rows, plan: result.plan, warnings: [] };
    }

    // 2. Text fallbacks ("Field: value" blocks, email lines)
    const text = lines.map((l) => l.cells.map((c) => c.text).join("\t")).join("\n");
    const { rows, plan, mode } = await parseTextToRows(text, aliasLookup);
    const warnings = [];
    if (mode === "fields") warnings.push("No table was found in this PDF, so each 'Field: value' block was read as one record.");
    if (mode === "line") warnings.push("No table header was found in this PDF, so rows were rebuilt from the email addresses in the text. Please review the result.");
    return { rows, plan, warnings };
}

// ==========================================================
// PHOTO (OCR)
// ==========================================================

const MAX_OCR_DIMENSION = 2200;

async function parsePhoto(filePath, aliasLookup) {
    if (!Tesseract || !sharp) {
        const error = new Error("Photo bulk upload requires the 'sharp' and 'tesseract.js' packages. Run `npm install sharp tesseract.js` in the server folder.");
        error.code = "OCR_NOT_INSTALLED";
        throw error;
    }

    const resizedPath = `${filePath}.ocr.jpg`;
    await sharp(filePath)
        .rotate()
        .resize({ width: MAX_OCR_DIMENSION, height: MAX_OCR_DIMENSION, fit: "inside", withoutEnlargement: true })
        .sharpen()
        .grayscale()
        .jpeg({ quality: 85 })
        .toFile(resizedPath);

    try {
        const { data } = await Tesseract.recognize(resizedPath, "eng");
        const { rows, plan, mode } = await parseTextToRows(data.text || "", aliasLookup);
        return {
            rows,
            plan,
            warnings: [
                "This file was a photo, so rows were read with OCR. OCR can misread characters — please review the failed-row list carefully.",
                ...(mode !== "table" ? ["No table structure was recognised in the photo; only what could be reconstructed per line was used."] : [])
            ]
        };
    } finally {
        if (fs.existsSync(resizedPath)) fs.unlinkSync(resizedPath);
    }
}

// ==========================================================
// JSON
// ==========================================================

async function parseJson(filePath, aliasLookup) {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
        const error = new Error("This JSON file is not valid JSON.");
        error.status = 400;
        throw error;
    }

    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.rows) ? data.rows : [];
    const headers = [...new Set(list.flatMap((item) => Object.keys(item || {})))];
    const table = {
        name: null,
        rows: [
            { cells: headers, rowNumber: 1 },
            ...list.map((item, i) => ({ cells: headers.map((h) => item?.[h] ?? ""), rowNumber: i + 2 }))
        ]
    };
    const result = await tableToRows(table, aliasLookup);
    return { rows: result.rows, plan: result.plan, warnings: [] };
}

// ==========================================================
// FORMAT DETECTION
// ==========================================================

const CSV_EXTENSIONS = [".csv", ".tsv", ".txt"];
const WORKBOOK_EXTENSIONS = [".xlsx", ".xlsm", ".xlsb", ".xls", ".ods"];
const WORD_EXTENSIONS = [".docx", ".doc"];
const PDF_EXTENSIONS = [".pdf"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

function detectSourceType(originalName, mimetype, filePath) {
    const ext = path.extname(originalName || filePath || "").toLowerCase();

    if (CSV_EXTENSIONS.includes(ext)) return "csv";
    if (WORKBOOK_EXTENSIONS.includes(ext)) return "spreadsheet";
    if (ext === ".docx") return "docx";
    if (ext === ".doc") return "doc";
    if (ext === ".json") return "json";
    if (PDF_EXTENSIONS.includes(ext) || mimetype === "application/pdf") return "pdf";
    if (IMAGE_EXTENSIONS.includes(ext) || /^image\//.test(mimetype || "")) return "photo";
    if (VIDEO_EXTENSIONS.includes(ext) || /^video\//.test(mimetype || "")) return "video";

    if (/wordprocessingml/.test(mimetype || "")) return "docx";
    if (/msword/.test(mimetype || "")) return "doc";
    if (/spreadsheet|excel/.test(mimetype || "")) return "spreadsheet";
    if (/csv|text\/plain/.test(mimetype || "")) return "csv";

    // Last resort: sniff the file signature.
    try {
        const fd = fs.openSync(filePath, "r");
        const head = Buffer.alloc(8);
        fs.readSync(fd, head, 0, 8, 0);
        fs.closeSync(fd);
        if (head.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
        if (head[0] === 0x50 && head[1] === 0x4b) return "spreadsheet";
        if (head[0] === 0xd0 && head[1] === 0xcf) return "spreadsheet";
    } catch {
        // ignore
    }

    return null;
}

// Public label used in reports ("Excel", "CSV", "Word", ...).
function sourceLabel(sourceType) {
    return {
        csv: "CSV",
        spreadsheet: "Excel",
        docx: "Word",
        doc: "Word",
        pdf: "PDF",
        photo: "Photo",
        json: "JSON"
    }[sourceType] || "File";
}

function headerReport(plan, columnAliases) {
    const list = (plan || []).filter(Boolean);
    const matchedTargets = new Set(list.filter((p) => p.target && !p.target.startsWith("__")).map((p) => p.target));
    const expected = Object.keys(columnAliases || {}).filter((name) => !name.startsWith("__"));

    return {
        columns: list.map((p) => ({
            source: p.source,
            target: p.target,
            status: p.status,
            sheet: p.sheet || null
        })),
        matched: list.filter((p) => p.target && !p.target.startsWith("__")).map((p) => p.target),
        ignored: list.filter((p) => p.status === "ignored").map((p) => p.source),
        extra: [...new Set(list.filter((p) => !p.target).map((p) => p.source))],
        corrected: list.filter((p) => p.status === "corrected").map((p) => ({ source: p.source, target: p.target })),
        notFound: expected.filter((name) => !matchedTargets.has(name))
    };
}

// ==========================================================
// PUBLIC ENTRY POINT
// ==========================================================

async function parseBulkFile(filePath, originalName, mimetype, columnAliases = DEFAULT_COLUMN_ALIASES, onProgress) {
    const sourceType = detectSourceType(originalName, mimetype, filePath);

    if (!sourceType) {
        const error = new Error("Unsupported file type. Upload Excel (.xlsx/.xls), CSV, Word (.docx/.doc), PDF, or a photo of the list.");
        error.code = "UNSUPPORTED_BULK_FILE_TYPE";
        error.status = 400;
        throw error;
    }

    if (sourceType === "video") {
        const error = new Error("This is a video file. Bulk row import needs Excel, CSV, Word, PDF or a photo of the list — a video can't be converted into rows.");
        error.code = "VIDEO_NOT_ROW_SOURCE";
        error.status = 400;
        throw error;
    }

    const aliases = columnAliases || DEFAULT_COLUMN_ALIASES;
    const aliasLookup = buildAliasLookup(aliases);

    let result;

    try {
        if (sourceType === "csv") {
            result = await parseCsvStream(filePath, aliasLookup, onProgress);
        } else if (sourceType === "spreadsheet") {
            result = await parseWorkbook(filePath, aliasLookup, onProgress);
            try {
                const { size } = fs.statSync(filePath);
                if (size > LARGE_XLSX_WARNING_BYTES) {
                    result.warnings.push(
                        `This Excel file is ${(size / (1024 * 1024)).toFixed(1)} MB. For very large files CSV imports faster.`
                    );
                }
            } catch {
                // best effort
            }
        } else if (sourceType === "docx") {
            const xml = readDocxXml(filePath);
            const tables = docxTables(xml);
            if (tables.length) {
                const evaluated = [];
                for (const table of tables) {
                    evaluated.push({ name: table.name, result: await tableToRows(table, aliasLookup) });
                }
                const picked = pickTables(evaluated);
                const multi = picked.length > 1;
                const rows = [];
                const plan = [];
                picked.forEach((t) => {
                    t.result.rows.forEach((row) => {
                        row.__sheet = multi ? t.name : null;
                        rows.push(row);
                    });
                    plan.push(...t.result.plan.filter(Boolean).map((p) => ({ ...p, sheet: multi ? t.name : null })));
                });
                result = { rows, plan, warnings: [] };
            }
            if (!result || !result.rows.length) {
                const parsed = await parseTextToRows(docxText(xml), aliasLookup);
                result = {
                    rows: parsed.rows,
                    plan: parsed.plan,
                    warnings: parsed.mode === "fields"
                        ? ["No table was found in this Word document, so each 'Field: value' block was read as one record."]
                        : []
                };
            }
        } else if (sourceType === "doc") {
            const text = readDocText(filePath);
            const table = docTextToTable(text);
            if (table) {
                const tableResult = await tableToRows(table, aliasLookup);
                result = { rows: tableResult.rows, plan: tableResult.plan, warnings: [] };
            }
            if (!result || !result.rows.length) {
                const parsed = await parseTextToRows(text.replace(/\x07/g, "\t"), aliasLookup);
                result = { rows: parsed.rows, plan: parsed.plan, warnings: [] };
            }
            result.warnings.push("Old Word (.doc) files are read on a best-effort basis. If anything looks wrong, save the document as .docx or Excel and upload again.");
        } else if (sourceType === "pdf") {
            result = await parsePdf(filePath, aliasLookup);
        } else if (sourceType === "json") {
            result = await parseJson(filePath, aliasLookup);
        } else {
            result = await parsePhoto(filePath, aliasLookup);
        }
    } catch (error) {
        if (!error.status && !error.code) {
            error.status = 400;
            error.message = `This ${sourceLabel(sourceType)} file could not be read: ${error.message}. If it is password-protected or damaged, open it, save a fresh copy and upload again.`;
        }
        throw error;
    }

    return {
        rows: result.rows || [],
        sourceType: sourceType === "csv" ? "spreadsheet" : sourceType,
        sourceFormat: sourceType,
        sourceLabel: sourceLabel(sourceType),
        warnings: result.warnings || [],
        headers: headerReport(result.plan, aliases)
    };
}

module.exports = {
    parseBulkFile,
    parseTextToRows,
    buildAliasLookup,
    canonicalHeaderFor,
    normalizeKey,
    detectSourceType,
    sourceLabel,
    DEFAULT_COLUMN_ALIASES,
    EXPECTED_COLUMNS: Object.keys(DEFAULT_COLUMN_ALIASES),
    SUPPORTED_EXTENSIONS: [
        ...CSV_EXTENSIONS,
        ...WORKBOOK_EXTENSIONS,
        ...WORD_EXTENSIONS,
        ...PDF_EXTENSIONS,
        ".json",
        ...IMAGE_EXTENSIONS
    ]
};
