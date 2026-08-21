const express = require("express");
const router = express.Router();
const controller = require("../controllers/assetController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");

const MODULE = "Asset Master";

router.use(authMiddleware);

router.get("/options", permissionMiddleware(MODULE, "View"), controller.options);

router.get("/:type/export", permissionMiddleware(MODULE, "View"), controller.exportCsv);
router.get("/:type", permissionMiddleware(MODULE, "View"), controller.list);
router.post("/:type/import", permissionMiddleware(MODULE, "Add"), upload.single("file"), controller.importCsv);
router.post("/:type", permissionMiddleware(MODULE, "Add"), upload.array("attachments", 10), controller.create);
router.put("/:type/:id", permissionMiddleware(MODULE, "Edit"), upload.array("attachments", 10), controller.update);
router.delete("/:type/:id", permissionMiddleware(MODULE, "Full"), controller.remove);

module.exports = router;
