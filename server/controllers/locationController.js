const provider = require("../services/locationProvider");
const Location = require("../models/locationModel");
const db = require("../config/db");

const dbQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const getIndiaTime = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return hour * 60 + minute;
};

const getWorkingSchedule = async () => {
    const weekday = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "short"
    }).format(new Date());
    const dayMap = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = dayMap[weekday] || 1;

    const rows = await dbQuery(`
        SELECT start_time, end_time, timezone
        FROM location_work_schedules
        WHERE employee_id IS NULL
          AND day_of_week = ?
          AND enabled = 1
        LIMIT 1
    `, [day]);

    if (!rows[0]) return null;

    return {
        start: String(rows[0].start_time).slice(0, 5),
        end: String(rows[0].end_time).slice(0, 5),
        timezone: rows[0].timezone || "Asia/Kolkata"
    };
};

const isWithinWorkingHours = async () => {
    const schedule = await getWorkingSchedule();
    if (!schedule) return false;
    const [sh, sm] = schedule.start.split(":").map(Number);
    const [eh, em] = schedule.end.split(":").map(Number);
    const current = getIndiaTime();
    return current >= sh * 60 + sm && current < eh * 60 + em;
};

const getLive = async (req, res) => {
    try {
        const { search = "", status = "" } = req.query;
        const trackingActive = await isWithinWorkingHours();
        const employees = trackingActive
            ? await provider.getCurrentLocations({ search, status })
            : [];
        const schedule = await getWorkingSchedule();

        await Location.logAccess({
            accessedBy: req.user.id,
            action: "VIEW_LIVE_LOCATIONS",
            metadata: { count: employees.length, provider: provider.providerName, trackingActive }
        });

        res.json({
            success: true,
            provider: provider.providerName,
            demo: false,
            tracking: {
                status: trackingActive ? "active" : "off-hours",
                workHours: schedule ? `${schedule.start} - ${schedule.end}` : "OFF",
                timezone: schedule?.timezone || "Asia/Kolkata"
            },
            employees,
            trackingActive
        });
    } catch (error) {
        console.error("Location live error:", error);
        res.status(500).json({ success: false, message: "Unable to load live locations" });
    }
};

const getMyStatus = async (req, res) => {
    try {
        const device = await Location.getActiveDeviceForEmployee(req.user.id);
        const schedule = await getWorkingSchedule();
        res.json({
            success: true,
            registered: Boolean(device),
            trackingActive: await isWithinWorkingHours(),
            workHours: schedule ? `${schedule.start} - ${schedule.end}` : "OFF",
            timezone: schedule?.timezone || "Asia/Kolkata",
            registeredAt: device?.registered_at || null,
            lastSeenAt: device?.last_seen_at || null
        });
    } catch (error) {
        console.error("Location status error:", error);
        res.status(500).json({ success: false, message: "Unable to check location registration." });
    }
};

const registerDevice = async (req, res) => {
    try {
        const deviceIdentifier = String(req.body?.deviceIdentifier || "").trim();
        const deviceName = String(req.body?.deviceName || "Miarcus Browser").trim();
        if (!deviceIdentifier || deviceIdentifier.length > 255) {
            return res.status(400).json({ success: false, message: "A valid device identifier is required." });
        }

        const deviceId = await Location.registerDevice({
            employeeId: req.user.id,
            deviceIdentifier,
            deviceName
        });

        await Location.logAccess({
            accessedBy: req.user.id,
            employeeId: req.user.id,
            action: "REGISTER_LOCATION_DEVICE",
            metadata: { deviceId, consent: true }
        });

        res.json({ success: true, deviceId, message: "This device is now registered for Miarcus location tracking." });
    } catch (error) {
        console.error("Location device registration error:", error);
        res.status(409).json({ success: false, message: error.message || "Unable to register this device." });
    }
};

const submitLocation = async (req, res) => {
    try {
        if (!(await isWithinWorkingHours())) {
            return res.status(403).json({
                success: false,
                trackingActive: false,
                message: "Location tracking is disabled outside company working hours."
            });
        }

        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);
        const accuracy = Number(req.body?.accuracy || 0);
        const deviceIdentifier = String(req.body?.deviceIdentifier || "").trim();

        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            return res.status(400).json({ success: false, message: "Invalid location coordinates." });
        }

        if (!deviceIdentifier) {
            return res.status(403).json({ success: false, message: "This device has not been registered for location tracking." });
        }

        const device = await Location.getDeviceForEmployee(req.user.id, deviceIdentifier);
        if (!device) {
            return res.status(403).json({ success: false, message: "This device is not registered to your Miarcus account." });
        }

        const recordId = await Location.saveRecord({
            employee_id: req.user.id,
            device_id: device.id,
            latitude,
            longitude,
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
            source: "browser-gps",
            captured_at: req.body?.capturedAt ? new Date(req.body.capturedAt) : new Date()
        });

        res.json({ success: true, recordId, trackingActive: true });
    } catch (error) {
        console.error("Location update error:", error);
        res.status(500).json({ success: false, message: "Unable to save location." });
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

        res.json({ success: true, provider: provider.providerName, demo: false, history });
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
    try {
        const schedule = await getWorkingSchedule();
        res.json({
            success: true,
            provider: provider.providerName,
            demo: false,
            workHours: schedule || { start: "09:00", end: "18:00", timezone: "Asia/Kolkata" },
            privacy: {
                trackingOutsideWorkHours: false,
                employeeNoticeRequired: true,
                oneTimeDeviceRegistration: true,
                adminOnlyLiveView: true
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to load location configuration." });
    }
};

module.exports = {
    getLive,
    getMyStatus,
    registerDevice,
    submitLocation,
    getHistory,
    getAccessLogs,
    getConfig
};
