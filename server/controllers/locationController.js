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
        const userRows = await dbQuery(
            `SELECT call_contact, is_admin FROM users WHERE id = ? LIMIT 1`,
            [req.user.id]
        );
        const isAdmin = Number(userRows[0]?.is_admin) === 1 || Boolean(req.user?.is_admin);
        const schedule = await getWorkingSchedule();
        res.json({
            success: true,
            // Consent is complete once this employee has an active website
            // (browser) registration. The prompt is not shown again after that.
            registered: Boolean(device),
            isAdmin,
            trackingActive: await isWithinWorkingHours(),
            workHours: schedule ? `${schedule.start} - ${schedule.end}` : "OFF",
            timezone: schedule?.timezone || "Asia/Kolkata",
            provider: "website"
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

// ------------------------------------------------------
// RETRY DE-DUPLICATION for website location updates
// ------------------------------------------------------
// The browser re-sends an update once when the connection drops before
// the answer arrives (ERR_HTTP2_PROTOCOL_ERROR / ERR_CONNECTION_RESET).
// The first attempt may already have been saved, so each reading carries
// a clientRequestId; a repeat of the same id from the same user within
// 10 minutes is acknowledged without inserting a second row.
// Bounded in-memory map (single Node process behind IIS).
const RECENT_LOCATION_TTL_MS = 10 * 60 * 1000;
const RECENT_LOCATION_MAX = 20000;
const recentLocationRequests = new Map(); // `${userId}:${id}` -> expiresAt

const locationRequestKey = (userId, rawId) => {
    const id = String(rawId || "").trim();
    if (!id || id.length > 64 || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
    return `${Number(userId)}:${id}`;
};

const seenLocationRequest = (key) => {
    if (!key) return false;
    const now = Date.now();
    const expiresAt = recentLocationRequests.get(key);
    if (expiresAt && expiresAt > now) return true;
    if (expiresAt) recentLocationRequests.delete(key);
    return false;
};

const rememberLocationRequest = (key) => {
    if (!key) return;
    const now = Date.now();
    recentLocationRequests.set(key, now + RECENT_LOCATION_TTL_MS);
    if (recentLocationRequests.size > RECENT_LOCATION_MAX) {
        for (const [k, exp] of recentLocationRequests) {
            if (exp <= now || recentLocationRequests.size > RECENT_LOCATION_MAX) {
                recentLocationRequests.delete(k);
            } else {
                break;
            }
        }
    }
};

const submitLocation = async (req, res) => {
    let reservedKey = null;
    try {
        const requestKey = locationRequestKey(req.user?.id, req.body?.clientRequestId);
        if (seenLocationRequest(requestKey)) {
            return res.json({ success: true, duplicate: true });
        }

        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({ success: false, message: "Valid latitude and longitude are required." });
        }

        // Reserve the id before saving, so a retry that arrives while the
        // first attempt is still writing is not saved twice.
        rememberLocationRequest(requestKey);
        reservedKey = requestKey;

        const accuracy = Number.isFinite(Number(req.body?.accuracy)) ? Number(req.body.accuracy) : null;
        const deviceIdentifier = String(req.body?.deviceIdentifier || "").trim();

        let deviceId = null;
        if (deviceIdentifier) {
            const device = await Location.getDeviceForEmployee(req.user.id, deviceIdentifier);
            deviceId = device?.id || null;
        }

        await Location.saveRecord({
            employee_id: req.user.id,
            device_id: deviceId,
            latitude,
            longitude,
            accuracy,
            source: "website",
            captured_at: new Date()
        });

        res.json({ success: true });
    } catch (error) {
        // Not saved -> release the id so the next attempt can save it.
        if (reservedKey) recentLocationRequests.delete(reservedKey);
        console.error("Website location update error:", error);
        res.status(500).json({ success: false, message: "Unable to record location." });
    }
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
