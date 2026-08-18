const db = require("../config/db");

const Billing = {};

/* ======================================================
   HELPERS
====================================================== */

const safeNumber = (value) => {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
};

const safeJson = (value) => {
    try {
        return JSON.stringify(value ?? null);
    } catch (error) {
        return JSON.stringify(null);
    }
};

const releaseConnection = (connection) => {
    if (connection) {
        connection.release();
    }
};

const rollbackAndRelease = (
    connection,
    error,
    callback
) => {
    connection.rollback(() => {
        releaseConnection(connection);
        callback(error);
    });
};

/* ======================================================
   BILL SNAPSHOT
   Used for UPDATE / CANCEL audit history
====================================================== */

const getBillForTransaction = (
    connection,
    id,
    callback
) => {
    const billSql = `
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
    `;

    connection.query(
        billSql,
        [id],
        (billError, bills) => {
            if (billError) {
                return callback(billError);
            }

            if (!bills || !bills.length) {
                return callback(null, null);
            }

            const bill = bills[0];

            connection.query(
                `
                    SELECT
                        *
                    FROM bill_items
                    WHERE bill_id = ?
                    ORDER BY id ASC
                `,
                [id],
                (itemError, items) => {
                    if (itemError) {
                        return callback(itemError);
                    }

                    connection.query(
                        `
                            SELECT
                                *
                            FROM payments
                            WHERE bill_id = ?
                            ORDER BY id DESC
                        `,
                        [id],
                        (paymentError, payments) => {
                            if (paymentError) {
                                return callback(paymentError);
                            }

                            callback(null, {
                                ...bill,
                                items: items || [],
                                payments: payments || [],
                            });
                        }
                    );
                }
            );
        }
    );
};

/* ======================================================
   AUDIT LOG

   IMPORTANT:
   Your MySQL audit_logs table uses:

   module_name
   reference_id

   NOT:

   table_name
   record_id
====================================================== */

const createAuditLog = (
    connection,
    {
        moduleName,
        referenceId,
        action,
        oldData = null,
        newData = null,
        changedBy = null,
    },
    callback
) => {
    const sql = `
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
    `;

    connection.query(
        sql,
        [
            moduleName,
            referenceId,
            action,
            safeJson(oldData),
            safeJson(newData),
            changedBy || null,
        ],
        callback
    );
};

/* ======================================================
   CREATE BILL
====================================================== */

Billing.createBill = (
    bill,
    items,
    payment,
    callback
) => {
    db.getConnection(
        (connectionError, connection) => {
            if (connectionError) {
                return callback(connectionError);
            }

            connection.beginTransaction(
                (transactionError) => {
                    if (transactionError) {
                        releaseConnection(connection);
                        return callback(transactionError);
                    }

                    /* ======================================
                       INSERT BILL
                    ====================================== */

                    const billSql = `
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
                    `;

                    const billValues = [
                        bill.bill_no,
                        bill.store_id,
                        bill.customer_name || null,
                        bill.bill_date || new Date(),
                        safeNumber(bill.subtotal),
                        safeNumber(bill.discount),
                        safeNumber(bill.tax),
                        safeNumber(bill.grand_total),
                        bill.created_by,
                        bill.created_by,
                    ];

                    connection.query(
                        billSql,
                        billValues,
                        (billError, result) => {
                            if (billError) {
                                return rollbackAndRelease(
                                    connection,
                                    billError,
                                    callback
                                );
                            }

                            const billId = result.insertId;

                            /* ==================================
                               PREPARE ITEMS
                            ================================== */

                            const validItems = (
                                items || []
                            ).filter(
                                (item) =>
                                    item &&
                                    item.product_name &&
                                    String(
                                        item.product_name
                                    ).trim()
                            );

                            const itemRows = validItems.map(
                                (item) => [
                                    billId,
                                    item.product_id || null,
                                    String(
                                        item.product_name
                                    ).trim(),
                                    safeNumber(item.quantity),
                                    safeNumber(item.rate),
                                    safeNumber(item.discount),
                                    safeNumber(item.amount),
                                ]
                            );

                            /* ==================================
                               INSERT ITEMS
                            ================================== */

                            const insertItems = (next) => {
                                if (!itemRows.length) {
                                    return next(null);
                                }

                                const itemSql = `
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
                                `;

                                connection.query(
                                    itemSql,
                                    [itemRows],
                                    next
                                );
                            };

                            insertItems((itemError) => {
                                if (itemError) {
                                    return rollbackAndRelease(
                                        connection,
                                        itemError,
                                        callback
                                    );
                                }

                                /* ==================================
                                   INSERT PAYMENT
                                ================================== */

                                const paymentType =
                                    payment?.payment_type ||
                                    "Cash";

                                const paymentAmount =
                                    safeNumber(
                                        payment?.amount ??
                                            bill.grand_total
                                    );

                                const transactionReference =
                                    payment
                                        ?.transaction_reference ||
                                    null;

                                const paymentSql = `
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
                                `;

                                connection.query(
                                    paymentSql,
                                    [
                                        billId,
                                        paymentType,
                                        paymentAmount,
                                        transactionReference,
                                        bill.created_by,
                                    ],
                                    (paymentError) => {
                                        if (paymentError) {
                                            return rollbackAndRelease(
                                                connection,
                                                paymentError,
                                                callback
                                            );
                                        }

                                        /* ==========================
                                           CREATE AUDIT
                                        ========================== */

                                        const auditData = {
                                            bill_no:
                                                bill.bill_no,

                                            store_id:
                                                bill.store_id,

                                            customer_name:
                                                bill.customer_name ||
                                                null,

                                            bill_date:
                                                bill.bill_date,

                                            subtotal:
                                                safeNumber(
                                                    bill.subtotal
                                                ),

                                            discount:
                                                safeNumber(
                                                    bill.discount
                                                ),

                                            tax:
                                                safeNumber(
                                                    bill.tax
                                                ),

                                            grand_total:
                                                safeNumber(
                                                    bill.grand_total
                                                ),

                                            status: "PAID",

                                            items:
                                                validItems,

                                            payment: {
                                                payment_type:
                                                    paymentType,

                                                amount:
                                                    paymentAmount,

                                                transaction_reference:
                                                    transactionReference,
                                            },
                                        };

                                        createAuditLog(
                                            connection,
                                            {
                                                moduleName:
                                                    "Billing",

                                                referenceId:
                                                    billId,

                                                action:
                                                    "CREATE",

                                                oldData:
                                                    null,

                                                newData:
                                                    auditData,

                                                changedBy:
                                                    bill.created_by,
                                            },
                                            (auditError) => {
                                                if (auditError) {
                                                    return rollbackAndRelease(
                                                        connection,
                                                        auditError,
                                                        callback
                                                    );
                                                }

                                                /* ==================
                                                   COMMIT
                                                ================== */

                                                connection.commit(
                                                    (commitError) => {
                                                        if (
                                                            commitError
                                                        ) {
                                                            return rollbackAndRelease(
                                                                connection,
                                                                commitError,
                                                                callback
                                                            );
                                                        }

                                                        releaseConnection(
                                                            connection
                                                        );

                                                        return callback(
                                                            null,
                                                            {
                                                                id:
                                                                    billId,
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            });
                        }
                    );
                }
            );
        }
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

    /* ======================================
       DATE
    ====================================== */

    if (filters.date) {
        where.push(
            "DATE(b.bill_date) = ?"
        );

        params.push(filters.date);
    }

    /* ======================================
       STORE
    ====================================== */

    if (filters.store_id) {
        where.push(
            "b.store_id = ?"
        );

        params.push(filters.store_id);
    }

    /* ======================================
       PAYMENT TYPE
    ====================================== */

    if (filters.payment_type) {
        where.push(
            "p.payment_type = ?"
        );

        params.push(filters.payment_type);
    }

    /* ======================================
       STATUS
    ====================================== */

    if (filters.status) {
        where.push(
            "b.status = ?"
        );

        params.push(filters.status);
    }

    /* ======================================
       SEARCH
    ====================================== */

    if (filters.search) {
        where.push(`
            (
                b.bill_no LIKE ?
                OR b.customer_name LIKE ?
            )
        `);

        const search =
            `%${filters.search}%`;

        params.push(
            search,
            search
        );
    }

    /* ======================================
       QUERY
    ====================================== */

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
   GET SINGLE BILL
====================================================== */

Billing.getBillById = (
    id,
    callback
) => {
    const billSql = `
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
    `;

    db.query(
        billSql,
        [id],
        (billError, bills) => {
            if (billError) {
                return callback(billError);
            }

            if (!bills || !bills.length) {
                return callback(null, null);
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
                        return callback(itemError);
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
                                        payments || [],
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

Billing.updateBill = (
    id,
    data,
    callback
) => {
    db.getConnection(
        (connectionError, connection) => {
            if (connectionError) {
                return callback(connectionError);
            }

            connection.beginTransaction(
                (transactionError) => {
                    if (transactionError) {
                        releaseConnection(connection);
                        return callback(transactionError);
                    }

                    /* ======================================
                       GET OLD BILL
                    ====================================== */

                    getBillForTransaction(
                        connection,
                        id,
                        (oldError, oldBill) => {
                            if (oldError) {
                                return rollbackAndRelease(
                                    connection,
                                    oldError,
                                    callback
                                );
                            }

                            if (!oldBill) {
                                return rollbackAndRelease(
                                    connection,
                                    new Error(
                                        "Bill not found."
                                    ),
                                    callback
                                );
                            }

                            /* ==================================
                               CANCELLED BILL CHECK
                            ================================== */

                            if (
                                String(
                                    oldBill.status
                                ).toUpperCase() ===
                                "CANCELLED"
                            ) {
                                return rollbackAndRelease(
                                    connection,
                                    new Error(
                                        "Cancelled bills cannot be edited."
                                    ),
                                    callback
                                );
                            }

                            /* ==================================
                               UPDATE BILL
                            ================================== */

                            const billSql = `
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
                            `;

                            const billValues = [
                                data.store_id,
                                data.customer_name || null,
                                data.bill_date || oldBill.bill_date,
                                safeNumber(data.subtotal),
                                safeNumber(data.discount),
                                safeNumber(data.tax),
                                safeNumber(data.grand_total),
                                data.updated_by,
                                id,
                            ];

                            connection.query(
                                billSql,
                                billValues,
                                (billError) => {
                                    if (billError) {
                                        return rollbackAndRelease(
                                            connection,
                                            billError,
                                            callback
                                        );
                                    }

                                    /* ==================================
                                       DELETE OLD ITEMS
                                    ================================== */

                                    connection.query(
                                        `
                                            DELETE FROM bill_items
                                            WHERE bill_id = ?
                                        `,
                                        [id],
                                        (deleteError) => {
                                            if (deleteError) {
                                                return rollbackAndRelease(
                                                    connection,
                                                    deleteError,
                                                    callback
                                                );
                                            }

                                            /* ==============================
                                               PREPARE NEW ITEMS
                                            ============================== */

                                            const newItems = (
                                                data.items || []
                                            ).filter(
                                                (item) =>
                                                    item &&
                                                    item.product_name &&
                                                    String(
                                                        item.product_name
                                                    ).trim()
                                            );

                                            const itemRows =
                                                newItems.map(
                                                    (item) => [
                                                        id,
                                                        item.product_id ||
                                                            null,
                                                        String(
                                                            item.product_name
                                                        ).trim(),
                                                        safeNumber(
                                                            item.quantity
                                                        ),
                                                        safeNumber(
                                                            item.rate
                                                        ),
                                                        safeNumber(
                                                            item.discount
                                                        ),
                                                        safeNumber(
                                                            item.amount
                                                        ),
                                                    ]
                                                );

                                            /* ==============================
                                               INSERT NEW ITEMS
                                            ============================== */

                                            const insertItems =
                                                (next) => {
                                                    if (
                                                        !itemRows.length
                                                    ) {
                                                        return next(
                                                            null
                                                        );
                                                    }

                                                    const itemSql = `
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
                                                    `;

                                                    connection.query(
                                                        itemSql,
                                                        [
                                                            itemRows,
                                                        ],
                                                        next
                                                    );
                                                };

                                            insertItems(
                                                (itemError) => {
                                                    if (
                                                        itemError
                                                    ) {
                                                        return rollbackAndRelease(
                                                            connection,
                                                            itemError,
                                                            callback
                                                        );
                                                    }

                                                    /* ==========================
                                                       PAYMENT
                                                    ========================== */

                                                    const paymentType =
                                                        data.payment_type ||
                                                        oldBill
                                                            .payments?.[0]
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
                                                        oldBill
                                                            .payments?.[0];

                                                    const saveAudit =
                                                        () => {
                                                            getBillForTransaction(
                                                                connection,
                                                                id,
                                                                (
                                                                    newError,
                                                                    newBill
                                                                ) => {
                                                                    if (
                                                                        newError
                                                                    ) {
                                                                        return rollbackAndRelease(
                                                                            connection,
                                                                            newError,
                                                                            callback
                                                                        );
                                                                    }

                                                                    createAuditLog(
                                                                        connection,
                                                                        {
                                                                            moduleName:
                                                                                "Billing",

                                                                            referenceId:
                                                                                id,

                                                                            action:
                                                                                "UPDATE",

                                                                            oldData:
                                                                                oldBill,

                                                                            newData:
                                                                                newBill,

                                                                            changedBy:
                                                                                data.updated_by,
                                                                        },
                                                                        (
                                                                            auditError
                                                                        ) => {
                                                                            if (
                                                                                auditError
                                                                            ) {
                                                                                return rollbackAndRelease(
                                                                                    connection,
                                                                                    auditError,
                                                                                    callback
                                                                                );
                                                                            }

                                                                            connection.commit(
                                                                                (
                                                                                    commitError
                                                                                ) => {
                                                                                    if (
                                                                                        commitError
                                                                                    ) {
                                                                                        return rollbackAndRelease(
                                                                                            connection,
                                                                                            commitError,
                                                                                            callback
                                                                                        );
                                                                                    }

                                                                                    releaseConnection(
                                                                                        connection
                                                                                    );

                                                                                    return callback(
                                                                                        null,
                                                                                        {
                                                                                            id,
                                                                                        }
                                                                                    );
                                                                                }
                                                                            );
                                                                        }
                                                                    );
                                                                }
                                                            );
                                                        };

                                                    /* ==========================
                                                       UPDATE EXISTING PAYMENT
                                                    ========================== */

                                                    if (
                                                        latestPayment
                                                    ) {
                                                        const paymentSql = `
                                                            UPDATE payments
                                                            SET
                                                                payment_type = ?,
                                                                amount = ?,
                                                                transaction_reference = ?,
                                                                payment_date = NOW()
                                                            WHERE id = ?
                                                        `;

                                                        connection.query(
                                                            paymentSql,
                                                            [
                                                                paymentType,
                                                                paymentAmount,
                                                                reference,
                                                                latestPayment.id,
                                                            ],
                                                            (
                                                                paymentError
                                                            ) => {
                                                                if (
                                                                    paymentError
                                                                ) {
                                                                    return rollbackAndRelease(
                                                                        connection,
                                                                        paymentError,
                                                                        callback
                                                                    );
                                                                }

                                                                saveAudit();
                                                            }
                                                        );
                                                    } else {
                                                        /* ==========================
                                                           CREATE PAYMENT IF MISSING
                                                        ========================== */

                                                        const paymentSql = `
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
                                                            (?, ?, ?, ?, 'SUCCESS', NOW(), ?)
                                                        `;

                                                        connection.query(
                                                            paymentSql,
                                                            [
                                                                id,
                                                                paymentType,
                                                                paymentAmount,
                                                                reference,
                                                                data.updated_by,
                                                            ],
                                                            (
                                                                paymentError
                                                            ) => {
                                                                if (
                                                                    paymentError
                                                                ) {
                                                                    return rollbackAndRelease(
                                                                        connection,
                                                                        paymentError,
                                                                        callback
                                                                    );
                                                                }

                                                                saveAudit();
                                                            }
                                                        );
                                                    }
                                                }
                                            );
                                        }
                                    );
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
   CANCEL BILL
====================================================== */

Billing.cancelBill = (
    id,
    userId,
    callback
) => {
    db.getConnection(
        (connectionError, connection) => {
            if (connectionError) {
                return callback(connectionError);
            }

            connection.beginTransaction(
                (transactionError) => {
                    if (transactionError) {
                        releaseConnection(connection);
                        return callback(transactionError);
                    }

                    getBillForTransaction(
                        connection,
                        id,
                        (oldError, oldBill) => {
                            if (oldError) {
                                return rollbackAndRelease(
                                    connection,
                                    oldError,
                                    callback
                                );
                            }

                            if (!oldBill) {
                                return rollbackAndRelease(
                                    connection,
                                    new Error(
                                        "Bill not found."
                                    ),
                                    callback
                                );
                            }

                            if (
                                String(
                                    oldBill.status
                                ).toUpperCase() ===
                                "CANCELLED"
                            ) {
                                return rollbackAndRelease(
                                    connection,
                                    new Error(
                                        "Bill is already cancelled."
                                    ),
                                    callback
                                );
                            }

                            /* ==================================
                               CANCEL BILL
                            ================================== */

                            connection.query(
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
                                    id,
                                ],
                                (updateError) => {
                                    if (updateError) {
                                        return rollbackAndRelease(
                                            connection,
                                            updateError,
                                            callback
                                        );
                                    }

                                    /* ==============================
                                       GET NEW BILL STATE
                                    ============================== */

                                    getBillForTransaction(
                                        connection,
                                        id,
                                        (
                                            newError,
                                            newBill
                                        ) => {
                                            if (newError) {
                                                return rollbackAndRelease(
                                                    connection,
                                                    newError,
                                                    callback
                                                );
                                            }

                                            /* ==========================
                                               AUDIT CANCEL
                                            ========================== */

                                            createAuditLog(
                                                connection,
                                                {
                                                    moduleName:
                                                        "Billing",

                                                    referenceId:
                                                        id,

                                                    action:
                                                        "CANCEL",

                                                    oldData:
                                                        oldBill,

                                                    newData:
                                                        newBill,

                                                    changedBy:
                                                        userId,
                                                },
                                                (
                                                    auditError
                                                ) => {
                                                    if (
                                                        auditError
                                                    ) {
                                                        return rollbackAndRelease(
                                                            connection,
                                                            auditError,
                                                            callback
                                                        );
                                                    }

                                                    connection.commit(
                                                        (
                                                            commitError
                                                        ) => {
                                                            if (
                                                                commitError
                                                            ) {
                                                                return rollbackAndRelease(
                                                                    connection,
                                                                    commitError,
                                                                    callback
                                                                );
                                                            }

                                                            releaseConnection(
                                                                connection
                                                            );

                                                            return callback(
                                                                null,
                                                                {
                                                                    id,
                                                                    status:
                                                                        "CANCELLED",
                                                                }
                                                            );
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
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
   DAILY REPORT
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

    /* ======================================
       SUMMARY
    ====================================== */

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

            /* ==================================
               DETAILS
            ================================== */

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
                                    other: 0,
                                },

                            details:
                                details || [],
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