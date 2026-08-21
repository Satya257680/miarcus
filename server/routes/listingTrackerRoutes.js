const express = require("express");

const router = express.Router();

const controller = require("../controllers/listingTrackerController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const csvUpload = require("../middleware/csvUpload");

const MODULE = "Listing Tracker";

// Every Listing Tracker API is authenticated.
// Permission levels:
// View  -> list/summary/export
// Add   -> create/import
// Edit  -> update
// Full  -> delete/delete all
router.use(authMiddleware);

router.get(
    "/summary",
    permissionMiddleware(MODULE, "View"),
    controller.summary
);

router.get(
    "/export",
    permissionMiddleware(MODULE, "View"),
    controller.exportCsv
);

router.get(
    "/",
    permissionMiddleware(MODULE, "View"),
    controller.list
);

router.post(
    "/",
    permissionMiddleware(MODULE, "Add"),
    controller.create
);

router.post(
    "/import",
    permissionMiddleware(MODULE, "Add"),
    csvUpload.single("file"),
    controller.importCsv
);

router.put(
    "/:id",
    permissionMiddleware(MODULE, "Edit"),
    controller.update
);

router.delete(
    "/:id",
    permissionMiddleware(MODULE, "Full"),
    controller.remove
);

router.delete(
    "/",
    permissionMiddleware(MODULE, "Full"),
    controller.removeAll
);

module.exports = router;
