const TravelPlanEmailSettings = require("../models/travelPlanEmailSettingsModel");
const TravelPlanEmail = require("../services/travelPlanEmailService");

exports.getSettings = async (req, res) => {
    try {
        return res.json({ success: true, data: await TravelPlanEmailSettings.getSettings() });
    } catch (error) {
        console.error("GET TRAVEL PLAN EMAIL SETTINGS ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load Travel Plan email settings." });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const data = await TravelPlanEmailSettings.saveSettings(req.body || {}, Number(req.user?.id || 0) || null);
        return res.json({ success: true, data, message: "Travel Plan email routing saved successfully." });
    } catch (error) {
        console.error("UPDATE TRAVEL PLAN EMAIL SETTINGS ERROR:", error);
        if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
        return res.status(500).json({ success: false, message: "Unable to save Travel Plan email settings." });
    }
};

exports.sendTest = async (req, res) => {
    try {
        const result = await TravelPlanEmail.sendTest();
        return res.json({ success: true, message: `Test email sent to ${result.sent} contact(s).` });
    } catch (error) {
        console.error("TRAVEL PLAN TEST EMAIL ERROR:", error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to send the test email." });
    }
};
