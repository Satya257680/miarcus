const express = require("express");
const router = express.Router();
const multer = require("multer");

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

router.get("/", getUsers);

// ======================================================
// GET USER NAMES (REPORTS TO)
// GET : /api/users/names
// ======================================================

router.get("/names", getUserNames);

// ======================================================
// CREATE USER + SEND INVITATION
// POST : /api/users
// ======================================================

router.post("/", createUser);

// ======================================================
// BULK UPLOAD USERS
// POST : /api/users/bulk-upload
// ======================================================

router.post(

    "/bulk-upload",

    upload.single("file"),

    bulkUploadUsers

);

// ======================================================
// UPDATE USER
// PUT : /api/users/:id
// ======================================================

router.put("/:id", updateUser);

// ======================================================
// DISABLE USER
// PUT : /api/users/disable/:id
// ======================================================

router.put("/disable/:id", disableUser);

// ======================================================
// DELETE USER
// DELETE : /api/users/:id
// ======================================================

router.delete("/:id", deleteUser);

// ======================================================
// DELETE ALL USERS
// DELETE : /api/users/delete-all
// ======================================================

router.delete("/delete-all", deleteAllUsers);

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