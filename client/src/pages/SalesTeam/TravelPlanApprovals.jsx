import { useCallback, useEffect, useState } from "react";
import { FaCheck, FaClock, FaSyncAlt, FaTimes, FaUserTie } from "react-icons/fa";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { approveTravelPlan, getTravelPlanApprovals, rejectTravelPlan } from "../../services/salesTeamService";
import { canEdit, canView } from "./salesTeamUtils";
import "../../styles/pages/SalesTeam.css";

function TravelPlanApprovals() {
  const permission = "Travel Plan Approvals";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);

  const load = useCallback(async () => {
    if (!canView(permission)) return;
    setLoading(true);
    try {
      const response = await getTravelPlanApprovals();
      setItems(response.data?.data || []);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to load travel plan approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const askAction = (item, action) => setPendingAction({ item, action });

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { item, action } = pendingAction;
    try {
      if (action === "approve") await approveTravelPlan(item.employee_id, item.month);
      else await rejectTravelPlan(item.employee_id, item.month);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Approval action failed.");
    } finally {
      setPendingAction(null);
    }
  };

  if (!canView(permission)) return null;

  return (
    <div className="sales-page approvals-standard-page">
      <PageHeader
        title="Travel Plan Approvals"
        subtitle="Review pending travel plans. Approvers can only Approve or Reject a submitted plan."
        actions={<button type="button" className="header-refresh-btn" onClick={load}><FaSyncAlt /> Refresh</button>}
      />

      <Card title="Pending Approvals" subtitle={`${items.length} pending request${items.length === 1 ? "" : "s"}`}>
        {loading ? (
          <div className="sales-loading-state">Loading pending approvals...</div>
        ) : items.length === 0 ? (
          <div className="sales-empty-panel">
            <FaCheck />
            <h3>No pending travel plans</h3>
            <p>New plans will appear here after an employee submits them.</p>
          </div>
        ) : (
          <div className="approval-list">
            {items.map((item) => (
              <div className="approval-card" key={`${item.employee_id}-${item.month}`}>
                <div className="approval-person">
                  <div className="approval-avatar"><FaUserTie /></div>
                  <div>
                    <h3>{item.name}</h3>
                    <div className="approval-month"><FaClock /> {item.month_label}</div>
                    <p>{item.pending_days} day{Number(item.pending_days) === 1 ? "" : "s"} waiting for approval</p>
                  </div>
                </div>
                {canEdit(permission) && (
                  <div className="approval-actions">
                    <button type="button" className="approve-btn" onClick={() => askAction(item, "approve")}><FaCheck /> Approve</button>
                    <button type="button" className="reject-btn" onClick={() => askAction(item, "reject")}><FaTimes /> Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.action === "approve" ? "Approve Travel Plan" : "Reject Travel Plan"}
        message={pendingAction ? `${pendingAction.action === "approve" ? "Approve" : "Reject"} ${pendingAction.item.name}'s ${pendingAction.item.month_label} travel plan?` : ""}
        confirmText={pendingAction?.action === "approve" ? "Approve" : "Reject"}
        cancelText="Cancel"
        confirmVariant={pendingAction?.action === "approve" ? "success" : "danger"}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

export default TravelPlanApprovals;
