import React from "react";
import ProfessionalModal from "./common/ProfessionalModal";
import "../styles/DailyCollection.css";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const statusLabel = (status) => {
    if (status === "submitted") return "Submitted";
    if (status === "locked") return "Locked";
    return "Not Submitted";
};

export default function DailyCollectionViewModal({ report, onClose }) {
    const summary = report?.summary || {};
    if (!report) return null;

    const collected = Number(report.total_collected || 0);
    const billed = Number(summary.total_billed ?? report.total_billed ?? 0);
    const variance = Number(report.variance ?? collected - billed);

    const fields = [
        ["Store", report.store_name || "-"],
        ["Store Code", report.store_code || "-"],
        ["Collection Date", report.report_date || "-"],
        ["Manager", report.manager_name || "Not linked"],
        ["Status", statusLabel(report.status)],
        ["Bill Count", Number(summary.bill_count ?? report.bill_count ?? 0)],
        ["System Billed", money(billed)],
        ["UPI", money(report.upi_amount)],
        ["Cash", money(report.cash_amount)],
        ["Bank Transfer", money(report.bank_transfer_amount)],
        ["Card", money(report.card_amount)],
        ["Total Collected", money(collected)],
        ["Variance", money(variance)],
        ["Submitted By", report.submitted_by_name || "-"],
        ["Submitted At", report.submitted_at ? new Date(report.submitted_at).toLocaleString("en-IN") : "-"],
    ];

    return (
        <ProfessionalModal
            isOpen
            onClose={onClose}
            title="Daily Collection Record"
            subtitle="Read-only view of the selected store report."
            icon="◉"
            size="large"
            scrollable
            footer={<button className="daily-modal-close" onClick={onClose}>Close</button>}
        >
            <div className="daily-detail-grid">
                {fields.map(([label, value]) => (
                    <div key={label} className={label === "Variance" ? (Math.abs(variance) < 0.01 ? "match" : "mismatch") : ""}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                    </div>
                ))}
            </div>
            <div className="daily-detail-note">
                <span>Notes / reconciliation explanation</span>
                <p>{report.notes || "No notes were added."}</p>
            </div>
        </ProfessionalModal>
    );
}
