// ==========================================================
// MI ARCUS — GLOBAL BULK UPLOAD HELPER ROUTES
// BASE URL: /api/bulk-upload
//
// Shared by the Bulk Upload modal of every module:
//
//   GET  /modules                    list of modules that support bulk upload
//   GET  /modules/:key               column definitions (Required Columns table)
//   GET  /modules/:key/sample        sample file   (?format=xlsx | csv)
//   POST /modules/:key/inspect       Column Validation preview of an uploaded
//                                    file (headers matched / corrected / extra /
//                                    missing, rows detected) — nothing is saved
//
// The actual import still goes to each module's own bulk-upload endpoint,
// which keeps that module's permission checks unchanged.
// ==========================================================

const express = require("express");
const XLSX = require("xlsx");

const authMiddleware = require("../middleware/authMiddleware");
const extendUploadTimeout = require("../middleware/extendUploadTimeout");
const bulkFileUpload = require("../middleware/bulkFileUpload");
const {
    getBulkModule,
    listBulkModules,
    describeBulkModule
} = require("../config/bulkUploadModules");
const { readUpload, removeUploadedFile } = require("../utils/bulkUploadEngine");

const router = express.Router();

router.use(authMiddleware);

router.get("/modules", (req, res) => {
    res.json({ success: true, data: listBulkModules() });
});

router.get("/modules/:key", (req, res) => {
    const data = describeBulkModule(req.params.key);
    if (!data) {
        return res.status(404).json({ success: false, message: "This module has no bulk upload definition." });
    }
    return res.json({ success: true, data });
});

router.get("/modules/:key/sample", (req, res) => {
    const data = describeBulkModule(req.params.key);
    if (!data) {
        return res.status(404).json({ success: false, message: "This module has no bulk upload definition." });
    }

    const format = String(req.query.format || "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
    const headers = data.columns.map((c) => c.name);
    const rows = [];
    for (let i = 0; i < data.sampleRowCount; i++) {
        rows.push(data.columns.map((c) => (c.sample.length ? c.sample[Math.min(i, c.sample.length - 1)] ?? "" : "")));
    }

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    sheet["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 4) }));

    const safeName = String(data.title || req.params.key).replace(/[^A-Za-z0-9]+/g, "_");

    if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(sheet);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${safeName}_Sample.csv"`);
        return res.send("﻿" + csv);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Sample");

    const guide = XLSX.utils.aoa_to_sheet([
        ["Column", "Required", "Notes"],
        ...data.columns.map((c) => [
            c.name,
            c.requiredGroup ? `Yes (one of: ${c.requiredGroup.join(" / ")})` : c.required ? "Yes" : "No",
            c.help || ""
        ]),
        [],
        ["Guidelines"],
        ...data.guidelines.map((g) => [g])
    ]);
    guide["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, guide, "Column Guide");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_Sample.xlsx"`);
    return res.send(buffer);
});

router.post(
    "/modules/:key/inspect",
    extendUploadTimeout,
    bulkFileUpload.single("file"),
    async (req, res) => {
        const spec = getBulkModule(req.params.key);

        if (!spec) {
            removeUploadedFile(req.file);
            return res.status(404).json({ success: false, message: "This module has no bulk upload definition." });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please choose a file." });
        }

        try {
            const upload = await readUpload(req.file, spec);
            const preview = upload.rows.slice(0, 5).map((row) => ({
                row: row.__row,
                sheet: row.__sheet || null,
                values: { ...row },
                extra: row.__extra || {}
            }));

            return res.json({
                success: true,
                data: {
                    fileName: req.file.originalname,
                    sourceLabel: upload.sourceLabel,
                    rowsDetected: upload.rows.length,
                    columnsDetected: upload.headers.columns.length,
                    columns: upload.headers,
                    warnings: upload.warnings,
                    preview
                }
            });
        } catch (error) {
            return res.status(error.status || 400).json({
                success: false,
                message: error.message || "This file could not be read."
            });
        } finally {
            removeUploadedFile(req.file);
        }
    }
);

router.use((err, req, res, next) => {
    if (err) {
        return res.status(400).json({ success: false, message: err.message || "Upload failed." });
    }
    return next();
});

module.exports = router;
