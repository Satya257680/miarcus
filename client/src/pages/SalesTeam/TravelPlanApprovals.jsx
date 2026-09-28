import PremiumLoader from "../../components/premium/PremiumLoader";
import { useCallback, useEffect, useState } from "react";

import {
  FaCheck,
  FaClock,
  FaSyncAlt,
  FaTimes,
  FaUserTie,
  FaExclamationTriangle,
  FaClipboardCheck,
  FaUsers,
  FaCalendarDay,
} from "react-icons/fa";

import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import {
  approveTravelPlan,
  getTravelPlanApprovals,
  rejectTravelPlan,
} from "../../services/salesTeamService";

import {
  canEdit,
  canView,
} from "./salesTeamUtils";

import "../../styles/pages/SalesTeam.css";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import InsightStrip from "../../components/premium/InsightStrip";
import { initials, avatarTone, formatCount } from "../../utils/premiumFormat";

/* =========================================================
   TRAVEL PLAN APPROVALS
========================================================= */

function TravelPlanApprovals() {
  const permission =
    "Travel Plan Approvals";

  const [items, setItems] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [pendingAction, setPendingAction] =
    useState(null);

  const [rejectReason, setRejectReason] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  /* =======================================================
     LOAD APPROVALS
  ======================================================= */

  const load = useCallback(
    async (showRefresh = false) => {
      if (!canView(permission)) {
        setLoading(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response =
          await getTravelPlanApprovals();

        const data =
          response?.data?.data;

        setItems(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Unable to load travel plan approvals:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Unable to load travel plan approvals."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================
     OPEN CONFIRMATION
  ======================================================= */

  const askAction = (
    item,
    action
  ) => {
    setRejectReason("");

    setPendingAction({
      item,
      action,
    });
  };

  /* =======================================================
     CLOSE CONFIRMATION
  ======================================================= */

  const closeAction = () => {
    if (processing) {
      return;
    }

    setPendingAction(null);
    setRejectReason("");
  };

  /* =======================================================
     CONFIRM APPROVE / REJECT
  ======================================================= */

  const confirmAction =
    async () => {
      if (
        !pendingAction ||
        processing
      ) {
        return;
      }

      const {
        item,
        action,
      } = pendingAction;

      if (
        action === "reject" &&
        !rejectReason.trim()
      ) {
        alert(
          "Please enter a rejection reason."
        );

        return;
      }

      setProcessing(true);

      try {
        if (
          action === "approve"
        ) {
          await approveTravelPlan(
            item.employee_id,
            item.month
          );
        } else {
          await rejectTravelPlan(
            item.employee_id,
            item.month,
            rejectReason.trim()
          );
        }

        setPendingAction(null);
        setRejectReason("");

        /*
          Reload the list after successful
          approval/rejection.
        */
        await load();
      } catch (error) {
        console.error(
          "Travel plan approval action failed:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Approval action failed."
        );
      } finally {
        setProcessing(false);
      }
    };

  /* =======================================================
     PERMISSION
  ======================================================= */

  if (!canView(permission)) {
    return null;
  }

  const isRejecting =
    pendingAction?.action ===
    "reject";

  const isApproving =
    pendingAction?.action ===
    "approve";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="sales-page approvals-standard-page pp-premium">

      {/* =================================================
          PREMIUM HERO
      ================================================= */}

      <PremiumHero
        icon={FaClipboardCheck}
        eyebrow="Sales Team · Approvals"
        title="Travel Plan Approvals"
        badge="Approvers"
        subtitle="Review submitted Sales Team travel plans. Approvers can only Approve or Reject pending requests."
        meta={[
          { label: "Pending", value: loading ? null : formatCount(items.length) }
        ]}
        actions={
          <button
            type="button"
            className="pp-hero-btn"
            onClick={() =>
              load(true)
            }
            disabled={
              loading ||
              refreshing
            }
          >
            <FaSyncAlt
              className={
                refreshing
                  ? "sales-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        }
      />

      {/* =================================================
          SUMMARY
      ================================================= */}

      <InsightStrip
        loading={loading}
        items={[
          { key: "pending", label: "Pending requests", value: formatCount(items.length), hint: "Waiting for a decision", tone: "amber", icon: FaClock },
          { key: "people", label: "Employees", value: formatCount(new Set(items.map((i) => i.employee_id || i.name)).size), hint: "With pending plans", tone: "violet", icon: FaUsers },
          { key: "plans", label: "Pending plan days", value: formatCount(items.reduce((sum, i) => sum + (Number(i.pending_days) || 0), 0)), hint: "Across all requests", tone: "blue", icon: FaCalendarDay },
          { key: "leave", label: "Leave days", value: formatCount(items.reduce((sum, i) => sum + (Number(i.leave_days) || 0), 0)), hint: items.length ? "Requested in the queue" : "Queue is clear", tone: items.length ? "red" : "green", icon: items.length ? FaExclamationTriangle : FaCheck }
        ]}
      />

      {/* =================================================
          APPROVAL CARD
      ================================================= */}

      <Card
        title="Pending Approvals"
        subtitle={
          loading
            ? "Loading requests..."
            : `${items.length} pending request${
                items.length === 1
                  ? ""
                  : "s"
              }`
        }
      >
        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="sales-loading-state">
            <PremiumLoader compact title="Loading pending approvals" />
          </div>
        ) : items.length === 0 ? (
          /* ===============================================
             EMPTY
          =============================================== */

          <div className="sales-empty-panel">
            <FaCheck />

            <h3>
              No pending travel plans
            </h3>

            <p>
              New plans will appear here
              after an employee submits
              them.
            </p>
          </div>
        ) : (
          /* ===============================================
             LIST
          =============================================== */

          <div className="approval-list">
            {items.map(
              (item) => {
                const pendingPlans =
                  Number(item.pending_days) || 0;

                const leaveDays =
                  Number(item.leave_days) || pendingPlans || 0;

                const startDate =
                  item.start_date || null;

                const endDate =
                  item.end_date || startDate;

                return (
                  <div
                    className="approval-card"
                    key={`${item.employee_id}-${item.month}`}
                  >
                    {/* =====================================
                       EMPLOYEE
                    ===================================== */}

                    <div className="approval-person">
                      <div className={`approval-avatar pp-avatar pp-avatar--round ${avatarTone(item.name)}`}>
                        {item.name ? initials(item.name) : <FaUserTie />}
                      </div>

                      <div className="approval-person-info">
                        <h3>
                          {item.name ||
                            "Employee"}
                        </h3>

                        {item.email && (
                          <span className="approval-email">
                            {item.email}
                          </span>
                        )}

                        <div className="approval-month">
                          <FaClock />

                          <span>
                            {item.month_label || item.month}
                          </span>
                        </div>

                        <div className="approval-leave-period">
                          <strong>
                            {startDate}
                            {endDate && endDate !== startDate
                              ? ` → ${endDate}`
                              : ""}
                          </strong>

                          <span className="approval-leave-days">
                            {leaveDays} day{leaveDays === 1 ? "" : "s"} leave / plan
                          </span>
                        </div>

                        <p>
                          {pendingPlans} pending plan{pendingPlans === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    {/* =====================================
                       STATUS
                    ===================================== */}

                    <div className="approval-status">
                      <span className="sales-status-badge pending">
                        <FaClock />
                        Pending
                      </span>
                    </div>

                    {/* =====================================
                       ACTIONS
                    ===================================== */}

                    {canEdit(
                      permission
                    ) && (
                      <div className="approval-actions">
                        <button
                          type="button"
                          className="approve-btn"
                          onClick={() =>
                            askAction(
                              item,
                              "approve"
                            )
                          }
                          disabled={
                            processing
                          }
                        >
                          <FaCheck />
                          Approve
                        </button>

                        <button
                          type="button"
                          className="reject-btn"
                          onClick={() =>
                            askAction(
                              item,
                              "reject"
                            )
                          }
                          disabled={
                            processing
                          }
                        >
                          <FaTimes />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </Card>

      {/* =================================================
          CONFIRM / REJECT DIALOG
      ================================================= */}

      <ConfirmDialog
        open={
          Boolean(
            pendingAction
          ) && !isRejecting
        }

        title={
          isApproving
            ? "Approve Travel Plan"
            : "Travel Plan Action"
        }

        message={
          pendingAction
            ? `Approve ${pendingAction.item.name}'s ${pendingAction.item.month_label} travel plan?`
            : ""
        }

        confirmText={
          processing
            ? "Processing..."
            : "Approve"
        }

        cancelText="Cancel"

        confirmVariant="success"

        onConfirm={
          confirmAction
        }

        onCancel={
          closeAction
        }
      />

      {/* =================================================
          REJECTION MODAL
      ================================================= */}

      {isRejecting && (
        <div
          className="sales-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAction();
            }
          }}
        >
          <div
            className="sales-form-modal approval-reject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-travel-plan-title"
          >
            {/* ===========================================
                HEADER
            =========================================== */}

            <div className="sales-modal-header">
              <div>
                <h2 id="reject-travel-plan-title">
                  Reject Travel Plan
                </h2>

                <p>
                  Provide a reason before
                  rejecting this travel plan.
                </p>
              </div>

              <button
                type="button"
                className="sales-modal-close"
                onClick={
                  closeAction
                }
                disabled={
                  processing
                }
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            {/* ===========================================
                CONTENT
            =========================================== */}

            <div className="approval-reject-content">
              <div className="approval-reject-warning">
                <FaExclamationTriangle />

                <div>
                  <strong>
                    You are rejecting this plan
                  </strong>

                  <span>
                    {pendingAction.item.name}
                    {" — "}
                    {
                      pendingAction
                        .item
                        .month_label
                    }
                  </span>
                </div>
              </div>

              <label className="sales-field">
                <span>
                  Rejection Reason{" "}
                  <b>*</b>
                </span>

                <textarea
                  value={
                    rejectReason
                  }
                  onChange={(event) =>
                    setRejectReason(
                      event.target.value
                    )
                  }
                  placeholder="Enter the reason for rejecting this travel plan..."
                  rows={5}
                  maxLength={1000}
                  disabled={
                    processing
                  }
                  autoFocus
                />

                <small className="sales-field-help">
                  This reason will be sent
                  to the employee with the
                  rejection notification.
                </small>
              </label>

              <div className="approval-reject-count">
                {rejectReason.length}
                /1000
              </div>
            </div>

            {/* ===========================================
                ACTIONS
            =========================================== */}

            <div className="sales-modal-actions">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={
                  closeAction
                }
                disabled={
                  processing
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="reject-btn approval-reject-confirm-btn"
                onClick={
                  confirmAction
                }
                disabled={
                  processing ||
                  !rejectReason.trim()
                }
              >
                <FaTimes />

                {processing
                  ? "Rejecting..."
                  : "Reject Travel Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TravelPlanApprovals;