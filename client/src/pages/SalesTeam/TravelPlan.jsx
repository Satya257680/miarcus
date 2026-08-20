import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCommentAlt, FaHistory, FaSyncAlt, FaTrash, FaDownload, FaTimes } from "react-icons/fa";
import PageHeader from "../../components/common/PageHeader";
import PageToolbar from "../../components/common/PageToolbar";
import FilterBar from "../../components/common/FilterBar";
import Card from "../../components/common/Card";
import DataTable from "../../components/common/DataTable";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  getTravelPlans,
  getSalesStores,
  saveActualStores,
  getTravelPlanHistory,
  addTravelRemark,
  deleteTravelPlan,
  exportVisitPlans,
} from "../../services/salesTeamService";
import { canDelete, canEdit, canView, downloadBlob, formatDate } from "./salesTeamUtils";
import "../../styles/pages/SalesTeam.css";

function TravelPlan() {
  const permission = "Travel Plan";
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [store, setStore] = useState("");
  const [actual, setActual] = useState({});
  const [remarksRow, setRemarksRow] = useState(null);
  const [history, setHistory] = useState([]);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const attachmentRef = useRef(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState(null);

  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(), [rows]);

  const load = useCallback(async () => {
    if (!canView(permission)) return;
    setLoading(true);
    try {
      const response = await getTravelPlans({ page, limit, search, from, to, name, department, store });
      setRows(response.data?.data || []);
      setTotal(Number(response.data?.total || 0));
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to load Travel Plan.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, from, to, name, department, store]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getSalesStores().then((response) => setStores(response.data?.data || [])).catch(console.error); }, []);

  const setSelection = (id, value) => setActual((current) => ({ ...current, [id]: value }));

  const save = async (row) => {
    try {
      await saveActualStores(row.id, actual[row.id] ?? row.actual_store_ids ?? []);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save actual stores.");
    }
  };

  const openHistory = async (row) => {
    try {
      const response = await getTravelPlanHistory(row.id);
      setHistory(response.data?.data || []);
      setRemarkDraft("");
      setAttachment(null);
      setRemarksRow(row);
    } catch (error) {
      alert(error.response?.data?.message || "Unable to load history.");
    }
  };

  const openRemarks = (row) => {
    setHistory([]);
    setRemarkDraft(row.remarks || "");
    setAttachment(null);
    setRemarksRow(row);
  };

  const saveRemark = async () => {
    if (!remarksRow) return;
    try {
      await addTravelRemark(remarksRow.id, remarkDraft, attachment);
      setRemarkDraft("");
      setAttachment(null);
      if (attachmentRef.current) attachmentRef.current.value = "";
      await load();
      await openHistory(remarksRow);
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save remark.");
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteTravelPlan(deleteId);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed.");
    } finally {
      setDeleteId(null);
    }
  };

  const exportCsv = async () => {
    try {
      const response = await exportVisitPlans({ search, from, to, name, department, store, approved_only: 1 });
      downloadBlob(response.data, "travel-plan.csv");
    } catch (error) {
      alert(error.response?.data?.message || "Export failed.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setName("");
    setDepartment("");
    setStore("");
    setPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  const columns = [
    { key: "visit_date", title: "Date", minWidth: "110px", render: (row) => formatDate(row.visit_date) },
    { key: "day_name", title: "Day", minWidth: "110px" },
    { key: "name", title: "Name", minWidth: "170px", render: (row) => <strong>{row.name}</strong> },
    { key: "designation", title: "Designation", minWidth: "160px", render: (row) => row.designation || "—" },
    { key: "department", title: "Department", minWidth: "150px", render: (row) => row.department || "—" },
    { key: "city", title: "City", minWidth: "130px", render: (row) => row.city || "—" },
    { key: "planned_store_names", title: "Planned", minWidth: "240px", render: (row) => row.planned_store_names || "—" },
    {
      key: "actual",
      title: "Actual",
      minWidth: "230px",
      render: (row) => row.week_off ? <span className="sales-weekoff">Week off</span> : (
        <div className="actual-store-editor">
          <select
            multiple
            value={(actual[row.id] ?? row.actual_store_ids ?? []).map(String)}
            onChange={(event) => setSelection(row.id, [...event.target.selectedOptions].map((option) => Number(option.value)))}
          >
            {(row.planned_store_ids || []).length
              ? stores.filter((storeItem) => row.planned_store_ids.includes(Number(storeItem.id))).map((storeItem) => <option key={storeItem.id} value={storeItem.id}>{storeItem.store_name}</option>)
              : null}
          </select>
          {canEdit(permission) && <button type="button" className="mini-save-btn" onClick={() => save(row)}>Save</button>}
        </div>
      ),
    },
    { key: "reason_to_travel", title: "Reason to travel", minWidth: "220px", render: (row) => <span className="sales-wrap-cell">{row.reason_to_travel || "—"}</span> },
    {
      key: "visit_rate",
      title: "Visit Rate",
      minWidth: "110px",
      align: "center",
      render: (row) => row.week_off ? <span className="sales-weekoff">Week off</span> : (() => {
        const selected = actual[row.id] ?? row.actual_store_ids ?? [];
        const rate = row.planned_store_count ? Math.round((selected.length / row.planned_store_count) * 100) : 0;
        return <span className={`visit-rate ${rate >= 100 ? "complete" : "partial"}`}>{rate}%</span>;
      })(),
    },
    { key: "remarks", title: "Remarks", minWidth: "150px", align: "center", render: (row) => <button type="button" className="sales-text-link" onClick={() => openRemarks(row)}><FaCommentAlt /> {row.remarks ? "View" : "Add remarks"}</button> },
    { key: "history", title: "History", minWidth: "110px", align: "center", render: (row) => <button type="button" className="sales-text-link" onClick={() => openHistory(row)}><FaHistory /> View</button> },
    { key: "actions", title: "Actions", minWidth: "110px", align: "center", render: (row) => canDelete(permission) ? <button type="button" className="sales-text-link danger" onClick={() => setDeleteId(row.id)}><FaTrash /> Delete</button> : <span>—</span> },
  ];

  if (!canView(permission)) return null;

  return (
    <div className="sales-page sales-standard-page">
      <PageHeader title="Travel Plan" subtitle="Work only with approved plans. Save actual stores, track visit rate, remarks and history." />

      <PageToolbar
        search={search}
        setSearch={(value) => { setPage(1); setSearch(value); }}
        placeholder="Search name, city, planned store..."
        showExport
        onExport={exportCsv}
      >
        <button type="button" className="toolbar-btn refresh-toolbar-btn" onClick={load}><FaSyncAlt /> Refresh</button>
      </PageToolbar>

      <FilterBar onClear={clearFilters}>
        <label className="sales-global-filter"><span>From</span><input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} /></label>
        <label className="sales-global-filter"><span>To</span><input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} /></label>
        <label className="sales-global-filter"><span>Name</span><input placeholder="Filter by name..." value={name} onChange={(e) => { setPage(1); setName(e.target.value); }} /></label>
        <label className="sales-global-filter"><span>Department</span><select value={department} onChange={(e) => { setPage(1); setDepartment(e.target.value); }}><option value="">All departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="sales-global-filter"><span>Store</span><input placeholder="Planned store..." value={store} onChange={(e) => { setPage(1); setStore(e.target.value); }} /></label>
      </FilterBar>

      <Card title="Approved Travel Plans" subtitle={`${total} approved plan${total === 1 ? "" : "s"} found`} noPadding>
        <DataTable columns={columns} data={rows} loading={loading} emptyTitle="No Approved Travel Plans" emptyDescription="Approved plans will appear here for actual-store tracking." className="sales-global-table travel-global-table" />
        <Pagination currentPage={page} totalPages={pageCount} totalRecords={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setLimit(size); }} />
      </Card>

      {remarksRow && (
        <div className="sales-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setRemarksRow(null)}>
          <div className="sales-form-modal remarks-modal">
            <div className="sales-modal-header">
              <div><h2>{history.length ? "Travel History & Remarks" : "Travel Remarks"}</h2><p>{remarksRow.name} · {formatDate(remarksRow.visit_date)}</p></div>
              <button type="button" className="sales-modal-close" onClick={() => setRemarksRow(null)}><FaTimes /></button>
            </div>
            {history.length > 0 && <div className="history-list">{history.map((item) => <div className="history-item" key={item.id}><div><strong>{item.user_name || "User"}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div><p>{item.remark || "No remark"}</p>{item.attachments && <a href={item.attachments} target="_blank" rel="noreferrer">View attachment</a>}</div>)}</div>}
            <label className="sales-field sales-field-full"><span>Add remark</span><textarea value={remarkDraft} onChange={(event) => setRemarkDraft(event.target.value)} placeholder="Enter remarks..." rows={4} /></label>
            <label className="sales-field sales-field-full"><span>Attachment</span><input ref={attachmentRef} type="file" onChange={(event) => setAttachment(event.target.files?.[0] || null)} /></label>
            <div className="sales-modal-actions"><button type="button" className="modal-secondary-btn" onClick={() => setRemarksRow(null)}>Close</button>{canEdit(permission) && <button type="button" className="modal-primary-btn" onClick={saveRemark}>Save Remark</button>}</div>
          </div>
        </div>
      )}

      <ConfirmDialog open={Boolean(deleteId)} title="Delete Travel Plan" message="Are you sure you want to delete this approved travel plan?" confirmText="Delete" cancelText="Cancel" confirmVariant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

export default TravelPlan;
