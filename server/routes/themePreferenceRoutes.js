const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const ThemePreference = require("../models/themePreferenceModel");

const isAdmin = (user) => Number(user?.is_admin) === 1;

// Admin-managed portal-wide theme. The default is OFF, so existing users keep
// their personal preferences and the original MIARCUS theme is not changed.
router.get("/global", authMiddleware, async (req, res) => {
    try {
        const globalTheme = await ThemePreference.getGlobal();
        return res.status(200).json({ success: true, globalTheme });
    } catch (error) {
        console.error("GET GLOBAL THEME ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load global appearance settings." });
    }
});

router.put("/global", authMiddleware, async (req, res) => {
    if (!isAdmin(req.user)) {
        return res.status(403).json({ success: false, message: "Only an administrator can apply a theme to all users." });
    }
    try {
        const globalTheme = await ThemePreference.saveGlobal({
            enabled: req.body?.enabled !== false,
            preferences: req.body?.preferences || req.body || {},
            updatedBy: req.user.id
        });
        return res.status(200).json({ success: true, message: "Global appearance settings saved.", globalTheme });
    } catch (error) {
        console.error("SAVE GLOBAL THEME ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to save global appearance settings." });
    }
});

// GET current user's personal appearance preferences.
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Authenticated user not found." });
        const preferences = await ThemePreference.getByUserId(userId);
        return res.status(200).json({ success: true, preferences });
    } catch (error) {
        console.error("GET THEME PREFERENCE ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load appearance preferences." });
    }
});

// SAVE current user's personal appearance preferences.
router.put("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Authenticated user not found." });
        const preferences = await ThemePreference.saveForUser(userId, req.body || {});
        return res.status(200).json({ success: true, message: "Appearance preferences saved successfully.", preferences });
    } catch (error) {
        console.error("SAVE THEME PREFERENCE ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to save appearance preferences." });
    }
});

module.exports = router;
