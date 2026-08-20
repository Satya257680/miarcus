import { useCallback, useEffect, useState } from "react";
import { FaSyncAlt, FaCheck, FaTimes } from "react-icons/fa";
import { approveTravelPlan, getTravelPlanApprovals, rejectTravelPlan } from "../../services/salesTeamService";
import { canEdit, canView } from "./salesTeamUtils";
import "../../styles/pages/SalesTeam.css";

function TravelPlanApprovals() {
  const permission = "Travel Plan Approvals";
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!canView(permission)) return; setLoading(true); try { const response = await getTravelPlanApprovals(); setItems(response.data?.data || []); } catch (e) { console.error(e); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (item, action) => { try { if (action === "approve") await approveTravelPlan(item.employee_id, item.month); else await rejectTravelPlan(item.employee_id, item.month); await load(); } catch (e) { alert(e.response?.data?.message || "Approval action failed."); } };
  if (!canView(permission)) return null;
  return <div className="sales-page approvals-page"><div className="sales-approval-header"><div><h1>Travel Plan Approvals</h1><p>Approve visit plans submitted by your direct reports. Admins see all pending plans.</p></div><button className="sales-btn primary-outline" onClick={load}><FaSyncAlt /> Refresh</button></div><div className="approval-list">{loading ? <div className="empty-approval">Loading...</div> : items.length === 0 ? <div className="empty-approval">No pending travel plans.</div> : items.map((item) => <div className="approval-card" key={`${item.employee_id}-${item.month}`}><div><h3>{item.name}</h3><strong>{item.month_label}</strong><p>{item.pending_days} day(s) in this month · pending approval</p></div>{canEdit(permission) && <div className="approval-actions"><button className="approve-btn" onClick={() => act(item, "approve")}><FaCheck /> Approve</button><button className="reject-btn" onClick={() => act(item, "reject")}><FaTimes /> Reject</button></div>}</div>)}</div></div>;
}
export default TravelPlanApprovals;
