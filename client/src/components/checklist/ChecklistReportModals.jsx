import { useMemo, useState } from "react";
import axios from "../../axiosConfig.js";
import {
    FaClipboardCheck,
    FaEdit,
    FaStore,
    FaQuestionCircle,
    FaBolt,
    FaMobileAlt,
    FaMapMarkerAlt,
    FaListUl,
    FaSave,
} from "react-icons/fa";
import PremiumModal, { PmSection, PmGrid, PmItem, PmField, PmAttachment } from "../premium/PremiumModal";
import PremiumLoader from "../premium/PremiumLoader";

// ======================================================
// HELPERS
// ======================================================

const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD HH:MM:SS" (server wall-clock) or ISO -> "DD-MM-YYYY HH:MM"
const formatReportDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    const bare = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?(?::\d{2})?$/);
    if (bare) {
        const [, y, m, d, hh, mm] = bare;
        return hh ? `${d}-${m}-${y} ${hh}:${mm}` : `${d}-${m}-${y}`;
    }
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Any server date -> value for <input type="datetime-local">
const toInputDateTime = (value) => {
    if (!value) return "";
    const text = String(value);
    const bare = text.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?(?::\d{2})?$/);
    if (bare) return `${bare[1]}T${bare[2] || "00:00"}`;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatSla = (minutes) => {
    const total = Number(minutes || 0);
    if (total <= 0) return "No SLA";
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const mins = total % 60;
    return `${days}d ${pad(hours)}h ${pad(mins)}m`;
};

const actionStatus = (row) => {
    if (!row?.action_point_id) return { label: "No Action Needed", tone: "success" };
    const status = row.action_point_status || "Open";
    if (String(status).toLowerCase() === "closed") return { label: "Action Completed", tone: "success" };
    return { label: status, tone: "warning" };
};

const mapLink = (row) =>
    row?.latitude && row?.longitude ? (
        <a
            className="pm-link"
            href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
        >
            <FaMapMarkerAlt /> View on Map
        </a>
    ) : "-";

// ======================================================
// VIEW MODAL
// ======================================================

export function ChecklistReportViewModal({ report, answers = [], loading = false, canEdit = false, onEdit, onClose }) {
    if (!report) return null;
    const status = actionStatus(report);

    return (
        <PremiumModal
            eyebrow={`Checklist Report #${report.id}`}
            title={report.checklist_name || "Checklist Report"}
            subtitle={`${report.store_name || "-"} · ${formatReportDate(report.submission_date)}`}
            icon={<FaClipboardCheck />}
            size="xl"
            badges={[
                { label: "Completed", tone: "success" },
                { label: status.label, tone: status.tone },
                report.action_point_id && { label: `Priority: ${report.action_point_priority || "Medium"}` },
            ]}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="pm-btn pm-btn-ghost" onClick={onClose}>Close</button>
                    {canEdit && onEdit && (
                        <button type="button" className="pm-btn pm-btn-primary" onClick={() => onEdit(report)}>
                            <FaEdit /> Edit Report
                        </button>
                    )}
                </>
            }
        >
            <PmSection title="Submission" icon={<FaStore />}>
                <PmGrid cols={4}>
                    <PmItem label="Report ID" value={report.id} />
                    <PmItem label="Submitted At" value={formatReportDate(report.submission_date)} />
                    <PmItem label="Status"><span className="pm-chip success">Completed</span></PmItem>
                    <PmItem label="Checklist" value={report.checklist_name} />
                    <PmItem label="Store" value={report.store_name} />
                    <PmItem label="Employee" value={report.employee_name} />
                    <PmItem label="Employee ID" value={report.employee_id} />
                    <PmItem label="Department" value={report.department_name} />
                </PmGrid>
            </PmSection>

            <PmSection title="Question & Answer" icon={<FaQuestionCircle />}>
                <PmGrid cols={3}>
                    <PmItem label="Question" value={report.question} wide />
                    <PmItem label="Answer">
                        {report.answer ? <span className="pm-chip">{report.answer}</span> : "-"}
                    </PmItem>
                    <PmItem label="Comment / Remarks" value={report.remarks} wide />
                </PmGrid>
            </PmSection>

            <PmSection title="Action Point" icon={<FaBolt />}>
                <PmGrid cols={4}>
                    <PmItem label="Action Status"><span className={`pm-chip ${status.tone}`}>{status.label}</span></PmItem>
                    <PmItem label="Priority" value={report.action_point_id ? report.action_point_priority || "Medium" : "-"} />
                    <PmItem label="SLA (Days)" value={report.action_point_id && Number(report.action_point_sla_days) > 0 ? report.action_point_sla_days : "-"} />
                    <PmItem label="SLA" value={report.action_point_id ? formatSla(report.action_point_sla_minutes) : "No SLA"} />
                    <PmItem label="Action Taken" value={report.action_taken} />
                    <PmItem label="Action Remarks" value={report.action_remarks} />
                    <PmItem
                        label="Action Completed At"
                        value={report.action_point_completed_at || report.completion_date
                            ? formatReportDate(report.action_point_completed_at || report.completion_date)
                            : "-"}
                    />
                    <PmItem label="Action Point Comment" value={report.action_point_comment} />
                    <PmItem label="Action Point Remarks" value={report.action_point_remarks} wide />
                </PmGrid>
            </PmSection>

            <PmSection title="Device, Location & Attachment" icon={<FaMobileAlt />}>
                <PmGrid cols={4}>
                    <PmItem label="Device" value={report.device} wide />
                    <PmItem label="Latitude" value={report.latitude} />
                    <PmItem label="Longitude" value={report.longitude} />
                    <PmItem label="Geo Location">{mapLink(report)}</PmItem>
                    <PmItem label="Attachment"><PmAttachment value={report.attachment} /></PmItem>
                </PmGrid>
            </PmSection>

            <PmSection title={`All Answers in this Submission${answers.length ? ` (${answers.length})` : ""}`} icon={<FaListUl />}>
                {loading ? (
                    <PremiumLoader compact title="Loading answers..." message="Fetching every answer in this submission." />
                ) : answers.length === 0 ? (
                    <span className="pm-muted">No other completed answers for this submission.</span>
                ) : (
                    <div className="pm-answers">
                        {answers.map((item, index) => (
                            <div
                                key={item.answer_id || index}
                                className={`pm-answer ${String(item.answer_id) === String(report.answer_id) ? "current" : ""}`}
                            >
                                <span className="pm-answer-no">{item.sequence_no || index + 1}</span>
                                <div>
                                    <div className="pm-answer-q">{item.question || "-"}</div>
                                    {item.remarks && <div className="pm-answer-r">{item.remarks}</div>}
                                    {item.action_taken && <div className="pm-answer-r">Action taken: {item.action_taken}</div>}
                                </div>
                                <span className="pm-chip">{item.answer || "-"}</span>
                            </div>
                        ))}
                    </div>
                )}
            </PmSection>
        </PremiumModal>
    );
}

// ======================================================
// EDIT MODAL — every column of the report is editable
// ======================================================

export function ChecklistReportEditModal({ report, stores = [], users = [], checklistTypes = [], onClose, onSaved }) {
    const [form, setForm] = useState(() => ({
        checklist_type_id: report?.checklist_type_id ?? "",
        store_id: report?.store_id ?? "",
        submission_date: toInputDateTime(report?.submission_date),
        employee_name: report?.employee_name || "",
        employee_id: report?.employee_id || "",
        department_name: report?.department_name || "",
        answer: report?.answer || "",
        remarks: report?.remarks || "",
        action_taken: report?.action_taken || "",
        action_remarks: report?.action_remarks || "",
        completion_date: toInputDateTime(report?.completion_date),
        action_point_priority: report?.action_point_priority || "Medium",
        action_point_sla_days: report?.action_point_sla_days ?? "",
        action_point_comment: report?.action_point_comment || "",
        action_point_remarks: report?.action_point_remarks || "",
        device: report?.device || "",
        latitude: report?.latitude ?? "",
        longitude: report?.longitude ?? "",
    }));
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const userOptions = useMemo(
        () => users.filter((u) => u?.employee_id || u?.name),
        [users]
    );

    const pickEmployee = (event) => {
        const user = userOptions.find((u) => String(u.id) === event.target.value);
        if (!user) return;
        setForm((prev) => ({
            ...prev,
            employee_name: user.name || prev.employee_name,
            employee_id: user.employee_id || prev.employee_id,
            department_name: user.department_name || prev.department_name,
        }));
    };

    const selectedUserId = useMemo(() => {
        const match = userOptions.find(
            (u) => u.employee_id && String(u.employee_id) === String(form.employee_id)
        );
        return match ? String(match.id) : "";
    }, [userOptions, form.employee_id]);

    const save = async () => {
        if (!form.answer.trim()) {
            alert("Answer is required.");
            return;
        }
        const payload = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (!report.action_point_id && key.startsWith("action_point_")) return;
            payload.append(key, value ?? "");
        });
        if (report.answer_id) payload.append("answer_id", report.answer_id);
        if (report.action_point_id) payload.append("action_point_id", report.action_point_id);
        if (file) payload.append("attachment", file);

        try {
            setSaving(true);
            await axios.put(`/api/checklist-reports/${report.id}`, payload);
            alert("Checklist Report updated successfully.");
            onSaved?.();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || err.message || "Unable to update report.");
        } finally {
            setSaving(false);
        }
    };

    if (!report) return null;

    return (
        <PremiumModal
            eyebrow={`Edit Checklist Report #${report.id}`}
            title={report.question || report.checklist_name || "Checklist Report"}
            subtitle={`${report.store_name || "-"} · ${report.checklist_name || "-"}`}
            icon={<FaEdit />}
            size="xl"
            badges={[{ label: "Completed", tone: "success" }]}
            onClose={saving ? undefined : onClose}
            footer={
                <>
                    <button type="button" className="pm-btn pm-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="button" className="pm-btn pm-btn-primary" onClick={save} disabled={saving}>
                        <FaSave /> {saving ? "Saving..." : "Save Changes"}
                    </button>
                </>
            }
        >
            <PmSection title="Submission" icon={<FaStore />}>
                <PmGrid cols={3}>
                    <PmField label="Checklist">
                        <select value={form.checklist_type_id} onChange={set("checklist_type_id")}>
                            <option value="">Select checklist</option>
                            {checklistTypes.map((type) => (
                                <option key={type.id} value={type.id}>{type.checklist_name || type.name}</option>
                            ))}
                        </select>
                    </PmField>
                    <PmField label="Store">
                        <select value={form.store_id} onChange={set("store_id")}>
                            <option value="">Select store</option>
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.store_name}{store.store_code ? ` (${store.store_code})` : ""}
                                </option>
                            ))}
                        </select>
                    </PmField>
                    <PmField label="Submitted At">
                        <input type="datetime-local" value={form.submission_date} onChange={set("submission_date")} />
                    </PmField>
                    <PmField label="Pick Employee" hint="Fills name, ID and department">
                        <select value={selectedUserId} onChange={pickEmployee}>
                            <option value="">Select employee</option>
                            {userOptions.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}{user.employee_id ? ` (${user.employee_id})` : ""}
                                </option>
                            ))}
                        </select>
                    </PmField>
                    <PmField label="Employee Name">
                        <input type="text" value={form.employee_name} onChange={set("employee_name")} />
                    </PmField>
                    <PmField label="Employee ID">
                        <input type="text" value={form.employee_id} onChange={set("employee_id")} />
                    </PmField>
                    <PmField label="Department" wide>
                        <input type="text" value={form.department_name} onChange={set("department_name")} />
                    </PmField>
                </PmGrid>
            </PmSection>

            <PmSection title="Question & Answer" icon={<FaQuestionCircle />}>
                <PmGrid cols={2}>
                    <PmField label="Question" wide hint="Questions are managed in the Questions module">
                        <input type="text" value={report.question || ""} readOnly />
                    </PmField>
                    <PmField label="Answer" required>
                        <input type="text" value={form.answer} onChange={set("answer")} />
                    </PmField>
                    <PmField label="Status">
                        <select value="Completed" disabled><option>Completed</option></select>
                    </PmField>
                    <PmField label="Comment / Remarks" wide>
                        <textarea value={form.remarks} onChange={set("remarks")} />
                    </PmField>
                </PmGrid>
            </PmSection>

            <PmSection title="Action Details" icon={<FaBolt />}>
                <PmGrid cols={3}>
                    <PmField label="Action Taken">
                        <input type="text" value={form.action_taken} onChange={set("action_taken")} />
                    </PmField>
                    <PmField label="Action Remarks">
                        <input type="text" value={form.action_remarks} onChange={set("action_remarks")} />
                    </PmField>
                    <PmField label="Completion Date">
                        <input type="datetime-local" value={form.completion_date} onChange={set("completion_date")} />
                    </PmField>
                    {report.action_point_id ? (
                        <>
                            <PmField label="Action Point Priority">
                                <select value={form.action_point_priority} onChange={set("action_point_priority")}>
                                    {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
                                </select>
                            </PmField>
                            <PmField label="SLA (Days)">
                                <input type="number" min="0" value={form.action_point_sla_days} onChange={set("action_point_sla_days")} />
                            </PmField>
                            <PmField label="Action Point Comment">
                                <input type="text" value={form.action_point_comment} onChange={set("action_point_comment")} />
                            </PmField>
                            <PmField label="Action Point Remarks" wide>
                                <textarea value={form.action_point_remarks} onChange={set("action_point_remarks")} />
                            </PmField>
                        </>
                    ) : (
                        <PmItem label="Action Point" value="No Action Point was raised for this answer." wide />
                    )}
                </PmGrid>
            </PmSection>

            <PmSection title="Device, Location & Attachment" icon={<FaMobileAlt />}>
                <PmGrid cols={3}>
                    <PmField label="Device" wide>
                        <input type="text" value={form.device} onChange={set("device")} />
                    </PmField>
                    <PmField label="Latitude">
                        <input type="number" step="any" value={form.latitude} onChange={set("latitude")} />
                    </PmField>
                    <PmField label="Longitude">
                        <input type="number" step="any" value={form.longitude} onChange={set("longitude")} />
                    </PmField>
                    <PmItem label="Geo Location">{mapLink(form)}</PmItem>
                    <PmItem label="Current Attachment"><PmAttachment value={report.attachment} /></PmItem>
                    <PmField label="Replace Attachment" wide hint="Image, PDF, Word, Excel, CSV or video">
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </PmField>
                </PmGrid>
            </PmSection>
        </PremiumModal>
    );
}
