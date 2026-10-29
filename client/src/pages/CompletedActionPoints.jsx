import { useEffect, useRef, useState, useEffectEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig.js";

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";
import AttachmentLinks from "../components/common/AttachmentLinks";
import PremiumLoader from "../components/premium/PremiumLoader";
import PremiumModal, { PmSection, PmGrid, PmItem, PmField } from "../components/premium/PremiumModal";

import {
    FaEdit,
    FaTrash,
    FaEye,
    FaCheckCircle,
    FaClipboardCheck,
    FaHistory,
    FaPaperclip,
    FaTasks,
    FaArrowLeft
} from "react-icons/fa";

import "../styles/ActionPoints.css";
import "../styles/premium/ChecklistPremium.css";
import "../styles/CompletedActionPoints.css";
import { exportFromCSV } from "../utils/exportUtils.js";
import { activeFilters, hasActiveFilters, deleteAllLabel } from "../utils/deleteScope";
import runAfterCommit from "../utils/runAfterCommit";

// ======================================================
// COMPLETED ACTION POINTS
// ------------------------------------------------------
// Action Points that reached the terminal status (Closed → "Completed").
// They leave the active Action Points page and are managed here:
// View · Edit (follow-up fields only) · Export · Delete · Delete All.
//
// Delete / Delete All remove the record from THIS module only. The
// original checklist submission, its answer and the "Action Completed"
// state in Checklist Reports stay exactly as they were, and shared files
// in Gallery are never removed. All rules are enforced by the server
// (routes/actionpointRoutes.js → /completed).
// ======================================================

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const KINDS = ["Opening", "Closing", "Other", "Manual"];

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
};

const formatDay = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const HISTORY_LABELS = {
    CREATED: "Created",
    STATUS_CHANGED: "Status changed",
    COMPLETED: "Completed",
    COMPLETED_EDITED: "Resolution edited",
    UPDATED: "Updated",
    ARCHIVED: "Removed from Completed",
    IMPORTED: "Imported"
};

const readPermission = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
        const isAdmin = user.administrator === true || user.administrator === 1;
        return isAdmin ? "Full" : permissions["Action Points"] || "None";
    } catch {
        return "None";
    }
};

function CompletedActionPoints() {
    const navigate = useNavigate();

    // ==================================================
    // PERMISSIONS (Action Points module)
    // ==================================================
    const permission = readPermission();
    const canView = ["View", "Add", "Edit", "Full"].includes(permission);
    const canEdit = ["Edit", "Full"].includes(permission);
    const canDelete = permission === "Full";

    // ==================================================
    // DATA
    // ==================================================
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const fetchSeqRef = useRef(0);

    // Filter options (same Filter Access lookup as Action Points).
    const [stores, setStores] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [filterAccess, setFilterAccess] = useState({});

    // ==================================================
    // FILTERS
    // ==================================================
    const [search, setSearch] = useState("");
    const [store, setStore] = useState("");
    const [department, setDepartment] = useState("");
    const [checklistType, setChecklistType] = useState("");
    const [checklistKind, setChecklistKind] = useState("");
    const [priority, setPriority] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const filters = activeFilters({
        search,
        store_id: store,
        department_id: department,
        checklist_type_id: checklistType,
        checklist_kind: checklistKind,
        priority,
        start_date: startDate,
        end_date: endDate
    });
    const isFiltered = hasActiveFilters(filters);

    // ==================================================
    // MODALS
    // ==================================================
    const [viewRecord, setViewRecord] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    const [editRecord, setEditRecord] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [assignees, setAssignees] = useState([]);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [exporting, setExporting] = useState(false);

    // ==================================================
    // LOAD LIST
    // ==================================================
    const fetchRows = async ({ silent = false } = {}) => {
        const seq = ++fetchSeqRef.current;
        if (!silent) setLoading(true);
        try {
            const res = await axios.get("/api/action-points/completed", {
                params: { ...filters, page: currentPage, limit: pageSize }
            });
            if (seq !== fetchSeqRef.current) return;
            setRows(Array.isArray(res.data?.data) ? res.data.data : []);
            setTotalRecords(Number(res.data?.pagination?.total || 0));
            setTotalPages(Number(res.data?.pagination?.totalPages || 1));
            setLoadError("");
        } catch (err) {
            if (seq !== fetchSeqRef.current) return;
            console.error("COMPLETED ACTION POINTS LOAD ERROR:", err);
            setRows([]);
            setLoadError(err.response?.data?.message || "Unable to load completed Action Points.");
        } finally {
            if (seq === fetchSeqRef.current) {
                setLoading(false);
                setHasLoadedOnce(true);
            }
        }
    };

    const fetchRowsEvent = useEffectEvent((...args) => fetchRows(...args));

    useEffect(() => runAfterCommit(() => {
        if (!canView) {
            setLoading(false);
            return;
        }
        fetchRowsEvent();
    }), [canView, currentPage, pageSize, search, store, department, checklistType, checklistKind, priority, startDate, endDate]);

    // Filter options + assignees (once).
    useEffect(() => runAfterCommit(() => {
        if (!canView) return;
        axios
            .get("/api/filter-access/options", { params: { module: "Action Points" } })
            .then((res) => {
                const options = res.data?.filters || {};
                const of = (key) => (Array.isArray(options[key]?.options) ? options[key].options : []);
                setStores(of("store"));
                setDepartments(of("department"));
                setChecklists(of("checklist_type"));
                setFilterAccess(
                    Object.fromEntries(
                        Object.entries(options).map(([key, value]) => [key, { hidden: Boolean(value?.hidden) }])
                    )
                );
            })
            .catch((err) => console.error("Completed Action Point filter options failed:", err));
    }), [canView]);

    const resetToFirstPage = (setter) => (value) => {
        setter(value);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearch("");
        setStore("");
        setDepartment("");
        setChecklistType("");
        setChecklistKind("");
        setPriority("");
        setStartDate("");
        setEndDate("");
        setCurrentPage(1);
    };

    // ==================================================
    // VIEW
    // ==================================================
    const openView = async (row) => {
        setViewRecord({ ...row, history: null });
        setViewLoading(true);
        try {
            const res = await axios.get(`/api/action-points/completed/${row.id}`);
            setViewRecord(res.data?.data || { ...row, history: [] });
        } catch (err) {
            console.error(err);
            setViewRecord(null);
            alert(err.response?.data?.message || "Unable to load this completed Action Point.");
        } finally {
            setViewLoading(false);
        }
    };

    // ==================================================
    // EDIT
    // ==================================================
    const openEdit = (row) => {
        if (!canEdit) return;
        setEditRecord(row);
        setEditForm({
            priority: row.priority || "Medium",
            assigned_to: row.assigned_to ? String(row.assigned_to) : "",
            action_taken: row.action_taken || "",
            // Comment and Remarks are one field now.
            remarks: row.remarks || row.comment || "",
            comment: row.comment || ""
        });
        if (!assignees.length) {
            axios
                .get("/api/action-points/assignees")
                .then((res) => setAssignees(Array.isArray(res.data?.data) ? res.data.data : []))
                .catch(() => setAssignees([]));
        }
    };

    const saveEdit = async () => {
        if (!editRecord || saving) return;
        if (!String(editForm.action_taken || "").trim()) {
            alert("Action Taken is required for a completed Action Point.");
            return;
        }
        setSaving(true);
        try {
            await axios.put(`/api/action-points/completed/${editRecord.id}`, {
                priority: editForm.priority,
                assigned_to: editForm.assigned_to || null,
                action_taken: editForm.action_taken,
                remarks: editForm.remarks,
                comment: editForm.comment
            });
            alert("Completed Action Point updated successfully.");
            const editedId = editRecord.id;
            setEditRecord(null);
            await fetchRows({ silent: true });
            if (viewRecord?.id === editedId) await openView({ id: editedId });
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Unable to update completed Action Point.");
        } finally {
            setSaving(false);
        }
    };

    // ==================================================
    // DELETE / DELETE ALL
    // ==================================================
    const confirmDelete = async () => {
        if (!deleteTarget || deleting) return;
        setDeleting(true);
        try {
            const res = await axios.delete(`/api/action-points/completed/${deleteTarget.id}`);
            alert(res.data?.message || "Completed Action Point deleted.");
            setDeleteTarget(null);
            if (viewRecord?.id === deleteTarget.id) setViewRecord(null);
            if (rows.length === 1 && currentPage > 1) setCurrentPage((page) => page - 1);
            else await fetchRows({ silent: true });
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Unable to delete completed Action Point.");
        } finally {
            setDeleting(false);
        }
    };

    const confirmDeleteAll = async () => {
        if (!canDelete || deleting) return;
        setDeleting(true);
        try {
            const res = await axios.delete("/api/action-points/completed", {
                data: { confirm: "DELETE", expected_count: totalRecords, filters }
            });
            alert(res.data?.message || `${totalRecords} completed Action Point(s) deleted.`);
            setShowDeleteAll(false);
            setCurrentPage(1);
            await fetchRows({ silent: true });
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Unable to delete completed Action Points.");
            // The count changed meanwhile: show the fresh number before retrying.
            if (err.response?.data?.code === "CONFIRM_COUNT_MISMATCH") {
                setShowDeleteAll(false);
                await fetchRows({ silent: true });
            }
        } finally {
            setDeleting(false);
        }
    };

    // ==================================================
    // EXPORT
    // ==================================================
    const handleExport = async (format = "csv") => {
        if (exporting) return;
        setExporting(true);
        try {
            const res = await axios.get("/api/action-points/completed/export", {
                params: filters,
                responseType: "blob"
            });
            const csvText = await res.data.text();
            if (String(csvText || "").trim().split(/\r?\n/).length <= 1) {
                alert("No completed Action Points to export for the selected filters.");
                return;
            }
            await exportFromCSV({
                csvText,
                filename: "CompletedActionPoints",
                format,
                title: "Completed Action Points"
            });
        } catch (err) {
            console.error("COMPLETED ACTION POINT EXPORT ERROR:", err);
            alert(err.response?.data?.message || "Unable to export completed Action Points.");
        } finally {
            setExporting(false);
        }
    };

    // ==================================================
    // ACCESS / FIRST LOAD
    // ==================================================
    if (!canView) {
        return (
            <div className="no-permission">
                <h2>Access Denied</h2>
                <p>You don't have permission to view Completed Action Points.</p>
            </div>
        );
    }

    if (loading && !hasLoadedOnce) {
        return (
            <div className="action-loading">
                <PremiumLoader title="Loading Completed Action Points" />
            </div>
        );
    }

    // ==================================================
    // TABLE
    // ==================================================
    const columns = [
        {
            key: "completed_at",
            title: "Completed On",
            minWidth: "150px",
            render: (row) => formatDateTime(row.completed_at)
        },
        { key: "store_name", title: "Store", render: (row) => row.store_name || "-" },
        { key: "city", title: "City", render: (row) => row.city || "-" },
        {
            key: "checklist_kind",
            title: "Type",
            render: (row) => (
                <span className={`cap-kind cap-kind--${String(row.checklist_kind || "other").toLowerCase()}`}>
                    {row.checklist_kind || "-"}
                </span>
            )
        },
        { key: "checklist_name", title: "Checklist", render: (row) => row.checklist_name || "-" },
        {
            key: "question",
            title: "Question / Action",
            minWidth: "260px",
            render: (row) => <div className="question-cell">{row.question || row.remarks || "-"}</div>
        },
        {
            key: "answer",
            title: "Answer",
            render: (row) => (row.answer ? <span className="answer-chip issue">{row.answer}</span> : "-")
        },
        { key: "department_name", title: "Department", render: (row) => row.department_name || "-" },
        {
            key: "priority",
            title: "Priority",
            render: (row) => (
                <span className={`priority-badge ${String(row.priority || "medium").toLowerCase()}`}>
                    {row.priority || "-"}
                </span>
            )
        },
        {
            key: "action_taken",
            title: "Action Taken",
            minWidth: "220px",
            render: (row) => <div className="comment-cell">{row.action_taken || "-"}</div>
        },
        { key: "completed_by", title: "Completed By", render: (row) => row.completed_by || "-" },
        { key: "assigned_to_name", title: "Assigned To", render: (row) => row.assigned_to_name || "-" },
        {
            key: "submission_date",
            title: "Checklist Date",
            render: (row) => formatDay(row.submission_date)
        },
        {
            key: "attachment",
            title: "Attachment",
            align: "center",
            render: (row) => (
                <AttachmentLinks
                    items={row.attachments}
                    title={`Completed Action Point #${row.id}`}
                    subtitle={[row.store_name, row.question].filter(Boolean).join(" · ")}
                />
            )
        },
        {
            key: "status",
            title: "Status",
            render: () => <span className="status-badge closed">Completed</span>
        },
        {
            key: "actions",
            title: "Actions",
            width: "300px",
            align: "center",
            render: (row) => (
                <div className="action-buttons action-buttons-horizontal">
                    <button type="button" className="open-btn" onClick={() => openView(row)}>
                        <FaEye /> View
                    </button>
                    {canEdit && (
                        <button type="button" className="edit-btn" onClick={() => openEdit(row)}>
                            <FaEdit /> Edit
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" className="delete-btn" onClick={() => setDeleteTarget(row)}>
                            <FaTrash /> Delete
                        </button>
                    )}
                </div>
            )
        }
    ];

    const deleteAllText = deleteAllLabel(isFiltered, isFiltered ? totalRecords : undefined);

    return (
        <div className="action-points-page ap-premium cap-page">
            <PageHeader
                className="premium-hero"
                title="Completed Action Points"
                subtitle="Resolved Action Points move here from Action Points. The original checklist answer stays in Checklist Reports, and the question is available to the store again."
            />

            <PageToolbar
                search={search}
                setSearch={resetToFirstPage(setSearch)}
                debounceMs={300}
                placeholder="Search store, question, action taken, person..."
                showExport={canView}
                onExport={handleExport}
                exportLoading={exporting}
            >
                <button type="button" className="toolbar-btn cap-back-btn" onClick={() => navigate("/action-points")}>
                    <FaArrowLeft /> Active Action Points
                </button>
            </PageToolbar>

            {canDelete && (
                <div className="action-point-management-actions">
                    <button
                        type="button"
                        className="delete-all-action-btn"
                        onClick={() => setShowDeleteAll(true)}
                        disabled={!totalRecords}
                        title={totalRecords ? "" : "Nothing to delete"}
                    >
                        <FaTrash />
                        {deleteAllText}
                    </button>
                </div>
            )}

            <FilterBar onClear={clearFilters}>
                {!filterAccess.store?.hidden && (
                    <div className="filter-group">
                        <label>Store</label>
                        <select value={store} onChange={(e) => resetToFirstPage(setStore)(e.target.value)}>
                            <option value="">All Stores</option>
                            {stores.map((item) => (
                                <option key={item.id} value={item.id}>{item.store_name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {!filterAccess.department?.hidden && (
                    <div className="filter-group">
                        <label>Department</label>
                        <select value={department} onChange={(e) => resetToFirstPage(setDepartment)(e.target.value)}>
                            <option value="">All Departments</option>
                            {departments.map((item) => (
                                <option key={item.id} value={item.id}>{item.department_name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="filter-group">
                    <label>Checklist</label>
                    <select value={checklistKind} onChange={(e) => resetToFirstPage(setChecklistKind)(e.target.value)}>
                        <option value="">Opening, Closing & others</option>
                        {KINDS.map((kind) => (
                            <option key={kind} value={kind}>{kind === "Manual" ? "Manual (no checklist)" : kind}</option>
                        ))}
                    </select>
                </div>

                {!filterAccess.checklist_type?.hidden && (
                    <div className="filter-group">
                        <label>Checklist Type</label>
                        <select value={checklistType} onChange={(e) => resetToFirstPage(setChecklistType)(e.target.value)}>
                            <option value="">All Checklist Types</option>
                            {checklists.map((item) => (
                                <option key={item.id} value={item.id}>{item.checklist_name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="filter-group">
                    <label>Priority</label>
                    <select value={priority} onChange={(e) => resetToFirstPage(setPriority)(e.target.value)}>
                        <option value="">All Priority</option>
                        {PRIORITIES.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Completed From</label>
                    <input type="date" value={startDate} onChange={(e) => resetToFirstPage(setStartDate)(e.target.value)} />
                </div>

                <div className="filter-group">
                    <label>Completed To</label>
                    <input type="date" value={endDate} onChange={(e) => resetToFirstPage(setEndDate)(e.target.value)} />
                </div>
            </FilterBar>

            {loadError && (
                <div className="cap-error" role="alert">
                    <span>{loadError}</span>
                    <button type="button" onClick={() => fetchRows()}>Retry</button>
                </div>
            )}

            <Card
                className="premium-table-card"
                title="Completed Action Point List"
                subtitle={`${totalRecords} record${totalRecords === 1 ? "" : "s"}${isFiltered ? " · filtered" : ""}`}
            >
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={loading}
                    emptyTitle={isFiltered ? "No matching completed Action Points" : "No completed Action Points yet"}
                    emptyDescription={
                        isFiltered
                            ? "Try clearing a filter or widening the date range."
                            : "When an Action Point is completed through Take Action it appears here."
                    }
                />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(Number(size) || 10);
                        setCurrentPage(1);
                    }}
                />
            </Card>

            {/* ==================================================
                VIEW
            ================================================== */}
            {viewRecord && (
                <PremiumModal
                    size="xl"
                    eyebrow="Completed Action Point"
                    title={`#${viewRecord.id} · ${viewRecord.store_name || "Store"}`}
                    subtitle={viewRecord.question || viewRecord.remarks || "Manual Action Point"}
                    icon={<FaCheckCircle />}
                    badges={[
                        { label: "Completed", tone: "success" },
                        viewRecord.checklist_kind && { label: viewRecord.checklist_kind },
                        viewRecord.priority && { label: `${viewRecord.priority} priority`, tone: viewRecord.priority === "Critical" || viewRecord.priority === "High" ? "danger" : "" }
                    ]}
                    onClose={() => setViewRecord(null)}
                    footer={
                        <>
                            <button type="button" className="pm-btn pm-btn-ghost" onClick={() => setViewRecord(null)}>Close</button>
                            {canEdit && (
                                <button
                                    type="button"
                                    className="pm-btn pm-btn-primary"
                                    onClick={() => {
                                        const record = viewRecord;
                                        setViewRecord(null);
                                        openEdit(record);
                                    }}
                                >
                                    <FaEdit /> Edit
                                </button>
                            )}
                        </>
                    }
                >
                    <PmSection title="Originating checklist" icon={<FaClipboardCheck />}>
                        <PmGrid cols={3}>
                            <PmItem label="Store" value={viewRecord.store_name} />
                            <PmItem label="City / State" value={[viewRecord.city, viewRecord.state].filter(Boolean).join(", ")} />
                            <PmItem label="Checklist" value={viewRecord.checklist_name || "Manual Action Point"} />
                            <PmItem label="Checklist type" value={viewRecord.checklist_kind} />
                            <PmItem label="Checklist date" value={formatDay(viewRecord.submission_date)} />
                            <PmItem label="Submitted by" value={viewRecord.submitted_by} />
                            <PmItem label="Question" value={viewRecord.question} wide />
                            <PmItem label="Answer given" value={viewRecord.answer} />
                            <PmItem label="Answer remarks" value={viewRecord.answer_remarks} wide />
                            <PmItem label="Department" value={viewRecord.department_name} />
                        </PmGrid>
                    </PmSection>

                    <PmSection title="Resolution" icon={<FaTasks />}>
                        <PmGrid cols={3}>
                            <PmItem label="Action taken" value={viewRecord.action_taken} wide />
                            <PmItem label="Completed on" value={formatDateTime(viewRecord.completed_at)} />
                            <PmItem label="Completed by" value={viewRecord.completed_by} />
                            <PmItem label="Assigned to" value={viewRecord.assigned_to_name} />
                            <PmItem label="Raised on" value={formatDateTime(viewRecord.created_at)} />
                            <PmItem label="Priority" value={viewRecord.priority} />
                            <PmItem label="Final status" value="Completed" />
                            <PmItem label="Remarks" value={viewRecord.remarks || viewRecord.comment} wide />
                        </PmGrid>
                    </PmSection>

                    <PmSection title="Attachments" icon={<FaPaperclip />}>
                        {Array.isArray(viewRecord.attachments) && viewRecord.attachments.length ? (
                            <ul className="cap-attachments">
                                {viewRecord.attachments.map((file) => (
                                    <li key={file.path}>
                                        <span>
                                            <strong>{file.label}</strong>
                                            <small>{file.name} · {file.source}</small>
                                        </span>
                                        <AttachmentLinks items={[file]} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <span className="pm-muted">No attachments</span>
                        )}
                    </PmSection>

                    <PmSection title="Status history" icon={<FaHistory />} full>
                        {viewLoading || viewRecord.history === null ? (
                            <div className="pm-loading"><PremiumLoader compact title="Loading history" /></div>
                        ) : viewRecord.history?.length ? (
                            <ol className="cap-history">
                                {viewRecord.history.map((item) => (
                                    <li key={item.id}>
                                        <span className="cap-history-dot" aria-hidden="true" />
                                        <div>
                                            <strong>{HISTORY_LABELS[item.action_type] || item.action_type}</strong>
                                            {item.status && <span className="cap-history-status">{item.status === "Closed" ? "Completed" : item.status}</span>}
                                            <small>
                                                {item.changed_by_name || "System"} · {formatDateTime(item.created_at)}
                                            </small>
                                            {(item.remarks || item.comment) && (
                                                <p>{item.remarks || item.comment}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <span className="pm-muted">No history recorded.</span>
                        )}
                    </PmSection>
                </PremiumModal>
            )}

            {/* ==================================================
                EDIT
            ================================================== */}
            {editRecord && (
                <PremiumModal
                    size="lg"
                    eyebrow="Edit completed Action Point"
                    title={`#${editRecord.id} · ${editRecord.store_name || "Store"}`}
                    subtitle="Store, question, checklist and status are fixed. Changes are recorded in the history."
                    icon={<FaEdit />}
                    onClose={() => !saving && setEditRecord(null)}
                    footer={
                        <>
                            <button type="button" className="pm-btn pm-btn-ghost" onClick={() => setEditRecord(null)} disabled={saving}>Cancel</button>
                            <button type="button" className="pm-btn pm-btn-primary" onClick={saveEdit} disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    }
                >
                    <PmSection title="Linked record (read only)">
                        <PmGrid cols={3}>
                            <PmItem label="Store" value={editRecord.store_name} />
                            <PmItem label="Checklist" value={editRecord.checklist_name || "Manual"} />
                            <PmItem label="Completed on" value={formatDateTime(editRecord.completed_at)} />
                            <PmItem label="Question" value={editRecord.question} wide />
                        </PmGrid>
                    </PmSection>

                    <PmSection title="Follow-up details">
                        <PmGrid cols={2}>
                            <PmField label="Priority" required>
                                <select
                                    value={editForm.priority}
                                    onChange={(e) => setEditForm((form) => ({ ...form, priority: e.target.value }))}
                                >
                                    {PRIORITIES.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </PmField>

                            <PmField label="Assigned To">
                                <select
                                    value={editForm.assigned_to}
                                    onChange={(e) => setEditForm((form) => ({ ...form, assigned_to: e.target.value }))}
                                >
                                    <option value="">Not assigned</option>
                                    {editRecord.assigned_to && !assignees.some((u) => String(u.id) === String(editRecord.assigned_to)) && (
                                        <option value={String(editRecord.assigned_to)}>{editRecord.assigned_to_name || `User #${editRecord.assigned_to}`}</option>
                                    )}
                                    {assignees.map((u) => (
                                        <option key={u.id} value={String(u.id)}>
                                            {u.name}{u.employee_id ? ` (${u.employee_id})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </PmField>

                            <PmField label="Action Taken" required wide hint="Shown in Checklist Reports for the original answer.">
                                <textarea
                                    value={editForm.action_taken}
                                    maxLength={5000}
                                    onChange={(e) => setEditForm((form) => ({ ...form, action_taken: e.target.value }))}
                                />
                            </PmField>

                            <PmField label="Remarks" wide>
                                <textarea
                                    value={editForm.remarks}
                                    maxLength={5000}
                                    onChange={(e) => setEditForm((form) => ({ ...form, remarks: e.target.value }))}
                                />
                            </PmField>

                        </PmGrid>
                    </PmSection>
                </PremiumModal>
            )}

            {/* ==================================================
                DELETE (one)
            ================================================== */}
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Delete Completed Action Point"
                message="Remove this record from Completed Action Points? The original checklist answer and its report history stay in Checklist Reports, and attachments stay in Gallery."
                recordName={deleteTarget ? `#${deleteTarget.id} · ${deleteTarget.store_name || ""}` : ""}
                details={deleteTarget?.question || ""}
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />

            {/* ==================================================
                DELETE ALL / FILTERED
            ================================================== */}
            <ConfirmDialog
                open={showDeleteAll}
                title={isFiltered ? "Delete Filtered Completed Action Points" : "Delete All Completed Action Points"}
                message={`This removes ${totalRecords.toLocaleString()} completed Action Point${totalRecords === 1 ? "" : "s"}${isFiltered ? " matching the current filters" : ""} from this module. Checklist Reports, the original answers and Gallery files are not changed.`}
                scope={isFiltered ? "Filtered selection" : "Every completed Action Point you can access"}
                recordCount={totalRecords}
                confirmText={`Delete ${totalRecords.toLocaleString()}`}
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmDeleteAll}
                onCancel={() => !deleting && setShowDeleteAll(false)}
            />
        </div>
    );
}

export default CompletedActionPoints;
