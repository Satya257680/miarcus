const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { JWT_SECRET, JWT_ALGORITHM } = require("../config/security");
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const C = require("../controllers/chatController");
const { authenticateLoginToken } = require("../utils/accessToken");
const { UPLOAD_DIR } = require("../config/storage");

const router = express.Router();

const upload = multer({
    storage: multer.diskStorage({
        // Same folder the /uploads and /api/files routes serve from
        // (config/storage UPLOAD_DIR). A hard-coded server/uploads path
        // broke attachments wherever UPLOAD_DIR / a persistent disk is used.
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname || "").toLowerCase();
            cb(
                null,
                `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`
            );
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowed = [
            "image/",
            "video/",
            "audio/"
        ];

        const isAllowed =
            allowed.some(prefix => file.mimetype.startsWith(prefix)) ||
            file.mimetype === "application/pdf" ||
            file.mimetype === "text/plain" ||
            file.mimetype === "application/zip" ||
            file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        if (!isAllowed) {
            return cb(new Error("This file type is not supported in Chat."));
        }

        cb(null, true);
    }
});

const streamAuth = async (req, res, next) => {
    const token = String(req.query.token || "").trim();
    if (!token) {
        return res.status(401).json({ success: false, message: "Chat event token is missing." });
    }

    try {
        // Same checks as authMiddleware (login token only, active +
        // activated user, current token version → revoked sessions can no
        // longer keep a live chat stream open).
        const session = await authenticateLoginToken(token);
        if (!session) {
            return res.status(401).json({ success: false, message: "Token expired or invalid." });
        }
        const { decoded, user } = session;

        req.user = {
            ...decoded,
            id: user.id,
            name: user.name,
            email: user.email,
            is_admin: Number(user.is_admin) === 1,
            tokenVersion: Number(user.token_version || 0)
        };
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Token expired or invalid." });
    }
};

// EventSource cannot send an Authorization header. Authenticate this one
// endpoint from its short-lived JWT query parameter, then apply Chat RBAC.
router.get("/events", streamAuth, permission("Chat", "View"), C.stream);

router.use(auth);

const viewAccess = permission("Chat", "View");
const addAccess = permission("Chat", "Add");
const editAccess = permission("Chat", "Edit");
const fullAccess = permission("Chat", "Full");

router.get("/bootstrap", viewAccess, C.bootstrap);
router.get("/contacts", viewAccess, C.contacts);
router.get("/conversations", viewAccess, C.listConversations);
router.post("/conversations/direct", addAccess, C.createDirect);
router.post("/conversations/group", addAccess, C.createGroup);

router.get("/conversations/:id", viewAccess, async (req, res, next) => {
    try {
        const conversation = await require("../models/chatModel").getConversation(req.params.id);
        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });

        if (!require("../models/chatModel").isAdmin(req.user)) {
            const member = conversation.members.some(m => Number(m.id) === Number(req.user.id));
            if (!member) return res.status(403).json({ success: false, message: "Access denied." });
        }

        res.json({ success: true, conversation });
    } catch (error) {
        next(error);
    }
});

router.get("/conversations/:id/messages", viewAccess, C.messages);
router.post("/conversations/:id/messages", addAccess, upload.single("attachment"), C.sendMessage);
router.post("/conversations/:id/read", viewAccess, C.read);
router.get("/conversations/:id/settings", viewAccess, C.getConversationSettings);
router.put("/conversations/:id/settings", viewAccess, C.updateConversationSettings);
router.get("/conversations/:id/starred", viewAccess, C.starredMessages);
router.get("/conversations/:id/media", viewAccess, C.mediaMessages);
router.post("/conversations/:id/clear", fullAccess, C.clearConversation);
router.delete("/conversations/:id", fullAccess, C.deleteConversation);

router.put("/messages/:id", editAccess, C.editMessage);
router.delete("/messages/:id", fullAccess, C.deleteMessage);
router.post("/messages/:id/reactions", addAccess, C.react);
router.post("/messages/:id/star", addAccess, C.starMessage);

router.put("/presence", viewAccess, C.presence);
router.get("/calls/history", viewAccess, C.callHistory);
router.post("/calls/history/clear", viewAccess, C.clearCallHistory);
router.delete("/calls/:id/history", viewAccess, C.deleteCallHistoryItem);
router.get("/calls/incoming", viewAccess, C.incomingCalls);
router.post("/calls", addAccess, C.startCall);
router.get("/calls/:id", viewAccess, C.getCallStatus);
router.post("/calls/:id/signals", addAccess, C.callSignal);
router.get("/calls/:id/signals", viewAccess, C.callSignals);
router.put("/calls/:id", addAccess, C.updateCall);

router.get("/admin/overview", fullAccess, C.adminOverview);
router.put("/admin/stores/:storeId/manager", fullAccess, C.assignManager);

router.use((error, req, res, next) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            success: false,
            message: "Chat attachment is larger than 50 MB."
        });
    }

    next(error);
});

module.exports = router;
