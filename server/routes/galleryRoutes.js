const express = require("express");
const router = express.Router();

// Gallery is intentionally loaded with lazy dependencies. This keeps the
// /api/gallery router mountable even if a non-gallery dependency has a
// startup-time problem, instead of turning every Gallery request into a
// generic 404 from the application's final not-found handler.
const lazy = (loader) => (req, res, next) => {
    try {
        const middleware = loader();
        return middleware(req, res, next);
    } catch (error) {
        console.error("Gallery dependency load error:", error);
        return res.status(503).json({
            success: false,
            message: "Gallery service is temporarily unavailable.",
            requestId: req.requestId
        });
    }
};

const auth = lazy(() => require("../middleware/authMiddleware"));
const permission = (moduleName, requiredPermission) =>
    lazy(() => require("../middleware/permissionMiddleware")(moduleName, requiredPermission));
const controller = (method) =>
    lazy(() => require("../controllers/galleryController")[method]);

const uploadSingle = lazy(() => {
    const { upload } = require("../middleware/galleryUpload");
    const middleware = upload.single("photo");
    return Array.isArray(middleware)
        ? (req, res, next) => {
            let index = 0;
            const run = (err) => {
                if (err) return next(err);
                const current = middleware[index++];
                if (!current) return next();
                return current(req, res, run);
            };
            return run();
        }
        : middleware;
});

const uploadMany = lazy(() => {
    const { uploadMany: uploader } = require("../middleware/galleryUpload");
    const middleware = uploader.array("photos", 20);
    return Array.isArray(middleware)
        ? (req, res, next) => {
            let index = 0;
            const run = (err) => {
                if (err) return next(err);
                const current = middleware[index++];
                if (!current) return next();
                return current(req, res, run);
            };
            return run();
        }
        : middleware;
});

// Public mobile uploader endpoints.
router.get("/mobile/:token", controller("mobileOpen"));
router.post("/mobile/:token/upload", uploadSingle, controller("mobileUpload"));

// All normal Gallery endpoints require authentication.
router.use(auth);

router.get("/categories", permission("Gallery", "View"), controller("getCategories"));
router.get("/locations", permission("Gallery", "View"), controller("getLocations"));
router.get("/", permission("Gallery", "View"), controller("getAll"));

router.post(
    "/upload",
    permission("Gallery", "Add"),
    uploadSingle,
    controller("uploadPhoto")
);

router.post(
    "/bulk-upload",
    permission("Gallery", "Add"),
    uploadMany,
    controller("bulkUploadPhotos")
);

router.delete("/delete-all", permission("Gallery", "Full"), controller("deleteAllPhotos"));
router.post("/mobile-session", permission("Gallery", "Add"), controller("createMobileSession"));
router.get("/mobile-session/:id/status", permission("Gallery", "Add"), controller("mobileStatus"));
router.get("/:id/file", permission("Gallery", "View"), controller("servePhoto"));
router.get("/:id/download", permission("Gallery", "View"), controller("downloadPhoto"));
router.delete("/:id", permission("Gallery", "Edit"), controller("deletePhoto"));

module.exports = router;
