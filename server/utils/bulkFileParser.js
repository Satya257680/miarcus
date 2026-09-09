// ==========================================================
// MI ARCUS — UNIVERSAL BULK FILE PARSER
// ==========================================================
//
// Turns ANY bulk-upload source file into a plain array of row
// objects keyed by column header, so a controller can treat
// every upload the same way regardless of what the admin
// actually attached:
//
//   .csv / .xlsx / .xls   -> read as a spreadsheet (header row
//                            auto-detected — see below)
//   .pdf                  -> text/table extraction (pdf-parse)
//   .jpg / .jpeg / .png /
//   .webp                 -> auto-resized, then OCR'd (sharp + tesseract.js)
//
// HEADER-ROW DETECTION (spreadsheets, and PDF/photo table mode)
// ---------------------------------------------------------
// A real-world Excel/CSV file often isn't "headers on row 1, data
// underneath" — it can have a title/banner row above the headers
// ("DEPARTMENT MASTER LIST"), blank spacer rows, or a trailing
// note row below the data. Treating row 1 as the header
// unconditionally (the old behaviour) breaks the moment there's a
// banner row: every column ends up named after the banner text,
// so nothing matches and the whole file gets rejected as "no
// valid rows found" even though the data is perfectly fine one
// row down.
//
// Instead, this module scans the first 15 rows, scores each one
// by how many cells match a *known* column name (via the alias
// map passed in), and picks the highest-scoring row as the real
// header — wherever it actually is. Rows before it (banners,
// titles) and anything after the data that doesn't look like a
// real row (blank, or a trailing "Note: ..." line with nothing in
// the other columns) are simply not part of the table and are
// dropped on their own, without needing special-case code.
//
// PDF and photo sources are inherently less reliable than a real
// spreadsheet (extracted text can be noisy, OCR can misread
// characters), so those paths stay conservative: if a row's
// required columns can't be found with confidence, it's left out
// rather than guessed at. The calling controller's own per-row
// validation (e.g. "Department not found") is what ultimately
// decides whether a row is safe to import — this module's job is
// only to get every source format into the same shape so that
// validation can run against it either way.
//
// Usage:
//   const { parseBulkFile, DEFAULT_COLUMN_ALIASES } = require("../utils/bulkFileParser");
//
//   // Using the built-in Users column set:
//   const { rows, sourceType, warnings } =
//       await parseBulkFile(req.file.path, req.file.originalname, req.file.mimetype);
//
//   // Using a module-specific column set (see departmentController.js):
//   const DEPARTMENT_COLUMN_ALIASES = {
//       "Department Name": ["departmentname", "department", "dept", "name"],
//       "Description": ["description", "desc"],
//       "Status": ["status", "active"],
//       "Employee ID": ["employeeid", "empid", "employee id"]
//   };
//   const { rows } = await parseBulkFile(path, name, mimetype, DEPARTMENT_COLUMN_ALIASES);
// ==========================================================

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// These three are optional at require-time so that a server
// that hasn't run `npm install` yet for the new deps still
// boots — PDF/photo uploads simply report a clear error until
// the packages are installed, instead of crashing the process.
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
// DEFAULT COLUMN ALIASES (Users)
// ==========================================================
//
// Kept as the default so existing call sites that don't pass a
// `columnAliases` argument (e.g. the Users bulk upload) keep
// working exactly as before.
// ==========================================================

const DEFAULT_COLUMN_ALIASES = {
    "Employee ID": ["employeeid", "empid", "employee id", "id", "staffid", "employeecode"],
    "Name": ["name", "fullname", "employeename", "staffname"],
    "Email": ["email", "emailaddress", "mail", "emailid"],
    "Call Contact": ["callcontact", "contact", "phone", "mobile", "mobilenumber", "phonenumber"],
    "WhatsApp Contact": ["whatsappcontact", "whatsapp", "whatsappnumber"],
    "Department": ["department", "dept"],
    "Designation": ["designation", "role", "position", "title"],
    "Reports To": ["reportsto", "reporting", "manager", "supervisor"],
    "Status": ["status", "active"]
};

function normalizeKey(key) {
    return String(key || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Builds a lookup: normalized alias -> canonical column name.
// The canonical name itself is always included (normalized) so a
// spreadsheet that already spells a header exactly right — e.g.
// one built from the app's own "Download Sample" file — matches
// without needing to be listed as its own alias.
function buildAliasLookup(columnAliases) {
    const lookup = {};
    for (const [canonical, aliases] of Object.entries(columnAliases)) {
        lookup[normalizeKey(canonical)] = canonical;
        for (const alias of aliases) {
            lookup[normalizeKey(alias)] = canonical;
        }
    }
    return lookup;
}

function canonicalHeaderFor(rawHeader, aliasLookup) {
    return aliasLookup[normalizeKey(rawHeader)] || null;
}

// ==========================================================
// SPREADSHEET SOURCES (csv / xlsx / xls)
// ==========================================================

// Scores each of the first `maxScanRows` rows by how many cells
// resolve to a known column via aliasLookup, and returns the
// index of the best-scoring row (ties go to the first one found).
// Returns -1 only if every scanned row scores 0, in which case the
// caller falls back to treating row 0 as the header (the previous,
// simpler behaviour) rather than silently returning nothing.
function findHeaderRowIndex(rowsAoA, aliasLookup, maxScanRows = 15) {
    let bestIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < Math.min(rowsAoA.length, maxScanRows); i++) {
        const row = rowsAoA[i] || [];
        const score = row.filter((cell) => canonicalHeaderFor(cell, aliasLookup)).length;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }

    return bestIndex;
}

function parseSpreadsheet(filePath, aliasLookup) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Read as an array-of-arrays first (rather than letting XLSX
    // assume row 1 is the header) so the real header row can be
    // located even when it isn't row 1 — see the header-detection
    // note at the top of this file.
    const rowsAoA = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false
    });

    if (!rowsAoA.length) return [];

    let headerIndex = findHeaderRowIndex(rowsAoA, aliasLookup);
    if (headerIndex === -1) headerIndex = 0; // nothing recognised — fall back to "row 1 is the header"

    const headerRow = rowsAoA[headerIndex];
    const canonicalHeaders = headerRow.map((cell) => canonicalHeaderFor(cell, aliasLookup));

    const rows = [];
    for (let i = headerIndex + 1; i < rowsAoA.length; i++) {
        const cells = rowsAoA[i];
        const row = {};

        canonicalHeaders.forEach((canonical, idx) => {
            const value = cells[idx];
            if (canonical && value !== "" && value !== undefined && value !== null) {
                row[canonical] = value;
            }
        });

        // A row with nothing recognised (a stray note, a blank
        // spacer the sheet_to_json call didn't already drop, a
        // trailing "Note: ..." line that only fills a column with
        // no matching header) contributes nothing — skip it rather
        // than passing an empty object down to the controller.
        if (Object.keys(row).length) rows.push(row);
    }

    return rows;
}

// ==========================================================
// TEXT -> ROWS (shared by PDF and OCR sources)
// ==========================================================
//
// Two strategies, tried in order:
//
//   1. TABLE MODE — a real header line was found (two or more
//      recognised column names on one line). Every following
//      line is split on runs of 2+ spaces or a tab, and cells
//      are matched to headers by position. This is what a PDF
//      exported from a spreadsheet, or a neatly-formatted
//      printed table, produces.
//
//   2. LINE MODE — no header/table structure detected (a photo
//      of a hand-written or loosely formatted list). Each line
//      is scanned for an email address (the most reliable
//      anchor); the text before it becomes the Name, and an
//      ID-shaped token elsewhere on the line (letters+digits,
//      3-10 chars) is captured if present. Every other column is
//      left blank — the controller's existing validation then
//      safely skips anything that can't be completed rather than
//      guessing. (Line mode is only useful for people-shaped data
//      that has an email address to anchor on — a Department/
//      Designation-only sheet uploaded as a photo will rely on
//      table mode, and simply report 0 rows if no header could be
//      found; that's surfaced to the admin as a warning rather
//      than a silent empty import.)
// ==========================================================

function splitHeaderLine(line) {
    return line.split(/\t|\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

function findHeaderLineIndex(lines, aliasLookup) {
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const cells = splitHeaderLine(lines[i]);
        const matches = cells.filter((c) => canonicalHeaderFor(c, aliasLookup)).length;
        if (matches >= 2) return i;
    }
    return -1;
}

function parseTableMode(lines, headerIndex, aliasLookup) {
    const headerCells = splitHeaderLine(lines[headerIndex]);
    const canonicalHeaders = headerCells.map((c) => canonicalHeaderFor(c, aliasLookup));

    const rows = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const cells = lines[i].split(/\t|\s{2,}/).map((c) => c.trim());
        if (cells.every((c) => c === "")) continue;

        const row = {};
        canonicalHeaders.forEach((canonical, idx) => {
            if (canonical && cells[idx]) row[canonical] = cells[idx];
        });

        if (Object.keys(row).length) rows.push(row);
    }
    return rows;
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// A plausible ID token: at least one letter and one digit, 3-10
// characters, so it doesn't accidentally grab a phone number or a
// stray page number.
const ID_TOKEN_PATTERN = /\b(?=[A-Z0-9]{3,10}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])[A-Z0-9]{3,10}\b/i;

// Line mode anchors on an email address, so it only produces rows
// for column sets that include an "Email" canonical column (i.e.
// the Users case). For a column set with no Email column at all
// (Departments, Designations, ...) line mode correctly produces
// nothing — there is no reliable anchor to reconstruct a row from
// unstructured text, and guessing would be worse than reporting 0.
function parseLineMode(lines, aliasLookup) {
    const hasEmailColumn = Object.values(aliasLookup).includes("Email");
    if (!hasEmailColumn) return [];

    const idCanonical = Object.values(aliasLookup).includes("Employee ID") ? "Employee ID" : null;
    const rows = [];

    for (const line of lines) {
        const emailMatch = line.match(EMAIL_PATTERN);
        if (!emailMatch) continue; // no reliable anchor on this line — skip it

        const email = emailMatch[0];
        const before = line.slice(0, emailMatch.index).trim();

        let name = before;
        let idToken = "";
        const idMatch = line.match(ID_TOKEN_PATTERN);
        if (idMatch && idMatch[0].toLowerCase() !== email.split("@")[0].toLowerCase()) {
            idToken = idMatch[0];
            name = name.replace(idMatch[0], "").trim();
        }

        name = name.replace(/^[-,|:\s]+|[-,|:\s]+$/g, "");

        const row = { "Email": email, "Name": name };
        if (idCanonical && idToken) row[idCanonical] = idToken;

        rows.push(row);
    }

    return rows;
}

function parseTextToRows(text, aliasLookup) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    const headerIndex = findHeaderLineIndex(lines, aliasLookup);

    if (headerIndex !== -1) {
        const rows = parseTableMode(lines, headerIndex, aliasLookup);
        if (rows.length) return { rows, mode: "table" };
    }

    return { rows: parseLineMode(lines, aliasLookup), mode: "line" };
}

// ==========================================================
// PDF SOURCE
// ==========================================================

async function parsePdf(filePath, aliasLookup) {
    if (!pdfParse) {
        const error = new Error(
            "PDF bulk upload requires the 'pdf-parse' package. Run `npm install pdf-parse` in the server folder."
        );
        error.code = "PDF_PARSE_NOT_INSTALLED";
        throw error;
    }

    const buffer = fs.readFileSync(filePath);
    const { text } = await pdfParse(buffer);
    const { rows, mode } = parseTextToRows(text || "", aliasLookup);

    return {
        rows,
        warnings:
            mode === "line"
                ? [
                    "No table header was found in this PDF, so rows were reconstructed from email addresses found in the text. Please double-check the other columns before relying on the import — anything that couldn't be read from this file will cause a row to be skipped unless it already matches an existing record."
                ]
                : []
    };
}

// ==========================================================
// PHOTO SOURCE (auto-resize + OCR)
// ==========================================================

const MAX_OCR_DIMENSION = 2200; // px — keeps OCR fast and memory-safe on large phone photos

async function resizeForOcr(filePath) {
    if (!sharp) {
        const error = new Error(
            "Photo bulk upload requires the 'sharp' package. Run `npm install sharp` in the server folder."
        );
        error.code = "SHARP_NOT_INSTALLED";
        throw error;
    }

    const resizedPath = `${filePath}.ocr.jpg`;

    await sharp(filePath)
        .rotate() // respect EXIF orientation from phone cameras
        .resize({
            width: MAX_OCR_DIMENSION,
            height: MAX_OCR_DIMENSION,
            fit: "inside",
            withoutEnlargement: true
        })
        // Mild sharpening + grayscale measurably improves OCR accuracy
        // on photographed printed/handwritten lists.
        .sharpen()
        .grayscale()
        .jpeg({ quality: 85 })
        .toFile(resizedPath);

    return resizedPath;
}

async function parsePhoto(filePath, aliasLookup) {
    if (!Tesseract) {
        const error = new Error(
            "Photo bulk upload requires the 'tesseract.js' package. Run `npm install tesseract.js` in the server folder."
        );
        error.code = "TESSERACT_NOT_INSTALLED";
        throw error;
    }

    const resizedPath = await resizeForOcr(filePath);

    try {
        const { data } = await Tesseract.recognize(resizedPath, "eng");
        const { rows, mode } = parseTextToRows(data.text || "", aliasLookup);

        return {
            rows,
            warnings: [
                "This file was a photo, so rows were extracted with OCR (automatic text recognition) after the image was resized for accuracy. OCR can misread characters — please review the imported rows and the skipped-row list below carefully.",
                ...(mode === "line"
                    ? [
                        "No table structure was recognised in the photo, so only what could be reconstructed per line was used. Any column that couldn't be read will cause a row to be skipped unless it already matches an existing record."
                    ]
                    : [])
            ]
        };
    } finally {
        if (fs.existsSync(resizedPath)) fs.unlinkSync(resizedPath);
    }
}

// ==========================================================
// FORMAT DETECTION
// ==========================================================

const SPREADSHEET_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const PDF_EXTENSIONS = [".pdf"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function detectSourceType(originalName, mimetype) {
    const ext = path.extname(originalName || "").toLowerCase();

    if (SPREADSHEET_EXTENSIONS.includes(ext)) return "spreadsheet";
    if (PDF_EXTENSIONS.includes(ext) || mimetype === "application/pdf") return "pdf";
    if (IMAGE_EXTENSIONS.includes(ext) || /^image\//.test(mimetype || "")) return "photo";

    // Fall back to mimetype alone if the extension was stripped/renamed.
    if (/spreadsheet|excel|csv/.test(mimetype || "")) return "spreadsheet";

    return null;
}

// ==========================================================
// PUBLIC ENTRY POINT
// ==========================================================

async function parseBulkFile(filePath, originalName, mimetype, columnAliases = DEFAULT_COLUMN_ALIASES) {
    const sourceType = detectSourceType(originalName, mimetype);

    if (!sourceType) {
        const error = new Error(
            "Unsupported file type. Upload a CSV, Excel (.xlsx/.xls), PDF, or photo (.jpg/.png/.webp)."
        );
        error.code = "UNSUPPORTED_BULK_FILE_TYPE";
        error.status = 400;
        throw error;
    }

    const aliasLookup = buildAliasLookup(columnAliases);

    if (sourceType === "spreadsheet") {
        return { rows: parseSpreadsheet(filePath, aliasLookup), sourceType, warnings: [] };
    }

    if (sourceType === "pdf") {
        const { rows, warnings } = await parsePdf(filePath, aliasLookup);
        return { rows, sourceType, warnings };
    }

    // photo
    const { rows, warnings } = await parsePhoto(filePath, aliasLookup);
    return { rows, sourceType, warnings };
}

module.exports = {
    parseBulkFile,
    parseTextToRows, // exported for unit testing — now takes (text, aliasLookup)
    buildAliasLookup,
    DEFAULT_COLUMN_ALIASES,
    EXPECTED_COLUMNS: Object.keys(DEFAULT_COLUMN_ALIASES) // kept for backward compatibility
};
