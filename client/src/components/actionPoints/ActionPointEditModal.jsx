import { useEffect, useMemo, useState } from "react";
import axios from "../../axiosConfig.js";
import { FaEdit, FaSave, FaStore, FaQuestionCircle, FaBolt, FaPaperclip } from "react-icons/fa";
import PremiumModal, { PmSection, PmGrid, PmItem, PmField, PmAttachment } from "../premium/PremiumModal";

// ======================================================
// PREMIUM EDIT — ACTION POINT
// Every column of the Action Point row can be edited here:
// store, department, assignee, answer + answer remarks (for
// checklist Action Points), priority, SLA, status, comment,
// remarks and attachment.
// ======================================================

const STATUSES = ["Open", "In Progress", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const formatDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    const bare = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (bare && !/Z|[+-]\d{2}:?\d{2}$/.test(text)) {
        const [, y, m, d, hh, mm] = bare;
        return hh ? `${d}-${m}-${y} ${hh}:${mm}` : `${d}-${m}-${y}`;
    }
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function ActionPointEditModal({ row, stores = [], departments = [], onClose, onSaved }) {
    const total = Number(row?.sla_minutes || 0);
    const [form, setForm] = useState(() => ({
        store_id: row?.store_id ?? "",
        department_id: row?.department_id ?? "",
        assigned_to: row?.assigned_to ?? "",
        answer: row?.answer || "",
        answer_remarks: row?.answer_remarks || "",
        priority: row?.priority || "Medium",
        sla_days: Math.floor(total / 1440),
        sla_hours: Math.floor((total % 1440) / 60),
        sla_minutes: total % 60,
        status: row?.status || "Open",
        comment: row?.comment || "",
        remarks: row?.remarks || "",
    }));
    const [file, setFile] = useState(null);
    const [assignees, setAssignees] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        axios
            .get("/api/action-points/assignees")
            .then((res) => {
                if (active) setAssignees(Array.isArray(res.data?.data) ? res.data.data : []);
            })
            .catch(() => active && setAssignees([]));
        return () => {
            active = false;
        };
    }, []);

    const assigneeOptions = useMemo(() => {
        const list = [...assignees];
        if (row?.assigned_to && !list.some((u) => String(u.id) === String(row.assigned_to))) {
            list.unshift({ id: row.assigned_to, name: row.assigned_to_name || `User #${row.assigned_to}` });
        }
        return list;
    }, [assignees, row]);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const linkedToChecklist = Boolean(row?.submission_answer_id);
    const closingChecklistPoint = form.status === "Closed" && (row?.submission_answer_id || row?.submission_id);

    const save = async () => {
        const payload = new FormData();
        payload.append("store_id", form.store_id ?? "");
        payload.append("department_id", form.department_id ?? "");
        payload.append("assigned_to", form.assigned_to ?? "");
        payload.append("priority", form.priority || "Medium");
        payload.append("sla_days", String(form.sla_days || 0));
        payload.append("sla_hours", String(form.sla_hours || 0));
        payload.append("sla_minutes", String(form.sla_minutes || 0));
        payload.append("status", form.status || "Open");
        payload.append("comment", form.comment || "");
        payload.append("remarks", form.remarks || "");
        if (linkedToChecklist) {
            payload.append("answer", form.answer || "");
            payload.append("answer_remarks", form.answer_remarks || "");
        }
        if (file) payload.append("attachment", file);

        try {
            setSaving(true);
            await axios.put(`/api/action-points/${row.id}`, payload);
            alert(
                closingChecklistPoint
                    ? "Action Point closed. It has moved to Checklist Reports."
                    : "Action Point updated successfully."
            );
            onSaved?.();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Unable to update Action Point.");
        } finally {
            setSaving(false);
        }
    };

    if (!row) return null;

    const statusTone = form.status === "Closed" ? "success" : form.status === "In Progress" ? "warning" : "danger";

    return (
        <PremiumModal
            eyebrow={`Edit Action Point #${row.id}`}
            title={row.question || "Action Point"}
            subtitle={[row.checklist_name, row.store_name, formatDate(row.submission_date || row.date)].filter(Boolean).join(" · ")}
            icon={<FaEdit />}
            size="xl"
            badges={[
                { label: form.status, tone: statusTone },
                { label: `Priority: ${form.priority}` },
            ]}
            onClose={saving ? undefined : onClose}
            footer={
                <>
                    <button type="button" className="pm-btn pm-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="button" className="pm-btn pm-btn-primary" onClick={save} disabled={saving}>
                        <FaSave /> {saving ? "Saving..." : "Update Action Point"}
                    </button>
                </>
            }
        >
            <PmSection title="Store & Ownership" icon={<FaStore />}>
                <PmGrid cols={3}>
                    <PmField label="Store">
                        <select value={form.store_id ?? ""} onChange={set("store_id")}>
                            <option value="">Select store</option>
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.store_name}{store.store_code ? ` (${store.store_code})` : ""}
                                </option>
                            ))}
                        </select>
                    </PmField>
                    <PmField label="Department">
                        <select value={form.department_id ?? ""} onChange={set("department_id")}>
                            <option value="">Select department</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>{dept.department_name || dept.name}</option>
                            ))}
                        </select>
                    </PmField>
                    <PmField label="Assigned To">
                        <select value={form.assigned_to ?? ""} onChange={set("assigned_to")}>
                            <option value="">Not assigned</option>
                            {assigneeOptions.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}{user.employee_id ? ` (${user.employee_id})` : ""}
                                    {user.department_name ? ` · ${user.department_name}` : ""}
                                </option>
                            ))}
                        </select>
                    </PmField>
                    <PmItem label="Checklist" value={row.checklist_name} />
                    <PmItem label="Raised By" value={row.employee_name ? `${row.employee_name}${row.employee_id ? ` (${row.employee_id})` : ""}` : "-"} />
                    <PmItem label="Date" value={formatDate(row.submission_date || row.date)} />
                </PmGrid>
            </PmSection>

            <PmSection title="Question & Answer" icon={<FaQuestionCircle />}>
                <PmGrid cols={2}>
                    <PmField label="Question" wide hint="Questions are managed in the Questions module">
                        <input type="text" value={row.question || ""} readOnly />
                    </PmField>
                    {linkedToChecklist ? (
                        <>
                            <PmField label="Answer">
                                <input type="text" value={form.answer} onChange={set("answer")} />
                            </PmField>
                            <PmField label="Answer Remarks">
                                <input type="text" value={form.answer_remarks} onChange={set("answer_remarks")} />
                            </PmField>
                        </>
                    ) : (
                        <PmItem label="Answer" value="Manual Action Point — no checklist answer." wide />
                    )}
                </PmGrid>
            </PmSection>

            <PmSection title="Action Plan" icon={<FaBolt />}>
                <PmGrid cols={4}>
                    <PmField label="Priority">
                        <select value={form.priority} onChange={set("priority")}>
                            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                        </select>
                    </PmField>
                    <PmField label="Status" hint={closingChecklistPoint ? "Closing moves it to Checklist Reports" : undefined}>
                        <select value={form.status} onChange={set("status")}>
                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                    </PmField>
                    <PmField label="SLA Days">
                        <input type="number" min="0" value={form.sla_days} onChange={set("sla_days")} />
                    </PmField>
                    <PmField label="SLA Hours / Minutes">
                        <div style={{ display: "flex", gap: 8 }}>
                            <input type="number" min="0" max="23" value={form.sla_hours} onChange={set("sla_hours")} aria-label="SLA hours" />
                            <input type="number" min="0" max="59" value={form.sla_minutes} onChange={set("sla_minutes")} aria-label="SLA minutes" />
                        </div>
                    </PmField>
                    <PmField label="Comment" wide>
                        <textarea value={form.comment} onChange={set("comment")} placeholder="Add or update the Action Point comment" />
                    </PmField>
                    <PmField label="Remarks" wide>
                        <textarea value={form.remarks} onChange={set("remarks")} />
                    </PmField>
                </PmGrid>
            </PmSection>

            <PmSection title="Attachment" icon={<FaPaperclip />}>
                <PmGrid cols={2}>
                    <PmItem label="Current Attachment"><PmAttachment value={row.attachment} /></PmItem>
                    <PmField label="Replace Attachment" hint="Optional — image, PDF, Word, Excel, CSV or video">
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </PmField>
                </PmGrid>
            </PmSection>
        </PremiumModal>
    );
}
