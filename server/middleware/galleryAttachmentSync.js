const fs = require("fs");
const path = require("path");
const Gallery = require("../models/galleryModel");

const IMAGE_MIMES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
]);

const toNumberOrNull = (value, min, max) => {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

const getRecordId = (payload, req) => {
    const candidates = [
        payload?.data?.submission_id,
        payload?.data?.id,
        payload?.data?.insertId,
        payload?.id,
        payload?.submission_id,
        req.params?.id
    ];
    const value = candidates.find(item => item !== undefined && item !== null && item !== "");
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const syncAttachmentToGallery = (moduleName, fieldName = "attachment") => {
    return (req, res, next) => {
        if (!req.file || !IMAGE_MIMES.has(String(req.file.mimetype || "").toLowerCase())) {
            return next();
        }

        let responsePayload = null;
        const originalJson = res.json.bind(res);

        res.json = (body) => {
            responsePayload = body;
            return originalJson(body);
        };

        res.once("finish", () => {
            if (res.statusCode < 200 || res.statusCode >= 300) return;
            if (!req.file?.path || !fs.existsSync(req.file.path)) return;

            void (async () => {
                try {
                    const storeIdValue = req.body?.store_id ?? req.body?.storeId;
                    const storeId = Number.isInteger(Number(storeIdValue)) && Number(storeIdValue) > 0
                        ? Number(storeIdValue)
                        : null;

                    const latitude = toNumberOrNull(req.body?.latitude, -90, 90);
                    const longitude = toNumberOrNull(req.body?.longitude, -180, 180);
                    const accuracy = toNumberOrNull(req.body?.location_accuracy, 0, 100000);

                    await Gallery.registerAttachment({
                        file_name: req.file.originalname || req.file.filename,
                        file_path: path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
                        mime_type: req.file.mimetype,
                        file_size: req.file.size || 0,
                        uploaded_by: req.user?.id,
                        category: moduleName,
                        description: `${moduleName} attachment`,
                        location_type: storeId ? "store" : "head_office",
                        store_id: storeId,
                        latitude,
                        longitude,
                        location_accuracy: accuracy,
                        source_module: moduleName,
                        source_record_id: getRecordId(responsePayload, req),
                        source_field: fieldName
                    });
                } catch (error) {
                    console.error(`Gallery attachment sync failed (${moduleName}):`, error);
                }
            })();
        });

        next();
    };
};

module.exports = syncAttachmentToGallery;
