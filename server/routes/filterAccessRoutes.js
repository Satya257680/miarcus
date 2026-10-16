const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const pettyCashPermission = require("../middleware/pettyCashPermissionMiddleware");
const { attachFilterScope } = require("../middleware/filterAccessMiddleware");
const { MODULES } = require("../utils/filterAccess");
const controller = require("../controllers/filterAccessController");

// ======================================================
// READ-ONLY FILTER OPTIONS
// GET /api/filter-access/options?module=Action Points
//
// Requires View on the requested module (existing RBAC) and nothing
// else: a user does not need Departments / Store Management / Checklist
// Types permissions to use those filters inside a module they may open.
// ======================================================
router.get(
    "/options",
    authMiddleware,
    (req, res, next) => {
        const moduleName = String(req.query.module || "").trim();
        if (!MODULES[moduleName]) {
            return res.status(400).json({ success: false, message: "Filter options are not available for this module." });
        }
        req.filterModule = moduleName;
        const def = MODULES[moduleName];
        // Same permission the module's own list endpoint requires.
        if (def.guard === "pettyCash") return pettyCashPermission("View")(req, res, next);
        const [rbacModule, level] = def.rbac || [moduleName, "View"];
        return permissionMiddleware(rbacModule, level)(req, res, next);
    },
    (req, res, next) => attachFilterScope(req.filterModule)(req, res, next),
    controller.getOptions
);

// ======================================================
// ADMIN CONFIGURATION (administrator check inside the controller)
// ======================================================
router.get("/catalog", authMiddleware, controller.getCatalog);
router.get("/users", authMiddleware, controller.listUsers);
router.get("/users/:id", authMiddleware, controller.getUser);
router.put("/users/:id/modules/:module", authMiddleware, controller.saveModule);
router.delete("/users/:id/modules/:module", authMiddleware, controller.resetModule);
router.delete("/users/:id", authMiddleware, controller.resetUser);
router.post("/bulk/preview", authMiddleware, controller.bulkPreview);
router.post("/bulk/apply", authMiddleware, controller.bulkApply);

module.exports = router;
