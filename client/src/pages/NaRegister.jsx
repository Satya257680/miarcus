import { useCallback, useEffect, useRef, useState } from "react";
import axios from "../axiosConfig.js";

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import AttachmentLinks from "../components/common/AttachmentLinks";
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
// ======================================================

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

    const [search, setSearch] = useState("");
    const [store, setStore] = useState("");
    const [checklistType, setChecklistType] = useState("");
    const [questionId, setQuestionId] = useState("");
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
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
        return params;
    }, [search, store, checklistType, questionId, fromDate, toDate]);

    const isFiltered = Object.keys(filterParams()).length > 0;

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
        }
    ];

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
        </div>
    );
}
