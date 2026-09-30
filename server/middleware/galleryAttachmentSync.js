const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { UPLOAD_DIR } = require("../config/storage");
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
        payload?.data?.attendance?.id,
        payload?.attendance?.id,
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
        "Asset Master": "/asset-master",
        "Attendance": "/attendance",
        "Collection Tracking": "/collection-tracking",
        "Travel Plan": "/travel-plan"
    };

    return map[moduleName] || "/gallery";
};

// One notification per request (not one per file), sent only to
// the people who should see it — see services/notificationAudience.js
// (admins, all-store users, and users of THIS store with access to
// the module). The uploader is not notified about their own upload.
const notifyAttachments = async ({
    moduleName,
    recordId,
    fileNames = [],
    actorId,
    storeId,
    isCreate
}) => {
    try {
        const Audience = require("../services/notificationAudience");

        const recipients = await Audience.getAudience({
            moduleName,
            storeIds: storeId ? [storeId] : [],
            actorId
        });

        if (!recipients.length) return;

        let actorName = "A team member";
        let storeName = "";

        try {
            const [actorRows, storeRows] = await Promise.all([
                actorId ? db.query("SELECT name FROM users WHERE id = ? LIMIT 1", [actorId]) : [],
                storeId ? db.query("SELECT store_name FROM stores WHERE id = ? LIMIT 1", [storeId]) : []
            ]);
            actorName = actorRows?.[0]?.name || actorName;
            storeName = storeRows?.[0]?.store_name || "";
        } catch {
            /* names are cosmetic */
        }

        const count = fileNames.length;
        const where = storeName ? ` · ${storeName}` : "";
        const files = count === 1
            ? (fileNames[0] || "1 file")
            : `${count} files`;

        const title = isCreate
            ? `New ${moduleName}${where}`
            : `New attachment in ${moduleName}${where}`;

        const message = isCreate
            ? `${actorName} submitted ${moduleName}${storeName ? ` for ${storeName}` : ""} with ${count === 1 ? "1 attachment" : `${count} attachments`}.`
            : `${actorName} added ${files} to ${moduleName}.`;

        await Notification.createForUsers(recipients, {
            title,
            message,
            type: "info",
            module_name: moduleName,
            action_name: isCreate ? "Submitted" : "Attachment Added",
            entity_id: recordId,
            link: getModuleLink(moduleName)
        });
    } catch (error) {
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

        // Snapshot the upload before the controller runs. Some controllers
        // move/delete their temporary upload after saving the business record.
        // Keeping the bytes here makes Gallery synchronization reliable for
        // both diskStorage and memoryStorage multer configurations.
        const attachmentSnapshots = files.map((file) => {
            let buffer = null;
            if (Buffer.isBuffer(file?.buffer)) buffer = file.buffer;
            else if (file?.path && fs.existsSync(file.path)) buffer = fs.readFileSync(file.path);
            return { file, buffer };
        }).filter((item) => item.buffer && item.buffer.length);

        if (!attachmentSnapshots.length) return next();

        // The attachment sync owns the notification for this mutation.
        // This prevents the generic event bridge from creating a duplicate.
        req._galleryAttachmentSync = { moduleName, fieldName };

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
                const syncedNames = [];
                let lastGalleryId = null;

                for (const { file, buffer } of attachmentSnapshots) {
                    try {
                        const extension = path.extname(file.originalname || file.filename || "").toLowerCase();
                        const now = new Date();
                        const galleryDir = path.join(
                            UPLOAD_DIR,
                            "gallery",
                            String(now.getFullYear()),
                            String(now.getMonth() + 1).padStart(2, "0"),
                            String(now.getDate()).padStart(2, "0")
                        );
                        fs.mkdirSync(galleryDir, { recursive: true });

                        const galleryFileName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extension}`;
                        const galleryAbsolutePath = path.join(galleryDir, galleryFileName);
                        fs.writeFileSync(galleryAbsolutePath, buffer);

                        const storeIdValue = req.body?.store_id ?? req.body?.storeId;
                        const storeId = Number.isInteger(Number(storeIdValue)) && Number(storeIdValue) > 0
                            ? Number(storeIdValue)
                            : null;

                        const latitude = toNumberOrNull(req.body?.latitude, -90, 90);
                        const longitude = toNumberOrNull(req.body?.longitude, -180, 180);
                        const accuracy = toNumberOrNull(req.body?.location_accuracy, 0, 100000);

                        const galleryId = await Gallery.registerAttachment({
                            file_name: file.originalname || file.filename || galleryFileName,
                            file_path: path.relative(process.cwd(), galleryAbsolutePath).replace(/\\/g, "/"),
                            mime_type: file.mimetype || "application/octet-stream",
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

                        syncedNames.push(file.originalname || file.filename || galleryFileName);
                        lastGalleryId = galleryId;
                    } catch (error) {
                        console.error(
                            `Gallery attachment sync failed (${moduleName}):`,
                            error
                        );
                    }
                }

                // Attendance selfies are kept in Gallery but are not
                // notification events (Attendance Reports shows them).
                if (syncedNames.length && !/^check-(in|out)-photo$/i.test(moduleName)) {
                    const storeIdValue = req.body?.store_id ?? req.body?.storeId;
                    const storeId = Number.isInteger(Number(storeIdValue)) && Number(storeIdValue) > 0
                        ? Number(storeIdValue)
                        : null;

                    await notifyAttachments({
                        moduleName,
                        recordId: recordId || lastGalleryId,
                        fileNames: syncedNames,
                        actorId: req.user?.id,
                        storeId,
                        isCreate:
                            String(req.method).toUpperCase() === "POST" &&
                            !/\/\d+(\/|$)/.test(String(req.originalUrl || "").split("?")[0])
                    });
                }
            })();
        });

        next();
    };
};

module.exports = syncAttachmentToGallery;
