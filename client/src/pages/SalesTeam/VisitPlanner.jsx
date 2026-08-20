import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaDownload,
  FaInfoCircle,
  FaPlus,
  FaSyncAlt,
  FaTrash,
  FaUpload,
  FaCheckCircle,
  FaClock,
  FaTimes,
} from "react-icons/fa";
import PageHeader from "../../components/common/PageHeader";
import PageToolbar from "../../components/common/PageToolbar";
import FilterBar from "../../components/common/FilterBar";
import Card from "../../components/common/Card";
import DataTable from "../../components/common/DataTable";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import BulkUploadModal from "../../components/common/BulkUploadModal";
import {
  createVisitPlan,
  deleteAllVisitPlans,
  deleteVisitPlan,
  exportVisitPlans,
  getSalesEmployees,
  getSalesStores,
  getVisitPlans,
  importVisitPlans,
  updateVisitPlan,
} from "../../services/salesTeamService";
import {
  canAdd,
  canDelete,
  canEdit,
  canView,
  downloadBlob,
  formatDate,
  getStoredUser,
  isAdmin,
  toInputDate,
} from "./salesTeamUtils";
import "../../styles/pages/SalesTeam.css";

const makeInitialForm = () => ({
  employee_id: "",
  visit_date: new Date().toISOString().slice(0, 10),
  week_off: false,
  city: "",
  reason_to_travel: "",
  planned_store_ids: [],
});

function VisitPlanner() {
  const permission = "Visit Planner";
  const user = getStoredUser();
  const admin = isAdmin();

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [form, setForm] = useState(makeInitialForm());
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const departments = useMemo(
    () => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(),
    [rows]
  );

  const load = useCallback(async () => {
    if (!canView(permission)) return;
    setLoading(true);
    try {
      const response = await getVisitPlans({
        page,
        limit,
        search,
        from,
        to,
        name: nameFilter,
        department: departmentFilter,
        store: storeFilter,
      });
      setRows(response.data?.data || []);
      setTotal(Number(response.data?.total || 0));
    } catch (error) {
      console.error("Visit planner load failed", error);
      alert(error.response?.data?.message || "Unable to load visit plans.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, from, to, nameFilter, departmentFilter, storeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([getSalesEmployees(), getSalesStores()])
      .then(([employeeResponse, storeResponse]) => {
        setEmployees(employeeResponse.data?.data || []);
        setStores(storeResponse.data?.data || []);
      })
      .catch((error) => console.error("Sales lookup load failed", error));
  }, []);

  const employeeOptions = useMemo(() => {
    if (admin) return employees;
    const currentId = Number(user?.id);
    return employees.filter((employee) => Number(employee.id) === currentId);
  }, [admin, employees, user?.id]);

  const filteredEmployees = employeeOptions.filter((employee) =>
    `${employee.name} ${employee.employee_id} ${employee.email}`
      .toLowerCase()
      .includes(employeeSearch.toLowerCase())
  );

  const filteredStores = stores.filter((store) =>
    `${store.store_name} ${store.store_code} ${store.city}`
      .toLowerCase()
      .includes(storeSearch.toLowerCase())
  );

  const resetForm = () => {
    const next = makeInitialForm();
    if (!admin && user?.id) next.employee_id = Number(user.id);
    setForm(next);
    setEmployeeSearch("");
    setStoreSearch("");
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
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
      planned_store_ids: row.planned_store_ids || [],
    });
    setEmployeeSearch(row.name || "");
    setStoreSearch("");
    setShowModal(true);
  };

  const toggleStore = (storeId) => {
    setForm((current) => {
      const exists = current.planned_store_ids.some((id) => Number(id) === Number(storeId));
      return {
        ...current,
        planned_store_ids: exists
          ? current.planned_store_ids.filter((id) => Number(id) !== Number(storeId))
          : [...current.planned_store_ids, Number(storeId)],
      };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.employee_id || !form.visit_date) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        employee_id: Number(form.employee_id),
        planned_store_ids: form.week_off ? [] : form.planned_store_ids,
      };
      if (editing) await updateVisitPlan(editing.id, payload);
      else await createVisitPlan(payload);
      setShowModal(false);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save planned visit.");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (id) => {
    if (!canDelete(permission)) return;
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteVisitPlan(deleteId);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed.");
    } finally {
      setDeleteId(null);
      setShowDeleteDialog(false);
    }
  };

  const confirmDeleteAll = async () => {
    try {
      await deleteAllVisitPlans();
      setPage(1);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Delete all failed.");
    } finally {
      setShowDeleteAllDialog(false);
    }
  };

  const exportCsv = async () => {
    try {
      const response = await exportVisitPlans({
        search,
        from,
        to,
        name: nameFilter,
        department: departmentFilter,
        store: storeFilter,
      });
      downloadBlob(response.data, "visit-planner.csv");
    } catch (error) {
      alert(error.response?.data?.message || "Export failed.");
    }
  };

  const importFile = async (file) => {
    const result = await importVisitPlans(file);
    setPage(1);
    await load();
    return result.data || result;
  };

  const clearFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setNameFilter("");
    setDepartmentFilter("");
    setStoreFilter("");
    setPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  const columns = [
    { key: "visit_date", title: "Date", render: (row) => formatDate(row.visit_date), minWidth: "110px" },
    { key: "day_name", title: "Day", minWidth: "110px" },
    { key: "name", title: "Name", minWidth: "170px", render: (row) => <strong>{row.name}</strong> },
    { key: "designation", title: "Designation", minWidth: "160px", render: (row) => row.designation || "—" },
    { key: "department", title: "Department", minWidth: "150px", render: (row) => row.department || "—" },
    { key: "city", title: "City", minWidth: "130px", render: (row) => row.city || "—" },
    { key: "reason_to_travel", title: "Reason to travel", minWidth: "240px", render: (row) => <span className="sales-wrap-cell">{row.reason_to_travel || "—"}</span> },
    { key: "planned_store_names", title: "Planned", minWidth: "260px", render: (row) => row.week_off ? <span className="sales-weekoff">Week off</span> : <span className="sales-wrap-cell">{row.planned_store_names || "—"}</span> },
    { key: "remarks", title: "Remarks", minWidth: "180px", render: (row) => <span className="sales-wrap-cell">{row.remarks || "—"}</span> },
    {
      key: "approval_status",
      title: "Approval",
      minWidth: "130px",
      align: "center",
      render: (row) => {
        const status = String(row.approval_status || "Pending");
        const Icon = status === "Approved" ? FaCheckCircle : status === "Rejected" ? FaTimes : FaClock;
        return <span className={`sales-status-badge ${status.toLowerCase()}`}><Icon />{status}</span>;
      },
    },
    {
      key: "actions",
      title: "Actions",
      minWidth: "130px",
      align: "center",
      render: (row) => (
        <div className="sales-action-buttons">
          {canEdit(permission) && <button type="button" className="sales-icon-btn" title="Edit" onClick={() => openEdit(row)}>Edit</button>}
          {canDelete(permission) && <button type="button" className="sales-icon-btn danger" title="Delete" onClick={() => askDelete(row.id)}>Delete</button>}
        </div>
      ),
    },
  ];

  if (!canView(permission)) return null;

  return (
    <div className="sales-page sales-standard-page">
      <PageHeader
        title={<>Visit Planner <FaInfoCircle className="sales-title-info" /></>}
        subtitle="Plan store visits for your sales force. Every new plan stays Pending until it is approved."
      />

      <PageToolbar
        search={search}
        setSearch={(value) => { setPage(1); setSearch(value); }}
        placeholder="Search name, city or planned store..."
        showAdd={canAdd(permission)}
        addText="Add Planned Visit"
        onAdd={openAdd}
        showExport
        onExport={exportCsv}
        showBulk={canAdd(permission)}
        onBulk={() => setShowBulkModal(true)}
        showDeleteAll={canDelete(permission)}
        onDeleteAll={() => setShowDeleteAllDialog(true)}
      >
        <button type="button" className="toolbar-btn refresh-toolbar-btn" onClick={load}>
          <FaSyncAlt /> Refresh
        </button>
      </PageToolbar>

      <FilterBar onClear={clearFilters}>
        <label className="sales-global-filter">
          <span>From</span>
          <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
        </label>
        <label className="sales-global-filter">
          <span>To</span>
          <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
        </label>
        <label className="sales-global-filter">
          <span>Name</span>
          <input placeholder="Filter by name..." value={nameFilter} onChange={(e) => { setPage(1); setNameFilter(e.target.value); }} />
        </label>
        <label className="sales-global-filter">
          <span>Department</span>
          <select value={departmentFilter} onChange={(e) => { setPage(1); setDepartmentFilter(e.target.value); }}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department}>{department}</option>)}
          </select>
        </label>
        <label className="sales-global-filter">
          <span>Planned Store</span>
          <input placeholder="Filter by store..." value={storeFilter} onChange={(e) => { setPage(1); setStoreFilter(e.target.value); }} />
        </label>
      </FilterBar>

      <Card title="Planned Visits" subtitle={`${total} visit plan${total === 1 ? "" : "s"} found`} noPadding>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyTitle="No Planned Visits Found"
          emptyDescription="Create a planned visit or use Bulk Upload to add multiple visits."
          className="sales-global-table"
        />
        <Pagination
          currentPage={page}
          totalPages={pageCount}
          totalRecords={total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPage(1); setLimit(size); }}
        />
      </Card>

      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Visit Plans"
        uploadFunction={importFile}
        onSuccess={load}
        acceptedFile=".csv,.xlsx,.xls"
      />

      {showModal && (
        <div className="sales-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <form className="sales-form-modal visit-form-modal" onSubmit={save}>
            <div className="sales-modal-header">
              <div>
                <h2>{editing ? "Edit Planned Visit" : "Add Planned Visit"}</h2>
                <p>{editing ? "Changes will be sent for approval again." : "New plans are always submitted as Pending."}</p>
              </div>
              <button type="button" className="sales-modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>

            <div className="sales-form-grid">
              <label className="sales-field sales-field-full">
                <span>Employee <b>*</b></span>
                <select
                  value={form.employee_id}
                  disabled={!admin}
                  onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))}
                  required
                >
                  <option value="">Select employee</option>
                  {filteredEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} {employee.employee_id ? `(${employee.employee_id})` : ""}
                    </option>
                  ))}
                </select>
                {admin && (
                  <input className="sales-field-search" value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Type to narrow employee list..." />
                )}
              </label>

              <label className="sales-field">
                <span>Date <b>*</b></span>
                <input type="date" value={form.visit_date} onChange={(event) => setForm((current) => ({ ...current, visit_date: event.target.value }))} required />
              </label>

              <label className="sales-check-field">
                <input type="checkbox" checked={form.week_off} onChange={(event) => setForm((current) => ({ ...current, week_off: event.target.checked, planned_store_ids: event.target.checked ? [] : current.planned_store_ids }))} />
                <span>Week off</span>
              </label>

              <label className="sales-field sales-field-full">
                <span>City</span>
                <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Enter city or select a planned store" />
              </label>

              <label className="sales-field sales-field-full">
                <span>Reason to travel</span>
                <textarea value={form.reason_to_travel} onChange={(event) => setForm((current) => ({ ...current, reason_to_travel: event.target.value }))} placeholder="Purpose of this visit..." rows={4} />
              </label>

              {!form.week_off && (
                <div className="sales-field sales-field-full">
                  <span>Planned stores</span>
                  <input className="sales-store-search" value={storeSearch} onChange={(event) => setStoreSearch(event.target.value)} placeholder="Search store name, code or city..." />
                  <div className="sales-store-picker">
                    {filteredStores.slice(0, 100).map((store) => {
                      const selected = form.planned_store_ids.some((id) => Number(id) === Number(store.id));
                      return (
                        <label key={store.id} className={`sales-store-option ${selected ? "selected" : ""}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleStore(store.id)} />
                          <span><strong>{store.store_name}</strong><small>{store.store_code || ""}{store.city ? ` · ${store.city}` : ""}</small></span>
                        </label>
                      );
                    })}
                    {!filteredStores.length && <div className="sales-picker-empty">No stores found.</div>}
                  </div>
                  <div className="sales-selected-summary">{form.planned_store_ids.length} store{form.planned_store_ids.length === 1 ? "" : "s"} selected</div>
                </div>
              )}
            </div>

            <div className="sales-modal-actions">
              <button type="button" className="modal-secondary-btn" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="modal-primary-btn" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Submit for Approval"}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Planned Visit"
        message="Are you sure you want to delete this planned visit?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteId(null); setShowDeleteDialog(false); }}
      />

      <ConfirmDialog
        open={showDeleteAllDialog}
        title="Delete All Visit Plans"
        message="This will delete all visit plans available to your account. This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllDialog(false)}
      />
    </div>
  );
}

export default VisitPlanner;
