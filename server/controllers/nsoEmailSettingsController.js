const NsoEmailSettings = require("../models/nsoEmailSettingsModel");
exports.getSettings = async (req, res) => {
    try { return res.json({ success: true, data: await NsoEmailSettings.getSettings() }); }
    catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
exports.updateSettings = async (req, res) => {
    try { return res.json({ success: true, data: await NsoEmailSettings.saveSettings(req.body || {}), message: "New Store Opening email routing saved successfully." }); }
    catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
