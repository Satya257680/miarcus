import React from "react";
import { FaProjectDiagram, FaCheckCircle, FaClock, FaCircle, FaMagic, FaPen } from "react-icons/fa";
import "../../styles/AddNewStoreOpeningModal.css";

const milestones = [
    [1,"Layout By NSO","layout_by_nso"],[2,"Revised Layout","revised_layout_by_nso"],[3,"Approval","approval_deadline"],[4,"Visit By OP","visit_by_op_team"],[5,"GST","gst_deadline"],[6,"HR Hiring","hr_hiring_deadline"],[7,"Team Training","team_training_deadline"],[8,"NSO Visit","visit_by_nso_team_deadline"],[9,"Plan Of Stock","plan_of_stock_deadline"],[10,"Collaterals","plan_of_collaterals_deadline"],[11,"Field Training","on_field_training_deadline"],[12,"Dispatch","dispatch_stock_deadline"],[13,"NSO Handover","nso_handover_deadline"],[14,"VM Handover","vm_handover_deadline"],[15,"Scanning","scanning_deadline"],[16,"Billing","billing_start_date"]
];
const formatDate = value => {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
};
const isCompleted = value => {
    if (!value) return false;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return date <= today;
};

export default function TimelinePreview({ formData = {}, handleChange }) {
    const manual = String(formData.timeline_mode || "automatic").toLowerCase() === "manual";
    const setMode = mode => handleChange({ target: { name: "timeline_mode", value: mode } });
    return (
        <div className="nso-card">
            <div className="nso-card-header"><div><FaProjectDiagram /></div><div><h2>Project Timeline</h2><p>{manual ? "Enter each milestone date manually." : "Milestones are calculated automatically from the possession date."}</p></div></div>
            <div className="nso-timeline-mode">
                <button type="button" className={!manual ? "active" : ""} onClick={() => setMode("automatic")}><FaMagic /> Automatic</button>
                <button type="button" className={manual ? "active" : ""} onClick={() => setMode("manual")}><FaPen /> Manual</button>
            </div>
            {manual && <div className="nso-timeline-help">Manual mode keeps exactly the dates you enter and will not regenerate them when possession dates change.</div>}
            <div className="timeline-list">
                {milestones.map(([id,title,field], index) => {
                    const value = formData[field];
                    const completed = isCompleted(value);
                    return <div key={id} className="timeline-item">
                        <div className="timeline-icon">{completed ? <FaCheckCircle className="completed"/> : value ? <FaClock className="pending"/> : <FaCircle className="waiting"/>}</div>
                        <div className="timeline-content"><h4>{title}</h4>{manual ? <input className="nso-timeline-date" type="date" name={field} value={value || ""} onChange={handleChange}/> : <span>{value ? formatDate(value) : "Not Generated"}</span>}</div>
                        {index < milestones.length - 1 && <div className="timeline-line"/>}
                    </div>;
                })}
            </div>
        </div>
    );
}
