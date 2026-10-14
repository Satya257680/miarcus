const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const { uploadMedia, uploadImage } = require("../middleware/lndUpload");
const c = require("../controllers/lndController");

const MODULE = "Learning & Development";
const need = (level) => permissionMiddleware(MODULE, level);

// Signed, expiring media URL (used by <video>/<img>/<iframe> which cannot
// send an Authorization header). Verified by HMAC inside the controller.
router.get("/media/:id/file", c.streamMedia);

router.use(authMiddleware);

// ---------- Learner (View) ----------
router.get("/overview", need("View"), c.overview);
router.get("/programs/:id", need("View"), c.programDetail);
router.get("/modules/:id", need("View"), c.moduleDetail);
router.post("/modules/:id/complete", need("View"), c.markComplete);
router.post("/modules/:id/exam/start", need("View"), c.examStart);
router.post("/exam/:attemptId/submit", need("View"), c.examSubmit);
router.get("/programs/:id/certificate", need("View"), c.certificate);
router.get("/certificates", need("View"), c.myCertificates);

// ---------- Admin ----------
router.get("/admin/programs", need("Edit"), c.adminPrograms);
router.post("/admin/programs", need("Add"), c.createProgram);
router.put("/admin/programs/:id", need("Edit"), c.updateProgram);
router.delete("/admin/programs/:id", need("Full"), c.deleteProgram);
router.put("/admin/programs/:id/assignments", need("Edit"), c.saveAssignments);
router.post("/admin/programs/:id/thumb", need("Edit"), uploadImage, c.setProgramThumb);
router.get("/admin/programs/:id", need("Edit"), c.adminProgram);

router.post("/admin/modules", need("Add"), c.createModule);
router.put("/admin/modules/reorder", need("Edit"), c.reorderModules);
router.put("/admin/modules/:id", need("Edit"), c.updateModule);
router.delete("/admin/modules/:id", need("Full"), c.deleteModule);
router.post("/admin/modules/:id/media", need("Edit"), uploadMedia, c.uploadModuleMedia);
router.get("/admin/modules/:id/questions", need("Edit"), c.getQuestions);
router.put("/admin/modules/:id/questions", need("Edit"), c.saveQuestions);
router.delete("/admin/media/:id", need("Edit"), c.deleteMedia);

router.get("/admin/lookups", need("Edit"), c.lookups);
router.get("/admin/report", need("Edit"), c.report);
router.get("/admin/report/:userId/:programId/certificate", need("Edit"), c.reportCertificate);
router.put("/admin/report/:userId/:programId", need("Edit"), c.updateReportProgress);
router.delete("/admin/report/:userId/:programId", need("Full"), c.deleteReportProgress);
router.post("/admin/seed", need("Full"), c.seed);

module.exports = router;
