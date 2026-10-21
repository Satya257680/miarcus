const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const ThemePreference = require("../models/themePreferenceModel");

// ======================================================================
// APPEARANCE / THEME PREFERENCES
//
//   GET    /global   any signed-in user  -> organisation appearance
//   PUT    /global   administrators only -> set / change / disable it
//   GET    /         signed-in user      -> own saved appearance
//   PUT    /         signed-in user      -> "Save as my default"
//   DELETE /         signed-in user      -> forget own default (reset)
//
// Every personal route is scoped to req.user.id, so one user can never
// read or change another user's appearance.
// ======================================================================

const isPlainObject = (value) =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

// The organisation appearance. Default is OFF, so existing users keep
// their personal preferences and the original MIARCUS theme.
router.get("/global", authMiddleware, async (req, res) => {
    try {
        const globalTheme = await ThemePreference.getGlobal();
        return res.status(200).json({ success: true, globalTheme });
    } catch (error) {
        console.error("GET GLOBAL THEME ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load global appearance settings." });
    }
});

// Body: { enabled, allowPersonal, preferences }
//   enabled:false                      -> turn the organisation appearance off
//   enabled:true, allowPersonal:true   -> default for everyone who has not saved their own
//   enabled:true, allowPersonal:false  -> enforced for every non-admin user
// allowPersonal is optional and defaults to false, matching the original
// "Apply to All Users" behaviour for older clients.
router.put("/global", authMiddleware, adminOnly, async (req, res) => {
    if (!req.user?.is_admin) {
        return res.status(403).json({ success: false, message: "Only an administrator can apply a theme to all users." });
    }

    const body = isPlainObject(req.body) ? req.body : {};
    const preferences = isPlainObject(body.preferences) ? body.preferences : body;

    try {
        const globalTheme = await ThemePreference.saveGlobal({
            enabled: body.enabled !== false,
            allowPersonal: body.allowPersonal === true,
            preferences,
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
        const personal = await ThemePreference.getPersonal(userId);
        return res.status(200).json({
            success: true,
            preferences: personal.preferences,
            isCustom: personal.isCustom,
            updatedAt: personal.updatedAt
        });
    } catch (error) {
        console.error("GET THEME PREFERENCE ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load appearance preferences." });
    }
});

// SAVE current user's personal appearance preferences ("Save as my default").
router.put("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Authenticated user not found." });
        const body = isPlainObject(req.body) ? req.body : {};
        const source = isPlainObject(body.preferences) ? body.preferences : body;
        const preferences = await ThemePreference.saveForUser(userId, source);
        return res.status(200).json({
            success: true,
            message: "Appearance preferences saved successfully.",
            preferences,
            isCustom: true
        });
    } catch (error) {
        console.error("SAVE THEME PREFERENCE ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to save appearance preferences." });
    }
});

// RESET current user's personal appearance (removes only their own row).
router.delete("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Authenticated user not found." });
        await ThemePreference.deleteForUser(userId);
        return res.status(200).json({
            success: true,
            message: "Appearance reset to default.",
            preferences: { ...ThemePreference.DEFAULT_PREFERENCES },
            isCustom: false
        });
    } catch (error) {
        console.error("RESET THEME PREFERENCE ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to reset appearance preferences." });
    }
});

module.exports = router;
