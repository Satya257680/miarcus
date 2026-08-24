const jwt = require("jsonwebtoken");
const Model = require("../models/chatModel");
const ChatEvents = require("../services/chatEventService");
const Notification = require("../services/notificationService");

const isAdmin = (req) => Model.isAdmin(req.user);

const getScope = async (req) => {
    if (isAdmin(req)) {
        const rows = await require("../config/db").query("SELECT id FROM stores WHERE status = 'Active' ORDER BY id");
        return rows.map(row => Number(row.id));
    }
    return Model.getUserStores(req.user.id);
};

const requireStoreAccess = async (req, storeId) => {
    const scope = await getScope(req);
    const id = Number(storeId);
    if (!id || !scope.includes(id)) {
        const error = new Error("You do not have access to this store.");
        error.statusCode = 403;
        throw error;
    }
    return id;
};

const requireConversationAccess = async (req, conversationId) => {
    const conversation = await Model.getConversation(conversationId);
    if (!conversation) {
        const error = new Error("Conversation not found.");
        error.statusCode = 404;
        throw error;
    }

    if (isAdmin(req)) return conversation;

    const member = conversation.members.some(m => Number(m.id) === Number(req.user.id));
    if (!member) {
        const error = new Error("You do not have access to this conversation.");
        error.statusCode = 403;
        throw error;
    }

    if (conversation.store_id) {
        await requireStoreAccess(req, conversation.store_id);
    }

    return conversation;
};

const notifyUsers = async (userIds, data) => {
    for (const userId of [...new Set(userIds.map(Number).filter(Boolean))]) {
        try {
            await Notification.createNotification({
                user_id: userId,
                module_name: "Chat",
                action_name: data.action || "Message",
                entity_id: data.entityId || null,
                link: data.link || "/chat",
                type: data.type || "info",
                title: data.title,
                message: data.message
            });
        } catch (error) {
            console.error("Chat notification:", error.message);
        }
    }
};

exports.ensure = async (req, res, next) => {
    try {
        await Model.ensureTables();
        next();
    } catch (error) {
        next(error);
    }
};

exports.bootstrap = async (req, res) => {
    const stores = await getScope(req);
    const db = require("../config/db");

    const storeRows = stores.length
        ? await db.query(`
            SELECT id, store_name, store_code, city, state, status
            FROM stores
            WHERE id IN (${stores.map(() => "?").join(",")})
            ORDER BY store_name
        `, stores)
        : [];

    const conversations = await Model.getConversationsForUser(req.user.id, isAdmin(req));
    const managers = await Promise.all(
        storeRows.map(async store => ({
            ...store,
            manager: await Model.getStoreManager(store.id)
        }))
    );

    await Model.updatePresence(req.user.id, "online");

    res.json({
        success: true,
        user: {
            id: Number(req.user.id),
            name: req.user.name || "",
            email: req.user.email || "",
            administrator: isAdmin(req)
        },
        stores: managers,
        conversations,
        is_admin: isAdmin(req)
    });
};

exports.contacts = async (req, res) => {
    const requestedStore = Number(req.query.store_id || 0);
    const stores = await getScope(req);

    // Administrator can open "All stores" and see every active person.
    if (isAdmin(req) && !requestedStore) {
        return res.json({
            success: true,
            store_id: null,
            contacts: await Model.getAllActiveUsers(req.user.id),
            manager: null
        });
    }

    const storeId = requestedStore || stores[0];

    if (!storeId) {
        return res.json({ success: true, contacts: [], stores: [] });
    }

    await requireStoreAccess(req, storeId);

    const contacts = await Model.getUsersForStore(
        storeId,
        isAdmin(req) ? null : req.user.id
    );

    const manager = await Model.getStoreManager(storeId);

    res.json({
        success: true,
        store_id: storeId,
        contacts,
        manager
    });
};

exports.createDirect = async (req, res) => {
    const targetUserId = Number(req.body.user_id);
    if (!targetUserId) {
        return res.status(400).json({ success: false, message: "User is required." });
    }

    const target = await Model.getUserById(targetUserId);
    if (!target || target.status !== "Active") {
        return res.status(404).json({ success: false, message: "User not found or inactive." });
    }

    let storeId = Number(req.body.store_id || 0);
    const sharedStores = await Model.userSharesStore(
        req.user.id,
        targetUserId,
        storeId || null
    );

    if (isAdmin(req)) {
        const stores = await getScope(req);

        if (!storeId) {
            const targetStores = await Model.getUserStores(targetUserId);
            storeId = targetStores[0] || stores[0] || null;
        }

        if (storeId) await requireStoreAccess(req, storeId);
    } else {
        const myStores = await Model.getUserStores(req.user.id);

        // Employees/managers can always reach an administrator, but the
        // conversation is still anchored to one of their own stores.
        const targetIsAdmin =
            target.is_admin === 1 ||
            target.is_admin === true ||
            target.is_admin === "1";

        if (targetIsAdmin) {
            if (!storeId) storeId = myStores[0] || null;
            await requireStoreAccess(req, storeId);
        } else {
            if (!sharedStores.length) {
                return res.status(403).json({
                    success: false,
                    message: "You can only chat with people from your assigned store."
                });
            }

            if (!storeId) storeId = sharedStores[0];

            if (!sharedStores.includes(storeId)) {
                return res.status(403).json({
                    success: false,
                    message: "This user does not belong to your selected store."
                });
            }
        }
    }

    if (!storeId) {
        return res.status(400).json({ success: false, message: "A store is required for this conversation." });
    }

    let conversation = await Model.findDirectConversation(req.user.id, targetUserId, storeId);
    let conversationId = conversation?.id;

    if (!conversationId) {
        conversationId = await Model.createConversation({
            type: "direct",
            storeId,
            createdBy: req.user.id,
            memberIds: [req.user.id, targetUserId]
        });
    }

    res.json({
        success: true,
        conversation: await Model.getConversation(conversationId)
    });
};

exports.createGroup = async (req, res) => {
    const storeId = await requireStoreAccess(req, req.body.store_id);
    const memberIds = [...new Set([
        req.user.id,
        ...(Array.isArray(req.body.user_ids) ? req.body.user_ids : [])
    ].map(Number).filter(Boolean))];

    if (memberIds.length < 2) {
        return res.status(400).json({ success: false, message: "Select at least one other person." });
    }

    const eligible = await Model.getUsersForStore(storeId, null);
    const eligibleIds = new Set(eligible.map(u => Number(u.id)));
    if (isAdmin(req)) eligibleIds.add(Number(req.user.id));

    if (memberIds.some(id => id !== Number(req.user.id) && !eligibleIds.has(id))) {
        return res.status(403).json({ success: false, message: "Every group member must belong to the selected store." });
    }

    const title = String(req.body.title || "Store Group").trim().slice(0, 255);
    const conversationId = await Model.createConversation({
        type: "group",
        storeId,
        title: title || "Store Group",
        createdBy: req.user.id,
        memberIds
    });

    const conversation = await Model.getConversation(conversationId);
    ChatEvents.emitToUsers(memberIds, "conversation", { conversation });

    res.status(201).json({ success: true, conversation });
};

exports.listConversations = async (req, res) => {
    const storeId = Number(req.query.store_id || 0);
    if (storeId) await requireStoreAccess(req, storeId);

    const rows = await Model.getConversationsForUser(
        req.user.id,
        isAdmin(req),
        storeId || null
    );

    res.json({ success: true, conversations: rows });
};

exports.messages = async (req, res) => {
    await requireConversationAccess(req, req.params.id);
    const messages = await Model.getMessages(
        req.params.id,
        req.query.limit,
        req.query.before,
        req.user.id
    );
    res.json({ success: true, messages });
};

exports.sendMessage = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.params.id);

    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentMime = null;
    let messageType = String(req.body.message_type || "text");

    if (req.file) {
        const publicBase =
            process.env.BACKEND_URL ||
            `${req.protocol}://${req.get("host")}`;

        attachmentUrl =
            `${publicBase.replace(/\/+$/, "")}/uploads/${req.file.filename}`;

        attachmentName = req.file.originalname;
        attachmentMime = req.file.mimetype;

        if (req.file.mimetype.startsWith("image/")) messageType = "image";
        else if (req.file.mimetype.startsWith("video/")) messageType = "video";
        else if (req.file.mimetype.startsWith("audio/")) messageType = "audio";
        else messageType = "file";
    }

    const text = String(req.body.message || "").trim();

    if (!text && !req.file) {
        return res.status(400).json({ success: false, message: "Write a message or attach a file." });
    }

    const settings = await Model.getConversationSettings(
        req.params.id,
        req.user.id
    );
    const disappearingSeconds = Number(settings.disappearing_seconds || 0);
    const expiresAt = disappearingSeconds
        ? new Date(Date.now() + disappearingSeconds * 1000)
        : null;

    const message = await Model.createMessage({
        conversationId: req.params.id,
        senderId: req.user.id,
        messageType,
        messageText: text,
        attachmentUrl,
        attachmentName,
        attachmentMime,
        replyToId: req.body.reply_to_id || null,
        expiresAt
    });

    const memberIds = await Model.getConversationMemberIds(req.params.id);
    const recipients = memberIds.filter(id => Number(id) !== Number(req.user.id));

    const actorName = req.user.name || "A team member";
    const preview = text || `${messageType} attachment`;
    const event = {
        conversation_id: Number(req.params.id),
        message
    };

    ChatEvents.emitToUsers(memberIds, "message", event);

    await notifyUsers(recipients, {
        title: `${actorName} sent you a message`,
        message: preview.slice(0, 180),
        entityId: message.id,
        link: `/chat?conversation=${conversation.id}`,
        action: "Message"
    });

    res.status(201).json({ success: true, message });
};

exports.editMessage = async (req, res) => {
    const message = await Model.updateMessage(
        req.params.id,
        req.user.id,
        String(req.body.message || "").trim()
    );

    if (!message) {
        return res.status(404).json({ success: false, message: "Message not found or cannot be edited." });
    }

    const conversationId = await getConversationIdFromMessage(req.params.id);
    const members = await Model.getConversationMemberIds(conversationId);
    ChatEvents.emitToUsers(members, "message_updated", { message });

    res.json({ success: true, message });
};

const getConversationIdFromMessage = async (messageId) => {
    const db = require("../config/db");
    const rows = await db.query(
        "SELECT conversation_id FROM chat_messages WHERE id = ? LIMIT 1",
        [messageId]
    );
    return rows[0]?.conversation_id;
};

exports.deleteMessage = async (req, res) => {
    const conversationId = await getConversationIdFromMessage(req.params.id);
    if (!conversationId) {
        return res.status(404).json({ success: false, message: "Message not found." });
    }

    await requireConversationAccess(req, conversationId);

    const scope = String(req.body?.scope || req.query?.scope || "everyone").toLowerCase();
    if (!["me", "everyone"].includes(scope)) {
        return res.status(400).json({ success: false, message: "Invalid delete option." });
    }

    if (scope === "me") {
        await Model.deleteMessageForMe(req.params.id, req.user.id);
        ChatEvents.emitToUser(req.user.id, "message_deleted_for_me", {
            conversation_id: Number(conversationId),
            message_id: Number(req.params.id)
        });
        return res.json({ success: true, scope: "me" });
    }

    const deleted = await Model.deleteMessageForEveryone(req.params.id, req.user.id);
    if (!deleted) {
        return res.status(403).json({
            success: false,
            message: "Only the message sender can delete this message for everyone."
        });
    }

    const members = await Model.getConversationMemberIds(conversationId);
    ChatEvents.emitToUsers(members, "message_updated", {
        conversation_id: Number(conversationId),
        message: {
            id: Number(req.params.id),
            message_type: "deleted",
            message_text: null,
            attachment_url: null,
            attachment_name: null,
            attachment_mime: null,
            deleted_at: new Date().toISOString()
        }
    });

    res.json({ success: true, scope: "everyone" });
};

exports.deleteConversation = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.params.id);
    const scope = String(req.body?.scope || req.query?.scope || "me").toLowerCase();

    if (!["me", "everyone"].includes(scope)) {
        return res.status(400).json({ success: false, message: "Invalid delete option." });
    }

    const members = await Model.getConversationMemberIds(conversation.id);

    if (scope === "me") {
        await Model.hideConversationForMe(conversation.id, req.user.id);
        ChatEvents.emitToUser(req.user.id, "conversation_deleted", {
            conversation_id: Number(conversation.id),
            scope: "me"
        });
        return res.json({ success: true, scope: "me" });
    }

    const canDeleteForEveryone =
        isAdmin(req) ||
        Number(conversation.created_by) === Number(req.user.id);

    if (!canDeleteForEveryone) {
        return res.status(403).json({
            success: false,
            message: "Only the conversation creator or an administrator can delete this chat for everyone."
        });
    }

    await Model.deleteConversationForEveryone(conversation.id);
    ChatEvents.emitToUsers(members, "conversation_deleted", {
        conversation_id: Number(conversation.id),
        scope: "everyone"
    });

    res.json({ success: true, scope: "everyone" });
};

exports.clearConversation = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.params.id);
    await Model.clearConversationForMe(conversation.id, req.user.id);
    ChatEvents.emitToUser(req.user.id, "conversation_cleared", {
        conversation_id: Number(conversation.id)
    });
    res.json({ success: true });
};

exports.getConversationSettings = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.params.id);
    const settings = await Model.getConversationSettings(conversation.id, req.user.id);
    res.json({ success: true, settings });
};

exports.updateConversationSettings = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.params.id);

    const payload = {};
    if (req.body.disappearing_seconds !== undefined) {
        payload.disappearingSeconds = Number(req.body.disappearing_seconds);
    }
    if (req.body.muted !== undefined) {
        payload.muted = Boolean(req.body.muted);
    }

    const settings = await Model.updateConversationSettings(
        conversation.id,
        req.user.id,
        payload
    );

    ChatEvents.emitToUsers(
        await Model.getConversationMemberIds(conversation.id),
        "conversation_settings_updated",
        {
            conversation_id: Number(conversation.id),
            disappearing_seconds: Number(settings.disappearing_seconds || 0)
        }
    );

    res.json({ success: true, settings });
};

exports.starMessage = async (req, res) => {
    const conversationId = await getConversationIdFromMessage(req.params.id);
    if (!conversationId) {
        return res.status(404).json({ success: false, message: "Message not found." });
    }

    await requireConversationAccess(req, conversationId);
    await Model.toggleMessageStar(req.params.id, req.user.id);

    const messages = await Model.getMessages(
        conversationId,
        200,
        null,
        req.user.id
    );
    const message = messages.find(item => Number(item.id) === Number(req.params.id));

    ChatEvents.emitToUser(req.user.id, "message_star_updated", {
        conversation_id: Number(conversationId),
        message
    });

    res.json({ success: true, message });
};

exports.starredMessages = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.params.id);
    const messages = await Model.getStarredMessages(conversation.id, req.user.id);
    res.json({ success: true, messages });
};

exports.mediaMessages = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.params.id);
    const messages = await Model.getMediaMessages(conversation.id, req.user.id);
    res.json({ success: true, messages });
};

exports.react = async (req, res) => {
    const conversationId = await getConversationIdFromMessage(req.params.id);
    if (!conversationId) {
        return res.status(404).json({ success: false, message: "Message not found." });
    }

    await requireConversationAccess(req, conversationId);

    const reaction = String(req.body.reaction || "").trim();
    if (!["👍", "❤️", "😂", "😮", "😢", "👏"].includes(reaction)) {
        return res.status(400).json({ success: false, message: "Unsupported reaction." });
    }

    await Model.toggleReaction(req.params.id, req.user.id, reaction);
    const messages = await Model.getMessages(conversationId, 200, null, req.user.id);
    const message = messages.find(item => Number(item.id) === Number(req.params.id));

    ChatEvents.emitToUsers(
        await Model.getConversationMemberIds(conversationId),
        "message_updated",
        { message }
    );

    res.json({ success: true, message });
};

exports.read = async (req, res) => {
    await requireConversationAccess(req, req.params.id);
    await Model.markRead(req.params.id, req.user.id, req.body.message_id || null);
    ChatEvents.emitToUsers(await Model.getConversationMemberIds(req.params.id), "read", {
        conversation_id: Number(req.params.id),
        message_id: Number(req.body.message_id || 0),
        reader_id: Number(req.user.id)
    });
    res.json({ success: true });
};

exports.presence = async (req, res) => {
    const status = String(req.body.status || "online");
    await Model.updatePresence(req.user.id, status);
    res.json({ success: true });
};

exports.stream = async (req, res) => {
    const token = String(req.query.token || "");
    if (!token) return res.status(401).end();

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || "miarcus_secret_key");
    } catch {
        return res.status(401).end();
    }

    if (!decoded?.id) return res.status(401).end();

    const rows = await require("../config/db").query(
        "SELECT id, status FROM users WHERE id = ? LIMIT 1",
        [decoded.id]
    );
    if (!rows.length || rows[0].status !== "Active") return res.status(401).end();

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const remove = ChatEvents.addClient(decoded.id, res);
    res.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

    const heartbeat = setInterval(() => {
        try {
            res.write(`event: heartbeat\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);
        } catch {
            clearInterval(heartbeat);
            remove();
        }
    }, 20000);

    req.on("close", () => {
        clearInterval(heartbeat);
        remove();
    });
};

exports.startCall = async (req, res) => {
    const conversation = await requireConversationAccess(req, req.body.conversation_id);
    const calleeId = Number(req.body.callee_id);

    if (!calleeId || calleeId === Number(req.user.id)) {
        return res.status(400).json({ success: false, message: "A valid call recipient is required." });
    }

    if (!conversation.members.some(m => Number(m.id) === calleeId)) {
        return res.status(403).json({ success: false, message: "This person is not in the conversation." });
    }

    const callType = ["audio", "video"].includes(req.body.call_type) ? req.body.call_type : "audio";
    const call = await Model.createCall({
        conversationId: conversation.id,
        storeId: conversation.store_id || null,
        callerId: req.user.id,
        calleeId,
        callType
    });

    ChatEvents.emitToUser(calleeId, "incoming_call", { call, conversation });
    await notifyUsers([calleeId], {
        title: `${req.user.name || "Someone"} is calling`,
        message: `${callType === "video" ? "Video" : "Voice"} call`,
        entityId: call.id,
        link: `/chat?conversation=${conversation.id}`,
        action: "Call"
    });

    res.status(201).json({ success: true, call });
};

exports.callSignal = async (req, res) => {
    const call = await Model.getCall(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: "Call not found." });

    if (![Number(call.caller_id), Number(call.callee_id)].includes(Number(req.user.id))) {
        return res.status(403).json({ success: false, message: "You are not part of this call." });
    }

    const signalType = String(req.body.signal_type || "");
    if (!["offer", "answer", "ice-candidate"].includes(signalType)) {
        return res.status(400).json({ success: false, message: "Invalid call signal." });
    }

    const signal = await Model.addSignal({
        callId: call.id,
        senderId: req.user.id,
        signalType,
        payload: req.body.payload || {}
    });

    const recipient = Number(call.caller_id) === Number(req.user.id)
        ? Number(call.callee_id)
        : Number(call.caller_id);

    ChatEvents.emitToUser(recipient, "call_signal", signal);

    res.status(201).json({ success: true, signal });
};

exports.callSignals = async (req, res) => {
    const call = await Model.getCall(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: "Call not found." });

    if (![Number(call.caller_id), Number(call.callee_id)].includes(Number(req.user.id))) {
        return res.status(403).json({ success: false, message: "You are not part of this call." });
    }

    res.json({
        success: true,
        signals: await Model.getSignals(req.params.id, req.user.id, req.query.after || 0)
    });
};

exports.updateCall = async (req, res) => {
    const call = await Model.getCall(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: "Call not found." });

    if (![Number(call.caller_id), Number(call.callee_id)].includes(Number(req.user.id))) {
        return res.status(403).json({ success: false, message: "You are not part of this call." });
    }

    const status = String(req.body.status || "ended");
    const updated = await Model.updateCall(call.id, status);
    const recipient = Number(call.caller_id) === Number(req.user.id)
        ? Number(call.callee_id)
        : Number(call.caller_id);

    ChatEvents.emitToUser(recipient, "call_status", { call: updated });
    res.json({ success: true, call: updated });
};

exports.callHistory = async (req, res) => {
    const storeId = Number(req.query.store_id || 0) || null;
    if (storeId) await requireStoreAccess(req, storeId);

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    const calls = await Model.getCallHistory(
        req.user.id,
        isAdmin(req),
        storeId,
        limit
    );

    res.json({ success: true, calls });
};

exports.adminOverview = async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ success: false, message: "Administrator access required." });
    }

    res.json({
        success: true,
        stores: await Model.getAdminStoreOverview()
    });
};

exports.assignManager = async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ success: false, message: "Administrator access required." });
    }

    const storeId = Number(req.params.storeId);
    const userId = Number(req.body.user_id || 0) || null;
    const manager = await Model.assignStoreManager(storeId, userId, req.user.id);

    res.json({ success: true, manager });
};
