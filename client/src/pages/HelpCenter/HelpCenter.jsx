import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    FaArrowRight, FaBookOpen, FaChevronDown, FaClock, FaComments,
    FaHeadset, FaPlus, FaRobot, FaSearch, FaShieldAlt, FaTimes,
    FaUserTie, FaPaperPlane, FaEdit, FaTrash, FaBolt
} from "react-icons/fa";
import {
    askZarvis, askPublicZarvis, createHelpTicket, getAdminHelpArticles, getAdminHelpTickets,
    getPublicHelpArticles,
    getHelpArticles, getHelpTicket, getMyHelpTickets, replyHelpTicket,
    createAdminHelpArticle, updateAdminHelpArticle, deleteAdminHelpArticle,
    updateAdminHelpTicket
} from "../../services/helpCenterService";
import "../../styles/pages/HelpCenter.css";

const emptyForm = { title: "", question: "", answer: "", category: "General", keywords: "", audience: "both", status: "published", sort_order: 0 };
const userFromStorage = () => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } };

function HelpCenter({ publicMode = false }) {
    const user = userFromStorage();
    const effectiveUserName = publicMode ? "there" : (user?.name || "there");
    const isAdmin = [true, 1, "1"].includes(user?.administrator) || [true, 1, "1"].includes(user?.is_admin);
    const params = new URLSearchParams(window.location.search);
    const [tab, setTab] = useState(publicMode ? "home" : (params.get("tab") === "support" ? "support" : "home"));
    const [articles, setArticles] = useState([]);
    const [adminArticles, setAdminArticles] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [adminTickets, setAdminTickets] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [openId, setOpenId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [botQuestion, setBotQuestion] = useState("");
    const [botMessages, setBotMessages] = useState([{ id: "welcome", from: "zarvis", text: `Hi ${effectiveUserName}! I'm Zarvis, your Miarcus Help Assistant. I search administrator-approved answers first, then the current Miarcus project knowledge so I can explain where features live and how they work.` }]);
    const [botBusy, setBotBusy] = useState(false);
    const [ticketSubject, setTicketSubject] = useState("");
    const [ticketText, setTicketText] = useState("");
    const [ticketPriority, setTicketPriority] = useState("normal");
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [ticketReply, setTicketReply] = useState("");
    const [adminStatus, setAdminStatus] = useState("all");
    const [articleForm, setArticleForm] = useState(emptyForm);
    const [editingArticle, setEditingArticle] = useState(null);
    const [toast, setToast] = useState("");
    const chatEndRef = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            const a = publicMode ? await getPublicHelpArticles() : await getHelpArticles();
            const t = publicMode ? { data: { tickets: [] } } : await getMyHelpTickets();
            setArticles(a.data?.articles || []); setTickets(t.data?.tickets || []);
            if (isAdmin && !publicMode) {
                const [aa, at] = await Promise.all([getAdminHelpArticles(), getAdminHelpTickets(adminStatus)]);
                setAdminArticles(aa.data?.articles || []); setAdminTickets(at.data?.tickets || []);
            }
        } catch (e) { setToast(e?.response?.data?.message || "Unable to load Help Center."); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [adminStatus]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [botMessages]);

    const categories = useMemo(() => ["All", ...new Set(articles.map(a => a.category).filter(Boolean))], [articles]);
    const filtered = useMemo(() => articles.filter(a => {
        const hay = `${a.title} ${a.question} ${a.answer} ${a.keywords || ""}`.toLowerCase();
        return (category === "All" || a.category === category) && (!search.trim() || hay.includes(search.toLowerCase().trim()));
    }), [articles, category, search]);

    const submitBot = async (e) => {
        e?.preventDefault();
        const q = botQuestion.trim(); if (!q || botBusy) return;
        setBotMessages(m => [...m, { id: `${Date.now()}u`, from: "user", text: q }]); setBotQuestion(""); setBotBusy(true);
        try {
            const res = publicMode ? await askPublicZarvis(q) : await askZarvis(q); const data = res.data || {};
            setBotMessages(m => [...m, { id: `${Date.now()}z`, from: "zarvis", text: data.message, resolved: data.resolved, source: data.source, confidence: data.confidence, module: data.module, related: data.related || [] }]);
        } catch (e2) { setBotMessages(m => [...m, { id: `${Date.now()}e`, from: "zarvis", text: e2?.response?.data?.message || "Zarvis is temporarily unavailable. Please try again." }]); }
        finally { setBotBusy(false); }
    };

    const requestHuman = async () => {
        if (!ticketText.trim()) { setToast("Describe what you need help with first."); return; }
        try {
            const r = await createHelpTicket({ subject: ticketSubject.trim() || "Help Center Support", question: ticketText.trim(), priority: ticketPriority });
            setSelectedTicket(r.data?.ticket || null);  setTicketText(""); setTicketSubject("");
            setToast("Support request sent. An administrator can reply here."); await load(); setTab("support");
        } catch (e) { setToast(e?.response?.data?.message || "Could not create support request."); }
    };

    const openTicket = async (id) => { try { const r = await getHelpTicket(id); setSelectedTicket(r.data.ticket); } catch (e) { setToast("Could not open support request."); } };
    const sendTicketReply = async () => {
        if (!selectedTicket || !ticketReply.trim()) return;
        try { const r = await replyHelpTicket(selectedTicket.id, ticketReply.trim()); setSelectedTicket(r.data.ticket); setTicketReply(""); await load(); } catch (e) { setToast(e?.response?.data?.message || "Reply failed."); }
    };

    const saveArticle = async () => {
        try {
            if (editingArticle) await updateAdminHelpArticle(editingArticle.id, articleForm);
            else await createAdminHelpArticle(articleForm);
            setArticleForm(emptyForm); setEditingArticle(null); setToast(editingArticle ? "Help answer updated." : "Help answer published."); await load();
        } catch (e) { setToast(e?.response?.data?.message || "Could not save help answer."); }
    };
    const removeArticle = async (id) => { if (!window.confirm("Delete this Help Center answer?")) return; try { await deleteAdminHelpArticle(id); await load(); setToast("Help answer deleted."); } catch (e) { setToast("Could not delete answer."); } };
    const startEdit = (a) => { setEditingArticle(a); setArticleForm({ title:a.title, question:a.question, answer:a.answer, category:a.category, keywords:a.keywords || "", audience:a.audience, status:a.status, sort_order:a.sort_order }); window.scrollTo({top:0, behavior:"smooth"}); };
    const updateTicket = async (ticket, patch) => { try { await updateAdminHelpTicket(ticket.id, { status: patch.status || ticket.status, priority: patch.priority || ticket.priority, assigned_to: ticket.assigned_to }); await load(); if (selectedTicket?.id === ticket.id) await openTicket(ticket.id); } catch { setToast("Could not update support request."); } };

    const renderAdmin = () => (
        <section className="hc-admin">
            <div className="hc-section-head"><div><span className="hc-eyebrow">ADMIN CONTROL ROOM</span><h2>Knowledge & Support</h2><p>Publish verified answers for Zarvis and reply to employee support requests.</p></div><div className="hc-live"><span />24×7 HELP CENTER</div></div>
            <div className="hc-admin-grid">
                <div className="hc-panel">
                    <div className="hc-panel-title"><span>{editingArticle ? "Edit verified answer" : "Add verified answer"}</span>{editingArticle && <button className="hc-icon-btn" onClick={() => {setEditingArticle(null);setArticleForm(emptyForm)}}><FaTimes /></button>}</div>
                    <div className="hc-form-grid">
                        <label>Title<input value={articleForm.title} onChange={e=>setArticleForm({...articleForm,title:e.target.value})} placeholder="e.g. How do I reset my password?" /></label>
                        <label>Category<input value={articleForm.category} onChange={e=>setArticleForm({...articleForm,category:e.target.value})} placeholder="Login & Security" /></label>
                        <label className="span-2">Question<input value={articleForm.question} onChange={e=>setArticleForm({...articleForm,question:e.target.value})} placeholder="Exact or natural-language question employees/customers may ask" /></label>
                        <label className="span-2">Answer<textarea rows="6" value={articleForm.answer} onChange={e=>setArticleForm({...articleForm,answer:e.target.value})} placeholder="The approved answer Zarvis is allowed to provide" /></label>
                        <label>Keywords<input value={articleForm.keywords} onChange={e=>setArticleForm({...articleForm,keywords:e.target.value})} placeholder="password, reset, login" /></label>
                        <label>Audience<select value={articleForm.audience} onChange={e=>setArticleForm({...articleForm,audience:e.target.value})}><option value="both">Employees + Customers</option><option value="employee">Employees</option><option value="customer">Customers</option></select></label>
                        <label>Status<select value={articleForm.status} onChange={e=>setArticleForm({...articleForm,status:e.target.value})}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
                    </div>
                    <button className="hc-primary" onClick={saveArticle}><FaPlus /> {editingArticle ? "Update Answer" : "Publish Answer"}</button>
                </div>
                <div className="hc-panel">
                    <div className="hc-panel-title"><span>Knowledge base</span><span className="hc-count">{adminArticles.length} answers</span></div>
                    <div className="hc-admin-list">{adminArticles.map(a=><div className="hc-admin-row" key={a.id}><div><strong>{a.title}</strong><small>{a.category} · {a.audience} · {a.status}</small></div><div className="hc-row-actions"><button onClick={()=>startEdit(a)} title="Edit"><FaEdit/></button><button onClick={()=>removeArticle(a.id)} title="Delete"><FaTrash/></button></div></div>)}</div>
                </div>
            </div>
            <div className="hc-panel hc-ticket-panel"><div className="hc-panel-title"><span>Manual Zarvis support queue</span><select value={adminStatus} onChange={e=>setAdminStatus(e.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
                <div className="hc-ticket-admin-grid"><div className="hc-ticket-list">{adminTickets.map(t=><button key={t.id} className={`hc-ticket-item ${selectedTicket?.id===t.id?'selected':''}`} onClick={()=>openTicket(t.id)}><span>#{t.id}</span><div><strong>{t.subject}</strong><small>{t.user_name} · {t.status.replace("_"," ")}</small></div><b className={`priority ${t.priority}`}>{t.priority}</b></button>)}</div><AdminTicketView ticket={selectedTicket} onReply={async (msg)=>{try{const r=await replyHelpTicket(selectedTicket.id,msg);setSelectedTicket(r.data.ticket);await load()}catch{setToast("Reply failed.")}}} onStatus={(s)=>selectedTicket && updateTicket(selectedTicket,{status:s})}/></div>
            </div>
        </section>
    );

    return <div className="help-center-page">
        <div className="hc-hero"><div className="hc-hero-copy"><div className="hc-kicker"><FaBolt/> MIARCUS CARE DESK</div><h1>Help that keeps you moving.</h1><p>{publicMode ? "Get instant answers from Zarvis and explore verified Miarcus guides. This customer help desk is available 24×7." : "Get instant answers from Zarvis, explore administrator-approved guides, or connect with your support team when you need a human response."}</p><div className="hc-hero-actions"><button onClick={()=>setTab("zarvis")} className="hc-hero-btn"><FaRobot/> Ask Zarvis <FaArrowRight/></button><button onClick={()=>setTab("support")} className="hc-hero-link" style={{display:publicMode?"none":"flex"}}><FaHeadset/> Human support</button></div></div><div className="hc-orb"><div className="hc-orb-inner"><FaRobot/><strong>Z</strong><span>24×7</span></div></div></div>
        <div className="hc-tabs"><button className={tab==="home"?'active':''} onClick={()=>setTab("home")}><FaBookOpen/> Help Center</button><button className={tab==="zarvis"?'active':''} onClick={()=>setTab("zarvis")}><FaRobot/> Ask Zarvis</button>{!publicMode&&<button className={tab==="support"?'active':''} onClick={()=>setTab("support")}><FaHeadset/> My Support</button>}{isAdmin&&!publicMode&&<button className={tab==="admin"?'active':''} onClick={()=>setTab("admin")}><FaShieldAlt/> Admin Console</button>}</div>
        {toast && <div className="hc-toast" onClick={()=>setToast("")}>{toast}<FaTimes/></div>}
        {loading ? <div className="hc-loading"><span className="hc-spinner"/> Loading your Help Center…</div> : <>
        {tab==="home" && <>
            <div className="hc-search-wrap"><FaSearch/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search guides, policies, how-to answers…"/><span>{filtered.length} guides</span></div>
            <div className="hc-category-row">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
            <div className="hc-feature-row"><div><FaRobot/><div><strong>Zarvis answers first</strong><span>Verified FAQs are checked before project knowledge.</span></div></div><div><FaClock/><div><strong>Always available</strong><span>Self-service help is available 24×7.</span></div></div><div><FaUserTie/><div><strong>Human fallback</strong><span>Open a support request when needed.</span></div></div></div>
            <div className="hc-articles">{filtered.map(a=><article className={`hc-faq ${openId===a.id?'open':''}`} key={a.id}><button onClick={()=>setOpenId(openId===a.id?null:a.id)}><span className="hc-faq-icon"><FaBookOpen/></span><span><small>{a.category}</small><strong>{a.question}</strong></span><FaChevronDown/></button>{openId===a.id&&<div className="hc-answer"><p>{a.answer}</p><button onClick={()=>{setBotQuestion(a.question);setTab("zarvis")}}>Ask Zarvis about this <FaArrowRight/></button></div>}</article>)}{!filtered.length&&<div className="hc-empty"><FaSearch/><h3>No matching guide</h3><p>Ask Zarvis using natural language. If there is no verified answer, you can request human support.</p><button onClick={()=>setTab("zarvis")} className="hc-primary">Ask Zarvis</button></div>}</div>
        </>}
        {tab==="zarvis" && <div className="hc-zarvis"><div className="hc-chat-card"><div className="hc-chat-head"><div className="hc-avatar"><FaRobot/></div><div><strong>Zarvis</strong><span><i/> Verified Miarcus assistant</span></div><span className="hc-24">24×7</span></div><div className="hc-chat-body">{botMessages.map(m=><div key={m.id} className={`hc-msg ${m.from}`}>{m.from==='zarvis'&&<div className="hc-mini-avatar"><FaRobot/></div>}<div className="hc-bubble">{m.from==='zarvis'&&m.source&&m.source!=="zarvis"&&<div className="hc-source"><span>{m.source==="knowledge_base"?"VERIFIED ANSWER":"PROJECT KNOWLEDGE"}</span>{m.confidence ? <b>{m.confidence}% match</b> : null}{m.module ? <em>{m.module}</em> : null}</div>}{m.text}{m.related?.length>0&&<div className="hc-related"><small>Related verified answers</small>{m.related.map(r=><button key={r.id} onClick={()=>{setBotQuestion(r.question);setTab("zarvis")}}>{r.question}<FaArrowRight/></button>)}</div>}{m.from==='zarvis'&&m.resolved===false&&!publicMode&&<button className="hc-human-btn" onClick={()=>{setTab("support")}}><FaHeadset/> Request human support</button>}</div></div>)}{botBusy&&<div className="hc-msg zarvis"><div className="hc-mini-avatar"><FaRobot/></div><div className="hc-bubble typing"><i/><i/><i/></div></div>}<div ref={chatEndRef}/></div><form className="hc-chat-input" onSubmit={submitBot}><input value={botQuestion} onChange={e=>setBotQuestion(e.target.value)} placeholder="Ask anything about Miarcus…"/><button disabled={botBusy}><FaPaperPlane/></button></form></div><div className="hc-zarvis-side"><div className="hc-trust"><FaShieldAlt/><h3>Verified + project-aware</h3><p>Zarvis checks administrator-approved Help Center answers first. If there is no matching FAQ, it searches a safe product map of the current Miarcus modules, screens, routes and workflows. It never exposes source code, secrets or private configuration.</p></div><div className="hc-suggest"><span>TRY ASKING</span>{["How do I reset my password?","How can I raise an action point?","Where can I see my reports?"].map(q=><button key={q} onClick={()=>setBotQuestion(q)}>{q}<FaArrowRight/></button>)}</div></div></div>}
        {!publicMode && tab==="support" && <div className="hc-support-layout"><div className="hc-panel"><div className="hc-panel-title"><span>My support requests</span><span className="hc-count">{tickets.length}</span></div>{tickets.length?tickets.map(t=><button className={`hc-ticket-item ${selectedTicket?.id===t.id?'selected':''}`} key={t.id} onClick={()=>openTicket(t.id)}><span>#{t.id}</span><div><strong>{t.subject}</strong><small>{t.status.replace("_"," ")} · {t.priority} · {new Date(t.last_message_at).toLocaleString()}</small></div><FaArrowRight/></button>):<div className="hc-empty small"><FaComments/><h3>No support requests yet</h3><p>Ask Zarvis first or open a human support request.</p></div>}</div><div className="hc-panel"><div className="hc-panel-title"><span>24×7 support</span></div>{selectedTicket?<TicketConversation ticket={selectedTicket} reply={ticketReply} setReply={setTicketReply} onSend={sendTicketReply}/>:<div className="hc-support-form"><div className="hc-support-badge"><FaHeadset/><span>Human support fallback</span></div><h2>Need a person?</h2><p>Send your question to the Miarcus support queue. You can continue the conversation here.</p><input value={ticketSubject} onChange={e=>setTicketSubject(e.target.value)} placeholder="Subject"/><textarea rows="7" value={ticketText} onChange={e=>setTicketText(e.target.value)} placeholder="Tell us what you need help with…"/><div className="hc-inline"><select value={ticketPriority} onChange={e=>setTicketPriority(e.target.value)}><option value="normal">Normal priority</option><option value="high">High priority</option><option value="urgent">Urgent</option><option value="low">Low</option></select><button className="hc-primary" onClick={requestHuman}>Send to support <FaPaperPlane/></button></div></div>}</div></div>}
        {!publicMode && tab==="admin" && isAdmin && renderAdmin()}
        </>}
    </div>;
}

function TicketConversation({ticket, reply, setReply, onSend}) { return <div className="hc-conversation"><div className="hc-conversation-meta"><span>#{ticket.id} · {ticket.status.replace("_"," ")}</span><b className={`priority ${ticket.priority}`}>{ticket.priority}</b></div><div className="hc-conversation-scroll">{(ticket.messages||[]).map(m=><div className={`hc-msg ${m.sender_type}`} key={m.id}><div className="hc-bubble"><small>{m.sender_type==='admin'?'Zarvis Support':m.sender_type==='zarvis'?'Zarvis':m.sender_name}</small><p>{m.message}</p><time>{new Date(m.created_at).toLocaleString()}</time></div></div>)}</div><div className="hc-chat-input"><input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend()}}} placeholder="Reply to support…"/><button onClick={onSend}><FaPaperPlane/></button></div></div> }
function AdminTicketView({ticket,onReply,onStatus}) { const [msg,setMsg]=useState(""); if(!ticket)return <div className="hc-admin-ticket-empty"><FaHeadset/><h3>Select a request</h3><p>Choose a support request to reply manually as Zarvis Support.</p></div>; return <div className="hc-admin-ticket"><div className="hc-conversation-meta"><div><strong>#{ticket.id} · {ticket.subject}</strong><small>{ticket.user_name} · {ticket.user_email}</small></div><select value={ticket.status} onChange={e=>onStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div><div className="hc-conversation-scroll">{(ticket.messages||[]).map(m=><div className={`hc-msg ${m.sender_type}`} key={m.id}><div className="hc-bubble"><small>{m.sender_type==='admin'?'Zarvis Support':m.sender_name}</small><p>{m.message}</p><time>{new Date(m.created_at).toLocaleString()}</time></div></div>)}</div><div className="hc-chat-input"><input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Write a manual Zarvis Support reply…"/><button onClick={()=>{if(msg.trim()){onReply(msg.trim());setMsg("")}}}><FaPaperPlane/></button></div></div> }

export default HelpCenter;
