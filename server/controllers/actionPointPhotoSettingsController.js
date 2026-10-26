const ActionPointPhotoSettings = require("../models/actionPointPhotoSettingsModel");

// GET /api/action-point-photo-settings
// Any user who can view Action Points may READ the rule (the Take
// Action form needs it to show "Photo *" vs "Photo (optional)").
exports.getSettings = async (_req, res) => {
    try {
        return res.json({ success: true, data: await ActionPointPhotoSettings.getSettings() });
    } catch (error) {
        console.error("ACTION POINT PHOTO SETTINGS GET ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load the photo rule." });
    }
};

// PUT /api/action-point-photo-settings
// Administrator only (enforced by middleware/adminOnly in the route).
// Users with "Full" Action Points permission can NOT change this.
exports.updateSettings = async (req, res) => {
    try {
        const data = await ActionPointPhotoSettings.saveSettings(req.body || {}, req.user?.id);
        return res.json({
            success: true,
            message: data.photo_mandatory
                ? "Photo is now mandatory in Take Action."
                : "Photo is now optional in Take Action.",
            data
        });
    } catch (error) {
        console.error("ACTION POINT PHOTO SETTINGS SAVE ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to save the photo rule."
        });
    }
};
