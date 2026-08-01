const express = require("express");
const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

// ======================================================
// FILE UPLOAD
// ======================================================

// If you already have a common upload middleware,
// use this line instead:
//
// const upload = require("../middleware/upload");
//
// Otherwise keep multer below.

const multer = require("multer");

const upload = multer({

    dest: "uploads/"

});

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

    authMiddleware,

    permissionMiddleware("Users", "View"),

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
// RESEND INVITATION
// POST : /api/users/resend-invitation/:id
// ======================================================

router.post(

    "/resend-invitation/:id",

    authMiddleware,

    permissionMiddleware("Users", "Edit"),

    resendInvitation

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
// EXPORT ROUTER
// ======================================================

module.exports = router;