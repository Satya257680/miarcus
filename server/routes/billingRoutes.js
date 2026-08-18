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

const billingController = require(
    "../controllers/billingController"
);

/* ======================================================
   BILLING PERMISSIONS
====================================================== */

const canViewBilling =
    permissionMiddleware(
        "Billing",
        "View"
    );

const canAddBilling =
    permissionMiddleware(
        "Billing",
        "Add"
    );

const canEditBilling =
    permissionMiddleware(
        "Billing",
        "Edit"
    );

/* ======================================================
   BILLING ROUTES
====================================================== */

/*
    IMPORTANT ROUTE ORDER

    Specific routes MUST come before:

        /:id

    Otherwise Express could interpret:

        /reports/daily

    as:

        /:id

    and:

        /audit/123

    incorrectly.
*/

/* ======================================================
   DAILY REPORT
====================================================== */

/**
 * GET /api/billing/reports/daily
 *
 * Permission:
 * Billing → View
 *
 * Query:
 * ?date=2026-08-18
 * ?date=2026-08-18&store_id=2
 */
router.get(
    "/reports/daily",
    authMiddleware,
    canViewBilling,
    billingController.dailyReport
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
 * - Old Data
 * - New Data
 * - Changed By
 * - Date / Time
 */
router.get(
    "/audit/:billId",
    authMiddleware,
    canViewBilling,
    billingController.audit
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
    canViewBilling,
    billingController.getBills
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
    canAddBilling,
    billingController.createBill
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
 * - Bill Items
 * - Payment
 * - UPDATE Audit
 */
router.put(
    "/:id",
    authMiddleware,
    canEditBilling,
    billingController.updateBill
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
 * This is a SOFT CANCEL.
 *
 * The database record remains.
 *
 * Status:
 *
 *     CANCELLED
 *
 * An audit record is also created.
 */
router.post(
    "/:id/cancel",
    authMiddleware,
    canEditBilling,
    billingController.cancelBill
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
 * - Bill
 * - Store
 * - Customer
 * - Items
 * - Payments
 * - Created By
 * - Updated By
 *
 * IMPORTANT:
 * This route stays AFTER all specific routes.
 */
router.get(
    "/:id",
    authMiddleware,
    canViewBilling,
    billingController.getBillById
);

/* ======================================================
   EXPORT
====================================================== */

module.exports = router;