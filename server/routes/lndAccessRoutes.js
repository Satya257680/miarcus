const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const lndOwnerOnly = require("../middleware/lndOwnerOnly");
const {
    listUsers,
    setUserAccess,
    bulkSetAccess,
    setMode,
    listAudit,
} = require("../controllers/lndAccessController");

// Every route: signed in AND the L&D owner (admins are not enough).
router.use(authMiddleware, lndOwnerOnly);

router.get("/users", listUsers);
router.put("/users", bulkSetAccess);      // bulk grant / remove for selected users
router.put("/users/:id", setUserAccess);
router.put("/mode", setMode);             // Everyone / No one / Specific users
router.get("/audit", listAudit);

module.exports = router;
