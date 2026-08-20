const express = require("express");
const multer = require("multer");
const path = require("path");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const controller = require("../controllers/salesTeamController");

const router = express.Router();

/* =====================================================
   FILE UPLOAD CONFIGURATION
===================================================== */

const upload = multer({
  dest: path.resolve(__dirname, "../uploads/"),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(csv|xlsx|xls)$/i;

    if (allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only CSV, XLSX and XLS files are allowed."
        )
      );
    }
  },
});

const attachmentUpload = multer({
  dest: path.resolve(__dirname, "../uploads/"),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/* =====================================================
   EMPLOYEES / STORES
===================================================== */

router.get(
  "/employees",
  authMiddleware,
  permissionMiddleware("Visit Planner", "View"),
  controller.employees
);

router.get(
  "/stores",
  authMiddleware,
  permissionMiddleware("Visit Planner", "View"),
  controller.stores
);

/* =====================================================
   VISIT PLANNER
===================================================== */

/*
  GET
  List planned visits
*/
router.get(
  "/visit-plans",
  authMiddleware,
  permissionMiddleware("Visit Planner", "View"),
  controller.getVisitPlans
);

/*
  EXPORT
  Export planned visits
*/
router.get(
  "/visit-plans/export",
  authMiddleware,
  permissionMiddleware("Visit Planner", "View"),
  controller.exportVisitPlans
);

/*
  CREATE
  New visit is created as PENDING.
  It must NOT become approved automatically.
*/
router.post(
  "/visit-plans",
  authMiddleware,
  permissionMiddleware("Visit Planner", "Add"),
  controller.createVisitPlan
);

/*
  BULK IMPORT
  Imported visits must also remain PENDING
  until approved.
*/
router.post(
  "/visit-plans/import",
  authMiddleware,
  permissionMiddleware("Visit Planner", "Add"),
  upload.single("file"),
  controller.importVisitPlans
);

/*
  UPDATE
*/
router.put(
  "/visit-plans/:id",
  authMiddleware,
  permissionMiddleware("Visit Planner", "Edit"),
  controller.updateVisitPlan
);

/*
  DELETE SINGLE
*/
router.delete(
  "/visit-plans/:id",
  authMiddleware,
  permissionMiddleware("Visit Planner", "Full"),
  controller.deleteVisitPlan
);

/*
  DELETE ALL
*/
router.delete(
  "/visit-plans",
  authMiddleware,
  permissionMiddleware("Visit Planner", "Full"),
  controller.deleteAllVisitPlans
);

/* =====================================================
   TRAVEL PLAN
===================================================== */

/*
  GET TRAVEL PLANS

  Employee/admin can view travel plans according
  to the Travel Plan permission.
*/
router.get(
  "/travel-plans",
  authMiddleware,
  permissionMiddleware("Travel Plan", "View"),
  controller.getTravelPlans
);

/*
  UPDATE ACTUAL STORES
*/
router.put(
  "/travel-plans/:id/actual-stores",
  authMiddleware,
  permissionMiddleware("Travel Plan", "Edit"),
  controller.saveActualStores
);

/*
  HISTORY
*/
router.get(
  "/travel-plans/:id/history",
  authMiddleware,
  permissionMiddleware("Travel Plan", "View"),
  controller.getHistory
);

/*
  REMARKS + ATTACHMENT
*/
router.post(
  "/travel-plans/:id/remarks",
  authMiddleware,
  permissionMiddleware("Travel Plan", "Edit"),
  attachmentUpload.single("attachment"),
  controller.addRemark
);

/*
  DELETE TRAVEL PLAN
*/
router.delete(
  "/travel-plans/:id",
  authMiddleware,
  permissionMiddleware("Travel Plan", "Full"),
  controller.deleteTravelPlan
);

/* =====================================================
   TRAVEL PLAN APPROVALS
===================================================== */

/*
  GET PENDING APPROVALS

  Only users with Travel Plan Approvals -> View
  can access pending requests.
*/
router.get(
  "/approvals",
  authMiddleware,
  permissionMiddleware("Travel Plan Approvals", "View"),
  controller.getApprovals
);

/*
  APPROVE

  Only an authorized approver can approve.
  Controller should:
    1. Verify the request is pending.
    2. Verify the current user is allowed to approve it.
    3. Change status to APPROVED.
    4. Create notification for employee.
    5. Send approval email.
*/
router.post(
  "/approvals/approve",
  authMiddleware,
  permissionMiddleware("Travel Plan Approvals", "Edit"),
  controller.approve
);

/*
  REJECT

  Only an authorized approver can reject.
  Controller should:
    1. Verify the request is pending.
    2. Verify the current user is allowed to reject it.
    3. Change status to REJECTED.
    4. Save rejection reason.
    5. Create notification for employee.
    6. Send rejection email.
*/
router.post(
  "/approvals/reject",
  authMiddleware,
  permissionMiddleware("Travel Plan Approvals", "Edit"),
  controller.reject
);

/* =====================================================
   SALES REVIEW
===================================================== */

/*
  GET SALES REVIEW
*/
router.get(
  "/sales-review",
  authMiddleware,
  permissionMiddleware("Sales Review", "View"),
  controller.getSalesReview
);

/*
  EXPORT SALES REVIEW
*/
router.get(
  "/sales-review/export",
  authMiddleware,
  permissionMiddleware("Sales Review", "View"),
  controller.exportSalesReview
);

/*
  UPLOAD SALES REVIEW CSV/XLS/XLSX
*/
router.post(
  "/sales-review/upload",
  authMiddleware,
  permissionMiddleware("Sales Review", "Add"),
  upload.single("file"),
  controller.uploadSalesReview
);

/*
  UPDATE BENCHMARKS
*/
router.put(
  "/sales-review/benchmarks",
  authMiddleware,
  permissionMiddleware("Sales Review", "Edit"),
  controller.updateBenchmarks
);

/*
  DELETE ALL SALES REVIEW DATA
*/
router.delete(
  "/sales-review",
  authMiddleware,
  permissionMiddleware("Sales Review", "Full"),
  controller.deleteAllSalesReview
);

/* =====================================================
   ERROR HANDLER FOR MULTER
===================================================== */

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size cannot exceed 10 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  }

  next();
});

/* =====================================================
   EXPORT ROUTER
===================================================== */

module.exports = router;