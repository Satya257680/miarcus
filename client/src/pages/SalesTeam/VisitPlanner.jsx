import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaDownload, FaSyncAlt, FaUpload, FaTrash, FaPlus, FaInfoCircle,
  FaSearch, FaEdit, FaTrashAlt, FaCalendarAlt, FaChevronDown
} from "react-icons/fa";
import {
  createVisitPlan, deleteAllVisitPlans, deleteVisitPlan,
  exportVisitPlans, getSalesEmployees, getSalesStores,
  getVisitPlans, importVisitPlans, updateVisitPlan
} from "../../services/salesTeamService";
import {
  canAdd, canDelete, canEdit, canView, downloadBlob, formatDate, toInputDate
} from "./salesTeamUtils";
import "../../styles/pages/SalesTeam.css";

const initialForm = {
  employee_id: "", visit_date: new Date().toISOString().slice(0, 10),
  week_off: false, city: "", reason_to_travel: "", planned_store_ids: []
};

function VisitPlanner() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const fileRef = useRef(null);

  const permission = "Visit Planner";
  const departments = useMemo(
    () => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
    [rows]
  );

  const load = useCallback(async () => {
    if (!canView(permission)) return;
    setLoading(true);
    try {
      const response = await getVisitPlans({
        page, limit, search, from, to,
        name: nameFilter, department: departmentFilter, store: storeFilter
      });
      setRows(response.data?.data || []);
      setTotal(Number(response.data?.total || 0));
    } catch (error) {
      console.error("Visit planner load failed", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, from, to, nameFilter, departmentFilter, storeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([getSalesEmployees(), getSalesStores()])
      .then(([employeeResponse, storeResponse]) => {
        setEmployees(employeeResponse.data?.data || []);
        setStores(storeResponse.data?.data || []);
      })
      .catch((error) => console.error("Sales lookup load failed", error));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(initialForm);
    setEmployeeSearch("");
    setStoreSearch("");
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      employee_id: row.employee_id,
      visit_date: toInputDate(row.visit_date),
      week_off: Boolean(row.week_off),
      city: row.city || "",
      reason_to_travel: row.reason_to_travel || "",
      planned_store_ids: row.planned_store_ids || []
    });
    setEmployeeSearch(row.name || "");
    setStoreSearch("");
    setShowModal(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.employee_id || !form.visit_date) return;
    setSaving(true);
    try {
      if (editing) await updateVisitPlan(editing.id, form);
      else await createVisitPlan(form);
      setShowModal(false);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save planned visit.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this planned visit?")) return;
    try { await deleteVisitPlan(id); await load(); }
    catch (error) { alert(error.response?.data?.message || "Delete failed."); }
  };

  const removeAll = async () => {
    if (!window.confirm("Delete ALL planned visits? This cannot be undone.")) return;
    try { await deleteAllVisitPlans(); setPage(1); await load(); }
    catch (error) { alert(error.response?.data?.message || "Delete all failed."); }
  };

  const exportCsv = async () => {
    try {
      const response = await exportVisitPlans({ search, from, to, name: nameFilter, department: departmentFilter, store: storeFilter });
      downloadBlob(response.data, "visit-planner.csv");
    } catch (error) { alert(error.response?.data?.message || "Export failed."); }
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { await importVisitPlans(file); setPage(1); await load(); alert("Visit plans imported successfully."); }
    catch (error) { alert(error.response?.data?.message || "Import failed."); }
  };

  const visibleEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.employee_id} ${employee.email}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );
  const visibleStores = stores.filter((store) =>
    `${store.store_name} ${store.store_code} ${store.city}`.toLowerCase().includes(storeSearch.toLowerCase())
  );
  const pageCount = Math.max(1, Math.ceil(total / limit));

  if (!canView(permission)) return null;

  return (
    <div className="sales-page visit-planner-page">
      <div className="sales-page-heading">
        <div>
          <h1>Visit Planner <FaInfoCircle title="Plan store visits for your sales force." /></h1>
          <p>Plan store visits for your sales force, or mark a week off. Use Import CSV for bulk rows.</p>
        </div>
      </div>

      <section className="sales-card">
        <div className="sales-toolbar">
          <button className="sales-btn" onClick={exportCsv}><FaDownload /> Export CSV</button>
          <button className="sales-btn" onClick={load}><FaSyncAlt /> Refresh</button>
          {canAdd(permission) && <label className="sales-btn sales-file-btn"><FaUpload /> Import CSV<input ref={fileRef} type="file" accept=".csv" onChange={importCsv} hidden /></label>}
          {canDelete(permission) && <button className="sales-btn danger" onClick={removeAll}><FaTrash /> Delete all</button>}
          {canAdd(permission) && <button className="sales-btn primary-outline" onClick={openAdd}><FaPlus /> Add row</button>}
        </div>

        <div className="sales-filter-row top-filters">
          <label>From<input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} /></label>
          <label>To<input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} /></label>
          <label className="wide">Search<div className="input-with-icon"><FaSearch /><input placeholder="Name, city, planned stores..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} /></div></label>
        </div>
        <div className="sales-help">Leave From and To empty to show all dates; set both to filter.</div>
        <div className="sales-filter-row">
          <label className="wide"><input placeholder="Filter by name..." value={nameFilter} onChange={(e) => { setPage(1); setNameFilter(e.target.value); }} /></label>
          <label className="wide"><select value={departmentFilter} onChange={(e) => { setPage(1); setDepartmentFilter(e.target.value); }}><option value="">Filter by department...</option>{departments.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="wide"><input placeholder="Filter by store (planned)..." value={storeFilter} onChange={(e) => { setPage(1); setStoreFilter(e.target.value); }} /></label>
        </div>
      </section>

      <section className="sales-table-card">
        <div className="sales-table-wrap">
          <table className="sales-table visit-table">
            <thead><tr><th>Date</th><th>Day</th><th>Name</th><th>Designation</th><th>Department</th><th>City</th><th>Reason to travel</th><th>Planned</th><th>Remarks</th><th>Approval</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="11" className="empty-cell">Loading...</td></tr> : rows.length === 0 ? <tr><td colSpan="11" className="empty-cell">No planned visits found.</td></tr> : rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.visit_date)}</td>
                  <td>{row.day_name}</td>
                  <td>{row.name}</td>
                  <td>{row.designation || "—"}</td>
                  <td>{row.department || "—"}</td>
                  <td>{row.city || "—"}</td>
                  <td>{row.reason_to_travel || "—"}</td>
                  <td>{row.week_off ? "Week off" : (row.planned_store_names || "—")}</td>
                  <td>{row.remarks || "—"}</td>
                  <td><span className={`sales-status ${String(row.approval_status || "Pending").toLowerCase()}`}>{row.approval_status || "Pending"}</span></td>
                  <td className="actions-cell">{canEdit(permission) && <button title="Edit" onClick={() => openEdit(row)}><FaEdit /></button>}{canDelete(permission) && <button className="delete-link" title="Delete" onClick={() => remove(row.id)}><FaTrashAlt /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sales-pagination">
          <span>Total: <b>{total}</b> entries</span><span>Page {page} of {pageCount}</span>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
          <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next →</button>
          <span>Go to page:</span><input value={page} onChange={(e) => setPage(Math.min(pageCount, Math.max(1, Number(e.target.value) || 1)))} /><span>Items per page:</span><select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}><option>10</option><option>20</option><option>50</option></select>
        </div>
      </section>

      {showModal && (
        <div className="sales-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <form className="sales-modal" onSubmit={save}>
            <h2>{editing ? "Edit planned visit" : "Add planned visit"}</h2>
            <label>Employee
              <div className="sales-combobox">
                <input value={employeeSearch} placeholder="Search name or employee ID..." onChange={(e) => { setEmployeeSearch(e.target.value); setEmployeeOpen(true); setForm((f) => ({ ...f, employee_id: "" })); }} onFocus={() => setEmployeeOpen(true)} />
                <FaChevronDown />
                {employeeOpen && <div className="sales-options">{visibleEmployees.slice(0, 30).map((employee) => <button type="button" key={employee.id} onClick={() => { setForm((f) => ({ ...f, employee_id: employee.id })); setEmployeeSearch(employee.name); setEmployeeOpen(false); }}>{employee.name} <small>{employee.employee_id}</small></button>)}</div>}
              </div>
            </label>
            <label>Date<input type="date" value={form.visit_date} onChange={(e) => setForm((f) => ({ ...f, visit_date: e.target.value }))} required /></label>
            <label className="checkbox-line"><input type="checkbox" checked={form.week_off} onChange={(e) => setForm((f) => ({ ...f, week_off: e.target.checked }))} /> Week off</label>
            <label>City<input value={form.city} disabled={form.planned_store_ids.length > 0} placeholder="Select planned stores to auto-fill" onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></label>
            <label>Reason to travel<textarea value={form.reason_to_travel} placeholder="Purpose of this visit (from visit plan)..." onChange={(e) => setForm((f) => ({ ...f, reason_to_travel: e.target.value }))} /></label>
            <label>Planned stores
              <div className="sales-combobox">
                <input value={storeSearch} placeholder="Search store name..." onChange={(e) => { setStoreSearch(e.target.value); setStoreOpen(true); }} onFocus={() => setStoreOpen(true)} />
                <FaChevronDown />
                {storeOpen && <div className="sales-options">{visibleStores.slice(0, 30).map((store) => <button type="button" key={store.id} onClick={() => { setForm((f) => ({ ...f, planned_store_ids: f.planned_store_ids.includes(store.id) ? f.planned_store_ids : [...f.planned_store_ids, store.id], city: f.city || store.city || "" })); setStoreSearch(""); }}>{store.store_name} <small>{store.city || store.store_code}</small></button>)}</div>}
              </div>
              <div className="selected-chips">{form.planned_store_ids.map((id) => { const store = stores.find((s) => Number(s.id) === Number(id)); return store ? <button type="button" key={id} onClick={() => setForm((f) => ({ ...f, planned_store_ids: f.planned_store_ids.filter((x) => Number(x) !== Number(id)) }))}>{store.store_name} ×</button> : null; })}</div>
            </label>
            <div className="sales-modal-actions"><button type="button" className="sales-btn" onClick={() => setShowModal(false)}>Cancel</button><button className="sales-btn primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export default VisitPlanner;
