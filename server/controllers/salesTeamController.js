const fs = require("fs");
const { Parser } = require("json2csv");
const XLSX = require("xlsx");

const SalesTeam = require("../models/salesTeamModel");

const notificationService = require("../services/notificationService");
const { sendGenericEmail } = require("../services/emailService");

/* =========================================================
   HELPERS
========================================================= */

const isAdmin = (user) =>
  user?.is_admin === true ||
  user?.is_admin === 1 ||
  user?.is_admin === "1" ||
  user?.administrator === true ||
  user?.administrator === 1 ||
  user?.administrator === "1";

/* =========================================================
   CSV RESPONSE
========================================================= */

const csvResponse = (
  res,
  rows,
  filename
) => {
  const parser = new Parser({
    flatten: true,
  });

  const csv = parser.parse(
    rows || []
  );

  res.setHeader(
    "Content-Type",
    "text/csv; charset=utf-8"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  return res.send(csv);
};

/* =========================================================
   SAFE EMAIL
========================================================= */

const sendEmailSafely = async (
  to,
  subject,
  html
) => {
  if (!to) {
    return;
  }

  try {
    await sendGenericEmail({
      to,
      subject,
      html,
    });
  } catch (error) {
    /*
      Email failure must not break the database
      approval/update operation.
    */
    console.error(
      "Sales Team email failed:",
      error.message
    );
  }
};

/* =========================================================
   APPLICATION URL
========================================================= */

const appUrl = () =>
  String(
    process.env.APP_URL ||
      process.env.CLIENT_URL ||
      ""
  ).replace(/\/$/, "");

/* =========================================================
   SPREADSHEET READER
========================================================= */

const readSpreadsheetRows = (
  filePath
) => {
  const workbook =
    XLSX.readFile(
      filePath,
      {
        cellDates: true,
      }
    );

  const sheetName =
    workbook.SheetNames[0];

  if (!sheetName) {
    return [];
  }

  return XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName],
    {
      defval: "",
    }
  );
};

/* =========================================================
   NOTIFY PENDING APPROVERS
========================================================= */

const notifyPendingApprovers = (
  employeeId,
  planId
) => {
  SalesTeam.getApprovalRecipients(
    employeeId,
    async (
      err,
      recipients
    ) => {
      if (
        err ||
        !recipients?.length
      ) {
        return;
      }

      const ids = recipients
        .map((recipient) =>
          Number(recipient.id)
        )
        .filter(Boolean);

      /*
        In-app notification.
      */
      try {
        await notificationService.createForUsers(
          ids,
          {
            title:
              "Travel Plan Pending Approval",

            message:
              "A new Sales Team travel plan is waiting for your approval.",

            module_name:
              "Travel Plan Approvals",

            action_name:
              "Pending",

            entity_id:
              planId,

            link:
              "/travel-plan-approval",

            type:
              "info",
          }
        );
      } catch (error) {
        console.error(
          "Pending approval notification failed:",
          error.message
        );
      }

      /*
        Email notification.
      */
      await Promise.all(
        recipients.map(
          (recipient) =>
            sendEmailSafely(
              recipient.email,

              "MIARCUS - Travel Plan Pending Approval",

              `
              <div
                style="
                  font-family:Arial,sans-serif;
                  line-height:1.6;
                  color:#263b45;
                "
              >

                <h2>
                  Travel Plan Pending Approval
                </h2>

                <p>
                  A new Sales Team travel plan
                  has been submitted and is waiting
                  for your approval.
                </p>

                <p>
                  Please sign in to MIARCUS and open
                  <b>Travel Plan Approvals</b>
                  to Approve or Reject the plan.
                </p>

                <p>
                  <a
                    href="${appUrl()}/travel-plan-approval"
                  >
                    Open Travel Plan Approvals
                  </a>
                </p>

              </div>
              `
            )
        )
      );
    }
  );
};

/* =========================================================
   NOTIFY EMPLOYEE ABOUT APPROVAL DECISION
========================================================= */

const notifyDecision = (
  employeeId,
  month,
  status
) => {
  SalesTeam.getEmployeeForApproval(
    employeeId,
    month,
    async (
      err,
      employee
    ) => {
      if (
        err ||
        !employee
      ) {
        return;
      }

      const approved =
        status === "Approved";

      const title = approved
        ? "Travel Plan Approved"
        : "Travel Plan Rejected";

      const message = approved
        ? `${
            employee.month_label ||
            "Your travel plan"
          } Sales Team travel plan has been approved.`
        : `${
            employee.month_label ||
            "Your travel plan"
          } Sales Team travel plan has been rejected.`;

      /*
        In-app notification.
      */
      try {
        await notificationService.createForUsers(
          [employee.id],
          {
            title,

            message,

            module_name:
              "Travel Plan",

            action_name:
              status,

            entity_id:
              employeeId,

            link: approved
              ? "/travel-plan"
              : "/visit-planner",

            type: approved
              ? "success"
              : "warning",
          }
        );
      } catch (error) {
        console.error(
          "Travel plan decision notification failed:",
          error.message
        );
      }

      /*
        Email.
      */
      await sendEmailSafely(
        employee.email,

        `MIARCUS - ${title}`,

        `
        <div
          style="
            font-family:Arial,sans-serif;
            line-height:1.6;
            color:#263b45;
          "
        >

          <h2>
            ${title}
          </h2>

          <p>
            Your Sales Team travel plan for
            <b>
              ${
                employee.month_label ||
                month
              }
            </b>
            has been
            <b>
              ${status.toLowerCase()}
            </b>.
          </p>

          <p>
            Plan days:
            <b>
              ${employee.plan_days}
            </b>
          </p>

          ${
            employee.start_date
              ? `
                <p>
                  Period:
                  <b>
                    ${employee.start_date}
                    ${employee.end_date && employee.end_date !== employee.start_date
                      ? ` to ${employee.end_date}`
                      : ""}
                  </b>
                </p>
              `
              : ""
          }

          ${
            approved
              ? `
                <p>
                  Your plan is now available
                  in Travel Plan.
                </p>
              `
              : `
                <p>
                  Please open Visit Planner
                  to review the rejected plan
                  and make changes if required.
                </p>
              `
          }

          <p>
            <a
              href="${appUrl()}${
                approved
                  ? "/travel-plan"
                  : "/visit-planner"
              }"
            >
              Open MIARCUS
            </a>
          </p>

        </div>
        `
      );
    }
  );
};

/* =========================================================
   EMPLOYEES
========================================================= */

exports.employees = (
  req,
  res
) => {
  SalesTeam.getEmployees(
    req.query.search,
    (
      err,
      data
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to load employees",
        });
      }

      return res.json({
        success: true,
        data,
      });
    }
  );
};

/* =========================================================
   STORES
========================================================= */

exports.stores = (
  req,
  res
) => {
  /*
    This uses SalesTeam.getStores(),
    which reads directly from the main
    Store Management `stores` table.
  */
  SalesTeam.getStores(
    req.query.search,
    (
      err,
      data
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to load stores",
        });
      }

      return res.json({
        success: true,
        data,
      });
    }
  );
};

/* =========================================================
   GET VISIT PLANS
========================================================= */

exports.getVisitPlans = (
  req,
  res
) => {
  SalesTeam.getVisitPlans(
    req.query,
    req.user,
    (
      err,
      result
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to load visit planner",
        });
      }

      return res.json({
        success: true,

        data:
          result.rows,

        total:
          result.total,

        page:
          Number(
            req.query.page || 1
          ),

        limit:
          Number(
            req.query.limit || 10
          ),
      });
    }
  );
};

/* =========================================================
   CREATE VISIT PLAN
========================================================= */

exports.createVisitPlan = (
  req,
  res
) => {
  const body =
    req.body || {};

  const admin =
    isAdmin(req.user);

  if (
    !body.employee_id ||
    !body.visit_date
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Employee and date are required.",
    });
  }

  const weekOff =
    body.week_off === true ||
    body.week_off === 1 ||
    String(body.week_off || "").toLowerCase() === "true" ||
    String(body.week_off || "").toLowerCase() === "yes";

  const endDate =
    weekOff
      ? String(body.end_date || "").trim()
      : String(body.visit_date);

  if (weekOff && !endDate) {
    return res.status(400).json({
      success: false,
      message:
        "Leave To date is required when Week off / Leave is selected.",
    });
  }

  if (weekOff && endDate < String(body.visit_date)) {
    return res.status(400).json({
      success: false,
      message:
        "Leave To date cannot be before the From date.",
    });
  }

  /*
    Normal employees can only create
    their own visit plan.
  */
  if (
    !admin &&
    Number(body.employee_id) !==
      Number(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message:
        "You can only create your own visit plan.",
    });
  }

  /*
    IMPORTANT:
    Never trust approval_status from frontend.
    The model also enforces Pending.
  */
  const payload = {
    ...body,

    employee_id:
      Number(body.employee_id),

    end_date:
      endDate,

    week_off:
      weekOff,

    approval_status:
      "Pending",

    created_by:
      req.user.id,

    planned_store_ids:
      Array.isArray(
        body.planned_store_ids
      )
        ? body.planned_store_ids
        : [],
  };

  SalesTeam.createVisitPlan(
    payload,
    (
      err,
      id
    ) => {
      if (err) {
        console.error(
          "Create planned visit failed:",
          err
        );

        return res.status(500).json({
          success: false,
          message:
            "Unable to create planned visit",
        });
      }

      /*
        Notify approvers only after the
        database insert succeeds.
      */
      notifyPendingApprovers(
        Number(body.employee_id),
        id
      );

      return res.status(201).json({
        success: true,

        id,

        approval_status:
          "Pending",

        message:
          "Planned visit submitted for approval.",
      });
    }
  );
};

/* =========================================================
   UPDATE VISIT PLAN
========================================================= */

exports.updateVisitPlan = (
  req,
  res
) => {
  SalesTeam.getVisitPlanById(
    req.params.id,
    (
      findErr,
      row
    ) => {
      if (findErr) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to find visit plan",
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message:
            "Visit plan not found",
        });
      }

      if (
        !isAdmin(req.user) &&
        Number(row.employee_id) !==
          Number(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied",
        });
      }

      /*
        Do not allow frontend to preserve
        Approved/Rejected status.

        Model resets edited plans to Pending.
      */
      const updateWeekOff =
        req.body.week_off === true ||
        req.body.week_off === 1 ||
        String(req.body.week_off || "").toLowerCase() === "true" ||
        String(req.body.week_off || "").toLowerCase() === "yes";

      const updateVisitDate =
        String(req.body.visit_date || row.visit_date);

      const updateEndDate =
        updateWeekOff
          ? String(req.body.end_date || "").trim()
          : updateVisitDate;

      if (updateWeekOff && !updateEndDate) {
        return res.status(400).json({
          success: false,
          message:
            "Leave To date is required when Week off / Leave is selected.",
        });
      }

      if (updateWeekOff && updateEndDate < updateVisitDate) {
        return res.status(400).json({
          success: false,
          message:
            "Leave To date cannot be before the From date.",
        });
      }

      const payload = {
        ...req.body,

        employee_id:
          Number(
            req.body.employee_id ||
              row.employee_id
          ),

        end_date: updateEndDate,

        week_off: updateWeekOff,

        planned_store_ids:
          Array.isArray(
            req.body.planned_store_ids
          )
            ? req.body.planned_store_ids
            : [],

        updated_by:
          req.user.id,
      };

      SalesTeam.updateVisitPlan(
        req.params.id,
        payload,
        (err) => {
          if (err) {
            console.error(
              "Update planned visit failed:",
              err
            );

            return res.status(500).json({
              success: false,
              message:
                "Unable to update planned visit",
            });
          }

          /*
            Updating an existing plan sends it
            through approval again.
          */
          notifyPendingApprovers(
            Number(
              payload.employee_id
            ),
            Number(
              req.params.id
            )
          );

          return res.json({
            success: true,

            approval_status:
              "Pending",

            message:
              "Planned visit updated and submitted for approval.",
          });
        }
      );
    }
  );
};

/* =========================================================
   DELETE VISIT PLAN
========================================================= */

exports.deleteVisitPlan = (
  req,
  res
) => {
  SalesTeam.getVisitPlanById(
    req.params.id,
    (
      findErr,
      row
    ) => {
      if (findErr) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to find visit plan",
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message:
            "Visit plan not found",
        });
      }

      if (
        !isAdmin(req.user) &&
        Number(row.employee_id) !==
          Number(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied",
        });
      }

      SalesTeam.deleteVisitPlan(
        req.params.id,
        (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message:
                "Delete failed",
            });
          }

          return res.json({
            success: true,
          });
        }
      );
    }
  );
};

/* =========================================================
   DELETE ALL VISIT PLANS
========================================================= */

exports.deleteAllVisitPlans = (
  req,
  res
) => {
  SalesTeam.deleteAllVisitPlans(
    req.user,
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Delete all failed",
        });
      }

      return res.json({
        success: true,
      });
    }
  );
};

/* =========================================================
   IMPORT VISIT PLANS
========================================================= */

exports.importVisitPlans = (
  req,
  res
) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message:
        "CSV, XLSX or XLS file is required.",
    });
  }

  let rows;

  try {
    rows =
      readSpreadsheetRows(
        req.file.path
      );
  } catch (error) {
    fs.unlink(
      req.file.path,
      () => {}
    );

    return res.status(400).json({
      success: false,
      message:
        "Unable to read the uploaded file.",
    });
  }

  fs.unlink(
    req.file.path,
    () => {}
  );

  if (!rows.length) {
    return res.json({
      success: true,
      imported: 0,
    });
  }

  let remaining =
    rows.length;

  let failed = false;

  let imported = 0;

  const importedPlanIds = [];

  rows.forEach(
    (row) => {
      const employeeId =
        row.employee_id ||
        row["Employee ID"] ||
        row.employeeId;

      const date =
        row.visit_date ||
        row.Date ||
        row.date;

      const valid =
        employeeId &&
        date &&
        (
          isAdmin(req.user) ||
          Number(employeeId) ===
            Number(req.user.id)
        );

      if (!valid) {
        failed = true;

        remaining -= 1;

        if (!remaining) {
          return res.status(400).json({
            success: false,
            imported,
            message:
              "One or more rows have an invalid employee or date.",
          });
        }

        return;
      }

      const weekOffValue =
        row.week_off ||
        row["Week Off"] ||
        "";

      const endDateValue =
        row.end_date ||
        row["End Date"] ||
        row.to_date ||
        row["To Date"] ||
        date;

      const weekOff =
        String(
          weekOffValue
        )
          .trim()
          .toLowerCase() ===
          "true" ||
        String(
          weekOffValue
        ).trim() === "1" ||
        String(
          weekOffValue
        )
          .trim()
          .toLowerCase() ===
          "yes";

      /*
        Every imported visit is Pending.
      */
      SalesTeam.createVisitPlan(
        {
          employee_id:
            Number(employeeId),

          visit_date:
            date,

          end_date:
            weekOff ? endDateValue : date,

          week_off:
            weekOff,

          city:
            row.city ||
            row.City ||
            "",

          reason_to_travel:
            row.reason_to_travel ||
            row["Reason to Travel"] ||
            "",

          planned_store_ids:
            [],

          approval_status:
            "Pending",

          created_by:
            req.user.id,
        },

        (
          err,
          id
        ) => {
          if (err) {
            failed = true;
          } else {
            imported += 1;

            importedPlanIds.push(
              id
            );

            /*
              Notify approvers after each
              successful import.
            */
            notifyPendingApprovers(
              Number(employeeId),
              id
            );
          }

          remaining -= 1;

          if (!remaining) {
            return res
              .status(
                failed
                  ? 500
                  : 200
              )
              .json({
                success:
                  !failed,

                imported,

                message:
                  failed
                    ? "Some visit plans could not be imported."
                    : "Visit plans imported and submitted for approval.",
              });
          }
        }
      );
    }
  );
};

/* =========================================================
   EXPORT VISIT PLANS
========================================================= */

exports.exportVisitPlans = (
  req,
  res
) => {
  SalesTeam.exportVisitRows(
    req.query,
    req.user,
    (
      err,
      rows
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Export failed",
        });
      }

      return csvResponse(
        res,
        rows,
        "visit-planner.csv"
      );
    }
  );
};

/* =========================================================
   TRAVEL PLAN
   ONLY APPROVED RECORDS ARE RETURNED BY MODEL
========================================================= */

exports.getTravelPlans = (
  req,
  res
) => {
  SalesTeam.getTravelPlans(
    req.query,
    req.user,
    (
      err,
      result
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to load travel plan",
        });
      }

      return res.json({
        success: true,

        data:
          result.rows,

        total:
          result.total,
      });
    }
  );
};

/* =========================================================
   SAVE ACTUAL STORES
========================================================= */

exports.saveActualStores = (
  req,
  res
) => {
  SalesTeam.getVisitPlanById(
    req.params.id,
    (
      findErr,
      row
    ) => {
      if (
        findErr ||
        !row
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Travel plan not found",
        });
      }

      if (
        !isAdmin(req.user) &&
        Number(row.employee_id) !==
          Number(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied",
        });
      }

      const storeIds =
        Array.isArray(
          req.body.store_ids
        )
          ? req.body.store_ids
          : [];

      SalesTeam.saveActualStores(
        req.params.id,
        storeIds,
        req.user.id,
        (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message:
                "Unable to save actual stores",
            });
          }

          return res.json({
            success: true,
          });
        }
      );
    }
  );
};

/* =========================================================
   HISTORY
========================================================= */

exports.getHistory = (
  req,
  res
) => {
  SalesTeam.getHistory(
    req.params.id,
    (
      err,
      data
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to load history",
        });
      }

      return res.json({
        success: true,
        data,
      });
    }
  );
};

/* =========================================================
   ADD REMARK
========================================================= */

exports.addRemark = (
  req,
  res
) => {
  SalesTeam.getVisitPlanById(
    req.params.id,
    (
      findErr,
      row
    ) => {
      if (
        findErr ||
        !row
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Travel plan not found",
        });
      }

      if (
        !isAdmin(req.user) &&
        Number(row.employee_id) !==
          Number(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied",
        });
      }

      const attachmentPath =
        req.file
          ? `/uploads/${req.file.filename}`
          : null;

      SalesTeam.addHistory(
        req.params.id,

        req.user.id,

        req.body.remark,

        attachmentPath,

        (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message:
                "Unable to save remark",
            });
          }

          return res.json({
            success: true,
          });
        }
      );
    }
  );
};

/* =========================================================
   DELETE TRAVEL PLAN
========================================================= */

exports.deleteTravelPlan =
  exports.deleteVisitPlan;

/* =========================================================
   GET TRAVEL PLAN APPROVALS
========================================================= */

exports.getApprovals = (
  req,
  res
) => {
  SalesTeam.getApprovals(
    req.user,
    (
      err,
      data
    ) => {
      if (err) {
        console.error(
          "Travel plan approvals query failed:",
          {
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
            message: err.message,
          }
        );

        return res.status(500).json({
          success: false,
          message:
            "Unable to load approvals",
        });
      }

      return res.json({
        success: true,
        data,
      });
    }
  );
};

/* =========================================================
   APPROVE
========================================================= */

exports.approve = (
  req,
  res
) => {
  const employeeId =
    Number(
      req.body.employee_id
    );

  const month =
    String(
      req.body.month || ""
    ).trim();

  if (
    !employeeId ||
    !month
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Employee and month are required.",
    });
  }

  /*
    Model verifies:
      - current user is admin OR manager
      - employee belongs to manager
      - plans are still Pending
      - month matches
  */
  SalesTeam.changeApproval(
    employeeId,
    month,
    "Approved",
    req.user.id,
    (
      err,
      result
    ) => {
      if (err) {
        console.error(
          "Travel plan approval failed:",
          err
        );

     return res.status(500).json({
  success: false,
  message:
    err?.message ||
    "Approval failed",
});
      }

      if (
        !result?.affectedRows
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No pending travel plan found for approval.",
        });
      }

      /*
        Notify employee AFTER successful DB approval.
        Both in-app notification and email are sent.
      */
      notifyDecision(
        employeeId,
        month,
        "Approved"
      );

      return res.json({
        success: true,

        status:
          "Approved",

        message:
          "Travel plan approved successfully.",
      });
    }
  );
};

/* =========================================================
   REJECT
========================================================= */

exports.reject = (
  req,
  res
) => {
  const employeeId =
    Number(
      req.body.employee_id
    );

  const month =
    String(
      req.body.month || ""
    ).trim();

  if (
    !employeeId ||
    !month
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Employee and month are required.",
    });
  }

  /*
    The reason is accepted by the API.
    If you want the rejection reason stored in the
    database, the model/table needs a dedicated
    rejection_reason column or history record.
  */
  const reason =
    String(
      req.body.reason || ""
    ).trim();

  SalesTeam.changeApproval(
    employeeId,
    month,
    "Rejected",
    req.user.id,
    (
      err,
      result
    ) => {
      if (err) {
        console.error(
          "Travel plan rejection failed:",
          err
        );

        return res.status(500).json({
  success: false,
  message:
    err?.message ||
    "Rejection failed",
});
      }

      if (
        !result?.affectedRows
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No pending travel plan found for rejection.",
        });
      }

      /*
        Notify employee after successful rejection.
      */
      notifyDecision(
        employeeId,
        month,
        "Rejected"
      );

      return res.json({
        success: true,

        status:
          "Rejected",

        message:
          "Travel plan rejected successfully.",

        /*
          Returned for frontend usage/logging.
          Actual persistence requires a DB column/history.
        */
        reason,
      });
    }
  );
};

/* =========================================================
   SALES REVIEW
========================================================= */

exports.getSalesReview = (
  req,
  res
) => {
  SalesTeam.getReview(
    req.query,
    (
      err,
      result
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to load Sales Review",
        });
      }

      return res.json({
        success: true,

        data:
          result.rows,

        total:
          result.total,

        benchmarks:
          result.benchmarks,

        analytics:
          result.analytics,

        trend:
          result.trend || [],
      });
    }
  );
};

/* =========================================================
   DELETE ALL SALES REVIEW
========================================================= */

exports.deleteAllSalesReview = (
  req,
  res
) => {
  SalesTeam.clearReview(
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Delete all failed",
        });
      }

      return res.json({
        success: true,
      });
    }
  );
};

/* =========================================================
   UPDATE BENCHMARKS
========================================================= */

exports.updateBenchmarks = (
  req,
  res
) => {
  SalesTeam.upsertBenchmarks(
    req.body,
    req.user.id,
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Benchmark update failed",
        });
      }

      return res.json({
        success: true,
      });
    }
  );
};

/* =========================================================
   EXPORT SALES REVIEW
========================================================= */

exports.exportSalesReview = (
  req,
  res
) => {
  SalesTeam.exportReviewRows(
    req.query,
    (
      err,
      rows
    ) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Export failed",
        });
      }

      return csvResponse(
        res,
        rows,
        "sales-review.csv"
      );
    }
  );
};

/* =========================================================
   UPLOAD SALES REVIEW
========================================================= */

exports.uploadSalesReview = (
  req,
  res
) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message:
        "CSV, XLSX or XLS file is required.",
    });
  }

  const uploadedPath =
    req.file.path;

  let rows;

  try {
    rows =
      readSpreadsheetRows(
        uploadedPath
      );
  } catch (error) {
    fs.unlink(
      uploadedPath,
      () => {}
    );

    console.error(
      "Sales Review spreadsheet read failed:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        "Unable to read the uploaded file. Please upload a valid CSV, XLSX or XLS file.",
    });
  }

  /*
    The file is no longer needed after XLSX has parsed it.
  */
  fs.unlink(
    uploadedPath,
    () => {}
  );

  if (
    !Array.isArray(rows) ||
    !rows.length
  ) {
    return res.status(400).json({
      success: false,
      message:
        "The uploaded Sales Review file is empty.",
      imported: 0,
    });
  }

  SalesTeam.importReviewRows(
    rows,
    req.user?.id,
    (
      err,
      result
    ) => {
      if (err) {
        console.error(
          "Sales Review import failed:",
          {
            message:
              err.message,
            code:
              err.code,
            sqlMessage:
              err.sqlMessage,
            sqlState:
              err.sqlState,
            errno:
              err.errno,
            details:
              err.details,
          }
        );

        /*
          Give the frontend a useful validation message for
          invalid rows, while keeping the actual SQL error
          in the Render server logs.
        */
        if (
          err.code ===
          "SALES_REVIEW_INVALID_ROWS"
        ) {
          return res.status(400).json({
            success: false,
            message:
              err.message,
            details:
              err.details || [],
          });
        }

        return res.status(500).json({
          success: false,
          message:
            "Unable to import Sales Review file. Please check the backend database/schema and Render logs.",
        });
      }

      return res.json({
        success: true,

        imported:
          Number(
            result?.imported ||
              result?.affectedRows ||
              0
          ),

        skipped:
          Number(
            result?.skipped || 0
          ),

        warnings:
          result?.errors || [],
      });
    }
  );
};
