const express = require("express");

const router = express.Router();

/* ======================================================
   MIDDLEWARE
====================================================== */

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const permissionMiddleware = require(
    "../middleware/permissionMiddleware"
);

/* ======================================================
   CONTROLLER
====================================================== */

const controller = require(
    "../controllers/billingController"
);

/* ======================================================
   BILLING PERMISSIONS
====================================================== */

const view = permissionMiddleware(
    "Billing",
    "View"
);

const add = permissionMiddleware(
    "Billing",
    "Add"
);

const edit = permissionMiddleware(
    "Billing",
    "Edit"
);

/* ======================================================
   DAILY REPORT
====================================================== */

/**
 * GET /api/billing/reports/daily
 *
 * Permission:
 * Billing → View
 *
 * Example:
 *
 * /api/billing/reports/daily?date=2026-08-18
 *
 * /api/billing/reports/daily?date=2026-08-18&store_id=2
 */
router.get(
    "/reports/daily",
    authMiddleware,
    view,
    controller.dailyReport
);

/* ======================================================
   BILLING AUDIT
====================================================== */

/**
 * GET /api/billing/audit/:billId
 *
 * Permission:
 * Billing → View
 *
 * Returns:
 * - CREATE
 * - UPDATE
 * - CANCEL
 * - Changed By
 * - Old Data
 * - New Data
 * - Date / Time
 */
router.get(
    "/audit/:billId",
    authMiddleware,
    view,
    controller.audit
);

/* ======================================================
   GET ALL BILLS
====================================================== */

/**
 * GET /api/billing
 *
 * Permission:
 * Billing → View
 *
 * Supports:
 * - search
 * - store_id
 * - status
 * - payment_type
 * - date
 */
router.get(
    "/",
    authMiddleware,
    view,
    controller.getBills
);

/* ======================================================
   GET SINGLE BILL
====================================================== */

/**
 * GET /api/billing/:id
 *
 * Permission:
 * Billing → View
 *
 * Returns:
 * - Bill information
 * - Store
 * - Customer
 * - Items
 * - Payments
 * - Created By
 * - Updated By
 */
router.get(
    "/:id",
    authMiddleware,
    view,
    controller.getBillById
);

/* ======================================================
   CREATE BILL
====================================================== */

/**
 * POST /api/billing
 *
 * Permission:
 * Billing → Add
 *
 * Creates:
 * - Bill
 * - Bill Items
 * - Payment
 * - CREATE Audit
 */
router.post(
    "/",
    authMiddleware,
    add,
    controller.createBill
);

/* ======================================================
   UPDATE BILL
====================================================== */

/**
 * PUT /api/billing/:id
 *
 * Permission:
 * Billing → Edit
 *
 * Updates:
 * - Bill
 * - Items
 * - Payment
 * - UPDATE Audit
 */
router.put(
    "/:id",
    authMiddleware,
    edit,
    controller.updateBill
);

/* ======================================================
   CANCEL BILL
====================================================== */

/**
 * POST /api/billing/:id/cancel
 *
 * Permission:
 * Billing → Edit
 *
 * IMPORTANT:
 * This performs a soft delete.
 *
 * The bill remains in the database
 * with:
 *
 * status = CANCELLED
 *
 * and an audit record is created.
 */
router.post(
    "/:id/cancel",
    authMiddleware,
    edit,
    controller.cancelBill
);

/* ======================================================
   EXPORT
====================================================== */

module.exports = router;