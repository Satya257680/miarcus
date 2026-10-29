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

module.exports = router;
