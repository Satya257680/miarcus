const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const { upload, uploadMany } = require("../middleware/galleryUpload");
const controller = require("../controllers/galleryController");

router.get(
    "/mobile/:token",
    controller.mobileOpen
);

router.post(
    "/mobile/:token/upload",
    upload.single("photo"),
    controller.mobileUpload
);

router.use(authMiddleware);

router.get(
    "/",
    permissionMiddleware("Gallery", "View"),
    controller.getAll
);

router.get(
    "/categories",
    permissionMiddleware("Gallery", "View"),
    controller.getCategories
);

router.get(
    "/locations",
    permissionMiddleware("Gallery", "View"),
    controller.getLocations
);

router.post(
    "/upload",
    permissionMiddleware("Gallery", "Add"),
    upload.single("photo"),
    controller.uploadPhoto
);

router.post(
    "/bulk-upload",
    permissionMiddleware("Gallery", "Add"),
    uploadMany.array("photos", 20),
    controller.bulkUploadPhotos
);

router.delete(
    "/delete-all",
    permissionMiddleware("Gallery", "Full"),
    controller.deleteAllPhotos
);

router.post(
    "/mobile-session",
    permissionMiddleware("Gallery", "Add"),
    controller.createMobileSession
);

router.get(
    "/mobile-session/:id/status",
    permissionMiddleware("Gallery", "Add"),
    controller.mobileStatus
);

router.get(
    "/:id/download",
    permissionMiddleware("Gallery", "View"),
    controller.downloadPhoto
);

router.delete(
    "/:id",
    permissionMiddleware("Gallery", "Edit"),
    controller.deletePhoto
);

module.exports = router;
