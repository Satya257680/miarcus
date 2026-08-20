const db = require("../config/db");

const query = (sql, params, callback) => db.query(sql, params, callback);

const createTables = (callback) => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS sales_visit_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      visit_date DATE NOT NULL,
      week_off TINYINT(1) NOT NULL DEFAULT 0,
      city VARCHAR(160) NULL,
      reason_to_travel TEXT NULL,
      remarks TEXT NULL,
      approval_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      approval_by INT NULL,
      approval_at DATETIME NULL,
      created_by INT NULL,
      updated_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sales_visit_employee_date (employee_id, visit_date),
      INDEX idx_sales_visit_status (approval_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS sales_visit_plan_stores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      store_id INT NOT NULL,
      store_kind VARCHAR(12) NOT NULL DEFAULT 'planned',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sales_plan_store (plan_id, store_id, store_kind),
      INDEX idx_sales_plan_store_plan (plan_id),
      INDEX idx_sales_plan_store_store (store_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS sales_visit_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      user_id INT NULL,
      remark TEXT NULL,
      attachments TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sales_history_plan (plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS sales_review_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      store_id INT NULL,
      store_name VARCHAR(255) NOT NULL,
      year INT NULL,
      month VARCHAR(40) NULL,
      week VARCHAR(40) NULL,
      target DECIMAL(16,2) DEFAULT 0,
      mtd DECIMAL(16,2) DEFAULT 0,
      mrp_sale DECIMAL(16,2) DEFAULT 0,
      last_month_sale DECIMAL(16,2) DEFAULT 0,
      lysm DECIMAL(16,2) DEFAULT 0,
      projection DECIMAL(16,2) DEFAULT 0,
      projection_remaining DECIMAL(16,2) DEFAULT 0,
      projection_selected_week DECIMAL(16,2) DEFAULT 0,
      discount_amount DECIMAL(16,2) DEFAULT 0,
      discount_percent DECIMAL(10,2) DEFAULT 0,
      upt DECIMAL(10,2) DEFAULT 0,
      abv DECIMAL(16,2) DEFAULT 0,
      asp DECIMAL(16,2) DEFAULT 0,
      bill_count INT DEFAULT 0,
      qty_sold DECIMAL(16,2) DEFAULT 0,
      reports_to VARCHAR(255) NULL,
      asm VARCHAR(255) NULL,
      remarks TEXT NULL,
      created_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sales_review_store (store_name),
      INDEX idx_sales_review_period (year, month, week)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS sales_review_benchmarks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      benchmark_key VARCHAR(50) NOT NULL UNIQUE,
      benchmark_value DECIMAL(16,4) NOT NULL DEFAULT 0,
      updated_by INT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  let index = 0;
  const next = (err) => {
    if (err) return callback(err);
    if (index >= statements.length) return callback(null);
    query(statements[index++], [], next);
  };
  next();
};

const getEmployees = (search, callback) => {
  const like = `%${String(search || "").trim()}%`;
  query(`SELECT u.id, u.employee_id, u.name, u.email, d.department_name AS department, dg.designation_name AS designation
         FROM users u LEFT JOIN departments d ON d.id=u.department_id LEFT JOIN designations dg ON dg.id=u.designation_id
         WHERE u.status='Active' AND (?='' OR u.name LIKE ? OR u.employee_id LIKE ? OR u.email LIKE ?)
         ORDER BY u.name ASC LIMIT 300`, [String(search || "").trim(), like, like, like], callback);
};

const getStores = (search, callback) => {
  const like = `%${String(search || "").trim()}%`;
  query(`SELECT id, store_name, store_code, city, state FROM stores
         WHERE (?='' OR store_name LIKE ? OR store_code LIKE ? OR city LIKE ?)
         ORDER BY store_name ASC LIMIT 500`, [String(search || "").trim(), like, like, like], callback);
};

const buildVisitWhere = (filters, user, params) => {
  const conditions = ["1=1"];
  const add = (sql, ...values) => { conditions.push(sql); params.push(...values); };
  const admin = user.is_admin === true || user.is_admin === 1 || user.is_admin === "1" || user.administrator === true || user.administrator === 1 || user.administrator === "1";
  if (!admin) add("v.employee_id = ?", user.id);
  if (filters.from) add("v.visit_date >= ?", filters.from);
  if (filters.to) add("v.visit_date <= ?", filters.to);
  if (filters.name) add("u.name LIKE ?", `%${filters.name}%`);
  if (filters.department) add("d.department_name = ?", filters.department);
  if (filters.store) add("EXISTS (SELECT 1 FROM sales_visit_plan_stores vf JOIN stores vs ON vs.id=vf.store_id WHERE vf.plan_id=v.id AND vf.store_kind='planned' AND vs.store_name LIKE ?)", `%${filters.store}%`);
  if (filters.search) add("(u.name LIKE ? OR v.city LIKE ? OR v.reason_to_travel LIKE ? OR EXISTS (SELECT 1 FROM sales_visit_plan_stores sf JOIN stores ss ON ss.id=sf.store_id WHERE sf.plan_id=v.id AND sf.store_kind='planned' AND ss.store_name LIKE ?))", `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  return conditions.join(" AND ");
};

const visitSelect = `
SELECT v.*, u.employee_id AS employee_code, u.name, u.email, d.department_name AS department,
       dg.designation_name AS designation,
       GROUP_CONCAT(DISTINCT CASE WHEN ps.store_kind='planned' THEN s.store_name END ORDER BY s.store_name SEPARATOR ', ') AS planned_store_names,
       GROUP_CONCAT(DISTINCT CASE WHEN ps.store_kind='planned' THEN s.id END) AS planned_store_ids_csv,
       GROUP_CONCAT(DISTINCT CASE WHEN ps.store_kind='actual' THEN s.id END) AS actual_store_ids_csv,
       COUNT(DISTINCT CASE WHEN ps.store_kind='planned' THEN ps.store_id END) AS planned_store_count,
       DATE_FORMAT(v.visit_date, '%W') AS day_name
FROM sales_visit_plans v
JOIN users u ON u.id=v.employee_id
LEFT JOIN departments d ON d.id=u.department_id
LEFT JOIN designations dg ON dg.id=u.designation_id
LEFT JOIN sales_visit_plan_stores ps ON ps.plan_id=v.id
LEFT JOIN stores s ON s.id=ps.store_id`;

const normalizeIds = (csv) => String(csv || "").split(",").filter(Boolean).map(Number);

const getVisitPlans = (filters, user, callback) => {
  const params = [];
  const where = buildVisitWhere(filters, user, params);
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 10)));
  const offset = (page - 1) * limit;
  const dataSql = `${visitSelect} WHERE ${where} GROUP BY v.id ORDER BY v.visit_date DESC, v.id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(DISTINCT v.id) AS total FROM sales_visit_plans v JOIN users u ON u.id=v.employee_id LEFT JOIN departments d ON d.id=u.department_id WHERE ${where}`;
  query(countSql, params, (countErr, countRows) => {
    if (countErr) return callback(countErr);
    query(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) return callback(err);
      rows.forEach((row) => { row.planned_store_ids = normalizeIds(row.planned_store_ids_csv); row.actual_store_ids = normalizeIds(row.actual_store_ids_csv); delete row.planned_store_ids_csv; delete row.actual_store_ids_csv; });
      callback(null, { rows, total: Number(countRows[0]?.total || 0) });
    });
  });
};

const getVisitPlanById = (id, callback) => {
  query(`${visitSelect} WHERE v.id=? GROUP BY v.id LIMIT 1`, [id], (err, rows) => {
    if (err) return callback(err);
    if (!rows.length) return callback(null, null);
    rows[0].planned_store_ids = normalizeIds(rows[0].planned_store_ids_csv); rows[0].actual_store_ids = normalizeIds(rows[0].actual_store_ids_csv);
    callback(null, rows[0]);
  });
};

const replaceStores = (planId, storeIds, kind, callback) => {
  query("DELETE FROM sales_visit_plan_stores WHERE plan_id=? AND store_kind=?", [planId, kind], (deleteErr) => {
    if (deleteErr) return callback(deleteErr);
    const ids = [...new Set((storeIds || []).map(Number).filter(Boolean))];
    if (!ids.length) return callback(null);
    query("INSERT INTO sales_visit_plan_stores (plan_id, store_id, store_kind) VALUES ?", [ids.map((id) => [planId, id, kind])], callback);
  });
};

const createVisitPlan = (data, callback) => {
  query(`INSERT INTO sales_visit_plans (employee_id,visit_date,week_off,city,reason_to_travel,approval_status,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?)`, [data.employee_id, data.visit_date, data.week_off ? 1 : 0, data.city || null, data.reason_to_travel || null, data.approval_status, data.created_by, data.created_by], (err, result) => {
    if (err) return callback(err);
    replaceStores(result.insertId, data.planned_store_ids, "planned", (storeErr) => { if (storeErr) return callback(storeErr); callback(null, result.insertId); });
  });
};

const updateVisitPlan = (id, data, callback) => {
  query(`UPDATE sales_visit_plans SET employee_id=?,visit_date=?,week_off=?,city=?,reason_to_travel=?,updated_by=? WHERE id=?`, [data.employee_id, data.visit_date, data.week_off ? 1 : 0, data.city || null, data.reason_to_travel || null, data.updated_by, id], (err) => {
    if (err) return callback(err);
    replaceStores(id, data.planned_store_ids, "planned", callback);
  });
};

const deleteVisitPlan = (id, callback) => {
  query("DELETE FROM sales_visit_plan_stores WHERE plan_id=?", [id], (storeErr) => {
    if (storeErr) return callback(storeErr);
    query("DELETE FROM sales_visit_history WHERE plan_id=?", [id], (historyErr) => {
      if (historyErr) return callback(historyErr);
      query("DELETE FROM sales_visit_plans WHERE id=?", [id], callback);
    });
  });
};

const deleteAllVisitPlans = (user, callback) => {
  const admin = user.is_admin === true || user.is_admin === 1 || user.is_admin === "1" || user.administrator === true || user.administrator === 1 || user.administrator === "1";
  const planQuery = admin
    ? "SELECT id FROM sales_visit_plans"
    : "SELECT id FROM sales_visit_plans WHERE employee_id=?";
  const planParams = admin ? [] : [user.id];
  query(planQuery, planParams, (findErr, plans) => {
    if (findErr) return callback(findErr);
    if (!plans.length) return callback(null, { affectedRows: 0 });
    const ids = plans.map((row) => row.id);
    query(`DELETE FROM sales_visit_plan_stores WHERE plan_id IN (${ids.map(() => "?").join(",")})`, ids, (storeErr) => {
      if (storeErr) return callback(storeErr);
      query(`DELETE FROM sales_visit_history WHERE plan_id IN (${ids.map(() => "?").join(",")})`, ids, (historyErr) => {
        if (historyErr) return callback(historyErr);
        query(`DELETE FROM sales_visit_plans WHERE id IN (${ids.map(() => "?").join(",")})`, ids, callback);
      });
    });
  });
};

const getTravelPlans = (filters, user, callback) => getVisitPlans(filters, user, callback);

const saveActualStores = (id, storeIds, userId, callback) => {
  replaceStores(id, storeIds, "actual", (err) => {
    if (err) return callback(err);
    query("INSERT INTO sales_visit_history (plan_id,user_id,remark) VALUES (?,?,?)", [id, userId, `Actual stores updated: ${[...new Set(storeIds || [])].length}`], callback);
  });
};

const getHistory = (id, callback) => query(`SELECT h.*, u.name AS user_name FROM sales_visit_history h LEFT JOIN users u ON u.id=h.user_id WHERE h.plan_id=? ORDER BY h.created_at DESC`, [id], callback);

const addHistory = (id, userId, remark, attachmentPath, callback) =>
  query(
    "INSERT INTO sales_visit_history (plan_id,user_id,remark,attachments) VALUES (?,?,?,?)",
    [id, userId, remark || "", attachmentPath || null],
    callback
  );

const getApprovals = (user, callback) => {
  const admin = user.is_admin === true || user.is_admin === 1 || user.is_admin === "1" || user.administrator === true || user.administrator === 1 || user.administrator === "1";
  const where = admin ? "v.approval_status='Pending'" : "v.approval_status='Pending' AND u.reports_to=?";
  const params = admin ? [] : [user.id];
  query(`SELECT v.employee_id, u.name, DATE_FORMAT(v.visit_date,'%M %Y') AS month_label, DATE_FORMAT(v.visit_date,'%Y-%m') AS month, COUNT(*) AS pending_days
         FROM sales_visit_plans v JOIN users u ON u.id=v.employee_id WHERE ${where}
         GROUP BY v.employee_id, DATE_FORMAT(v.visit_date,'%Y-%m') ORDER BY MIN(v.visit_date) DESC`, params, callback);
};

const changeApproval = (employeeId, month, status, userId, callback) => {
  query(`SELECT is_admin FROM users WHERE id=? LIMIT 1`, [userId], (userErr, userRows) => {
    if (userErr) return callback(userErr);
    const admin = Number(userRows[0]?.is_admin || 0) === 1;
    const managerCondition = admin ? "1=1" : "u.reports_to=?";
    const params = admin
      ? [status, userId, employeeId, month]
      : [status, userId, employeeId, month, userId];
    query(
      `UPDATE sales_visit_plans v
       JOIN users u ON u.id=v.employee_id
       SET v.approval_status=?, v.approval_by=?, v.approval_at=NOW()
       WHERE v.employee_id=? AND DATE_FORMAT(v.visit_date,'%Y-%m')=? AND v.approval_status='Pending' AND ${managerCondition}`,
      params,
      callback
    );
  });
};

const getReview = (filters, callback) => {
  const params = []; const conditions = ["1=1"];
  const add = (sql, value) => { if (value !== undefined && value !== null && value !== "") { conditions.push(sql); params.push(value); } };
  add("year = ?", filters.years ? Number(String(filters.years).split(",")[0]) : "");
  add("month LIKE ?", filters.months ? `%${filters.months}%` : "");
  add("week LIKE ?", filters.weeks ? `%${filters.weeks}%` : "");
  add("reports_to LIKE ?", filters.reports_to ? `%${filters.reports_to}%` : "");
  add("asm LIKE ?", filters.asm ? `%${filters.asm}%` : "");
  add("store_name LIKE ?", filters.store ? `%${filters.store}%` : "");
  add("(store_name LIKE ? OR remarks LIKE ?)", filters.search ? `%${filters.search}%` : "");
  if (filters.search) params.push(`%${filters.search}%`);
  const page = Math.max(1, Number(filters.page || 1)); const limit = Math.min(100, Math.max(1, Number(filters.limit || 5))); const offset=(page-1)*limit;
  const where = conditions.join(" AND ");
  query(`SELECT COUNT(*) AS total FROM sales_review_records WHERE ${where}`, params, (countErr, countRows) => {
    if (countErr) return callback(countErr);
    query(`SELECT * FROM sales_review_records WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, limit, offset], (err, rows) => {
      if (err) return callback(err);
      query("SELECT benchmark_key, benchmark_value FROM sales_review_benchmarks", [], (benchErr, benchRows) => {
        if (benchErr) return callback(benchErr);
        const benchmarks = {}; benchRows.forEach((r) => { benchmarks[r.benchmark_key] = r.benchmark_value; });
        callback(null, { rows, total: Number(countRows[0]?.total || 0), benchmarks });
      });
    });
  });
};

const clearReview = (callback) => query("DELETE FROM sales_review_records", [], callback);

const upsertBenchmarks = (data, userId, callback) => {
  const values = [["upt", Number(data.upt || 0), userId], ["abv", Number(data.abv || 0), userId], ["asp", Number(data.asp || 0), userId]];
  query(`INSERT INTO sales_review_benchmarks (benchmark_key,benchmark_value,updated_by) VALUES ? ON DUPLICATE KEY UPDATE benchmark_value=VALUES(benchmark_value),updated_by=VALUES(updated_by)`, [values], callback);
};

const importReviewRows = (rows, userId, callback) => {
  if (!rows.length) return callback(null, { affectedRows: 0 });
  const values = rows.map((r) => [r.store_name || r["Store Name"] || "", r.year || r.Year || null, r.month || r.Month || null, r.week || r.Week || null, Number(r.target || r.Target || 0), Number(r.mtd || r.MTD || 0), Number(r.mrp_sale || r["MRP Sale"] || 0), Number(r.last_month_sale || r["Last Month Sale"] || 0), Number(r.lysm || r.LYSM || 0), Number(r.projection || r.Projection || 0), Number(r.projection_remaining || r["Projection For Remaining Days"] || 0), Number(r.projection_selected_week || r["Projection (by selected week)"] || 0), Number(r.discount_amount || r["Discount Amount (MRP)"] || 0), Number(r.discount_percent || r["Discount %"] || 0), Number(r.upt || r.UPT || 0), Number(r.abv || r.ABV || 0), Number(r.asp || r.ASP || 0), Number(r.bill_count || r["Bill Count"] || 0), Number(r.qty_sold || r["Qty Sold"] || 0), r.reports_to || r["Reports To"] || null, r.asm || r.ASM || null, r.remarks || r.Remarks || null, userId]);
  return query(`INSERT INTO sales_review_records (store_name,year,month,week,target,mtd,mrp_sale,last_month_sale,lysm,projection,projection_remaining,projection_selected_week,discount_amount,discount_percent,upt,abv,asp,bill_count,qty_sold,reports_to,asm,remarks,created_by) VALUES ?`, [values], callback);
};

const exportVisitRows = (filters, user, callback) => {
  const params=[]; const where=buildVisitWhere(filters,user,params);
  query(`${visitSelect} WHERE ${where} GROUP BY v.id ORDER BY v.visit_date DESC, v.id DESC`, params, callback);
};

const exportReviewRows = (filters, callback) => {
  const params = [];
  const conditions = ["1=1"];
  const add = (sql, value) => {
    if (value !== undefined && value !== null && value !== "") {
      conditions.push(sql);
      params.push(value);
    }
  };
  add("year = ?", filters.years ? Number(String(filters.years).split(",")[0]) : "");
  add("month LIKE ?", filters.months ? `%${filters.months}%` : "");
  add("week LIKE ?", filters.weeks ? `%${filters.weeks}%` : "");
  add("reports_to LIKE ?", filters.reports_to ? `%${filters.reports_to}%` : "");
  add("asm LIKE ?", filters.asm ? `%${filters.asm}%` : "");
  add("store_name LIKE ?", filters.store ? `%${filters.store}%` : "");
  if (filters.search) {
    conditions.push("(store_name LIKE ? OR remarks LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  query(`SELECT * FROM sales_review_records WHERE ${conditions.join(" AND ")} ORDER BY id ASC`, params, callback);
};

module.exports = { createTables, getEmployees, getStores, getVisitPlans, createVisitPlan, updateVisitPlan, getVisitPlanById, deleteVisitPlan, deleteAllVisitPlans, getTravelPlans, saveActualStores, getHistory, addHistory, getApprovals, changeApproval, getReview, clearReview, upsertBenchmarks, importReviewRows, exportVisitRows, exportReviewRows };
