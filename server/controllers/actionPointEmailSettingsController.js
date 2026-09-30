const ActionPointEmailSettings = require("../models/actionPointEmailSettingsModel");

exports.getSettings = async (req, res) => {
    try {
        return res.json({ success: true, data: await ActionPointEmailSettings.getSettings() });
    } catch (error) {
        console.error("GET ACTION POINT EMAIL SETTINGS ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load Action Point email settings.", error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        return res.json({
            success: true,
            data: await ActionPointEmailSettings.saveSettings(req.body || {}),
            message: "Action Point email routing saved successfully."
        });
    } catch (error) {
        console.error("UPDATE ACTION POINT EMAIL SETTINGS ERROR:", error);
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: "Unable to save Action Point email settings.", error: error.message });
    }
};
