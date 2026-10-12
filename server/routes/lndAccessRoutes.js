const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const lndOwnerOnly = require("../middleware/lndOwnerOnly");
const {
    listUsers,
    setUserAccess,
    listAudit,
} = require("../controllers/lndAccessController");

// Every route: signed in AND the L&D owner (admins are not enough).
router.use(authMiddleware, lndOwnerOnly);

router.get("/users", listUsers);
router.put("/users/:id", setUserAccess);
router.get("/audit", listAudit);

module.exports = router;
