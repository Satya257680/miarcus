const express = require("express");
const multer = require("multer");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const permissionMiddleware = require(
    "../middleware/permissionMiddleware"
);


// ======================================================
// FILE UPLOAD
// ======================================================
//
// Used only for bulk user upload.
//
// If your project already has a common upload middleware,
// you can replace this multer configuration with:
//
// const upload = require("../middleware/upload");
//
// ======================================================

const upload = multer({

    dest: "uploads/",

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: (
        req,
        file,
        cb
    ) => {

        const allowedMimeTypes = [

            "text/csv",

            "application/vnd.ms-excel",

            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

            "application/octet-stream"

        ];


        if (
            allowedMimeTypes.includes(
                file.mimetype
            )
        ) {

            return cb(
                null,
                true
            );
        }


        return cb(
            new Error(
                "Only CSV or Excel files are allowed"
            )
        );
    }

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

    enableUser,

    deleteUser,

    deleteAllUsers,

    getUserNames,

    validateActivationToken,

    activateUserAccount,

    resendInvitation

} = require(
    "../controllers/userController"
);


// ======================================================
// USERS RBAC PERMISSION HELPER
// ======================================================
//
// Module name:
//
//     Users
//
// Permission levels:
//
//     View
//     Add
//     Edit
//     Full
//
// Administrator users bypass the permission check.
//
// This keeps Users RBAC consistent with the Quiz RBAC
// implementation.
//

const usersPermission = (
    level
) => {

    return (
        req,
        res,
        next
    ) => {

        // --------------------------------------------------
        // ADMINISTRATOR BYPASS
        // --------------------------------------------------

        const isAdmin =

            req.user?.is_admin === 1 ||

            req.user?.is_admin === true ||

            req.user?.is_admin === "1";


        if (isAdmin) {

            return next();
        }


        // --------------------------------------------------
        // NORMAL USER RBAC
        // --------------------------------------------------

        return permissionMiddleware(
            "Users",
            level
        )(
            req,
            res,
            next
        );
    };
};


// ======================================================
// GET ALL USERS
// GET /api/users
// ======================================================
//
// Permission:
//     View
//
// ======================================================

router.get(

    "/",

    authMiddleware,

    usersPermission(
        "View"
    ),

    getUsers

);


// ======================================================
// GET USER NAMES
// GET /api/users/names
// ======================================================
//
// Permission:
//     View
//
// Used by dropdowns such as:
//     Reports To
//
// ======================================================

router.get(

    "/names",

    authMiddleware,

    usersPermission(
        "View"
    ),

    getUserNames

);


// ======================================================
// BULK UPLOAD USERS
// POST /api/users/bulk-upload
// ======================================================
//
// Permission:
//     Add
//
// IMPORTANT:
// This route is intentionally before /:id.
//
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    usersPermission(
        "Add"
    ),

    upload.single(
        "file"
    ),

    bulkUploadUsers

);


// ======================================================
// DELETE ALL USERS
// DELETE /api/users/delete-all
// ======================================================
//
// Permission:
//     Full
//
// IMPORTANT:
// This route is before DELETE /:id so that
// "delete-all" cannot be interpreted as a user ID.
//
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    usersPermission(
        "Full"
    ),

    deleteAllUsers

);


// ======================================================
// RESEND INVITATION
// POST /api/users/resend-invitation/:id
// ======================================================
//
// Permission:
//     Edit
//
// ======================================================

router.post(

    "/resend-invitation/:id",

    authMiddleware,

    usersPermission(
        "Edit"
    ),

    resendInvitation

);


// ======================================================
// VALIDATE ACTIVATION TOKEN
// GET /api/users/activate/:token
// ======================================================
//
// PUBLIC ROUTE
//
// No authentication is required because a new user
// receives this link through email.
//
// ======================================================

router.get(

    "/activate/:token",

    validateActivationToken

);


// ======================================================
// ACTIVATE ACCOUNT
// POST /api/users/activate
// ======================================================
//
// PUBLIC ROUTE
//
// The user activates their account using the token
// received by email.
//
// ======================================================

router.post(

    "/activate",

    activateUserAccount

);


// ======================================================
// CREATE USER
// POST /api/users
// ======================================================
//
// Permission:
//     Add
//
// ======================================================

router.post(

    "/",

    authMiddleware,

    usersPermission(
        "Add"
    ),

    createUser

);


// ======================================================
// UPDATE USER
// PUT /api/users/:id
// ======================================================
//
// Permission:
//     Edit
//
// This also updates:
//     - User information
//     - Department
//     - Designation
//     - Reports To
//     - Stores
//     - RBAC permissions
//
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    usersPermission(
        "Edit"
    ),

    updateUser

);


// ======================================================
// DISABLE USER
// PUT /api/users/disable/:id
// ======================================================
//
// Permission:
//     Full
//
// ======================================================

router.put(

    "/disable/:id",

    authMiddleware,

    usersPermission(
        "Full"
    ),

    disableUser

);


// ======================================================
// ENABLE USER
// PUT /api/users/enable/:id
// ======================================================
//
// Permission:
//     Full
//
// Added because the User Model supports enableUser.
//
// ======================================================

router.put(

    "/enable/:id",

    authMiddleware,

    usersPermission(
        "Full"
    ),

    enableUser

);


// ======================================================
// DELETE USER
// DELETE /api/users/:id
// ======================================================
//
// Permission:
//     Full
//
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    usersPermission(
        "Full"
    ),

    deleteUser

);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;