const { readDeleteScope } = require("../utils/deleteScope");
const fs = require("fs");
const csvParser = require("csv-parser");
const ListingTracker = require("../models/listingTrackerModel");
const { runBulkUpload, sql: bulkSql, parseNumber } = require("../utils/bulkUploadEngine");

const normalizeHeader = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

const HEADER_MAP = {
    ppkcode: "ppk_code",
    productcode: "ppk_code",
    shopifyhandle: "shopify_handle",
    productname: "product_name",
    category: "category",
    barcode: "barcode",
    sku: "sku",
    mrp: "mrp",
    season: "season",
    collectionname: "collection_name",
    collection: "collection_name",
    imagelink: "image_link",
    imageurl: "image_link",
    photoshoot: "photoshoot",
    photoshootcompleted: "photoshoot",
    productlisted: "product_listed",
    listed: "product_listed",
    remark: "remark",
    remarks: "remark",
};

const mapCsvRow = (row) => {
    const mapped = {};

    Object.entries(row).forEach(([header, value]) => {
        const key = HEADER_MAP[normalizeHeader(header)];

        if (key) {
            mapped[key] = value;
        }
    });

    return mapped;
};

const csvEscape = (value) => {
    if (value === null || value === undefined) return "";

    const text = String(value);

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
};

const toCsv = (rows) => {
    const headers = [
        ["ppk_code", "PPK Code"],
        ["shopify_handle", "Shopify Handle"],
        ["product_name", "Product Name"],
        ["category", "Category"],
        ["barcode", "Barcode"],
        ["sku", "SKU"],
        ["mrp", "MRP"],
        ["season", "Season"],
        ["collection_name", "Collection Name"],
        ["image_link", "Image Link"],
        ["photoshoot", "Photoshoot"],
        ["product_listed", "Product Listed"],
        ["remark", "Remark"],
        ["created_at", "Created At"],
        ["updated_at", "Updated At"],
    ];

    const lines = [
        headers.map(([, label]) => csvEscape(label)).join(","),
    ];

    rows.forEach((row) => {
        lines.push(
            headers
                .map(([key]) => {
                    if (key === "photoshoot" || key === "product_listed") {
                        return csvEscape(row[key] ? "Yes" : "No");
                    }

                    return csvEscape(row[key]);
                })
                .join(",")
        );
    });

    return `${lines.join("\r\n")}\r\n`;
};

const list = async (req, res) => {
    try {
        const result = await ListingTracker.list(req.query);

        return res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: result.page,
                pageSize: result.pageSize,
                total: result.total,
                totalPages: Math.max(
                    1,
                    Math.ceil(result.total / result.pageSize)
                ),
            },
        });
    } catch (error) {
        console.error("Listing Tracker list error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load Listing Tracker.",
        });
    }
};

const summary = async (req, res) => {
    try {
        const result = await ListingTracker.summary(req.query);

        return res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Listing Tracker summary error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load Listing Tracker summary.",
        });
    }
};

const create = async (req, res) => {
    try {
        if (!String(req.body?.ppk_code || "").trim()) {
            return res.status(400).json({
                success: false,
                message: "PPK Code is required.",
            });
        }

        if (!String(req.body?.sku || "").trim()) {
            return res.status(400).json({
                success: false,
                message: "SKU is required.",
            });
        }

        const row = await ListingTracker.create(
            req.body,
            req.user?.id
        );

        return res.status(201).json({
            success: true,
            message: "Product added successfully.",
            data: row,
        });
    } catch (error) {
        console.error("Listing Tracker create error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add product.",
        });
    }
};

const update = async (req, res) => {
    try {
        const row = await ListingTracker.update(
            req.params.id,
            req.body,
            req.user?.id
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        return res.json({
            success: true,
            message: "Product updated successfully.",
            data: row,
        });
    } catch (error) {
        console.error("Listing Tracker update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update product.",
        });
    }
};

const remove = async (req, res) => {
    try {
        const removed = await ListingTracker.remove(req.params.id);

        if (!removed) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        return res.json({
            success: true,
            message: "Product deleted successfully.",
        });
    } catch (error) {
        console.error("Listing Tracker delete error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete product.",
        });
    }
};

const removeAll = async (req, res) => {
    try {
        // Search / collection / category / photoshoot / listed applied on
        // the page -> only the matching products are deleted.
        const scope = readDeleteScope(req);
        if (scope.filtered && !Object.keys(scope.filters).length) {
            return res.status(400).json({ success: false, message: "No valid filter was supplied. Nothing was deleted." });
        }
        const deleted = await ListingTracker.removeAll(scope.filtered ? scope.filters : null);

        return res.json({
            success: true,
            message: `${deleted} ${scope.filtered ? "filtered " : ""}product(s) deleted successfully.`,
            data: { deleted },
        });
    } catch (error) {
        console.error("Listing Tracker delete-all error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete products.",
        });
    }
};

// Bulk import (global bulk-upload engine): any format, every row on
// its own, duplicates (same PPK Code + SKU) reported, extra columns kept.
const importCsv = (req, res) =>
    runBulkUpload({
        req,
        res,
        module: "listing-tracker",

        prepare: async (ctx) => {
            const rows = await bulkSql("SELECT LOWER(TRIM(ppk_code)) AS p, LOWER(TRIM(sku)) AS s FROM listing_tracker_products");
            ctx.data.keys = new Set(rows.map((r) => `${r.p}|${r.s}`));
        },

        validateRow: (row, ctx) => {
            const key = `${ctx.text("PPK Code").toLowerCase()}|${ctx.text("SKU").toLowerCase()}`;
            if (ctx.text("PPK Code") && ctx.text("SKU") && ctx.data.keys.has(key)) {
                ctx.duplicate("SKU", ctx.text("SKU"), `PPK Code ${ctx.text("PPK Code")} with SKU ${ctx.text("SKU")} already exists in the database.`);
            }
            const mrp = ctx.cell("MRP");
            if (String(mrp ?? "").trim() && parseNumber(mrp) !== null && Number.isNaN(parseNumber(mrp))) {
                ctx.fail("MRP", mrp, "MRP must be a number.");
            }
            ["Photoshoot", "Product Listed"].forEach((column) => {
                const value = ctx.text(column).toLowerCase();
                if (value && !["1", "0", "true", "false", "yes", "no", "y", "n", "done", "complete", "completed", "pending"].includes(value)) {
                    ctx.fail(column, ctx.text(column), `${column} must be Yes or No.`);
                }
            });
        },

        duplicateKey: (row, ctx) => ({
            key: `${ctx.text("PPK Code").toLowerCase()}|${ctx.text("SKU").toLowerCase()}`,
            column: "SKU",
            value: ctx.text("SKU")
        }),

        processRow: async (row, ctx) => {
            const created = await ListingTracker.create(
                {
                    ppk_code: ctx.text("PPK Code"),
                    shopify_handle: ctx.text("Shopify Handle"),
                    product_name: ctx.text("Product Name"),
                    category: ctx.text("Category"),
                    barcode: ctx.text("Barcode"),
                    sku: ctx.text("SKU"),
                    mrp: ctx.cell("MRP"),
                    season: ctx.text("Season"),
                    collection_name: ctx.text("Collection Name"),
                    image_link: ctx.text("Image Link"),
                    photoshoot: ctx.text("Photoshoot"),
                    product_listed: ctx.text("Product Listed"),
                    remark: ctx.text("Remark")
                },
                req.user?.id
            );
            return { id: created?.id };
        }
    });

const exportCsv = async (req, res) => {
    try {
        const rows = await ListingTracker.exportRows(req.query);
        const csv = toCsv(rows);

        res.status(200);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="miarcus-listing-tracker-${new Date()
                .toISOString()
                .slice(0, 10)}.csv"`
        );

        return res.send(csv);
    } catch (error) {
        console.error("Listing Tracker CSV export error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to export Listing Tracker.",
        });
    }
};

module.exports = {
    list,
    summary,
    create,
    update,
    remove,
    removeAll,
    importCsv,
    exportCsv,
};
