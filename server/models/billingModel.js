const db = require("../config/db");

const Billing = {};

/* ======================================================
   HELPERS
====================================================== */

const safeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const safeJson = (value) => {
    try {
        return JSON.stringify(value ?? null);
    } catch (error) {
        return JSON.stringify(null);
    }
};

const getBillForTransaction = async (connection, id) => {
    const [bills] = await connection.query(
        `
        SELECT
            b.*,
            s.store_name,
            u1.name AS created_by_name,
            u2.name AS updated_by_name
        FROM bills b
        LEFT JOIN stores s
            ON s.id = b.store_id
        LEFT JOIN users u1
            ON u1.id = b.created_by
        LEFT JOIN users u2
            ON u2.id = b.updated_by
        WHERE b.id = ?
        LIMIT 1
        `,
        [id]
    );

    if (!bills.length) {
        return null;
    }

    const [items] = await connection.query(
        `
        SELECT *
        FROM bill_items
        WHERE bill_id = ?
        ORDER BY id ASC
        `,
        [id]
    );

    const [payments] = await connection.query(
        `
        SELECT *
        FROM payments
        WHERE bill_id = ?
        ORDER BY id DESC
        `,
        [id]
    );

    return {
        ...bills[0],
        items: items || [],
        payments: payments || []
    };
};

/* ======================================================
   AUDIT LOG
====================================================== */

const createAuditLog = async (
    connection,
    {
        moduleName,
        referenceId,
        action,
        oldData = null,
        newData = null,
        changedBy = null
    }
) => {
    await connection.query(
        `
        INSERT INTO audit_logs
        (
            module_name,
            reference_id,
            action,
            old_data,
            new_data,
            changed_by,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        `,
        [
            moduleName,
            referenceId,
            action,
            safeJson(oldData),
            safeJson(newData),
            changedBy || null
        ]
    );
};

/* ======================================================
   CREATE BILL
====================================================== */

Billing.createBill = async (
    bill,
    items = [],
    payment = {},
    callback
) => {
    let connection = null;

    try {
        console.log("BILLING CREATE STARTED");
        console.log("Bill No:", bill.bill_no);
        console.log("Store ID:", bill.store_id);
        console.log("Grand Total:", bill.grand_total);

        connection = await db.getConnection();

        console.log("Billing DB connection acquired");

        await connection.beginTransaction();

        console.log("Billing transaction started");

        /* ------------------------------------------------
           INSERT BILL
        ------------------------------------------------ */

        const [billResult] = await connection.query(
            `
            INSERT INTO bills
            (
                bill_no,
                store_id,
                customer_name,
                bill_date,
                subtotal,
                discount,
                tax,
                grand_total,
                status,
                created_by,
                updated_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?)
            `,
            [
                bill.bill_no,
                bill.store_id,
                bill.customer_name || null,
                bill.bill_date || new Date(),
                safeNumber(bill.subtotal),
                safeNumber(bill.discount),
                safeNumber(bill.tax),
                safeNumber(bill.grand_total),
                bill.created_by || null,
                bill.created_by || null
            ]
        );

        const billId = billResult.insertId;

        console.log("Bill inserted:", billId);

        /* ------------------------------------------------
           INSERT ITEMS
        ------------------------------------------------ */

        const validItems = (items || []).filter(
            (item) =>
                item &&
                item.product_name &&
                String(item.product_name).trim()
        );

        const itemRows = validItems.map((item) => {
            const quantity = safeNumber(item.quantity);
            const rate = safeNumber(item.rate);
            const discount = safeNumber(item.discount);

            const amount =
                item.amount !== undefined
                    ? safeNumber(item.amount)
                    : Math.max(
                        0,
                        quantity * rate - discount
                    );

            return [
                billId,
                item.product_id || null,
                String(item.product_name).trim(),
                quantity,
                rate,
                discount,
                amount
            ];
        });

        if (itemRows.length) {
            await connection.query(
                `
                INSERT INTO bill_items
                (
                    bill_id,
                    product_id,
                    product_name,
                    quantity,
                    rate,
                    discount,
                    amount
                )
                VALUES ?
                `,
                [itemRows]
            );

            console.log(
                `${itemRows.length} bill item(s) inserted`
            );
        }

        /* ------------------------------------------------
           INSERT PAYMENT
        ------------------------------------------------ */

        const paymentType =
            payment?.payment_type || "Cash";

        const paymentAmount = safeNumber(
            payment?.amount ?? bill.grand_total
        );

        const transactionReference =
            payment?.transaction_reference || null;

        await connection.query(
            `
            INSERT INTO payments
            (
                bill_id,
                payment_type,
                amount,
                transaction_reference,
                status,
                payment_date,
                created_by
            )
            VALUES (?, ?, ?, ?, 'SUCCESS', NOW(), ?)
            `,
            [
                billId,
                paymentType,
                paymentAmount,
                transactionReference,
                bill.created_by || null
            ]
        );

        console.log("Payment inserted");

        /* ------------------------------------------------
           AUDIT
        ------------------------------------------------ */

        await createAuditLog(
            connection,
            {
                moduleName: "Billing",
                referenceId: billId,
                action: "CREATE",
                oldData: null,
                newData: {
                    bill_no: bill.bill_no,
                    store_id: bill.store_id,
                    customer_name:
                        bill.customer_name || null,
                    bill_date: bill.bill_date,
                    subtotal:
                        safeNumber(bill.subtotal),
                    discount:
                        safeNumber(bill.discount),
                    tax:
                        safeNumber(bill.tax),
                    grand_total:
                        safeNumber(bill.grand_total),
                    status: "PAID",
                    items: validItems,
                    payment: {
                        payment_type: paymentType,
                        amount: paymentAmount,
                        transaction_reference:
                            transactionReference
                    }
                },
                changedBy: bill.created_by
            }
        );

        /* ------------------------------------------------
           COMMIT
        ------------------------------------------------ */

        await connection.commit();

        console.log(
            "BILLING CREATE COMMITTED:",
            billId
        );

        connection.release();
        connection = null;

        return callback(null, {
            id: billId
        });

    } catch (error) {
        console.error(
            "BILLING CREATE ERROR:",
            error
        );

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Billing rollback error:",
                    rollbackError
                );
            }

            try {
                connection.release();
            } catch (releaseError) {
                console.error(
                    "Billing release error:",
                    releaseError
                );
            }

            connection = null;
        }

        return callback(error);
    }
};

/* ======================================================
   BILLING STORE LIST
====================================================== */

/*
 * Billing needs a read-only list of stores.
 *
 * This endpoint intentionally lives inside the Billing
 * module so Billing View permission is sufficient.
 *
 * We return only fields needed by Billing UI.
 */
Billing.getStores = (callback) => {
    const sql = `
        SELECT
            id,
            store_name,
            city,
            state,
            status
        FROM stores
        ORDER BY
            store_name ASC,
            id ASC
    `;

    db.query(
        sql,
        callback
    );
};

/* ======================================================
   GET ALL BILLS
====================================================== */

Billing.getBills = (
    filters = {},
    callback
) => {
    const where = [];
    const params = [];

    if (filters.date) {
        where.push(
            "DATE(b.bill_date) = ?"
        );
        params.push(filters.date);
    }

    if (filters.store_id) {
        where.push(
            "b.store_id = ?"
        );
        params.push(filters.store_id);
    }

    if (filters.payment_type) {
        where.push(
            "p.payment_type = ?"
        );
        params.push(filters.payment_type);
    }

    if (filters.status) {
        where.push(
            "b.status = ?"
        );
        params.push(filters.status);
    }

    if (filters.search) {
        where.push(
            `
            (
                b.bill_no LIKE ?
                OR b.customer_name LIKE ?
            )
            `
        );

        const search =
            `%${filters.search}%`;

        params.push(search, search);
    }

    const sql = `
        SELECT
            b.*,

            s.store_name,

            p.payment_type,
            p.transaction_reference,

            u1.name AS created_by_name,
            u2.name AS updated_by_name

        FROM bills b

        LEFT JOIN stores s
            ON s.id = b.store_id

        LEFT JOIN payments p
            ON p.id = (
                SELECT MAX(p2.id)
                FROM payments p2
                WHERE p2.bill_id = b.id
            )

        LEFT JOIN users u1
            ON u1.id = b.created_by

        LEFT JOIN users u2
            ON u2.id = b.updated_by

        ${
            where.length
                ? `WHERE ${where.join(" AND ")}`
                : ""
        }

        ORDER BY b.id DESC
    `;

    db.query(
        sql,
        params,
        callback
    );
};

/* ======================================================
   GET BILL BY ID
====================================================== */

Billing.getBillById = (
    id,
    callback
) => {
    db.query(
        `
        SELECT
            b.*,
            s.store_name,
            u1.name AS created_by_name,
            u2.name AS updated_by_name
        FROM bills b
        LEFT JOIN stores s
            ON s.id = b.store_id
        LEFT JOIN users u1
            ON u1.id = b.created_by
        LEFT JOIN users u2
            ON u2.id = b.updated_by
        WHERE b.id = ?
        LIMIT 1
        `,
        [id],
        (billError, bills) => {

            if (billError) {
                return callback(
                    billError
                );
            }

            if (!bills.length) {
                return callback(
                    null,
                    null
                );
            }

            db.query(
                `
                SELECT *
                FROM bill_items
                WHERE bill_id = ?
                ORDER BY id ASC
                `,
                [id],
                (itemError, items) => {

                    if (itemError) {
                        return callback(
                            itemError
                        );
                    }

                    db.query(
                        `
                        SELECT *
                        FROM payments
                        WHERE bill_id = ?
                        ORDER BY id DESC
                        `,
                        [id],
                        (
                            paymentError,
                            payments
                        ) => {

                            if (paymentError) {
                                return callback(
                                    paymentError
                                );
                            }

                            return callback(
                                null,
                                {
                                    ...bills[0],
                                    items:
                                        items || [],
                                    payments:
                                        payments || []
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

/* ======================================================
   UPDATE BILL
====================================================== */

Billing.updateBill = async (
    id,
    data,
    callback
) => {
    let connection = null;

    try {
        connection =
            await db.getConnection();

        await connection.beginTransaction();

        /* ------------------------------------------------
           GET OLD BILL
        ------------------------------------------------ */

        const oldBill =
            await getBillForTransaction(
                connection,
                id
            );

        if (!oldBill) {
            throw new Error(
                "Bill not found."
            );
        }

        if (
            String(oldBill.status)
                .toUpperCase() ===
            "CANCELLED"
        ) {
            throw new Error(
                "Cancelled bills cannot be edited."
            );
        }

        /* ------------------------------------------------
           UPDATE BILL
        ------------------------------------------------ */

        await connection.query(
            `
            UPDATE bills
            SET
                store_id = ?,
                customer_name = ?,
                bill_date = ?,
                subtotal = ?,
                discount = ?,
                tax = ?,
                grand_total = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                data.store_id,
                data.customer_name || null,
                data.bill_date ||
                    oldBill.bill_date,
                safeNumber(data.subtotal),
                safeNumber(data.discount),
                safeNumber(data.tax),
                safeNumber(data.grand_total),
                data.updated_by || null,
                id
            ]
        );

        /* ------------------------------------------------
           REPLACE ITEMS
        ------------------------------------------------ */

        await connection.query(
            `
            DELETE FROM bill_items
            WHERE bill_id = ?
            `,
            [id]
        );

        const validItems =
            (data.items || []).filter(
                (item) =>
                    item &&
                    item.product_name &&
                    String(
                        item.product_name
                    ).trim()
            );

        const itemRows =
            validItems.map((item) => {
                const quantity =
                    safeNumber(
                        item.quantity
                    );

                const rate =
                    safeNumber(
                        item.rate
                    );

                const discount =
                    safeNumber(
                        item.discount
                    );

                const amount =
                    item.amount !== undefined
                        ? safeNumber(
                            item.amount
                        )
                        : Math.max(
                            0,
                            quantity *
                                rate -
                                discount
                        );

                return [
                    id,
                    item.product_id ||
                        null,
                    String(
                        item.product_name
                    ).trim(),
                    quantity,
                    rate,
                    discount,
                    amount
                ];
            });

        if (itemRows.length) {
            await connection.query(
                `
                INSERT INTO bill_items
                (
                    bill_id,
                    product_id,
                    product_name,
                    quantity,
                    rate,
                    discount,
                    amount
                )
                VALUES ?
                `,
                [itemRows]
            );
        }

        /* ------------------------------------------------
           UPDATE PAYMENT
        ------------------------------------------------ */

        const paymentType =
            data.payment_type ||
            oldBill.payments?.[0]
                ?.payment_type ||
            "Cash";

        const paymentAmount =
            safeNumber(
                data.payment_amount ??
                data.grand_total
            );

        const reference =
            data.transaction_reference ||
            null;

        const latestPayment =
            oldBill.payments?.[0];

        if (latestPayment) {

            await connection.query(
                `
                UPDATE payments
                SET
                    payment_type = ?,
                    amount = ?,
                    transaction_reference = ?,
                    payment_date = NOW()
                WHERE id = ?
                `,
                [
                    paymentType,
                    paymentAmount,
                    reference,
                    latestPayment.id
                ]
            );

        } else {

            await connection.query(
                `
                INSERT INTO payments
                (
                    bill_id,
                    payment_type,
                    amount,
                    transaction_reference,
                    status,
                    payment_date,
                    created_by
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    'SUCCESS',
                    NOW(),
                    ?
                )
                `,
                [
                    id,
                    paymentType,
                    paymentAmount,
                    reference,
                    data.updated_by ||
                        null
                ]
            );
        }

        /* ------------------------------------------------
           GET UPDATED BILL
        ------------------------------------------------ */

        const newBill =
            await getBillForTransaction(
                connection,
                id
            );

        /* ------------------------------------------------
           AUDIT
        ------------------------------------------------ */

        await createAuditLog(
            connection,
            {
                moduleName: "Billing",
                referenceId: id,
                action: "UPDATE",
                oldData: oldBill,
                newData: newBill,
                changedBy:
                    data.updated_by
            }
        );

        /* ------------------------------------------------
           COMMIT
        ------------------------------------------------ */

        await connection.commit();

        connection.release();
        connection = null;

        console.log(
            "BILLING UPDATE COMMITTED:",
            id
        );

        return callback(
            null,
            { id }
        );

    } catch (error) {

        console.error(
            "BILLING UPDATE ERROR:",
            error
        );

        if (connection) {

            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Billing update rollback error:",
                    rollbackError
                );
            }

            try {
                connection.release();
            } catch (releaseError) {
                console.error(
                    "Billing update release error:",
                    releaseError
                );
            }

            connection = null;
        }

        return callback(error);
    }
};

/* ======================================================
   CANCEL BILL
====================================================== */

Billing.cancelBill = async (
    id,
    userId,
    callback
) => {
    let connection = null;

    try {
        connection =
            await db.getConnection();

        await connection.beginTransaction();

        /* ------------------------------------------------
           GET OLD BILL
        ------------------------------------------------ */

        const oldBill =
            await getBillForTransaction(
                connection,
                id
            );

        if (!oldBill) {
            throw new Error(
                "Bill not found."
            );
        }

        if (
            String(oldBill.status)
                .toUpperCase() ===
            "CANCELLED"
        ) {
            throw new Error(
                "Bill is already cancelled."
            );
        }

        /* ------------------------------------------------
           CANCEL
        ------------------------------------------------ */

        await connection.query(
            `
            UPDATE bills
            SET
                status = 'CANCELLED',
                updated_by = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                userId,
                id
            ]
        );

        /* ------------------------------------------------
           GET NEW BILL
        ------------------------------------------------ */

        const newBill =
            await getBillForTransaction(
                connection,
                id
            );

        /* ------------------------------------------------
           AUDIT
        ------------------------------------------------ */

        await createAuditLog(
            connection,
            {
                moduleName: "Billing",
                referenceId: id,
                action: "CANCEL",
                oldData: oldBill,
                newData: newBill,
                changedBy: userId
            }
        );

        /* ------------------------------------------------
           COMMIT
        ------------------------------------------------ */

        await connection.commit();

        connection.release();
        connection = null;

        console.log(
            "BILLING CANCEL COMMITTED:",
            id
        );

        return callback(
            null,
            {
                id,
                status: "CANCELLED"
            }
        );

    } catch (error) {

        console.error(
            "BILLING CANCEL ERROR:",
            error
        );

        if (connection) {

            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Billing cancel rollback error:",
                    rollbackError
                );
            }

            try {
                connection.release();
            } catch (releaseError) {
                console.error(
                    "Billing cancel release error:",
                    releaseError
                );
            }

            connection = null;
        }

        return callback(error);
    }
};

/* ======================================================
   DAILY BILLING REPORT
====================================================== */

Billing.dailyReport = (
    filters = {},
    callback
) => {

    const date =
        filters.date ||
        new Date()
            .toISOString()
            .slice(0, 10);

    const summaryParams = [date];

    let storeClause = "";

    if (filters.store_id) {
        storeClause =
            " AND b.store_id = ?";

        summaryParams.push(
            filters.store_id
        );
    }

    /* ------------------------------------------------
       SUMMARY
    ------------------------------------------------ */

    const summarySql = `
        SELECT

            COUNT(
                DISTINCT b.id
            ) AS total_bills,

            COALESCE(
                SUM(b.subtotal),
                0
            ) AS subtotal,

            COALESCE(
                SUM(b.discount),
                0
            ) AS discount,

            COALESCE(
                SUM(b.tax),
                0
            ) AS tax,

            COALESCE(
                SUM(b.grand_total),
                0
            ) AS grand_total,

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_type = 'Cash'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS cash,

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_type = 'UPI'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS upi,

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_type = 'Card'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS card,

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_type = 'Bank Transfer'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS bank_transfer,

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_type = 'Other'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS other

        FROM bills b

        LEFT JOIN payments p
            ON p.id = (
                SELECT MAX(p2.id)
                FROM payments p2
                WHERE p2.bill_id = b.id
            )

        WHERE
            DATE(b.bill_date) = ?

            AND b.status <> 'CANCELLED'

            ${storeClause}
    `;

    db.query(
        summarySql,
        summaryParams,
        (
            summaryError,
            summaryRows
        ) => {

            if (summaryError) {
                return callback(
                    summaryError
                );
            }

            /* ------------------------------------------------
               DETAILS
            ------------------------------------------------ */

            const detailParams = [date];

            let detailStoreClause = "";

            if (filters.store_id) {
                detailStoreClause =
                    " AND b.store_id = ?";

                detailParams.push(
                    filters.store_id
                );
            }

            const detailSql = `
                SELECT

                    b.id,
                    b.bill_no,
                    b.store_id,
                    b.customer_name,
                    b.bill_date,
                    b.subtotal,
                    b.discount,
                    b.tax,
                    b.grand_total,
                    b.status,

                    s.store_name,

                    p.payment_type,
                    p.transaction_reference,
                    p.amount AS payment_amount,

                    u1.name AS created_by_name,
                    u2.name AS updated_by_name

                FROM bills b

                LEFT JOIN stores s
                    ON s.id = b.store_id

                LEFT JOIN payments p
                    ON p.id = (
                        SELECT MAX(p2.id)
                        FROM payments p2
                        WHERE p2.bill_id = b.id
                    )

                LEFT JOIN users u1
                    ON u1.id = b.created_by

                LEFT JOIN users u2
                    ON u2.id = b.updated_by

                WHERE
                    DATE(b.bill_date) = ?

                    AND b.status <> 'CANCELLED'

                    ${detailStoreClause}

                ORDER BY
                    b.bill_date DESC,
                    b.id DESC
            `;

            db.query(
                detailSql,
                detailParams,
                (
                    detailError,
                    details
                ) => {

                    if (detailError) {
                        return callback(
                            detailError
                        );
                    }

                    return callback(
                        null,
                        {
                            summary:
                                summaryRows[0] ||
                                {
                                    total_bills: 0,
                                    subtotal: 0,
                                    discount: 0,
                                    tax: 0,
                                    grand_total: 0,
                                    cash: 0,
                                    upi: 0,
                                    card: 0,
                                    bank_transfer: 0,
                                    other: 0
                                },

                            details:
                                details || []
                        }
                    );
                }
            );
        }
    );
};

/* ======================================================
   BILLING AUDIT
====================================================== */

Billing.getBillingAudit = (
    billId,
    callback
) => {

    const sql = `
        SELECT

            a.id,
            a.module_name,
            a.reference_id,
            a.action,
            a.old_data,
            a.new_data,
            a.changed_by,
            a.created_at,

            u.name AS changed_by_name,
            u.email AS changed_by_email

        FROM audit_logs a

        LEFT JOIN users u
            ON u.id = a.changed_by

        WHERE
            a.module_name = 'Billing'

            AND a.reference_id = ?

        ORDER BY
            a.created_at DESC,
            a.id DESC
    `;

    db.query(
        sql,
        [billId],
        callback
    );
};

/* ======================================================
   EXPORT
====================================================== */

module.exports = Billing;