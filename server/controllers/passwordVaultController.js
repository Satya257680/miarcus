// ==========================================================
// MIARCUS — PASSWORD VAULT CONTROLLER
// ==========================================================
//
// Powers the admin-only "Password Management" sidebar page:
//
// - List every user with name, email and current password.
// - Update/reset a user's password (emailed to them directly —
//   the user never chooses their own password).
// - Grant/revoke Super Admin (the only role still allowed to
//   use self-service "Forgot Password").
//
// Access to every route here is restricted in
// routes/passwordVaultRoutes.js to Administrators (and, for
// the Super Admin toggle, to an existing Super Admin only).
// ==========================================================

const bcrypt = require("bcrypt");

const {
    validatePassword,
    BCRYPT_ROUNDS
} = require("../config/security");

const {
    encryptPassword,
    decryptPassword
} = require("../config/passwordVault");

const PasswordVault = require("../models/passwordVaultModel");
const User = require("../models/userModel");
const { logActivity } = require("../utils/activityLogger");
const { sendPasswordUpdatedEmail } = require("../services/emailService");

// ==========================================================
// LIST PASSWORD VAULT
// GET /api/password-vault
// ==========================================================

const listPasswordVault = async (req, res) => {

    try {

        const rows = await PasswordVault.listVaultUsers();

        const users = rows.map((row) => ({

            id: row.id,
            employeeId: row.employee_id || "",
            name: row.name,
            email: row.email,
            isAdmin: Number(row.is_admin) === 1,
            isSuperAdmin: Number(row.is_super_admin) === 1,
            status: row.status,
            isActivated: Number(row.is_activated) === 1,

            // Decrypted only for this admin-only, server-rendered
            // response — never stored or logged in plain text.
            password: row.password_vault
                ? decryptPassword(row.password_vault)
                : null,

            passwordUpdatedAt: row.password_updated_at,
            passwordUpdatedBy: row.password_updated_by_name || null

        }));

        return res.status(200).json({
            success: true,
            users
        });

    } catch (error) {

        console.error("Password vault list error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load the password vault."
        });

    }

};

// ==========================================================
// UPDATE / RESET A USER'S PASSWORD
// PUT /api/password-vault/:id
// ==========================================================

const updateUserPassword = async (req, res) => {

    try {

        const userId = Number(req.params.id);

        const newPassword = String(req.body?.password || "");
        const confirmPassword = String(req.body?.confirmPassword || "");

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user."
            });
        }

        const passwordError = validatePassword(newPassword);

        if (passwordError) {
            return res.status(400).json({
                success: false,
                message: passwordError
            });
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password and Confirm Password do not match."
            });
        }

        const targetUser = await PasswordVault.getVaultUserById(userId);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        const encryptedPassword = encryptPassword(newPassword);

        await PasswordVault.setUserPassword(
            userId,
            hashedPassword,
            encryptedPassword,
            req.user?.id
        );

        try {
            logActivity({
                activity_type: "User",
                reference_id: userId,
                title: "Password Updated by Administrator",
                description: `${targetUser.name}'s password was updated by an administrator`,
                module_name: "Users",
                status: "Closed",
                priority: "Medium",
                created_by: req.user?.id,
                assigned_to: userId
            });
        } catch (activityErr) {
            console.error("Activity log failed:", activityErr);
        }

        let emailSent = true;

        try {
            await sendPasswordUpdatedEmail(targetUser, newPassword);
        } catch (mailErr) {
            console.error(
                "Password updated email failed:",
                mailErr?.message || mailErr
            );
            emailSent = false;
        }

        return res.status(200).json({
            success: true,
            warning: !emailSent,
            emailSent,
            message: emailSent
                ? "Password updated and emailed to the user successfully."
                : "Password updated successfully, but the notification email could not be sent."
        });

    } catch (error) {

        console.error("Password vault update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update the password."
        });

    }

};

// ==========================================================
// GRANT / REVOKE SUPER ADMIN
// PUT /api/password-vault/:id/super-admin
// ==========================================================
//
// Restricted (see routes file) to an existing Super Admin —
// an ordinary Administrator cannot promote themselves or
// anyone else.
// ==========================================================

const toggleSuperAdmin = async (req, res) => {

    try {

        const userId = Number(req.params.id);

        const targetUser = await PasswordVault.getVaultUserById(userId);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (Number(targetUser.is_admin) !== 1) {
            return res.status(400).json({
                success: false,
                message: "Only Administrator accounts can be granted Super Admin access."
            });
        }

        const nextValue = Number(targetUser.is_super_admin) !== 1;

        await PasswordVault.setSuperAdminFlag(userId, nextValue);

        try {
            logActivity({
                activity_type: "User",
                reference_id: userId,
                title: nextValue
                    ? "Super Admin Access Granted"
                    : "Super Admin Access Revoked",
                description: `${targetUser.name} ${nextValue ? "was granted" : "had"} Super Admin access ${nextValue ? "" : "revoked"}`.trim(),
                module_name: "Users",
                status: "Closed",
                priority: "High",
                created_by: req.user?.id,
                assigned_to: userId
            });
        } catch (activityErr) {
            console.error("Activity log failed:", activityErr);
        }

        return res.status(200).json({
            success: true,
            isSuperAdmin: nextValue,
            message: `Super Admin access ${nextValue ? "granted" : "revoked"} successfully.`
        });

    } catch (error) {

        console.error("Toggle super admin error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update Super Admin access."
        });

    }

};

// ==========================================================
// DELETE A SINGLE USER FROM THE VAULT
// DELETE /api/password-vault/:id
// ==========================================================
//
// Reuses the same account-deletion logic (and cascading
// cleanup of every dependent record) already used by the
// Users screen — this just gives the Password Management
// screen its own Delete action without duplicating that
// logic. Administrator and Super Admin accounts are never
// deletable from here, matching the same rule already
// enforced on the Users screen and on "Delete All" below.
// ==========================================================

const deleteVaultUser = async (req, res) => {

    try {

        const userId = Number(req.params.id);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user."
            });
        }

        const targetUser = await PasswordVault.getVaultUserById(userId);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const isProtected =
            Number(targetUser.is_admin) === 1 ||
            Number(targetUser.is_super_admin) === 1;

        if (isProtected) {
            return res.status(403).json({
                success: false,
                message: "Administrator and Super Admin accounts cannot be deleted."
            });
        }

        await User.deleteUser(userId);

        try {
            logActivity({
                activity_type: "User",
                reference_id: userId,
                title: "User Deleted",
                description: `${targetUser.name} was deleted from Password Management`,
                module_name: "Users",
                status: "Closed",
                priority: "High",
                created_by: req.user?.id,
                assigned_to: userId
            });
        } catch (activityErr) {
            console.error("Activity log failed:", activityErr);
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully."
        });

    } catch (error) {

        console.error("Password vault delete user error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete this user."
        });

    }

};

// ==========================================================
// DELETE ALL USERS (EXCEPT ADMIN / SUPER ADMIN)
// DELETE /api/password-vault/delete-all
// ==========================================================
//
// Delegates to the same model function the Users screen's
// "Delete All" uses, which already only ever removes rows
// where is_admin = 0 AND is_super_admin = 0 — every
// Administrator and Super Admin account is always kept.
// ==========================================================

const deleteAllVaultUsers = async (req, res) => {

    try {

        await User.deleteAllUsers();

        return res.status(200).json({
            success: true,
            message: "All non-administrator users deleted successfully."
        });

    } catch (error) {

        console.error("Password vault delete-all error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete users."
        });

    }

};

module.exports = {
    listPasswordVault,
    updateUserPassword,
    toggleSuperAdmin,
    deleteVaultUser,
    deleteAllVaultUsers
};
