// ==========================================================
// LEARNING & DEVELOPMENT — OWNER-CONTROLLED ACCESS
// ==========================================================
//
// "Learning & Development" is an OWNER-GATED module:
//
//   • The OWNER (e.g. Satyajit Nayak) always has Full access.
//   • Everyone else — INCLUDING administrators — has NO access
//     unless the owner has explicitly granted a level.
//   • Only the owner can grant / change / revoke access.
//   • The normal Add/Edit User screens can never change it
//     (see userModel.updateUserPermissions, which preserves it).
//
// The owner is identified by environment variables (set in
// server/.env). If neither is set, NOBODY is the owner and the
// module is closed to everyone (fail closed).
//
//   LND_OWNER_EMAIL=satyajit@yourcompany.com          (comma list ok)
//   LND_OWNER_USER_ID=12                              (optional)
// ==========================================================

const db = require("../config/db");

const MODULE_NAME = "Learning & Development";
const LEVELS = ["None", "View", "Add", "Edit", "Full"];
const RANK = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };

const GATED_MODULES = new Set([MODULE_NAME]);

const ownerEmails = () =>
    String(process.env.LND_OWNER_EMAIL || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

const ownerIds = () =>
    String(process.env.LND_OWNER_USER_ID || "")
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isInteger(v) && v > 0);

// Synchronous check when id + email are already known.
const isOwnerRow = ({ id, email } = {}) =>
    ownerIds().includes(Number(id)) ||
    ownerEmails().includes(String(email || "").trim().toLowerCase());

const isOwner = async (userId) => {
    if (!userId) return false;
    if (ownerIds().includes(Number(userId))) return true;
    if (!ownerEmails().length) return false;

    const rows = await db.query(
        "SELECT email FROM users WHERE id = ? LIMIT 1",
        [userId]
    );

    return ownerEmails().includes(
        String(rows?.[0]?.email || "").trim().toLowerCase()
    );
};

const getGrantedLevel = async (userId) => {
    const rows = await db.query(
        "SELECT permission FROM user_permissions WHERE user_id = ? AND module_name = ?",
        [userId, MODULE_NAME]
    );

    const best = (rows || [])
        .map((row) => row.permission)
        .sort((a, b) => (RANK[b] || 0) - (RANK[a] || 0))[0];

    return RANK[best] !== undefined ? best : "None";
};

// Owner → Full. Everyone else → exactly what the owner granted.
// Administrator status is deliberately NOT considered.
const getEffectiveLevel = async (userId) =>
    (await isOwner(userId)) ? "Full" : getGrantedLevel(userId);

const isGatedModule = (name) => GATED_MODULES.has(name);

const levelSatisfies = (level, required = "View") =>
    (RANK[level] || 0) >= Math.max(RANK[required] || 1, 1);

module.exports = {
    MODULE_NAME,
    LEVELS,
    RANK,
    isOwner,
    isOwnerRow,
    getGrantedLevel,
    getEffectiveLevel,
    isGatedModule,
    levelSatisfies,
};
