const fs = require("fs/promises");
const path = require("path");
const Attendance = require("../models/attendanceModel");

const isAdmin = (req) =>
    [true, 1, "1"].includes(req.user?.is_admin) ||
    [true, 1, "1"].includes(req.user?.administrator);

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const validCoords = (lat, lng) =>
    Number.isFinite(Number(lat)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number.isFinite(Number(lng)) &&
    Number(lng) >= -180 &&
    Number(lng) <= 180;

const indiaDateTime = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(new Date());

    const get = (type) =>
        parts.find((part) => part.type === type)?.value || "00";

    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
};

const canManageAttendance = async (req) => {
    if (isAdmin(req)) return true;
    return Attendance.hasFullAttendanceAccess(req.user.id);
};

const getAttendanceStore = async (userId) => {
    const administrator = await Attendance.isAdministrator(userId);
    const fullAttendanceAccess = administrator
        ? true
        : await Attendance.hasFullAttendanceAccess(userId);

    return Attendance.getAssignedAttendanceStore(
        userId,
        administrator || fullAttendanceAccess
    );
};

const context = async (req, res) => {
    try {
        const date = validDate(req.query.date)
            ? req.query.date
            : new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Asia/Kolkata",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
              }).format(new Date());

        const data = await Attendance.getContext(req.user.id, date);

        if (!data.user) {
            return res.status(404).json({
                success: false,
                message: "Employee profile not found.",
            });
        }

        res.json({
            success: true,
            ...data,
            date,
        });
    } catch (error) {
        console.error("Attendance context error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load attendance context.",
        });
    }
};

const checkIn = async (req, res) => {
    try {
        const workDate = String(req.body?.workDate || "");
        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);
        const accuracy = Number(req.body?.accuracy || 0);
        const remarks = String(req.body?.remarks || "")
            .trim()
            .slice(0, 1000);

        if (!validDate(workDate)) {
            return res.status(400).json({
                success: false,
                message: "A valid attendance date is required.",
            });
        }

        if (!validCoords(latitude, longitude)) {
            return res.status(400).json({
                success: false,
                message: "Please capture a valid GPS location.",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Automatic attendance photo capture is required.",
            });
        }

        const assignedStore = await getAttendanceStore(req.user.id);

        if (!assignedStore) {
            return res.status(400).json({
                success: false,
                message:
                    "No attendance store is assigned to this account. Please contact your administrator.",
            });
        }

        const existing = await Attendance.getRecord(
            req.user.id,
            workDate
        );

        if (existing) {
            return res.status(409).json({
                success: false,
                message: existing.check_out_at
                    ? "Attendance is already completed for today."
                    : "You are already checked in for today.",
                attendance: existing,
            });
        }

        const id = await Attendance.createCheckIn({
            employeeId: req.user.id,
            storeId: assignedStore.id,
            workDate,
            checkInAt: indiaDateTime(),
            latitude,
            longitude,
            accuracy,
            photo: `/uploads/attendance/${req.file.filename}`,
            remarks,
        });

        const attendance = await Attendance.getRecord(
            req.user.id,
            workDate
        );

        res.status(201).json({
            success: true,
            id,
            message: `Attendance checked in successfully at ${assignedStore.store_name}.`,
            attendance,
        });
    } catch (error) {
        console.error("Attendance check-in error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Attendance already exists for today.",
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to complete check-in.",
        });
    }
};

const checkOut = async (req, res) => {
    try {
        const workDate = String(req.body?.workDate || "");
        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);
        const accuracy = Number(req.body?.accuracy || 0);
        const remarks = String(req.body?.remarks || "")
            .trim()
            .slice(0, 1000);

        if (!validDate(workDate)) {
            return res.status(400).json({
                success: false,
                message: "A valid attendance date is required.",
            });
        }

        if (!validCoords(latitude, longitude)) {
            return res.status(400).json({
                success: false,
                message: "Please capture a valid GPS location before checkout.",
            });
        }

        const existing = await Attendance.getRecord(
            req.user.id,
            workDate
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "No check-in record exists for today.",
            });
        }

        if (existing.check_out_at) {
            return res.status(409).json({
                success: false,
                message: "You are already checked out.",
                attendance: existing,
            });
        }

        const attendance = await Attendance.createCheckOut({
            id: existing.id,
            employeeId: req.user.id,
            workDate,
            checkOutAt: indiaDateTime(),
            latitude,
            longitude,
            accuracy,
            photo: req.file
                ? `/uploads/attendance/${req.file.filename}`
                : null,
            remarks,
        });

        res.json({
            success: true,
            message: "Attendance checked out successfully.",
            attendance,
        });
    } catch (error) {
        console.error("Attendance check-out error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to complete checkout.",
        });
    }
};

const reports = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message:
                "Attendance Reports require administrator or Full Attendance access.",
        });
    }

    try {
        const data = await Attendance.getReport(req.query);
        res.json({ success: true, ...data });
    } catch (error) {
        console.error("Attendance report error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load attendance reports.",
        });
    }
};

const employees = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message: "Restricted to administrators or Full Attendance access.",
        });
    }

    try {
        res.json({
            success: true,
            data: await Attendance.getEmployees(),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to load employees.",
        });
    }
};

const stores = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message: "Restricted to administrators or Full Attendance access.",
        });
    }

    try {
        res.json({
            success: true,
            data: await Attendance.getStores(),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to load stores.",
        });
    }
};

const removeStoredPhoto = async (photoPath) => {
    if (!photoPath || typeof photoPath !== "string") return;
    if (!photoPath.startsWith("/uploads/attendance/")) return;

    const filePath = path.join(
        __dirname,
        "..",
        photoPath.replace(/^\/+/, "")
    );

    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.warn("Unable to remove attendance photo:", error.message);
        }
    }
};

const deleteRecord = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message: "Full Attendance access is required to delete records.",
        });
    }

    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance record.",
            });
        }

        const deleted = await Attendance.deleteRecord(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Attendance record not found.",
            });
        }

        await Promise.all([
            removeStoredPhoto(deleted.check_in_photo),
            removeStoredPhoto(deleted.check_out_photo),
        ]);

        res.json({
            success: true,
            message: "Attendance record deleted successfully.",
        });
    } catch (error) {
        console.error("Attendance delete error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to delete attendance record.",
        });
    }
};

const deleteAll = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message: "Full Attendance access is required to delete records.",
        });
    }

    try {
        const deletedPhotos = await Attendance.deleteAllRecords();

        await Promise.all(
            deletedPhotos.flatMap((row) => [
                removeStoredPhoto(row.check_in_photo),
                removeStoredPhoto(row.check_out_photo),
            ])
        );

        res.json({
            success: true,
            message: "All attendance records were deleted successfully.",
        });
    } catch (error) {
        console.error("Attendance delete-all error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to delete attendance records.",
        });
    }
};

module.exports = {
    context,
    checkIn,
    checkOut,
    reports,
    employees,
    stores,
    deleteRecord,
    deleteAll,
};
