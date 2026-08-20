const express = require("express");
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const controller = require("../controllers/salesTeamController");

const router = express.Router();
const upload = multer({ dest:path.resolve(__dirname,"../uploads/"), limits:{fileSize:10*1024*1024}, fileFilter:(req,file,cb)=>file.originalname.toLowerCase().endsWith(".csv")?cb(null,true):cb(new Error("Only CSV files are allowed.")) });
const attachmentUpload = multer({ dest:path.resolve(__dirname,"../uploads/"), limits:{fileSize:10*1024*1024} });

router.get("/employees", authMiddleware, permissionMiddleware("Visit Planner","View"), controller.employees);
router.get("/stores", authMiddleware, permissionMiddleware("Visit Planner","View"), controller.stores);

router.get("/visit-plans", authMiddleware, permissionMiddleware("Visit Planner","View"), controller.getVisitPlans);
router.get("/visit-plans/export", authMiddleware, permissionMiddleware("Visit Planner","View"), controller.exportVisitPlans);
router.post("/visit-plans", authMiddleware, permissionMiddleware("Visit Planner","Add"), controller.createVisitPlan);
router.post("/visit-plans/import", authMiddleware, permissionMiddleware("Visit Planner","Add"), upload.single("file"), controller.importVisitPlans);
router.put("/visit-plans/:id", authMiddleware, permissionMiddleware("Visit Planner","Edit"), controller.updateVisitPlan);
router.delete("/visit-plans/:id", authMiddleware, permissionMiddleware("Visit Planner","Full"), controller.deleteVisitPlan);
router.delete("/visit-plans", authMiddleware, permissionMiddleware("Visit Planner","Full"), controller.deleteAllVisitPlans);

router.get("/travel-plans", authMiddleware, permissionMiddleware("Travel Plan","View"), controller.getTravelPlans);
router.put("/travel-plans/:id/actual-stores", authMiddleware, permissionMiddleware("Travel Plan","Edit"), controller.saveActualStores);
router.get("/travel-plans/:id/history", authMiddleware, permissionMiddleware("Travel Plan","View"), controller.getHistory);
router.post("/travel-plans/:id/remarks", authMiddleware, permissionMiddleware("Travel Plan","Edit"), attachmentUpload.single("attachment"), controller.addRemark);
router.delete("/travel-plans/:id", authMiddleware, permissionMiddleware("Travel Plan","Full"), controller.deleteTravelPlan);

router.get("/approvals", authMiddleware, permissionMiddleware("Travel Plan Approvals","View"), controller.getApprovals);
router.post("/approvals/approve", authMiddleware, permissionMiddleware("Travel Plan Approvals","Edit"), controller.approve);
router.post("/approvals/reject", authMiddleware, permissionMiddleware("Travel Plan Approvals","Edit"), controller.reject);

router.get("/sales-review", authMiddleware, permissionMiddleware("Sales Review","View"), controller.getSalesReview);
router.get("/sales-review/export", authMiddleware, permissionMiddleware("Sales Review","View"), controller.exportSalesReview);
router.post("/sales-review/upload", authMiddleware, permissionMiddleware("Sales Review","Add"), upload.single("file"), controller.uploadSalesReview);
router.put("/sales-review/benchmarks", authMiddleware, permissionMiddleware("Sales Review","Edit"), controller.updateBenchmarks);
router.delete("/sales-review", authMiddleware, permissionMiddleware("Sales Review","Full"), controller.deleteAllSalesReview);

module.exports = router;
