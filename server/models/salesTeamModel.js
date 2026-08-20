const db = require("../config/db");

/* =========================================================
   DATABASE QUERY HELPER
========================================================= */

const query = (sql, params, callback) => {
  db.query(sql, params, callback);
};

/* =========================================================
   HELPERS
========================================================= */

const isAdmin = (user = {}) => {
  return (
    user.is_admin === true ||
    user.is_admin === 1 ||
    user.is_admin === "1" ||
    user.administrator === true ||
    user.administrator === 1 ||
    user.administrator === "1"
  );
};

const normalizeIds = (csv) => {
  return String(csv || "")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter(Boolean);
};

/* =========================================================
   CREATE TABLES
========================================================= */

const createTables = (callback) => {
  const statements = [
    `
    CREATE TABLE IF NOT EXISTS sales_visit_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,

      employee_id INT NOT NULL,

      visit_date DATE NOT NULL,

      end_date DATE NULL,

      week_off TINYINT(1) NOT NULL DEFAULT 0,

      city VARCHAR(160) NULL,

      reason_to_travel TEXT NULL,

      remarks TEXT NULL,

      /*
        Every newly created visit starts as Pending.
        Approval can only be changed from
        Travel Plan Approvals.
      */
      approval_status VARCHAR(20) NOT NULL DEFAULT 'Pending',

      approval_by INT NULL,

      approval_at DATETIME NULL,

      created_by INT NULL,

      updated_by INT NULL,

      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_sales_visit_employee_date
        (employee_id, visit_date),

      INDEX idx_sales_visit_status
        (approval_status)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS sales_visit_plan_stores (
      id INT AUTO_INCREMENT PRIMARY KEY,

      plan_id INT NOT NULL,

      store_id INT NOT NULL,

      store_kind VARCHAR(12) NOT NULL DEFAULT 'planned',

      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      UNIQUE KEY uq_sales_plan_store
        (plan_id, store_id, store_kind),

      INDEX idx_sales_plan_store_plan
        (plan_id),

      INDEX idx_sales_plan_store_store
        (store_id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS sales_visit_history (
      id INT AUTO_INCREMENT PRIMARY KEY,

      plan_id INT NOT NULL,

      user_id INT NULL,

      remark TEXT NULL,

      attachments TEXT NULL,

      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_sales_history_plan
        (plan_id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS sales_review_records (
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

      INDEX idx_sales_review_store
        (store_name),

      INDEX idx_sales_review_period
        (year, month, week)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    `,

    `
    CREATE TABLE IF NOT EXISTS sales_review_benchmarks (
      id INT AUTO_INCREMENT PRIMARY KEY,

      benchmark_key VARCHAR(50) NOT NULL UNIQUE,

      benchmark_value DECIMAL(16,4) NOT NULL DEFAULT 0,

      updated_by INT NULL,

      updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    `,
  ];

  /*
    The Sales Team tables may already exist in production from an
    older version of the module. CREATE TABLE IF NOT EXISTS does
    NOT alter an existing table, which can leave approval columns
    missing and make /api/sales-team/approvals return HTTP 500.

    These migrations are deliberately checked through
    INFORMATION_SCHEMA so the code works even on MySQL versions
    where ALTER TABLE ... ADD COLUMN IF NOT EXISTS is unavailable.
  */
  const requiredColumns = [
    {
      table: "sales_visit_plans",
      column: "approval_status",
      definition:
        "VARCHAR(20) NOT NULL DEFAULT 'Pending'",
    },
    {
      table: "sales_visit_plans",
      column: "end_date",
      definition:
        "DATE NULL",
    },
    {
      table: "sales_visit_plans",
      column: "approval_by",
      definition:
        "INT NULL",
    },
    {
      table: "sales_visit_plans",
      column: "approval_at",
      definition:
        "DATETIME NULL",
    },
    {
      table: "sales_visit_plans",
      column: "created_by",
      definition:
        "INT NULL",
    },
    {
      table: "sales_visit_plans",
      column: "updated_by",
      definition:
        "INT NULL",
    },

    /*
      SALES REVIEW MIGRATIONS

      CREATE TABLE IF NOT EXISTS does not modify an already existing
      production table. The Sales Review importer writes to these
      columns, so older production databases must be upgraded safely.
    */
    {
      table: "sales_review_records",
      column: "store_id",
      definition:
        "INT NULL",
    },
    {
      table: "sales_review_records",
      column: "store_name",
      definition:
        "VARCHAR(255) NOT NULL DEFAULT ''",
    },
    {
      table: "sales_review_records",
      column: "year",
      definition:
        "INT NULL",
    },
    {
      table: "sales_review_records",
      column: "month",
      definition:
        "VARCHAR(40) NULL",
    },
    {
      table: "sales_review_records",
      column: "week",
      definition:
        "VARCHAR(40) NULL",
    },
    {
      table: "sales_review_records",
      column: "target",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "mtd",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "mrp_sale",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "last_month_sale",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "lysm",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "projection",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "projection_remaining",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "projection_selected_week",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "discount_amount",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "discount_percent",
      definition:
        "DECIMAL(10,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "upt",
      definition:
        "DECIMAL(10,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "abv",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "asp",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "bill_count",
      definition:
        "INT DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "qty_sold",
      definition:
        "DECIMAL(16,2) DEFAULT 0",
    },
    {
      table: "sales_review_records",
      column: "reports_to",
      definition:
        "VARCHAR(255) NULL",
    },
    {
      table: "sales_review_records",
      column: "asm",
      definition:
        "VARCHAR(255) NULL",
    },
    {
      table: "sales_review_records",
      column: "remarks",
      definition:
        "TEXT NULL",
    },
    {
      table: "sales_review_records",
      column: "created_by",
      definition:
        "INT NULL",
    },
    {
      table: "sales_review_records",
      column: "created_at",
      definition:
        "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },

    {
      table: "sales_review_benchmarks",
      column: "benchmark_key",
      definition:
        "VARCHAR(50) NOT NULL DEFAULT ''",
    },
    {
      table: "sales_review_benchmarks",
      column: "benchmark_value",
      definition:
        "DECIMAL(16,4) NOT NULL DEFAULT 0",
    },
    {
      table: "sales_review_benchmarks",
      column: "updated_by",
      definition:
        "INT NULL",
    },
    {
      table: "sales_review_benchmarks",
      column: "updated_at",
      definition:
        "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    },
  ];

  const ensureColumn = (
    table,
    column,
    definition,
    next
  ) => {
    query(
      `
      SELECT COUNT(*) AS column_exists
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      `,
      [table, column],
      (checkErr, rows) => {
        if (checkErr) {
          return next(checkErr);
        }

        if (
          Number(
            rows[0]?.column_exists || 0
          ) > 0
        ) {
          return next(null);
        }

        query(
          `
          ALTER TABLE \`${table}\`
          ADD COLUMN \`${column}\` ${definition}
          `,
          [],
          (alterErr) => {
            if (alterErr) {
              return next(alterErr);
            }

            next(null);
          }
        );
      }
    );
  };

  const runStatements = (
    index,
    next
  ) => {
    if (index >= statements.length) {
      return next(null);
    }

    query(
      statements[index],
      [],
      (err) => {
        if (err) {
          return next(err);
        }

        runStatements(
          index + 1,
          next
        );
      }
    );
  };

  const runMigrations = (
    index,
    next
  ) => {
    if (
      index >=
      requiredColumns.length
    ) {
      return next(null);
    }

    const migration =
      requiredColumns[index];

    ensureColumn(
      migration.table,
      migration.column,
      migration.definition,
      (err) => {
        if (err) {
          return next(err);
        }

        runMigrations(
          index + 1,
          next
        );
      }
    );
  };

  runStatements(
    0,
    (tableErr) => {
      if (tableErr) {
        return callback(tableErr);
      }

      runMigrations(
        0,
        (migrationErr) => {
          if (migrationErr) {
            return callback(
              migrationErr
            );
          }

          /*
            Existing rows created before the approval workflow
            are safely treated as Pending when the status is
            empty/null. They still require an explicit approval.
          */
          query(
            `
            UPDATE sales_visit_plans
            SET approval_status = 'Pending'
            WHERE approval_status IS NULL
               OR TRIM(approval_status) = ''
            `,
            [],
            callback
          );
        }
      );
    }
  );
};

/* =========================================================
   EMPLOYEES
========================================================= */

const getEmployees = (search, callback) => {
  const cleanSearch = String(search || "").trim();
  const like = `%${cleanSearch}%`;

  query(
    `
    SELECT
      u.id,
      u.employee_id,
      u.name,
      u.email,
      d.department_name AS department,
      dg.designation_name AS designation
    FROM users u

    LEFT JOIN departments d
      ON d.id = u.department_id

    LEFT JOIN designations dg
      ON dg.id = u.designation_id

    WHERE u.status = 'Active'

      AND (
        ? = ''
        OR u.name LIKE ?
        OR u.employee_id LIKE ?
        OR u.email LIKE ?
      )

    ORDER BY u.name ASC

    LIMIT 300
    `,
    [
      cleanSearch,
      like,
      like,
      like,
    ],
    callback
  );
};

/* =========================================================
   STORES
   IMPORTANT:
   Uses the main `stores` table so Visit Planner gets
   current Store Management stores.
========================================================= */

const getStores = (search, callback) => {
  const cleanSearch = String(search || "").trim();
  const like = `%${cleanSearch}%`;

  query(
    `
    SELECT
      id,
      store_name,
      store_code,
      city,
      state
    FROM stores

    WHERE
      (
        ? = ''
        OR store_name LIKE ?
        OR store_code LIKE ?
        OR city LIKE ?
        OR state LIKE ?
      )

    ORDER BY store_name ASC

    LIMIT 500
    `,
    [
      cleanSearch,
      like,
      like,
      like,
      like,
    ],
    callback
  );
};

/* =========================================================
   VISIT FILTER
========================================================= */

const buildVisitWhere = (filters = {}, user = {}, params = []) => {
  const conditions = ["1=1"];

  const add = (sql, ...values) => {
    conditions.push(sql);
    params.push(...values);
  };

  /*
    Non-admin users only see their own plans.
  */
  if (!isAdmin(user)) {
    add("v.employee_id = ?", user.id);
  }

  if (filters.from) {
    add(
      "COALESCE(v.end_date, v.visit_date) >= ?",
      filters.from
    );
  }

  if (filters.to) {
    add(
      "v.visit_date <= ?",
      filters.to
    );
  }

  if (filters.name) {
    add(
      "u.name LIKE ?",
      `%${filters.name}%`
    );
  }

  if (filters.department) {
    add(
      "d.department_name = ?",
      filters.department
    );
  }

  if (filters.store) {
    add(
      `
      EXISTS (
        SELECT 1
        FROM sales_visit_plan_stores vf

        JOIN stores vs
          ON vs.id = vf.store_id

        WHERE vf.plan_id = v.id

          AND vf.store_kind = 'planned'

          AND vs.store_name LIKE ?
      )
      `,
      `%${filters.store}%`
    );
  }

  if (filters.search) {
    const search = `%${filters.search}%`;

    add(
      `
      (
        u.name LIKE ?

        OR v.city LIKE ?

        OR v.reason_to_travel LIKE ?

        OR EXISTS (
          SELECT 1
          FROM sales_visit_plan_stores sf

          JOIN stores ss
            ON ss.id = sf.store_id

          WHERE sf.plan_id = v.id

            AND sf.store_kind = 'planned'

            AND ss.store_name LIKE ?
        )
      )
      `,
      search,
      search,
      search,
      search
    );
  }

  /*
    Optional approval status filter.
  */
  if (filters.approval_status) {
    add(
      "v.approval_status = ?",
      filters.approval_status
    );
  }

  return conditions.join(" AND ");
};

/* =========================================================
   VISIT SELECT
========================================================= */

const visitSelect = `
  SELECT
    v.*,

    u.employee_id AS employee_code,

    u.name,

    u.email,

    d.department_name AS department,

    dg.designation_name AS designation,

    GROUP_CONCAT(
      DISTINCT
      CASE
        WHEN ps.store_kind = 'planned'
        THEN s.store_name
      END
      ORDER BY s.store_name
      SEPARATOR ', '
    ) AS planned_store_names,

    GROUP_CONCAT(
      DISTINCT
      CASE
        WHEN ps.store_kind = 'planned'
        THEN s.id
      END
    ) AS planned_store_ids_csv,

    GROUP_CONCAT(
      DISTINCT
      CASE
        WHEN ps.store_kind = 'actual'
        THEN s.id
      END
    ) AS actual_store_ids_csv,

    COUNT(
      DISTINCT
      CASE
        WHEN ps.store_kind = 'planned'
        THEN ps.store_id
      END
    ) AS planned_store_count,

    DATE_FORMAT(
      v.visit_date,
      '%W'
    ) AS day_name,

    CASE
      WHEN v.week_off = 1
      THEN DATEDIFF(
        COALESCE(v.end_date, v.visit_date),
        v.visit_date
      ) + 1
      ELSE 1
    END AS leave_days

  FROM sales_visit_plans v

  JOIN users u
    ON u.id = v.employee_id

  LEFT JOIN departments d
    ON d.id = u.department_id

  LEFT JOIN designations dg
    ON dg.id = u.designation_id

  LEFT JOIN sales_visit_plan_stores ps
    ON ps.plan_id = v.id

  LEFT JOIN stores s
    ON s.id = ps.store_id
`;

/* =========================================================
   GET VISIT PLANS
========================================================= */

const getVisitPlans = (
  filters = {},
  user = {},
  callback
) => {
  const params = [];

  const where = buildVisitWhere(
    filters,
    user,
    params
  );

  const page = Math.max(
    1,
    Number(filters.page || 1)
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(filters.limit || 10)
    )
  );

  const offset = (page - 1) * limit;

  const dataSql = `
    ${visitSelect}

    WHERE ${where}

    GROUP BY v.id

    ORDER BY
      v.visit_date DESC,
      v.id DESC

    LIMIT ?
    OFFSET ?
  `;

  const countSql = `
    SELECT
      COUNT(DISTINCT v.id) AS total

    FROM sales_visit_plans v

    JOIN users u
      ON u.id = v.employee_id

    LEFT JOIN departments d
      ON d.id = u.department_id

    WHERE ${where}
  `;

  query(
    countSql,
    params,
    (countErr, countRows) => {
      if (countErr) {
        return callback(countErr);
      }

      query(
        dataSql,
        [
          ...params,
          limit,
          offset,
        ],
        (err, rows) => {
          if (err) {
            return callback(err);
          }

          rows.forEach((row) => {
            row.planned_store_ids =
              normalizeIds(
                row.planned_store_ids_csv
              );

            row.actual_store_ids =
              normalizeIds(
                row.actual_store_ids_csv
              );

            delete row.planned_store_ids_csv;
            delete row.actual_store_ids_csv;
          });

          callback(null, {
            rows,
            total: Number(
              countRows[0]?.total || 0
            ),
          });
        }
      );
    }
  );
};

/* =========================================================
   GET SINGLE VISIT PLAN
========================================================= */

const getVisitPlanById = (
  id,
  callback
) => {
  query(
    `
    ${visitSelect}

    WHERE v.id = ?

    GROUP BY v.id

    LIMIT 1
    `,
    [id],
    (err, rows) => {
      if (err) {
        return callback(err);
      }

      if (!rows.length) {
        return callback(null, null);
      }

      rows[0].planned_store_ids =
        normalizeIds(
          rows[0].planned_store_ids_csv
        );

      rows[0].actual_store_ids =
        normalizeIds(
          rows[0].actual_store_ids_csv
        );

      delete rows[0].planned_store_ids_csv;
      delete rows[0].actual_store_ids_csv;

      callback(null, rows[0]);
    }
  );
};

/* =========================================================
   REPLACE STORES
========================================================= */

const replaceStores = (
  planId,
  storeIds,
  kind,
  callback
) => {
  query(
    `
    DELETE FROM sales_visit_plan_stores

    WHERE plan_id = ?

      AND store_kind = ?
    `,
    [
      planId,
      kind,
    ],
    (deleteErr) => {
      if (deleteErr) {
        return callback(deleteErr);
      }

      const ids = [
        ...new Set(
          (storeIds || [])
            .map(Number)
            .filter(Boolean)
        ),
      ];

      if (!ids.length) {
        return callback(null);
      }

      query(
        `
        INSERT INTO sales_visit_plan_stores
          (
            plan_id,
            store_id,
            store_kind
          )

        VALUES ?
        `,
        [
          ids.map((id) => [
            planId,
            id,
            kind,
          ]),
        ],
        callback
      );
    }
  );
};

/* =========================================================
   CREATE VISIT PLAN
========================================================= */

const createVisitPlan = (
  data,
  callback
) => {
  /*
    VERY IMPORTANT:
    Ignore any approval_status sent by frontend.

    Every new plan is Pending.
    Only Travel Plan Approvals can change it.
  */

  const approvalStatus = "Pending";

  query(
    `
    INSERT INTO sales_visit_plans
    (
      employee_id,

      visit_date,

      end_date,

      week_off,

      city,

      reason_to_travel,

      approval_status,

      created_by,

      updated_by
    )

    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.employee_id,

      data.visit_date,

      data.end_date || data.visit_date,

      data.week_off ? 1 : 0,

      data.city || null,

      data.reason_to_travel || null,

      approvalStatus,

      data.created_by,

      data.created_by,
    ],
    (err, result) => {
      if (err) {
        return callback(err);
      }

      replaceStores(
        result.insertId,

        data.planned_store_ids,

        "planned",

        (storeErr) => {
          if (storeErr) {
            return callback(storeErr);
          }

          callback(
            null,
            result.insertId
          );
        }
      );
    }
  );
};

/* =========================================================
   UPDATE VISIT PLAN
========================================================= */

const updateVisitPlan = (
  id,
  data,
  callback
) => {
  /*
    Editing an existing plan sends it back to Pending.

    This prevents someone from editing a plan and
    keeping an old Approved status.
  */

  query(
    `
    UPDATE sales_visit_plans

    SET
      employee_id = ?,

      visit_date = ?,

      end_date = ?,

      week_off = ?,

      city = ?,

      reason_to_travel = ?,

      approval_status = 'Pending',

      approval_by = NULL,

      approval_at = NULL,

      updated_by = ?

    WHERE id = ?
    `,
    [
      data.employee_id,

      data.visit_date,

      data.end_date || data.visit_date,

      data.week_off ? 1 : 0,

      data.city || null,

      data.reason_to_travel || null,

      data.updated_by,

      id,
    ],
    (err) => {
      if (err) {
        return callback(err);
      }

      replaceStores(
        id,

        data.planned_store_ids,

        "planned",

        callback
      );
    }
  );
};

/* =========================================================
   DELETE VISIT PLAN
========================================================= */

const deleteVisitPlan = (
  id,
  callback
) => {
  query(
    `
    DELETE FROM sales_visit_plan_stores
    WHERE plan_id = ?
    `,
    [id],
    (storeErr) => {
      if (storeErr) {
        return callback(storeErr);
      }

      query(
        `
        DELETE FROM sales_visit_history
        WHERE plan_id = ?
        `,
        [id],
        (historyErr) => {
          if (historyErr) {
            return callback(historyErr);
          }

          query(
            `
            DELETE FROM sales_visit_plans
            WHERE id = ?
            `,
            [id],
            callback
          );
        }
      );
    }
  );
};

/* =========================================================
   DELETE ALL VISIT PLANS
========================================================= */

const deleteAllVisitPlans = (
  user,
  callback
) => {
  const admin = isAdmin(user);

  const planQuery = admin
    ? `
      SELECT id
      FROM sales_visit_plans
    `
    : `
      SELECT id
      FROM sales_visit_plans
      WHERE employee_id = ?
    `;

  const planParams = admin
    ? []
    : [user.id];

  query(
    planQuery,
    planParams,
    (findErr, plans) => {
      if (findErr) {
        return callback(findErr);
      }

      if (!plans.length) {
        return callback(null, {
          affectedRows: 0,
        });
      }

      const ids = plans.map(
        (row) => row.id
      );

      const placeholders = ids
        .map(() => "?")
        .join(",");

      query(
        `
        DELETE FROM sales_visit_plan_stores

        WHERE plan_id IN (${placeholders})
        `,
        ids,
        (storeErr) => {
          if (storeErr) {
            return callback(storeErr);
          }

          query(
            `
            DELETE FROM sales_visit_history

            WHERE plan_id IN (${placeholders})
            `,
            ids,
            (historyErr) => {
              if (historyErr) {
                return callback(historyErr);
              }

              query(
                `
                DELETE FROM sales_visit_plans

                WHERE id IN (${placeholders})
                `,
                ids,
                callback
              );
            }
          );
        }
      );
    }
  );
};

/* =========================================================
   TRAVEL PLAN
   ONLY APPROVED VISITS APPEAR HERE
========================================================= */

const getTravelPlans = (
  filters = {},
  user = {},
  callback
) => {
  const params = [];

  const where = buildVisitWhere(
    filters,
    user,
    params
  );

  const approvedWhere = `
    ${where}
    AND v.approval_status = 'Approved'
  `;

  const page = Math.max(
    1,
    Number(filters.page || 1)
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(filters.limit || 10)
    )
  );

  const offset =
    (page - 1) * limit;

  const dataSql = `
    ${visitSelect}

    WHERE ${approvedWhere}

    GROUP BY v.id

    ORDER BY
      v.visit_date DESC,
      v.id DESC

    LIMIT ?
    OFFSET ?
  `;

  const countSql = `
    SELECT
      COUNT(DISTINCT v.id) AS total

    FROM sales_visit_plans v

    JOIN users u
      ON u.id = v.employee_id

    LEFT JOIN departments d
      ON d.id = u.department_id

    WHERE ${approvedWhere}
  `;

  query(
    countSql,
    params,
    (countErr, countRows) => {
      if (countErr) {
        return callback(countErr);
      }

      query(
        dataSql,
        [
          ...params,
          limit,
          offset,
        ],
        (err, rows) => {
          if (err) {
            return callback(err);
          }

          rows.forEach((row) => {
            row.planned_store_ids =
              normalizeIds(
                row.planned_store_ids_csv
              );

            row.actual_store_ids =
              normalizeIds(
                row.actual_store_ids_csv
              );

            delete row.planned_store_ids_csv;
            delete row.actual_store_ids_csv;
          });

          callback(null, {
            rows,
            total: Number(
              countRows[0]?.total || 0
            ),
          });
        }
      );
    }
  );
};

/* =========================================================
   SAVE ACTUAL STORES
========================================================= */

const saveActualStores = (
  id,
  storeIds,
  userId,
  callback
) => {
  replaceStores(
    id,
    storeIds,
    "actual",
    (err) => {
      if (err) {
        return callback(err);
      }

      query(
        `
        INSERT INTO sales_visit_history
        (
          plan_id,
          user_id,
          remark
        )

        VALUES (?, ?, ?)
        `,
        [
          id,
          userId,
          `Actual stores updated: ${
            [
              ...new Set(
                storeIds || []
              ),
            ].length
          }`,
        ],
        callback
      );
    }
  );
};

/* =========================================================
   HISTORY
========================================================= */

const getHistory = (
  id,
  callback
) => {
  query(
    `
    SELECT
      h.*,

      u.name AS user_name

    FROM sales_visit_history h

    LEFT JOIN users u
      ON u.id = h.user_id

    WHERE h.plan_id = ?

    ORDER BY h.created_at DESC
    `,
    [id],
    callback
  );
};

/* =========================================================
   ADD REMARK / HISTORY
========================================================= */

const addHistory = (
  id,
  userId,
  remark,
  attachmentPath,
  callback
) => {
  query(
    `
    INSERT INTO sales_visit_history
    (
      plan_id,
      user_id,
      remark,
      attachments
    )

    VALUES (?, ?, ?, ?)
    `,
    [
      id,
      userId,
      remark || "",
      attachmentPath || null,
    ],
    callback
  );
};

/* =========================================================
   GET APPROVALS
========================================================= */

const getApprovals = (
  user,
  callback
) => {
  const admin = isAdmin(user);

  /*
    Admins:
      See every Pending travel plan.

    Non-admin approvers:
      See Pending plans belonging to employees whose
      reports_to matches the current approver.
  */

  const where = admin
    ? `
        v.approval_status = 'Pending'
      `
    : `
        v.approval_status = 'Pending'

        AND (
          CAST(u.reports_to AS CHAR) =
            CAST(? AS CHAR)

          OR

          CAST(u.reports_to AS CHAR) =
            CAST(? AS CHAR)

          OR

          LOWER(
            TRIM(
              CAST(u.reports_to AS CHAR)
            )
          ) =
          LOWER(
            TRIM(?)
          )
        )
      `;

  const params = admin
    ? []
    : [
        user.id,
        user.employee_id || user.id,
        user.name || "",
      ];

  query(
    `
    SELECT

      v.employee_id,

      u.name,

      u.email,

      /*
        First visit date of the employee's
        pending month.
      */
      DATE_FORMAT(
        MIN(v.visit_date),
        '%M %Y'
      ) AS month_label,

      /*
        IMPORTANT:
        This MUST use the same month expression
        that is present in GROUP BY.

        This fixes MySQL:
        ER_WRONG_FIELD_WITH_GROUP
        / only_full_group_by
      */
      DATE_FORMAT(
        MIN(v.visit_date),
        '%Y-%m'
      ) AS month,

      DATE(MIN(v.visit_date)) AS start_date,

      DATE(MAX(COALESCE(v.end_date, v.visit_date))) AS end_date,

      SUM(
        CASE
          WHEN v.week_off = 1
          THEN DATEDIFF(
            COALESCE(v.end_date, v.visit_date),
            v.visit_date
          ) + 1
          ELSE 1
        END
      ) AS leave_days,

      COUNT(*) AS pending_days

    FROM sales_visit_plans v

    INNER JOIN users u
      ON u.id = v.employee_id

    WHERE ${where}

    GROUP BY

      v.employee_id,

      u.name,

      u.email,

      DATE_FORMAT(
        v.visit_date,
        '%Y-%m'
      )

    ORDER BY
      MIN(v.visit_date) DESC
    `,
    params,
    callback
  );
};
/* =========================================================
   APPROVAL RECIPIENTS
========================================================= */

const getApprovalRecipients = (
  employeeId,
  callback
) => {
  query(
    `
    SELECT DISTINCT

      u.id,

      u.name,

      u.email

    FROM users u

    LEFT JOIN users employee
      ON employee.id = ?

    WHERE u.status = 'Active'

      AND (
        u.id = employee.reports_to

        OR u.is_admin = 1
      )

    ORDER BY u.id
    `,
    [employeeId],
    callback
  );
};

/* =========================================================
   EMPLOYEE APPROVAL INFORMATION
========================================================= */

const getEmployeeForApproval = (
  employeeId,
  month,
  callback
) => {
  query(
    `
    SELECT

      u.id,

      u.name,

      u.email,

      DATE_FORMAT(
        MIN(v.visit_date),
        '%M %Y'
      ) AS month_label,

      DATE(MIN(v.visit_date)) AS start_date,

      DATE(MAX(COALESCE(v.end_date, v.visit_date))) AS end_date,

      SUM(
        CASE
          WHEN v.week_off = 1
          THEN DATEDIFF(
            COALESCE(v.end_date, v.visit_date),
            v.visit_date
          ) + 1
          ELSE 1
        END
      ) AS plan_days

    FROM sales_visit_plans v

    JOIN users u
      ON u.id = v.employee_id

    WHERE
      v.employee_id = ?

      AND DATE_FORMAT(
        v.visit_date,
        '%Y-%m'
      ) = ?

    GROUP BY
      u.id,
      u.name,
      u.email
    `,
    [
      employeeId,
      month,
    ],
    (err, rows) => {
      callback(
        err,
        rows[0] || null
      );
    }
  );
};

/* =========================================================
   CHANGE APPROVAL
========================================================= */

const changeApproval = (
  employeeId,
  month,
  status,
  userId,
  callback
) => {
  const cleanEmployeeId = Number(employeeId);
  const cleanUserId = Number(userId);
  const cleanMonth = String(month || "").trim();

  if (
    !cleanEmployeeId ||
    !cleanUserId ||
    !cleanMonth
  ) {
    return callback(
      new Error(
        "Invalid employee, month or approving user."
      )
    );
  }

  const normalizedStatus =
    String(status || "")
      .trim()
      .toLowerCase();

  if (
    normalizedStatus !== "approved" &&
    normalizedStatus !== "rejected"
  ) {
    return callback(
      new Error(
        "Invalid approval status."
      )
    );
  }

  const finalStatus =
    normalizedStatus === "approved"
      ? "Approved"
      : "Rejected";

  /*
    First determine whether the current user
    is an administrator.
  */
  query(
    `
    SELECT
  id,
  employee_id,
  name,
  is_admin
FROM users
WHERE id = ?
LIMIT 1
    `,
    [cleanUserId],
    (userErr, userRows) => {
      if (userErr) {
        console.error(
          "Approval user lookup failed:",
          userErr
        );

        return callback(userErr);
      }

      if (!userRows?.length) {
        return callback(
          new Error(
            "Approving user was not found."
          )
        );
      }

      const currentUser =
        userRows[0];

      const admin =
  Number(
    currentUser.is_admin || 0
  ) === 1;

      /*
        Build authorization condition.

        Admin:
          Can approve/reject any pending plan.

        Manager:
          Can approve/reject only the employee's
          plan when that employee reports to them.
      */
      const authorizationCondition = admin
        ? "1 = 1"
        : `
          u.reports_to = ?
        `;

      const authorizationParams = admin
        ? []
        : [cleanUserId];

      /*
        IMPORTANT:
        Do not use an UPDATE JOIN here.

        First find the exact pending rows.
        Then update them.

        This is safer with MySQL ONLY_FULL_GROUP_BY
        and avoids UPDATE JOIN compatibility problems.
      */
      const findSql = `
        SELECT
          v.id
        FROM sales_visit_plans v

        INNER JOIN users u
          ON u.id = v.employee_id

        WHERE
          v.employee_id = ?

          AND DATE_FORMAT(
            v.visit_date,
            '%Y-%m'
          ) = ?

          AND v.approval_status = 'Pending'

          AND ${authorizationCondition}
      `;

      query(
        findSql,
        [
          cleanEmployeeId,
          cleanMonth,
          ...authorizationParams,
        ],
        (findErr, rows) => {
          if (findErr) {
            console.error(
              "Approval pending-plan lookup failed:",
              findErr
            );

            return callback(findErr);
          }

          if (!rows?.length) {
            return callback(
              null,
              {
                affectedRows: 0,
                status: finalStatus,
              }
            );
          }

          const ids = rows
            .map((row) =>
              Number(row.id)
            )
            .filter(Boolean);

          if (!ids.length) {
            return callback(
              null,
              {
                affectedRows: 0,
                status: finalStatus,
              }
            );
          }

          const placeholders =
            ids
              .map(() => "?")
              .join(",");

          /*
            Update only the rows that were verified
            above as Pending and authorized.
          */
          const updateSql = `
            UPDATE sales_visit_plans

            SET
              approval_status = ?,
              approval_by = ?,
              approval_at = NOW(),
              updated_by = ?

            WHERE id IN (${placeholders})

              AND approval_status = 'Pending'
          `;

          const updateParams = [
            finalStatus,
            cleanUserId,
            cleanUserId,
            ...ids,
          ];

          query(
            updateSql,
            updateParams,
            (updateErr, result) => {
              if (updateErr) {
                console.error(
                  "Travel plan approval update failed:",
                  updateErr
                );

                return callback(
                  updateErr
                );
              }

              callback(
                null,
                {
                  affectedRows:
                    Number(
                      result?.affectedRows || 0
                    ),
                  status:
                    finalStatus,
                }
              );
            }
          );
        }
      );
    }
  );
};

/* =========================================================
   SALES REVIEW
========================================================= */

const getReview = (
  filters = {},
  callback
) => {
  const params = [];

  const conditions = [
    "1=1",
  ];

  const add = (
    sql,
    value
  ) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      conditions.push(sql);
      params.push(value);
    }
  };

  add(
    "year = ?",
    filters.years
      ? Number(
          String(
            filters.years
          ).split(",")[0]
        )
      : ""
  );

  add(
    "month LIKE ?",
    filters.months
      ? `%${filters.months}%`
      : ""
  );

  add(
    "week LIKE ?",
    filters.weeks
      ? `%${filters.weeks}%`
      : ""
  );

  add(
    "reports_to LIKE ?",
    filters.reports_to
      ? `%${filters.reports_to}%`
      : ""
  );

  add(
    "asm LIKE ?",
    filters.asm
      ? `%${filters.asm}%`
      : ""
  );

  add(
    "store_name LIKE ?",
    filters.store
      ? `%${filters.store}%`
      : ""
  );

  if (filters.search) {
    conditions.push(
      `
      (
        store_name LIKE ?
        OR remarks LIKE ?
      )
      `
    );

    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`
    );
  }

  const page = Math.max(
    1,
    Number(filters.page || 1)
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(filters.limit || 5)
    )
  );

  const offset =
    (page - 1) * limit;

  const where =
    conditions.join(" AND ");

  query(
    `
    SELECT
      COUNT(*) AS total

    FROM sales_review_records

    WHERE ${where}
    `,
    params,
    (countErr, countRows) => {
      if (countErr) {
        return callback(countErr);
      }

      query(
        `
        SELECT *

        FROM sales_review_records

        WHERE ${where}

        ORDER BY id ASC

        LIMIT ?

        OFFSET ?
        `,
        [
          ...params,
          limit,
          offset,
        ],
        (err, rows) => {
          if (err) {
            return callback(err);
          }

          query(
            `
            SELECT
              benchmark_key,
              benchmark_value

            FROM sales_review_benchmarks
            `,
            [],
            (benchErr, benchRows) => {
              if (benchErr) {
                return callback(
                  benchErr
                );
              }

              const benchmarks = {};

              benchRows.forEach(
                (row) => {
                  benchmarks[
                    row.benchmark_key
                  ] =
                    row.benchmark_value;
                }
              );

              /*
                The table is paginated, but dashboard analytics must
                use the complete filtered dataset. This prevents the
                Target/MTD/Projection cards and chart from changing
                just because the user moved to another table page.
              */
              query(
                `
                SELECT
                  COALESCE(SUM(target), 0) AS target,
                  COALESCE(SUM(mtd), 0) AS mtd,
                  COALESCE(SUM(mrp_sale), 0) AS mrp_sale,
                  COALESCE(SUM(last_month_sale), 0) AS last_month_sale,
                  COALESCE(SUM(lysm), 0) AS lysm,
                  COALESCE(SUM(projection), 0) AS projection,
                  COALESCE(SUM(projection_remaining), 0) AS projection_remaining,
                  COALESCE(SUM(projection_selected_week), 0) AS projection_selected_week,
                  COALESCE(SUM(discount_amount), 0) AS discount_amount,
                  COALESCE(AVG(discount_percent), 0) AS discount_percent,
                  COALESCE(AVG(upt), 0) AS upt,
                  COALESCE(AVG(abv), 0) AS abv,
                  COALESCE(AVG(asp), 0) AS asp,
                  COALESCE(SUM(bill_count), 0) AS bill_count,
                  COALESCE(SUM(qty_sold), 0) AS qty_sold,
                  COUNT(DISTINCT store_name) AS store_count
                FROM sales_review_records
                WHERE ${where}
                `,
                params,
                (analyticsErr, analyticsRows) => {
                  if (analyticsErr) {
                    return callback(analyticsErr);
                  }

                  const raw = analyticsRows?.[0] || {};
                  const toNumber = (value) => Number(value || 0);
                  const target = toNumber(raw.target);
                  const mtd = toNumber(raw.mtd);
                  const lastMonthSale = toNumber(raw.last_month_sale);
                  const projection = toNumber(raw.projection);

                  const growth = (current, previous) =>
                    previous !== 0
                      ? ((current - previous) / Math.abs(previous)) * 100
                      : current > 0
                        ? 100
                        : 0;

                  const analytics = {
                    target,
                    mtd,
                    mrp_sale: toNumber(raw.mrp_sale),
                    last_month_sale: lastMonthSale,
                    lysm: toNumber(raw.lysm),
                    projection,
                    projection_remaining: toNumber(raw.projection_remaining),
                    projection_selected_week: toNumber(raw.projection_selected_week),
                    discount_amount: toNumber(raw.discount_amount),
                    discount_percent: toNumber(raw.discount_percent),
                    upt: toNumber(raw.upt),
                    abv: toNumber(raw.abv),
                    asp: toNumber(raw.asp),
                    bill_count: toNumber(raw.bill_count),
                    qty_sold: toNumber(raw.qty_sold),
                    store_count: toNumber(raw.store_count),
                    mtd_growth: growth(mtd, lastMonthSale),
                    mtd_vs_lysm: growth(mtd, toNumber(raw.lysm)),
                    projection_vs_target: growth(projection, target),
                    target_achievement: target !== 0 ? (mtd / target) * 100 : 0,
                    projection_achievement: target !== 0 ? (projection / target) * 100 : 0,
                    projection_gap: projection - target,
                  };

                  query(
                    `
                    SELECT
                      year,
                      month,
                      week,
                      MIN(id) AS first_id,
                      COALESCE(SUM(target), 0) AS target,
                      COALESCE(SUM(mtd), 0) AS mtd,
                      COALESCE(SUM(projection), 0) AS projection
                    FROM sales_review_records
                    WHERE ${where}
                    GROUP BY year, month, week
                    ORDER BY first_id ASC
                    LIMIT 24
                    `,
                    params,
                    (trendErr, trendRows) => {
                      if (trendErr) {
                        return callback(trendErr);
                      }

                      const trend = (trendRows || []).map((row) => ({
                        label: [row.month, row.week].filter(Boolean).join(" / ") || `Period ${row.first_id}`,
                        year: row.year,
                        month: row.month,
                        week: row.week,
                        target: toNumber(row.target),
                        mtd: toNumber(row.mtd),
                        projection: toNumber(row.projection),
                      }));

                      callback(
                        null,
                        {
                          rows,
                          total: Number(
                            countRows[0]?.total || 0
                          ),
                          benchmarks,
                          analytics,
                          trend,
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

/* =========================================================
   CLEAR SALES REVIEW
========================================================= */

const clearReview = (
  callback
) => {
  query(
    `
    DELETE FROM sales_review_records
    `,
    [],
    callback
  );
};

/* =========================================================
   UPSERT BENCHMARKS
========================================================= */

const upsertBenchmarks = (
  data,
  userId,
  callback
) => {
  const values = [
    [
      "upt",
      Number(data.upt || 0),
      userId,
    ],
    [
      "abv",
      Number(data.abv || 0),
      userId,
    ],
    [
      "asp",
      Number(data.asp || 0),
      userId,
    ],
  ];

  query(
    `
    INSERT INTO sales_review_benchmarks
    (
      benchmark_key,
      benchmark_value,
      updated_by
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      benchmark_value =
        VALUES(benchmark_value),

      updated_by =
        VALUES(updated_by)
    `,
    [values],
    callback
  );
};

/* =========================================================
   IMPORT SALES REVIEW
========================================================= */

const normalizeSalesReviewHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getSalesReviewCell = (row, aliases = []) => {
  const entries = Object.entries(row || {});

  for (const alias of aliases) {
    const wanted =
      normalizeSalesReviewHeader(alias);

    const found = entries.find(
      ([key]) =>
        normalizeSalesReviewHeader(key) ===
        wanted
    );

    if (found) {
      return found[1];
    }
  }

  return "";
};

const toSalesReviewNumber = (
  value,
  fallback = 0
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  let text = String(value).trim();

  /*
    Excel/CSV values can contain commas, currency symbols,
    spaces, percent signs and accounting-style negatives.
  */
  const negative =
    text.startsWith("(") &&
    text.endsWith(")");

  text = text
    .replace(/^\((.*)\)$/, "$1")
    .replace(/[,\s₹$€£]/g, "")
    .replace(/%$/, "");

  const parsed = Number(text);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return negative ? -parsed : parsed;
};

const toSalesReviewInteger = (
  value,
  fallback = null
) => {
  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value.getFullYear();
  }

  const parsed =
    toSalesReviewNumber(
      value,
      NaN
    );

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.trunc(parsed);
};

const toSalesReviewString = (
  value,
  maxLength = null
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  let text = String(value).trim();

  if (!text) {
    return null;
  }

  if (
    maxLength &&
    text.length > maxLength
  ) {
    text = text.slice(
      0,
      maxLength
    );
  }

  return text;
};

const toSalesReviewStoreId = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const text = String(value).trim();

  /*
    store_id is an INT column. A store code such as
    ST001 must never be inserted into it because MySQL
    strict mode can reject the entire bulk INSERT.
  */
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const id = Number(text);

  return Number.isSafeInteger(id) &&
    id > 0
    ? id
    : null;
};

const importReviewRows = (
  rows,
  userId,
  callback
) => {
  if (!Array.isArray(rows) || !rows.length) {
    return callback(
      null,
      {
        affectedRows: 0,
        imported: 0,
        skipped: 0,
        errors: [],
      }
    );
  }

  const values = [];
  const errors = [];

  rows.forEach(
    (row, index) => {
      const rowNumber =
        index + 2;

      /*
        Accept both the sample/template headers and common
        headers exported by Excel/CSV reports.
      */
      const storeId =
        toSalesReviewStoreId(
          getSalesReviewCell(
            row,
            [
              "store_id",
              "Store ID",
              "store id",
              "storeid",
            ]
          )
        );

      const storeName =
        toSalesReviewString(
          getSalesReviewCell(
            row,
            [
              "store_name",
              "Store Name",
              "store",
              "Store",
              "shop_name",
              "Shop Name",
              "outlet",
              "Outlet",
              "outlet_name",
              "Outlet Name",
            ]
          ),
          255
        );

      /*
        store_name is NOT NULL in the database. Do not allow
        an empty value to make the whole bulk INSERT fail.
      */
      if (!storeName) {
        errors.push(
          `Row ${rowNumber}: Store Name is required.`
        );

        return;
      }

      const yearValue =
        getSalesReviewCell(
          row,
          [
            "year",
            "Year",
          ]
        );

      const year =
        toSalesReviewInteger(
          yearValue,
          null
        );

      const month =
        toSalesReviewString(
          getSalesReviewCell(
            row,
            [
              "month",
              "Month",
            ]
          ),
          40
        );

      const week =
        toSalesReviewString(
          getSalesReviewCell(
            row,
            [
              "week",
              "Week",
            ]
          ),
          40
        );

      const target =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "target",
              "Target",
            ]
          )
        );

      const mtd =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "mtd",
              "MTD",
            ]
          )
        );

      const mrpSale =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "mrp_sale",
              "MRP Sale",
              "mrp",
            ]
          )
        );

      const lastMonthSale =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "last_month_sale",
              "Last Month Sale",
            ]
          )
        );

      const lysm =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "lysm",
              "LYSM",
            ]
          )
        );

      const projection =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "projection",
              "Projection",
            ]
          )
        );

      const projectionRemaining =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "projection_remaining",
              "Projection For Remaining Days",
              "Projection Remaining",
              "projection_for_remaining_days",
            ]
          )
        );

      const projectionSelectedWeek =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "projection_selected_week",
              "Projection (by selected week)",
              "Projection Selected Week",
            ]
          )
        );

      const discountAmount =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "discount_amount",
              "Discount Amount (MRP)",
              "Discount Amount",
            ]
          )
        );

      const discountPercent =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "discount_percent",
              "Discount %",
              "Discount Percent",
            ]
          )
        );

      const upt =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "upt",
              "UPT",
            ]
          )
        );

      const abv =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "abv",
              "ABV",
            ]
          )
        );

      const asp =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "asp",
              "ASP",
            ]
          )
        );

      const billCount =
        Math.trunc(
          toSalesReviewNumber(
            getSalesReviewCell(
              row,
              [
                "bill_count",
                "Bill Count",
                "Bills",
              ]
            )
          )
        );

      const qtySold =
        toSalesReviewNumber(
          getSalesReviewCell(
            row,
            [
              "qty_sold",
              "Qty Sold",
              "Quantity Sold",
              "Qty",
            ]
          )
        );

      const reportsTo =
        toSalesReviewString(
          getSalesReviewCell(
            row,
            [
              "reports_to",
              "Reports To",
              "manager",
              "Manager",
            ]
          ),
          255
        );

      const asm =
        toSalesReviewString(
          getSalesReviewCell(
            row,
            [
              "asm",
              "ASM",
            ]
          ),
          255
        );

      const remarks =
        toSalesReviewString(
          getSalesReviewCell(
            row,
            [
              "remarks",
              "Remarks",
              "remark",
            ]
          )
        );

      values.push([
        storeId,
        storeName,
        year,
        month,
        week,
        target,
        mtd,
        mrpSale,
        lastMonthSale,
        lysm,
        projection,
        projectionRemaining,
        projectionSelectedWeek,
        discountAmount,
        discountPercent,
        upt,
        abv,
        asp,
        billCount,
        qtySold,
        reportsTo,
        asm,
        remarks,
        Number(userId) || null,
      ]);
    }
  );

  /*
    If every row was invalid, return a client error instead of
    attempting an empty INSERT.
  */
  if (!values.length) {
    return callback(
      Object.assign(
        new Error(
          "No valid Sales Review rows were found."
        ),
        {
          code:
            "SALES_REVIEW_INVALID_ROWS",
          details: errors.slice(
            0,
            20
          ),
        }
      )
    );
  }

  query(
    `
    INSERT INTO sales_review_records
    (
      store_id,
      store_name,
      year,
      month,
      week,
      target,
      mtd,
      mrp_sale,
      last_month_sale,
      lysm,
      projection,
      projection_remaining,
      projection_selected_week,
      discount_amount,
      discount_percent,
      upt,
      abv,
      asp,
      bill_count,
      qty_sold,
      reports_to,
      asm,
      remarks,
      created_by
    )

    VALUES ?
    `,
    [values],
    (err, result) => {
      if (err) {
        return callback(err);
      }

      callback(
        null,
        {
          affectedRows:
            result?.affectedRows || 0,
          imported:
            values.length,
          skipped:
            errors.length,
          errors:
            errors.slice(0, 20),
        }
      );
    }
  );
};

/* =========================================================
   EXPORT VISIT PLANS
========================================================= */

const exportVisitRows = (
  filters = {},
  user = {},
  callback
) => {
  const params = [];

  let where =
    buildVisitWhere(
      filters,
      user,
      params
    );

  if (
    String(
      filters.approved_only || ""
    ) === "1" ||
    String(
      filters.approved_only || ""
    ).toLowerCase() === "true"
  ) {
    where +=
      " AND v.approval_status = 'Approved'";
  }

  query(
    `
    ${visitSelect}

    WHERE ${where}

    GROUP BY v.id

    ORDER BY
      v.visit_date DESC,
      v.id DESC
    `,
    params,
    callback
  );
};

/* =========================================================
   EXPORT SALES REVIEW
========================================================= */

const exportReviewRows = (
  filters = {},
  callback
) => {
  const params = [];

  const conditions = [
    "1=1",
  ];

  const add = (
    sql,
    value
  ) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      conditions.push(sql);
      params.push(value);
    }
  };

  add(
    "year = ?",
    filters.years
      ? Number(
          String(
            filters.years
          ).split(",")[0]
        )
      : ""
  );

  add(
    "month LIKE ?",
    filters.months
      ? `%${filters.months}%`
      : ""
  );

  add(
    "week LIKE ?",
    filters.weeks
      ? `%${filters.weeks}%`
      : ""
  );

  add(
    "reports_to LIKE ?",
    filters.reports_to
      ? `%${filters.reports_to}%`
      : ""
  );

  add(
    "asm LIKE ?",
    filters.asm
      ? `%${filters.asm}%`
      : ""
  );

  add(
    "store_name LIKE ?",
    filters.store
      ? `%${filters.store}%`
      : ""
  );

  if (filters.search) {
    conditions.push(
      `
      (
        store_name LIKE ?
        OR remarks LIKE ?
      )
      `
    );

    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`
    );
  }

  query(
    `
    SELECT *

    FROM sales_review_records

    WHERE ${conditions.join(
      " AND "
    )}

    ORDER BY id ASC
    `,
    params,
    callback
  );
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createTables,

  getEmployees,
  getStores,

  getVisitPlans,
  createVisitPlan,
  updateVisitPlan,
  getVisitPlanById,

  deleteVisitPlan,
  deleteAllVisitPlans,

  getTravelPlans,
  saveActualStores,

  getHistory,
  addHistory,

  getApprovals,
  getApprovalRecipients,
  getEmployeeForApproval,
  changeApproval,

  getReview,
  clearReview,
  upsertBenchmarks,
  importReviewRows,

  exportVisitRows,
  exportReviewRows,
};