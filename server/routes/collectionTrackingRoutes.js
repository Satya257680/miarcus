const express = require("express");
const multer = require("multer");
const path = require("path");

const auth = require("../middleware/authMiddleware");
const C = require("../controllers/collectionTrackingController");
const collectionUpload = require("../middleware/upload");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const syncGalleryAttachment = require("../middleware/galleryAttachmentSync");

const MODULE = "Collection Tracking";

const router = express.Router();

/* =========================================================
   FILE UPLOAD
========================================================= */

const upload = multer({
  dest: path.resolve(
    __dirname,
    "../uploads"
  ),

  limits: {
    fileSize:
      10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {
    const allowedExtensions = [
      ".csv",
      ".xlsx",
      ".xls",
    ];

    const extension =
      path
        .extname(
          file.originalname
        )
        .toLowerCase();

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      return callback(
        new Error(
          "Only CSV, XLS, and XLSX files are allowed."
        )
      );
    }

    callback(null, true);
  },
});

/* =========================================================
   COLLECTION TRACKING MIDDLEWARE
========================================================= */

router.use(
  auth,
  C.ensure
);

/* =========================================================
   MASTER DATA
========================================================= */

/*
 * GET
 * /api/collection-tracking/configs
 */
router.get(
  "/configs",
  permissionMiddleware(MODULE, "View"),
  C.configs
);

/*
 * PUT
 * /api/collection-tracking/configs/:stage
 */
router.put(
  "/configs/:stage",
  permissionMiddleware(MODULE, "Full"),
  C.saveConfig
);

/* =========================================================
   PRODUCTS
========================================================= */

/*
 * CREATE
 * /api/collection-tracking/products
 */
router.post(
  "/products",
  permissionMiddleware(MODULE, "Add"),
  collectionUpload.array("attachments", 20),
  syncGalleryAttachment("Collection Tracking", "attachments"),
  C.create
);

/*
 * BULK UPLOAD
 *
 * IMPORTANT:
 * Keep this before /products/:id.
 *
 * /products/bulk
 * would otherwise be capable of being interpreted
 * as /products/:id.
 */
router.post(
  "/products/bulk",
  permissionMiddleware(MODULE, "Add"),
  upload.single("file"),
  C.bulk
);

/*
 * EXPORT
 *
 * Also kept before /products/:id.
 */
router.get(
  "/products/export",
  permissionMiddleware(MODULE, "View"),
  C.export
);

/*
 * LIST
 */
router.get(
  "/products",
  permissionMiddleware(MODULE, "View"),
  C.list
);

/*
 * VIEW ONE PRODUCT
 */
router.get(
  "/products/:id",
  permissionMiddleware(MODULE, "View"),
  C.view
);

/*
 * UPDATE CURRENT STAGE
 */
router.put(
  "/products/:id/stage",
  permissionMiddleware(MODULE, "Edit"),
  collectionUpload.array("attachments", 20),
  syncGalleryAttachment("Collection Tracking", "attachments"),
  C.updateStage
);

/*
 * ADD REMARK / COMMENT
 */
router.post(
  "/products/:id/comments",
  permissionMiddleware(MODULE, "Edit"),
  C.comment
);

/*
 * CREATE UPDATE REQUEST
 */
router.post(
  "/products/:id/requests",
  permissionMiddleware(MODULE, "Edit"),
  C.request
);

/*
 * DELETE ONE
 */
router.delete(
  "/products/:id",
  permissionMiddleware(MODULE, "Full"),
  C.delete
);

/*
 * DELETE ALL
 */
router.delete(
  "/products",
  permissionMiddleware(MODULE, "Full"),
  C.deleteAll
);

/* =========================================================
   REQUEST MANAGEMENT
========================================================= */

/*
 * LIST REQUESTS
 */
router.get(
  "/requests",
  permissionMiddleware(MODULE, "View"),
  C.requests
);

/*
 * APPROVE / REJECT REQUEST
 */
router.put(
  "/requests/:id",
  permissionMiddleware(MODULE, "Edit"),
  C.reviewRequest
);

/* =========================================================
   INSIGHT / ANALYTICS
========================================================= */

/*
 * GET COLLECTION INSIGHT
 */
router.get(
  "/insight",
  permissionMiddleware(MODULE, "View"),
  C.insight
);

/* =========================================================
   PERMISSIONS
========================================================= */

/*
 * GET COLLECTION TRACKING PERMISSIONS
 */
router.get(
  "/permissions",
  permissionMiddleware(MODULE, "Full"),
  C.permissions
);

/*
 * SAVE COLLECTION TRACKING PERMISSIONS
 */
router.put(
  "/permissions",
  permissionMiddleware(MODULE, "Full"),
  C.savePermissions
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;