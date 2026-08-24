const express = require("express");
const bcrypt = require("bcrypt");
const { validatePassword, BCRYPT_ROUNDS } = require("../config/security");
const { incrementTokenVersion } = require("../models/securityModel");
const multer = require("multer");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// ======================================================
// PROFILE PHOTO UPLOAD
// ======================================================
//
// IMPORTANT:
//
// Do NOT store the profile photo only on Render's filesystem.
//
// Render filesystem storage is not suitable as permanent
// application data.
//
// We therefore use memoryStorage() and save the compressed
// image directly into users.profile_photo.
//
// ======================================================

const profileUpload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024,
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Only JPG, PNG, WEBP and GIF profile photos are allowed."
                )
            );
        }

        cb(null, true);
    },
});

// ======================================================
// HELPER
// ======================================================

const normalizeUser = (user, stores = []) => {
    if (!user) {
        return null;
    }

    return {
        id: user.id,

        employee_id:
            user.employee_id || "",

        name:
            user.name || "",

        email:
            user.email || "",

        profile_photo:
            user.profile_photo || "",

        department_id:
            user.department_id || null,

        department:
            user.department || "",

        designation_id:
            user.designation_id || null,

        designation:
            user.designation || "",

        reports_to:
            user.reports_to || "",

        status:
            user.status || "",

        is_admin:
            user.is_admin === 1 ||
            user.is_admin === true,

        stores:
            Array.isArray(stores)
                ? stores
                : [],
    };
};

// ======================================================
// GET CURRENT USER PROFILE
// ======================================================
//
// GET
// /api/profile/me
//
// IMPORTANT:
// The user ID comes from JWT:
//
//     req.user.id
//
// The browser does NOT decide whose profile is loaded.
//
// ======================================================

router.get(
    "/me",
    authMiddleware,
    async (req, res) => {
        try {
            // ----------------------------------------------
            // AUTHENTICATED USER
            // ----------------------------------------------

            const userId =
                req.user &&
                req.user.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user not found.",
                });
            }

            // ----------------------------------------------
            // LOAD USER
            // ----------------------------------------------

            const users =
                await db.query(
                    `
                    SELECT
                        u.id,
                        u.employee_id,
                        u.name,
                        u.email,
                        u.profile_photo,

                        u.department_id,
                        dep.department_name
                            AS department,

                        u.designation_id,
                        des.designation_name
                            AS designation,

                        u.reports_to,
                        u.status,
                        u.is_admin

                    FROM users u

                    LEFT JOIN departments dep
                        ON u.department_id = dep.id

                    LEFT JOIN designations des
                        ON u.designation_id = des.id

                    WHERE u.id = ?

                    LIMIT 1
                    `,
                    [userId]
                );

            if (
                !Array.isArray(users) ||
                users.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User profile not found.",
                });
            }

            const user =
                users[0];

            // ----------------------------------------------
            // LOAD ASSIGNED STORES
            // ----------------------------------------------

            let stores = [];

            try {
                stores =
                    await db.query(
                        `
                        SELECT
                            s.id,
                            s.store_name,
                            s.address AS location,
                            s.city,
                            s.state

                        FROM user_stores us

                        INNER JOIN stores s
                            ON us.store_id = s.id

                        WHERE us.user_id = ?

                        ORDER BY
                            s.store_name ASC
                        `,
                        [userId]
                    );
            } catch (storeError) {
                console.error(
                    "PROFILE STORE LOAD ERROR:",
                    storeError
                );

                // Do not destroy the whole profile
                // just because store data failed.
                stores = [];
            }

            // ----------------------------------------------
            // RESPONSE
            // ----------------------------------------------

            return res.status(200).json({
                success: true,

                user:
                    normalizeUser(
                        user,
                        stores
                    ),
            });
        } catch (error) {
            console.error(
                "GET PROFILE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load profile.",
                error:
                    process.env.NODE_ENV ===
                    "development"
                        ? error.message
                        : undefined,
            });
        }
    }
);

// ======================================================
// UPDATE CURRENT USER PROFILE
// ======================================================
//
// PUT
// /api/profile/me
//
// FormData:
//
// name
// employeeId
// profilePhoto
//
// The user ID ALWAYS comes from:
//
//     req.user.id
//
// ======================================================

router.put(
    "/me",
    authMiddleware,

    profileUpload.single(
        "profilePhoto"
    ),

    async (req, res) => {
        try {
            // ----------------------------------------------
            // AUTHENTICATED USER
            // ----------------------------------------------

            const userId =
                req.user &&
                req.user.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user not found.",
                });
            }

            // ----------------------------------------------
            // INPUT
            // ----------------------------------------------

            const name =
                String(
                    req.body?.name || ""
                ).trim();

            const employeeId =
                String(
                    req.body?.employeeId || ""
                ).trim();

            // ----------------------------------------------
            // VALIDATION
            // ----------------------------------------------

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name is required.",
                });
            }

            // ----------------------------------------------
            // CHECK USER EXISTS
            // ----------------------------------------------

            const existingRows =
                await db.query(
                    `
                    SELECT
                        id,
                        name,
                        employee_id,
                        email,
                        profile_photo

                    FROM users

                    WHERE id = ?

                    LIMIT 1
                    `,
                    [userId]
                );

            if (
                !Array.isArray(existingRows) ||
                existingRows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User profile not found.",
                });
            }

            // ----------------------------------------------
            // UPDATE PROFILE WITHOUT PHOTO
            // ----------------------------------------------

            if (!req.file) {
                await db.query(
                    `
                    UPDATE users

                    SET
                        name = ?,
                        employee_id = ?

                    WHERE id = ?
                    `,
                    [
                        name,
                        employeeId,
                        userId,
                    ]
                );
            }

            // ----------------------------------------------
            // UPDATE PROFILE WITH PHOTO
            // ----------------------------------------------

            if (req.file) {
                const base64 =
                    req.file.buffer.toString(
                        "base64"
                    );

                const dataUrl =
                    `data:${req.file.mimetype};base64,${base64}`;

                await db.query(
                    `
                    UPDATE users

                    SET
                        name = ?,
                        employee_id = ?,
                        profile_photo = ?

                    WHERE id = ?
                    `,
                    [
                        name,
                        employeeId,
                        dataUrl,
                        userId,
                    ]
                );
            }

            // ----------------------------------------------
            // RELOAD COMPLETE PROFILE
            // ----------------------------------------------

            const updatedRows =
                await db.query(
                    `
                    SELECT
                        u.id,
                        u.employee_id,
                        u.name,
                        u.email,
                        u.profile_photo,

                        u.department_id,
                        dep.department_name
                            AS department,

                        u.designation_id,
                        des.designation_name
                            AS designation,

                        u.reports_to,
                        u.status,
                        u.is_admin

                    FROM users u

                    LEFT JOIN departments dep
                        ON u.department_id = dep.id

                    LEFT JOIN designations des
                        ON u.designation_id = des.id

                    WHERE u.id = ?

                    LIMIT 1
                    `,
                    [userId]
                );

            // ----------------------------------------------
            // LOAD STORES
            // ----------------------------------------------

            let stores = [];

            try {
                stores =
                    await db.query(
                        `
                        SELECT
                            s.id,
                            s.store_name,
                            s.address AS location,
                            s.city,
                            s.state

                        FROM user_stores us

                        INNER JOIN stores s
                            ON us.store_id = s.id

                        WHERE us.user_id = ?

                        ORDER BY
                            s.store_name ASC
                        `,
                        [userId]
                    );
            } catch (storeError) {
                console.error(
                    "PROFILE STORE RELOAD ERROR:",
                    storeError
                );

                stores = [];
            }

            // ----------------------------------------------
            // RESPONSE
            // ----------------------------------------------

            return res.status(200).json({
                success: true,

                message:
                    "Profile updated successfully.",

                user:
                    normalizeUser(
                        updatedRows[0],
                        stores
                    ),
            });
        } catch (error) {
            console.error(
                "UPDATE PROFILE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error?.message ||
                    "Unable to update profile.",
            });
        }
    }
);

// ======================================================
// CHANGE CURRENT USER PASSWORD
// ======================================================
//
// PUT
// /api/profile/password
//
// Body:
//
// {
//     currentPassword,
//     newPassword
// }
//
// ======================================================

router.put(
    "/password",
    authMiddleware,
    async (req, res) => {
        try {
            const userId =
                req.user &&
                req.user.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user not found.",
                });
            }

            const currentPassword =
                String(
                    req.body?.currentPassword ||
                    ""
                );

            const newPassword =
                String(
                    req.body?.newPassword ||
                    ""
                );

            // ----------------------------------------------
            // VALIDATION
            // ----------------------------------------------

            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Current password is required.",
                });
            }

            if (!newPassword) {
                return res.status(400).json({
                    success: false,
                    message:
                        "New password is required.",
                });
            }

            const passwordError = validatePassword(newPassword);
            if (passwordError) {
                return res.status(400).json({
                    success: false,
                    message: passwordError,
                });
            }

            if (
                currentPassword ===
                newPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "New password must be different from the current password.",
                });
            }

            // ----------------------------------------------
            // LOAD PASSWORD
            // ----------------------------------------------

            const rows =
                await db.query(
                    `
                    SELECT
                        id,
                        password

                    FROM users

                    WHERE id = ?

                    LIMIT 1
                    `,
                    [userId]
                );

            if (
                !Array.isArray(rows) ||
                rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User not found.",
                });
            }

            const storedPassword =
                rows[0].password || "";

            // ----------------------------------------------
            // VERIFY CURRENT PASSWORD
            // ----------------------------------------------

            const matches =
                await bcrypt.compare(
                    currentPassword,
                    storedPassword
                );

            if (!matches) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Current password is incorrect.",
                });
            }

            // ----------------------------------------------
            // HASH NEW PASSWORD
            // ----------------------------------------------

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    BCRYPT_ROUNDS
                );

            // ----------------------------------------------
            // SAVE NEW PASSWORD
            // ----------------------------------------------

            await db.query(
                `
                UPDATE users

                SET password = ?

                WHERE id = ?
                `,
                [
                    hashedPassword,
                    userId,
                ]
            );

            await incrementTokenVersion(userId);

            return res.status(200).json({
                success: true,
                message:
                    "Password updated successfully.",
            });
        } catch (error) {
            console.error(
                "PROFILE PASSWORD ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update password.",
            });
        }
    }
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;