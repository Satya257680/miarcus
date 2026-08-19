const provider = require("../services/locationProvider");
const Location = require("../models/locationModel");

const isWithinWorkingHours = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    const total = hour * 60 + minute;

    return total >= 9 * 60 && total < 18 * 60;
};

const getLive = async (req, res) => {
    try {
        const { search = "", status = "" } = req.query;
        const trackingActive = isWithinWorkingHours();
        const employees = trackingActive
            ? await provider.getCurrentLocations({ search, status })
            : [];

        // The demo provider intentionally does not write fake coordinates into
        // production location history. A real provider adapter can persist
        // authorized coordinates through Location.saveRecord().
        if (provider.providerName !== "mock") {
            for (const employee of employees) {
                await Location.saveRecord({
                    employee_id: employee.employee_id,
                    latitude: employee.latitude,
                    longitude: employee.longitude,
                    accuracy: employee.accuracy,
                    source: provider.providerName,
                    captured_at: new Date()
                });
            }
        }

        await Location.logAccess({
            accessedBy: req.user.id,
            action: "VIEW_LIVE_LOCATIONS",
            metadata: { count: employees.length, provider: provider.providerName }
        });

        res.json({
            success: true,
            provider: provider.providerName,
            demo: true,
            tracking: {
                status: trackingActive ? "active" : "off-hours",
                workHours: "09:00 AM - 06:00 PM",
                timezone: "Asia/Kolkata"
            },
            employees,
            trackingActive
        });
    } catch (error) {
        console.error("Location live error:", error);
        res.status(500).json({ success: false, message: "Unable to load live locations" });
    }
};

const getHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const history = await provider.getHistory(employeeId, date);

        await Location.logAccess({
            accessedBy: req.user.id,
            employeeId,
            action: "VIEW_LOCATION_HISTORY",
            metadata: { date, provider: provider.providerName }
        });

        res.json({ success: true, provider: provider.providerName, demo: true, history });
    } catch (error) {
        console.error("Location history error:", error);
        res.status(500).json({ success: false, message: "Unable to load location history" });
    }
};

const getAccessLogs = async (req, res) => {
    try {
        const logs = await Location.getAccessLogs({ limit: req.query.limit });
        res.json({ success: true, logs });
    } catch (error) {
        console.error("Location access logs error:", error);
        res.status(500).json({ success: false, message: "Unable to load access logs" });
    }
};

const getConfig = async (req, res) => {
    res.json({
        success: true,
        provider: provider.providerName,
        demo: true,
        workHours: {
            start: "09:00",
            end: "18:00",
            timezone: "Asia/Kolkata"
        },
        privacy: {
            trackingOutsideWorkHours: false,
            employeeNoticeRequired: true
        }
    });
};

module.exports = {
    getLive,
    getHistory,
    getAccessLogs,
    getConfig
};
