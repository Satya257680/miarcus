const express = require("express");

const router = express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const ThemePreference =
    require("../models/themePreferenceModel");

// ======================================================
// GET CURRENT USER THEME
// ======================================================

router.get(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            const userId =
                req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user not found."
                });
            }

            const preferences =
                await ThemePreference.getByUserId(
                    userId
                );

            return res.status(200).json({
                success: true,
                preferences
            });
        } catch (error) {
            console.error(
                "GET THEME PREFERENCE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load appearance preferences."
            });
        }
    }
);

// ======================================================
// SAVE CURRENT USER THEME
// ======================================================

router.put(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            const userId =
                req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user not found."
                });
            }

            const preferences =
                await ThemePreference.saveForUser(
                    userId,
                    req.body || {}
                );

            return res.status(200).json({
                success: true,
                message:
                    "Appearance preferences saved successfully.",
                preferences
            });
        } catch (error) {
            console.error(
                "SAVE THEME PREFERENCE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to save appearance preferences."
            });
        }
    }
);

module.exports = router;
