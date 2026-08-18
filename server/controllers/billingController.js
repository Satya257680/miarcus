const Billing = require("../models/billingModel");

/* ======================================================
   ACTOR / LOGGED-IN USER
====================================================== */

const actorId = (req) => {
    return (
        req.user?.id ||
        req.user?.user_id ||
        req.body?.created_by ||
        null
    );
};

/* ======================================================
   NUMBER HELPER
====================================================== */

const numberValue = (value, fallback = 0) => {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
};

/* ======================================================
   CREATE BILL
====================================================== */

exports.createBill = (req, res) => {
    const userId = actorId(req);

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
        transaction_reference,
    } = req.body;

    /* ======================================
       VALIDATION
    ====================================== */

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authenticated user is required.",
        });
    }

    if (!bill_no) {
        return res.status(400).json({
            success: false,
            message:
                "Bill number is required.",
        });
    }

    if (!store_id) {
        return res.status(400).json({
            success: false,
            message:
                "Store is required.",
        });
    }

    if (
        grand_total === undefined ||
        grand_total === null
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Grand total is required.",
        });
    }

    if (!payment_type) {
        return res.status(400).json({
            success: false,
            message:
                "Payment type is required.",
        });
    }

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message:
                "At least one bill item is required.",
        });
    }

    /* ======================================
       NORMALIZE ITEMS
    ====================================== */

    const normalizedItems =
        items
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

                const itemDiscount =
                    numberValue(
                        item.discount
                    );

                const gross =
                    quantity * rate;

                const amount = Math.max(
                    0,
                    gross - itemDiscount
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

                    discount:
                        itemDiscount,

                    amount,
                };
            });

    if (
        !normalizedItems.length
    ) {
        return res.status(400).json({
            success: false,
            message:
                "At least one valid bill item is required.",
        });
    }

    /* ======================================
       BILL DATA
    ====================================== */

    const billData = {
        bill_no:
            String(bill_no).trim(),

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
            numberValue(subtotal),

        discount:
            numberValue(discount),

        tax:
            numberValue(tax),

        grand_total:
            numberValue(grand_total),

        created_by:
            userId,
    };

    /* ======================================
       PAYMENT DATA
    ====================================== */

    const paymentData = {
        payment_type,

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
                : null,
    };

    /* ======================================
       CREATE
    ====================================== */

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
                        "Failed to create bill.",
                    error:
                        process.env.NODE_ENV ===
                        "development"
                            ? err.message
                            : undefined,
                });
            }

            return res.status(201).json({
                success: true,
                message:
                    "Bill created successfully.",
                data: result,
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
                });
            }

            return res.json({
                success: true,
                data: data || [],
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
    const { id } =
        req.params;

    if (!id) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required.",
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
                });
            }

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Bill not found.",
                });
            }

            return res.json({
                success: true,
                data,
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
    const { id } =
        req.params;

    const userId =
        actorId(req);

    if (!id) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required.",
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authenticated user is required.",
        });
    }

    /* ======================================
       LOAD CURRENT BILL
       Used for validation only.
       The model also performs its own
       transaction-safe old/new audit.
    ====================================== */

    Billing.getBillById(
        id,
        (beforeError, before) => {
            if (beforeError) {
                console.error(
                    "Load bill before update error:",
                    beforeError
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to load bill.",
                });
            }

            if (!before) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Bill not found.",
                });
            }

            if (
                String(
                    before.status
                ).toUpperCase() ===
                "CANCELLED"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Cancelled bills cannot be edited.",
                });
            }

            /* ==================================
               NORMALIZE ITEMS
            ================================== */

            const normalizedItems =
                Array.isArray(
                    req.body.items
                )
                    ? req.body.items
                          .filter(
                              (item) =>
                                  item &&
                                  item.product_name &&
                                  String(
                                      item.product_name
                                  ).trim()
                          )
                          .map(
                              (item) => {
                                  const quantity =
                                      numberValue(
                                          item.quantity
                                      );

                                  const rate =
                                      numberValue(
                                          item.rate
                                      );

                                  const itemDiscount =
                                      numberValue(
                                          item.discount
                                      );

                                  const amount =
                                      Math.max(
                                          0,
                                          quantity *
                                              rate -
                                              itemDiscount
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

                                      discount:
                                          itemDiscount,

                                      amount,
                                  };
                              }
                          )
                    : before.items ||
                      [];

            /* ==================================
               UPDATE DATA
            ================================== */

            const updateData = {
                ...req.body,

                store_id:
                    req.body.store_id ??
                    before.store_id,

                customer_name:
                    req.body.customer_name ??
                    before.customer_name,

                bill_date:
                    req.body.bill_date ??
                    before.bill_date,

                subtotal:
                    numberValue(
                        req.body.subtotal ??
                            before.subtotal
                    ),

                discount:
                    numberValue(
                        req.body.discount ??
                            before.discount
                    ),

                tax:
                    numberValue(
                        req.body.tax ??
                            before.tax
                    ),

                grand_total:
                    numberValue(
                        req.body.grand_total ??
                            before.grand_total
                    ),

                payment_type:
                    req.body.payment_type ??
                    before.payments?.[0]
                        ?.payment_type ??
                    "Cash",

                payment_amount:
                    numberValue(
                        req.body.payment_amount ??
                            req.body.grand_total ??
                            before.grand_total
                    ),

                transaction_reference:
                    req.body
                        .transaction_reference ??
                    before.payments?.[0]
                        ?.transaction_reference ??
                    null,

                items:
                    normalizedItems,

                updated_by:
                    userId,
            };

            /* ==================================
               UPDATE
            ================================== */

            Billing.updateBill(
                id,
                updateData,
                (err, result) => {
                    if (err) {
                        console.error(
                            "Billing update error:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                err.message ||
                                "Failed to update bill.",
                        });
                    }

                    return res.json({
                        success: true,
                        message:
                            "Bill updated successfully.",
                        data:
                            result || {
                                id,
                            },
                    });
                }
            );
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
    const { id } =
        req.params;

    const userId =
        actorId(req);

    if (!id) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required.",
        });
    }

    if (!userId) {
        return res.status(401).json({
            success: false,
            message:
                "Authenticated user is required.",
        });
    }

    Billing.getBillById(
        id,
        (beforeError, before) => {
            if (beforeError) {
                console.error(
                    "Load bill before cancellation error:",
                    beforeError
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to load bill.",
                });
            }

            if (!before) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Bill not found.",
                });
            }

            if (
                String(
                    before.status
                ).toUpperCase() ===
                "CANCELLED"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Bill is already cancelled.",
                });
            }

            Billing.cancelBill(
                id,
                userId,
                (err, result) => {
                    if (err) {
                        console.error(
                            "Cancel bill error:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                err.message ||
                                "Failed to cancel bill.",
                        });
                    }

                    return res.json({
                        success: true,
                        message:
                            "Bill cancelled successfully.",
                        data:
                            result || {
                                id,
                                status:
                                    "CANCELLED",
                            },
                    });
                }
            );
        }
    );
};

/* ======================================================
   DAILY REPORT
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
                });
            }

            return res.json({
                success: true,
                data: data || {
                    summary: {},
                    details: [],
                },
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
    const { billId } =
        req.params;

    if (!billId) {
        return res.status(400).json({
            success: false,
            message:
                "Bill ID is required.",
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
                });
            }

            return res.json({
                success: true,
                data: data || [],
            });
        }
    );
};