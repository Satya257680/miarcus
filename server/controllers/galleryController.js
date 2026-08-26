const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const Gallery = require("../models/galleryModel");

const publicFilePath = (filePath) => {
    const normalized = String(filePath || "").replace(/\\/g, "/");
    const marker = "/uploads/";
    const index = normalized.indexOf(marker);
    return index >= 0 ? normalized.slice(index) : normalized;
};

const toNullableNumber = (value, min, max) => {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) return null;
    return number;
};

const normalizeLocation = async (locationType, storeId) => {
    const type = String(locationType || "head_office").trim();
    if (!["head_office", "store"].includes(type)) {
        const error = new Error("Please select Head Office or a valid Store.");
        error.statusCode = 400;
        throw error;
    }

    if (type === "head_office") {
        return { location_type: "head_office", store_id: null };
    }

    const id = Number(storeId);
    if (!Number.isInteger(id) || id <= 0 || !(await Gallery.storeExists(id))) {
        const error = new Error("Please select a valid active store.");
        error.statusCode = 400;
        throw error;
    }

    return { location_type: "store", store_id: id };
};

const serialize = (row) => ({
    id: Number(row.id),
    file_name: row.file_name,
    file_path: publicFilePath(row.file_path),
    mime_type: row.mime_type,
    file_size: Number(row.file_size || 0),
    uploaded_by: Number(row.uploaded_by),
    uploaded_by_name: row.uploaded_by_name || "Unknown",
    employee_id: row.employee_id || null,
    category: row.category || "",
    description: row.description || "",
    location_type: row.location_type || "head_office",
    store_id: row.store_id ? Number(row.store_id) : null,
    location_name: row.location_type === "store" ? (row.store_name || "Store") : "Head Office",
    store_name: row.store_name || null,
    store_code: row.store_code || null,
    latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
    location_accuracy: row.location_accuracy !== null && row.location_accuracy !== undefined ? Number(row.location_accuracy) : null,
    source_module: row.source_module || "Gallery",
    source_record_id: row.source_record_id ? Number(row.source_record_id) : null,
    source_field: row.source_field || null,
    uploaded_at: row.uploaded_at
});

const getFrontendOrigin = (req) => {
    const origin = String(req.get("origin") || "").replace(/\/$/, "");
    if (origin) return origin;

    const configured = String(process.env.CLIENT_URL || "").replace(/\/$/, "");
    if (configured) return configured;

    return `${req.protocol}://${req.get("host")}`;
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getAll = async (req, res) => {
    try {
        const result = await Gallery.list({
            search: String(req.query.search || "").trim(),
            category: String(req.query.category || "").trim(),
            locationType: String(req.query.location_type || "").trim(),
            storeId: String(req.query.store_id || "").trim(),
            from: String(req.query.from || "").trim(),
            to: String(req.query.to || "").trim(),
            page: req.query.page,
            limit: req.query.limit
        });

        return res.json({
            success: true,
            photos: result.rows.map(serialize),
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error("Gallery list error:", error);
        return res.status(500).json({ success: false, message: "Unable to load gallery" });
    }
};

const getCategories = async (_req, res) => {
    try {
        return res.json({ success: true, categories: await Gallery.categories() });
    } catch (error) {
        console.error("Gallery categories error:", error);
        return res.status(500).json({ success: false, message: "Unable to load gallery categories" });
    }
};

const getLocations = async (_req, res) => {
    try {
        return res.json({ success: true, locations: await Gallery.getLocations() });
    } catch (error) {
        console.error("Gallery locations error:", error);
        return res.status(500).json({ success: false, message: "Unable to load Gallery locations" });
    }
};

const createPhotoRecord = async ({ req, file, location, latitude, longitude, locationAccuracy }) => {
    return Gallery.create({
        file_name: file.originalname || file.filename,
        file_path: path.relative(process.cwd(), file.path).replace(/\\/g, "/"),
        mime_type: file.mimetype,
        file_size: file.size,
        file_data: fs.readFileSync(file.path),
        uploaded_by: req.user.id,
        category: String(req.body.category || "").trim().slice(0, 100),
        description: String(req.body.description || "").trim().slice(0, 2000),
        location_type: location.location_type,
        store_id: location.store_id,
        latitude,
        longitude,
        location_accuracy: locationAccuracy,
        source_module: "Gallery",
        source_field: "photo"
    });
};

const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please select a file" });
        }

        const location = await normalizeLocation(req.body.location_type, req.body.store_id);
        const latitude = toNullableNumber(req.body.latitude, -90, 90);
        const longitude = toNullableNumber(req.body.longitude, -180, 180);
        const locationAccuracy = toNullableNumber(req.body.location_accuracy, 0, 100000);

        const photoId = await createPhotoRecord({
            req,
            file: req.file,
            location,
            latitude,
            longitude,
            locationAccuracy
        });

        const photo = await Gallery.getById(photoId);
        return res.status(201).json({
            success: true,
            id: photoId,
            photo: serialize(photo),
            uploader_name: photo?.uploaded_by_name || req.user.name || "An employee"
        });
    } catch (error) {
        if (req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch {}
        }
        console.error("Gallery upload error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to upload file"
        });
    }
};


const bulkUploadPhotos = async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const createdIds = [];

    try {
        if (!files.length) {
            return res.status(400).json({ success: false, message: "Please select at least one file." });
        }

        const location = await normalizeLocation(req.body.location_type, req.body.store_id);
        const latitude = toNullableNumber(req.body.latitude, -90, 90);
        const longitude = toNullableNumber(req.body.longitude, -180, 180);
        const locationAccuracy = toNullableNumber(req.body.location_accuracy, 0, 100000);

        if (latitude === null || longitude === null) {
            return res.status(400).json({ success: false, message: "Please capture the current GPS location before bulk upload." });
        }

        for (const file of files) {
            const photoId = await Gallery.create({
                file_name: file.originalname || file.filename,
                file_path: path.relative(process.cwd(), file.path).replace(/\\/g, "/"),
                mime_type: file.mimetype,
                file_size: file.size,
                file_data: fs.readFileSync(file.path),
                uploaded_by: req.user.id,
                category: String(req.body.category || "").trim().slice(0, 100),
                description: String(req.body.description || "").trim().slice(0, 2000),
                location_type: location.location_type,
                store_id: location.store_id,
                latitude,
                longitude,
                location_accuracy: locationAccuracy,
                source_module: "Gallery",
                source_field: "bulk_photos"
            });
            createdIds.push(photoId);
        }

        return res.status(201).json({
            success: true,
            message: `${createdIds.length} file${createdIds.length === 1 ? "" : "s"} uploaded successfully.`,
            ids: createdIds
        });
    } catch (error) {
        for (const file of files) {
            if (file?.path) {
                try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
            }
        }
        console.error("Gallery bulk upload error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to bulk upload files."
        });
    }
};

const deleteAllPhotos = async (_req, res) => {
    try {
        const rows = await Gallery.deleteAll();
        let removedFiles = 0;

        for (const row of rows) {
            // Never physically delete an attachment owned by another module.
            if (row.source_module && row.source_module !== "Gallery") continue;

            const diskPath = path.resolve(process.cwd(), String(row.file_path || ""));
            if (fs.existsSync(diskPath)) {
                try {
                    fs.unlinkSync(diskPath);
                    removedFiles += 1;
                } catch (error) {
                    console.warn("Gallery bulk file cleanup failed:", error.message);
                }
            }
        }

        return res.json({
            success: true,
            deleted: rows.length,
            removedFiles
        });
    } catch (error) {
        console.error("Gallery delete-all error:", error);
        return res.status(500).json({ success: false, message: "Unable to clear Gallery." });
    }
};

const servePhoto = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid photo id" });
        }

        const photo = await Gallery.getFile(id);
        if (!photo) {
            return res.status(404).json({ success: false, message: "Photo not found" });
        }

        let buffer = photo.file_data;

        // Older Gallery records may pre-date database-backed files. Read the
        // existing disk file once and migrate it into MySQL on first access.
        if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
            const diskPath = path.resolve(process.cwd(), String(photo.file_path || ""));
            if (!fs.existsSync(diskPath)) {
                return res.status(404).json({ success: false, message: "Photo file not found" });
            }

            buffer = fs.readFileSync(diskPath);
            await Gallery.saveFileData(id, buffer);
        }

        res.setHeader("Content-Type", photo.mime_type || "application/octet-stream");
        res.setHeader("Content-Length", String(buffer.length));
        res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(photo.file_name || `gallery-${id}`)}`);
        res.setHeader("Cache-Control", "private, no-store, max-age=0");
        return res.end(buffer);
    } catch (error) {
        console.error("Gallery file serve error:", error);
        return res.status(500).json({ success: false, message: "Unable to load gallery file" });
    }
};

const downloadPhoto = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid gallery item id" });
        }

        const file = await Gallery.getFile(id);
        if (!file) {
            return res.status(404).json({ success: false, message: "Gallery file not found" });
        }

        let buffer = file.file_data;

        // Keep legacy files working and migrate them to MySQL on first access.
        if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
            const diskPath = path.resolve(process.cwd(), String(file.file_path || ""));
            if (!fs.existsSync(diskPath)) {
                return res.status(404).json({ success: false, message: "Gallery file not found" });
            }
            buffer = fs.readFileSync(diskPath);
            await Gallery.saveFileData(id, buffer);
        }

        res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
        res.setHeader("Content-Length", String(buffer.length));
        res.setHeader(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name || `gallery-${id}`)}`
        );
        res.setHeader("Cache-Control", "private, no-store, max-age=0");
        return res.end(buffer);
    } catch (error) {
        console.error("Gallery download error:", error);
        return res.status(500).json({ success: false, message: "Unable to download gallery file" });
    }
};

const deletePhoto = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid photo id" });
        }

        const photo = await Gallery.getById(id);
        if (!photo) return res.status(404).json({ success: false, message: "Photo not found" });

        const isAdmin = Number(req.user?.is_admin) === 1;
        const isOwner = Number(photo.uploaded_by) === Number(req.user.id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: "You can only delete photos you uploaded" });
        }

        await Gallery.softDelete(id);
        if (!photo.source_module || photo.source_module === "Gallery") {
            const diskPath = path.resolve(process.cwd(), String(photo.file_path).replace(/^.*?uploads[\\/]/, "uploads/"));
            if (fs.existsSync(diskPath)) {
                try { fs.unlinkSync(diskPath); } catch (error) { console.warn("Gallery file cleanup failed:", error.message); }
            }
        }

        return res.json({ success: true, id });
    } catch (error) {
        console.error("Gallery delete error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete photo" });
    }
};

const createMobileSession = async (req, res) => {
    try {
        const location = await normalizeLocation(req.body.location_type, req.body.store_id);
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const sessionId = await Gallery.createMobileSession({
            tokenHash,
            createdBy: req.user.id,
            expiresAt,
            locationType: location.location_type,
            storeId: location.store_id
        });

        const uploadUrl = `${getFrontendOrigin(req)}/gallery/mobile/${token}`;
        return res.status(201).json({
            success: true,
            sessionId,
            uploadUrl,
            expiresAt: expiresAt.toISOString(),
            location_type: location.location_type,
            store_id: location.store_id
        });
    } catch (error) {
        console.error("Gallery mobile session error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to create mobile upload session"
        });
    }
};

const mobileStatus = async (req, res) => {
    try {
        const session = await Gallery.getSessionStatus(Number(req.params.id), req.user.id);
        if (!session) return res.status(404).json({ success: false, message: "Upload session not found" });

        if (session.status === "pending" && new Date(session.expires_at).getTime() <= Date.now()) {
            await Gallery.expireSession(session.id);
            session.status = "expired";
        }

        return res.json({
            success: true,
            status: session.status,
            photoId: session.gallery_photo_id,
            uploadedAt: session.uploaded_at,
            expiresAt: session.expires_at,
            location_type: session.location_type,
            store_id: session.store_id ? Number(session.store_id) : null
        });
    } catch (error) {
        console.error("Gallery mobile status error:", error);
        return res.status(500).json({ success: false, message: "Unable to read mobile upload status" });
    }
};

const mobileUpload = async (req, res) => {
    try {
        const token = String(req.params.token || "").trim();
        if (!token) return res.status(400).json({ success: false, message: "Invalid upload token" });

        const session = await Gallery.getMobileSession(hashToken(token));
        if (!session) return res.status(404).json({ success: false, message: "Upload link is invalid or expired" });
        if (session.status !== "pending") return res.status(409).json({ success: false, message: "This upload link has already been used" });
        if (new Date(session.expires_at).getTime() <= Date.now()) {
            await Gallery.expireSession(session.id);
            return res.status(410).json({ success: false, message: "This upload link has expired" });
        }
        if (!req.file) return res.status(400).json({ success: false, message: "Please select or take a photo" });

        const latitude = toNullableNumber(req.body.latitude, -90, 90);
        const longitude = toNullableNumber(req.body.longitude, -180, 180);
        const locationAccuracy = toNullableNumber(req.body.location_accuracy, 0, 100000);

        const photoId = await Gallery.create({
            file_name: req.file.filename,
            file_path: path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            file_data: fs.readFileSync(req.file.path),
            uploaded_by: session.created_by,
            category: String(req.body.category || "").trim().slice(0, 100),
            description: String(req.body.description || "").trim().slice(0, 2000),
            location_type: session.location_type || "head_office",
            store_id: session.store_id || null,
            latitude,
            longitude,
            location_accuracy: locationAccuracy
        });

        await Gallery.markMobileUploaded(session.id, photoId);
        const photo = await Gallery.getById(photoId);

        return res.status(201).json({
            success: true,
            id: photoId,
            photo: serialize(photo),
            uploader_name: photo?.uploaded_by_name || "Employee"
        });
    } catch (error) {
        if (req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch {}
        }
        console.error("Gallery mobile upload error:", error);
        return res.status(500).json({ success: false, message: "Unable to upload photo" });
    }
};

const mobileOpen = async (req, res) => {
    try {
        const session = await Gallery.getMobileSession(hashToken(String(req.params.token || "")));
        if (!session || session.status !== "pending" || new Date(session.expires_at).getTime() <= Date.now()) {
            if (session) await Gallery.expireSession(session.id);
            return res.status(410).json({ success: false, message: "This upload link has expired or was already used" });
        }
        const storeId = session.store_id ? Number(session.store_id) : null;
        const storeName = storeId ? await Gallery.getStoreName(storeId) : null;
        return res.json({
            success: true,
            expiresAt: session.expires_at,
            location_type: session.location_type,
            store_id: storeId,
            location_name: session.location_type === "store" ? (storeName || "Selected Store") : "Head Office"
        });
    } catch (error) {
        console.error("Gallery mobile open error:", error);
        return res.status(500).json({ success: false, message: "Unable to open upload session" });
    }
};

module.exports = {
    getAll,
    getCategories,
    getLocations,
    uploadPhoto,
    bulkUploadPhotos,
    deleteAllPhotos,
    servePhoto,
    downloadPhoto,
    deletePhoto,
    createMobileSession,
    mobileStatus,
    mobileUpload,
    mobileOpen
};
