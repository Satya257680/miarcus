import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaStore, FaReceipt, FaCheckCircle, FaRoute, FaArrowRight, FaChartLine, FaClipboardList, FaSyncAlt, FaClock, FaLayerGroup } from "react-icons/fa";
import Card from "../components/common/Card";
import { getNewStoreOpenings } from "../services/newStoreOpeningService";
import { unwrapList, trackingStatus, progressFor, storeName, storeCode, todayYmd } from "../utils/nsoTracking";
import "../styles/NSORules.css";
import "../styles/premium/PagePremium.css";
import runAfterCommit from "../utils/runAfterCommit";

const workflow = [
  { icon: FaStore, step: "01", title: "Create New Store Opening", text: "Create the NSO project and enter store details, possession date, planned milestone dates, billing date and actual opening date.", link: "/new-store-openings", action: "Open New Store Openings", tone: "violet" },
  { icon: FaRoute, step: "02", title: "Track the project", text: "NSO Tracking reads the same New Store Opening records and shows status, progress, region, planned date and project details.", link: "/nso-tracking", action: "Open NSO Tracking", tone: "blue" },
  { icon: FaChartLine, step: "03", title: "Calculate progress", text: "Progress is derived from the project's current status and recorded milestone dates. It is capped below 100% until the actual opening date is reached.", link: "/nso-tracking", action: "View progress", tone: "green" },
  { icon: FaCheckCircle, step: "04", title: "Mark opened / completed", text: "Only the actual store-opening date marks the project Completed and sets progress to 100%. Possession or billing dates alone do not complete the NSO.", link: "/nso-tracking", action: "Review completion status", tone: "amber" },
];

const milestones = [
  ["Layout & approval", "Layout by NSO, revised layout and approval"],
  ["Store readiness", "Operations visit, GST, HR hiring and team training"],
  ["Stock & handover", "Stock plan, collaterals, dispatch, NSO and VM handover"],
  ["Final readiness", "Scanning, billing start and actual store-opening date"],
];

export default function NSORules() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try { const response = await getNewStoreOpenings({ page: 1, limit: 100000 }); setProjects(unwrapList(response)); setError(""); }
    catch (e) { setError(e.response?.data?.message || "Could not load New Store Opening projects. Workflow guidance is still available below."); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => runAfterCommit(() => { load(); }), []);
  const stats = useMemo(() => {
    const states = projects.map((project) => ({ project, status: trackingStatus(project), progress: progressFor(project) }));
    return {
      total: states.length,
      completed: states.filter((x) => x.status === "Completed").length,
      inProgress: states.filter((x) => x.status === "In Progress").length,
      delayed: states.filter((x) => x.status === "Delayed").length,
      planning: states.filter((x) => x.status === "Planning").length,
      average: states.length ? Math.round(states.reduce((sum, x) => sum + x.progress, 0) / states.length) : 0,
      recent: states.filter((x) => x.status !== "Completed").sort((a, b) => Number(b.project.id) - Number(a.project.id)).slice(0, 5),
    };
  }, [projects]);
  const today = todayYmd();

  return <main className="nso-rules-page pp-premium nso-workflow-page">
    <section className="nso-workflow-hero"><div className="nso-workflow-hero-icon"><FaStore /></div><div className="nso-workflow-hero-copy"><span className="nso-workflow-eyebrow">EXPANSION · PROJECT GOVERNANCE</span><h1>NSO Rules & Workflow</h1><p>One connected process: create a New Store Opening, maintain its milestone dates, and track the live progress through NSO Tracking.</p><div className="nso-workflow-hero-pills"><span><FaLayerGroup /> New Store Opening → NSO Tracking</span><span><FaCheckCircle /> Actual opening date completes the project</span></div></div><div className="nso-workflow-hero-actions"><button type="button" onClick={() => navigate("/new-store-openings")}><FaPlusFallback /> New Store Opening</button><button type="button" className="secondary" onClick={() => navigate("/nso-tracking")}>Track projects <FaArrowRight /></button></div></section>
    {error && <div className="nso-workflow-error">{error}</div>}
    <section className="nso-workflow-stats">
      <article><span className="nso-wf-stat-icon violet"><FaStore /></span><div><small>Total NSO projects</small><strong>{loading ? "—" : stats.total}</strong><em>From New Store Openings</em></div></article>
      <article><span className="nso-wf-stat-icon green"><FaCheckCircle /></span><div><small>Completed</small><strong>{loading ? "—" : stats.completed}</strong><em>Actual opening reached</em></div></article>
      <article><span className="nso-wf-stat-icon blue"><FaChartLine /></span><div><small>Average progress</small><strong>{loading ? "—" : `${stats.average}%`}</strong><em>Based on current NSO data</em></div></article>
      <article><span className="nso-wf-stat-icon amber"><FaClock /></span><div><small>Delayed</small><strong>{loading ? "—" : stats.delayed}</strong><em>Past planned date, not opened</em></div></article>
    </section>
    <section className="nso-workflow-section-head"><div><span className="nso-workflow-eyebrow">HOW THE MODULES CONNECT</span><h2>NSO operating flow</h2><p>These pages work with the same store-opening records; this page documents the rules and provides shortcuts.</p></div><button type="button" onClick={() => load(true)} disabled={refreshing}><FaSyncAlt className={refreshing ? "nso-spinning" : ""} /> {refreshing ? "Refreshing…" : "Refresh data"}</button></section>
    <section className="nso-workflow-grid">{workflow.map((item) => { const Icon = item.icon; return <Card key={item.step}><article className="nso-workflow-card"><div className={`nso-wf-icon ${item.tone}`}><Icon /></div><span className="nso-wf-step">STEP {item.step}</span><h2>{item.title}</h2><p>{item.text}</p><button type="button" onClick={() => navigate(item.link)}>{item.action}<FaArrowRight /></button></article></Card>; })}</section>
    <section className="nso-workflow-lower-grid"><Card><div className="nso-workflow-panel-head"><div><span className="nso-workflow-eyebrow">MILESTONE LOGIC</span><h2>Project readiness stages</h2></div><FaClipboardList /></div><div className="nso-milestone-list">{milestones.map(([title, text], index) => <div className="nso-milestone-row" key={title}><span className="nso-milestone-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div><div className="nso-workflow-note"><FaReceipt /><span><strong>Billing date is independent.</strong> It records billing readiness but does not, by itself, complete the NSO.</span></div></Card>
      <Card><div className="nso-workflow-panel-head"><div><span className="nso-workflow-eyebrow">LIVE PROJECT SNAPSHOT</span><h2>Projects needing attention</h2></div><button type="button" className="nso-text-link" onClick={() => navigate("/nso-tracking")}>View all <FaArrowRight /></button></div>{loading ? <div className="nso-workflow-empty">Loading NSO projects…</div> : stats.recent.length ? <div className="nso-recent-list">{stats.recent.map(({ project, status, progress }) => <button type="button" className="nso-recent-row" key={project.id} onClick={() => navigate(`/nso-tracking/${project.id}`)}><span className="nso-recent-store"><b>{storeName(project)}</b><small>{storeCode(project)}</small></span><span className={`nso-recent-status ${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span><span className="nso-recent-progress"><span><i style={{ width: `${progress}%` }} /></span><b>{progress}%</b></span></button>)}</div> : <div className="nso-workflow-empty"><FaStore /><strong>No open NSO projects</strong><span>Create a project in New Store Openings to start tracking.</span><button type="button" onClick={() => navigate("/new-store-openings")}>Create first project <FaArrowRight /></button></div>}</Card></section>
    <section className="nso-workflow-footer"><div><span className="nso-workflow-eyebrow">SYSTEM RULE</span><h2>100% means the store has actually opened</h2><p>Possession, billing, and other milestone dates can increase readiness, but they cannot independently set the project to Opened / Completed.</p></div><div className="nso-workflow-footer-mark"><FaCheckCircle /><strong>Actual opening date</strong><span>Completion trigger</span></div></section>
    <span className="nso-workflow-today">Last page refresh uses current NSO records · {today}</span>
  </main>;
}

function FaPlusFallback() { return <span aria-hidden="true">＋</span>; }
