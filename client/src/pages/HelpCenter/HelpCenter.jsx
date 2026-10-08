import PremiumLoader from "../../components/premium/PremiumLoader";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    FaArrowRight, FaBookOpen, FaChevronDown, FaClock, FaComments,
    FaHeadset, FaPlus, FaRobot, FaSearch, FaShieldAlt, FaTimes,
    FaUserTie, FaPaperPlane, FaEdit, FaTrash, FaBolt, FaMicrophone,
    FaVolumeUp, FaStop, FaMagic, FaHistory, FaRegLightbulb, FaCopy,
    FaCheck, FaCircleNotch, FaGlobe
} from "react-icons/fa";
import {
    askZarvis, askPublicZarvis, createHelpTicket, getAdminHelpArticles,
    getPublicHelpArticles, getHelpArticles, getHelpTicket, getMyHelpTickets, replyHelpTicket,
    createAdminHelpArticle, updateAdminHelpArticle, deleteAdminHelpArticle,
    getZarvisHistory, clearZarvisHistory
} from "../../services/helpCenterService";
import "../../styles/pages/HelpCenter.css";

const emptyForm = { title: "", question: "", answer: "", category: "General", keywords: "", audience: "both", status: "published", sort_order: 0 };
const userFromStorage = () => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } };

const SUGGESTIONS = [
    "Explain the Miarcus project",
    "How does NSO work in detail?",
    "How do I create an Action Point?",
    "How do I reset my password?",
    "Where can I see reports?",
];
const ZARVIS_LANGUAGES = [
    { value: "auto", label: "Auto detect", speech: "en-IN" },
    { value: "English", label: "English", speech: "en-IN" },
    { value: "Hindi", label: "हिन्दी · Hindi", speech: "hi-IN" },
    { value: "Odia", label: "ଓଡ଼ିଆ · Odia", speech: "or-IN" },
    { value: "Punjabi", label: "ਪੰਜਾਬੀ · Punjabi", speech: "pa-IN" },
    { value: "Tamil", label: "தமிழ் · Tamil", speech: "ta-IN" },
    { value: "Kannada", label: "ಕನ್ನಡ · Kannada", speech: "kn-IN" },
    { value: "Marathi", label: "मराठी · Marathi", speech: "mr-IN" },
    { value: "Bengali", label: "বাংলা · Bengali", speech: "bn-IN" },
    { value: "Telugu", label: "తెలుగు · Telugu", speech: "te-IN" },
    { value: "Gujarati", label: "ગુજરાતી · Gujarati", speech: "gu-IN" },
    { value: "Malayalam", label: "മലയാളം · Malayalam", speech: "ml-IN" },
    { value: "Urdu", label: "اردو · Urdu", speech: "ur-IN" },
    { value: "Assamese", label: "অসমীয়া · Assamese", speech: "as-IN" },
    { value: "Nepali", label: "नेपाली · Nepali", speech: "ne-NP" },
    { value: "Sanskrit", label: "संस्कृतम् · Sanskrit", speech: "sa-IN" },
    { value: "French", label: "Français · French", speech: "fr-FR" },
    { value: "Spanish", label: "Español · Spanish", speech: "es-ES" },
    { value: "German", label: "Deutsch · German", speech: "de-DE" },
    { value: "Portuguese", label: "Português · Portuguese", speech: "pt-BR" },
    { value: "Arabic", label: "العربية · Arabic", speech: "ar-SA" },
    { value: "Chinese", label: "中文 · Chinese", speech: "zh-CN" },
    { value: "Japanese", label: "日本語 · Japanese", speech: "ja-JP" },
    { value: "Korean", label: "한국어 · Korean", speech: "ko-KR" },
    { value: "Russian", label: "Русский · Russian", speech: "ru-RU" },
];


const renderAnswer = (text) => String(text || "").split("\n").map((line, index) => {
    const key = `${index}-${line}`;
    if (line.startsWith("## ")) return <h3 key={key} className="hc-md-h2">{line.slice(3)}</h3>;
    if (line.startsWith("### ")) return <h4 key={key} className="hc-md-h3">{line.slice(4)}</h4>;
    if (line.startsWith("- ")) return <div key={key} className="hc-md-bullet"><span>•</span><span>{line.slice(2)}</span></div>;
    if (!line.trim()) return <div key={key} className="hc-md-space" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={key}>{parts.map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part)}</p>;
});

function HelpCenter({ publicMode = false }) {
    const user = userFromStorage();
    const effectiveUserName = publicMode ? "there" : (user?.name || "there");
    const isAdmin = [true, 1, "1"].includes(user?.administrator) || [true, 1, "1"].includes(user?.is_admin);
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    const [tab, setTab] = useState(publicMode ? "home" : (requestedTab === "support" ? "support" : requestedTab === "history" ? "history" : "home"));
    const [articles, setArticles] = useState([]);
    const [adminArticles, setAdminArticles] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [openId, setOpenId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [botQuestion, setBotQuestion] = useState("");
    const [botMessages, setBotMessages] = useState([{ id: "welcome", from: "zarvis", text: `Hi ${effectiveUserName}! 👋 I'm Zarvis, your Miarcus assistant. Ask me naturally — even if your spelling is not perfect. I can explain modules, screens, workflows and the project structure. For a short follow-up like “explain that” or “how do I do it?”, I use the conversation context.` }]);
    const [botBusy, setBotBusy] = useState(false);
    const [zarvisHistory, setZarvisHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyClearing, setHistoryClearing] = useState(false);
    const [ticketSubject, setTicketSubject] = useState("");
    const [ticketText, setTicketText] = useState("");
    const [ticketPriority, setTicketPriority] = useState("normal");
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [ticketReply, setTicketReply] = useState("");
    const [publishedSearch, setPublishedSearch] = useState("");
    const [publishedCategory, setPublishedCategory] = useState("All");
    const [articleForm, setArticleForm] = useState(emptyForm);
    const [editingArticle, setEditingArticle] = useState(null);
    const [toast, setToast] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [speakingId, setSpeakingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(false);
    const [language, setLanguage] = useState("auto");
    const recognitionRef = useRef(null);
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            // Load independent resources together so one slow request cannot
            // prevent the rest of the Help Center from rendering.
            const requests = publicMode
                ? [getPublicHelpArticles()]
                : [
                    getHelpArticles(),
                    getMyHelpTickets(),
                    ...(isAdmin ? [getAdminHelpArticles()] : [])
                ];

            const results = await Promise.allSettled(requests);
            const [articlesResult, ticketsResult, adminArticlesResult] = results;

            if (articlesResult?.status === "fulfilled") {
                setArticles(articlesResult.value?.data?.articles || []);
            } else {
                setArticles([]);
            }

            if (!publicMode && ticketsResult?.status === "fulfilled") {
                setTickets(ticketsResult.value?.data?.tickets || []);
            } else if (publicMode) {
                setTickets([]);
            }

            if (!publicMode && isAdmin) {
                if (adminArticlesResult?.status === "fulfilled") {
                    setAdminArticles(adminArticlesResult.value?.data?.articles || []);
                }
            }

            const firstError = results.find((result) => result.status === "rejected");
            if (firstError) {
                setToast(
                    firstError.reason?.response?.data?.message ||
                    firstError.reason?.message ||
                    "Some Help Center data could not be loaded. You can still use Zarvis."
                );
            }
        } catch (e) {
            setToast(e?.response?.data?.message || "Unable to load Help Center.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [botMessages]);
    useEffect(() => {
        if (publicMode || tab !== "history") return;
        let active = true;
        setHistoryLoading(true);
        getZarvisHistory(100)
            .then((response) => {
                if (active) setZarvisHistory(response.data?.history || []);
            })
            .catch(() => {
                if (active) setToast("Could not load your private Zarvis history.");
            })
            .finally(() => { if (active) setHistoryLoading(false); });
        return () => { active = false; };
    }, [tab, publicMode]);
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        setVoiceSupported(Boolean(SpeechRecognition));
        if (!SpeechRecognition) return undefined;
        const recognition = new SpeechRecognition();
        const selectedLanguage = ZARVIS_LANGUAGES.find((item) => item.value === language);
        recognition.lang = selectedLanguage?.speech || "en-IN";
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => { setIsListening(false); setToast("Voice input could not be started. Check microphone permission and the selected voice language."); };
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ");
            setBotQuestion(transcript);
        };
        recognitionRef.current = recognition;
        return () => { try { recognition.stop(); } catch {} };
    }, [language]);

    const categories = useMemo(() => ["All", ...new Set(articles.map(a => a.category).filter(Boolean))], [articles]);
    const filtered = useMemo(() => articles.filter(a => {
        const hay = `${a.title} ${a.question} ${a.answer} ${a.keywords || ""}`.toLowerCase();
        return (category === "All" || a.category === category) && (!search.trim() || hay.includes(search.toLowerCase().trim()));
    }), [articles, category, search]);
    const adminCategories = useMemo(() => ["All", ...new Set(adminArticles.map(a => a.category).filter(Boolean))], [adminArticles]);
    const publishedArticles = useMemo(() => adminArticles.filter(a => {
        const hay = `${a.title} ${a.question} ${a.answer} ${a.keywords || ""} ${a.category || ""}`.toLowerCase();
        return (publishedCategory === "All" || a.category === publishedCategory) && (!publishedSearch.trim() || hay.includes(publishedSearch.toLowerCase().trim()));
    }), [adminArticles, publishedCategory, publishedSearch]);

    const toggleVoiceInput = () => {
        if (!voiceSupported) { setToast("Voice input is not supported by this browser. Chrome or Edge works best."); return; }
        if (isListening) { try { recognitionRef.current?.stop(); } catch {} }
        else { try { recognitionRef.current?.start(); inputRef.current?.focus(); } catch {} }
    };

    const speak = (message, id) => {
        if (!window.speechSynthesis) { setToast("Voice playback is not supported by this browser."); return; }
        if (speakingId === id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(String(message || "").replace(/[#*`]/g, ""));
        utterance.rate = 0.98; utterance.pitch = 1; utterance.lang = (ZARVIS_LANGUAGES.find((item) => item.value === language)?.speech || "en-IN");
        utterance.onstart = () => setSpeakingId(id);
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(utterance);
    };

    const copyAnswer = async (message, id) => {
        try { await navigator.clipboard.writeText(message); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); }
        catch { setToast("Could not copy the answer."); }
    };

    const clearChat = () => {
        window.speechSynthesis?.cancel(); setSpeakingId(null);
        setBotMessages([{ id: `welcome-${Date.now()}`, from: "zarvis", text: `New chat started. 👋 What would you like to know about Miarcus?` }]);
        setBotQuestion("");
    };
    const clearHistory = async () => {
        if (historyClearing || !zarvisHistory.length) return;
        if (!window.confirm("Clear your private Zarvis question history? This will not affect anyone else.")) return;
        setHistoryClearing(true);
        try {
            await clearZarvisHistory();
            setZarvisHistory([]);
            setToast("Your private Zarvis history was cleared.");
        } catch (e) {
            setToast(e?.response?.data?.message || "Could not clear your history.");
        } finally {
            setHistoryClearing(false);
        }
    };

    const submitBot = async (e) => {
        e?.preventDefault();
        const q = botQuestion.trim(); if (!q || botBusy) return;
        const history = botMessages.slice(-8).map(({ from, text, resolved, module }) => ({ from, text: String(text || "").slice(0, 1800), resolved, module }));
        setBotMessages(m => [...m, { id: `${Date.now()}u`, from: "user", text: q }]); setBotQuestion(""); setBotBusy(true);
        try {
            const res = publicMode ? await askPublicZarvis(q, history, language) : await askZarvis(q, history, language);
            const data = res.data || {};
            setBotMessages(m => [...m, { id: `${Date.now()}z`, from: "zarvis", text: data.message, resolved: data.resolved, source: data.source, confidence: data.confidence, module: data.module, related: data.related || [] }]);
            if (!publicMode) {
                getZarvisHistory(100).then((historyResponse) => {
                    setZarvisHistory(historyResponse.data?.history || []);
                }).catch(() => {});
            }
            if (autoSpeak && data.message) {
                window.setTimeout(() => speak(data.message, `${Date.now()}voice`), 120);
            }
        } catch (e2) { setBotMessages(m => [...m, { id: `${Date.now()}e`, from: "zarvis", text: e2?.response?.data?.message || "I’m temporarily unavailable. Please try again, or use Human Support." }]); }
        finally { setBotBusy(false); }
    };

    const requestHuman = async () => {
        if (!ticketText.trim()) { setToast("Describe what you need help with first."); return; }
        try {
            const r = await createHelpTicket({ subject: ticketSubject.trim() || "Help Center Support", question: ticketText.trim(), priority: ticketPriority });
            setSelectedTicket(r.data?.ticket || null); setTicketText(""); setTicketSubject("");
            setToast("Support request sent. An administrator can reply here."); await load(); setTab("support");
        } catch (e) { setToast(e?.response?.data?.message || "Could not create support request."); }
    };

    const openTicket = async (id) => { try { const r = await getHelpTicket(id); setSelectedTicket(r.data.ticket); } catch { setToast("Could not open support request."); } };
    const sendTicketReply = async () => {
        if (!selectedTicket || !ticketReply.trim()) return;
        try { const r = await replyHelpTicket(selectedTicket.id, ticketReply.trim()); setSelectedTicket(r.data.ticket); setTicketReply(""); await load(); }
        catch (e) { setToast(e?.response?.data?.message || "Reply failed."); }
    };
    const saveArticle = async () => {
        try {
            if (editingArticle) await updateAdminHelpArticle(editingArticle.id, articleForm); else await createAdminHelpArticle(articleForm);
            setArticleForm(emptyForm); setEditingArticle(null); setToast(editingArticle ? "Help answer updated." : "Help answer published."); await load();
        } catch (e) { setToast(e?.response?.data?.message || "Could not save help answer."); }
    };
    const removeArticle = async (id) => { if (!window.confirm("Delete this Help Center answer?")) return; try { await deleteAdminHelpArticle(id); await load(); setToast("Help answer deleted."); } catch { setToast("Could not delete answer."); } };
    const startEdit = (a) => { setEditingArticle(a); setArticleForm({ title:a.title, question:a.question, answer:a.answer, category:a.category, keywords:a.keywords || "", audience:a.audience, status:a.status, sort_order:a.sort_order }); document.querySelector(".hc-admin-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

    const renderAdmin = () => (
        <section className="hc-admin">
            <div className="hc-section-head">
                <div><span className="hc-eyebrow">ADMIN CONTROL ROOM</span><h2>Knowledge & Support</h2><p>Teach Zarvis once, then manage every approved answer from one premium workspace.</p></div>
                <div className="hc-live"><span />24×7 HELP CENTER</div>
            </div>
            <div className="hc-admin-grid">
                <div className="hc-panel hc-admin-form-panel">
                    <div className="hc-panel-title"><span>{editingArticle ? "Edit verified answer" : "Add verified answer"}</span>{editingArticle && <button className="hc-icon-btn" onClick={() => {setEditingArticle(null);setArticleForm(emptyForm)}}><FaTimes /></button>}</div>
                    <div className="hc-form-grid">
                        <label>Title<input value={articleForm.title} onChange={e=>setArticleForm({...articleForm,title:e.target.value})} placeholder="e.g. How do I reset my password?" /></label>
                        <label>Category<input value={articleForm.category} onChange={e=>setArticleForm({...articleForm,category:e.target.value})} placeholder="Login & Security" /></label>
                        <label className="span-2">Question<input value={articleForm.question} onChange={e=>setArticleForm({...articleForm,question:e.target.value})} placeholder="Natural-language question employees/customers may ask" /></label>
                        <label className="span-2">Answer<textarea rows="7" value={articleForm.answer} onChange={e=>setArticleForm({...articleForm,answer:e.target.value})} placeholder="Write the approved answer clearly. Zarvis will use this as a trusted answer." /></label>
                        <label>Keywords<input value={articleForm.keywords} onChange={e=>setArticleForm({...articleForm,keywords:e.target.value})} placeholder="password, reset, login" /></label>
                        <label>Audience<select value={articleForm.audience} onChange={e=>setArticleForm({...articleForm,audience:e.target.value})}><option value="both">Employees + Customers</option><option value="employee">Employees</option><option value="customer">Customers</option></select></label>
                        <label>Status<select value={articleForm.status} onChange={e=>setArticleForm({...articleForm,status:e.target.value})}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
                    </div>
                    <button className="hc-primary" onClick={saveArticle}><FaPlus /> {editingArticle ? "Update Answer" : "Publish Answer"}</button>
                </div>
                <div className="hc-panel hc-knowledge-summary">
                    <div className="hc-panel-title"><span>Knowledge base</span><span className="hc-count">{adminArticles.length} answers</span></div>
                    <div className="hc-knowledge-empty"><div className="hc-knowledge-art"><FaBookOpen /></div><h3>{adminArticles.length ? "Manage your published knowledge" : "No knowledge articles yet"}</h3><p>{adminArticles.length ? "All verified questions and answers that Zarvis uses are managed below." : "Publish a verified answer to give Zarvis accurate, consistent support."}</p></div>
                </div>
            </div>
            <div className="hc-panel hc-published-panel">
                <div className="hc-published-head">
                    <div><span className="hc-published-kicker"><FaBookOpen /> PUBLISHED KNOWLEDGE</span><h3>Manage published answers</h3><p>Edit or delete any approved question directly from this report.</p></div>
                    <div className="hc-published-count">{publishedArticles.length} shown</div>
                </div>
                <div className="hc-published-tools">
                    <div className="hc-published-search"><FaSearch /><input value={publishedSearch} onChange={e=>setPublishedSearch(e.target.value)} placeholder="Search questions, keywords, or category…" /></div>
                    <select value={publishedCategory} onChange={e=>setPublishedCategory(e.target.value)}>{adminCategories.map(c=><option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}</select>
                </div>
                <div className="hc-published-table-wrap">
                    <table className="hc-published-table"><thead><tr><th>#</th><th>Title</th><th>Question</th><th>Category</th><th>Audience</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{publishedArticles.length ? publishedArticles.map((a,index)=><tr key={a.id}><td>{index+1}</td><td><strong>{a.title}</strong></td><td>{a.question}</td><td>{a.category || "General"}</td><td>{a.audience === "both" ? "Employees + Customers" : a.audience === "employee" ? "Employees" : "Customers"}</td><td><span className={`hc-status-pill ${String(a.status || "").toLowerCase()}`}>{a.status}</span></td><td><div className="hc-published-actions"><button className="edit" onClick={()=>startEdit(a)}><FaEdit /> Edit</button><button className="delete" onClick={()=>removeArticle(a.id)}><FaTrash /> Delete</button></div></td></tr>) : <tr><td colSpan="7"><div className="hc-published-empty"><FaSearch/><strong>No published answers found</strong><span>Publish a new answer or change the search/filter.</span></div></td></tr>}</tbody></table>
                </div>
            </div>
        </section>
    );

    const renderHome = () => (
        <section className="hc-home-luna">
            <div className="hc-home-main">
                <div className="hc-category-row hc-category-luna">
                    {["General", "Modules", "How To", "Account & Access", "Reports", "Technical", "FAQ"].map((c, i) => (
                        <button key={c} className={(category === (i === 0 ? "All" : c) ? "active" : "")} onClick={() => setCategory(i === 0 ? "All" : c)}>
                            {c === "General" ? <FaComments /> : c === "Modules" ? <FaBookOpen /> : c === "How To" ? <FaMagic /> : c === "Account & Access" ? <FaShieldAlt /> : c === "Reports" ? <FaClock /> : c === "Technical" ? <FaMagic /> : <FaSearch />}
                            {c}
                        </button>
                    ))}
                </div>
                <div className="hc-home-cards">
                    {[
                        ["Explain the Miarcus project", "Get a complete overview of modules, features and workflow.", "blue"],
                        ["How does NSO work in detail?", "Learn the NSO process, roles and submission flow.", "green"],
                        ["How do I create an Action Point?", "Step by step guide to create, assign and track action points.", "orange"],
                        ["How do I reset my password?", "Reset or change your account password easily.", "purple"],
                        ["Where can I see reports?", "Find and export Checklist, Attendance and other reports.", "red"],
                        ["Troubleshoot an issue", "Get help to solve common problems and errors.", "teal"],
                    ].map(([title, desc, tone]) => (
                        <button key={title} className="hc-home-card" onClick={() => { setBotQuestion(title); setTab("zarvis"); setTimeout(() => inputRef.current?.focus(), 50); }}>
                            <span className={`hc-home-card-icon ${tone}`}><FaBookOpen /></span>
                            <span className="hc-home-card-copy"><strong>{title}</strong><small>{desc}</small></span>
                            <span className="hc-home-card-arrow"><FaArrowRight /></span>
                        </button>
                    ))}
                </div>
                <div className="hc-home-input">
                    <div className="hc-home-input-note"><FaRegLightbulb /> Ask anything — Miarcus, coding, history, geography, science or everyday questions. Zarvis can answer in your selected language.<b>Voice ready</b></div>
                    <form onSubmit={(e) => { e.preventDefault(); if (botQuestion.trim()) setTab("zarvis"); }}>
                        <button type="button" onClick={() => { setTab("zarvis"); setTimeout(() => inputRef.current?.focus(), 50); }}><FaMicrophone /></button>
                        <input value={botQuestion} onChange={e => setBotQuestion(e.target.value)} placeholder="Message Zarvis…" />
                        <button type="submit"><FaPaperPlane /></button>
                    </form>
                </div>
            </div>
            <aside className="hc-home-side">
                <div className="hc-side-panel">
                    <div className="hc-side-title"><span className="hc-side-icon blue"><FaShieldAlt /></span><h3>How Zarvis helps</h3></div>
                    {[
                        "Checks administrator-approved answers.",
                        "If needed, checks the safe Miarcus project knowledge.",
                        "Uses conversation context for short follow-ups.",
                        "Answers general knowledge and coding questions through AI, while Miarcus facts remain grounded in project knowledge.",
                        "Choose a language or use Auto detect. Voice recognition availability depends on the browser and installed language support."
                    ].map((text, i) => <div className="hc-help-step" key={i}><b>{i + 1}</b><span>{text}</span></div>)}
                </div>
                <div className="hc-side-panel hc-try-panel">
                    <div className="hc-side-title"><span className="hc-side-icon yellow">💡</span><h3>Try asking</h3></div>
                    {SUGGESTIONS.map(q => <button key={q} onClick={() => { setBotQuestion(q); setTab("zarvis"); setTimeout(() => inputRef.current?.focus(), 50); }}>{q}<FaArrowRight /></button>)}
                </div>
            </aside>
        </section>
    );

    const renderHistory = () => (
        <section className="hc-history-page">
            <div className="hc-history-hero">
                <div className="hc-history-icon"><FaHistory /></div>
                <div>
                    <span className="hc-eyebrow">PRIVATE KNOWLEDGE TRAIL</span>
                    <h2>Your Zarvis history</h2>
                    <p>Every question you ask is stored only for your account. Other employees cannot see your questions or answers.</p>
                </div>
                <div className="hc-history-actions">
                    <span className="hc-history-count">{zarvisHistory.length} questions</span>
                    <button onClick={clearHistory} disabled={historyClearing || !zarvisHistory.length}>
                        <FaTrash /> {historyClearing ? "Clearing…" : "Clear history"}
                    </button>
                </div>
            </div>

            <div className="hc-history-note">
                <FaShieldAlt />
                <div><strong>Private to {effectiveUserName}</strong><span>This history is linked to your logged-in account, not a shared Help Center feed.</span></div>
            </div>

            {historyLoading ? (
                <div className="hc-history-loading"><PremiumLoader compact title="Loading your private history" /></div>
            ) : zarvisHistory.length ? (
                <div className="hc-history-list">
                    {zarvisHistory.map((item, index) => (
                        <article className="hc-history-card" key={item.id}>
                            <div className="hc-history-card-top">
                                <div className="hc-history-number">{String(zarvisHistory.length - index).padStart(2, "0")}</div>
                                <div className="hc-history-meta">
                                    <span>{item.module_name || "General Knowledge"}</span>
                                    <time>{new Date(item.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                                </div>
                                {item.confidence != null && <b>{Math.round(Number(item.confidence))}% confidence</b>}
                            </div>
                            <h3>{item.question}</h3>
                            <div className="hc-history-answer">{String(item.answer || "").slice(0, 700)}{String(item.answer || "").length > 700 ? "…" : ""}</div>
                            <div className="hc-history-card-bottom">
                                <span className={`hc-history-source ${String(item.source || "").replace(/_/g, "-")}`}>{String(item.source || "zarvis").replace(/_/g, " ")}</span>
                                <button onClick={() => {
                                    setBotQuestion(item.question);
                                    setTab("zarvis");
                                    setTimeout(() => inputRef.current?.focus(), 80);
                                }}><FaArrowRight /> Ask again</button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="hc-history-empty">
                    <div><FaHistory /></div>
                    <h3>Your question trail is empty</h3>
                    <p>Ask Zarvis something and your private conversation history will appear here.</p>
                    <button className="hc-primary" onClick={() => setTab("zarvis")}><FaRobot /> Ask Zarvis</button>
                </div>
            )}
        </section>
    );

    return <div className="help-center-page">
        <div className="hc-hero hc-hero-luna">
            <div className="hc-hero-copy"><div className="hc-kicker"><FaBolt/> MIARCUS CARE DESK</div><h1>Ask anything. Get it explained <em>clearly.</em></h1><p>{publicMode ? "Zarvis helps customers with administrator-approved answers and Miarcus product guidance, 24×7." : "Zarvis understands natural language, remembers the current conversation, explains Miarcus workflows, answers general questions and coding topics, and can hand you to a human when needed."}</p><div className="hc-hero-actions"><button onClick={()=>setTab("zarvis")} className="hc-hero-btn"><FaRobot/> Ask Zarvis <FaArrowRight/></button>{!publicMode&&<button onClick={()=>setTab("support")} className="hc-hero-link"><FaHeadset/> Human support</button>}</div></div>
            <div className="hc-hero-art"><img src="/zarvis-hero.svg" alt="Zarvis assistant"/><div className="hc-hero-status"><strong>Zarvis</strong><span><i/>24 × 7</span></div></div>
        </div>
        <div className="hc-tabs"><button className={tab==="home"?'active':''} onClick={()=>setTab("home")}><FaBookOpen/> Help Center</button><button className={tab==="zarvis"?'active':''} onClick={()=>setTab("zarvis")}><FaRobot/> Ask Zarvis</button>{!publicMode&&<button className={tab==="history"?'active':''} onClick={()=>setTab("history")}><FaHistory/> My History</button>}{!publicMode&&<button className={tab==="support"?'active':''} onClick={()=>setTab("support")}><FaHeadset/> My Support</button>}{isAdmin&&!publicMode&&<button className={tab==="admin"?'active':''} onClick={()=>setTab("admin")}><FaShieldAlt/> Admin Console</button>}</div>
        {toast && <div className="hc-toast" onClick={()=>setToast("")}>{toast}<FaTimes/></div>}
        {loading ? <div className="hc-loading"><PremiumLoader compact title="Loading your Help Center" /></div> : <>
            {tab==="home" && renderHome()}
            {tab==="zarvis" && <div className="hc-zarvis">
                <div className="hc-chat-card hc-chat-card-luna">
                    <div className="hc-chat-head"><div className="hc-avatar hc-avatar-z"><span>Z</span></div><div><strong>Zarvis</strong><span><i/> Online · Miarcus project assistant</span></div><div className="hc-chat-head-actions"><label className="hc-language-picker" title="Answer language"><FaGlobe/><select value={language} onChange={(e)=>setLanguage(e.target.value)} aria-label="Zarvis answer language">{ZARVIS_LANGUAGES.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button className={`hc-voice-toggle ${autoSpeak ? "active" : ""}`} onClick={()=>setAutoSpeak(v=>!v)} title={autoSpeak ? "Turn off automatic voice answers" : "Turn on automatic voice answers"}><FaVolumeUp/> {autoSpeak ? "Voice on" : "Voice"}</button><button onClick={clearChat} title="New chat"><FaHistory/> New chat</button><span className="hc-24">24×7</span></div></div>
                    <div className="hc-chat-body">{botMessages.map(m=><div key={m.id} className={`hc-msg ${m.from}`}>
                        {m.from==='zarvis'&&<div className="hc-mini-avatar"><span>Z</span></div>}
                        <div className="hc-bubble">
                            {m.from==='zarvis'&&m.source&&m.source!=="zarvis"&&<div className="hc-source"><span>{m.source==="knowledge_base"?"VERIFIED ANSWER":m.source==="knowledge_base_ai"?"VERIFIED + AI":m.source==="project_ai"?"PROJECT + AI":m.source==="general_ai"?"GENERAL AI":m.source==="conversation"?"CONVERSATION":"PROJECT KNOWLEDGE"}</span>{m.confidence && m.source!=="conversation" ? <b>{m.confidence}% confidence</b> : null}{m.module ? <em>{m.module}</em> : null}</div>}
                            <div className="hc-answer-content">{m.from==='zarvis' ? renderAnswer(m.text) : m.text}</div>
                            {m.from==='zarvis'&&<div className="hc-message-tools"><button onClick={()=>speak(m.text,m.id)} title="Read aloud">{speakingId===m.id?<FaStop/>:<FaVolumeUp/>}{speakingId===m.id?" Stop":" Read aloud"}</button><button onClick={()=>copyAnswer(m.text,m.id)} title="Copy answer">{copiedId===m.id?<FaCheck/>:<FaCopy/>}{copiedId===m.id?" Copied":" Copy"}</button></div>}
                            {m.related?.length>0&&<div className="hc-related"><small>You may also mean</small>{m.related.map((r,i)=><button key={r.id || `${m.id}-${i}`} onClick={()=>{setBotQuestion(r.question || r.title || "");setTab("zarvis");setTimeout(()=>inputRef.current?.focus(),50)}}>{r.question || r.title}<FaArrowRight/></button>)}</div>}
                            {m.from==='zarvis'&&m.resolved===false&&!publicMode&&<button className="hc-human-btn" onClick={()=>setTab("support")}><FaHeadset/> Talk to human support</button>}
                        </div>
                    </div>)}{botBusy&&<div className="hc-msg zarvis"><div className="hc-mini-avatar"><span>Z</span></div><div className="hc-bubble typing"><span>Zarvis is thinking</span><i/><i/><i/></div></div>}<div ref={chatEndRef}/></div>
                    <div className="hc-chat-helper"><FaRegLightbulb/><span>{isListening ? "Listening… speak now" : "Ask anything — Miarcus, coding, history, geography, science or everyday questions. Zarvis can answer in your selected language."}</span>{voiceSupported&&<b>Voice ready</b>} {!voiceSupported&&<b>Text mode</b>}</div>
                    <form className="hc-chat-input hc-chat-input-luna" onSubmit={submitBot}><button type="button" className={`hc-mic-btn ${isListening?'active':''}`} onClick={toggleVoiceInput} title={voiceSupported?"Speak your question":"Voice input unavailable"}><FaMicrophone/></button><input ref={inputRef} value={botQuestion} onChange={e=>setBotQuestion(e.target.value)} placeholder={isListening?"Listening…":"Message Zarvis…"}/><button type="submit" className="hc-send-btn" disabled={botBusy || !botQuestion.trim()}><FaPaperPlane/></button></form>
                    <div className="hc-suggestion-row">{SUGGESTIONS.map(q=><button key={q} onClick={()=>{setBotQuestion(q);setTimeout(()=>inputRef.current?.focus(),50)}}>{q}</button>)}</div>
                </div>
                <div className="hc-zarvis-side"><div className="hc-voice-assistant-card"><div className="hc-voice-assistant-orb"><span className={isListening ? "listening" : ""}><FaMicrophone /></span></div><div><span className="hc-voice-kicker">VOICE ASSISTANT</span><h3>{isListening ? "Listening to you…" : "Ask Zarvis by voice"}</h3><p>Tap the microphone, speak naturally, and let Zarvis answer. You can also hear the answer aloud.</p></div><button type="button" className={`hc-voice-main-btn ${isListening ? "active" : ""}`} onClick={()=>toggleVoiceInput()} disabled={!voiceSupported}><FaMicrophone /> {isListening ? "Listening" : "Start voice"}</button><div className="hc-voice-status"><span className={voiceSupported ? "ready" : ""}></span>{voiceSupported ? "Microphone ready" : "Use Chrome or Edge for voice input"}</div></div><div className="hc-trust hc-trust-luna"><div className="hc-trust-icon"><FaShieldAlt/></div><h3>How Zarvis answers</h3><p><b>1.</b> Checks administrator-approved answers.</p><p><b>2.</b> If needed, checks the safe Miarcus project knowledge.</p><p><b>3.</b> Uses conversation context for short follow-ups.</p><p><b>4.</b> It can answer broad general-knowledge and coding questions through AI, while Miarcus facts remain grounded in project knowledge.</p><p><b>5.</b> Choose a language or use Auto detect. Voice recognition availability depends on the browser and installed language support.</p></div><div className="hc-suggest"><span>TRY ASKING</span>{SUGGESTIONS.slice(0,4).map(q=><button key={q} onClick={()=>{setBotQuestion(q);setTimeout(()=>inputRef.current?.focus(),50)}}>{q}<FaArrowRight/></button>)}</div></div>
            </div>}
            {!publicMode && tab==="history" && renderHistory()}
            {!publicMode && tab==="support" && <div className="hc-support-layout"><div className="hc-panel"><div className="hc-panel-title"><span>My support requests</span><span className="hc-count">{tickets.length}</span></div>{tickets.length?tickets.map(t=><button className={`hc-ticket-item ${selectedTicket?.id===t.id?'selected':''}`} key={t.id} onClick={()=>openTicket(t.id)}><span>#{t.id}</span><div><strong>{t.subject}</strong><small>{t.status.replace("_"," ")} · {t.priority} · {new Date(t.last_message_at).toLocaleString()}</small></div><FaArrowRight/></button>):<div className="hc-empty small"><FaComments/><h3>No support requests yet</h3><p>Ask Zarvis first or open a human support request.</p></div>}</div><div className="hc-panel"><div className="hc-panel-title"><span>24×7 support</span></div>{selectedTicket?<TicketConversation ticket={selectedTicket} reply={ticketReply} setReply={setTicketReply} onSend={sendTicketReply}/>:<div className="hc-support-form"><div className="hc-support-badge"><FaHeadset/><span>Human support fallback</span></div><h2>Need a person?</h2><p>Send your question to the Miarcus support queue. You can continue the conversation here.</p><input value={ticketSubject} onChange={e=>setTicketSubject(e.target.value)} placeholder="Subject"/><textarea rows="7" value={ticketText} onChange={e=>setTicketText(e.target.value)} placeholder="Tell us what you need help with…"/><div className="hc-inline"><select value={ticketPriority} onChange={e=>setTicketPriority(e.target.value)}><option value="normal">Normal priority</option><option value="high">High priority</option><option value="urgent">Urgent</option><option value="low">Low</option></select><button className="hc-primary" onClick={requestHuman}>Send to support <FaPaperPlane/></button></div></div>}</div></div>}
            {!publicMode && tab==="admin" && isAdmin && renderAdmin()}
        </>}
    </div>;
}

function TicketConversation({ticket, reply, setReply, onSend}) { return <div className="hc-conversation"><div className="hc-conversation-meta"><span>#{ticket.id} · {ticket.status.replace("_"," ")}</span><b className={`priority ${ticket.priority}`}>{ticket.priority}</b></div><div className="hc-conversation-scroll">{(ticket.messages||[]).map(m=><div className={`hc-msg ${m.sender_type}`} key={m.id}><div className="hc-bubble"><small>{m.sender_type==='admin'?'Zarvis Support':m.sender_type==='zarvis'?'Zarvis':m.sender_name}</small><p>{m.message}</p><time>{new Date(m.created_at).toLocaleString()}</time></div></div>)}</div><div className="hc-chat-input"><input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend()}}} placeholder="Reply to support…"/><button onClick={onSend}><FaPaperPlane/></button></div></div>; }
function AdminTicketView({ticket,onReply,onStatus}) { const [msg,setMsg]=useState(""); if(!ticket)return <div className="hc-admin-ticket-empty"><FaHeadset/><h3>Select a request</h3><p>Choose a support request to reply manually as Zarvis Support.</p></div>; return <div className="hc-admin-ticket"><div className="hc-conversation-meta"><div><strong>#{ticket.id} · {ticket.subject}</strong><small>{ticket.user_name} · {ticket.user_email}</small></div><select value={ticket.status} onChange={e=>onStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div><div className="hc-conversation-scroll">{(ticket.messages||[]).map(m=><div className={`hc-msg ${m.sender_type}`} key={m.id}><div className="hc-bubble"><small>{m.sender_type==='admin'?'Zarvis Support':m.sender_name}</small><p>{m.message}</p><time>{new Date(m.created_at).toLocaleString()}</time></div></div>)}</div><div className="hc-chat-input"><input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Write a manual Zarvis Support reply…"/><button onClick={()=>{if(msg.trim()){onReply(msg.trim());setMsg("")}}}><FaPaperPlane/></button></div></div>; }

export default HelpCenter;
