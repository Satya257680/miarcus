const express = require("express");
const router = express.Router();
const controller = require("../controllers/assetController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");
const syncGalleryAttachment = require("../middleware/galleryAttachmentSync");

const MODULE = "Asset Master";

router.use(authMiddleware);

router.get("/options", permissionMiddleware(MODULE, "View"), controller.options);

router.get("/:type/export", permissionMiddleware(MODULE, "View"), controller.exportCsv);
router.get("/:type/sample", permissionMiddleware(MODULE, "View"), controller.sample);
router.get("/:type", permissionMiddleware(MODULE, "View"), controller.list);
router.post("/:type/import", permissionMiddleware(MODULE, "Add"), upload.single("file"), controller.importCsv);
router.post("/:type", permissionMiddleware(MODULE, "Add"), upload.array("attachments", 10), syncGalleryAttachment("Asset Master", "attachments"), controller.create);
router.put("/:type/:id", permissionMiddleware(MODULE, "Edit"), upload.array("attachments", 10), syncGalleryAttachment("Asset Master", "attachments"), controller.update);
router.delete("/:type/delete-all", permissionMiddleware(MODULE, "Full"), controller.removeAll);
router.delete("/:type/:id", permissionMiddleware(MODULE, "Full"), controller.remove);

module.exports = router;
