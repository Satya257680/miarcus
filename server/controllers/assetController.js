const fs = require("fs");
const Asset = require("../models/assetModel");
const csvParser = require("csv-parser");

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[\s_\-/]+/g, "");

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
        if (key) mapped[key] = value;
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
            ["particular_name", "Particular Name"], ["store_name", "Store Name"], ["category", "Category"], ["type", "Type"], ["rate", "Rate"], ["size", "Size"], ["color", "Color"], ["brand", "Brand"], ["department_name", "Department"], ["location_address", "Location/Address"], ["email", "Email"], ["mobile", "Mobile"], ["buy_date", "Buy Date"], ["expiry_date", "Expiry Date"], ["days_to_expire", "Days to Expire"], ["remark", "Remark"], ["attachments", "Attachments"], ["created_at", "Created At"],
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
    if (!req.file?.path) return res.status(400).json({ success: false, message: "CSV file is required." });

    try {
        const rows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csvParser())
                .on("data", (row) => rows.push(mapCsvRow(type, row)))
                .on("end", resolve)
                .on("error", reject);
        });

        const result = await Asset.importRows(type, rows, req.user?.id);
        return res.json({ success: true, message: `Imported ${result.imported} record(s). Skipped ${result.skipped}.`, data: result });
    } catch (error) {
        console.error("Asset import error:", error);
        return res.status(500).json({ success: false, message: "Unable to import CSV." });
    } finally {
        fs.promises.unlink(req.file.path).catch(() => {});
    }
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

module.exports = { list, options, create, update, remove, importCsv, exportCsv };
