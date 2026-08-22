import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    FaComments,
    FaSearch,
    FaPaperPlane,
    FaPaperclip,
    FaPhone,
    FaVideo,
    FaMicrophone,
    FaMicrophoneSlash,
    FaVideoSlash,
    FaTimes,
    FaCheck,
    FaUserPlus,
    FaUsers,
    FaStore,
    FaSmile,
    FaReply,
    FaTrash,
    FaEdit,
    FaUserShield,
    FaChevronRight
} from "react-icons/fa";

import {
    getChatBootstrap,
    getChatContacts,
    getChatConversations,
    getChatMessages,
    createDirectConversation,
    createGroupConversation,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
    reactToChatMessage,
    markChatRead,
    updateChatPresence,
    startChatCall,
    sendCallSignal,
    getCallSignals,
    updateChatCall,
    getChatAdminOverview,
    assignChatStoreManager,
    openChatEventStream
} from "../../services/chatService";

import "../../styles/pages/Chat.css";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

const safeUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
};

const isAdminUser = (user) =>
    user?.administrator === true ||
    user?.administrator === 1 ||
    user?.administrator === "1" ||
    user?.is_admin === true ||
    user?.is_admin === 1 ||
    user?.is_admin === "1";

const uniqueById = (items) => {
    const map = new Map();
    items.forEach(item => {
        if (item?.id != null) map.set(Number(item.id), item);
    });
    return [...map.values()];
};

function initials(name = "") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase() || "?";
}

function formatTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatLastSeen(value) {
    if (!value) return "Offline";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Offline";
    return `Last seen ${date.toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    })}`;
}

function Chat() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentUser = useMemo(() => safeUser(), []);
    const admin = isAdminUser(currentUser);

    let storedPermissions = {};
    try {
        storedPermissions = JSON.parse(
            localStorage.getItem("permissions") || "{}"
        );
    } catch {
        storedPermissions = {};
    }

    const chatPermission =
        storedPermissions?.Chat || "None";

    const permissionRank = {
        None: 0,
        View: 1,
        Add: 2,
        Edit: 3,
        Full: 4
    };

    const chatRank =
        admin
            ? 4
            : (permissionRank[chatPermission] || 0);

    const canAdd = chatRank >= 2;
    const canEdit = chatRank >= 3;
    const canDelete = chatRank >= 4;

    const [stores, setStores] = useState([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [contacts, setContacts] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState("");
    const [showContacts, setShowContacts] = useState(false);
    const [showGroup, setShowGroup] = useState(false);
    const [groupTitle, setGroupTitle] = useState("");
    const [groupMembers, setGroupMembers] = useState([]);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [adminStores, setAdminStores] = useState([]);
    const [callState, setCallState] = useState(null);
    const [callError, setCallError] = useState("");
    const [micMuted, setMicMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);

    const bottomRef = useRef(null);
    const eventCleanupRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const activeCallRef = useRef(null);
    const pendingSignalsRef = useRef([]);
    const pendingIceRef = useRef([]);
    const remoteDescriptionSetRef = useRef(false);
    const signalCursorRef = useRef(0);
    const signalPollRef = useRef(null);

    const selectedConversationId =
        selectedConversation?.id
            ? Number(selectedConversation.id)
            : Number(searchParams.get("conversation") || 0);

    const selectedStore =
        stores.find(store => Number(store.id) === Number(selectedStoreId)) ||
        stores[0] ||
        null;

    const selectedOtherMember =
        selectedConversation?.conversation_type === "direct"
            ? selectedConversation.members?.find(
                member => Number(member.id) !== Number(currentUser.id)
            )
            : null;

    const conversationTitle = selectedConversation
        ? selectedConversation.conversation_type === "group"
            ? selectedConversation.title || "Store Group"
            : selectedOtherMember?.name || "Conversation"
        : "Select a conversation";

    const conversationSubtitle = selectedConversation
        ? selectedConversation.conversation_type === "group"
            ? `${selectedConversation.members?.length || 0} members • ${selectedConversation.store_name || "Store"}`
            : selectedOtherMember?.presence_status === "online"
                ? "Online"
                : formatLastSeen(selectedOtherMember?.last_seen)
        : "Choose a person from your store";

    const filteredConversations = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return conversations;

        return conversations.filter(conv => {
            const other = conv.conversation_type === "direct"
                ? conv.members?.find(member => Number(member.id) !== Number(currentUser.id))
                : null;

            const haystack = [
                conv.title,
                conv.store_name,
                conv.last_message_text,
                conv.direct_name,
                other?.name,
                other?.email
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(term);
        });
    }, [conversations, search, currentUser.id]);

    const filteredContacts = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return contacts;

        return contacts.filter(contact =>
            [contact.name, contact.email, contact.department, contact.designation]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(term)
        );
    }, [contacts, search]);

    const loadConversations = async (storeId = selectedStoreId) => {
        const response = await getChatConversations(storeId || undefined);
        setConversations(response.data?.conversations || []);
        return response.data?.conversations || [];
    };

    const loadContacts = async (storeId = selectedStoreId) => {
        if (!storeId) {
            setContacts([]);
            return;
        }

        const response = await getChatContacts(storeId);
        setContacts(response.data?.contacts || []);
    };

    const openConversation = async (conversation) => {
        if (!conversation?.id) return;

        try {
            const response = await getChatConversation(conversation.id);
            const fullConversation = response.data?.conversation || conversation;
            setSelectedConversation(fullConversation);
            setSearchParams({ conversation: String(fullConversation.id) });
            setMessagesLoading(true);

            const messagesResponse = await getChatMessages(fullConversation.id);
            const nextMessages = messagesResponse.data?.messages || [];
            setMessages(nextMessages);

            const last = nextMessages[nextMessages.length - 1];
            if (last?.id) {
                await markChatRead(fullConversation.id, last.id);
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to open this conversation."
            );
        } finally {
            setMessagesLoading(false);
        }
    };

    const refreshSelectedConversation = async () => {
        if (!selectedConversationId) return;

        try {
            const response = await getChatConversation(selectedConversationId);
            setSelectedConversation(response.data?.conversation || null);
        } catch {
            // The conversation may have been deleted/changed; the list refresh handles it.
        }
    };

    useEffect(() => {
        let mounted = true;

        const start = async () => {
            try {
                setLoading(true);
                const response = await getChatBootstrap();
                if (!mounted) return;

                const data = response.data || {};
                const nextStores = data.stores || [];
                setStores(nextStores);

                const requestedStore = searchParams.get("store");
                const requestedConversation = searchParams.get("conversation");

                const firstStore =
                    nextStores.find(store => String(store.id) === requestedStore) ||
                    nextStores[0];

                const initialStoreId =
                    admin
                        ? (requestedStore || "all")
                        : (firstStore ? String(firstStore.id) : "");

                if (initialStoreId) {
                    setSelectedStoreId(initialStoreId);

                    const queryStore =
                        initialStoreId === "all"
                            ? undefined
                            : initialStoreId;

                    const [convResponse, contactResponse] = await Promise.all([
                        getChatConversations(queryStore),
                        getChatContacts(queryStore)
                    ]);

                    if (!mounted) return;

                    const nextConversations =
                        convResponse.data?.conversations || [];

                    setConversations(nextConversations);
                    setContacts(contactResponse.data?.contacts || []);

                    if (requestedConversation) {
                        const match = nextConversations.find(
                            conv => Number(conv.id) === Number(requestedConversation)
                        );

                        if (match) {
                            await openConversation(match);
                        }
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(
                        err.response?.data?.message ||
                        "Chat could not be loaded."
                    );
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        start();

        return () => {
            mounted = false;
        };
        // The first load intentionally runs once.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectedStoreId) return;

        setSearchParams(
            selectedConversationId
                ? {
                    store: String(selectedStoreId),
                    conversation: String(selectedConversationId)
                }
                : { store: String(selectedStoreId) },
            { replace: true }
        );

        loadContacts(selectedStoreId).catch(() => {});
        loadConversations(selectedStoreId).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStoreId]);

    useEffect(() => {
        updateChatPresence("online").catch(() => {});

        const heartbeat = setInterval(() => {
            updateChatPresence("online").catch(() => {});
        }, 30000);

        const onBeforeUnload = () => {
            updateChatPresence("offline").catch(() => {});
        };

        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            clearInterval(heartbeat);
            window.removeEventListener("beforeunload", onBeforeUnload);
            updateChatPresence("offline").catch(() => {});
        };
    }, []);

    useEffect(() => {
        eventCleanupRef.current?.();

        eventCleanupRef.current = openChatEventStream({
            message: async (event) => {
                const incoming = event?.message;
                if (!incoming) return;

                if (Number(event.conversation_id) === Number(selectedConversationId)) {
                    setMessages(previous => uniqueById([...previous, incoming]));

                    if (Number(incoming.sender_id) !== Number(currentUser.id)) {
                        markChatRead(event.conversation_id, incoming.id).catch(() => {});
                    }

                    setTimeout(() => {
                        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 20);
                }

                loadConversations(selectedStoreId).catch(() => {});
            },

            message_updated: (event) => {
                const updated = event?.message;
                if (!updated) return;

                setMessages(previous =>
                    previous.map(item =>
                        Number(item.id) === Number(updated.id)
                            ? { ...item, ...updated }
                            : item
                    )
                );
            },

            conversation: (event) => {
                if (event?.conversation) {
                    loadConversations(selectedStoreId).catch(() => {});
                }
            },

            incoming_call: (event) => {
                if (event?.call) {
                    setCallState({
                        mode: "incoming",
                        call: event.call,
                        conversation: event.conversation
                    });
                }
            },

            call_signal: async (signal) => {
                await handleCallSignal(signal);
            },

            call_status: (event) => {
                const call = event?.call;
                if (!call) return;

                if (activeCallRef.current?.call?.id === call.id) {
                    if (["ended", "rejected", "missed"].includes(call.status)) {
                        finishCallUi();
                    } else {
                        setCallState(previous => previous ? {
                            ...previous,
                            call
                        } : previous);
                    }
                }
            }
        });

        return () => {
            eventCleanupRef.current?.();
            eventCleanupRef.current = null;
        };
        // selectedConversationId is intentionally included so the live event
        // handler always knows which conversation is open.
    }, [selectedConversationId, selectedStoreId, currentUser.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: messagesLoading ? "auto" : "smooth"
        });
    }, [messages, messagesLoading]);

    const sendMessageNow = async () => {
        const trimmed = message.trim();

        if (!selectedConversationId || (!trimmed && !attachment)) {
            return;
        }

        try {
            if (editing) {
                const response = await editChatMessage(editing.id, trimmed);
                const updated = response.data?.message;

                if (updated) {
                    setMessages(previous =>
                        previous.map(item =>
                            Number(item.id) === Number(updated.id)
                                ? { ...item, ...updated }
                                : item
                        )
                    );
                }

                setEditing(null);
                setMessage("");
                return;
            }

            const response = await sendChatMessage(
                selectedConversationId,
                {
                    message: trimmed,
                    file: attachment,
                    reply_to_id: replyTo?.id
                }
            );

            const created = response.data?.message;

            if (created) {
                setMessages(previous => uniqueById([...previous, created]));
            }

            setMessage("");
            setAttachment(null);
            setReplyTo(null);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Message could not be sent."
            );
        }
    };

    const handleDelete = async (messageId) => {
        if (!window.confirm("Delete this message?")) return;

        try {
            await deleteChatMessage(messageId);
            setMessages(previous =>
                previous.map(item =>
                    Number(item.id) === Number(messageId)
                        ? {
                            ...item,
                            message_type: "deleted",
                            message_text: null,
                            attachment_url: null
                        }
                        : item
                )
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Message could not be deleted."
            );
        }
    };

    const handleReaction = async (messageId, reaction) => {
        try {
            const response = await reactToChatMessage(messageId, reaction);
            const updated = response.data?.message;

            if (updated) {
                setMessages(previous =>
                    previous.map(item =>
                        Number(item.id) === Number(updated.id)
                            ? updated
                            : item
                    )
                );
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Reaction could not be saved."
            );
        }
    };

    const startDirectChat = async (contact) => {
        try {
            const response = await createDirectConversation(
                contact.id,
                selectedStoreId
            );
            const conversation = response.data?.conversation;

            if (conversation) {
                setShowContacts(false);
                setSearch("");
                setSelectedConversation(conversation);
                setSearchParams({
                    store: String(selectedStoreId),
                    conversation: String(conversation.id)
                });

                const messagesResponse = await getChatMessages(conversation.id);
                setMessages(messagesResponse.data?.messages || []);
                await loadConversations(selectedStoreId);
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to start the chat."
            );
        }
    };

    const createGroup = async () => {
        if (!groupMembers.length) {
            setError("Select at least one group member.");
            return;
        }

        try {
            const response = await createGroupConversation(
                selectedStoreId,
                groupTitle || `${selectedStore?.store_name || "Store"} Group`,
                groupMembers
            );

            const conversation = response.data?.conversation;

            setShowGroup(false);
            setGroupTitle("");
            setGroupMembers([]);

            if (conversation) {
                setSelectedConversation(conversation);
                setSearchParams({
                    store: String(selectedStoreId),
                    conversation: String(conversation.id)
                });
                setMessages([]);
                await loadConversations(selectedStoreId);
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to create the group."
            );
        }
    };

    const ensureMedia = async (type) => {
        const constraints = {
            audio: true,
            video: type === "video"
        };

        const stream =
            await navigator.mediaDevices.getUserMedia(constraints);

        localStreamRef.current = stream;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        return stream;
    };

    const createPeerConnection = (call) => {
        if (pcRef.current) {
            pcRef.current.close();
        }

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && call?.id) {
                sendCallSignal(
                    call.id,
                    "ice-candidate",
                    event.candidate.toJSON
                        ? event.candidate.toJSON()
                        : event.candidate
                ).catch(() => {});
            }
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (!stream) return;

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }

            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = stream;
            }
        };

        pc.onconnectionstatechange = () => {
            if (
                ["failed", "disconnected", "closed"].includes(
                    pc.connectionState
                )
            ) {
                // Do not immediately close on transient disconnected state.
                if (pc.connectionState === "failed") {
                    finishCall("ended");
                }
            }
        };

        const stream = localStreamRef.current;
        stream?.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        pcRef.current = pc;
        return pc;
    };

    const flushPendingIce = async () => {
        if (!pcRef.current || !remoteDescriptionSetRef.current) return;

        const queued = [...pendingIceRef.current];
        pendingIceRef.current = [];

        for (const candidate of queued) {
            try {
                await pcRef.current.addIceCandidate(candidate);
            } catch {
                // Ignore stale ICE candidates.
            }
        }
    };

    async function handleCallSignal(signal) {
        if (!activeCallRef.current) {
            pendingSignalsRef.current.push(signal);
            return;
        }

        const active = activeCallRef.current;
        if (Number(signal.call_id) !== Number(active.call.id)) return;

        if (!pcRef.current) {
            pendingSignalsRef.current.push(signal);
            return;
        }

        try {
            if (signal.signal_type === "offer") {
                await pcRef.current.setRemoteDescription(
                    new RTCSessionDescription(signal.payload)
                );

                remoteDescriptionSetRef.current = true;
                await flushPendingIce();

                const answer =
                    await pcRef.current.createAnswer();

                await pcRef.current.setLocalDescription(answer);

                await sendCallSignal(
                    active.call.id,
                    "answer",
                    answer
                );
            } else if (signal.signal_type === "answer") {
                await pcRef.current.setRemoteDescription(
                    new RTCSessionDescription(signal.payload)
                );

                remoteDescriptionSetRef.current = true;
                await flushPendingIce();
            } else if (signal.signal_type === "ice-candidate") {
                if (!remoteDescriptionSetRef.current) {
                    pendingIceRef.current.push(signal.payload);
                } else {
                    await pcRef.current.addIceCandidate(
                        signal.payload
                    );
                }
            }
        } catch (error) {
            console.error("WebRTC signal handling failed:", error);
        }
    }

    const startSignalPolling = (callId) => {
        clearInterval(signalPollRef.current);

        signalCursorRef.current = 0;

        signalPollRef.current = setInterval(async () => {
            try {
                const response =
                    await getCallSignals(
                        callId,
                        signalCursorRef.current
                    );

                const signals =
                    response.data?.signals || [];

                for (const signal of signals) {
                    signalCursorRef.current =
                        Math.max(
                            signalCursorRef.current,
                            Number(signal.id)
                        );

                    await handleCallSignal(signal);
                }
            } catch {
                // SSE is the primary path; polling is a fallback.
            }
        }, 900);
    };

    const prepareCall = async (call, type, caller) => {
        setCallError("");
        activeCallRef.current = {
            call,
            type,
            caller
        };

        setCallState({
            mode: caller ? "outgoing" : "active",
            call
        });

        try {
            await ensureMedia(type);
            remoteDescriptionSetRef.current = false;
            pendingIceRef.current = [];

            const pc = createPeerConnection(call);
            startSignalPolling(call.id);

            if (caller) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                await sendCallSignal(
                    call.id,
                    "offer",
                    offer
                );

                for (const signal of pendingSignalsRef.current.splice(0)) {
                    await handleCallSignal(signal);
                }
            } else {
                for (const signal of pendingSignalsRef.current.splice(0)) {
                    await handleCallSignal(signal);
                }
            }
        } catch (error) {
            setCallError(
                error?.message?.includes("Permission")
                    ? "Camera/microphone permission was denied."
                    : "Unable to start the call on this device."
            );

            await updateChatCall(call.id, "ended").catch(() => {});
            finishCallUi();
        }
    };

    const startCall = async (type) => {
        if (!selectedConversationId || !selectedOtherMember) {
            setCallError("Calls are available for one-to-one chats.");
            return;
        }

        try {
            const response = await startChatCall(
                selectedConversationId,
                selectedOtherMember.id,
                type
            );

            await prepareCall(
                response.data.call,
                type,
                true
            );
        } catch (err) {
            setCallError(
                err.response?.data?.message ||
                "The call could not be started."
            );
        }
    };

    const acceptIncomingCall = async () => {
        const call = callState?.call;
        if (!call) return;

        try {
            await updateChatCall(call.id, "accepted");
            await prepareCall(
                call,
                call.call_type,
                false
            );
        } catch (err) {
            setCallError(
                err.response?.data?.message ||
                "Unable to accept the call."
            );
        }
    };

    const rejectIncomingCall = async () => {
        const call = callState?.call;
        if (!call) return;

        await updateChatCall(call.id, "rejected").catch(() => {});
        finishCallUi();
    };

    const finishCallUi = () => {
        clearInterval(signalPollRef.current);
        signalPollRef.current = null;

        if (pcRef.current) {
            pcRef.current.ontrack = null;
            pcRef.current.onicecandidate = null;
            pcRef.current.close();
            pcRef.current = null;
        }

        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        activeCallRef.current = null;
        pendingSignalsRef.current = [];
        pendingIceRef.current = [];
        remoteDescriptionSetRef.current = false;
        signalCursorRef.current = 0;
        setCallState(null);
        setMicMuted(false);
        setCameraOff(false);
    };

    const finishCall = async (status = "ended") => {
        const call = activeCallRef.current?.call || callState?.call;
        if (call?.id) {
            await updateChatCall(call.id, status).catch(() => {});
        }
        finishCallUi();
    };

    const toggleMic = () => {
        const audioTrack =
            localStreamRef.current?.getAudioTracks?.()[0];

        if (!audioTrack) return;

        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
    };

    const toggleCamera = () => {
        const videoTrack =
            localStreamRef.current?.getVideoTracks?.()[0];

        if (!videoTrack) return;

        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
    };

    const loadAdminPanel = async () => {
        try {
            const response = await getChatAdminOverview();
            setAdminStores(response.data?.stores || []);
            setShowAdminPanel(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Administrator panel could not be loaded."
            );
        }
    };

    const assignManager = async (storeId, userId) => {
        try {
            const response =
                await assignChatStoreManager(
                    storeId,
                    userId
                );

            const manager = response.data?.manager || null;

            setAdminStores(previous =>
                previous.map(store =>
                    Number(store.id) === Number(storeId)
                        ? {
                            ...store,
                            manager_id: manager?.user_id || null,
                            manager_name: manager?.name || null,
                            manager_email: manager?.email || null
                        }
                        : store
                )
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Manager assignment failed."
            );
        }
    };

    const getConversationPreview = (conversation) => {
        if (conversation.last_message_text) {
            return conversation.last_message_text;
        }

        if (conversation.last_message_type === "image") {
            return "📷 Photo";
        }

        if (conversation.last_message_type === "video") {
            return "🎥 Video";
        }

        if (conversation.last_message_type === "audio") {
            return "🎵 Audio";
        }

        if (conversation.last_message_type === "file") {
            return "📎 Attachment";
        }

        return "No messages yet";
    };

    const renderMessageContent = (item) => {
        if (item.message_type === "deleted") {
            return (
                <div className="chat-deleted">
                    This message was deleted
                </div>
            );
        }

        if (item.message_text) {
            return (
                <div className="chat-message-text">
                    {item.message_text}
                    {item.edited_at && (
                        <small> edited</small>
                    )}
                </div>
            );
        }

        return null;
    };

    if (loading) {
        return (
            <div className="chat-page chat-loading">
                <div className="chat-loading-card">
                    <FaComments />
                    <h2>Loading Chat</h2>
                    <p>Preparing your store conversations…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-page">
            <div className="chat-header">
                <div>
                    <div className="chat-kicker">
                        MIARCUS • TEAM COMMUNICATION
                    </div>
                    <h1>
                        <FaComments />
                        Chat
                    </h1>
                    <p>
                        Talk, share files, and call the people you work with.
                    </p>
                </div>

                <div className="chat-header-actions">
                    {admin && (
                        <button
                            className="chat-header-button"
                            onClick={loadAdminPanel}
                        >
                            <FaUserShield />
                            Store managers
                        </button>
                    )}

                    {canAdd && (
                        <button
                            className="chat-header-button"
                            onClick={() => setShowContacts(true)}
                        >
                            <FaUserPlus />
                            New chat
                        </button>
                    )}

                    {canAdd && (
                        <button
                            className="chat-header-button primary"
                            onClick={() => setShowGroup(true)}
                            disabled={!selectedStoreId}
                        >
                        <FaUsers />
                            New group
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="chat-alert">
                    <span>{error}</span>
                    <button onClick={() => setError("")}>
                        <FaTimes />
                    </button>
                </div>
            )}

            <div className="chat-workspace">
                <aside className="chat-sidebar">
                    <div className="chat-sidebar-top">
                        <label>
                            <FaStore />
                            Your store
                        </label>

                        <select
                            value={selectedStoreId}
                            onChange={event => {
                                setSelectedStoreId(event.target.value);
                                setSelectedConversation(null);
                                setMessages([]);
                                setSearchParams({
                                    store: event.target.value
                                });
                            }}
                        >
                            {admin && (
                                <option value="all">
                                    All stores
                                </option>
                            )}

                            {stores.map(store => (
                                <option
                                    key={store.id}
                                    value={store.id}
                                >
                                    {store.store_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="chat-search">
                        <FaSearch />
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Search people or chats…"
                        />
                    </div>

                    <div className="chat-list-heading">
                        <span>Recent chats</span>
                        <strong>{filteredConversations.length}</strong>
                    </div>

                    <div className="chat-conversation-list">
                        {filteredConversations.length ? (
                            filteredConversations.map(conversation => {
                                const other =
                                    conversation.conversation_type === "direct"
                                        ? conversation.members?.find(
                                            member =>
                                                Number(member.id) !==
                                                Number(currentUser.id)
                                        )
                                        : null;

                                return (
                                    <button
                                        key={conversation.id}
                                        className={`chat-conversation-item ${
                                            Number(selectedConversationId) ===
                                            Number(conversation.id)
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() => openConversation(conversation)}
                                    >
                                        <div className="chat-avatar">
                                            {(other?.profile_photo || conversation.direct_photo) ? (
                                                <img
                                                    src={other?.profile_photo || conversation.direct_photo}
                                                    alt=""
                                                />
                                            ) : (
                                                initials(
                                                    other?.name ||
                                                    conversation.direct_name ||
                                                    conversation.title
                                                )
                                            )}
                                            {other?.presence_status === "online" && (
                                                <span className="chat-online-dot" />
                                            )}
                                        </div>

                                        <div className="chat-conversation-copy">
                                            <div className="chat-conversation-title">
                                                <strong>
                                                    {other?.name ||
                                                        conversation.direct_name ||
                                                        conversation.title ||
                                                        "Store Group"}
                                                </strong>
                                                <time>
                                                    {formatTime(
                                                        conversation.last_message_at
                                                    )}
                                                </time>
                                            </div>

                                            <div className="chat-conversation-preview">
                                                {getConversationPreview(conversation)}
                                            </div>

                                            <small>
                                                {conversation.store_name ||
                                                    selectedStore?.store_name}
                                            </small>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="chat-empty-list">
                                <FaComments />
                                <p>No conversations yet.</p>
                                <button onClick={() => setShowContacts(true)}>
                                    Start a chat
                                </button>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="chat-main">
                    {!selectedConversation ? (
                        <div className="chat-welcome">
                            <div className="chat-welcome-icon">
                                <FaComments />
                            </div>
                            <h2>Your team, in one place</h2>
                            <p>
                                Choose someone from your store or create a group.
                                Admins can communicate across every store.
                            </p>
                            {canAdd && (
                                <button
                                    className="chat-primary-button"
                                    onClick={() => setShowContacts(true)}
                                >
                                    <FaUserPlus />
                                    Start a conversation
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <header className="chat-conversation-header">
                                <div className="chat-person">
                                    <div className="chat-avatar large">
                                        {selectedOtherMember?.profile_photo ? (
                                            <img
                                                src={selectedOtherMember.profile_photo}
                                                alt=""
                                            />
                                        ) : (
                                            initials(conversationTitle)
                                        )}
                                    </div>

                                    <div>
                                        <h2>{conversationTitle}</h2>
                                        <p>
                                            {selectedConversation.conversation_type === "group" && (
                                                <FaUsers />
                                            )}
                                            {conversationSubtitle}
                                        </p>
                                    </div>
                                </div>

                                <div className="chat-call-actions">
                                    {selectedOtherMember && canAdd && (
                                        <>
                                            <button
                                                title="Voice call"
                                                onClick={() => startCall("audio")}
                                            >
                                                <FaPhone />
                                            </button>

                                            <button
                                                title="Video call"
                                                onClick={() => startCall("video")}
                                            >
                                                <FaVideo />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </header>

                            <div className="chat-message-area">
                                {messagesLoading ? (
                                    <div className="chat-message-loading">
                                        Loading messages…
                                    </div>
                                ) : messages.length ? (
                                    messages.map(item => {
                                        const mine =
                                            Number(item.sender_id) ===
                                            Number(currentUser.id);

                                        return (
                                            <div
                                                key={item.id}
                                                className={`chat-message-row ${
                                                    mine ? "mine" : "theirs"
                                                }`}
                                            >
                                                {!mine && (
                                                    <div className="chat-avatar tiny">
                                                        {item.sender_photo ? (
                                                            <img
                                                                src={item.sender_photo}
                                                                alt=""
                                                            />
                                                        ) : (
                                                            initials(item.sender_name)
                                                        )}
                                                    </div>
                                                )}

                                                <div className="chat-message-wrap">
                                                    {!mine && (
                                                        <small className="chat-sender-name">
                                                            {item.sender_name}
                                                        </small>
                                                    )}

                                                    {item.reply_text && (
                                                        <div className="chat-reply-preview">
                                                            <FaReply />
                                                            <span>
                                                                {item.reply_sender_name}: {item.reply_text}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="chat-bubble">
                                                        {item.attachment_url && (
                                                            <div className="chat-attachment">
                                                                {item.message_type === "image" ? (
                                                                    <img
                                                                        src={item.attachment_url}
                                                                        alt={item.attachment_name || "Attachment"}
                                                                    />
                                                                ) : item.message_type === "video" ? (
                                                                    <video
                                                                        src={item.attachment_url}
                                                                        controls
                                                                    />
                                                                ) : item.message_type === "audio" ? (
                                                                    <audio
                                                                        src={item.attachment_url}
                                                                        controls
                                                                    />
                                                                ) : (
                                                                    <a
                                                                        href={item.attachment_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        <FaPaperclip />
                                                                        {item.attachment_name || "Open attachment"}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {renderMessageContent(item)}

                                                        <div className="chat-message-meta">
                                                            <time>
                                                                {formatTime(item.created_at)}
                                                            </time>
                                                            {mine && (
                                                                <FaCheck />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.reactions?.length > 0 && (
                                                        <div className="chat-reactions">
                                                            {item.reactions.map(reaction => (
                                                                <button
                                                                    key={reaction.reaction}
                                                                    onClick={() =>
                                                                        handleReaction(
                                                                            item.id,
                                                                            reaction.reaction
                                                                        )
                                                                    }
                                                                >
                                                                    {reaction.reaction} {reaction.count}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {canAdd && (
                                                        <div className="chat-message-tools">
                                                            {EMOJIS.map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() =>
                                                                    handleReaction(
                                                                        item.id,
                                                                        emoji
                                                                    )
                                                                }
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}

                                                        <button
                                                            onClick={() =>
                                                                setReplyTo(item)
                                                            }
                                                            title="Reply"
                                                        >
                                                            <FaReply />
                                                        </button>

                                                        {mine && item.message_type !== "deleted" && canEdit && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditing(item);
                                                                        setMessage(item.message_text || "");
                                                                        setReplyTo(null);
                                                                    }}
                                                                    title="Edit"
                                                                >
                                                                    <FaEdit />
                                                                </button>

                                                                {canDelete && (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDelete(item.id)
                                                                        }
                                                                        title="Delete"
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="chat-empty-messages">
                                        <div className="chat-empty-icon">
                                            <FaComments />
                                        </div>
                                        <h3>Say hello 👋</h3>
                                        <p>
                                            This is the beginning of your conversation.
                                        </p>
                                    </div>
                                )}

                                <div ref={bottomRef} />
                            </div>

                            <footer className="chat-composer">
                                {replyTo && (
                                    <div className="chat-composer-context">
                                        <div>
                                            <FaReply />
                                            <span>
                                                Replying to <strong>{replyTo.sender_name}</strong>
                                                <small>{replyTo.message_text || "Attachment"}</small>
                                            </span>
                                        </div>
                                        <button onClick={() => setReplyTo(null)}>
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}

                                {editing && (
                                    <div className="chat-composer-context editing">
                                        <div>
                                            <FaEdit />
                                            <span>
                                                Editing message
                                                <small>{editing.message_text}</small>
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditing(null);
                                                setMessage("");
                                            }}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}

                                {attachment && (
                                    <div className="chat-file-chip">
                                        <FaPaperclip />
                                        <span>{attachment.name}</span>
                                        <button onClick={() => setAttachment(null)}>
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}

                                <div className="chat-composer-row">
                                    <label className="chat-icon-button" title="Attach file">
                                        <FaPaperclip />
                                        <input
                                            disabled={!canAdd}
                                            type="file"
                                            accept="image/*,video/*,audio/*,.pdf,.txt,.docx,.xlsx,.zip"
                                            onChange={event =>
                                                setAttachment(
                                                    event.target.files?.[0] || null
                                                )
                                            }
                                        />
                                    </label>

                                    <button
                                        disabled={!canAdd}
                                        className="chat-icon-button"
                                        title="Emoji"
                                        onClick={() => setMessage(previous => `${previous} 😊`)}
                                    >
                                        <FaSmile />
                                    </button>

                                    <textarea
                                        disabled={!canAdd}
                                        value={message}
                                        onChange={event => setMessage(event.target.value)}
                                        onKeyDown={event => {
                                            if (
                                                event.key === "Enter" &&
                                                !event.shiftKey
                                            ) {
                                                event.preventDefault();
                                                sendMessageNow();
                                            }
                                        }}
                                        placeholder={
                                            editing
                                                ? "Edit your message…"
                                                : "Write a message…"
                                        }
                                        rows={1}
                                    />

                                    <button
                                        className="chat-send-button"
                                        onClick={sendMessageNow}
                                        disabled={!canAdd || (!message.trim() && !attachment)}
                                    >
                                        <FaPaperPlane />
                                    </button>
                                </div>
                            </footer>
                        </>
                    )}
                </main>
            </div>

            {showContacts && (
                <div className="chat-modal-backdrop" onMouseDown={() => setShowContacts(false)}>
                    <div
                        className="chat-modal contacts-modal"
                        onMouseDown={event => event.stopPropagation()}
                    >
                        <header>
                            <div>
                                <h2>Start a conversation</h2>
                                <p>
                                    Only people available in your selected store are shown.
                                </p>
                            </div>
                            <button onClick={() => setShowContacts(false)}>
                                <FaTimes />
                            </button>
                        </header>

                        <div className="chat-modal-search">
                            <FaSearch />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search employees…"
                                autoFocus
                            />
                        </div>

                        <div className="chat-contact-list">
                            {filteredContacts.length ? (
                                filteredContacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        className="chat-contact-item"
                                        onClick={() => startDirectChat(contact)}
                                    >
                                        <div className="chat-avatar">
                                            {contact.profile_photo ? (
                                                <img src={contact.profile_photo} alt="" />
                                            ) : (
                                                initials(contact.name)
                                            )}
                                            {contact.presence_status === "online" && (
                                                <span className="chat-online-dot" />
                                            )}
                                        </div>
                                        <div>
                                            <strong>{contact.name}</strong>
                                            <span>
                                                {contact.designation ||
                                                    contact.department ||
                                                    contact.email}
                                            </span>
                                        </div>
                                        <FaChevronRight />
                                    </button>
                                ))
                            ) : (
                                <div className="chat-modal-empty">
                                    No employees found in this store.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showGroup && (
                <div className="chat-modal-backdrop" onMouseDown={() => setShowGroup(false)}>
                    <div
                        className="chat-modal group-modal"
                        onMouseDown={event => event.stopPropagation()}
                    >
                        <header>
                            <div>
                                <h2>Create store group</h2>
                                <p>
                                    Group members must belong to {selectedStore?.store_name || "this store"}.
                                </p>
                            </div>
                            <button onClick={() => setShowGroup(false)}>
                                <FaTimes />
                            </button>
                        </header>

                        <input
                            className="chat-form-input"
                            value={groupTitle}
                            onChange={event => setGroupTitle(event.target.value)}
                            placeholder="Group name"
                        />

                        <div className="chat-group-members">
                            {contacts.map(contact => {
                                const checked = groupMembers.includes(Number(contact.id));

                                return (
                                    <label key={contact.id}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                                setGroupMembers(previous =>
                                                    checked
                                                        ? previous.filter(id => id !== Number(contact.id))
                                                        : [...previous, Number(contact.id)]
                                                )
                                            }
                                        />
                                        <span>{contact.name}</span>
                                        <small>
                                            {contact.designation || contact.department || ""}
                                        </small>
                                    </label>
                                );
                            })}
                        </div>

                        <footer className="chat-modal-footer">
                            <button
                                className="chat-secondary-button"
                                onClick={() => setShowGroup(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="chat-primary-button"
                                onClick={createGroup}
                            >
                                <FaUsers />
                                Create group
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {showAdminPanel && (
                <div className="chat-modal-backdrop" onMouseDown={() => setShowAdminPanel(false)}>
                    <div
                        className="chat-modal admin-modal"
                        onMouseDown={event => event.stopPropagation()}
                    >
                        <header>
                            <div>
                                <h2>Store chat managers</h2>
                                <p>
                                    Admin can assign one manager to each store.
                                </p>
                            </div>
                            <button onClick={() => setShowAdminPanel(false)}>
                                <FaTimes />
                            </button>
                        </header>

                        <div className="chat-admin-list">
                            {adminStores.map(store => (
                                <AdminStoreRow
                                    key={store.id}
                                    store={store}
                                    onAssign={assignManager}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {callState && (
                <div className="chat-call-backdrop">
                    <div className={`chat-call-panel ${
                        callState.mode === "incoming"
                            ? "incoming"
                            : "active"
                    }`}>
                        <div className="chat-call-top">
                            <div>
                                <span>
                                    {callState.call?.call_type === "video"
                                        ? "Video call"
                                        : "Voice call"}
                                </span>
                                <h2>
                                    {callState.call?.caller_name ||
                                        selectedOtherMember?.name ||
                                        "Team member"}
                                </h2>
                            </div>

                            {callState.mode !== "incoming" && (
                                <span className="chat-call-status">
                                    {callState.mode === "outgoing"
                                        ? "Calling…"
                                        : "Connected"}
                                </span>
                            )}
                        </div>

                        {callState.mode === "incoming" ? (
                            <div className="chat-incoming-call">
                                <div className="chat-call-avatar">
                                    {initials(
                                        callState.call?.caller_name ||
                                        "Caller"
                                    )}
                                </div>

                                <p>
                                    {callState.call?.call_type === "video"
                                        ? "Incoming video call"
                                        : "Incoming voice call"}
                                </p>

                                <div className="chat-incoming-actions">
                                    <button
                                        className="reject"
                                        onClick={rejectIncomingCall}
                                    >
                                        <FaTimes />
                                    </button>
                                    <button
                                        className="accept"
                                        onClick={acceptIncomingCall}
                                    >
                                        {callState.call?.call_type === "video"
                                            ? <FaVideo />
                                            : <FaPhone />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="chat-video-stage">
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        className={
                                            callState.call?.call_type === "video"
                                                ? "remote-video"
                                                : "remote-video hidden"
                                        }
                                    />

                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={
                                            callState.call?.call_type === "video"
                                                ? "local-video"
                                                : "local-video hidden"
                                        }
                                    />

                                    <audio
                                        ref={remoteAudioRef}
                                        autoPlay
                                        className="remote-audio"
                                    />

                                    {callState.call?.call_type !== "video" && (
                                        <div className="chat-audio-call-art">
                                            <div className="chat-call-avatar">
                                                {initials(
                                                    callState.call?.callee_name ||
                                                    callState.call?.caller_name ||
                                                    selectedOtherMember?.name
                                                )}
                                            </div>
                                            <h3>
                                                {callState.call?.callee_name ||
                                                    callState.call?.caller_name ||
                                                    selectedOtherMember?.name}
                                            </h3>
                                        </div>
                                    )}
                                </div>

                                {callError && (
                                    <div className="chat-call-error">
                                        {callError}
                                    </div>
                                )}

                                <div className="chat-call-controls">
                                    <button onClick={toggleMic}>
                                        {micMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                                    </button>

                                    {callState.call?.call_type === "video" && (
                                        <button onClick={toggleCamera}>
                                            {cameraOff ? <FaVideoSlash /> : <FaVideo />}
                                        </button>
                                    )}

                                    <button
                                        className="end"
                                        onClick={() => finishCall("ended")}
                                    >
                                        <FaPhone />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminStoreRow({ store, onAssign }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        getChatContacts(store.id)
            .then(response => {
                if (mounted) setUsers(response.data?.contacts || []);
            })
            .catch(() => {})
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [store.id]);

    return (
        <div className="chat-admin-row">
            <div>
                <strong>{store.store_name}</strong>
                <small>
                    {store.store_code || ""} • {store.city || ""}
                </small>
            </div>

            <select
                value={store.manager_id || ""}
                onChange={event =>
                    onAssign(
                        store.id,
                        event.target.value || null
                    )
                }
                disabled={loading}
            >
                <option value="">No manager assigned</option>
                {users.map(user => (
                    <option
                        key={user.id}
                        value={user.id}
                    >
                        {user.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default Chat;
