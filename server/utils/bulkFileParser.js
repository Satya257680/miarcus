// ==========================================================
// MI ARCUS — UNIVERSAL BULK FILE PARSER
// ==========================================================
//
// Turns ANY bulk-upload source file into a plain array of row
// objects keyed by column header, so a controller can treat
// every upload the same way regardless of what the admin
// actually attached:
//
//   .csv                  -> streamed row-by-row (see the CSV
//                            section below — this is the path that
//                            was blocking the event loop on large
//                            files; see CHANGES.md)
//   .xlsx / .xls           -> read as a spreadsheet (header row
//                            auto-detected — see below) via SheetJS
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
// dropped on their own, without needing special-case code. For the
// streamed CSV path this scan happens against the first 15 rows as
// they arrive, before anything is committed to memory as "data".
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
//
//   // Optional 5th argument: called every ~1000 rows while the file is
//   // being read (CSV: rows streamed so far; XLSX/XLS: rows converted so
//   // far), so a caller running this inside a background job (see
//   // controllers/checklistReportController.js) can surface live
//   // progress instead of a silent "Reading your file…" the whole time.
//   const { rows } = await parseBulkFile(path, name, mimetype, aliases, (n) => {
//       updateJob(job.id, { message: `Reading your file… ${n} row(s) read so far` });
//   });
// ==========================================================

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Already a dependency of this project (see controllers/questionController.js,
// storeController.js, checklistTypeController.js, listingTrackerController.js
// for other places it's used) — no new package needed for the fix below.
const csvParser = require("csv-parser");

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
// SHARED SMALL HELPERS
// ==========================================================

// How often the CSV/XLSX readers below hand control back to the event
// loop while working through a large file. See CHANGES.md for the full
// story; in short, without this a big enough file can keep the whole
// server from answering ANY other request (including the bulk-upload
// job's own status-poll request) for as long as the file takes to read,
// which is what was surfacing as a 502 on
// /api/checklist-reports/bulk-upload/status/:jobId.
const YIELD_EVERY_N_ROWS = 1000;

function yieldToEventLoop() {
    return new Promise((resolve) => setImmediate(resolve));
}

function isBlankRow(cells) {
    return cells.every(
        (cell) => cell === undefined || cell === null || String(cell).trim() === ""
    );
}

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

// ==========================================================
// CSV — STREAMED, NON-BLOCKING
// ==========================================================
//
// WHY THIS CHANGED (see CHANGES.md for the full write-up)
// ----------------------------------------------------------
// The previous version read the entire CSV into memory with
// fs.readFileSync() and handed the whole string to XLSX.read() in one
// synchronous call. For a large bulk-upload file (tens/hundreds of MB,
// hundreds of thousands of rows) that single call could block Node's
// one and only event-loop thread for a long stretch. While blocked, the
// server can't answer ANY other request — including the bulk-upload
// job's own status-poll request — which is what was surfacing to the
// browser as a 502 from the reverse proxy partway through a large
// import, even though the upload itself had already completed fine and
// the timeouts (extendUploadTimeout.js, web.config, server.js) were
// already generously configured.
//
// This version streams the file with `csv-parser` (already a project
// dependency — see the requires above) and periodically pauses to yield
// back to the event loop (yieldToEventLoop(), above), so a huge CSV
// import never keeps the server from answering other requests for more
// than a moment at a time. It also never holds the raw file text and a
// second fully-parsed copy in memory at the same time the way
// fs.readFileSync() + XLSX.read() did.
//
// HEADER-ROW DETECTION works the same way it always has (see the note
// at the top of this file) — it just happens against a small rolling
// buffer of the first 15 *non-blank* rows as they stream in, instead of
// against an already-fully-parsed array.
// ==========================================================

// csv-parser (headers:false) emits each row as an object keyed by
// column index ("0", "1", "2", ...) rather than a real array — this
// turns it back into a plain, ordered array the rest of this file
// already knows how to work with.
function rawCsvRowToArray(rawRow) {
    return Object.keys(rawRow)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => rawRow[key]);
}

function parseCsvStream(filePath, aliasLookup, onProgress) {
    return new Promise((resolve, reject) => {
        const headerBuffer = [];
        let headerIndex = -1;
        let canonicalHeaders = null;
        const rows = [];
        let rawRowCount = 0;
        let sawFirstRow = false;
        let settled = false;

        const source = fs.createReadStream(filePath);
        const parser = csvParser({ headers: false });

        const fail = (err) => {
            if (settled) return;
            settled = true;
            source.destroy();
            parser.destroy();
            reject(err);
        };

        const finish = () => {
            if (settled) return;
            settled = true;
            resolve({ rows, warnings: [] });
        };

        function pushDataRow(cells) {
            const row = {};
            canonicalHeaders.forEach((canonical, idx) => {
                const value = cells[idx];
                if (canonical && value !== "" && value !== undefined && value !== null) {
                    row[canonical] = value;
                }
            });

            if (Object.keys(row).length) rows.push(row);
        }

        function finalizeHeader() {
            let idx = findHeaderRowIndex(headerBuffer, aliasLookup);
            if (idx === -1) idx = 0; // nothing recognised — fall back to "row 1 is the header"

            headerIndex = idx;
            canonicalHeaders = headerBuffer[idx].map((cell) => canonicalHeaderFor(cell, aliasLookup));

            for (let i = idx + 1; i < headerBuffer.length; i++) {
                pushDataRow(headerBuffer[i]);
            }
            headerBuffer.length = 0; // free the buffer now that it's been flushed
        }

        parser.on("data", (rawRow) => {
            const cells = rawCsvRowToArray(rawRow);

            // A UTF-8 BOM (if the file has one) lands on the very first
            // cell of the very first row — strip it the same way
            // controllers/questionController.js's normalizeHeader()
            // already does elsewhere in this codebase, or the first
            // header cell ends up with an invisible character glued to
            // it and never matches any alias.
            if (!sawFirstRow) {
                sawFirstRow = true;
                if (typeof cells[0] === "string") {
                    cells[0] = cells[0].replace(/^﻿/, "");
                }
            }

            if (isBlankRow(cells)) return; // never counts toward the header scan or the row total

            rawRowCount += 1;

            if (headerIndex === -1) {
                headerBuffer.push(cells);
                if (headerBuffer.length >= 15) finalizeHeader();
            } else {
                pushDataRow(cells);
            }

            if (rawRowCount % YIELD_EVERY_N_ROWS === 0) {
                if (onProgress) onProgress(rawRowCount);

                parser.pause();
                yieldToEventLoop().then(() => {
                    if (!settled) parser.resume();
                });
            }
        });

        parser.on("end", () => {
            if (headerIndex === -1 && headerBuffer.length) finalizeHeader();
            if (onProgress) onProgress(rawRowCount);
            finish();
        });

        parser.on("error", fail);
        source.on("error", fail);

        source.pipe(parser);
    });
}

// ==========================================================
// XLSX / XLS (SheetJS)
// ==========================================================
//
// This path intentionally still uses the `xlsx` package's synchronous
// XLSX.readFile(). Swapping it for a true streaming reader would also
// change the shape individual cell values come back in (SheetJS hands
// back plain strings/numbers; a streaming XLSX reader hands back richer
// objects for formulas, rich text, hyperlinks and dates), which is a
// real behaviour change worth doing carefully on its own rather than
// folding into this fix. Two things keep this an acceptable trade-off
// for now:
//
//   - .xls (the legacy binary format) is hard-capped at 65,536 rows by
//     the file format itself, so it can never reach the file sizes that
//     caused the CSV 502 in the first place.
//   - .xlsx has no such cap, so a very large .xlsx can in principle
//     still block the event loop the way the CSV did — the size check
//     in parseBulkFile() below adds a warning for that case so it's
//     surfaced to the uploader rather than silently causing the same
//     failure. (If very large .xlsx uploads turn out to matter in
//     practice, `exceljs` — already a dependency — has a genuine
//     streaming XLSX reader that could replace this the same way
//     csv-parser replaced the old CSV path.)
//
// What IS fixed here: the (pure JS, no library involved) loop that
// turns parsed rows into the row objects this module returns now yields
// back to the event loop periodically too, so it doesn't add its own
// extra blocking stretch on top of the read.
// ==========================================================

async function parseSpreadsheetYielding(filePath, aliasLookup, onProgress) {
    // Give any response already queued (e.g. the controller's
    // "processing" job-status update, written just before this is
    // called) a chance to actually go out on the wire before the
    // blocking XLSX.readFile() call below starts.
    await yieldToEventLoop();

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

        if ((i - headerIndex) % YIELD_EVERY_N_ROWS === 0) {
            if (onProgress) onProgress(rows.length);
            await yieldToEventLoop();
        }
    }

    if (onProgress) onProgress(rows.length);

    return rows;
}

// A very large .xlsx can't be streamed the way CSV now is (see the note
// above) — flag it so the uploader knows why a big Excel import is slow
// and that CSV is the faster, safer option for very large files.
const LARGE_XLSX_WARNING_BYTES = 20 * 1024 * 1024; // 20 MB

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
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

function detectSourceType(originalName, mimetype) {
    const ext = path.extname(originalName || "").toLowerCase();

    if (SPREADSHEET_EXTENSIONS.includes(ext)) return "spreadsheet";
    if (PDF_EXTENSIONS.includes(ext) || mimetype === "application/pdf") return "pdf";
    if (IMAGE_EXTENSIONS.includes(ext) || /^image\//.test(mimetype || "")) return "photo";
    if (VIDEO_EXTENSIONS.includes(ext) || /^video\//.test(mimetype || "")) return "video";

    // Fall back to mimetype alone if the extension was stripped/renamed.
    if (/spreadsheet|excel|csv/.test(mimetype || "")) return "spreadsheet";

    return null;
}

// ==========================================================
// PUBLIC ENTRY POINT
// ==========================================================

async function parseBulkFile(filePath, originalName, mimetype, columnAliases = DEFAULT_COLUMN_ALIASES, onProgress) {
    const sourceType = detectSourceType(originalName, mimetype);

    if (!sourceType) {
        const error = new Error(
            "Unsupported file type. Upload a CSV, Excel (.xlsx/.xls), PDF, or photo (.jpg/.png/.webp)."
        );
        error.code = "UNSUPPORTED_BULK_FILE_TYPE";
        error.status = 400;
        throw error;
    }

    // Video is accepted by the upload layer (so it is never bounced by the
    // file picker or multer), but there is no reliable way to turn a video
    // into table rows. Say so plainly instead of pretending to import 0
    // rows silently, or crashing.
    if (sourceType === "video") {
        const error = new Error(
            "This is a video file. Bulk row import needs a CSV, Excel (.xlsx/.xls), PDF, or photo of the list — a video can't be converted into rows. Attach the video to an individual record instead."
        );
        error.code = "VIDEO_NOT_ROW_SOURCE";
        error.status = 400;
        throw error;
    }

    const aliasLookup = buildAliasLookup(columnAliases);

    if (sourceType === "spreadsheet") {
        // Match on the extension of the file actually saved to disk (the
        // multer storage filename mirrors the upload's original
        // extension — see middleware/bulkFileUpload.js), the same way the
        // old readWorkbook() picked its parsing path.
        const ext = path.extname(filePath).toLowerCase();

        if (ext === ".csv") {
            const { rows, warnings } = await parseCsvStream(filePath, aliasLookup, onProgress);
            return { rows, sourceType, warnings };
        }

        const rows = await parseSpreadsheetYielding(filePath, aliasLookup, onProgress);
        const warnings = [];

        if (ext === ".xlsx") {
            try {
                const { size } = fs.statSync(filePath);
                if (size > LARGE_XLSX_WARNING_BYTES) {
                    warnings.push(
                        `This Excel file is ${(size / (1024 * 1024)).toFixed(1)} MB. Very large .xlsx files take longer to import than the equivalent CSV and can't be read as incrementally — for the fastest, most reliable import of a very large file, save it as CSV and upload that instead.`
                    );
                }
            } catch {
                // best-effort only — never fail the import over a stat() call
            }
        }

        return { rows, sourceType, warnings };
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
