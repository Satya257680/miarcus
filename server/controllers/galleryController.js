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

const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please select an image" });
        }

        const photoId = await Gallery.create({
            file_name: req.file.filename,
            file_path: path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            uploaded_by: req.user.id,
            category: String(req.body.category || "").trim().slice(0, 100),
            description: String(req.body.description || "").trim().slice(0, 2000)
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
        return res.status(500).json({ success: false, message: error.message || "Unable to upload photo" });
    }
};

const downloadPhoto = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid photo id" });
        }

        const photo = await Gallery.getById(id);
        if (!photo) {
            return res.status(404).json({ success: false, message: "Photo not found" });
        }

        const diskPath = path.resolve(process.cwd(), photo.file_path);
        if (!fs.existsSync(diskPath)) {
            return res.status(404).json({ success: false, message: "Photo file not found" });
        }

        return res.download(diskPath, photo.file_name);
    } catch (error) {
        console.error("Gallery download error:", error);
        return res.status(500).json({ success: false, message: "Unable to download photo" });
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

        const isAdmin = req.user?.is_admin === true || req.user?.is_admin === 1 || req.user?.administrator === true || req.user?.administrator === 1;
        const isOwner = Number(photo.uploaded_by) === Number(req.user.id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: "You can only delete photos you uploaded" });
        }

        await Gallery.softDelete(id);
        const diskPath = path.resolve(process.cwd(), String(photo.file_path).replace(/^.*?uploads[\\/]/, "uploads/"));
        if (fs.existsSync(diskPath)) {
            try { fs.unlinkSync(diskPath); } catch (error) { console.warn("Gallery file cleanup failed:", error.message); }
        }

        return res.json({ success: true, id });
    } catch (error) {
        console.error("Gallery delete error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete photo" });
    }
};

const createMobileSession = async (req, res) => {
    try {
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const sessionId = await Gallery.createMobileSession({
            tokenHash,
            createdBy: req.user.id,
            expiresAt
        });

        const uploadUrl = `${getFrontendOrigin(req)}/gallery/mobile/${token}`;
        return res.status(201).json({
            success: true,
            sessionId,
            uploadUrl,
            expiresAt: expiresAt.toISOString()
        });
    } catch (error) {
        console.error("Gallery mobile session error:", error);
        return res.status(500).json({ success: false, message: "Unable to create mobile upload session" });
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
            expiresAt: session.expires_at
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

        const photoId = await Gallery.create({
            file_name: req.file.filename,
            file_path: path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            uploaded_by: session.created_by,
            category: String(req.body.category || "").trim().slice(0, 100),
            description: String(req.body.description || "").trim().slice(0, 2000)
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
        return res.status(500).json({ success: false, message: error.message || "Unable to upload photo" });
    }
};

const mobileOpen = async (req, res) => {
    try {
        const session = await Gallery.getMobileSession(hashToken(String(req.params.token || "")));
        if (!session || session.status !== "pending" || new Date(session.expires_at).getTime() <= Date.now()) {
            if (session) await Gallery.expireSession(session.id);
            return res.status(410).json({ success: false, message: "This upload link has expired or was already used" });
        }
        return res.json({ success: true, expiresAt: session.expires_at });
    } catch (error) {
        console.error("Gallery mobile open error:", error);
        return res.status(500).json({ success: false, message: "Unable to open upload session" });
    }
};

module.exports = {
    getAll,
    getCategories,
    uploadPhoto,
    downloadPhoto,
    deletePhoto,
    createMobileSession,
    mobileStatus,
    mobileUpload,
    mobileOpen
};
