const express = require("express");
const router = express.Router();
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

// ======================================================
// CONTROLLERS
// ======================================================

const {

    getUsers,

    createUser,

    bulkUploadUsers,

    updateUser,

    disableUser,

    deleteUser,

    deleteAllUsers,

    getUserNames,

    validateActivationToken,

    activateUserAccount,

    resendInvitation

} = require("../controllers/userController");

// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({

    dest: "uploads/"

});

// ======================================================
// GET ALL USERS
// GET : /api/users
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware("Users", "View"),

    getUsers

);

// ======================================================
// GET USER NAMES
// GET : /api/users/names
// ======================================================

router.get(

    "/names",

    getUserNames

);

// ======================================================
// CREATE USER
// POST : /api/users
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware("Users", "Add"),

    createUser

);

// ======================================================
// BULK UPLOAD USERS
// POST : /api/users/bulk-upload
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    permissionMiddleware("Users", "Add"),

    upload.single("file"),

    bulkUploadUsers

);

// ======================================================
// UPDATE USER
// PUT : /api/users/:id
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware("Users", "Edit"),

    updateUser

);

// ======================================================
// DISABLE USER
// PUT : /api/users/disable/:id
// ======================================================

router.put(

    "/disable/:id",

    authMiddleware,

    permissionMiddleware("Users", "Full"),

    disableUser

);

// ======================================================
// DELETE USER
// DELETE : /api/users/:id
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware("Users", "Full"),

    deleteUser

);

// ======================================================
// DELETE ALL USERS
// DELETE : /api/users/delete-all
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware("Users", "Full"),

    deleteAllUsers

);

// ======================================================
// VALIDATE ACTIVATION TOKEN
// GET : /api/users/activate/:token
// ======================================================

router.get(

    "/activate/:token",

    validateActivationToken

);

// ======================================================
// ACTIVATE ACCOUNT
// POST : /api/users/activate
// ======================================================

router.post(

    "/activate",

    activateUserAccount

);

// ======================================================
// RESEND INVITATION
// POST : /api/users/resend-invitation/:id
// ======================================================

router.post(

    "/resend-invitation/:id",

    resendInvitation

);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;