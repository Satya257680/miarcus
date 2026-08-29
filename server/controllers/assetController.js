const fs = require("fs");
const Asset = require("../models/assetModel");
const XLSX = require("xlsx");

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[\s_\-/]+/g, "");

const normalizeDate = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);

    const text = String(value).trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
        const [y, m, d] = text.split("-").map(Number);
        return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    }

    const slash = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (slash) {
        const [, first, second, year] = slash;
        // Asset exports use DD/MM/YYYY. If the first number is > 12, this is unambiguous.
        // For ambiguous values, prefer DD/MM/YYYY to match the application's en-IN display.
        return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const MARKETING_MAP = {
    department: "department_name",
    departmentname: "department_name",
    store: "store_name",
    storename: "store_name",
    particularname: "particular_name",
    name: "particular_name",
    category: "category",
    type: "type",
    size: "size",
    color: "color",
    brand: "brand",
    rate: "rate",
    buydate: "buy_date",
    expirydate: "expiry_date",
    locationaddress: "location_address",
    location: "location_address",
    email: "email",
    mobile: "mobile",
    remark: "remark",
};

const LEGAL_MAP = {
    name: "name",
    storename: "store_name",
    store: "store_name",
    department: "department_name",
    departmentname: "department_name",
    locationaddress: "location_address",
    location: "location_address",
    remark: "remark",
    shortdescription: "short_description",
    dateofissue: "date_of_issue",
    status: "status",
    customfield: "custom_field_value",
    customfieldname: "custom_field_name",
    customfieldvalue: "custom_field_value",
};

const mapCsvRow = (type, row) => {
    const mapped = {};
    const map = type === "marketing" ? MARKETING_MAP : LEGAL_MAP;

    Object.entries(row).forEach(([header, value]) => {
        const key = map[normalizeHeader(header)];
        if (key) {
            mapped[key] = ["buy_date", "expiry_date", "date_of_issue"].includes(key)
                ? normalizeDate(value)
                : value;
        }
    });

    return mapped;
};

const csvEscape = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvRows = (type, rows) => {
    const headers = type === "marketing"
        ? [
            ["particular_name", "Particular Name"], ["store_name", "Store Name"], ["category", "Category"], ["type", "Type"], ["rate", "Rate"], ["size", "Size"], ["color", "Color"], ["brand", "Brand"], ["department_name", "Department"], ["location_address", "Location/Address"], ["email", "Email"], ["mobile", "Mobile"], ["buy_date", "Buy Date"], ["expiry_date", "Expiry Date"], ["days_to_expire", "Days to Expire"], ["status", "Status"], ["remark", "Remark"], ["attachments", "Attachments"], ["created_at", "Created At"],
        ]
        : [
            ["name", "Name"], ["store_name", "Store Name"], ["department_name", "Department"], ["location_address", "Location/Address"], ["remark", "Remark"], ["short_description", "Short Description"], ["attachments", "Attachments"], ["created_at", "Created At"], ["date_of_issue", "Date of Issue"], ["status", "Status"], ["custom_field", "Custom Field"],
        ];

    const lines = [headers.map(([, label]) => csvEscape(label)).join(",")];
    rows.forEach((row) => {
        lines.push(headers.map(([key]) => {
            if (key === "attachments") return csvEscape((row.attachments || []).map((item) => item.originalname || item.filename || item.url).join(" | "));
            if (key === "custom_field") return csvEscape(`${row.custom_field_name || ""}${row.custom_field_name ? ": " : ""}${row.custom_field_value || ""}`);
            return csvEscape(row[key]);
        }).join(","));
    });

    return `${lines.join("\r\n")}\r\n`;
};

const validateType = (type) => ["marketing", "legal"].includes(type);

const normalizeBody = (body = {}) => ({
    ...body,
    additional_fields:
        Array.isArray(body.additional_fields)
            ? body.additional_fields
            : (() => {
                try { return JSON.parse(body.additional_fields || "[]"); } catch { return []; }
            })(),
});

const attachmentsFromFiles = (files = []) => files.map((file) => ({
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`,
}));

const list = async (req, res) => {
    const { type } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });

    try {
        const result = await Asset.list(type, req.query);
        return res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: result.page,
                pageSize: result.pageSize,
                total: result.total,
                totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
            },
        });
    } catch (error) {
        console.error("Asset list error:", error);
        return res.status(500).json({ success: false, message: "Unable to load assets." });
    }
};

const options = async (req, res) => {
    try {
        return res.json({ success: true, data: await Asset.getOptions() });
    } catch (error) {
        console.error("Asset options error:", error);
        return res.status(500).json({ success: false, message: "Unable to load asset options." });
    }
};

const create = async (req, res) => {
    const { type } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });

    try {
        const body = normalizeBody(req.body);
        if (type === "marketing" && !String(body.particular_name || "").trim()) return res.status(400).json({ success: false, message: "Particular Name is required." });
        if (type === "legal" && !String(body.name || "").trim()) return res.status(400).json({ success: false, message: "Name is required." });

        body.attachments = attachmentsFromFiles(req.files || []);
        const row = await Asset.create(type, body, req.user?.id);
        return res.status(201).json({ success: true, message: "Asset added successfully.", data: row });
    } catch (error) {
        console.error("Asset create error:", error);
        return res.status(500).json({ success: false, message: "Unable to add asset." });
    }
};

const update = async (req, res) => {
    const { type, id } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });

    try {
        const body = normalizeBody(req.body);
        if (req.files?.length) {
            const existing = await Asset.findById(type, id);
            body.attachments = [
                ...(existing?.attachments || []),
                ...attachmentsFromFiles(req.files),
            ];
            body.attachmentsProvided = true;
        }

        const row = await Asset.update(type, id, body, req.user?.id);
        if (!row) return res.status(404).json({ success: false, message: "Asset not found." });

        return res.json({ success: true, message: "Asset updated successfully.", data: row });
    } catch (error) {
        console.error("Asset update error:", error);
        return res.status(500).json({ success: false, message: "Unable to update asset." });
    }
};

const remove = async (req, res) => {
    const { type, id } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });

    try {
        const removed = await Asset.remove(type, id);
        if (!removed) return res.status(404).json({ success: false, message: "Asset not found." });
        return res.json({ success: true, message: "Asset deleted successfully." });
    } catch (error) {
        console.error("Asset delete error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete asset." });
    }
};

const importCsv = async (req, res) => {
    const { type } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });
    if (!req.file?.path) return res.status(400).json({ success: false, message: "CSV, XLSX or XLS file is required." });
    try {
        const workbook = XLSX.readFile(req.file.path, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return res.status(400).json({ success: false, message: "The uploaded file contains no worksheet." });
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            defval: "",
            raw: false,
            blankrows: false,
        });

        const rows = rawRows
            .map((row) => mapCsvRow(type, row))
            .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file has no valid data rows. Please use the sample file format.",
            });
        }

        const result = await Asset.importRows(type, rows, req.user?.id);
        const message = result.skipped
            ? `Imported ${result.imported} record(s). Skipped ${result.skipped}.`
            : `${result.imported} record(s) uploaded successfully.`;

        return res.json({ success: result.imported > 0, message, data: result });
    } catch (error) {
        console.error("Asset bulk import error:", error);
        return res.status(500).json({ success: false, message: "Unable to process the uploaded file." });
    } finally {
        fs.promises.unlink(req.file.path).catch(() => {});
    }
};

const removeAll = async (req, res) => {
    const { type } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });
    try {
        const deleted = await Asset.removeAll(type);
        return res.json({ success: true, message: `${deleted} asset record(s) deleted successfully.`, deleted });
    } catch (error) {
        console.error("Asset delete all error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete all assets." });
    }
};

const sample = async (req, res) => {
    const { type } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });
    const headers = type === "marketing"
        ? ["Particular Name", "Store Name", "Department", "Category", "Type", "Rate", "Size", "Color", "Brand", "Location/Address", "Email", "Mobile", "Buy Date", "Expiry Date", "Remark"]
        : ["Name", "Store Name", "Department", "Location/Address", "Remark", "Short Description", "Date of Issue", "Status", "Custom Field Name", "Custom Field Value"];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-assets-sample.csv"`);
    return res.send(`${headers.join(",")}\r\n`);
};

const exportCsv = async (req, res) => {
    const { type } = req.params;
    if (!validateType(type)) return res.status(400).json({ success: false, message: "Invalid asset type." });

    try {
        const rows = await Asset.exportRows(type, req.query);
        const csv = csvRows(type, rows);
        const filename = `${type}-assets-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    } catch (error) {
        console.error("Asset export error:", error);
        return res.status(500).json({ success: false, message: "Unable to export CSV." });
    }
};

module.exports = { list, options, create, update, remove, removeAll, importCsv, exportCsv, sample };
