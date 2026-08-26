const fs = require("fs");
const path = require("path");
const Gallery = require("../models/galleryModel");
const Notification = require("../services/notificationService");
const db = require("../config/db");

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
        payload?.data?.entity_id,
        payload?.id,
        payload?.insertId,
        payload?.entity_id,
        payload?.submission_id,
        payload?.actionPointId,
        payload?.action_point_id,
        payload?.new_store_opening_id,
        payload?.expense_id,
        payload?.message?.id,
        req.params?.id
    ];

    for (const value of candidates) {
        const n = Number(value);
        if (Number.isInteger(n) && n > 0) return n;
    }

    return null;
};

const getFiles = (req) => {
    if (req.file) return [req.file];

    if (Array.isArray(req.files)) return req.files.filter(Boolean);

    if (req.files && typeof req.files === "object") {
        return Object.values(req.files)
            .flat()
            .filter(Boolean);
    }

    return [];
};

const getModuleLink = (moduleName) => {
    const map = {
        "Announcements": "/announcements",
        "Gallery": "/gallery",
        "Action Points": "/action-points",
        "Checklist Submission": "/checklist-reports",
        "New Store Openings": "/new-store-openings",
        "Expenses": "/expenses",
        "Petty Cash": "/petty-cash",
        "Asset Master": "/asset-master"
    };

    return map[moduleName] || "/gallery";
};

const notifyAttachment = async ({
    moduleName,
    recordId,
    fileName,
    actorId
}) => {
    try {
        const actor = Number(actorId || 0);
        const users = await db.query(`
            SELECT id
            FROM users
            WHERE status = 'Active'
            ORDER BY id ASC
        `);

        const recipients = users
            .map(row => Number(row.id))
            .filter(id => id > 0 && id !== actor);

        if (!recipients.length) return;

        await Notification.createForUsers(recipients, {
            title: `New attachment in ${moduleName}`,
            message: `${fileName || "A file"} was added to ${moduleName}.`,
            type: "info",
            module_name: moduleName,
            action_name: "Attachment Added",
            entity_id: recordId,
            link: getModuleLink(moduleName)
        });
    } catch (error) {
        // Gallery synchronization must never make the originating
        // business transaction fail.
        console.error(
            `Gallery attachment notification failed (${moduleName}):`,
            error.message
        );
    }
};

const syncAttachmentToGallery = (moduleName, fieldName = "attachment") => {
    return (req, res, next) => {
        const files = getFiles(req);

        if (!files.length) return next();

        let responsePayload = null;
        const originalJson = res.json.bind(res);

        res.json = (body) => {
            responsePayload = body;
            return originalJson(body);
        };

        res.once("finish", () => {
            if (res.statusCode < 200 || res.statusCode >= 300) return;

            void (async () => {
                const recordId = getRecordId(responsePayload, req);

                for (const file of files) {
                    if (!file?.path || !fs.existsSync(file.path)) continue;

                    try {
                        const buffer = fs.readFileSync(file.path);
                        const storeIdValue = req.body?.store_id ?? req.body?.storeId;
                        const storeId = Number.isInteger(Number(storeIdValue)) && Number(storeIdValue) > 0
                            ? Number(storeIdValue)
                            : null;

                        const latitude = toNumberOrNull(req.body?.latitude, -90, 90);
                        const longitude = toNumberOrNull(req.body?.longitude, -180, 180);
                        const accuracy = toNumberOrNull(req.body?.location_accuracy, 0, 100000);

                        const galleryId = await Gallery.registerAttachment({
                            file_name: file.originalname || file.filename,
                            file_path: path.relative(process.cwd(), file.path).replace(/\\/g, "/"),
                            mime_type: file.mimetype,
                            file_size: buffer.length,
                            file_data: buffer,
                            uploaded_by: req.user?.id,
                            category: moduleName,
                            description: `${moduleName} attachment`,
                            location_type: storeId ? "store" : "head_office",
                            store_id: storeId,
                            latitude,
                            longitude,
                            location_accuracy: accuracy,
                            source_module: moduleName,
                            source_record_id: recordId,
                            source_field: fieldName
                        });

                        await notifyAttachment({
                            moduleName,
                            recordId: recordId || galleryId,
                            fileName: file.originalname || file.filename,
                            actorId: req.user?.id
                        });
                    } catch (error) {
                        console.error(
                            `Gallery attachment sync failed (${moduleName}):`,
                            error
                        );
                    }
                }
            })();
        });

        next();
    };
};

module.exports = syncAttachmentToGallery;
