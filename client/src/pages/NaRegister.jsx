import { useCallback, useEffect, useRef, useState } from "react";
import axios from "../axiosConfig.js";

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import AttachmentLinks from "../components/common/AttachmentLinks";
import ActionButtons from "../components/common/ActionButtons";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ProfessionalModal from "../components/common/ProfessionalModal";
import { FaTrash } from "react-icons/fa";
import { activeFilters, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";
import { exportObjectsData } from "../utils/exportUtils.js";
import runAfterCommit from "../utils/runAfterCommit";

import "../styles/ActionPoints.css";
import "../styles/premium/ChecklistPremium.css";
import "../styles/NaRegister.css";

// ======================================================
// N/A REGISTER
// ------------------------------------------------------
// Every checklist answer submitted as "N/A" — the item or feature the
// question asks about is NOT present at the store. N/A answers never
// raise an Action Point; they are listed here so the operations team
// can see which stores are missing which items.
//
// Access (enforced by the server, see server/utils/naRegisterAccess.js)
//   • Administrators and users with full store access → by default
//   • Everyone else → only when "N/A Register" is granted in
//     Users → Access
// Store users granted access see only their own stores.
//
// Actions (same levels as Action Points)
//   • View  → View button
//   • Edit  → Edit (answer / remarks)
//   • Full  → Delete, Delete All / Delete Filtered
// ======================================================

const ANSWER_SUGGESTIONS = ["N/A", "Yes", "No"];
const LEVEL_RANK = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };

const isNaAnswer = (value) =>
    ["n/a", "na", "n.a", "n.a.", "n a", "not applicable", "not-applicable", "notapplicable"].includes(
        String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase()
    );

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(String(value).replace(" ", "T"));
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

const EXPORT_COLUMNS = [
    { key: "submission_date", label: "Submission Date", value: (r) => formatDateTime(r.submission_date) },
    { key: "store_name", label: "Store" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "checklist_name", label: "Checklist" },
    { key: "question", label: "Question" },
    { key: "department_name", label: "Department" },
    { key: "answer", label: "Answer", value: () => "N/A" },
    { key: "remarks", label: "Remarks" },
    { key: "employee_name", label: "Submitted By" },
    { key: "employee_id", label: "Employee ID" },
    { key: "submission_id", label: "Submission #" }
];

export default function NaRegister() {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({ total: 0, stores: 0, questions: 0, submissions: 0, top_questions: [] });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [exporting, setExporting] = useState(false);

    const [stores, setStores] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [nsoProjects, setNsoProjects] = useState([]);

    // Effective level returned by the server ("View" | "Edit" | "Full").
    const [level, setLevel] = useState("View");
    const canEdit = (LEVEL_RANK[level] || 0) >= LEVEL_RANK.Edit;
    const canDelete = level === "Full";

    const [viewRow, setViewRow] = useState(null);
    const [editRow, setEditRow] = useState(null);
    const [editForm, setEditForm] = useState({ answer: "", remarks: "" });
    const [saving, setSaving] = useState(false);
    const [deleteRow, setDeleteRow] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteAll, setShowDeleteAll] = useState(false);

    const [search, setSearch] = useState("");
    const [store, setStore] = useState("");
    const [checklistType, setChecklistType] = useState("");
    const [questionId, setQuestionId] = useState("");
    const [department, setDepartment] = useState("");
    const [designation, setDesignation] = useState("");
    const [nsoProject, setNsoProject] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalPages, setTotalPages] = useState(1);

    const requestRef = useRef(0);

    const filterParams = useCallback(() => {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (store) params.store_id = store;
        if (checklistType) params.checklist_type_id = checklistType;
        if (questionId) params.question_id = questionId;
        if (department) params.department_id = department;
        if (designation) params.designation_id = designation;
        if (nsoProject) params.new_store_opening_id = nsoProject;
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
        return activeFilters(params);
    }, [search, store, checklistType, questionId, department, designation, nsoProject, fromDate, toDate]);

    const isFiltered = hasActiveFilters(filterParams());

    const fetchRows = useCallback(async () => {
        const requestId = ++requestRef.current;
        setLoading(true);
        setLoadError("");
        try {
            const { data } = await axios.get("/api/na-register", {
                params: { ...filterParams(), page: currentPage, limit: pageSize }
            });
            if (requestId !== requestRef.current) return;
            setRows(Array.isArray(data?.data) ? data.data : []);
            setSummary(data?.summary || { total: 0, stores: 0, questions: 0, submissions: 0, top_questions: [] });
            setTotalPages(data?.pagination?.totalPages || 1);
            if (data?.level) setLevel(data.level);
        } catch (error) {
            if (requestId !== requestRef.current) return;
            setRows([]);
            setLoadError(error?.response?.data?.message || "Unable to load the N/A Register.");
        } finally {
            if (requestId === requestRef.current) setLoading(false);
        }
    }, [filterParams, currentPage, pageSize]);

    useEffect(() => runAfterCommit(() => {
        fetchRows();
    }), [fetchRows]);

    useEffect(() => {
        let alive = true;
        axios
            .get("/api/na-register/filters")
            .then(({ data }) => {
                if (!alive) return;
                setStores(Array.isArray(data?.stores) ? data.stores : []);
                setChecklists(Array.isArray(data?.checklist_types) ? data.checklist_types : []);
                setDepartments(Array.isArray(data?.departments) ? data.departments : []);
                setDesignations(Array.isArray(data?.designations) ? data.designations : []);
                setNsoProjects(Array.isArray(data?.nso_projects) ? data.nso_projects : []);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    const resetToFirstPage = (setter) => (value) => {
        setter(value);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearch("");
        setStore("");
        setChecklistType("");
        setQuestionId("");
        setDepartment("");
        setDesignation("");
        setNsoProject("");
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
    };

    const handleExport = async (format = "xlsx") => {
        if (exporting) return;
        try {
            setExporting(true);
            const { data } = await axios.get("/api/na-register/export", { params: filterParams() });
            const list = Array.isArray(data?.data) ? data.data : [];
            if (!list.length) {
                alert("There are no N/A records to export.");
                return;
            }
            await exportObjectsData({
                columns: EXPORT_COLUMNS,
                data: list,
                filename: `NA-Register-${new Date().toISOString().slice(0, 10)}`,
                format,
                title: "N/A Register"
            });
            if (data?.truncated) {
                alert("Only the first 20,000 records were exported. Narrow the filters to export the rest.");
            }
        } catch (error) {
            alert(error?.response?.data?.message || "Unable to export the N/A Register.");
        } finally {
            setExporting(false);
        }
    };

    // ======================================================
    // VIEW / EDIT / DELETE
    // ======================================================

    const openView = async (row) => {
        setViewRow(row);
        try {
            const { data } = await axios.get(`/api/na-register/${row.answer_id}`);
            if (data?.data) setViewRow(data.data);
        } catch {
            // keep the row from the list
        }
    };

    const openEdit = (row) => {
        if (!canEdit) return;
        setEditRow(row);
        setEditForm({ answer: row.answer || "N/A", remarks: row.remarks || "" });
    };

    const saveEdit = async () => {
        if (!editRow || saving) return;
        if (!String(editForm.answer || "").trim()) {
            alert("Answer is required.");
            return;
        }
        try {
            setSaving(true);
            const { data } = await axios.put(`/api/na-register/${editRow.answer_id}`, {
                answer: editForm.answer,
                remarks: editForm.remarks
            });
            const movedOut = !isNaAnswer(editForm.answer);
            alert(
                movedOut
                    ? "Answer updated. It is no longer N/A, so it has left the N/A Register. Use Action Points → Re-check Answers to raise an Action Point if needed."
                    : data?.message || "N/A record updated successfully."
            );
            setEditRow(null);
            await fetchRows();
        } catch (error) {
            alert(error?.response?.data?.message || "Unable to update the N/A record.");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteRow || deleting) return;
        try {
            setDeleting(true);
            await axios.delete(`/api/na-register/${deleteRow.answer_id}`);
            alert("N/A record deleted successfully.");
            setDeleteRow(null);
            if (rows.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
            else await fetchRows();
        } catch (error) {
            alert(error?.response?.data?.message || "Unable to delete the N/A record.");
        } finally {
            setDeleting(false);
        }
    };

    // No filter → every N/A record you can see. Any filter / search →
    // only the records matching the filters (all pages).
    const confirmDeleteAll = async () => {
        if (!canDelete || deleting) return;
        try {
            setDeleting(true);
            const { data } = await axios.delete(
                "/api/na-register",
                isFiltered ? { data: { scope: "filtered", filters: filterParams() } } : undefined
            );
            alert(data?.message || "N/A records deleted successfully.");
            setShowDeleteAll(false);
            setCurrentPage(1);
            await fetchRows();
        } catch (error) {
            alert(error?.response?.data?.message || "Unable to delete N/A records.");
        } finally {
            setDeleting(false);
        }
    };

    const columns = [
        {
            key: "submission_date",
            title: "Submitted",
            minWidth: "150px",
            render: (row) => formatDateTime(row.submission_date)
        },
        {
            key: "store_name",
            title: "Store",
            minWidth: "160px",
            render: (row) => (
                <div className="na-store-cell">
                    <strong>{row.store_name || "-"}</strong>
                    {(row.city || row.state) && (
                        <small>{[row.city, row.state].filter(Boolean).join(", ")}</small>
                    )}
                </div>
            )
        },
        {
            key: "checklist_name",
            title: "Checklist",
            render: (row) => row.checklist_name || "-"
        },
        {
            key: "question",
            title: "Question",
            minWidth: "300px",
            render: (row) => <div className="question-cell">{row.question || "-"}</div>
        },
        {
            key: "department_name",
            title: "Department",
            render: (row) => row.department_name || "-"
        },
        {
            key: "answer",
            title: "Answer",
            render: () => <span className="na-chip">N/A</span>
        },
        {
            key: "remarks",
            title: "Remarks",
            minWidth: "220px",
            render: (row) => <div className="remarks-cell">{row.remarks || "-"}</div>
        },
        {
            key: "employee_name",
            title: "Submitted By",
            minWidth: "150px",
            render: (row) => (
                <div className="na-store-cell">
                    <strong>{row.employee_name || "-"}</strong>
                    {row.employee_id && <small>{row.employee_id}</small>}
                </div>
            )
        },
        {
            key: "photos",
            title: "Attachment",
            render: (row) => (
                <AttachmentLinks
                    items={row.photos}
                    title={`N/A · ${row.store_name || "Store"}`}
                    subtitle={row.question || ""}
                />
            )
        },
        {
            key: "actions",
            title: "Actions",
            minWidth: "260px",
            render: (row) => (
                <ActionButtons
                    showView
                    onView={() => openView(row)}
                    showEdit={canEdit}
                    onEdit={() => openEdit(row)}
                    showDelete={canDelete}
                    onDelete={() => setDeleteRow(row)}
                />
            )
        }
    ];

    const filteredDesignations = designations.filter(
        (item) => !department || item.department_id == null || String(item.department_id) === String(department)
    );

    const detail = (label, value) => (
        <div className="na-detail">
            <span>{label}</span>
            <div>{value || value === 0 ? value : "-"}</div>
        </div>
    );

    const stat = (label, value, hint) => (
        <div className="na-stat">
            <span>{label}</span>
            <strong>{Number(value || 0).toLocaleString("en-IN")}</strong>
            {hint && <small>{hint}</small>}
        </div>
    );

    return (
        <div className="action-points-page ap-premium na-register-page">
            <PageHeader
                className="premium-hero"
                title="N/A Register"
                subtitle="Checklist questions answered N/A — the item is not present at the store. These never create an Action Point; review them here."
            />

            <div className="na-stats">
                {stat("N/A answers", summary.total)}
                {stat("Stores", summary.stores, "with at least one N/A")}
                {stat("Questions", summary.questions, "marked N/A")}
                {stat("Checklists", summary.submissions, "submissions involved")}
            </div>

            {summary.top_questions?.length > 0 && (
                <div className="na-top">
                    <span className="na-top-label">Most often N/A</span>
                    <div className="na-top-list">
                        {summary.top_questions.map((item) => (
                            <button
                                type="button"
                                key={item.question_id}
                                className={`na-top-item ${String(questionId) === String(item.question_id) ? "is-active" : ""}`}
                                onClick={() =>
                                    resetToFirstPage(setQuestionId)(
                                        String(questionId) === String(item.question_id) ? "" : String(item.question_id)
                                    )
                                }
                                title="Show only this question"
                            >
                                <span>{item.question || `Question #${item.question_id}`}</span>
                                <b>{item.total}</b>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <PageToolbar
                search={search}
                setSearch={resetToFirstPage(setSearch)}
                debounceMs={300}
                placeholder="Search store, question, checklist, person, remarks..."
                showExport
                onExport={handleExport}
                exportLoading={exporting}
            />

            {canDelete && (
                <div className="action-point-management-actions">
                    <button
                        type="button"
                        className="delete-all-action-btn"
                        onClick={() => setShowDeleteAll(true)}
                        disabled={!summary.total}
                    >
                        <FaTrash />
                        {deleteAllLabel(isFiltered, isFiltered ? summary.total : undefined)}
                    </button>
                </div>
            )}

            <FilterBar onClear={clearFilters}>
                <div className="filter-group">
                    <label>Store</label>
                    <select value={store} onChange={(e) => resetToFirstPage(setStore)(e.target.value)}>
                        <option value="">All Stores</option>
                        {stores.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.store_name}
                                {item.city ? ` — ${item.city}` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Department</label>
                    <select
                        value={department}
                        onChange={(e) => {
                            const next = e.target.value;
                            resetToFirstPage(setDepartment)(next);
                            // Keep Designation consistent with the department.
                            const current = designations.find((d) => String(d.id) === String(designation));
                            if (next && current && current.department_id != null && String(current.department_id) !== String(next)) {
                                setDesignation("");
                            }
                        }}
                    >
                        <option value="">All Departments</option>
                        {departments.map((item) => (
                            <option key={item.id} value={item.id}>{item.department_name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Designation</label>
                    <select value={designation} onChange={(e) => resetToFirstPage(setDesignation)(e.target.value)}>
                        <option value="">All Designations</option>
                        {filteredDesignations.map((item) => (
                            <option key={item.id} value={item.id}>{item.designation_name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>NSO Project</label>
                    <select value={nsoProject} onChange={(e) => resetToFirstPage(setNsoProject)(e.target.value)}>
                        <option value="">All NSO Projects</option>
                        {nsoProjects.map((item) => (
                            <option key={item.id} value={item.id}>
                                #{item.id} - {item.location || item.city || "NSO Project"}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Checklist Type</label>
                    <select value={checklistType} onChange={(e) => resetToFirstPage(setChecklistType)(e.target.value)}>
                        <option value="">All Checklist Types</option>
                        {checklists.map((item) => (
                            <option key={item.id} value={item.id}>{item.checklist_name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>From Date</label>
                    <input type="date" value={fromDate} onChange={(e) => resetToFirstPage(setFromDate)(e.target.value)} />
                </div>

                <div className="filter-group">
                    <label>To Date</label>
                    <input type="date" value={toDate} onChange={(e) => resetToFirstPage(setToDate)(e.target.value)} />
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
                title="N/A Items"
                subtitle={`${summary.total} record${summary.total === 1 ? "" : "s"}${isFiltered ? " · filtered" : ""}`}
            >
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={loading}
                    emptyTitle={isFiltered ? "No matching N/A answers" : "No N/A answers yet"}
                    emptyDescription={
                        isFiltered
                            ? "Try clearing a filter or widening the date range."
                            : "When a checklist question is answered N/A it appears here instead of creating an Action Point."
                    }
                />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={summary.total}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(Number(size) || 25);
                        setCurrentPage(1);
                    }}
                />
            </Card>

            {/* ================= VIEW ================= */}
            <ProfessionalModal
                isOpen={Boolean(viewRow)}
                onClose={() => setViewRow(null)}
                title="N/A Record"
                subtitle={viewRow ? `${viewRow.store_name || "Store"} · Submission #${viewRow.submission_id}` : ""}
                icon="i"
                size="large"
                scrollable
                footer={
                    <>
                        {canEdit && viewRow && (
                            <button
                                type="button"
                                className="professional-btn professional-btn-primary"
                                onClick={() => {
                                    const row = viewRow;
                                    setViewRow(null);
                                    openEdit(row);
                                }}
                            >
                                Edit
                            </button>
                        )}
                        <button type="button" className="professional-btn professional-btn-secondary" onClick={() => setViewRow(null)}>
                            Close
                        </button>
                    </>
                }
            >
                {viewRow && (
                    <div className="na-detail-grid">
                        {detail("Submitted", formatDateTime(viewRow.submission_date))}
                        {detail("Store", [viewRow.store_name, viewRow.city, viewRow.state].filter(Boolean).join(", "))}
                        {detail("Checklist", viewRow.checklist_name)}
                        {detail("Department", viewRow.department_name)}
                        <div className="na-detail na-detail-wide">
                            <span>Question</span>
                            <div>{viewRow.question || "-"}</div>
                        </div>
                        {detail("Answer", <span className="na-chip">{viewRow.answer || "N/A"}</span>)}
                        {detail("Submitted By", [viewRow.employee_name, viewRow.employee_id].filter(Boolean).join(" · "))}
                        <div className="na-detail na-detail-wide">
                            <span>Remarks</span>
                            <div>{viewRow.remarks || "-"}</div>
                        </div>
                        <div className="na-detail na-detail-wide">
                            <span>Attachment</span>
                            <div>
                                <AttachmentLinks
                                    items={viewRow.photos}
                                    title={`N/A · ${viewRow.store_name || "Store"}`}
                                    subtitle={viewRow.question || ""}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </ProfessionalModal>

            {/* ================= EDIT ================= */}
            <ProfessionalModal
                isOpen={Boolean(editRow)}
                onClose={() => !saving && setEditRow(null)}
                title="Edit N/A Record"
                subtitle={editRow ? editRow.question || "" : ""}
                icon="✎"
                size="medium"
                footer={
                    <>
                        <button
                            type="button"
                            className="professional-btn professional-btn-secondary"
                            onClick={() => setEditRow(null)}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="professional-btn professional-btn-primary"
                            onClick={saveEdit}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </>
                }
            >
                {editRow && (
                    <div className="na-edit-form">
                        <div className="na-detail-grid">
                            {detail("Store", editRow.store_name)}
                            {detail("Checklist", editRow.checklist_name)}
                        </div>

                        <label className="na-field">
                            <span>Answer</span>
                            <input
                                type="text"
                                list="na-answer-suggestions"
                                value={editForm.answer}
                                onChange={(e) => setEditForm((f) => ({ ...f, answer: e.target.value }))}
                                maxLength={1000}
                            />
                            <datalist id="na-answer-suggestions">
                                {ANSWER_SUGGESTIONS.map((item) => (
                                    <option key={item} value={item} />
                                ))}
                            </datalist>
                            {!isNaAnswer(editForm.answer) && String(editForm.answer || "").trim() && (
                                <small className="na-field-warning">
                                    This answer is not N/A — after saving, the record leaves the N/A Register.
                                </small>
                            )}
                        </label>

                        <label className="na-field">
                            <span>Remarks</span>
                            <textarea
                                rows={4}
                                value={editForm.remarks}
                                onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                                maxLength={5000}
                                placeholder="Add remarks..."
                            />
                        </label>
                    </div>
                )}
            </ProfessionalModal>

            {/* ================= DELETE ONE ================= */}
            <ConfirmDialog
                open={Boolean(deleteRow)}
                title="Delete N/A Record"
                message="Are you sure you want to delete this N/A record? The checklist answer is removed permanently."
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteRow(null)}
            />

            {/* ================= DELETE ALL / FILTERED ================= */}
            <ConfirmDialog
                open={showDeleteAll}
                title={isFiltered ? "Delete Filtered N/A Records" : "Delete All N/A Records"}
                message={deleteAllMessage(isFiltered, isFiltered ? summary.total : null, "N/A records")}
                confirmText={isFiltered ? "Delete Filtered" : "Delete All"}
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmDeleteAll}
                onCancel={() => setShowDeleteAll(false)}
            />
        </div>
    );
}
