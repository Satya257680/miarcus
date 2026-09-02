const Model = require("../models/helpCenterModel");
const db = require("../config/db");
const Notification = require("../services/notificationService");
const { searchProjectKnowledge } = require("../services/zarvisProjectKnowledge");

const isAdmin = (req) => Number(req.user?.is_admin) === 1 || req.user?.is_admin === true;
const clean = (value, max = 10000) => String(value ?? "").trim().slice(0, max);
const validAudience = (v) => ["employee", "customer", "both"].includes(v) ? v : "both";
const validStatus = (v) => ["draft", "published", "archived"].includes(v) ? v : "published";

const validateArticle = (body) => {
    const title = clean(body.title, 255);
    const question = clean(body.question, 2000);
    const answer = clean(body.answer, 30000);
    if (!title || !question || !answer) return { error: "Title, question and answer are required." };
    return {
        title,
        question,
        answer,
        category: clean(body.category || "General", 100) || "General",
        keywords: clean(body.keywords, 1000),
        audience: validAudience(body.audience),
        status: validStatus(body.status),
        sort_order: Math.max(0, Math.min(99999, Number(body.sort_order) || 0)),
    };
};

exports.ensure = async (req, res, next) => {
    try { await Model.ensureTables(); next(); } catch (error) { next(error); }
};

exports.publicArticles = async (req, res, next) => {
    try {
        res.json({ success: true, articles: await Model.getPublishedArticles("customer") });
    } catch (error) { next(error); }
};

exports.articles = async (req, res, next) => {
    try {
        res.json({ success: true, articles: await Model.getPublishedArticles("employee") });
    } catch (error) { next(error); }
};

exports.adminArticles = async (req, res, next) => {
    try {
        res.json({ success: true, articles: await Model.getAllArticles() });
    } catch (error) { next(error); }
};

exports.createArticle = async (req, res, next) => {
    try {
        const data = validateArticle(req.body || {});
        if (data.error) return res.status(400).json({ success: false, message: data.error });
        data.userId = Number(req.user.id);
        const article = await Model.createArticle(data);
        res.status(201).json({ success: true, article });
    } catch (error) { next(error); }
};

exports.updateArticle = async (req, res, next) => {
    try {
        const data = validateArticle(req.body || {});
        if (data.error) return res.status(400).json({ success: false, message: data.error });
        data.userId = Number(req.user.id);
        const article = await Model.updateArticle(req.params.id, data);
        if (!article) return res.status(404).json({ success: false, message: "Help article not found." });
        res.json({ success: true, article });
    } catch (error) { next(error); }
};

exports.deleteArticle = async (req, res, next) => {
    try {
        const article = await Model.getArticle(req.params.id);
        if (!article) return res.status(404).json({ success: false, message: "Help article not found." });
        await Model.deleteArticle(req.params.id);
        res.json({ success: true, message: "Help article deleted." });
    } catch (error) { next(error); }
};

exports.viewArticle = async (req, res, next) => {
    try {
        const article = await Model.getArticle(req.params.id);
        if (!article || article.status !== "published") return res.status(404).json({ success: false, message: "Help article not found." });
        await Model.incrementArticleViews(article.id);
        res.json({ success: true, article });
    } catch (error) { next(error); }
};

const normalizeWords = (text) => clean(text, 2000).toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);

const rankArticles = (results, question) => {
    const words = normalizeWords(question);
    return results.map((item) => {
        const haystack = `${item.title} ${item.question} ${item.keywords || ""} ${item.answer || ""}`.toLowerCase();
        const overlap = words.filter((word) => haystack.includes(word)).length;
        const phraseBonus = String(question || "").toLowerCase().includes(String(item.question || "").toLowerCase()) ? 10 : 0;
        return {
            ...item,
            confidence: Math.min(99, Math.round(Math.min(1, (Number(item.score || 0) + overlap * 1.5 + phraseBonus) / 12) * 100)),
        };
    }).sort((a, b) => b.confidence - a.confidence);
};

const resolveZarvis = async ({ question, audience }) => {
    const results = await Model.searchArticles(question, audience);
    const ranked = rankArticles(results, question);
    const bestArticle = ranked[0];
    if (bestArticle && bestArticle.confidence >= 38) {
        await Model.incrementArticleViews(bestArticle.id);
        return {
            success: true,
            resolved: true,
            source: "knowledge_base",
            confidence: bestArticle.confidence,
            article: bestArticle,
            related: ranked.slice(1, 4),
            message: bestArticle.answer,
        };
    }

    const project = searchProjectKnowledge(question, audience);
    if (project.resolved) {
        return {
            success: true,
            resolved: true,
            source: project.source,
            confidence: project.confidence,
            module: project.module,
            related: project.matches || [],
            message: project.answer,
        };
    }

    return {
        success: true,
        resolved: false,
        source: "zarvis",
        confidence: 0,
        related: [
            ...ranked.slice(0, 3),
            ...(project.matches || []).slice(0, 2),
        ].slice(0, 4),
        message: audience === "customer"
            ? "I could not find a verified answer for that question. Please contact Miarcus support for further assistance."
            : "I could not find a verified answer in the Help Center or the current Miarcus project knowledge. You can request human support and an administrator can reply to you here.",
    };
};

exports.publicAskZarvis = async (req, res, next) => {
    try {
        const question = clean(req.body?.question, 2000);
        if (!question) return res.status(400).json({ success: false, message: "Please enter your question." });
        res.json(await resolveZarvis({ question, audience: "customer" }));
    } catch (error) { next(error); }
};

exports.askZarvis = async (req, res, next) => {
    try {
        const question = clean(req.body?.question, 2000);
        if (!question) return res.status(400).json({ success: false, message: "Please enter your question." });
        res.json(await resolveZarvis({ question, audience: "employee" }));
    } catch (error) { next(error); }
};

exports.createTicket = async (req, res, next) => {
    try {
        const question = clean(req.body?.question, 5000);
        const subject = clean(req.body?.subject || "Help Center Support", 255) || "Help Center Support";
        const priority = ["low", "normal", "high", "urgent"].includes(req.body?.priority) ? req.body.priority : "normal";
        if (!question) return res.status(400).json({ success: false, message: "Please describe the issue." });
        const ticket = await Model.createTicket({ userId: Number(req.user.id), subject, question, priority });

        const admins = await db.query("SELECT id FROM users WHERE is_admin = 1 AND status = 'Active'");
        for (const admin of admins) {
            try {
                await Notification.createNotification({
                    user_id: Number(admin.id),
                    module_name: "Help Center",
                    action_name: "New Support Request",
                    entity_id: ticket.id,
                    link: "/help-center?tab=support",
                    type: priority === "urgent" ? "warning" : "info",
                    title: "New Help Center request",
                    message: `${req.user.name || "An employee"} requested help: ${subject}`
                });
            } catch (e) { console.error("Help notification:", e.message); }
        }
        res.status(201).json({ success: true, ticket });
    } catch (error) { next(error); }
};

exports.myTickets = async (req, res, next) => {
    try { res.json({ success: true, tickets: await Model.getTicketsForUser(req.user.id) }); }
    catch (error) { next(error); }
};

exports.getTicket = async (req, res, next) => {
    try {
        const ticket = await Model.getTicket(req.params.id, req.user.id, isAdmin(req));
        if (!ticket) return res.status(404).json({ success: false, message: "Support request not found." });
        res.json({ success: true, ticket });
    } catch (error) { next(error); }
};

exports.replyTicket = async (req, res, next) => {
    try {
        const message = clean(req.body?.message, 10000);
        if (!message) return res.status(400).json({ success: false, message: "Reply cannot be empty." });
        const ticket = await Model.getTicket(req.params.id, req.user.id, isAdmin(req));
        if (!ticket) return res.status(404).json({ success: false, message: "Support request not found." });
        const senderType = isAdmin(req) ? "admin" : "user";
        await Model.addTicketMessage(ticket.id, Number(req.user.id), senderType, message);
        if (isAdmin(req)) {
            try {
                await Notification.createNotification({
                    user_id: ticket.user_id,
                    module_name: "Help Center",
                    action_name: "Support Reply",
                    entity_id: ticket.id,
                    link: "/help-center?tab=support",
                    type: "success",
                    title: "Zarvis Support replied",
                    message: message.slice(0, 180)
                });
            } catch (e) { console.error("Help reply notification:", e.message); }
        }
        const updated = await Model.getTicket(ticket.id, req.user.id, isAdmin(req));
        res.json({ success: true, ticket: updated });
    } catch (error) { next(error); }
};

exports.adminTickets = async (req, res, next) => {
    try { res.json({ success: true, tickets: await Model.getTicketsForAdmin(req.query.status || "all") }); }
    catch (error) { next(error); }
};

exports.updateTicket = async (req, res, next) => {
    try {
        const status = ["open", "in_progress", "resolved", "closed"].includes(req.body?.status) ? req.body.status : "open";
        const priority = ["low", "normal", "high", "urgent"].includes(req.body?.priority) ? req.body.priority : "normal";
        const assignedTo = req.body?.assigned_to ? Number(req.body.assigned_to) : null;
        const ticket = await Model.updateTicket(req.params.id, { status, priority, assignedTo });
        if (!ticket) return res.status(404).json({ success: false, message: "Support request not found." });
        res.json({ success: true, ticket });
    } catch (error) { next(error); }
};
