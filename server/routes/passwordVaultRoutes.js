const express = require("express");
const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

const PasswordVaultModel = require("../models/passwordVaultModel");

// ======================================================
// CONTROLLERS
// ======================================================

const {
    listPasswordVault,
    updateUserPassword,
    toggleSuperAdmin,
    deleteVaultUser,
    deleteAllVaultUsers
} = require("../controllers/passwordVaultController");

// ======================================================
// SUPER ADMIN ONLY
// ======================================================
//
// Only an existing Super Admin (the application's creator/
// owner) may grant or revoke Super Admin access on another
// Administrator account. This keeps "who else can use
// self-service Forgot Password" under the creator's control.
// ======================================================

const superAdminOnly = async (req, res, next) => {

    try {

        const email = req.user?.email;

        const allowed = email
            ? await PasswordVaultModel.isSuperAdminByEmail(email)
            : false;

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "Super Admin access required."
            });
        }

        next();

    } catch (error) {

        console.error("Super admin authorization check failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Authorization check failed."
        });

    }

};

// ======================================================
// LIST PASSWORD VAULT
// GET /api/password-vault
//
// Administrators and Super Admins only.
// ======================================================

router.get(
    "/",
    authMiddleware,
    adminOnly,
    listPasswordVault
);

// ======================================================
// UPDATE / RESET A USER'S PASSWORD
// PUT /api/password-vault/:id
//
// Administrators and Super Admins only.
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    adminOnly,
    updateUserPassword
);

// ======================================================
// GRANT / REVOKE SUPER ADMIN
// PUT /api/password-vault/:id/super-admin
//
// Super Admin only.
// ======================================================

router.put(
    "/:id/super-admin",
    authMiddleware,
    adminOnly,
    superAdminOnly,
    toggleSuperAdmin
);

// ======================================================
// DELETE ALL USERS (except Administrator / Super Admin)
// DELETE /api/password-vault/delete-all
//
// Administrators and Super Admins only.
//
// IMPORTANT: this must be registered BEFORE "/:id" below —
// otherwise Express would match this path against that route
// first and try to treat "delete-all" as a numeric user id.
// ======================================================

router.delete(
    "/delete-all",
    authMiddleware,
    adminOnly,
    deleteAllVaultUsers
);

// ======================================================
// DELETE A SINGLE USER
// DELETE /api/password-vault/:id
//
// Administrators and Super Admins only. Administrator and
// Super Admin accounts themselves can never be deleted here
// (enforced in the controller).
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    adminOnly,
    deleteVaultUser
);

module.exports = router;
