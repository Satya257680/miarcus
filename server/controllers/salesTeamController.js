const { readDeleteScope } = require("../utils/deleteScope");
const fs = require("fs");
const { Parser } = require("json2csv");
const XLSX = require("xlsx");

const SalesTeam = require("../models/salesTeamModel");

const {
  runBulkUpload,
  parseDate,
  formatDmy,
  saveExtraData,
  cleanExtras,
  call: bulkCall,
  sql: bulkSql,
} = require("../utils/bulkUploadEngine");

const notificationService = require("../services/notificationService");
const { sendGenericEmail } = require("../services/emailService");
// Every Travel Plan email is routed by Settings → Travel Plan Email
// Routing (master ON/OFF, per-event switches, specific contacts and
// the employee who filled the visit plan).
const TravelPlanEmail = require("../services/travelPlanEmailService");

/* =========================================================
   HELPERS
========================================================= */

const isAdmin = (user) => Number(user?.is_admin) === 1;

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
  planId,
  actorId = null
) => {
  /*
    Email – controlled by Travel Plan Email Routing.
    (Master OFF = nobody receives it.)
  */
  TravelPlanEmail.notify("plan_submitted", {
    planId,
    employeeId,
    actorId,
  });

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
    }
  );
};

/* =========================================================
   NOTIFY EMPLOYEE ABOUT APPROVAL DECISION
========================================================= */

const notifyDecision = (
  employeeId,
  month,
  status,
  actorId = null,
  reason = ""
) => {
  SalesTeam.getEmployeeForApproval(
    employeeId,
    month,
    async (
      err,
      employee
    ) => {
      const approved =
        status === "Approved";

      /*
        Email – controlled by Travel Plan Email Routing.
      */
      TravelPlanEmail.notify(
        approved ? "plan_approved" : "plan_rejected",
        {
          employeeId,
          month,
          monthLabel: employee?.month_label || month,
          actorId,
          reason,
        }
      );

      if (
        err ||
        !employee
      ) {
        return;
      }

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
          } Sales Team travel plan has been rejected.${reason ? ` Reason: ${reason}` : ""}`;

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
   VISIT PLAN BODY (DATE RANGE + PER-STORE DATES)

   A plan always has a date range:
     visit_date = From date, end_date = To date
   (single day: From = To). Every planned store has its own
   visit date inside that range:
     planned_stores: [{ store_id, visit_date }]
   planned_store_ids (old clients) is still accepted — those
   stores get the From date.
========================================================= */

const normalizePlanBody = (
  body = {},
  fallback = {}
) => {
  const weekOff =
    body.week_off === true ||
    body.week_off === 1 ||
    ["true", "yes", "1"].includes(
      String(body.week_off ?? "").trim().toLowerCase()
    );

  const fromDate =
    parseDate(body.visit_date || body.from_date) ||
    parseDate(fallback.visit_date);

  if (!fromDate) {
    return { error: "From date is required." };
  }

  const toDate =
    parseDate(body.end_date || body.to_date) ||
    (body.end_date || body.to_date ? null : fromDate);

  if (!toDate) {
    return { error: "To date is not a valid date." };
  }

  if (toDate < fromDate) {
    return { error: "To date cannot be before the From date." };
  }

  let plannedStores = [];

  if (!weekOff) {
    const source =
      Array.isArray(body.planned_stores) && body.planned_stores.length
        ? body.planned_stores
        : (Array.isArray(body.planned_store_ids) ? body.planned_store_ids : []).map(
            (id) => ({ store_id: id, visit_date: fromDate })
          );

    const seen = new Set();

    for (const item of source) {
      const storeId = Number(item?.store_id ?? item?.id ?? item);

      if (!storeId || seen.has(storeId)) {
        continue;
      }

      seen.add(storeId);

      const visitDate =
        parseDate(item?.visit_date) || fromDate;

      if (visitDate < fromDate || visitDate > toDate) {
        return {
          error: `Visit date ${formatDmy(visitDate)} for one of the stores is outside the plan range ${formatDmy(fromDate)} - ${formatDmy(toDate)}.`,
        };
      }

      plannedStores.push({
        store_id: storeId,
        visit_date: visitDate,
      });
    }
  }

  return {
    weekOff,
    fromDate,
    toDate,
    plannedStores,
  };
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

  if (!body.employee_id) {
    return res.status(400).json({
      success: false,
      message:
        "Employee is required.",
    });
  }

  const plan =
    normalizePlanBody(body);

  if (plan.error) {
    return res.status(400).json({
      success: false,
      message: plan.error,
    });
  }

  if (
    !plan.weekOff &&
    !plan.plannedStores.length
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Please select at least one planned store.",
    });
  }

  if (
    !plan.weekOff &&
    !String(body.city || "").trim()
  ) {
    return res.status(400).json({
      success: false,
      message:
        "City is required.",
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

    visit_date:
      plan.fromDate,

    end_date:
      plan.toDate,

    week_off:
      plan.weekOff,

    approval_status:
      "Pending",

    created_by:
      req.user.id,

    planned_stores:
      plan.plannedStores,

    planned_store_ids:
      plan.plannedStores.map((s) => s.store_id),
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
        id,
        req.user.id
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

      const plan =
        normalizePlanBody(req.body || {}, row);

      if (plan.error) {
        return res.status(400).json({
          success: false,
          message: plan.error,
        });
      }

      if (
        !plan.weekOff &&
        !plan.plannedStores.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select at least one planned store.",
        });
      }

      /*
        Do not allow frontend to preserve
        Approved/Rejected status.

        Model resets edited plans to Pending.
      */
      const payload = {
        ...req.body,

        employee_id:
          Number(
            req.body.employee_id ||
              row.employee_id
          ),

        visit_date: plan.fromDate,

        end_date: plan.toDate,

        week_off: plan.weekOff,

        planned_stores:
          plan.plannedStores,

        planned_store_ids:
          plan.plannedStores.map((s) => s.store_id),

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
            ),
            req.user.id
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

      // Capture the plan before it is deleted so the
      // "Travel Plan Deleted" email can still list its details.
      const snapshotPromise = TravelPlanEmail
        .getPlanSnapshot(req.params.id)
        .catch(() => null);

      snapshotPromise.then((snapshot) => {
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

            if (snapshot) {
              TravelPlanEmail.notify("plan_deleted", {
                snapshot,
                employeeId: snapshot.employee_id,
                actorId: req.user.id,
              });
            }

            return res.json({
              success: true,
            });
          }
        );
      });
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
  // Filters applied on the Visit Planner -> only the matching plans are
  // deleted. No filters -> every plan the user may delete.
  const scope = readDeleteScope(req);
  const filters = {};
  ["search", "from", "to", "name", "department", "store"].forEach((key) => {
    if (scope.filters[key] !== undefined) filters[key] = scope.filters[key];
  });

  if (scope.filtered && !Object.keys(filters).length) {
    return res.status(400).json({
      success: false,
      message: "No valid filter was supplied. Nothing was deleted.",
    });
  }

  SalesTeam.deleteAllVisitPlans(
    req.user,
    scope.filtered ? filters : null,
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Delete all failed",
        });
      }

      const deleted = Number(result?.affectedRows || 0);

      return res.json({
        success: true,
        deleted,
        message: scope.filtered
          ? `${deleted} filtered visit plan(s) deleted successfully.`
          : "All visit plans deleted successfully.",
      });
    }
  );
};

/* =========================================================
   IMPORT VISIT PLANS  (global bulk-upload engine)

   One row = one store visit:
     Employee ID / Employee Name, From Date, To Date,
     Store Code / Store Name, City, Visit Date,
     Reason to Travel, Remarks, Week Off  (+ any extra columns)

   - Rows with the same employee, From/To dates, reason and week-off
     flag are grouped into ONE visit plan (Pending).
   - Each row is validated on its own; a bad row never stops the
     other rows. Every problem is reported with its Excel row number,
     column, value and reason.
   - Extra columns (Transport Mode, Travel Cost, ...) are saved with
     the store visit and the plan, and shown in the Visit Planner.
========================================================= */

const cleanKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const looseKey = (value) =>
  cleanKey(value).replace(/[^a-z0-9]/g, "");

exports.importVisitPlans = (
  req,
  res
) =>
  runBulkUpload({
    req,
    res,
    module: "visit-plans",

    /* ---------- load lookups once ---------- */
    prepare: async (ctx) => {
      const [users, stores] = await Promise.all([
        bulkSql(`SELECT id, employee_id, name, email, status FROM users`),
        bulkSql(`SELECT id, store_name, store_code, city, status FROM stores`),
      ]);

      const userById = new Map();
      const userByCode = new Map();
      const usersByName = new Map();

      users.forEach((u) => {
        userById.set(String(u.id), u);
        if (u.employee_id !== null && u.employee_id !== undefined && String(u.employee_id).trim()) {
          userByCode.set(cleanKey(u.employee_id), u);
        }
        const nameKey = looseKey(u.name);
        if (nameKey) usersByName.set(nameKey, [...(usersByName.get(nameKey) || []), u]);
      });

      const storeByCode = new Map();
      const storesByName = new Map();

      stores.forEach((st) => {
        if (st.store_code !== null && st.store_code !== undefined && String(st.store_code).trim()) {
          storeByCode.set(cleanKey(st.store_code), st);
        }
        const nameKey = looseKey(st.store_name);
        if (nameKey) storesByName.set(nameKey, [...(storesByName.get(nameKey) || []), st]);
      });

      ctx.data = {
        ...ctx.data,
        userById,
        userByCode,
        usersByName,
        storeByCode,
        storesByName,
        plans: new Map(),
        createdPlans: new Map(),
        admin: isAdmin(req.user),
      };
    },

    /* ---------- row level checks (employee, dates, reason) ---------- */
    validateRow: async (row, ctx) => {
      const d = ctx.data;
      const resolved = {};
      ctx.resolved = resolved;

      // Employee
      const empId = ctx.text("Employee ID");
      const empName = ctx.text("Employee Name");
      let employee = null;

      if (empId) {
        employee =
          d.userByCode.get(cleanKey(empId)) ||
          (/^\d+$/.test(empId) ? d.userById.get(empId) : null);

        if (!employee) ctx.fail("Employee ID", empId, "Employee does not exist.");
      } else if (empName) {
        const matches = d.usersByName.get(looseKey(empName)) || [];
        if (matches.length === 1) employee = matches[0];
        else if (matches.length > 1) ctx.fail("Employee Name", empName, `More than one employee is named "${empName}". Add the Employee ID column.`);
        else ctx.fail("Employee Name", empName, "Employee does not exist.");
      }

      if (employee && String(employee.status || "Active").toLowerCase() === "inactive") {
        ctx.fail(empId ? "Employee ID" : "Employee Name", empId || empName, "Employee is inactive.");
        employee = null;
      }

      if (employee && !d.admin && Number(employee.id) !== Number(req.user.id)) {
        ctx.fail(empId ? "Employee ID" : "Employee Name", empId || empName, "You can only upload your own visit plans.");
        employee = null;
      }

      resolved.employee = employee;

      // Week off
      const weekOff = ctx.yesNo("Week Off", false);
      resolved.weekOff = weekOff;

      // Stores + their own dates (several stores may sit in one cell)
      const entries = weekOff ? [] : collectStoreEntries(ctx);
      resolved.entries = entries;

      if (!weekOff && !entries.length) {
        ctx.fail(
          "Store Code / Store Name",
          "",
          "Store Code or Store Name is required (not needed only when Week Off is Yes)."
        );
      }

      // Dates
      const visitDate = ctx.date("Visit Date");
      const fromInput = ctx.date("From Date");
      const toInput = ctx.date("To Date");

      const entryDates = entries.map((e) => e.date).filter(Boolean).sort();
      const fromDate = fromInput || visitDate || entryDates[0] || null;
      let toDate = toInput || (entryDates.length ? entryDates[entryDates.length - 1] : null) || fromDate;
      if (fromDate && toDate && toDate < fromDate && !toInput) toDate = fromDate;

      if (!fromDate) {
        ctx.fail("From Date / Visit Date", "", "From Date or Visit Date is required.");
      }

      if (fromDate && toDate && toDate < fromDate) {
        ctx.fail("To Date", ctx.cell("To Date"), `To Date (${formatDmy(toDate)}) is before From Date (${formatDmy(fromDate)}).`);
        toDate = null;
      }

      resolved.fromDate = fromDate;
      resolved.toDate = toDate;
      resolved.visitDate = visitDate || fromDate;

      const reason = ctx.text("Reason to Travel");
      if (reason.length > 2000) {
        ctx.fail("Reason to Travel", `${reason.slice(0, 40)}…`, "Reason to Travel is too long (max 2000 characters).");
      }
      resolved.reason = reason;
      resolved.city = ctx.text("City");
      resolved.remarks = ctx.text("Remarks");
    },

    /* ---------- one record per store (week off = one record) ---------- */
    expandRow: (row, ctx) => {
      const r = ctx.resolved;
      if (r.weekOff) return null;

      const items = [];
      r.entries.forEach((entry) => {
        const found = resolveStoreEntry(ctx.data, entry);
        if (!found.store) {
          ctx.fail(entry.column, entry.label, found.reason);
          return;
        }
        if (String(found.store.status || "Active").toLowerCase() === "inactive") {
          ctx.fail(entry.column, entry.label, `${found.store.store_name} is inactive.`);
          return;
        }

        const date = entry.date || r.visitDate;
        if (date < r.fromDate || date > r.toDate) {
          ctx.fail(
            entry.date ? entry.column : "Visit Date",
            `${found.store.store_name} · ${formatDmy(date)}`,
            `Visit date ${formatDmy(date)} is outside the plan range ${formatDmy(r.fromDate)} - ${formatDmy(r.toDate)}.`
          );
          return;
        }

        items.push({ store: found.store, visitDate: date, column: entry.column, label: entry.label });
      });
      return items;
    },

    duplicateKey: (row, ctx) => {
      const r = ctx.resolved || {};
      if (!r.employee) return null;
      if (r.weekOff) {
        return {
          key: `${r.employee.id}|week-off|${r.fromDate}|${r.toDate}`,
          column: "Week Off",
          value: `${r.employee.name} · ${formatDmy(r.fromDate)} - ${formatDmy(r.toDate)}`,
        };
      }
      const item = ctx.item;
      return {
        key: `${r.employee.id}|${item.store.id}|${r.fromDate}|${r.toDate}|${cleanKey(r.reason)}`,
        column: item.column,
        value: `${r.employee.name} · ${item.store.store_name} · ${formatDmy(item.visitDate)}`,
      };
    },

    /* ---------- save one store visit (or one week off) ---------- */
    processRow: async (row, ctx) => {
      const r = ctx.resolved;
      const d = ctx.data;
      const item = ctx.item;
      const groupKey = [r.employee.id, r.fromDate, r.toDate, r.weekOff ? 1 : 0, cleanKey(r.reason)].join("|");

      let plan = d.plans.get(groupKey);

      if (!plan) {
        // Re-use an existing PENDING plan with exactly the same details.
        const existing = await bulkSql(
          `
          SELECT id
          FROM sales_visit_plans
          WHERE employee_id = ?
            AND visit_date = ?
            AND COALESCE(end_date, visit_date) = ?
            AND week_off = ?
            AND LOWER(TRIM(COALESCE(reason_to_travel, ''))) = ?
            AND approval_status = 'Pending'
          ORDER BY id DESC
          LIMIT 1
          `,
          [r.employee.id, r.fromDate, r.toDate, r.weekOff ? 1 : 0, cleanKey(r.reason)]
        );

        if (existing.length) {
          const storeRows = await bulkSql(
            `SELECT store_id FROM sales_visit_plan_stores WHERE plan_id = ? AND store_kind = 'planned'`,
            [existing[0].id]
          );
          plan = { id: existing[0].id, existing: true, stores: new Set(storeRows.map((x) => Number(x.store_id))) };
        } else {
          const id = await bulkCall(SalesTeam.createVisitPlan, {
            employee_id: Number(r.employee.id),
            visit_date: r.fromDate,
            end_date: r.toDate,
            week_off: r.weekOff,
            city: r.city || item?.store?.city || "",
            reason_to_travel: r.reason,
            planned_store_ids: [],
            approval_status: "Pending",
            created_by: req.user.id,
          });
          plan = { id, existing: false, stores: new Set() };
          d.createdPlans.set(id, Number(r.employee.id));
        }

        d.plans.set(groupKey, plan);
      }

      if (r.remarks && !plan.remarksSaved) {
        plan.remarksSaved = true;
        await bulkSql(
          `
          UPDATE sales_visit_plans
          SET remarks = CASE
            WHEN remarks IS NULL OR TRIM(remarks) = '' THEN ?
            WHEN LOCATE(?, remarks) > 0 THEN remarks
            ELSE CONCAT(remarks, ' | ', ?)
          END
          WHERE id = ?
          `,
          [r.remarks, r.remarks, r.remarks, plan.id]
        );
      }

      if (Object.keys(cleanExtras(ctx.extra)).length && !plan.extraSavedFor?.has(row.__row)) {
        plan.extraSavedFor = plan.extraSavedFor || new Set();
        plan.extraSavedFor.add(row.__row);
        await saveExtraData("sales_visit_plans", plan.id, ctx.extra, { mode: "append" });
      }

      // Week off rows have no store.
      if (r.weekOff) {
        if (plan.existing) {
          ctx.duplicate("Week Off", `${formatDmy(r.fromDate)} - ${formatDmy(r.toDate)}`, "A week off for this employee and these dates already exists.");
          return { skipped: true };
        }
        return { id: null };
      }

      if (plan.stores.has(Number(item.store.id))) {
        ctx.duplicate(
          item.column,
          item.label,
          `${item.store.store_name} is already in this employee's plan for ${formatDmy(r.fromDate)} - ${formatDmy(r.toDate)}.`
        );
        return { skipped: true };
      }

      const result = await bulkSql(
        `
        INSERT INTO sales_visit_plan_stores
          (plan_id, store_id, store_kind, visit_date)
        VALUES (?, ?, 'planned', ?)
        `,
        [plan.id, item.store.id, item.visitDate]
      );

      plan.stores.add(Number(item.store.id));

      return { id: result.insertId, table: "sales_visit_plan_stores" };
    },

    /* ---------- after all rows ---------- */
    finalize: async (ctx) => {
      ctx.data.createdPlans.forEach((employeeId, planId) => {
        notifyPendingApprovers(employeeId, planId);
      });

      if (ctx.data.createdPlans.size) {
        ctx.report.warn(`${ctx.data.createdPlans.size} visit plan(s) created and submitted for approval (Pending).`);
      }
      if (ctx.report.items.saved) {
        ctx.report.warn(`${ctx.report.items.saved} store visit(s) saved.`);
      }
    },
  });

/* ---------------------------------------------------------
   STORE LISTS INSIDE ONE CELL
   Accepts every layout people (and the Visit Planner export) use:
     Store Code:            556            |  556, 509, 558
     Store Name:            MRPL - HISAR   |  MRPL - HISAR, MRPL-SOLAN
                            (commas inside a store name are fine:
                             "MRPL-SARABHA NAGAR ,LUDHIANA")
     Store Visit Schedule:  MRPL - ABOHAR (605) - 01/10/2026; MRPL - HARIDWAR (608) - 03/10/2026
--------------------------------------------------------- */

const SCHEDULE_DATE =
  "(\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\s+[A-Za-z]{3,9},?\\s+\\d{2,4}|\\d{5})";

function parseScheduleEntry(text) {
  let rest = String(text || "").trim();
  let date = null;

  const dateMatch = rest.match(new RegExp(`(?:^|\\s|[-–:@,])\\s*${SCHEDULE_DATE}\\s*$`));
  if (dateMatch) {
    const parsed = parseDate(dateMatch[1]);
    if (parsed) {
      date = parsed;
      rest = rest.slice(0, dateMatch.index).replace(/[\s\-–:@,]+$/, "").trim();
    }
  }

  let code = null;
  const codeMatch = rest.match(/\(([^()]+)\)\s*$/);
  if (codeMatch) {
    code = codeMatch[1].trim();
  }

  return { text: rest, code, date };
}

function splitStoreNames(cellText, storesByName) {
  const parts = String(cellText || "")
    .split(/\r?\n|;|\||,/)
    .map((p) => p.trim());
  const out = [];
  let i = 0;
  while (i < parts.length) {
    if (!parts[i]) {
      i += 1;
      continue;
    }
    // Longest run of pieces that together is a real store name
    // ("MRPL-SARABHA NAGAR " + ",LUDHIANA").
    let taken = 1;
    for (let j = Math.min(parts.length, i + 4); j > i + 1; j--) {
      if (storesByName.has(looseKey(parts.slice(i, j).join(",")))) {
        taken = j - i;
        break;
      }
    }
    out.push(parts.slice(i, i + taken).join(", ").replace(/\s+,/g, ","));
    i += taken;
  }
  return out.filter(Boolean);
}

function collectStoreEntries(ctx) {
  const d = ctx.data;
  const entries = [];

  const schedule = ctx.text("Store Visit Schedule");
  if (schedule) {
    schedule
      .split(/\r?\n|;/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((part) => {
        const parsed = parseScheduleEntry(part);
        entries.push({ column: "Store Visit Schedule", label: part, text: parsed.text, code: parsed.code, date: parsed.date });
      });
    if (entries.length) return entries;
  }

  const codes = ctx.text("Store Code");
  if (codes) {
    codes
      .split(/\r?\n|;|\||,/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((code) => entries.push({ column: "Store Code", label: code, text: "", code, date: null }));
    return entries;
  }

  const names = ctx.text("Store Name");
  if (names) {
    splitStoreNames(names, d.storesByName).forEach((name) => {
      const parsed = parseScheduleEntry(name);
      entries.push({ column: "Store Name", label: name, text: parsed.text, code: parsed.code, date: parsed.date });
    });
  }

  return entries;
}

function resolveStoreEntry(d, entry) {
  if (entry.code) {
    const byCode = d.storeByCode.get(cleanKey(entry.code));
    if (byCode) return { store: byCode };
  }

  if (entry.text) {
    const plain = entry.code ? entry.text.replace(/\([^()]*\)\s*$/, "").trim() : entry.text;
    const matches =
      d.storesByName.get(looseKey(entry.text)) ||
      d.storesByName.get(looseKey(plain)) ||
      [];
    if (matches.length === 1) return { store: matches[0] };
    if (matches.length > 1) {
      return { store: null, reason: `More than one store is named "${plain}". Add the store code in brackets, e.g. "${plain} (556)".` };
    }
    return { store: null, reason: `Store "${plain}" does not exist in the database.` };
  }

  return { store: null, reason: `Store code ${entry.code} does not exist in the database.` };
}


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

          TravelPlanEmail.notify("actual_updated", {
            planId: Number(req.params.id),
            employeeId: row.employee_id,
            actorId: req.user.id,
          });

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

          TravelPlanEmail.notify("remark_added", {
            planId: Number(req.params.id),
            employeeId: row.employee_id,
            actorId: req.user.id,
            remark: String(req.body.remark || "").trim(),
            attachment: Boolean(attachmentPath),
          });

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
   GET APPROVAL DETAILS
========================================================= */

exports.getApprovalDetails = (
  req,
  res
) => {
  const employeeId = Number(req.params.employeeId);
  const month = String(req.params.month || "").trim();

  if (!employeeId || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Valid employee and month are required.",
    });
  }

  SalesTeam.getApprovalDetails(
    employeeId,
    month,
    req.user,
    (err, data) => {
      if (err) {
        console.error("Travel plan approval details query failed:", err);
        return res.status(500).json({
          success: false,
          message: "Unable to load travel plan details.",
        });
      }

      if (!data || !data.length) {
        return res.status(404).json({
          success: false,
          message: "Pending travel plan details not found.",
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
        "Approved",
        req.user.id
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
        "Rejected",
        req.user.id,
        reason
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
  // Filters applied on Sales Review -> only the matching rows are deleted.
  const scope = readDeleteScope(req);
  const filters = {};
  ["years", "months", "weeks", "reports_to", "asm", "store", "search"].forEach((key) => {
    if (scope.filters[key] !== undefined) filters[key] = scope.filters[key];
  });

  if (scope.filtered && !Object.keys(filters).length) {
    return res.status(400).json({
      success: false,
      message: "No valid filter was supplied. Nothing was deleted.",
    });
  }

  SalesTeam.clearReview(
    scope.filtered ? filters : null,
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message:
            "Delete all failed",
        });
      }

      const deleted = Number(result?.affectedRows || 0);

      return res.json({
        success: true,
        deleted,
        message: scope.filtered
          ? `${deleted} filtered Sales Review record(s) deleted successfully.`
          : "All Sales Review records deleted successfully.",
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
  const NUMERIC = [
    ["Target", "target"],
    ["MTD", "mtd"],
    ["MRP Sale", "mrp_sale"],
    ["Last Month Sale", "last_month_sale"],
    ["LYSM", "lysm"],
    ["Projection", "projection"],
    ["Projection For Remaining Days", "projection_remaining"],
    ["Projection (by selected week)", "projection_selected_week"],
    ["Discount Amount (MRP)", "discount_amount"],
    ["Discount %", "discount_percent"],
    ["UPT", "upt"],
    ["ABV", "abv"],
    ["ASP", "asp"],
    ["Bill Count", "bill_count"],
    ["Qty Sold", "qty_sold"],
  ];

  const toNumber = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    let text = String(value).trim();
    const negative = text.startsWith("(") && text.endsWith(")");
    text = text.replace(/^\((.*)\)$/, "$1").replace(/[,\s₹$€£]/g, "").replace(/%$/, "");
    if (text === "" || text === "-") return 0;
    const n = Number(text);
    return Number.isFinite(n) ? (negative ? -n : n) : NaN;
  };

  return runBulkUpload({
    req,
    res,
    module: "sales-review",

    validateRow: (row, ctx) => {
      const values = {};

      NUMERIC.forEach(([column, field]) => {
        const raw = ctx.cell(column);
        const n = toNumber(raw);
        if (Number.isNaN(n)) {
          ctx.fail(column, raw, `${column} must be a number.`);
        } else {
          values[field] = field === "bill_count" ? Math.trunc(n) : n;
        }
      });

      const yearRaw = ctx.cell("Year");
      let year = null;
      if (yearRaw instanceof Date) year = yearRaw.getFullYear();
      else if (String(yearRaw ?? "").trim()) {
        year = Math.trunc(toNumber(yearRaw));
        if (!Number.isFinite(year) || year < 1900 || year > 2200) {
          ctx.fail("Year", yearRaw, "Year must be a 4-digit year, e.g. 2026.");
          year = null;
        }
      }

      const storeIdRaw = ctx.text("Store ID");
      const storeId = /^\d+$/.test(storeIdRaw) ? Number(storeIdRaw) : null;

      ctx.values = {
        ...values,
        store_id: storeId,
        store_name: ctx.text("Store Name").slice(0, 255),
        year,
        month: ctx.text("Month").slice(0, 40) || null,
        week: ctx.text("Week").slice(0, 40) || null,
        reports_to: ctx.text("Reports To").slice(0, 255) || null,
        asm: ctx.text("ASM").slice(0, 255) || null,
        remarks: ctx.text("Remarks") || null,
      };
    },

    processRow: async (row, ctx) => {
      const v = ctx.values;
      const result = await bulkSql(
        `
        INSERT INTO sales_review_records
        (
          store_id, store_name, year, month, week,
          target, mtd, mrp_sale, last_month_sale, lysm,
          projection, projection_remaining, projection_selected_week,
          discount_amount, discount_percent, upt, abv, asp,
          bill_count, qty_sold, reports_to, asm, remarks, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          v.store_id, v.store_name, v.year, v.month, v.week,
          v.target || 0, v.mtd || 0, v.mrp_sale || 0, v.last_month_sale || 0, v.lysm || 0,
          v.projection || 0, v.projection_remaining || 0, v.projection_selected_week || 0,
          v.discount_amount || 0, v.discount_percent || 0, v.upt || 0, v.abv || 0, v.asp || 0,
          v.bill_count || 0, v.qty_sold || 0, v.reports_to, v.asm, v.remarks,
          Number(req.user?.id) || null,
        ]
      );
      return { id: result.insertId };
    },
  });
};
