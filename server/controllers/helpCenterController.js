const Model = require("../models/helpCenterModel");
const db = require("../config/db");
const Notification = require("../services/notificationService");
const { searchProjectKnowledge } = require("../services/zarvisProjectKnowledge");
const { askGeneralZarvis } = require("../services/zarvisAiService");

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

const resolveZarvis = async ({ question, audience, history = [], language = "auto" }) => {
    const safeHistory = Array.isArray(history)
        ? history.slice(-8).filter((item) => item && typeof item === "object")
        : [];

    const lastResolved = [...safeHistory]
        .reverse()
        .find((item) => item.from === "zarvis" && item.resolved !== false);

    const shortFollowUp =
        question.trim().split(/\s+/).length <= 10 ||
        /^(explain|more|details|that|this|how do i do that|how can i do that|why|what about|tell me more|and then|what does that mean|translate|in hindi|in odia|in punjabi|in tamil|in kannada|in marathi)/i.test(question.trim());

    const context = {
        isFollowUp: Boolean(shortFollowUp && lastResolved),
        lastModule: lastResolved?.module || "",
    };

    const contextQuestion =
        context.isFollowUp
            ? `${question} ${context.lastModule || ""}`.trim()
            : question;

    const results = await Model.searchArticles(contextQuestion, audience);
    const ranked = rankArticles(results, question);
    const bestArticle = ranked[0];
    const verified =
        bestArticle && bestArticle.confidence >= 38
            ? bestArticle
            : null;

    const project = searchProjectKnowledge(
        contextQuestion,
        audience,
        context
    );

    // Avoid letting a generic word such as "history", "location" or "report"
    // accidentally route a general-knowledge question into Miarcus product
    // knowledge. Explicit Miarcus/module terms or a conversational follow-up
    // are enough to make the project context relevant.
    const projectHint = /\b(miarcus|nso|new store|action point|checklist|billing|daily collection|petty cash|expense|attendance|employee location|gallery|asset master|inventory|listing|collection tracking|quiz|training|sales review|visit planner|travel plan|announcement|dashboard|team chat|chat|settings|profile|users|department|designation|store management|help center|zarvis|project structure|project architecture|module|workflow|route|api|frontend|backend|server|database)\b/i.test(contextQuestion);
    const projectRelevant = Boolean(
        context.isFollowUp ||
        projectHint ||
        (project.resolved && Number(project.confidence || 0) >= 92)
    );
    const groundedProject = projectRelevant ? project : { resolved: false, matches: [] };

    // Simple conversation should stay fast and natural.
    if (project.resolved && project.source === "conversation") {
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

    // Use Gemini to turn approved/project knowledge into a detailed,
    // multilingual answer and to handle general knowledge/coding questions.
    const ai = await askGeneralZarvis({
        question: contextQuestion,
        language,
        audience,
        history: safeHistory,
        project: groundedProject.resolved
            ? groundedProject
            : {
                matches: groundedProject.matches || [],
                module: context.lastModule || "",
            },
        verified,
    });

    if (ai.success) {
        if (verified) await Model.incrementArticleViews(verified.id);

        return {
            success: true,
            resolved: true,
            source: verified
                ? "knowledge_base_ai"
                : groundedProject.resolved
                    ? "project_ai"
                    : "general_ai",
            confidence: verified
                ? Math.max(82, Math.min(99, Number(verified.confidence) || 90))
                : groundedProject.resolved
                    ? Math.max(78, Math.min(96, Number(groundedProject.confidence) || 84))
                    : 84,
            module: groundedProject.module || verified?.category || "General Knowledge",
            related: [
                ...(ranked || []).slice(0, 3),
                ...(groundedProject.matches || []).slice(0, 2),
            ].slice(0, 4),
            message: ai.text,
        };
    }

    // Deterministic project knowledge remains available if AI is temporarily
    // unavailable. This keeps Miarcus help useful even during an AI outage.
    if (verified) {
        await Model.incrementArticleViews(verified.id);
        return {
            success: true,
            resolved: true,
            source: "knowledge_base",
            confidence: verified.confidence,
            article: verified,
            related: ranked.slice(1, 4),
            message: verified.answer,
        };
    }

    if (groundedProject.resolved) {
        return {
            success: true,
            resolved: true,
            source: groundedProject.source,
            confidence: groundedProject.confidence,
            module: groundedProject.module,
            related: groundedProject.matches || [],
            message: groundedProject.answer,
        };
    }

    return {
        success: true,
        resolved: false,
        source: "zarvis",
        confidence: 0,
        related: [
            ...ranked.slice(0, 3),
            ...(groundedProject.matches || []).slice(0, 2),
        ].slice(0, 4),
        message: audience === "customer"
            ? "I could not confidently answer that right now. Please try another wording or contact Miarcus support."
            : "I could not confidently answer that right now. Please try another wording or use Human Support.",
        aiUnavailable: true,
    };
};

exports.publicAskZarvis = async (req, res, next) => {
    try {
        const question = clean(req.body?.question, 2000);
        if (!question) return res.status(400).json({ success: false, message: "Please enter your question." });
        res.json(await resolveZarvis({ question, audience: "customer", history: req.body?.history, language: clean(req.body?.language, 40) || "auto" }));
    } catch (error) { next(error); }
};

exports.askZarvis = async (req, res, next) => {
    try {
        const question = clean(req.body?.question, 2000);
        if (!question) return res.status(400).json({ success: false, message: "Please enter your question." });
        res.json(await resolveZarvis({ question, audience: "employee", history: req.body?.history, language: clean(req.body?.language, 40) || "auto" }));
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
