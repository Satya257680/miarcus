// ==========================================================
// MI ARCUS — UNIVERSAL BULK FILE PARSER
// ==========================================================
//
// Turns ANY bulk-upload source file into a plain array of row
// objects keyed by column header, so a controller can treat
// every upload the same way regardless of what the admin
// actually attached:
//
//   .csv / .xlsx / .xls   -> read as a normal spreadsheet
//   .pdf                  -> text/table extraction (pdf-parse)
//   .jpg / .jpeg / .png /
//   .webp                 -> auto-resized, then OCR'd (sharp + tesseract.js)
//
// PDF and photo sources are inherently less reliable than a
// real spreadsheet (extracted text can be noisy, OCR can
// misread characters), so this module is deliberately
// conservative: if a row's required columns can't be found
// with confidence, it is left out rather than guessed at. The
// calling controller's existing per-row validation (e.g.
// "Department not found") is what ultimately decides whether a
// row is safe to import, exactly as it already does for
// spreadsheet uploads — this module just gets every source
// format into the same shape so that validation runs either way.
//
// Usage:
//   const { parseBulkFile } = require("../utils/bulkFileParser");
//   const { rows, sourceType, warnings } =
//       await parseBulkFile(req.file.path, req.file.originalname, req.file.mimetype);
//
// `rows` is an array of objects whose keys match `expectedColumns`
// (falling back to best-effort detected headers for spreadsheet
// sources, since those already have real header cells).
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
// KNOWN COLUMN HEADERS
// ==========================================================
//
// Used two ways:
//   1. To recognise a header line inside PDF/OCR text.
//   2. To normalise whatever header spelling a spreadsheet used
//      ("Emp ID", "EmployeeId", "Employee_ID"...) onto the exact
//      column name the rest of the app expects.
// ==========================================================

const COLUMN_ALIASES = {
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

const EXPECTED_COLUMNS = Object.keys(COLUMN_ALIASES);

function normalizeKey(key) {
    return String(key || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Builds a lookup: normalized alias -> canonical column name.
const ALIAS_LOOKUP = Object.entries(COLUMN_ALIASES).reduce((acc, [canonical, aliases]) => {
    for (const alias of aliases) acc[alias] = canonical;
    return acc;
}, {});

function canonicalHeaderFor(rawHeader) {
    return ALIAS_LOOKUP[normalizeKey(rawHeader)] || null;
}

// Remaps an arbitrary spreadsheet row (whatever headers Excel/CSV
// actually had) onto the exact column names the rest of the app
// expects, so PDF/OCR/CSV/XLSX all hand back identical row shapes.
function remapRow(rawRow) {
    const out = {};
    for (const [key, value] of Object.entries(rawRow)) {
        const canonical = canonicalHeaderFor(key);
        if (canonical) out[canonical] = value;
    }
    // Anything already spelled exactly right (the common case for a
    // spreadsheet built from the app's own "Download Sample" file)
    // still passes straight through the alias lookup above.
    return out;
}

// ==========================================================
// SPREADSHEET SOURCES (csv / xlsx / xls)
// ==========================================================

function parseSpreadsheet(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", blankrows: false });
    return rawRows.map(remapRow);
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
//      Employee-ID-shaped token elsewhere on the line (letters+
//      digits, 3-10 chars) is captured if present. Every other
//      column is left blank — the controller's existing
//      "Department not found" / "Designation not found" checks
//      then safely skip anything that can't be completed rather
//      than guessing.
// ==========================================================

function splitHeaderLine(line) {
    return line.split(/\t|\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

function findHeaderLineIndex(lines) {
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const cells = splitHeaderLine(lines[i]);
        const matches = cells.filter((c) => canonicalHeaderFor(c)).length;
        if (matches >= 2) return i;
    }
    return -1;
}

function parseTableMode(lines, headerIndex) {
    const headerCells = splitHeaderLine(lines[headerIndex]);
    const canonicalHeaders = headerCells.map((c) => canonicalHeaderFor(c));

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
// A plausible Employee ID token: at least one letter and one digit,
// 3-10 characters, so it doesn't accidentally grab a phone number or
// a stray page number.
const EMP_ID_PATTERN = /\b(?=[A-Z0-9]{3,10}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])[A-Z0-9]{3,10}\b/i;

function parseLineMode(lines) {
    const rows = [];

    for (const line of lines) {
        const emailMatch = line.match(EMAIL_PATTERN);
        if (!emailMatch) continue; // no reliable anchor on this line — skip it

        const email = emailMatch[0];
        const before = line.slice(0, emailMatch.index).trim();

        // Strip a leading Employee-ID-looking token from the "before"
        // text so it doesn't end up glued onto the Name.
        let name = before;
        let employeeId = "";
        const idMatch = line.match(EMP_ID_PATTERN);
        if (idMatch && idMatch[0].toLowerCase() !== email.split("@")[0].toLowerCase()) {
            employeeId = idMatch[0];
            name = name.replace(idMatch[0], "").trim();
        }

        name = name.replace(/^[-,|:\s]+|[-,|:\s]+$/g, "");

        if (!email) continue;

        rows.push({
            "Employee ID": employeeId,
            "Name": name,
            "Email": email
        });
    }

    return rows;
}

function parseTextToRows(text) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    const headerIndex = findHeaderLineIndex(lines);

    if (headerIndex !== -1) {
        const rows = parseTableMode(lines, headerIndex);
        if (rows.length) return { rows, mode: "table" };
    }

    return { rows: parseLineMode(lines), mode: "line" };
}

// ==========================================================
// PDF SOURCE
// ==========================================================

async function parsePdf(filePath) {
    if (!pdfParse) {
        const error = new Error(
            "PDF bulk upload requires the 'pdf-parse' package. Run `npm install pdf-parse` in the server folder."
        );
        error.code = "PDF_PARSE_NOT_INSTALLED";
        throw error;
    }

    const buffer = fs.readFileSync(filePath);
    const { text } = await pdfParse(buffer);
    const { rows, mode } = parseTextToRows(text || "");

    return {
        rows,
        warnings:
            mode === "line"
                ? [
                    "No table header was found in this PDF, so rows were reconstructed from email addresses found in the text. Please double-check Department/Designation before relying on the import — those columns could not be read from this file and will cause a row to be skipped unless it also exists in the system already."
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

async function parsePhoto(filePath) {
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
        const { rows, mode } = parseTextToRows(data.text || "");

        return {
            rows,
            warnings: [
                "This file was a photo, so rows were extracted with OCR (automatic text recognition) after the image was resized for accuracy. OCR can misread characters — please review the imported rows and the skipped-row list below carefully.",
                ...(mode === "line"
                    ? [
                        "No table structure was recognised in the photo, so only Employee ID/Name/Email could be reconstructed per line. Department and Designation must already match this photo's rows exactly, or those rows will be skipped."
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

async function parseBulkFile(filePath, originalName, mimetype) {
    const sourceType = detectSourceType(originalName, mimetype);

    if (!sourceType) {
        const error = new Error(
            "Unsupported file type. Upload a CSV, Excel (.xlsx/.xls), PDF, or photo (.jpg/.png/.webp)."
        );
        error.code = "UNSUPPORTED_BULK_FILE_TYPE";
        error.status = 400;
        throw error;
    }

    if (sourceType === "spreadsheet") {
        return { rows: parseSpreadsheet(filePath), sourceType, warnings: [] };
    }

    if (sourceType === "pdf") {
        const { rows, warnings } = await parsePdf(filePath);
        return { rows, sourceType, warnings };
    }

    // photo
    const { rows, warnings } = await parsePhoto(filePath);
    return { rows, sourceType, warnings };
}

module.exports = {
    parseBulkFile,
    parseTextToRows, // exported for unit testing
    remapRow,
    EXPECTED_COLUMNS
};
