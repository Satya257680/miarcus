const fs = require("fs/promises");
const path = require("path");

const Attendance = require("../models/attendanceModel");

// ======================================================
// ADMIN CHECK
// ======================================================

const isAdmin = (req) =>
    [true, 1, "1"].includes(req.user?.is_admin) ||
    [true, 1, "1"].includes(req.user?.administrator);

// ======================================================
// DATE VALIDATION
// ======================================================

const validDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

// ======================================================
// GPS VALIDATION
// ======================================================

const validCoords = (lat, lng) =>
    Number.isFinite(Number(lat)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number.isFinite(Number(lng)) &&
    Number(lng) >= -180 &&
    Number(lng) <= 180;

// ======================================================
// INDIA DATE
// ======================================================
// IMPORTANT:
//
// Never use:
//     new Date() -> server timezone
//
// Vercel / Render / cloud servers commonly use UTC.
//
// Attendance is based on India Standard Time.
//
// This function returns ONLY the current India date.
// The exact attendance timestamp itself is generated
// inside attendanceModel.js.
// ======================================================

const indiaDate = () => {
    const now = new Date();

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(now);
};

// ======================================================
// ATTENDANCE MANAGEMENT PERMISSION
// ======================================================

const canManageAttendance = async (req) => {
    if (isAdmin(req)) {
        return true;
    }

    return Attendance.hasFullAttendanceAccess(
        req.user.id
    );
};

// ======================================================
// GET ATTENDANCE STORE
// ======================================================
// Normal employee:
//     -> assigned store from user_stores
//
// Admin:
//     -> Head Office MRC
//
// Full Attendance permission:
//     -> Head Office MRC
// ======================================================

const getAttendanceStore = async (userId) => {
    const administrator =
        await Attendance.isAdministrator(userId);

    const fullAttendanceAccess = administrator
        ? true
        : await Attendance.hasFullAttendanceAccess(
            userId
        );

    return Attendance.getAssignedAttendanceStore(
        userId,
        administrator || fullAttendanceAccess
    );
};

// ======================================================
// ATTENDANCE CONTEXT
// ======================================================

const context = async (req, res) => {
    try {
        // ----------------------------------------------
        // Always default to today's India date.
        // ----------------------------------------------

        const requestedDate =
            String(req.query.date || "");

        const date =
            validDate(requestedDate)
                ? requestedDate
                : indiaDate();

        const data =
            await Attendance.getContext(
                req.user.id,
                date
            );

        if (!data.user) {
            return res.status(404).json({
                success: false,
                message:
                    "Employee profile not found."
            });
        }

        return res.json({
            success: true,
            ...data,
            date
        });

    } catch (error) {
        console.error(
            "Attendance context error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load attendance context."
        });
    }
};

// ======================================================
// CHECK-IN
// ======================================================
// Automatic:
//
// 1. Backend determines today's India date
// 2. GPS comes from browser
// 3. Photo comes from automatic camera capture
// 4. Store comes from employee assignment
// 5. Actual timestamp comes from attendanceModel
//
// Frontend cannot control attendance time.
// ======================================================

const checkIn = async (req, res) => {
    try {
        // ------------------------------------------------
        // ALWAYS USE SERVER'S INDIA DATE
        // ------------------------------------------------

        const workDate = indiaDate();

        const latitude =
            Number(req.body?.latitude);

        const longitude =
            Number(req.body?.longitude);

        const accuracy =
            Number(req.body?.accuracy || 0);

        const remarks =
            String(req.body?.remarks || "")
                .trim()
                .slice(0, 1000);

        // ------------------------------------------------
        // GPS
        // ------------------------------------------------

        if (
            !validCoords(
                latitude,
                longitude
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please capture a valid GPS location."
            });
        }

        // ------------------------------------------------
        // AUTOMATIC PHOTO
        // ------------------------------------------------

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "Automatic attendance photo capture is required."
            });
        }

        // ------------------------------------------------
        // ASSIGNED STORE
        // ------------------------------------------------

        const assignedStore =
            await getAttendanceStore(
                req.user.id
            );

        if (!assignedStore) {
            return res.status(400).json({
                success: false,
                message:
                    "No attendance store is assigned to this account. Please contact your administrator."
            });
        }

        // ------------------------------------------------
        // CHECK EXISTING RECORD
        // ------------------------------------------------

        const existing =
            await Attendance.getRecord(
                req.user.id,
                workDate
            );

        if (existing) {
            return res.status(409).json({
                success: false,

                message:
                    existing.check_out_at
                        ? "Attendance is already completed for today."
                        : "You are already checked in for today.",

                attendance: existing
            });
        }

        // ------------------------------------------------
        // CREATE CHECK-IN
        // ------------------------------------------------
        // DO NOT PASS checkInAt.
        //
        // attendanceModel.js now generates the exact
        // current India timestamp.
        // ------------------------------------------------

        const id =
            await Attendance.createCheckIn({
                employeeId:
                    req.user.id,

                storeId:
                    assignedStore.id,

                workDate,

                latitude,
                longitude,
                accuracy,

                photo:
                    `/uploads/attendance/${req.file.filename}`,

                remarks
            });

        // ------------------------------------------------
        // GET SAVED RECORD
        // ------------------------------------------------

        const attendance =
            await Attendance.getRecord(
                req.user.id,
                workDate
            );

        return res.status(201).json({
            success: true,

            id,

            message:
                `Attendance checked in successfully at ${assignedStore.store_name}.`,

            attendance
        });

    } catch (error) {
        console.error(
            "Attendance check-in error:",
            error
        );

        // ------------------------------------------------
        // DUPLICATE ATTENDANCE
        // ------------------------------------------------

        if (
            error.code ===
            "ER_DUP_ENTRY"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Attendance already exists for today."
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to complete check-in."
        });
    }
};

// ======================================================
// CHECK-OUT
// ======================================================
// Actual checkout timestamp is generated by the model.
//
// Frontend does NOT send the checkout time.
// ======================================================

const checkOut = async (req, res) => {
    try {
        // ------------------------------------------------
        // ALWAYS USE SERVER'S INDIA DATE
        // ------------------------------------------------

        const workDate = indiaDate();

        const latitude =
            Number(req.body?.latitude);

        const longitude =
            Number(req.body?.longitude);

        const accuracy =
            Number(req.body?.accuracy || 0);

        const remarks =
            String(req.body?.remarks || "")
                .trim()
                .slice(0, 1000);

        // ------------------------------------------------
        // GPS
        // ------------------------------------------------

        if (
            !validCoords(
                latitude,
                longitude
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please capture a valid GPS location before checkout."
            });
        }

        // ------------------------------------------------
        // AUTOMATIC PHOTO
        // ------------------------------------------------

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "Automatic checkout photo capture is required."
            });
        }

        // ------------------------------------------------
        // GET TODAY'S ATTENDANCE
        // ------------------------------------------------

        const existing =
            await Attendance.getRecord(
                req.user.id,
                workDate
            );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message:
                    "No check-in record exists for today."
            });
        }

        // ------------------------------------------------
        // ALREADY CHECKED OUT
        // ------------------------------------------------

        if (existing.check_out_at) {
            return res.status(409).json({
                success: false,
                message:
                    "You are already checked out.",
                attendance: existing
            });
        }

        // ------------------------------------------------
        // CREATE CHECK-OUT
        // ------------------------------------------------
        // Do NOT send checkOutAt.
        //
        // attendanceModel.js generates the exact
        // current India timestamp.
        // ------------------------------------------------

        const attendance =
            await Attendance.createCheckOut({
                id:
                    existing.id,

                employeeId:
                    req.user.id,

                workDate,

                latitude,
                longitude,
                accuracy,

                photo:
                    `/uploads/attendance/${req.file.filename}`,

                remarks
            });

        return res.json({
            success: true,

            message:
                "Attendance checked out successfully.",

            attendance
        });

    } catch (error) {
        console.error(
            "Attendance check-out error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to complete checkout."
        });
    }
};

// ======================================================
// ATTENDANCE REPORTS
// ======================================================
// Restricted to:
// - Administrator
// - Full Attendance permission
// ======================================================

const reports = async (req, res) => {
    if (
        !(await canManageAttendance(req))
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Attendance Reports require administrator or Full Attendance access."
        });
    }

    try {
        const data =
            await Attendance.getReport(
                req.query
            );

        return res.json({
            success: true,
            ...data
        });

    } catch (error) {
        console.error(
            "Attendance report error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load attendance reports."
        });
    }
};

// ======================================================
// EMPLOYEES
// ======================================================

const employees = async (req, res) => {
    if (
        !(await canManageAttendance(req))
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Restricted to administrators or Full Attendance access."
        });
    }

    try {
        const data =
            await Attendance.getEmployees();

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(
            "Attendance employees error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load employees."
        });
    }
};

// ======================================================
// STORES
// ======================================================

const stores = async (req, res) => {
    if (
        !(await canManageAttendance(req))
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Restricted to administrators or Full Attendance access."
        });
    }

    try {
        const data =
            await Attendance.getStores();

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(
            "Attendance stores error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load stores."
        });
    }
};

// ======================================================
// REMOVE STORED PHOTO
// ======================================================

const removeStoredPhoto = async (
    photoPath
) => {
    if (
        !photoPath ||
        typeof photoPath !== "string"
    ) {
        return;
    }

    // Security:
    // Only remove attendance-uploaded photos.
    if (
        !photoPath.startsWith(
            "/uploads/attendance/"
        )
    ) {
        return;
    }

    const filePath = path.join(
        __dirname,
        "..",
        photoPath.replace(
            /^\/+/,
            ""
        )
    );

    try {
        await fs.unlink(
            filePath
        );
    } catch (error) {
        if (
            error.code !==
            "ENOENT"
        ) {
            console.warn(
                "Unable to remove attendance photo:",
                error.message
            );
        }
    }
};

// ======================================================
// DELETE SINGLE RECORD
// ======================================================

const deleteRecord = async (
    req,
    res
) => {
    if (
        !(await canManageAttendance(req))
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Full Attendance access is required to delete records."
        });
    }

    try {
        const id =
            Number(req.params.id);

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid attendance record."
            });
        }

        const deleted =
            await Attendance.deleteRecord(
                id
            );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message:
                    "Attendance record not found."
            });
        }

        // Remove both attendance photos
        // from storage.
        await Promise.all([
            removeStoredPhoto(
                deleted.check_in_photo
            ),
            removeStoredPhoto(
                deleted.check_out_photo
            )
        ]);

        return res.json({
            success: true,
            message:
                "Attendance record deleted successfully."
        });

    } catch (error) {
        console.error(
            "Attendance delete error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete attendance record."
        });
    }
};

// ======================================================
// DELETE ALL RECORDS
// ======================================================

const deleteAll = async (
    req,
    res
) => {
    if (
        !(await canManageAttendance(req))
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Full Attendance access is required to delete records."
        });
    }

    try {
        const deletedPhotos =
            await Attendance.deleteAllRecords();

        await Promise.all(
            deletedPhotos.flatMap(
                (row) => [
                    removeStoredPhoto(
                        row.check_in_photo
                    ),

                    removeStoredPhoto(
                        row.check_out_photo
                    )
                ]
            )
        );

        return res.json({
            success: true,
            message:
                "All attendance records were deleted successfully."
        });

    } catch (error) {
        console.error(
            "Attendance delete-all error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete attendance records."
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    context,
    checkIn,
    checkOut,
    reports,
    employees,
    stores,
    deleteRecord,
    deleteAll
};