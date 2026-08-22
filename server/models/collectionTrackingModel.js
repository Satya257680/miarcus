const db = require("../config/db");

/* =========================================================
   COLLECTION TRACKING STAGES
========================================================= */

const STAGES = [
  "Designer",
  "Buyer",
  "Tech Team",
  "Quality",
  "E-Com",
  "Warehouse",
];

/* =========================================================
   DEFAULT DROPDOWN OPTIONS
========================================================= */

const DEFAULT_OPTIONS = {
  Collection: [
    "TEETHING",
    "SAFARI",
    "UNICORN",
    "MOTHERHOOD",
    "KOALA",
    "COUDLE",
    "ARCUS",
    "CHRISTMAS 20",
    "GINGHAM",
  ],

  Category: [
    "CLOTHING",
    "ACCESSORIES",
    "BABY GEAR",
    "BATHING",
    "BEDDING",
    "FEEDING",
    "FOOTWEAR",
    "FURNITURE",
  ],

  "Sub Category": [
    "BOTTOM WEAR",
    "DUNGAREE",
    "INNERWEAR",
    "JACKET",
    "SETS",
    "SLEEP WEAR",
    "SWEATER",
  ],

  "Product Type": [
    "DENIM",
    "JOGGER",
    "LEGGING",
    "PYJAMA",
    "SHORTS",
    "SKIRT",
    "TROUSER",
    "DUNGAREE",
  ],

  Weather: [
    "ALL WEATHER",
    "PP WINTER",
    "SUMMER",
    "WINTER",
  ],

  Season: [
    "AW27",
    "SS27",
    "AW26",
    "SS26",
    "AW25",
    "SS25",
  ],

  Sizes: [
    "NB",
    "0-3M",
    "3-6M",
    "6-9M",
    "9-12M",
    "12-18M",
    "18-24M",
    "2-3Y",
    "3-4Y",
    "5-6Y",
  ],

  Color: [
    "Black",
    "White",
    "Navy",
    "Red",
    "Blue",
    "Green",
    "Grey",
    "Beige",
    "Brown",
    "Pink",
    "Yellow",
    "Orange",
    "Purple",
  ],

  Gender: [
    "BABY BOY",
    "BABY GIRL",
    "MOTHER",
    "UNISEX",
  ],

  "Pattern / Print": [
    "SOLID",
    "STRIPED",
    "CHECK",
    "PRINTED",
  ],

  Vendor: [
    "Vendor A",
    "Vendor B",
    "Vendor C",
  ],

  Pack: [
    "Single",
    "2 Pack",
    "3 Pack",
    "Assorted",
  ],

  "Fabric / Material": [
    "100% Cotton",
    "100% Polyester",
    "Blended",
  ],

  "Blend Details": [
    "COTTON/POLYESTER",
    "NATURAL RUBBER",
    "COTTON",
    "POLYESTER",
  ],

  GST: [
    "GST 18%",
    "GST 3%",
    "GST 5%",
    "GST APPAREL",
    "GST TAXFREE",
  ],

  Country: [
    "India",
    "China",
    "Bangladesh",
    "Turkey",
    "Vietnam",
    "Other",
  ],

  "Inner Material": [
    "Cotton",
    "Polyester",
    "Foam",
  ],

  "Outer Material": [
    "Cotton",
    "Polyester",
    "Leather",
    "Synthetic",
  ],

  "Sole Material": [
    "Rubber",
    "EVA",
    "PVC",
  ],

  Closure: [
    "Zip",
    "Button",
    "Velcro",
    "Slip-on",
  ],

  Capacity: [
    "Small",
    "Medium",
    "Large",
  ],

  "Wash Care": [
    "Machine wash cold",
    "Hand wash only",
    "Do not bleach",
    "Line dry",
    "Dry clean only",
  ],

  "Testing Result": [
    "Pass",
    "Fail",
    "Partially Ok",
  ],

  "Photoshoot Sample Received": [
    "Yes",
    "No",
  ],
};

/* =========================================================
   DEFAULT MASTER DATA FIELDS
========================================================= */

const DEFAULT_FIELDS = {
  Designer: [
    ["Designer Name", "text", true],
    ["Images", "attachment-multiple", false],
    ["Collection", "select", true],
    ["Category", "select", true],
    ["Sub Category", "select", true],
    ["Product Type", "select", true],
    ["Article Name", "text", true],
    ["Weather", "select", true],
    ["Season", "multiselect", true],
    ["Product Name", "text", true],
    ["Sizes", "multiselect", true],
    ["Color", "multiselect", true],
    ["Gender", "multiselect", true],
    ["Pattern / Print", "select", true],
    ["Water Proof / Resistant", "text", false],
    ["Sleeve Type", "text", false],
    ["Pocket", "text", false],
    ["Closure Top / Bottom", "text", false],
    ["Neck Type", "text", false],
    ["Weave", "text", false],
    ["Item Contains", "text", false],
    ["Designer Remarks", "textarea", false],
  ],

  Buyer: [
    ["Article Name", "readonly", false],
    ["PPK Code", "readonly", true],
    ["Vendor", "select", true],
    ["Buyer Name", "readonly", true],
    ["Color", "readonly", true],
    ["Size", "readonly", true],
    ["Gender", "readonly", true],
    ["Barcode", "text", false],
    ["SKU (Additional Item Code)", "text", false],
    ["Product Name", "text", true],
    ["Size Non Apparel (L×W×H)", "text", true],
    ["Pack", "select", true],
    ["Fabric / Material", "select", true],
    ["Blend Details", "select", true],
    ["GSM", "text", true],
    ["Thread Count", "text", true],
    ["Composition", "text", true],
    ["BIS", "text", true],
    ["HSN", "text", true],
    ["GST", "select", true],
    ["Base Price", "text", true],
    ["MRP", "text", true],
    ["Country", "select", true],
    ["Manufacturer", "text", true],
    ["Fit Handover Date", "date", true],
    ["PP Sample Handover Date", "date", true],
    [
      "Photo Shoot Sample Handover Date",
      "date",
      true,
    ],
    [
      "Photo Shoot Sample Handover Picture",
      "attachment-multiple",
      false,
    ],
    ["Buyer Remarks", "textarea", false],
  ],

  "Tech Team": [
    ["Barcode", "readonly", true],
    ["SKU", "readonly", true],
    ["Product Name", "readonly", true],
    ["Age Group", "readonly", true],
    ["Size Non Apparel", "readonly", true],
    ["Pack", "readonly", true],
    ["Size Chart", "attachment-single", false],
    ["Inner Material", "select", true],
    ["Outer Material", "select", true],
    ["Sole Material", "select", true],
    ["Closure", "select", true],
    ["Circumference", "text", false],
    ["Capacity", "select", true],
    ["Fit Approval Date", "date", true],
    ["Size Set Approval Date", "date", true],
    ["PP Sample Approval Date", "date", true],
    ["Tech Team Remarks", "textarea", false],
  ],

  Quality: [
    ["Barcode", "readonly", true],
    ["SKU", "readonly", true],
    ["Product Name", "readonly", true],
    ["Age Group", "readonly", true],
    ["Base Price", "readonly", true],
    ["MRP", "readonly", true],
    ["Packing Dimension", "text", true],
    ["Product Weight", "text", true],
    ["Wash Care", "select", false],
    ["Testing Result", "select", false],
    ["Upload Test Result", "attachment-multiple", false],
    ["Fail Reason", "textarea", false],
    ["Final Inspection Date", "date", true],
    [
      "Final Inspection Report Attachment",
      "attachment-multiple",
      false,
    ],
    ["QC Remarks", "textarea", false],
  ],

  "E-Com": [
    ["Barcode", "readonly", true],
    ["SKU", "readonly", true],
    ["Product Name", "readonly", true],
    ["Age Group", "readonly", true],
    ["Base Price", "readonly", true],
    ["MRP", "readonly", true],
    [
      "Photo Shoot Sample Handover Date",
      "readonly",
      false,
    ],
    [
      "Photoshoot Sample Received",
      "select",
      true,
    ],
    [
      "Photo Shoot Sample Received Date",
      "date",
      true,
    ],
    [
      "Photo Shoot Sample Received Status",
      "readonly",
      true,
    ],
    [
      "Photo Shoot Completion Date",
      "date",
      false,
    ],
    ["Website Listing Name", "text", false],
    ["Channel Listing Date", "date", false],
    ["E-Com Remarks", "textarea", false],
  ],

  Warehouse: [
    ["Barcode", "readonly", true],
    ["SKU", "readonly", true],
    ["Product Name", "readonly", true],
    ["Age Group", "readonly", true],
    ["Base Price", "readonly", true],
    ["MRP", "readonly", true],
    ["Receiving Date", "date", true],
    ["GRN Date", "date", true],
    ["Warehouse Remarks", "textarea", false],
  ],
};

/* =========================================================
   HELPERS
========================================================= */

const parseJson = (value) => {
  try {
    return value
      ? JSON.parse(value)
      : {};
  } catch {
    return {};
  }
};

const normaliseStage = (stage) =>
  String(stage || "").trim();

const isValidStage = (stage) =>
  STAGES.includes(
    normaliseStage(stage)
  );

/* =========================================================
   ENSURE DATABASE TABLES
========================================================= */

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_stage_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stage_name VARCHAR(50) NOT NULL,
      field_name VARCHAR(150) NOT NULL,
      display_type VARCHAR(40) NOT NULL DEFAULT 'text',
      is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
      options_json LONGTEXT NULL,
      sort_order INT NOT NULL DEFAULT 0,

      UNIQUE KEY uq_ct_field(
        stage_name,
        field_name
      )
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_products (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(80) NOT NULL UNIQUE,
      product_name VARCHAR(255) NULL,

      current_stage VARCHAR(50)
        NOT NULL DEFAULT 'Designer',

      status VARCHAR(40)
        NOT NULL DEFAULT 'In Progress',

      created_by INT NULL,

      created_at DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_ct_stage(current_stage),
      INDEX idx_ct_status(status)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_stage_data (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,

      product_id BIGINT NOT NULL,

      stage_name VARCHAR(50)
        NOT NULL,

      data_json LONGTEXT NULL,

      updated_by INT NULL,

      updated_at DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      UNIQUE KEY uq_ct_stage(
        product_id,
        stage_name
      ),

      INDEX idx_ct_product(product_id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_stage_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,

      product_id BIGINT NOT NULL,

      stage_name VARCHAR(50)
        NOT NULL,

      action VARCHAR(40)
        NOT NULL,

      note TEXT NULL,

      user_id INT NULL,

      created_at DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_ct_history(
        product_id,
        id
      )
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_comments (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,

      product_id BIGINT NOT NULL,

      stage_name VARCHAR(50)
        NOT NULL,

      user_id INT NULL,

      comment TEXT NOT NULL,

      created_at DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_ct_comments(
        product_id,
        id
      )
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_requests (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,

      product_id BIGINT NOT NULL,

      from_stage VARCHAR(50)
        NOT NULL,

      to_stage VARCHAR(50)
        NOT NULL,

      requested_by INT NULL,

      status VARCHAR(30)
        NOT NULL DEFAULT 'Pending',

      note TEXT NULL,

      reviewed_by INT NULL,

      reviewed_at DATETIME NULL,

      created_at DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_ct_req_status(status)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_permissions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,

      stage_name VARCHAR(50)
        NOT NULL,

      department_id INT NULL,

      cross_department TINYINT(1)
        NOT NULL DEFAULT 0,

      UNIQUE KEY uq_ct_perm(
        stage_name,
        department_id
      )
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
  `);

  /* -------------------------------------------------------
     Insert default Master Data only when a stage has
     no configuration yet.
  ------------------------------------------------------- */

  for (const stage of STAGES) {
    const existing = await db.query(
      `
        SELECT COUNT(*) AS count
        FROM collection_stage_configs
        WHERE stage_name = ?
      `,
      [stage]
    );

    const count = Number(
      existing?.[0]?.count ||
        existing?.[0]?.c ||
        0
    );

    if (count === 0) {
      const fields =
        DEFAULT_FIELDS[stage] || [];

      for (
        let index = 0;
        index < fields.length;
        index += 1
      ) {
        const [
          field,
          type,
          mandatory,
        ] = fields[index];

        await db.query(
          `
            INSERT IGNORE INTO
            collection_stage_configs
            (
              stage_name,
              field_name,
              display_type,
              is_mandatory,
              options_json,
              sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            stage,
            field,
            type,
            mandatory ? 1 : 0,
            JSON.stringify(
              DEFAULT_OPTIONS[field] || []
            ),
            index,
          ]
        );
      }
    }
  }
}

/* =========================================================
   GET MASTER DATA CONFIG
========================================================= */

const getConfigs = async (
  stage = ""
) => {
  const cleanStage =
    normaliseStage(stage);

  const rows = await db.query(
    `
      SELECT *
      FROM collection_stage_configs
      ${
        cleanStage
          ? "WHERE stage_name = ?"
          : ""
      }
      ORDER BY
        stage_name,
        sort_order,
        id
    `,
    cleanStage
      ? [cleanStage]
      : []
  );

  return rows.map((row) => ({
    ...row,

    is_mandatory:
      Boolean(row.is_mandatory),

    options:
      parseJson(
        row.options_json
      ) || [],
  }));
};

/* =========================================================
   SAVE MASTER DATA CONFIG
========================================================= */

const saveConfigs = async (
  stage,
  fields
) => {
  const cleanStage =
    normaliseStage(stage);

  if (!isValidStage(cleanStage)) {
    throw new Error(
      "Invalid workflow stage."
    );
  }

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        DELETE FROM
        collection_stage_configs
        WHERE stage_name = ?
      `,
      [cleanStage]
    );

    for (
      let index = 0;
      index < fields.length;
      index += 1
    ) {
      const field =
        fields[index] || {};

      const fieldName =
        String(
          field.field_name ||
            "Field"
        ).trim();

      if (!fieldName) {
        continue;
      }

      const displayType =
        String(
          field.display_type ||
            "text"
        ).trim();

      const mandatory =
        field.is_mandatory
          ? 1
          : 0;

      const options =
        Array.isArray(
          field.options
        )
          ? field.options
          : [];

      await connection.query(
        `
          INSERT INTO
          collection_stage_configs
          (
            stage_name,
            field_name,
            display_type,
            is_mandatory,
            options_json,
            sort_order
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          cleanStage,
          fieldName,
          displayType,
          mandatory,
          JSON.stringify(options),
          index,
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/* =========================================================
   CREATE PRODUCT
========================================================= */

const createProduct = async ({
  productCode,
  productName,
  createdBy,
  data,
}) => {
  const cleanCode =
    String(
      productCode || ""
    ).trim();

  if (!cleanCode) {
    throw new Error(
      "Product code is required."
    );
  }

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const result =
      await connection.query(
        `
          INSERT INTO
          collection_products
          (
            product_code,
            product_name,
            current_stage,
            status,
            created_by
          )
          VALUES (
            ?,
            ?,
            'Designer',
            'In Progress',
            ?
          )
        `,
        [
          cleanCode,
          productName
            ? String(
                productName
              ).trim()
            : null,
          createdBy || null,
        ]
      );

    const id =
      result.insertId;

    await connection.query(
      `
        INSERT INTO
        collection_stage_data
        (
          product_id,
          stage_name,
          data_json,
          updated_by
        )
        VALUES (?, 'Designer', ?, ?)
      `,
      [
        id,
        JSON.stringify(
          data || {}
        ),
        createdBy || null,
      ]
    );

    await connection.query(
      `
        INSERT INTO
        collection_stage_history
        (
          product_id,
          stage_name,
          action,
          note,
          user_id
        )
        VALUES (
          ?,
          'Designer',
          'Created',
          'Product created',
          ?
        )
      `,
      [
        id,
        createdBy || null,
      ]
    );

    await connection.commit();

    return getProduct(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/* =========================================================
   LIST PRODUCTS
========================================================= */

const listProducts = async ({
  search = "",
  stage = "",
  status = "",
  page = 1,
  pageSize = 20,
} = {}) => {
  const currentPage =
    Math.max(
      1,
      Number(page) || 1
    );

  const size = Math.min(
    100,
    Math.max(
      1,
      Number(pageSize) || 20
    )
  );

  const offset =
    (currentPage - 1) *
    size;

  const conditions = [];
  const params = [];

  if (search) {
    const query =
      `%${String(
        search
      ).trim()}%`;

    conditions.push(
      `
        (
          p.product_code LIKE ?
          OR p.product_name LIKE ?
        )
      `
    );

    params.push(
      query,
      query
    );
  }

  if (stage) {
    if (!isValidStage(stage)) {
      throw new Error(
        "Invalid workflow stage."
      );
    }

    conditions.push(
      "p.current_stage = ?"
    );

    params.push(stage);
  }

  if (status) {
    conditions.push(
      "p.status = ?"
    );

    params.push(status);
  }

  const where =
    conditions.length
      ? `WHERE ${conditions.join(
          " AND "
        )}`
      : "";

  const [
    rows,
    count,
  ] = await Promise.all([
    db.query(
      `
        SELECT
          p.*,
          u.name AS creator_name,
          u.email AS creator_email

        FROM collection_products p

        LEFT JOIN users u
          ON u.id = p.created_by

        ${where}

        ORDER BY
          p.updated_at DESC,
          p.id DESC

        LIMIT ?
        OFFSET ?
      `,
      [
        ...params,
        size,
        offset,
      ]
    ),

    db.query(
      `
        SELECT
          COUNT(*) AS total

        FROM collection_products p

        ${where}
      `,
      params
    ),
  ]);

  return {
    rows,
    total: Number(
      count?.[0]?.total || 0
    ),
    page: currentPage,
    pageSize: size,
  };
};

/* =========================================================
   GET PRODUCT
========================================================= */

const getProduct = async (
  id
) => {
  const rows =
    await db.query(
      `
        SELECT
          p.*,
          u.name AS creator_name,
          u.email AS creator_email

        FROM collection_products p

        LEFT JOIN users u
          ON u.id = p.created_by

        WHERE p.id = ?

        LIMIT 1
      `,
      [id]
    );

  if (!rows?.[0]) {
    return null;
  }

  const stages =
    await db.query(
      `
        SELECT *
        FROM collection_stage_data
        WHERE product_id = ?
        ORDER BY id
      `,
      [id]
    );

  return {
    ...rows[0],

    stage_data:
      Object.fromEntries(
        stages.map((row) => [
          row.stage_name,
          parseJson(
            row.data_json
          ),
        ])
      ),
  };
};

/* =========================================================
   HISTORY
========================================================= */

const getHistory = async (
  id
) =>
  db.query(
    `
      SELECT
        h.*,
        u.name AS user_name,
        u.email AS user_email

      FROM collection_stage_history h

      LEFT JOIN users u
        ON u.id = h.user_id

      WHERE h.product_id = ?

      ORDER BY h.id DESC
    `,
    [id]
  );

/* =========================================================
   COMMENTS
========================================================= */

const getComments = async (
  id
) =>
  db.query(
    `
      SELECT
        c.*,
        u.name AS user_name,
        u.email AS user_email

      FROM collection_comments c

      LEFT JOIN users u
        ON u.id = c.user_id

      WHERE c.product_id = ?

      ORDER BY c.id DESC
    `,
    [id]
  );

/* =========================================================
   UPDATE STAGE
========================================================= */

const updateStage = async ({
  id,
  stage,
  data,
  userId,
  note,
  nextStage,
}) => {
  const cleanStage =
    normaliseStage(stage);

  const cleanNextStage =
    nextStage
      ? normaliseStage(
          nextStage
        )
      : null;

  if (!isValidStage(cleanStage)) {
    throw new Error(
      "Invalid workflow stage."
    );
  }

  if (
    cleanNextStage &&
    !isValidStage(cleanNextStage)
  ) {
    throw new Error(
      "Invalid next workflow stage."
    );
  }

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    /* -----------------------------------------------------
       Save current stage data
    ----------------------------------------------------- */

    await connection.query(
      `
        INSERT INTO
        collection_stage_data
        (
          product_id,
          stage_name,
          data_json,
          updated_by
        )
        VALUES (?, ?, ?, ?)

        ON DUPLICATE KEY UPDATE
          data_json =
            VALUES(data_json),

          updated_by =
            VALUES(updated_by)
      `,
      [
        id,
        cleanStage,
        JSON.stringify(
          data || {}
        ),
        userId || null,
      ]
    );

    /* -----------------------------------------------------
       Move to next stage only when explicitly requested
    ----------------------------------------------------- */

    const target =
      cleanNextStage ||
      cleanStage;

    const finalStage =
      STAGES[
        STAGES.length - 1
      ];

    const newStatus =
      target === finalStage
        ? "Completed"
        : "In Progress";

    await connection.query(
      `
        UPDATE collection_products

        SET
          current_stage = ?,
          status = ?

        WHERE id = ?
      `,
      [
        target,
        newStatus,
        id,
      ]
    );

    /* -----------------------------------------------------
       History
    ----------------------------------------------------- */

    await connection.query(
      `
        INSERT INTO
        collection_stage_history
        (
          product_id,
          stage_name,
          action,
          note,
          user_id
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        cleanStage,
        cleanNextStage
          ? "Submitted"
          : "Updated",
        note || null,
        userId || null,
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getProduct(id);
};

/* =========================================================
   ADD COMMENT
========================================================= */

const addComment = async ({
  id,
  stage,
  comment,
  userId,
}) => {
  const cleanStage =
    normaliseStage(stage);

  if (!isValidStage(cleanStage)) {
    throw new Error(
      "Invalid workflow stage."
    );
  }

  const cleanComment =
    String(
      comment || ""
    ).trim();

  if (!cleanComment) {
    throw new Error(
      "Remark is required."
    );
  }

  const result =
    await db.query(
      `
        INSERT INTO
        collection_comments
        (
          product_id,
          stage_name,
          user_id,
          comment
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        id,
        cleanStage,
        userId || null,
        cleanComment,
      ]
    );

  const rows =
    await db.query(
      `
        SELECT
          c.*,
          u.name AS user_name,
          u.email AS user_email

        FROM collection_comments c

        LEFT JOIN users u
          ON u.id = c.user_id

        WHERE c.id = ?
      `,
      [result.insertId]
    );

  return rows?.[0] || null;
};

/* =========================================================
   CREATE REQUEST
========================================================= */

const createRequest = async ({
  id,
  fromStage,
  toStage,
  userId,
  note,
}) => {
  const from =
    normaliseStage(
      fromStage
    );

  const to =
    normaliseStage(
      toStage
    );

  if (
    !isValidStage(from) ||
    !isValidStage(to)
  ) {
    throw new Error(
      "Invalid request stage."
    );
  }

  const fromIndex =
    STAGES.indexOf(from);

  const toIndex =
    STAGES.indexOf(to);

  if (
    toIndex !==
    fromIndex + 1
  ) {
    throw new Error(
      "Request must target the next workflow stage."
    );
  }

  const result =
    await db.query(
      `
        INSERT INTO
        collection_requests
        (
          product_id,
          from_stage,
          to_stage,
          requested_by,
          note
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        from,
        to,
        userId || null,
        note || null,
      ]
    );

  return result.insertId;
};

/* =========================================================
   LIST REQUESTS
========================================================= */

const listRequests = async ({
  status = "Pending",
} = {}) => {
  return db.query(
    `
      SELECT
        r.*,

        p.product_code,
        p.product_name,

        u.name AS requester_name,
        u.email AS requester_email

      FROM collection_requests r

      JOIN collection_products p
        ON p.id = r.product_id

      LEFT JOIN users u
        ON u.id = r.requested_by

      WHERE
        (? = '' OR r.status = ?)

      ORDER BY
        r.id DESC
    `,
    [
      status,
      status,
    ]
  );
};

/* =========================================================
   REVIEW REQUEST
========================================================= */

const reviewRequest = async ({
  id,
  status,
  userId,
}) => {
  const cleanStatus =
    String(
      status || ""
    ).trim();

  if (
    ![
      "Approved",
      "Rejected",
    ].includes(cleanStatus)
  ) {
    throw new Error(
      "Invalid request status."
    );
  }

  return db.query(
    `
      UPDATE collection_requests

      SET
        status = ?,
        reviewed_by = ?,
        reviewed_at = NOW()

      WHERE id = ?
    `,
    [
      cleanStatus,
      userId || null,
      id,
    ]
  );
};

/* =========================================================
   DELETE ONE PRODUCT
========================================================= */

const deleteProduct = async (
  id
) => {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const existing =
      await connection.query(
        `
          SELECT id
          FROM collection_products
          WHERE id = ?
          LIMIT 1
        `,
        [id]
      );

    if (!existing?.[0]) {
      await connection.rollback();

      const error =
        new Error(
          "Collection product not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const childTables = [
      "collection_stage_data",
      "collection_stage_history",
      "collection_comments",
      "collection_requests",
    ];

    for (
      const table of childTables
    ) {
      await connection.query(
        `
          DELETE FROM ${table}
          WHERE product_id = ?
        `,
        [id]
      );
    }

    await connection.query(
      `
        DELETE FROM
        collection_products
        WHERE id = ?
      `,
      [id]
    );

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    throw error;
  } finally {
    connection.release();
  }
};

/* =========================================================
   DELETE ALL PRODUCTS
========================================================= */

const deleteAll = async () => {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const childTables = [
      "collection_stage_data",
      "collection_stage_history",
      "collection_comments",
      "collection_requests",
    ];

    for (
      const table of childTables
    ) {
      await connection.query(
        `
          DELETE FROM ${table}
        `
      );
    }

    await connection.query(
      `
        DELETE FROM
        collection_products
      `
    );

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    throw error;
  } finally {
    connection.release();
  }
};

/* =========================================================
   EXPORT
========================================================= */

const exportProducts = () =>
  db.query(
    `
      SELECT
        p.id,
        p.product_code,
        p.product_name,
        p.current_stage,
        p.status,
        p.created_at,
        p.updated_at,
        u.name AS creator

      FROM collection_products p

      LEFT JOIN users u
        ON u.id = p.created_by

      ORDER BY
        p.id DESC
    `
  );

/* =========================================================
   INSIGHT
========================================================= */

const getInsight = async () => {
  const [
    summary,
    stages,
    months,
  ] = await Promise.all([
    db.query(
      `
        SELECT
          COUNT(*) AS total,
          COUNT(
            DISTINCT product_name
          ) AS products

        FROM collection_products
      `
    ),

    db.query(
      `
        SELECT
          current_stage AS stage,
          COUNT(*) AS count

        FROM collection_products

        GROUP BY current_stage

        ORDER BY
          FIELD(
            current_stage,
            'Designer',
            'Buyer',
            'Tech Team',
            'Quality',
            'E-Com',
            'Warehouse'
          )
      `
    ),

    db.query(
      `
        SELECT
          DATE_FORMAT(
            created_at,
            '%Y-%m'
          ) AS month,

          COUNT(*) AS count

        FROM collection_products

        GROUP BY month

        ORDER BY month DESC

        LIMIT 12
      `
    ),
  ]);

  return {
    summary:
      summary?.[0] || {
        total: 0,
        products: 0,
      },

    stages:
      stages || [],

    months:
      months || [],
  };
};

/* =========================================================
   PREVIOUS STAGE RECIPIENTS
========================================================= */

const getPreviousRecipients = async (
  productId,
  currentStage,
  excludeUserId
) => {
  const index =
    STAGES.indexOf(
      normaliseStage(
        currentStage
      )
    );

  let rows = [];

  /*
   * Designer is the first stage.
   * Notify the original creator when another
   * stage sends an update back.
   */

  if (index <= 0) {
    rows =
      await db.query(
        `
          SELECT
            u.id,
            u.name,
            u.email

          FROM collection_products p

          LEFT JOIN users u
            ON u.id = p.created_by

          WHERE
            p.id = ?

            AND (
              u.status = 'Active'
              OR u.status IS NULL
            )
        `,
        [productId]
      );
  } else {
    const previousStage =
      STAGES[index - 1];

    rows =
      await db.query(
        `
          SELECT DISTINCT
            u.id,
            u.name,
            u.email

          FROM collection_stage_history h

          JOIN users u
            ON u.id = h.user_id

          WHERE
            h.product_id = ?

            AND h.stage_name = ?

            AND (
              u.status = 'Active'
              OR u.status IS NULL
            )

          ORDER BY
            h.id DESC
        `,
        [
          productId,
          previousStage,
        ]
      );
  }

  return (
    rows || []
  ).filter(
    (user) =>
      Number(user.id) !==
      Number(excludeUserId)
  );
};

/* =========================================================
   PERMISSIONS
========================================================= */

const getPermissions =
  async () => {
    const [
      departments,
      permissions,
    ] = await Promise.all([
      db.query(
        `
          SELECT
            id,
            department_name

          FROM departments

          ORDER BY
            department_name
        `
      ),

      db.query(
        `
          SELECT *
          FROM collection_permissions

          ORDER BY
            FIELD(
              stage_name,
              'Designer',
              'Buyer',
              'Tech Team',
              'Quality',
              'E-Com',
              'Warehouse'
            )
        `
      ),
    ]);

    return {
      departments:
        departments || [],

      permissions: (
        permissions || []
      ).map((permission) => ({
        ...permission,

        cross_department:
          Boolean(
            permission.cross_department
          ),
      })),
    };
  };

/* =========================================================
   SAVE PERMISSIONS
========================================================= */

const savePermissions =
  async (items) => {
    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
          DELETE FROM
          collection_permissions
        `
      );

      for (
        const item of items || []
      ) {
        const stage =
          normaliseStage(
            item.stage_name
          );

        if (
          !isValidStage(stage)
        ) {
          continue;
        }

        if (
          item.department_id ===
            undefined ||
          item.department_id ===
            null ||
          item.department_id ===
            ""
        ) {
          continue;
        }

        await connection.query(
          `
            INSERT INTO
            collection_permissions
            (
              stage_name,
              department_id,
              cross_department
            )
            VALUES (?, ?, ?)
          `,
          [
            stage,
            Number(
              item.department_id
            ),
            item.cross_department
              ? 1
              : 0,
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}

      throw error;
    } finally {
      connection.release();
    }
  };

/* =========================================================
   EXPORT MODEL
========================================================= */

module.exports = {
  STAGES,

  ensureTables,

  getConfigs,
  saveConfigs,

  createProduct,
  listProducts,
  getProduct,

  getHistory,
  getComments,

  updateStage,
  addComment,

  createRequest,
  listRequests,
  reviewRequest,

  deleteProduct,
  deleteAll,

  exportProducts,

  getInsight,

  getPreviousRecipients,

  getPermissions,
  savePermissions,
};