import "../axiosConfig";
import axios from "axios";

const API = "/api/chat";

const authConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
    }
});

export const getChatBootstrap = () =>
    axios.get(`${API}/bootstrap`, authConfig());

export const getChatContacts = (storeId) =>
    axios.get(`${API}/contacts`, {
        ...authConfig(),
        params: storeId ? { store_id: storeId } : {}
    });

export const getChatConversations = (storeId) =>
    axios.get(`${API}/conversations`, {
        ...authConfig(),
        params: storeId ? { store_id: storeId } : {}
    });

export const getChatConversation = (id) =>
    axios.get(`${API}/conversations/${id}`, authConfig());

export const createDirectConversation = (userId, storeId) =>
    axios.post(`${API}/conversations/direct`, {
        user_id: userId,
        store_id: storeId
    }, authConfig());

export const createGroupConversation = (storeId, title, userIds) =>
    axios.post(`${API}/conversations/group`, {
        store_id: storeId,
        title,
        user_ids: userIds
    }, authConfig());

export const getChatMessages = (conversationId, params = {}) =>
    axios.get(`${API}/conversations/${conversationId}/messages`, {
        ...authConfig(),
        params
    });

export const sendChatMessage = (conversationId, payload) => {
    if (payload?.file) {
        const form = new FormData();
        form.append("message", payload.message || "");
        form.append("message_type", payload.message_type || "text");
        if (payload.reply_to_id) form.append("reply_to_id", payload.reply_to_id);
        form.append("attachment", payload.file);

        return axios.post(
            `${API}/conversations/${conversationId}/messages`,
            form,
            authConfig()
        );
    }

    return axios.post(
        `${API}/conversations/${conversationId}/messages`,
        {
            message: payload?.message || "",
            message_type: payload?.message_type || "text",
            reply_to_id: payload?.reply_to_id || null
        },
        authConfig()
    );
};

export const editChatMessage = (messageId, message) =>
    axios.put(`${API}/messages/${messageId}`, { message }, authConfig());

export const deleteChatMessage = (messageId, scope = "everyone") =>
    axios.delete(`${API}/messages/${messageId}`, {
        ...authConfig(),
        data: { scope }
    });

export const deleteChatConversation = (conversationId, scope = "me") =>
    axios.delete(`${API}/conversations/${conversationId}`, {
        ...authConfig(),
        data: { scope }
    });

export const clearChatConversation = (conversationId) =>
    axios.post(`${API}/conversations/${conversationId}/clear`, {}, authConfig());

export const reactToChatMessage = (messageId, reaction) =>
    axios.post(`${API}/messages/${messageId}/reactions`, { reaction }, authConfig());

export const markChatRead = (conversationId, messageId) =>
    axios.post(`${API}/conversations/${conversationId}/read`, {
        message_id: messageId
    }, authConfig());

export const updateChatPresence = (status = "online") =>
    axios.put(`${API}/presence`, { status }, authConfig());

export const startChatCall = (conversationId, calleeId, callType) =>
    axios.post(`${API}/calls`, {
        conversation_id: conversationId,
        callee_id: calleeId,
        call_type: callType
    }, authConfig());

export const sendCallSignal = (callId, signalType, payload) =>
    axios.post(`${API}/calls/${callId}/signals`, {
        signal_type: signalType,
        payload
    }, authConfig());

export const getCallSignals = (callId, after = 0) =>
    axios.get(`${API}/calls/${callId}/signals`, {
        ...authConfig(),
        params: { after }
    });

export const updateChatCall = (callId, status) =>
    axios.put(`${API}/calls/${callId}`, { status }, authConfig());

export const getChatCallHistory = (params = {}) =>
    axios.get(`${API}/calls/history`, {
        ...authConfig(),
        params
    });

export const getChatAdminOverview = () =>
    axios.get(`${API}/admin/overview`, authConfig());

export const assignChatStoreManager = (storeId, userId) =>
    axios.put(`${API}/admin/stores/${storeId}/manager`, {
        user_id: userId || null
    }, authConfig());

export const openChatEventStream = (handlers = {}) => {
    const token = localStorage.getItem("token");
    if (!token) return () => {};

    const base = (
        axios.defaults.baseURL ||
        import.meta.env.VITE_API_URL ||
        "https://miarcus-backend.onrender.com"
    ).replace(/\/+$/, "");

    const source = new EventSource(
        `${base}${API}/events?token=${encodeURIComponent(token)}`
    );

    const eventNames = [
        "message",
        "message_updated",
        "message_deleted_for_me",
        "conversation",
        "conversation_deleted",
        "conversation_cleared",
        "incoming_call",
        "call_signal",
        "call_status",
        "read"
    ];

    eventNames.forEach((eventName) => {
        source.addEventListener(eventName, (event) => {
            try {
                handlers[eventName]?.(JSON.parse(event.data));
            } catch (error) {
                console.error(`Chat event parse failed: ${eventName}`, error);
            }
        });
    });

    source.onerror = () => {
        handlers.error?.();
    };

    return () => {
        source.close();
    };
};
