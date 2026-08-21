const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const controller = require("../controllers/attendanceController");

const uploadDir = path.join(__dirname, "../uploads/attendance");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext =
            path.extname(file.originalname || ".jpg").toLowerCase() ||
            ".jpg";

        cb(
            null,
            `attendance-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 9)}${ext}`
        );
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
            return cb(null, true);
        }

        cb(new Error("Only JPG, PNG or WEBP attendance photos are allowed."));
    },
});

router.use(authMiddleware);

// ------------------------------------------------------
// Employee attendance workspace
// ------------------------------------------------------
router.get("/context", controller.context);
router.post("/check-in", upload.single("photo"), controller.checkIn);
router.post("/check-out", upload.single("photo"), controller.checkOut);

// ------------------------------------------------------
// Attendance management
// Administrator or Attendance = Full
// ------------------------------------------------------
router.get(
    "/reports",
    permissionMiddleware("Attendance", "Full"),
    controller.reports
);

router.get(
    "/employees",
    permissionMiddleware("Attendance", "Full"),
    controller.employees
);

router.get(
    "/stores",
    permissionMiddleware("Attendance", "Full"),
    controller.stores
);

// IMPORTANT: delete-all must come before /:id.
router.delete(
    "/delete-all",
    permissionMiddleware("Attendance", "Full"),
    controller.deleteAll
);

router.delete(
    "/:id",
    permissionMiddleware("Attendance", "Full"),
    controller.deleteRecord
);

module.exports = router;
