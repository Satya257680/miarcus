const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { requireNaRegister } = require("../utils/naRegisterAccess");
const controller = require("../controllers/naRegisterController");

// /api/na-register
// Administrators and users with full store access can view it by
// default; everyone else needs "N/A Register" granted in Users → Access.
router.get("/", authMiddleware, requireNaRegister("View"), controller.list);
router.get("/filters", authMiddleware, requireNaRegister("View"), controller.filters);
router.get("/export", authMiddleware, requireNaRegister("View"), controller.exportAll);

// View / Edit / Delete (same levels as Action Points: Edit → edit,
// Full → delete one / Delete All).
router.delete("/", authMiddleware, requireNaRegister("Full"), controller.removeAll);
router.get("/:id", authMiddleware, requireNaRegister("View"), controller.getOne);
router.put("/:id", authMiddleware, requireNaRegister("Edit"), controller.update);
router.delete("/:id", authMiddleware, requireNaRegister("Full"), controller.remove);

module.exports = router;
