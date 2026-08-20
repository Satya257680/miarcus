const fs = require("fs");
const { Parser } = require("json2csv");
const XLSX = require("xlsx");
const SalesTeam = require("../models/salesTeamModel");
const notificationService = require("../services/notificationService");
const { sendGenericEmail } = require("../services/emailService");

const isAdmin = (user) =>
  user?.is_admin === true || user?.is_admin === 1 || user?.is_admin === "1" ||
  user?.administrator === true || user?.administrator === 1 || user?.administrator === "1";

const csvResponse = (res, rows, filename) => {
  const parser = new Parser({ flatten: true });
  const csv = parser.parse(rows || []);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
};

const sendEmailSafely = async (to, subject, html) => {
  if (!to) return;
  try {
    await sendGenericEmail({ to, subject, html });
  } catch (error) {
    console.error("Sales Team email failed:", error.message);
  }
};

const appUrl = () => String(process.env.APP_URL || process.env.CLIENT_URL || "").replace(/\/$/, "");
const readSpreadsheetRows = (filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};


const notifyPendingApprovers = (employeeId, planId) => {
  SalesTeam.getApprovalRecipients(employeeId, async (err, recipients) => {
    if (err || !recipients?.length) return;

    const ids = recipients.map((recipient) => Number(recipient.id)).filter(Boolean);

    await notificationService.createForUsers(ids, {
      title: "Travel Plan Pending Approval",
      message: "A new Sales Team travel plan is waiting for your approval.",
      module_name: "Travel Plan Approvals",
      action_name: "Pending",
      entity_id: planId,
      link: "/travel-plan-approval",
      type: "info",
    });

    await Promise.all(
      recipients.map((recipient) =>
        sendEmailSafely(
          recipient.email,
          "MIARCUS - Travel Plan Pending Approval",
          `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#263b45">
            <h2>Travel Plan Pending Approval</h2>
            <p>A new Sales Team travel plan has been submitted and is waiting for your approval.</p>
            <p>Please sign in to MIARCUS and open <b>Travel Plan Approvals</b> to Approve or Reject the plan.</p>
            <p><a href="${appUrl()}/travel-plan-approval">Open Travel Plan Approvals</a></p>
          </div>`
        )
      )
    );
  });
};

const notifyDecision = (employeeId, month, status) => {
  SalesTeam.getEmployeeForApproval(employeeId, month, async (err, employee) => {
    if (err || !employee) return;

    const approved = status === "Approved";
    const title = approved ? "Travel Plan Approved" : "Travel Plan Rejected";
    const message = approved
      ? `${employee.month_label || "Your travel plan"} Sales Team travel plan has been approved.`
      : `${employee.month_label || "Your travel plan"} Sales Team travel plan has been rejected.`;

    await notificationService.createForUsers([employee.id], {
      title,
      message,
      module_name: "Travel Plan",
      action_name: status,
      entity_id: employeeId,
      link: approved ? "/travel-plan" : "/visit-planner",
      type: approved ? "success" : "warning",
    });

    await sendEmailSafely(
      employee.email,
      `MIARCUS - ${title}`,
      `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#263b45">
        <h2>${title}</h2>
        <p>Your Sales Team travel plan for <b>${employee.month_label || month}</b> has been <b>${status.toLowerCase()}</b>.</p>
        <p>Plan days: <b>${employee.plan_days}</b></p>
        <p>${approved ? "You can now view the approved plan in Travel Plan." : "Please open Visit Planner to review the plan and make changes if required."}</p>
        <p><a href="${appUrl()}${approved ? "/travel-plan" : "/visit-planner"}">Open MIARCUS</a></p>
      </div>`
    );
  });
};

exports.employees = (req, res) =>
  SalesTeam.getEmployees(req.query.search, (err, data) =>
    err ? res.status(500).json({ success: false, message: "Unable to load employees" }) : res.json({ success: true, data })
  );

exports.stores = (req, res) =>
  SalesTeam.getStores(req.query.search, (err, data) =>
    err ? res.status(500).json({ success: false, message: "Unable to load stores" }) : res.json({ success: true, data })
  );

exports.getVisitPlans = (req, res) =>
  SalesTeam.getVisitPlans(req.query, req.user, (err, result) =>
    err
      ? res.status(500).json({ success: false, message: "Unable to load visit planner" })
      : res.json({ success: true, data: result.rows, total: result.total, page: Number(req.query.page || 1), limit: Number(req.query.limit || 10) })
  );

exports.createVisitPlan = (req, res) => {
  const body = req.body || {};
  const admin = isAdmin(req.user);

  if (!body.employee_id || !body.visit_date) {
    return res.status(400).json({ success: false, message: "Employee and date are required." });
  }

  if (!admin && Number(body.employee_id) !== Number(req.user.id)) {
    return res.status(403).json({ success: false, message: "You can only create your own visit plan." });
  }

  SalesTeam.createVisitPlan(
    { ...body, approval_status: "Pending", created_by: req.user.id },
    (err, id) => {
      if (err) return res.status(500).json({ success: false, message: "Unable to create planned visit" });
      notifyPendingApprovers(Number(body.employee_id), id);
      return res.status(201).json({ success: true, id, approval_status: "Pending" });
    }
  );
};

exports.updateVisitPlan = (req, res) =>
  SalesTeam.getVisitPlanById(req.params.id, (findErr, row) => {
    if (findErr) return res.status(500).json({ success: false, message: "Unable to find visit plan" });
    if (!row) return res.status(404).json({ success: false, message: "Visit plan not found" });
    if (!isAdmin(req.user) && Number(row.employee_id) !== Number(req.user.id)) return res.status(403).json({ success: false, message: "Access denied" });

    SalesTeam.updateVisitPlan(req.params.id, { ...req.body, updated_by: req.user.id }, (err) => {
      if (err) return res.status(500).json({ success: false, message: "Unable to update planned visit" });
      notifyPendingApprovers(Number(req.body.employee_id || row.employee_id), Number(req.params.id));
      return res.json({ success: true, approval_status: "Pending" });
    });
  });

exports.deleteVisitPlan = (req, res) =>
  SalesTeam.getVisitPlanById(req.params.id, (findErr, row) => {
    if (findErr) return res.status(500).json({ success: false, message: "Unable to find visit plan" });
    if (!row) return res.status(404).json({ success: false, message: "Visit plan not found" });
    if (!isAdmin(req.user) && Number(row.employee_id) !== Number(req.user.id)) return res.status(403).json({ success: false, message: "Access denied" });

    SalesTeam.deleteVisitPlan(req.params.id, (err) =>
      err ? res.status(500).json({ success: false, message: "Delete failed" }) : res.json({ success: true })
    );
  });

exports.deleteAllVisitPlans = (req, res) =>
  SalesTeam.deleteAllVisitPlans(req.user, (err) =>
    err ? res.status(500).json({ success: false, message: "Delete all failed" }) : res.json({ success: true })
  );

exports.importVisitPlans = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "CSV, XLSX or XLS file is required." });

  let rows;
  try {
    rows = readSpreadsheetRows(req.file.path);
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: "Unable to read the uploaded file." });
  }

  fs.unlink(req.file.path, () => {});
  if (!rows.length) return res.json({ success: true, imported: 0 });

  let remaining = rows.length;
  let failed = false;
  let imported = 0;

  rows.forEach((row) => {
    const employeeId = row.employee_id || row["Employee ID"] || row.employeeId;
    const date = row.visit_date || row.Date || row.date;
    const valid = employeeId && date && (isAdmin(req.user) || Number(employeeId) === Number(req.user.id));

    if (!valid) {
      failed = true;
      remaining -= 1;
      if (!remaining) return res.status(400).json({ success: false, imported, message: "One or more rows have an invalid employee or date." });
      return;
    }

    SalesTeam.createVisitPlan(
      {
        employee_id: Number(employeeId),
        visit_date: date,
        week_off: String(row.week_off || row["Week Off"] || "").toLowerCase() === "true" || String(row.week_off || row["Week Off"] || "") === "1",
        city: row.city || row.City || "",
        reason_to_travel: row.reason_to_travel || row["Reason to Travel"] || "",
        planned_store_ids: [],
        approval_status: "Pending",
        created_by: req.user.id,
      },
      (err, id) => {
        if (err) failed = true;
        else {
          imported += 1;
          notifyPendingApprovers(Number(employeeId), id);
        }
        remaining -= 1;
        if (!remaining) res.status(failed ? 500 : 200).json({ success: !failed, imported });
      }
    );
  });
};

exports.exportVisitPlans = (req, res) =>
  SalesTeam.exportVisitRows(req.query, req.user, (err, rows) =>
    err ? res.status(500).json({ success: false, message: "Export failed" }) : csvResponse(res, rows, "visit-planner.csv")
  );

exports.getTravelPlans = (req, res) =>
  SalesTeam.getTravelPlans(req.query, req.user, (err, result) =>
    err ? res.status(500).json({ success: false, message: "Unable to load travel plan" }) : res.json({ success: true, data: result.rows, total: result.total })
  );

exports.saveActualStores = (req, res) =>
  SalesTeam.getVisitPlanById(req.params.id, (findErr, row) => {
    if (findErr || !row) return res.status(404).json({ success: false, message: "Travel plan not found" });
    if (!isAdmin(req.user) && Number(row.employee_id) !== Number(req.user.id)) return res.status(403).json({ success: false, message: "Access denied" });
    SalesTeam.saveActualStores(req.params.id, req.body.store_ids || [], req.user.id, (err) =>
      err ? res.status(500).json({ success: false, message: "Unable to save actual stores" }) : res.json({ success: true })
    );
  });

exports.getHistory = (req, res) =>
  SalesTeam.getHistory(req.params.id, (err, data) =>
    err ? res.status(500).json({ success: false, message: "Unable to load history" }) : res.json({ success: true, data })
  );

exports.addRemark = (req, res) =>
  SalesTeam.getVisitPlanById(req.params.id, (findErr, row) => {
    if (findErr || !row) return res.status(404).json({ success: false, message: "Travel plan not found" });
    if (!isAdmin(req.user) && Number(row.employee_id) !== Number(req.user.id)) return res.status(403).json({ success: false, message: "Access denied" });
    const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null;
    SalesTeam.addHistory(req.params.id, req.user.id, req.body.remark, attachmentPath, (err) =>
      err ? res.status(500).json({ success: false, message: "Unable to save remark" }) : res.json({ success: true })
    );
  });

exports.deleteTravelPlan = exports.deleteVisitPlan;

exports.getApprovals = (req, res) =>
  SalesTeam.getApprovals(req.user, (err, data) =>
    err ? res.status(500).json({ success: false, message: "Unable to load approvals" }) : res.json({ success: true, data })
  );

exports.approve = (req, res) =>
  SalesTeam.changeApproval(req.body.employee_id, req.body.month, "Approved", req.user.id, (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Approval failed" });
    if (!result?.affectedRows) return res.status(400).json({ success: false, message: "No pending travel plan found for approval." });
    notifyDecision(req.body.employee_id, req.body.month, "Approved");
    return res.json({ success: true });
  });

exports.reject = (req, res) =>
  SalesTeam.changeApproval(req.body.employee_id, req.body.month, "Rejected", req.user.id, (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Rejection failed" });
    if (!result?.affectedRows) return res.status(400).json({ success: false, message: "No pending travel plan found for rejection." });
    notifyDecision(req.body.employee_id, req.body.month, "Rejected");
    return res.json({ success: true });
  });

exports.getSalesReview = (req, res) =>
  SalesTeam.getReview(req.query, (err, result) =>
    err ? res.status(500).json({ success: false, message: "Unable to load Sales Review" }) : res.json({ success: true, data: result.rows, total: result.total, benchmarks: result.benchmarks })
  );

exports.deleteAllSalesReview = (req, res) =>
  SalesTeam.clearReview((err) =>
    err ? res.status(500).json({ success: false, message: "Delete all failed" }) : res.json({ success: true })
  );

exports.updateBenchmarks = (req, res) =>
  SalesTeam.upsertBenchmarks(req.body, req.user.id, (err) =>
    err ? res.status(500).json({ success: false, message: "Benchmark update failed" }) : res.json({ success: true })
  );

exports.exportSalesReview = (req, res) =>
  SalesTeam.exportReviewRows(req.query, (err, rows) =>
    err ? res.status(500).json({ success: false, message: "Export failed" }) : csvResponse(res, rows, "sales-review.csv")
  );

exports.uploadSalesReview = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "CSV, XLSX or XLS file is required." });

  let rows;
  try {
    rows = readSpreadsheetRows(req.file.path);
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: "Unable to read the uploaded file." });
  }

  fs.unlink(req.file.path, () => {});
  SalesTeam.importReviewRows(rows, req.user.id, (err, result) =>
    err
      ? res.status(500).json({ success: false, message: "Unable to import Sales Review file" })
      : res.json({ success: true, imported: result.affectedRows })
  );
};
