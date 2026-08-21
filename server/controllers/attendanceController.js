const Attendance = require("../models/attendanceModel");

const isAdmin = (req) => [true, 1, "1"].includes(req.user?.is_admin) || [true, 1, "1"].includes(req.user?.administrator);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const validCoords = (lat, lng) => Number.isFinite(Number(lat)) && Number(lat) >= -90 && Number(lat) <= 90 && Number.isFinite(Number(lng)) && Number(lng) >= -180 && Number(lng) <= 180;

const indiaDateTime = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).formatToParts(new Date());
    const get = (type) => parts.find(p => p.type === type)?.value || "00";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
};

const context = async (req, res) => {
    try {
        const date = validDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
        const data = await Attendance.getContext(req.user.id, date);
        if (!data.user) return res.status(404).json({ success: false, message: "Employee profile not found." });
        res.json({ success: true, ...data, date });
    } catch (error) {
        console.error("Attendance context error:", error);
        res.status(500).json({ success: false, message: "Unable to load attendance context." });
    }
};

const checkIn = async (req, res) => {
    try {
        const workDate = String(req.body?.workDate || "");
        const storeId = Number(req.body?.storeId);
        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);
        const accuracy = Number(req.body?.accuracy || 0);
        const remarks = String(req.body?.remarks || "").trim().slice(0, 1000);

        if (!validDate(workDate)) return res.status(400).json({ success: false, message: "A valid attendance date is required." });
        if (!Number.isInteger(storeId) || storeId <= 0) return res.status(400).json({ success: false, message: "Please select your assigned store." });
        if (!validCoords(latitude, longitude)) return res.status(400).json({ success: false, message: "Please capture a valid GPS location." });
        if (!req.file) return res.status(400).json({ success: false, message: "Please capture your attendance photo." });

        const existing = await Attendance.getRecord(req.user.id, workDate);
        if (existing) return res.status(409).json({ success: false, message: existing.check_out_at ? "Attendance is already completed for today." : "You are already checked in for today.", attendance: existing });

        const id = await Attendance.createCheckIn({
            employeeId: req.user.id,
            storeId,
            workDate,
            checkInAt: indiaDateTime(),
            latitude,
            longitude,
            accuracy,
            photo: `/uploads/attendance/${req.file.filename}`,
            remarks
        });
        const attendance = await Attendance.getRecord(req.user.id, workDate);
        res.status(201).json({ success: true, id, message: "Attendance checked in successfully.", attendance });
    } catch (error) {
        console.error("Attendance check-in error:", error);
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Attendance already exists for today." });
        res.status(500).json({ success: false, message: "Unable to complete check-in." });
    }
};

const checkOut = async (req, res) => {
    try {
        const workDate = String(req.body?.workDate || "");
        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);
        const accuracy = Number(req.body?.accuracy || 0);
        const remarks = String(req.body?.remarks || "").trim().slice(0, 1000);
        if (!validDate(workDate)) return res.status(400).json({ success: false, message: "A valid attendance date is required." });
        if (!validCoords(latitude, longitude)) return res.status(400).json({ success: false, message: "Please capture a valid GPS location before checkout." });

        const existing = await Attendance.getRecord(req.user.id, workDate);
        if (!existing) return res.status(404).json({ success: false, message: "No check-in record exists for today." });
        if (existing.check_out_at) return res.status(409).json({ success: false, message: "You are already checked out.", attendance: existing });

        const attendance = await Attendance.createCheckOut({
            id: existing.id,
            employeeId: req.user.id,
            workDate,
            checkOutAt: indiaDateTime(),
            latitude,
            longitude,
            accuracy,
            photo: req.file ? `/uploads/attendance/${req.file.filename}` : null,
            remarks
        });
        res.json({ success: true, message: "Attendance checked out successfully.", attendance });
    } catch (error) {
        console.error("Attendance check-out error:", error);
        res.status(500).json({ success: false, message: "Unable to complete checkout." });
    }
};

const reports = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Attendance Reports are restricted to administrators." });
    try {
        const data = await Attendance.getReport(req.query);
        res.json({ success: true, ...data });
    } catch (error) {
        console.error("Attendance report error:", error);
        res.status(500).json({ success: false, message: "Unable to load attendance reports." });
    }
};

const employees = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Restricted to administrators." });
    try { res.json({ success: true, data: await Attendance.getEmployees() }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load employees." }); }
};

const stores = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Restricted to administrators." });
    try { res.json({ success: true, data: await Attendance.getStores() }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load stores." }); }
};

module.exports = { context, checkIn, checkOut, reports, employees, stores };
