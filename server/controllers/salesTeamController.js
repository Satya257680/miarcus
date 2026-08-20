const fs = require("fs");
const csvParser = require("csv-parser");
const { Parser } = require("json2csv");
const SalesTeam = require("../models/salesTeamModel");

const isAdmin = (user) => user?.is_admin === true || user?.is_admin === 1 || user?.is_admin === "1" || user?.administrator === true || user?.administrator === 1 || user?.administrator === "1";

const csvResponse = (res, rows, filename) => {
  const parser = new Parser({ flatten: true });
  const csv = parser.parse(rows || []);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
};

exports.employees = (req, res) => SalesTeam.getEmployees(req.query.search, (err, data) => err ? res.status(500).json({ success:false, message:"Unable to load employees" }) : res.json({ success:true, data }));
exports.stores = (req, res) => SalesTeam.getStores(req.query.search, (err, data) => err ? res.status(500).json({ success:false, message:"Unable to load stores" }) : res.json({ success:true, data }));

exports.getVisitPlans = (req, res) => SalesTeam.getVisitPlans(req.query, req.user, (err, result) => err ? res.status(500).json({ success:false, message:"Unable to load visit planner" }) : res.json({ success:true, data:result.rows, total:result.total, page:Number(req.query.page||1), limit:Number(req.query.limit||10) }));

exports.createVisitPlan = (req, res) => {
  const body = req.body || {};
  const admin = isAdmin(req.user);
  if (!body.employee_id || !body.visit_date) return res.status(400).json({ success:false, message:"Employee and date are required." });
  if (!admin && Number(body.employee_id) !== Number(req.user.id)) return res.status(403).json({ success:false, message:"You can only create your own visit plan." });
  SalesTeam.createVisitPlan({ ...body, approval_status: admin ? "Approved" : "Pending", created_by:req.user.id }, (err,id) => err ? res.status(500).json({ success:false, message:"Unable to create planned visit" }) : res.status(201).json({ success:true, id }));
};

exports.updateVisitPlan = (req, res) => SalesTeam.getVisitPlanById(req.params.id, (findErr, row) => {
  if (findErr) return res.status(500).json({ success:false, message:"Unable to find visit plan" });
  if (!row) return res.status(404).json({ success:false, message:"Visit plan not found" });
  if (!isAdmin(req.user) && Number(row.employee_id) !== Number(req.user.id)) return res.status(403).json({ success:false, message:"Access denied" });
  SalesTeam.updateVisitPlan(req.params.id, { ...req.body, updated_by:req.user.id }, (err) => err ? res.status(500).json({ success:false, message:"Unable to update planned visit" }) : res.json({ success:true }));
});

exports.deleteVisitPlan = (req, res) => SalesTeam.getVisitPlanById(req.params.id, (findErr,row) => {
  if (findErr) return res.status(500).json({ success:false, message:"Unable to find visit plan" });
  if (!row) return res.status(404).json({ success:false, message:"Visit plan not found" });
  if (!isAdmin(req.user) && Number(row.employee_id) !== Number(req.user.id)) return res.status(403).json({ success:false, message:"Access denied" });
  SalesTeam.deleteVisitPlan(req.params.id, (err) => err ? res.status(500).json({ success:false, message:"Delete failed" }) : res.json({ success:true }));
});

exports.deleteAllVisitPlans = (req,res) => SalesTeam.deleteAllVisitPlans(req.user,(err)=>err?res.status(500).json({success:false,message:"Delete all failed"}):res.json({success:true}));

exports.importVisitPlans = (req,res) => {
  if (!req.file) return res.status(400).json({ success:false, message:"CSV file is required." });
  const rows=[];
  fs.createReadStream(req.file.path).pipe(csvParser()).on("data",(row)=>rows.push(row)).on("end",()=>{
    fs.unlink(req.file.path,()=>{});
    let remaining=rows.length, failed=false;
    if (!remaining) return res.json({success:true, imported:0});
    rows.forEach((row)=>{
      const employeeId=row.employee_id || row["Employee ID"] || row.employeeId;
      const date=row.visit_date || row.Date || row.date;
      if (!employeeId || !date || (!isAdmin(req.user) && Number(employeeId)!==Number(req.user.id))) { remaining-=1; if(!remaining&&!failed) res.json({success:true,imported:rows.length}); return; }
      SalesTeam.createVisitPlan({ employee_id:Number(employeeId), visit_date:date, week_off:String(row.week_off||row["Week Off"]||"").toLowerCase()==="true" || String(row.week_off||row["Week Off"]||"")==="1", city:row.city||row.City||"", reason_to_travel:row.reason_to_travel||row["Reason to Travel"]||"", planned_store_ids:[], approval_status:isAdmin(req.user)?"Approved":"Pending", created_by:req.user.id },(err)=>{ if(err) failed=true; remaining-=1; if(!remaining) res.status(failed?500:200).json({success:!failed, imported:rows.length}); });
    });
  }).on("error",(error)=>{ fs.unlink(req.file.path,()=>{}); res.status(500).json({success:false,message:error.message}); });
};

exports.exportVisitPlans = (req,res) => SalesTeam.exportVisitRows(req.query,req.user,(err,rows)=>err?res.status(500).json({success:false,message:"Export failed"}):csvResponse(res,rows,"visit-planner.csv"));
exports.getTravelPlans = (req,res) => SalesTeam.getTravelPlans(req.query,req.user,(err,result)=>err?res.status(500).json({success:false,message:"Unable to load travel plan"}):res.json({success:true,data:result.rows,total:result.total}));
exports.saveActualStores = (req,res) => SalesTeam.getVisitPlanById(req.params.id,(findErr,row)=>{ if(findErr||!row) return res.status(404).json({success:false,message:"Travel plan not found"}); if(!isAdmin(req.user)&&Number(row.employee_id)!==Number(req.user.id)) return res.status(403).json({success:false,message:"Access denied"}); SalesTeam.saveActualStores(req.params.id,req.body.store_ids||[],req.user.id,(err)=>err?res.status(500).json({success:false,message:"Unable to save actual stores"}):res.json({success:true})); });
exports.getHistory = (req,res) => SalesTeam.getHistory(req.params.id,(err,data)=>err?res.status(500).json({success:false,message:"Unable to load history"}):res.json({success:true,data}));

exports.addRemark = (req,res) => SalesTeam.getVisitPlanById(req.params.id,(findErr,row) => {
  if (findErr || !row) return res.status(404).json({success:false,message:"Travel plan not found"});
  if (!isAdmin(req.user) && Number(row.employee_id) !== Number(req.user.id)) return res.status(403).json({success:false,message:"Access denied"});
  const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null;
  SalesTeam.addHistory(req.params.id, req.user.id, req.body.remark, attachmentPath, (err) =>
    err ? res.status(500).json({success:false,message:"Unable to save remark"}) : res.json({success:true})
  );
});
exports.deleteTravelPlan = exports.deleteVisitPlan;
exports.getApprovals = (req,res)=>SalesTeam.getApprovals(req.user,(err,data)=>err?res.status(500).json({success:false,message:"Unable to load approvals"}):res.json({success:true,data}));
exports.approve = (req,res)=>SalesTeam.changeApproval(req.body.employee_id,req.body.month,"Approved",req.user.id,(err)=>err?res.status(500).json({success:false,message:"Approval failed"}):res.json({success:true}));
exports.reject = (req,res)=>SalesTeam.changeApproval(req.body.employee_id,req.body.month,"Rejected",req.user.id,(err)=>err?res.status(500).json({success:false,message:"Rejection failed"}):res.json({success:true}));
exports.getSalesReview = (req,res)=>SalesTeam.getReview(req.query,(err,result)=>err?res.status(500).json({success:false,message:"Unable to load Sales Review"}):res.json({success:true,data:result.rows,total:result.total,benchmarks:result.benchmarks}));
exports.deleteAllSalesReview = (req,res)=>SalesTeam.clearReview((err)=>err?res.status(500).json({success:false,message:"Delete all failed"}):res.json({success:true}));
exports.updateBenchmarks = (req,res)=>SalesTeam.upsertBenchmarks(req.body,req.user.id,(err)=>err?res.status(500).json({success:false,message:"Benchmark update failed"}):res.json({success:true}));
exports.exportSalesReview = (req,res)=>SalesTeam.exportReviewRows(req.query,(err,rows)=>err?res.status(500).json({success:false,message:"Export failed"}):csvResponse(res,rows,"sales-review.csv"));

exports.uploadSalesReview = (req,res)=>{
  if(!req.file) return res.status(400).json({success:false,message:"CSV file is required."});
  const rows=[];
  fs.createReadStream(req.file.path).pipe(csvParser()).on("data",row=>rows.push(row)).on("end",()=>{ fs.unlink(req.file.path,()=>{}); SalesTeam.importReviewRows(rows,req.user.id,(err,result)=>err?res.status(500).json({success:false,message:"Unable to import Sales Review CSV"}):res.json({success:true,imported:result.affectedRows})); }).on("error",err=>{fs.unlink(req.file.path,()=>{});res.status(500).json({success:false,message:err.message});});
};
