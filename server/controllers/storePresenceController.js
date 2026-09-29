const StorePresence = require("../models/storePresenceModel");

// ======================================================
// STORE PRESENCE CONTROLLER
// ======================================================

const clientIp = (req) =>
    String(
        req.headers["x-forwarded-for"] ||
        req.socket?.remoteAddress ||
        ""
    )
        .split(",")[0]
        .trim() || null;

// POST /api/store-presence/heartbeat  (any logged-in user)
exports.heartbeat = async (req, res) => {
    try {
        await StorePresence.heartbeat(req.user?.id, {
            path: req.body?.path,
            userAgent: req.headers["user-agent"],
            ip: clientIp(req)
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Store presence heartbeat error:", error.message);
        // Never break the app because of presence tracking.
        return res.json({ success: false });
    }
};

// POST /api/store-presence/offline  (tab closed / logout)
exports.offline = async (req, res) => {
    try {
        await StorePresence.markOffline(req.user?.id);
        return res.json({ success: true });
    } catch (error) {
        console.error("Store presence offline error:", error.message);
        return res.json({ success: false });
    }
};

// GET /api/store-presence/stores  (administrator only)
exports.getStoreStatus = async (req, res) => {
    try {
        const data = await StorePresence.getStoreStatus();

        const online = data.filter((store) => store.is_online).length;

        return res.json({
            success: true,
            data,
            summary: {
                total: data.length,
                online,
                offline: data.length - online,
                users_online: data.reduce((sum, store) => sum + store.online_count, 0)
            },
            online_window_seconds: StorePresence.ONLINE_WINDOW_SECONDS,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error("Store status error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load store status"
        });
    }
};
