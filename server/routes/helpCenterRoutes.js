const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Model = require("../models/helpCenterModel");
const C = require("../controllers/helpCenterController");

const adminOnly = (req, res, next) => {
    if (Number(req.user?.is_admin) === 1 || req.user?.is_admin === true) return next();
    return res.status(403).json({ success: false, message: "Administrator access required." });
};

// The schema is created lazily and safely at route level.
router.use(C.ensure);

// Public FAQ feed: only customer-facing published content is exposed.
router.get("/public/articles", C.publicArticles);
router.post("/public/zarvis/ask", C.publicAskZarvis);

router.use(auth);

router.get("/articles", C.articles);
router.get("/articles/:id", C.viewArticle);
router.post("/zarvis/ask", C.askZarvis);
router.post("/tickets", C.createTicket);
router.get("/tickets", C.myTickets);
router.get("/tickets/:id", C.getTicket);
router.post("/tickets/:id/reply", C.replyTicket);

router.get("/admin/articles", adminOnly, C.adminArticles);
router.post("/admin/articles", adminOnly, C.createArticle);
router.put("/admin/articles/:id", adminOnly, C.updateArticle);
router.delete("/admin/articles/:id", adminOnly, C.deleteArticle);
router.get("/admin/tickets", adminOnly, C.adminTickets);
router.put("/admin/tickets/:id", adminOnly, C.updateTicket);

module.exports = router;
