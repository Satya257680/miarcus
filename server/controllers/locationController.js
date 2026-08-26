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
        const target = await Location.getMobileTarget(req.user.id);
        const userRows = await dbQuery(
            `SELECT call_contact, is_admin FROM users WHERE id = ? LIMIT 1`,
            [req.user.id]
        );
        const registeredPhone = target?.phone_number || userRows[0]?.call_contact || null;
        const isAdmin = Number(userRows[0]?.is_admin) === 1 || Boolean(req.user?.is_admin);
        const schedule = await getWorkingSchedule();
        res.json({
            success: true,
            registered: Boolean(target),
            isAdmin,
            trackingActive: await isWithinWorkingHours(),
            workHours: schedule ? `${schedule.start} - ${schedule.end}` : "OFF",
            timezone: schedule?.timezone || "Asia/Kolkata",
            provider: provider.providerName,
            phoneNumber: registeredPhone,
            simIccid: target?.sim_iccid || null
        });
    } catch (error) {
        console.error("Location status error:", error);
        res.status(500).json({ success: false, message: "Unable to check mobile location registration." });
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

const registerMobileNumber = async (req, res) => {
    try {
        const phoneNumber = String(req.body?.phoneNumber || req.body?.deviceIdentifier || "").trim();
        const simIccid = String(req.body?.simIccid || "").trim() || null;
        if (!phoneNumber || phoneNumber.length > 32) {
            return res.status(400).json({ success: false, message: "A valid mobile number is required." });
        }

        await Location.syncMobileTarget({
            employeeId: req.user.id,
            phoneNumber,
            simIccid,
            provider: provider.providerName
        });

        await Location.logAccess({
            accessedBy: req.user.id,
            employeeId: req.user.id,
            action: "REGISTER_MOBILE_LOCATION_NUMBER",
            metadata: { provider: provider.providerName, simIccidProvided: Boolean(simIccid) }
        });

        res.json({
            success: true,
            provider: provider.providerName,
            message: "Mobile number registered for carrier/mobile-network location tracking."
        });
    } catch (error) {
        console.error("Mobile location registration error:", error);
        res.status(409).json({ success: false, message: error.message || "Unable to register mobile number." });
    }
};

const submitLocation = async (req, res) => {
    return res.status(410).json({
        success: false,
        message: "Browser GPS tracking is disabled. Employee Location uses the configured mobile-network/carrier provider."
    });
};

const providerUpdate = async (req, res) => {
    try {
        const secret = String(process.env.MOBILE_LOCATION_WEBHOOK_SECRET || "");
        if (!secret || String(req.headers["x-mobile-location-secret"] || "") !== secret) {
            return res.status(401).json({ success: false, message: "Unauthorized provider callback." });
        }

        const locations = Array.isArray(req.body?.locations)
            ? req.body.locations
            : [];

        let saved = 0;
        for (const location of locations) {
            const phoneNumber = String(location.phoneNumber || location.phone || location.msisdn || "").trim();
            const targets = await Location.getMobileTargets();
            const target = targets.find((item) =>
                String(item.phone_number || item.mobile || "").replace(/[^0-9+]/g, "") === phoneNumber.replace(/[^0-9+]/g, "")
            );
            const latitude = Number(location.latitude);
            const longitude = Number(location.longitude);
            if (!target || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

            await Location.saveRecord({
                employee_id: target.employee_id,
                latitude,
                longitude,
                accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null,
                source: "mobile-network",
                captured_at: location.capturedAt ? new Date(location.capturedAt) : new Date()
            });
            saved += 1;
        }

        res.json({ success: true, saved });
    } catch (error) {
        console.error("Mobile provider callback error:", error);
        res.status(500).json({ success: false, message: "Unable to process mobile location callback." });
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
            workHours: schedule || { start: "09:00", end: "21:00", timezone: "Asia/Kolkata" },
            privacy: {
                trackingOutsideWorkHours: false,
                employeeNoticeRequired: true,
                phoneNumberOrSimRequired: true,
                carrierProviderRequired: true,
                lastKnownLocationRetainedWhenNetworkIsOffline: true,
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
    registerMobileNumber,
    submitLocation,
    providerUpdate,
    getHistory,
    isWithinWorkingHours,
    getAccessLogs,
    getConfig
};
