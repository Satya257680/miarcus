const XLSX = require("xlsx");
const fs = require("fs/promises");
const { Parser } = require("json2csv");

const Model = require("../models/collectionTrackingModel");
const Notification = require("../services/notificationService");
const { sendGenericEmail } = require("../services/emailService");
const db = require("../config/db");

/* =========================================================
   CONSTANTS
========================================================= */

const STAGES = Array.isArray(Model.STAGES)
  ? Model.STAGES
  : [
      "Designer",
      "Buyer",
      "Tech Team",
      "Quality",
      "E-Com",
      "Warehouse",
    ];

const REQUEST_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
];

/* =========================================================
   HELPERS
========================================================= */

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (match) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[match])
  );

const appUrl = () =>
  (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");

const getActor = async (userId) => {
  try {
    const rows = await db.query(
      `
        SELECT id, name, email
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    );

    return (
      rows?.[0] || {
        id: userId,
        name: "A team member",
        email: null,
      }
    );
  } catch (error) {
    console.error(
      "Collection Tracking actor lookup:",
      error.message
    );

    return {
      id: userId,
      name: "A team member",
      email: null,
    };
  }
};


const parseJsonObject = (value, fallback = {}) => {
  if (value && typeof value === "object") return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? parsed
        : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

/*
 * Convert uploaded files into JSON-safe attachment metadata and
 * attach each file to the Collection Tracking field that selected it.
 *
 * The frontend sends attachment_meta in the same order as files:
 * [{ field_name: "Images" }, ...]
 */
const mergeUploadedFiles = (data, files = [], meta = []) => {
  const result = {
    ...(data || {}),
  };

  const metadata = Array.isArray(meta)
    ? meta
    : parseJsonObject(meta, []);

  (files || []).forEach((file, index) => {
    const fieldName =
      String(metadata?.[index]?.field_name || "Attachments").trim() ||
      "Attachments";

    const attachment = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
    };

    const existing = Array.isArray(result[fieldName])
      ? result[fieldName]
      : result[fieldName]
        ? [result[fieldName]]
        : [];

    result[fieldName] = [
      ...existing,
      attachment,
    ];
  });

  return result;
};

const getRequestData = (req) => {
  const data = parseJsonObject(req.body?.data, {});
  const meta = parseJsonObject(
    req.body?.attachment_meta,
    []
  );

  return mergeUploadedFiles(
    data,
    req.files || [],
    meta
  );
};

/* =========================================================
   NOTIFICATION + EMAIL
========================================================= */

/**
 * Sends a website notification and email.
 *
 * Important:
 * Notification/email failures are intentionally isolated.
 * A failed email must NOT cause a successful product update
 * to become a failed API request.
 */
const notifyAndEmail = async (
  recipients,
  {
    title,
    message,
    product,
    link,
    actionName = "Update",
  }
) => {
  const uniqueRecipients = new Map();

  for (const recipient of recipients || []) {
    if (!recipient?.id) continue;

    uniqueRecipients.set(
      String(recipient.id),
      recipient
    );
  }

  let notified = 0;
  let emailed = 0;

  for (const recipient of uniqueRecipients.values()) {
    /* -----------------------------------------
       Website notification
    ----------------------------------------- */

    try {
      await Notification.createNotification({
        user_id: recipient.id,
        title,
        message,
        module_name: "Collection Tracking",
        action_name: actionName,
        entity_id: product?.id,
        link,
        type: "info",
      });

      notified += 1;
    } catch (error) {
      console.error(
        "Collection Tracking notification:",
        error.message
      );
    }

    /* -----------------------------------------
       Email
    ----------------------------------------- */

    if (recipient.email) {
      try {
        await sendGenericEmail({
          to: recipient.email,
          subject: title,
          html: `
            <div
              style="
                font-family:Arial,sans-serif;
                max-width:700px;
                margin:auto;
                color:#183b4a;
              "
            >
              <div
                style="
                  background:#123f49;
                  padding:22px;
                  border-radius:12px 12px 0 0;
                "
              >
                <h2
                  style="
                    color:#ffffff;
                    margin:0;
                  "
                >
                  MIARCUS Collection Tracking
                </h2>
              </div>

              <div
                style="
                  border:1px solid #e2e9ed;
                  border-top:0;
                  padding:24px;
                "
              >
                <h2
                  style="
                    color:#6f5cb1;
                    margin-top:0;
                  "
                >
                  ${escape(title)}
                </h2>

                <p>
                  ${escape(message)}
                </p>

                ${
                  product
                    ? `
                      <p>
                        <b>Product:</b>
                        ${escape(
                          product.product_code ||
                            ""
                        )}
                        ${
                          product.product_name
                            ? ` — ${escape(
                                product.product_name
                              )}`
                            : ""
                        }
                      </p>
                    `
                    : ""
                }

                <p style="margin-top:24px;">
                  <a
                    href="${appUrl()}${link}"
                    style="
                      display:inline-block;
                      background:#8f7ac8;
                      color:#ffffff;
                      text-decoration:none;
                      padding:11px 18px;
                      border-radius:8px;
                      font-weight:bold;
                    "
                  >
                    Open in MIARCUS
                  </a>
                </p>

                <hr
                  style="
                    border:0;
                    border-top:1px solid #e5eaed;
                    margin:24px 0;
                  "
                />

                <small
                  style="color:#78909a;"
                >
                  MIARCUS Collection Tracking
                </small>
              </div>
            </div>
          `,
        });

        emailed += 1;
      } catch (error) {
        console.error(
          "Collection Tracking email:",
          error.message
        );
      }
    }
  }

  return {
    notified,
    emailed,
  };
};

/* =========================================================
   ENSURE TABLES
========================================================= */

exports.ensure = async (
  req,
  res,
  next
) => {
  try {
    await Model.ensureTables();

    next();
  } catch (error) {
    console.error(
      "Collection Tracking ensure:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to initialize Collection Tracking.",
      error: error.message,
    });
  }
};

/* =========================================================
   MASTER DATA
========================================================= */

exports.configs = async (
  req,
  res
) => {
  try {
    const stage =
      String(req.query.stage || "").trim();

    if (
      stage &&
      !STAGES.includes(stage)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid workflow stage.",
      });
    }

    const configs =
      await Model.getConfigs(stage);

    return res.json({
      success: true,
      stages: STAGES,
      configs,
    });
  } catch (error) {
    console.error(
      "Collection Tracking configs:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load Master Data.",
      error: error.message,
    });
  }
};

exports.saveConfig = async (
  req,
  res
) => {
  try {
    const stage =
      String(req.params.stage || "").trim();

    if (!STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workflow stage.",
      });
    }

    const fields =
      Array.isArray(req.body?.fields)
        ? req.body.fields
        : [];

    await Model.saveConfigs(
      stage,
      fields
    );

    return res.json({
      success: true,
      message:
        "Master Data saved successfully.",
    });
  } catch (error) {
    console.error(
      "Collection Tracking save config:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save Master Data.",
      error: error.message,
    });
  }
};

/* =========================================================
   CREATE PRODUCT
========================================================= */

exports.create = async (
  req,
  res
) => {
  try {
    const data = getRequestData(req);

    const productCode = String(
      req.body?.product_code ||
        data.product_code ||
        data.sku ||
        data.SKU ||
        ""
    ).trim();

    const generatedCode =
      productCode ||
      `CT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now()
        .toString()
        .slice(-6)}`;

    const productName = String(
      req.body?.product_name ||
        data["Product Name"] ||
        data.product_name ||
        ""
    ).trim();

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unable to determine the logged-in user.",
      });
    }

    const product =
      await Model.createProduct({
        productCode: generatedCode,
        productName,
        createdBy: userId,
        data,
      });

    return res.status(201).json({
      success: true,
      product,
      message:
        "Product created successfully.",
    });
  } catch (error) {
    console.error(
      "Collection Tracking create:",
      error
    );

    const duplicate =
      error?.code === "ER_DUP_ENTRY";

    return res.status(
      duplicate
        ? 409
        : error?.statusCode || 500
    ).json({
      success: false,
      message: duplicate
        ? "That product code/SKU already exists. Please use a unique code."
        : error?.message ||
          "Unable to create product.",
      error: error?.message,
    });
  }
};

/* =========================================================
   LIST PRODUCTS
========================================================= */

exports.list = async (
  req,
  res
) => {
  try {
    const result =
      await Model.listProducts(
        req.query || {}
      );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Collection Tracking list:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load collection products.",
      error: error.message,
    });
  }
};

/* =========================================================
   VIEW PRODUCT
========================================================= */

exports.view = async (
  req,
  res
) => {
  try {
    const product =
      await Model.getProduct(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Collection product not found.",
      });
    }

    const [
      history,
      comments,
    ] = await Promise.all([
      Model.getHistory(product.id),
      Model.getComments(product.id),
    ]);

    return res.json({
      success: true,
      product,
      history,
      comments,
    });
  } catch (error) {
    console.error(
      "Collection Tracking view:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load collection product.",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE STAGE
========================================================= */

exports.updateStage = async (
  req,
  res
) => {
  try {
    const product =
      await Model.getProduct(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Collection product not found.",
      });
    }

    const stage = String(
      req.body?.stage ||
        product.current_stage ||
        ""
    ).trim();

    const nextStage = req.body?.next_stage
      ? String(
          req.body.next_stage
        ).trim()
      : null;

    if (!STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid current workflow stage.",
      });
    }

    /*
     * A product can only be edited by its actual current stage.
     * Users can still browse other stages from the UI, but the
     * server must prevent saving a future/previous stage by mistake.
     */
    if (stage !== product.current_stage) {
      return res.status(409).json({
        success: false,
        message:
          `This product is currently in ${product.current_stage}. Open that stage before saving an update.`,
      });
    }

    if (
      nextStage &&
      !STAGES.includes(nextStage)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid next workflow stage.",
      });
    }

    if (nextStage) {
      const currentIndex =
        STAGES.indexOf(stage);

      const nextIndex =
        STAGES.indexOf(nextStage);

      if (
        nextIndex !==
        currentIndex + 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A product can only move to the next workflow stage.",
        });
      }
    }

    const data = getRequestData(req);

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    const updated =
      await Model.updateStage({
        id: product.id,
        stage,
        data,
        userId,
        note: req.body?.note || null,
        nextStage,
      });

    const recipients =
      await Model.getPreviousRecipients(
        product.id,
        stage,
        userId
      );

    const actor =
      await getActor(userId);

    const message = nextStage
      ? `${actor.name} submitted an update for ${stage} and moved ${product.product_code} to ${nextStage}.`
      : `${actor.name} updated ${product.product_code} in ${stage}.`;

    const notificationResult =
      await notifyAndEmail(
        recipients,
        {
          title: `Collection update: ${product.product_code}`,
          message,
          product,
          link: `/collection-tracking/sku-details/${product.id}`,
          actionName:
            nextStage
              ? "Stage Update"
              : "Update",
        }
      );

    return res.json({
      success: true,
      product: updated,
      notified:
        notificationResult.notified,
      emailed:
        notificationResult.emailed,
    });
  } catch (error) {
    console.error(
      "Collection Tracking stage update:",
      error
    );

    return res.status(
      error?.statusCode || 500
    ).json({
      success: false,
      message:
        error?.message ||
        "Unable to update collection stage.",
      error: error?.message,
    });
  }
};

/* =========================================================
   REMARK / COMMENT
========================================================= */

exports.comment = async (
  req,
  res
) => {
  try {
    const product =
      await Model.getProduct(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Collection product not found.",
      });
    }

    const comment = String(
      req.body?.comment || ""
    ).trim();

    if (!comment) {
      return res.status(400).json({
        success: false,
        message:
          "Remark is required.",
      });
    }

    if (comment.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          "Remark cannot exceed 5000 characters.",
      });
    }

    const stage = String(
      req.body?.stage ||
        product.current_stage ||
        ""
    ).trim();

    if (!STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid workflow stage.",
      });
    }

    if (stage !== product.current_stage) {
      return res.status(409).json({
        success: false,
        message:
          `Remarks can only be added to the current stage (${product.current_stage}).`,
      });
    }

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    const row =
      await Model.addComment({
        id: product.id,
        stage,
        comment,
        userId,
      });

    const recipients =
      await Model.getPreviousRecipients(
        product.id,
        stage,
        userId
      );

    const actor =
      await getActor(userId);

    const notificationResult =
      await notifyAndEmail(
        recipients,
        {
          title: `New remark on ${product.product_code}`,
          message: `${actor.name} added a remark: ${comment}`,
          product,
          link: `/collection-tracking/sku-details/${product.id}`,
          actionName: "Remark",
        }
      );

    return res.json({
      success: true,
      comment: row,
      notified:
        notificationResult.notified,
      emailed:
        notificationResult.emailed,
    });
  } catch (error) {
    console.error(
      "Collection Tracking comment:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Unable to save remark.",
      error: error?.message,
    });
  }
};

/* =========================================================
   CREATE REQUEST
========================================================= */

exports.request = async (
  req,
  res
) => {
  try {
    const product =
      await Model.getProduct(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Collection product not found.",
      });
    }

    const fromStage =
      product.current_stage;

    const toStage = String(
      req.body?.to_stage ||
        fromStage
    ).trim();

    if (
      !STAGES.includes(fromStage) ||
      !STAGES.includes(toStage)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request stage.",
      });
    }

    const fromIndex =
      STAGES.indexOf(fromStage);

    const toIndex =
      STAGES.indexOf(toStage);

    if (
      toIndex !==
      fromIndex + 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A request must target the next workflow stage.",
      });
    }

    const note = String(
      req.body?.note || ""
    ).trim();

    const userId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    const id =
      await Model.createRequest({
        id: product.id,
        fromStage,
        toStage,
        userId,
        note,
      });

    const recipients =
      await Model.getPreviousRecipients(
        product.id,
        fromStage,
        userId
      );

    const actor =
      await getActor(userId);

    const notificationResult =
      await notifyAndEmail(
        recipients,
        {
          title: `Update request for ${product.product_code}`,
          message: `${actor.name} raised an update request for ${product.product_code}: ${
            note ||
            "Please review the update request."
          }`,
          product,
          link:
            "/collection-tracking/requests",
          actionName:
            "Update Request",
        }
      );

    return res.status(201).json({
      success: true,
      id,
      notified:
        notificationResult.notified,
      emailed:
        notificationResult.emailed,
    });
  } catch (error) {
    console.error(
      "Collection Tracking request:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create update request.",
      error: error.message,
    });
  }
};

/* =========================================================
   LIST REQUESTS
========================================================= */

exports.requests = async (
  req,
  res
) => {
  try {
    const status =
      String(
        req.query?.status ||
          "Pending"
      ).trim();

    if (
      status &&
      !REQUEST_STATUSES.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request status.",
      });
    }

    const requests =
      await Model.listRequests({
        status,
      });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(
      "Collection Tracking requests:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load requests.",
      error: error.message,
    });
  }
};

/* =========================================================
   REVIEW REQUEST
========================================================= */

exports.reviewRequest = async (
  req,
  res
) => {
  try {
    const status = String(
      req.body?.status || ""
    ).trim();

    if (
      !["Approved", "Rejected"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Request status must be Approved or Rejected.",
      });
    }

    const rows = await db.query(
      `
        SELECT
          r.*,
          p.product_code,
          p.product_name,
          p.id AS product_id,
          u.id AS requester_id,
          u.name AS requester_name,
          u.email AS requester_email
        FROM collection_requests r
        JOIN collection_products p
          ON p.id = r.product_id
        LEFT JOIN users u
          ON u.id = r.requested_by
        WHERE r.id = ?
        LIMIT 1
      `,
      [req.params.id]
    );

    const requestRow =
      rows?.[0];

    if (!requestRow) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found.",
      });
    }

    const reviewerId =
      req.user?.id ??
      req.user?.user_id ??
      req.user?.userId;

    await Model.reviewRequest({
      id: req.params.id,
      status,
      userId: reviewerId,
    });

    /* -----------------------------------------
       Notify requester
    ----------------------------------------- */

    if (requestRow.requester_id) {
      await notifyAndEmail(
        [
          {
            id:
              requestRow.requester_id,
            name:
              requestRow.requester_name,
            email:
              requestRow.requester_email,
          },
        ],
        {
          title: `Collection request ${status}`,
          message: `Your request for ${requestRow.product_code} was ${status.toLowerCase()}.`,
          product: requestRow,
          link: `/collection-tracking/sku-details/${requestRow.product_id}`,
          actionName:
            "Request Review",
        }
      );
    }

    return res.json({
      success: true,
      message:
        `Request ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.error(
      "Collection Tracking review request:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to review request.",
      error: error.message,
    });
  }
};

/* =========================================================
   DELETE ONE
========================================================= */

exports.delete = async (
  req,
  res
) => {
  try {
    const product =
      await Model.getProduct(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Collection product not found.",
      });
    }

    await Model.deleteProduct(
      req.params.id
    );

    return res.json({
      success: true,
      message:
        "Collection product deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Collection Tracking delete:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete collection product.",
      error: error.message,
    });
  }
};

/* =========================================================
   DELETE ALL
========================================================= */

exports.deleteAll = async (
  req,
  res
) => {
  try {
    await Model.deleteAll();

    return res.json({
      success: true,
      message:
        "All Collection Tracking products deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Collection Tracking delete all:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete all collection products.",
      error: error.message,
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

exports.export = async (
  req,
  res
) => {
  try {
    const rows =
      await Model.exportProducts();

    const parser = new Parser({
      fields: [
        "id",
        "product_code",
        "product_name",
        "current_stage",
        "status",
        "creator",
        "created_at",
        "updated_at",
      ],
    });

    const csv =
      parser.parse(rows || []);

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="collection-tracking.csv"'
    );

    return res.send(csv);
  } catch (error) {
    console.error(
      "Collection Tracking export:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to export collection data.",
      error: error.message,
    });
  }
};

/* =========================================================
   BULK UPLOAD
========================================================= */

exports.bulk = async (
  req,
  res
) => {
  try {
    let rows = req.body?.rows;

    /* -----------------------------------------
       Multipart file
    ----------------------------------------- */

    if (
      !Array.isArray(rows) &&
      req.file
    ) {
      const workbook =
        XLSX.readFile(
          req.file.path
        );

      const firstSheetName =
        workbook.SheetNames?.[0];

      if (!firstSheetName) {
        return res.status(400).json({
          success: false,
          message:
            "Uploaded file does not contain a worksheet.",
        });
      }

      rows =
        XLSX.utils.sheet_to_json(
          workbook.Sheets[
            firstSheetName
          ],
          {
            defval: "",
          }
        );

      /*
       * The bulk-upload multer stores the temporary spreadsheet
       * in server/uploads. Remove it after parsing so spreadsheets
       * do not accumulate in the public upload directory.
       */
      if (req.file?.path) {
        try {
          await fs.unlink(
            req.file.path
          );
        } catch (cleanupError) {
          console.warn(
            "Collection Tracking bulk temp-file cleanup:",
            cleanupError.message
          );
        }
      }
    }

    if (!Array.isArray(rows)) {
      rows = [];
    }

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message:
          "No product rows were found in the uploaded file.",
      });
    }

    let created = 0;
    let failed = 0;
    const errors = [];

    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row =
        rows[index] || {};

      try {
        const productCode =
          String(
            row.product_code ||
              row.sku ||
              row.SKU ||
              `SKU-${Date.now()}-${index}`
          ).trim();

        const productName =
          String(
            row.product_name ||
              row["Product Name"] ||
              ""
          ).trim();

        await Model.createProduct({
          productCode,
          productName,
          createdBy:
            req.user?.id ??
            req.user?.user_id ??
            req.user?.userId,
          data: row,
        });

        created += 1;
      } catch (error) {
        failed += 1;

        errors.push({
          row: index + 2,
          message:
            error.message,
        });
      }
    }

    return res.json({
      success: true,
      created,
      failed,
      total: rows.length,
      errors,
      message: `${created} product(s) imported successfully.`,
    });
  } catch (error) {
    console.error(
      "Collection Tracking bulk:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Bulk upload failed.",
      error: error.message,
    });
  }
};

/* =========================================================
   INSIGHT
========================================================= */

exports.insight = async (
  req,
  res
) => {
  try {
    const insight =
      await Model.getInsight();

    return res.json({
      success: true,
      ...insight,
    });
  } catch (error) {
    console.error(
      "Collection Tracking insight:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load Collection Tracking insight.",
      error: error.message,
    });
  }
};

/* =========================================================
   PERMISSIONS
========================================================= */

exports.permissions = async (
  req,
  res
) => {
  try {
    const permissions =
      await Model.getPermissions();

    return res.json({
      success: true,
      ...permissions,
    });
  } catch (error) {
    console.error(
      "Collection Tracking permissions:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load Collection Tracking permissions.",
      error: error.message,
    });
  }
};

exports.savePermissions = async (
  req,
  res
) => {
  try {
    const items =
      Array.isArray(req.body?.items)
        ? req.body.items
        : [];

    await Model.savePermissions(
      items
    );

    return res.json({
      success: true,
      message:
        "Collection Tracking permissions saved successfully.",
    });
  } catch (error) {
    console.error(
      "Collection Tracking save permissions:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save Collection Tracking permissions.",
      error: error.message,
    });
  }
};