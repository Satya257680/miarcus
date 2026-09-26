const ChecklistEmailSettings = require("../models/checklistEmailSettingsModel");

exports.getSettings = async (req, res) => {
    try {
        return res.json({ success: true, data: await ChecklistEmailSettings.getSettings() });
    } catch (error) {
        console.error("GET CHECKLIST EMAIL SETTINGS ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load Checklist email settings.", error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        return res.json({
            success: true,
            data: await ChecklistEmailSettings.saveSettings(req.body || {}),
            message: "Checklist email routing saved successfully."
        });
    } catch (error) {
        console.error("UPDATE CHECKLIST EMAIL SETTINGS ERROR:", error);
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: "Unable to save Checklist email settings.", error: error.message });
    }
};
