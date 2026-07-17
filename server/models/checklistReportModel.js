const db = require("../config/db");

// ==============================
// Get Reports
// ==============================

exports.getReports = (filters, callback) => {

    let sql = "SELECT * FROM checklist_reports WHERE 1=1";

    const values = [];

    // Search
    if (filters.search) {

        sql += `
        AND (
            employee LIKE ?
            OR store LIKE ?
            OR checklist_name LIKE ?
            OR question LIKE ?
        )`;

        values.push(
            `%${filters.search}%`,
            `%${filters.search}%`,
            `%${filters.search}%`,
            `%${filters.search}%`
        );

    }

    // Store Filter
    if (filters.store) {
        sql += " AND store = ?";
        values.push(filters.store);
    }

    // Employee Filter
    if (filters.employee) {
        sql += " AND employee = ?";
        values.push(filters.employee);
    }

    // Checklist Filter
    if (filters.checklist) {
        sql += " AND checklist_name = ?";
        values.push(filters.checklist);
    }

    // Date Filter
    if (filters.fromDate && filters.toDate) {

        sql += " AND DATE(submitted_at) BETWEEN ? AND ?";

        values.push(filters.fromDate);
        values.push(filters.toDate);

    }

    sql += " ORDER BY submitted_at DESC";

    db.query(sql, values, callback);

};

// ==============================
// Add Report
// ==============================

exports.addReport = (data, callback) => {

    db.query(
        "INSERT INTO checklist_reports SET ?",
        data,
        callback
    );

};

// ==============================
// Delete Report
// ==============================

exports.deleteReport = (id, callback) => {

    db.query(
        "DELETE FROM checklist_reports WHERE id = ?",
        [id],
        callback
    );

};

// ==============================
// Import Reports
// ==============================

exports.importReports = (rows, callback) => {

    if (!rows || rows.length === 0) {
        return callback(null);
    }

    const sql = `
        INSERT INTO checklist_reports
        (
            submitted_at,
            status,
            checklist_name,
            store,
            employee,
            question,
            answer,
            comment,
            attachment,
            department,
            device,
            geo_location
        )
        VALUES ?
    `;

    const values = rows.map((row) => {

        // Convert ISO DateTime to MySQL DATETIME
        let submittedAt = row.submitted_at;

        if (submittedAt) {

            submittedAt = submittedAt
                .replace("T", " ")
                .replace("Z", "")
                .split(".")[0];

        }

        return [

            submittedAt,
            row.status || "",
            row.checklist_name || "",
            row.store || "",
            row.employee || "",
            row.question || "",
            row.answer || "",
            row.comment || "",
            row.attachment || "",
            row.department || "",
            row.device || "",
            row.geo_location || ""

        ];

    });

    // Debug
    console.log("========== FIRST ROW ==========");
    console.log(values[0]);
    console.log("===============================");

    db.query(sql, [values], callback);

};