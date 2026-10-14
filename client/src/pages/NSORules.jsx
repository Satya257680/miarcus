import React from "react";
import { FaStore, FaCalendarCheck, FaReceipt, FaCheckCircle, FaRoute } from "react-icons/fa";
import Card from "../components/common/Card";
import "../styles/NSORules.css";
import "../styles/premium/PagePremium.css";

const rules = [
  { icon: FaStore, title: "Actual Store Opening Date", badge: "Completion trigger", text: "Only the actual store-opening date can mark an NSO as Opened / Completed and set progress to 100%.", tone: "success" },
  { icon: FaCalendarCheck, title: "Possession Date", badge: "Milestone date", text: "Track the date possession is handed over. Possession alone does not mark the store as opened or completed.", tone: "info" },
  { icon: FaReceipt, title: "Billing Date", badge: "Independent milestone", text: "Billing progress is tracked separately. A billing date by itself must never mark the NSO as Opened / Completed or set progress to 100%.", tone: "warning" },
  { icon: FaRoute, title: "Progress Calculation", badge: "Date-driven", text: "NSO status and progress follow the configured store-opening milestones and dates. Checklist questions and checklist answers are managed separately in Issue Control Center.", tone: "info" },
];

export default function NSORules() {
  return <main className="nso-rules-page pp-premium nso-only-rules">
    <section className="nso-only-hero"><div className="nso-only-icon"><FaStore /></div><div><div className="nso-only-eyebrow">EXPANSION · ADMIN WORKSPACE</div><h1>NSO Rules</h1><p>Rules for New Store Opening milestones, status and progress. Checklist questions and Action Point triggers are not configured here.</p><span className="nso-only-tag">NSO WORKFLOW ONLY</span></div></section>
    <section className="nso-only-grid">{rules.map((rule)=>{const Icon=rule.icon;return <Card key={rule.title}><article className="nso-only-rule"><div className={`nso-only-rule-icon ${rule.tone}`}><Icon /></div><div className="nso-only-rule-copy"><span className={`nso-only-badge ${rule.tone}`}>{rule.badge}</span><h2>{rule.title}</h2><p>{rule.text}</p></div></article></Card>;})}</section>
    <div className="nso-only-note"><FaCheckCircle /><span><strong>Separation of responsibilities:</strong> Issue Control Center defines which checklist answers create Action Points. NSO Rules describes the NSO date/status rules only.</span></div>
  </main>;
}
