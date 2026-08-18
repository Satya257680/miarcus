const Billing = require("../models/billingModel");

/* ======================================================
   ACTOR / LOGGED-IN USER
====================================================== */

const actorId = (req) => {
    return (
        req.user?.id ||
        req.user?.user_id ||
        null
    );
};

/* ======================================================
   NUMBER HELPER
====================================================== */

const numberValue = (
    value,
    fallback = 0
) => {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
};

/* ======================================================
   ITEM NORMALIZER
====================================================== */

const normalizeItems = (items) => {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .filter(
            (item) =>
                item &&
                item.product_name &&
                String(
                    item.product_name
                ).trim()
        )
        .map((item) => {

            const quantity =
                numberValue(
                    item.quantity
                );

            const rate =
                numberValue(
                    item.rate
                );

            const discount =
                numberValue(
                    item.discount
                );

            const gross =
                quantity * rate;

            const amount =
                Math.max(
                    0,
                    gross - discount
                );

            return {
                product_id:
                    item.product_id ||
                    null,

                product_name:
                    String(
                        item.product_name
                    ).trim(),

                quantity,

                rate,

                discount,

                amount
            };
        });
};

/* ======================================================
   CREATE BILL
====================================================== */

exports.createBill = (
    req,
    res
) => {

    const userId =
        actorId(req);

    const {
        bill_no,
        store_id,
        customer_name,
        bill_date,
        subtotal,
        discount = 0,
        tax = 0,
        grand_total,
        items = [],
        payment_type,
        payment_amount,
        transaction_reference
    } = req.body || {};

    /* --------------------------------------------------
       AUTHENTICATION
    -------------------------------------------------- */

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authenticated user is required."
        });
    }

    /* --------------------------------------------------
       VALIDATION
    -------------------------------------------------- */

    if (
        !bill_no ||
        !String(bill_no).trim()
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Bill number is required."
        });
    }

    if (!store_id) {
        return res.status(400).json({
            success: false,
            message:
                "Store is required."
        });
    }

    if (
        grand_total === undefined ||
        grand_total === null ||
        Number.isNaN(Number(grand_total))
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Grand total is required."
        });
    }

    if (!payment_type) {
        return res.status(400).json({
            success: false,
            message:
                "Payment type is required."
        });
    }

    /* --------------------------------------------------
       NORMALIZE ITEMS
    -------------------------------------------------- */

    const normalizedItems =
        normalizeItems(items);

    if (!normalizedItems.length) {
        return res.status(400).json({
            success: false,
            message:
                "At least one valid bill item is required."
        });
    }

    /* --------------------------------------------------
       BILL DATA
    -------------------------------------------------- */

    const billData = {
        bill_no:
            String(
                bill_no
            ).trim(),

        store_id,

        customer_name:
            customer_name
                ? String(
                    customer_name
                ).trim()
                : null,

        bill_date:
            bill_date ||
            new Date(),

        subtotal:
            numberValue(
                subtotal
            ),

        discount:
            numberValue(
                discount
            ),

        tax:
            numberValue(
                tax
            ),

        grand_total:
            numberValue(
                grand_total
            ),

        created_by:
            userId
    };

    /* --------------------------------------------------
       PAYMENT DATA
    -------------------------------------------------- */

    const paymentData = {
        payment_type:
            String(
                payment_type
            ).trim(),

        amount:
            numberValue(
                payment_amount ??
                grand_total
            ),

        transaction_reference:
            transaction_reference
                ? String(
                    transaction_reference
                ).trim()
                : null
    };

    console.log(
        "BILLING CREATE REQUEST:",
        {
            bill_no:
                billData.bill_no,

            store_id:
                billData.store_id,

            userId,

            grand_total:
                billData.grand_total
        }
    );

    /* --------------------------------------------------
       CREATE
    -------------------------------------------------- */

    Billing.createBill(
        billData,
        normalizedItems,
        paymentData,
        (err, result) => {

            if (err) {

                console.error(
                    "Billing create error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        err.message ||
                        "Failed to create bill."
                });
            }

            console.log(
                "BILL CREATED SUCCESSFULLY:",
                result
            );

            return res.status(201).json({
                success: true,
                message:
                    "Bill created successfully.",
                data:
                    result
            });
        }
    );
};

/* ======================================================
   GET ALL BILLS
====================================================== */

exports.getBills = (
    req,
    res
) => {

    Billing.getBills(
        req.query || {},
        (err, data) => {

            if (err) {

                console.error(
                    "Get bills error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to fetch bills.",
                    error:
                        process.env.NODE_ENV ===
                        "development"
                            ? err.message
                            : undefined
                });
            }

            return res.json({
                success: true,
                data:
                    data || []
            });
        }
    );
};

/* ======================================================
   GET SINGLE BILL
====================================================== */

exports.getBillById = (
    req,
    res
) => {

    const {
        id
    } = req.params;

    if (!id) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required."
        });
    }

    Billing.getBillById(
        id,
        (err, data) => {

            if (err) {

                console.error(
                    "Get bill error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to fetch bill.",
                    error:
                        process.env.NODE_ENV ===
                        "development"
                            ? err.message
                            : undefined
                });
            }

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Bill not found."
                });
            }

            return res.json({
                success: true,
                data
            });
        }
    );
};

/* ======================================================
   UPDATE BILL
====================================================== */

exports.updateBill = (
    req,
    res
) => {

    const {
        id
    } = req.params;

    const userId =
        actorId(req);

    if (!id) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authenticated user is required."
        });
    }

    const body =
        req.body || {};

    /* --------------------------------------------------
       NORMALIZE ITEMS
    -------------------------------------------------- */

    const normalizedItems =
        normalizeItems(
            body.items
        );

    if (!normalizedItems.length) {
        return res.status(400).json({
            success: false,
            message:
                "At least one valid bill item is required."
        });
    }

    /* --------------------------------------------------
       UPDATE DATA
    -------------------------------------------------- */

    const updateData = {

        store_id:
            body.store_id,

        customer_name:
            body.customer_name ??
            null,

        bill_date:
            body.bill_date ||
            new Date(),

        subtotal:
            numberValue(
                body.subtotal
            ),

        discount:
            numberValue(
                body.discount
            ),

        tax:
            numberValue(
                body.tax
            ),

        grand_total:
            numberValue(
                body.grand_total
            ),

        payment_type:
            body.payment_type ||
            "Cash",

        payment_amount:
            numberValue(
                body.payment_amount ??
                body.grand_total
            ),

        transaction_reference:
            body.transaction_reference
                ? String(
                    body.transaction_reference
                ).trim()
                : null,

        items:
            normalizedItems,

        updated_by:
            userId
    };

    /* --------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------- */

    if (!updateData.store_id) {
        return res.status(400).json({
            success: false,
            message:
                "Store is required."
        });
    }

    if (
        body.grand_total === undefined &&
        body.grand_total !== 0
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Grand total is required."
        });
    }

    console.log(
        "BILLING UPDATE REQUEST:",
        {
            id,
            userId,
            grand_total:
                updateData.grand_total
        }
    );

    /* --------------------------------------------------
       UPDATE
       Model handles:
       - old bill
       - transaction
       - bill update
       - item replacement
       - payment update
       - audit
       - commit
    -------------------------------------------------- */

    Billing.updateBill(
        id,
        updateData,
        (err, result) => {

            if (err) {

                console.error(
                    "Billing update error:",
                    err
                );

                const statusCode =
                    err.message ===
                    "Bill not found."
                        ? 404
                        : err.message ===
                          "Cancelled bills cannot be edited."
                            ? 400
                            : 500;

                return res.status(
                    statusCode
                ).json({
                    success: false,
                    message:
                        err.message ||
                        "Failed to update bill."
                });
            }

            console.log(
                "BILL UPDATED SUCCESSFULLY:",
                {
                    id
                }
            );

            return res.json({
                success: true,
                message:
                    "Bill updated successfully.",
                data:
                    result || {
                        id
                    }
            });
        }
    );
};

/* ======================================================
   CANCEL BILL
====================================================== */

exports.cancelBill = (
    req,
    res
) => {

    const {
        id
    } = req.params;

    const userId =
        actorId(req);

    if (!id) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required."
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authenticated user is required."
        });
    }

    console.log(
        "BILLING CANCEL REQUEST:",
        {
            id,
            userId
        }
    );

    /* --------------------------------------------------
       CANCEL
       Model handles:
       - old bill
       - transaction
       - status change
       - audit
       - commit
    -------------------------------------------------- */

    Billing.cancelBill(
        id,
        userId,
        (err, result) => {

            if (err) {

                console.error(
                    "Cancel bill error:",
                    err
                );

                const statusCode =
                    err.message ===
                    "Bill not found."
                        ? 404
                        : err.message ===
                          "Bill is already cancelled."
                            ? 400
                            : 500;

                return res.status(
                    statusCode
                ).json({
                    success: false,
                    message:
                        err.message ||
                        "Failed to cancel bill."
                });
            }

            console.log(
                "BILL CANCELLED SUCCESSFULLY:",
                {
                    id
                }
            );

            return res.json({
                success: true,
                message:
                    "Bill cancelled successfully.",
                data:
                    result || {
                        id,
                        status:
                            "CANCELLED"
                    }
            });
        }
    );
};

/* ======================================================
   DAILY BILLING REPORT
====================================================== */

exports.dailyReport = (
    req,
    res
) => {

    Billing.dailyReport(
        req.query || {},
        (err, data) => {

            if (err) {

                console.error(
                    "Daily billing report error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to generate daily report.",
                    error:
                        process.env.NODE_ENV ===
                        "development"
                            ? err.message
                            : undefined
                });
            }

            return res.json({
                success: true,
                data:
                    data || {
                        summary: {},
                        details: []
                    }
            });
        }
    );
};

/* ======================================================
   BILLING AUDIT
====================================================== */

exports.audit = (
    req,
    res
) => {

    const {
        billId
    } = req.params;

    if (!billId) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required."
        });
    }

    Billing.getBillingAudit(
        billId,
        (err, data) => {

            if (err) {

                console.error(
                    "Billing audit error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to fetch audit history.",
                    error:
                        process.env.NODE_ENV ===
                        "development"
                            ? err.message
                            : undefined
                });
            }

            return res.json({
                success: true,
                data:
                    data || []
            });
        }
    );
};

/* ======================================================
   EXPORT
====================================================== */