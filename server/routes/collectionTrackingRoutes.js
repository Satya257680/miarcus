const express = require("express");
const multer = require("multer");
const path = require("path");

const auth = require("../middleware/authMiddleware");
const C = require("../controllers/collectionTrackingController");

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
  C.configs
);

/*
 * PUT
 * /api/collection-tracking/configs/:stage
 */
router.put(
  "/configs/:stage",
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
  C.export
);

/*
 * LIST
 */
router.get(
  "/products",
  C.list
);

/*
 * VIEW ONE PRODUCT
 */
router.get(
  "/products/:id",
  C.view
);

/*
 * UPDATE CURRENT STAGE
 */
router.put(
  "/products/:id/stage",
  C.updateStage
);

/*
 * ADD REMARK / COMMENT
 */
router.post(
  "/products/:id/comments",
  C.comment
);

/*
 * CREATE UPDATE REQUEST
 */
router.post(
  "/products/:id/requests",
  C.request
);

/*
 * DELETE ONE
 */
router.delete(
  "/products/:id",
  C.delete
);

/*
 * DELETE ALL
 */
router.delete(
  "/products",
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
  C.requests
);

/*
 * APPROVE / REJECT REQUEST
 */
router.put(
  "/requests/:id",
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
  C.permissions
);

/*
 * SAVE COLLECTION TRACKING PERMISSIONS
 */
router.put(
  "/permissions",
  C.savePermissions
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;