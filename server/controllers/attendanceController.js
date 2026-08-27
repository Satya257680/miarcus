const fs = require("fs/promises");
const path = require("path");

const Attendance = require("../models/attendanceModel");
const Gallery = require("../models/galleryModel");
const { createFileAccessToken, safeRelativePath, uploadRoot } = require("../middleware/privateFileAccess");

// ======================================================
// ADMIN CHECK
// ======================================================

const isAdmin = (req) =>
    Number(req.user?.is_admin) === 1;

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

const removeUploadedAttendancePhoto = async (file) => {
    if (!file?.path) {
        return;
    }

    try {
        await fs.unlink(file.path);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.warn("Unable to remove failed attendance upload:", error.message);
        }
    }
};

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
    let attendancePersisted = false;

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

        // ------------------------------------------------
        // Only an OPEN session (checked in, not yet
        // checked out) blocks a new check-in. Once that
        // session is completed, the employee is allowed
        // to check in again the same day — this creates a
        // new session row, and every earlier session stays
        // untouched in Attendance Reports.
        // ------------------------------------------------

        if (existing && !existing.check_out_at) {
            return res.status(409).json({
                success: false,

                message:
                    "You are already checked in for today.",

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

        attendancePersisted = true;

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
        if (!attendancePersisted) {
            await removeUploadedAttendancePhoto(req.file);
        }

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
    let attendancePersisted = false;

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

        attendancePersisted = true;

        return res.json({
            success: true,

            id: attendance?.id || existing.id,

            message:
                "Attendance checked out successfully.",

            attendance
        });

    } catch (error) {
        if (!attendancePersisted) {
            await removeUploadedAttendancePhoto(req.file);
        }

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
// ATTENDANCE PHOTO ACCESS TOKEN
// ======================================================
//
// Attendance photos are stored as private uploads in production.
// A browser <img> element cannot attach the normal Authorization
// header, so the reports screen requests a short-lived, file-specific
// token before opening a photo.
// ======================================================

const photoToken = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message:
                "Attendance Reports require administrator or Full Attendance access."
        });
    }

    const requestedPath = String(
        req.query?.path || ""
    ).trim();

    const relativePath = safeRelativePath(
        requestedPath.replace(/^\/+/, "")
    );

    if (
        !relativePath ||
        !relativePath.startsWith("uploads/attendance/")
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid attendance photo path."
        });
    }

    const filePath = relativePath
        .replace(/^uploads\//, "")
        .replace(/^\/+/, "");

    try {
        // New uploads are stored under the same persistent UPLOAD_DIR used by
        // the private file service. Keep the direct-file path for these files.
        const absolutePath = require("path").resolve(
            uploadRoot,
            filePath
        );

        if (require("fs").existsSync(absolutePath)) {
            const token = createFileAccessToken(filePath);

            return res.json({
                success: true,
                token,
                path: filePath,
                mode: "private-file"
            });
        }

        // Older attendance uploads may live on the old application disk.
        // Gallery synchronization stores a database copy, so resolve the
        // report photo to that Gallery record instead of returning a broken
        // image URL.
        const attendanceRows = await require("../config/db").query(`
            SELECT id, check_in_photo, check_out_photo
            FROM attendance_records
            WHERE check_in_photo = ? OR check_out_photo = ?
            ORDER BY id DESC
            LIMIT 1
        `, [relativePath, relativePath]);

        const attendanceRow = attendanceRows[0];
        if (attendanceRow) {
            const type = attendanceRow.check_out_photo === relativePath
                ? "check-out-photo"
                : "check-in-photo";

            let galleryRows = await require("../config/db").query(`
                SELECT id
                FROM gallery_photos
                WHERE source_module = 'Attendance'
                  AND source_record_id = ?
                  AND source_field = ?
                  AND status = 'active'
                ORDER BY uploaded_at DESC
                LIMIT 1
            `, [attendanceRow.id, type]);

            // Existing Gallery records created before source_field was split
            // into check-in/check-out can still be used. For those records,
            // the first upload is check-in and the last upload is check-out.
            if (!galleryRows.length) {
                galleryRows = await require("../config/db").query(`
                    SELECT id
                    FROM gallery_photos
                    WHERE source_module = 'Attendance'
                      AND source_record_id = ?
                      AND status = 'active'
                    ORDER BY uploaded_at ${type === "check-in-photo" ? "ASC" : "DESC"}
                    LIMIT 1
                `, [attendanceRow.id]);
            }

            if (galleryRows[0]?.id) {
                return res.json({
                    success: true,
                    mode: "attendance-gallery",
                    galleryId: Number(galleryRows[0].id),
                    attendanceId: Number(attendanceRow.id),
                    photoType: type === "check-in-photo" ? "check-in" : "check-out"
                });
            }
        }

        return res.status(404).json({
            success: false,
            message: "Attendance photo not found."
        });
    } catch (error) {
        console.error(
            "Attendance photo token error:",
            error
        );

        return res.status(400).json({
            success: false,
            message: "Unable to authorize attendance photo."
        });
    }
};

// ======================================================
// ATTENDANCE PHOTO STREAM
// ======================================================
//
// Used by Attendance Reports for older photos whose original upload was
// stored on the old application disk. The synchronized Gallery copy is
// stored in MySQL, but this endpoint intentionally uses Attendance
// permissions rather than Gallery permissions.
// ======================================================

const getAttendancePhotoRecord = async (id, type) => {
    const column = type === "check-in" ? "check_in_photo" : "check_out_photo";
    const sourceField = type === "check-in" ? "check-in-photo" : "check-out-photo";

    const rows = await require("../config/db").query(`
        SELECT id, ${column} AS photo_path
        FROM attendance_records
        WHERE id = ?
        LIMIT 1
    `, [id]);

    const attendance = rows[0];
    if (!attendance?.photo_path) return null;

    // Prefer the exact source field. This is the normal path for new records.
    let galleryRows = await require("../config/db").query(`
        SELECT id, file_name, file_path, mime_type, file_size, file_data, uploaded_by
        FROM gallery_photos
        WHERE source_module = 'Attendance'
          AND source_record_id = ?
          AND source_field = ?
          AND status = 'active'
        ORDER BY uploaded_at DESC, id DESC
        LIMIT 1
    `, [id, sourceField]);

    // Compatibility with older synchronized attendance records that did not
    // have source_field populated correctly. Pick the first/last attachment
    // for the session according to the requested photo type.
    if (!galleryRows.length) {
        galleryRows = await require("../config/db").query(`
            SELECT id, file_name, file_path, mime_type, file_size, file_data, uploaded_by
            FROM gallery_photos
            WHERE source_module = 'Attendance'
              AND source_record_id = ?
              AND status = 'active'
            ORDER BY uploaded_at ${type === "check-in" ? "ASC" : "DESC"}, id ${type === "check-in" ? "ASC" : "DESC"}
            LIMIT 1
        `, [id]);
    }

    // Final compatibility fallback: some very early Gallery syncs could have
    // lost source_record_id. The attendance filename is unique, so compare it
    // against the Gallery file name/path before giving up.
    if (!galleryRows.length) {
        const normalizedPath = String(attendance.photo_path || "").replace(/\\/g, "/");
        const baseName = path.basename(normalizedPath);
        galleryRows = await require("../config/db").query(`
            SELECT id, file_name, file_path, mime_type, file_size, file_data, uploaded_by
            FROM gallery_photos
            WHERE source_module = 'Attendance'
              AND status = 'active'
              AND (
                    file_name = ?
                    OR file_path LIKE ?
                  )
            ORDER BY uploaded_at DESC, id DESC
            LIMIT 1
        `, [baseName, `%${baseName}`]);
    }

    const gallery = galleryRows[0];
    if (!gallery) return null;

    return { attendance, gallery };
};

const loadAttendancePhotoBuffer = async (record) => {
    let buffer = record.gallery.file_data;

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        const diskPath = path.resolve(process.cwd(), String(record.gallery.file_path || ""));
        const fsSync = require("fs");

        if (!fsSync.existsSync(diskPath)) return null;

        buffer = fsSync.readFileSync(diskPath);
        await Gallery.saveFileData(Number(record.gallery.id), buffer);
    }

    return buffer;
};

// ======================================================
// ATTENDANCE PHOTO STREAM / DOWNLOAD / DELETE
// ======================================================

const serveAttendancePhoto = async (req, res, download = false) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message: "Attendance Reports require administrator or Full Attendance access."
        });
    }

    const id = Number(req.params.id);
    const type = String(req.params.type || "").trim();

    if (!Number.isInteger(id) || id <= 0 || !["check-in", "check-out"].includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid attendance photo request." });
    }

    try {
        const record = await getAttendancePhotoRecord(id, type);
        if (!record) {
            return res.status(404).json({ success: false, message: "Attendance photo not found." });
        }

        const buffer = await loadAttendancePhotoBuffer(record);
        if (!buffer) {
            return res.status(404).json({ success: false, message: "Attendance photo file not found." });
        }

        const fileName = record.gallery.file_name || `attendance-${id}-${type}.jpg`;
        res.setHeader("Content-Type", record.gallery.mime_type || "image/jpeg");
        res.setHeader("Content-Length", String(buffer.length));
        res.setHeader(
            "Content-Disposition",
            `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`
        );
        res.setHeader("Cache-Control", "private, no-store, max-age=0");
        return res.end(buffer);
    } catch (error) {
        console.error("Attendance photo stream error:", error);
        return res.status(500).json({ success: false, message: "Unable to load attendance photo." });
    }
};

const downloadAttendancePhoto = (req, res) => serveAttendancePhoto(req, res, true);

const deleteAttendancePhoto = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({
            success: false,
            message: "Attendance Reports require administrator or Full Attendance access."
        });
    }

    const id = Number(req.params.id);
    const type = String(req.params.type || "").trim();

    if (!Number.isInteger(id) || id <= 0 || !["check-in", "check-out"].includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid attendance photo request." });
    }

    try {
        const record = await getAttendancePhotoRecord(id, type);
        if (!record) {
            return res.status(404).json({ success: false, message: "Attendance photo not found." });
        }

        const db = require("../config/db");
        const column = type === "check-in" ? "check_in_photo" : "check_out_photo";

        await db.query(`
            UPDATE attendance_records
            SET ${column} = NULL
            WHERE id = ?
            LIMIT 1
        `, [id]);

        await Gallery.softDelete(Number(record.gallery.id));

        return res.json({
            success: true,
            message: `${type === "check-in" ? "Check-in" : "Check-out"} photo deleted successfully.`,
            id,
            type
        });
    } catch (error) {
        console.error("Attendance photo delete error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete attendance photo." });
    }
};

const photoDetails = async (req, res) => {
    if (!(await canManageAttendance(req))) {
        return res.status(403).json({ success: false, message: "Attendance Reports require administrator or Full Attendance access." });
    }

    const id = Number(req.params.id);
    const type = String(req.params.type || "").trim();
    if (!Number.isInteger(id) || id <= 0 || !["check-in", "check-out"].includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid attendance photo request." });
    }

    try {
        const record = await getAttendancePhotoRecord(id, type);
        if (!record) return res.status(404).json({ success: false, message: "Attendance photo not found." });

        const rows = await require("../config/db").query(`
            SELECT
                a.id,
                a.employee_id,
                DATE_FORMAT(a.work_date, '%Y-%m-%d') AS work_date,
                a.status,
                DATE_FORMAT(a.check_in_at, '%Y-%m-%d %H:%i:%s') AS check_in_at,
                DATE_FORMAT(a.check_out_at, '%Y-%m-%d %H:%i:%s') AS check_out_at,
                ${type === "check-in" ? "a.check_in_latitude" : "a.check_out_latitude"} AS latitude,
                ${type === "check-in" ? "a.check_in_longitude" : "a.check_out_longitude"} AS longitude,
                ${type === "check-in" ? "a.check_in_accuracy" : "a.check_out_accuracy"} AS accuracy,
                u.name,
                u.employee_id AS employee_code,
                u.email,
                s.store_name,
                s.store_code
            FROM attendance_records a
            INNER JOIN users u ON u.id = a.employee_id
            LEFT JOIN stores s ON s.id = a.store_id
            WHERE a.id = ?
            LIMIT 1
        `, [id]);

        const row = rows[0];
        if (!row) return res.status(404).json({ success: false, message: "Attendance record not found." });

        return res.json({
            success: true,
            photo: {
                id,
                type,
                fileName: record.gallery.file_name || `attendance-${id}-${type}.jpg`,
                mimeType: record.gallery.mime_type || "image/jpeg",
                name: row.name || "Employee",
                employeeCode: row.employee_code || "",
                email: row.email || "",
                storeName: row.store_name || "Head Office",
                storeCode: row.store_code || "",
                workDate: row.work_date,
                timestamp: type === "check-in" ? row.check_in_at : row.check_out_at,
                status: row.status || "Present",
                latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
                longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
                accuracy: row.accuracy !== null && row.accuracy !== undefined ? Number(row.accuracy) : null
            }
        });
    } catch (error) {
        console.error("Attendance photo details error:", error);
        return res.status(500).json({ success: false, message: "Unable to load attendance photo details." });
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
    photoToken,
    serveAttendancePhoto,
    downloadAttendancePhoto,
    deleteAttendancePhoto,
    photoDetails,
    employees,
    stores,
    deleteRecord,
    deleteAll
};