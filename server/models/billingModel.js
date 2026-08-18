const db = require("../config/db");

const Billing = {};

Billing.createBill = (bill, items, payment, callback) => {
    db.getConnection((connectionError, connection) => {
        if (connectionError) return callback(connectionError);
        connection.beginTransaction((txError) => {
            if (txError) { connection.release(); return callback(txError); }
            const billSql = `INSERT INTO bills (bill_no, store_id, customer_name, bill_date, subtotal, discount, tax, grand_total, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?)`;
            connection.query(billSql, [bill.bill_no, bill.store_id, bill.customer_name || null, bill.bill_date, bill.subtotal, bill.discount, bill.tax, bill.grand_total, bill.created_by, bill.created_by], (err, result) => {
                if (err) return connection.rollback(() => { connection.release(); callback(err); });
                const billId = result.insertId;
                const itemSql = `INSERT INTO bill_items (bill_id, product_id, product_name, quantity, rate, discount, amount) VALUES ?`;
                const rows = (items || []).map(i => [billId, i.product_id || null, i.product_name, Number(i.quantity), Number(i.rate), Number(i.discount || 0), Number(i.amount)]);
                const afterItems = (itemErr) => {
                    if (itemErr) return connection.rollback(() => { connection.release(); callback(itemErr); });
                    const paymentSql = `INSERT INTO payments (bill_id, payment_type, amount, transaction_reference, status, payment_date, created_by) VALUES (?, ?, ?, ?, 'SUCCESS', NOW(), ?)`;
                    connection.query(paymentSql, [billId, payment.payment_type, payment.amount, payment.transaction_reference || null, bill.created_by], (paymentErr) => {
                        if (paymentErr) return connection.rollback(() => { connection.release(); callback(paymentErr); });
                        connection.commit(commitErr => { if (commitErr) return connection.rollback(() => { connection.release(); callback(commitErr); }); connection.release(); callback(null, { id: billId }); });
                    });
                };
                if (rows.length) connection.query(itemSql, [rows], afterItems); else afterItems(null);
            });
        });
    });
};

Billing.getBills = (filters, callback) => {
    const where = [];
    const params = [];
    if (filters.date) { where.push("DATE(b.bill_date) = ?"); params.push(filters.date); }
    if (filters.store_id) { where.push("b.store_id = ?"); params.push(filters.store_id); }
    if (filters.payment_type) { where.push("p.payment_type = ?"); params.push(filters.payment_type); }
    if (filters.search) { where.push("(b.bill_no LIKE ? OR b.customer_name LIKE ?)"); params.push(`%${filters.search}%`, `%${filters.search}%`); }
    const sql = `SELECT b.*, s.store_name, p.payment_type, p.transaction_reference, u1.name AS created_by_name, u2.name AS updated_by_name FROM bills b LEFT JOIN stores s ON s.id=b.store_id LEFT JOIN payments p ON p.bill_id=b.id LEFT JOIN users u1 ON u1.id=b.created_by LEFT JOIN users u2 ON u2.id=b.updated_by ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY b.id DESC`;
    db.query(sql, params, callback);
};

Billing.getBillById = (id, callback) => db.query(`SELECT b.*, s.store_name, u1.name AS created_by_name, u2.name AS updated_by_name FROM bills b LEFT JOIN stores s ON s.id=b.store_id LEFT JOIN users u1 ON u1.id=b.created_by LEFT JOIN users u2 ON u2.id=b.updated_by WHERE b.id=? LIMIT 1`, [id], (err, bills) => {
    if (err) return callback(err);
    if (!bills.length) return callback(null, null);
    db.query(`SELECT * FROM bill_items WHERE bill_id=? ORDER BY id`, [id], (itemErr, items) => {
        if (itemErr) return callback(itemErr);
        db.query(`SELECT * FROM payments WHERE bill_id=? ORDER BY id DESC`, [id], (payErr, payments) => callback(payErr, payErr ? null : { ...bills[0], items, payments }));
    });
});

Billing.updateBill = (id, data, callback) => db.query(`UPDATE bills SET store_id=?, customer_name=?, bill_date=?, subtotal=?, discount=?, tax=?, grand_total=?, updated_by=?, updated_at=NOW() WHERE id=?`, [data.store_id, data.customer_name || null, data.bill_date, data.subtotal, data.discount, data.tax, data.grand_total, data.updated_by, id], callback);

Billing.cancelBill = (id, userId, callback) => db.query(`UPDATE bills SET status='CANCELLED', updated_by=?, updated_at=NOW() WHERE id=?`, [userId, id], callback);

Billing.dailyReport = (filters, callback) => {
    const params = [filters.date || new Date().toISOString().slice(0,10)];
    const storeClause = filters.store_id ? " AND b.store_id = ?" : "";
    if (filters.store_id) params.push(filters.store_id);
    const sql = `SELECT COUNT(DISTINCT b.id) total_bills, COALESCE(SUM(b.subtotal),0) subtotal, COALESCE(SUM(b.discount),0) discount, COALESCE(SUM(b.tax),0) tax, COALESCE(SUM(b.grand_total),0) grand_total, COALESCE(SUM(CASE WHEN p.payment_type='Cash' THEN p.amount ELSE 0 END),0) cash, COALESCE(SUM(CASE WHEN p.payment_type='UPI' THEN p.amount ELSE 0 END),0) upi, COALESCE(SUM(CASE WHEN p.payment_type='Card' THEN p.amount ELSE 0 END),0) card, COALESCE(SUM(CASE WHEN p.payment_type='Bank Transfer' THEN p.amount ELSE 0 END),0) bank_transfer FROM bills b LEFT JOIN payments p ON p.bill_id=b.id WHERE DATE(b.bill_date)=? AND b.status <> 'CANCELLED'${storeClause}`;
    db.query(sql, params, (err, summary) => { if (err) return callback(err); Billing.getBills(filters, (detailErr, details) => callback(detailErr, { summary: summary[0], details: details || [] })); });
};

module.exports = Billing;
