import { collectIds, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileImport,
  FaStore,
  FaCheckCircle,
  FaPauseCircle,
  FaGlobeAsia,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";

import "../styles/StoreManagement.css";
import "../styles/StoreManagementPremium.css";
import AddStoreModal from "../components/AddStoreModal";
import ExportButton from "../components/common/ExportButton";
import { exportTableData } from "../utils/exportUtils.js";

import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  deleteAllStores,
  importStores,
} from "../services/storeService";
function StoreManagement() {

  // ==========================
  // States
  // ==========================

  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);

  const [editingStore, setEditingStore] = useState(null);
  const fileInputRef = useRef(null);

  // Pagination

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
// ==========================
// RBAC
// ==========================

const user = JSON.parse(
  localStorage.getItem("user") || "{}"
);

const permissions = JSON.parse(
  localStorage.getItem("permissions") || "{}"
);

// Administrator always gets Full Access
const isAdmin =
  user.administrator === true ||
  user.administrator === 1;

const storePermission = isAdmin
  ? "Full"
  : (
      permissions["Store Management"] ||
      permissions["Stores"] ||
      "None"
    );
const canView =
  ["View", "Add", "Edit", "Full"].includes(storePermission);

const canAdd =
  ["Add", "Edit", "Full"].includes(storePermission);

const canEdit =
  ["Edit", "Full"].includes(storePermission);

const canDelete =
  storePermission === "Full";

  // ==========================
  // Load Stores
  // ==========================

  const fetchStores = async () => {

    try {

      setLoading(true);

      const res = await getStores();

      if (res.success) {

        setStores(res.data);
        setFilteredStores(res.data);

      } else {

        setStores([]);
        setFilteredStores([]);

      }

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "Unable to load stores."
      );

    } finally {

      setLoading(false);

    }

  };

 useEffect(() => {

    if (!canView) {

        setLoading(false);

        return;

    }

    fetchStores();

}, [canView]);
  // ==========================
  // Search
  // ==========================

  useEffect(() => {

    const keyword = search.trim().toLowerCase();

    const filtered = stores.filter((store) => {

      if (statusFilter !== "All" && store.status !== statusFilter) {
        return false;
      }

      if (!keyword) return true;

      return (
        String(store.store_name ?? "").toLowerCase().includes(keyword) ||
        String(store.store_code ?? "").toLowerCase().includes(keyword) ||
        String(store.country ?? "").toLowerCase().includes(keyword) ||
        String(store.state ?? "").toLowerCase().includes(keyword) ||
        String(store.city ?? "").toLowerCase().includes(keyword)
      );

    });

    setFilteredStores(filtered);

    setCurrentPage(1);

  }, [search, statusFilter, stores]);

  // ==========================
  // Add Store
  // ==========================

 const handleAddStore = () => {

  if (!canAdd) return;

  setEditingStore(null);
  setShowModal(true);

};
  // ==========================
  // Edit Store
  // ==========================

  const handleEdit = (store) => {

  if (!canEdit) return;

  setEditingStore(store);
  setShowModal(true);

};
  // ==========================
// Delete Store
// ==========================

const handleDelete = async (id) => {

  // RBAC Check
  if (!canDelete) {
    alert("You don't have permission to delete stores.");
    return;
  }

  // Confirmation
  if (
    !window.confirm(
      "Are you sure you want to delete this store?"
    )
  ) {
    return;
  }

  try {

    const res = await deleteStore(id);

    if (res.success) {

      alert("Store deleted successfully.");

      fetchStores();

    } else {

      alert(
        res.message || "Failed to delete store."
      );

    }

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      err.message ||
      "Unable to delete store."
    );

  }

};

  // ==========================
// Delete All Stores
// ==========================

const handleDeleteAll = async () => {

  // RBAC Check
  if (!canDelete) {
    alert("You don't have permission to delete all stores.");
    return;
  }

  // Search / status filter applied -> only the listed stores are deleted.
  const filtered = hasActiveFilters({ search, status: statusFilter });
  const ids = collectIds(filteredStores);

  if (filtered && !ids.length) {
    alert("No stores match the selected filters.");
    return;
  }

  // Confirmation
  if (
    !window.confirm(
      deleteAllMessage(filtered, ids.length, "stores")
    )
  ) {
    return;
  }

  try {

    const res = await deleteAllStores(filtered ? ids : undefined);

    if (res.success) {

      alert(res.message || "All stores deleted successfully.");

      fetchStores();

    } else {

      alert(
        res.message || "Failed to delete stores."
      );

    }

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      err.message ||
      "Unable to delete stores."
    );

  }

};

 // ==========================
// Save Store
// ==========================

const handleSave = async (data) => {

  // RBAC Check
  if (editingStore) {

    if (!canEdit) {
      alert("You don't have permission to edit stores.");
      return;
    }

  } else {

    if (!canAdd) {
      alert("You don't have permission to add stores.");
      return;
    }

  }

  try {

    let res;

    if (editingStore) {

      res = await updateStore(
        editingStore.id,
        data
      );

    } else {

      res = await createStore(data);

    }

    if (res.success) {

      alert(
        editingStore
          ? "Store updated successfully."
          : "Store created successfully."
      );

      setShowModal(false);

      setEditingStore(null);

      fetchStores();

    } else {

      alert(res.message);

    }

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      err.message
    );

  }

};
    // ==========================
  // Pagination
  // ==========================

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const currentStores = filteredStores.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  const totalPages = Math.ceil(
    filteredStores.length / rowsPerPage
  );

  // ==========================
  // Stats
  // ==========================

  const stats = useMemo(() => {
    const active = stores.filter((s) => s.status === "Active").length;
    const countries = new Set(
      stores.map((s) => String(s.country ?? "").trim().toLowerCase()).filter(Boolean)
    ).size;
    const cities = new Set(
      stores.map((s) => String(s.city ?? "").trim().toLowerCase()).filter(Boolean)
    ).size;
    return {
      total: stores.length,
      active,
      inactive: stores.length - active,
      countries,
      cities,
    };
  }, [stores]);

  const pageNumbers = useMemo(() => {
    const total = totalPages || 1;
    const pages = [];
    const start = Math.max(1, Math.min(currentPage - 2, total - 4));
    const end = Math.min(total, start + 4);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  const initials = (name) =>
    String(name ?? "")
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "S";


 // ==========================
// Export CSV
// ==========================

const handleExport = async (format = "csv") => {

  if (!canView) {

    alert("You don't have permission to export stores.");

    return;

  }

  if (filteredStores.length === 0) {

    alert("No store data available.");

    return;

  }

  const headers = [
    "Store Code",
    "Store Name",
    "Country",
    "State",
    "City",
    "Manager",
    "Contact",
    "Email",
    "Status",
  ];

  const rows = filteredStores.map((store) => [
    store.store_code,
    store.store_name,
    store.country,
    store.state,
    store.city,
    store.manager_name,
    store.contact_number,
    store.email,
    store.status,
  ]);

  await exportTableData({
    headers,
    rows,
    filename: "stores",
    format,
    title: "Stores",
  });

};
 // ==========================
// Import CSV
// ==========================

const handleImport = () => {

  // RBAC Check
  if (!canAdd) {

    alert("You don't have permission to import stores.");

    return;

  }

  fileInputRef.current.click();

};

// ==========================
// Handle CSV File
// ==========================

const handleFileChange = async (e) => {

  // RBAC Check
  if (!canAdd) {

    alert("You don't have permission to import stores.");

    e.target.value = "";

    return;

  }

  const file = e.target.files[0];

  if (!file) return;

  try {

    const res = await importStores(file);

    if (res.success) {

      alert(res.message || "Stores imported successfully.");

      fetchStores();

    } else {

      alert(
        res.message || "Import failed."
      );

    }

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      err.message ||
      "CSV Import Failed"
    );

  } finally {

    // Allow selecting the same file again
    e.target.value = "";

  }

};


  const statCards = [
    { key: "total", label: "Total Stores", value: stats.total, icon: <FaStore />, tone: "teal" },
    { key: "active", label: "Active", value: stats.active, icon: <FaCheckCircle />, tone: "green" },
    { key: "inactive", label: "Inactive", value: stats.inactive, icon: <FaPauseCircle />, tone: "rose" },
    {
      key: "reach",
      label: "Cities Covered",
      value: stats.cities,
      sub: `${stats.countries} ${stats.countries === 1 ? "country" : "countries"}`,
      icon: <FaGlobeAsia />,
      tone: "amber",
    },
  ];

  return (
    <div className="sm-page">

      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* ==========================
          Hero Header
      ========================== */}

      <header className="sm-hero">
        <div className="sm-hero-text">
          <span className="sm-crumbs">Settings <span>/</span> Stores</span>
          <h2>Store Management</h2>
          <p>Manage every outlet, its location and contact details in one place.</p>
        </div>

        <div className="sm-actions">
          {canView && <ExportButton onExport={handleExport} />}

          {canAdd && (
            <button className="sm-btn sm-btn-ghost" onClick={handleImport}>
              <FaFileImport />
              Import
            </button>
          )}

          {canDelete && (
            <button className="sm-btn sm-btn-danger" onClick={handleDeleteAll}>
              <FaTrash />
              {deleteAllLabel(hasActiveFilters({ search, status: statusFilter }), filteredStores.length)}
            </button>
          )}

          {canAdd && (
            <button className="sm-btn sm-btn-primary" onClick={handleAddStore}>
              <FaPlus />
              Add Store
            </button>
          )}
        </div>
      </header>

      {/* ==========================
          Stat Cards
      ========================== */}

      <section className="sm-stats">
        {statCards.map((c) => (
          <div key={c.key} className={`sm-stat sm-tone-${c.tone}`}>
            <div className="sm-stat-icon">{c.icon}</div>
            <div className="sm-stat-body">
              <span className="sm-stat-label">{c.label}</span>
              <strong className="sm-stat-value">
                {loading ? <span className="sm-skel sm-skel-num" /> : c.value.toLocaleString()}
              </strong>
              {c.sub && !loading && <span className="sm-stat-sub">{c.sub}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ==========================
          Toolbar
      ========================== */}

      <div className="sm-toolbar">
        <div className="sm-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by name, code, country, state or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="sm-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
              <FaTimes />
            </button>
          )}
        </div>

        <div className="sm-filter" role="tablist" aria-label="Filter by status">
          {[
            ["All", stats.total],
            ["Active", stats.active],
            ["Inactive", stats.inactive],
          ].map(([label, count]) => (
            <button
              key={label}
              role="tab"
              aria-selected={statusFilter === label}
              className={`sm-filter-btn ${statusFilter === label ? "is-on" : ""}`}
              onClick={() => setStatusFilter(label)}
            >
              {label}
              <span className="sm-filter-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==========================
          Table
      ========================== */}

      <div className="sm-card">
        <div className="sm-table-wrap">
          <table className="sm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Store Code</th>
                <th>Store Name</th>
                <th>Country</th>
                <th>State</th>
                <th>City</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="sm-skel-row">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}>
                        <span className="sm-skel" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : currentStores.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="sm-empty">
                      <div className="sm-empty-icon">
                        <FaStore />
                      </div>
                      <h4>No stores found</h4>
                      <p>
                        {search || statusFilter !== "All"
                          ? "Try a different search or filter."
                          : "Add your first store to get started."}
                      </p>
                      {canAdd && !search && statusFilter === "All" && (
                        <button className="sm-btn sm-btn-primary" onClick={handleAddStore}>
                          <FaPlus /> Add Store
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentStores.map((store, index) => (
                  <tr key={store.id}>
                    <td className="sm-idx">{indexOfFirstRow + index + 1}</td>

                    <td>
                      <span className="sm-code">{store.store_code}</span>
                    </td>

                    <td>
                      <div className="sm-name">
                        <span className="sm-avatar">{initials(store.store_name)}</span>
                        <span className="sm-name-text" title={store.store_name}>
                          {store.store_name}
                        </span>
                      </div>
                    </td>

                    <td>{store.country || <span className="sm-dash">—</span>}</td>

                    <td>{store.state || <span className="sm-dash">—</span>}</td>

                    <td>
                      {store.city ? (
                        <span className="sm-city">
                          <FaMapMarkerAlt />
                          {store.city}
                        </span>
                      ) : (
                        <span className="sm-dash">—</span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`sm-status ${
                          store.status === "Active" ? "is-active" : "is-inactive"
                        }`}
                      >
                        <span className="dot" />
                        {store.status}
                      </span>
                    </td>

                    <td>
                      <div className="sm-row-actions">
                        {canEdit && (
                          <button
                            className="sm-icon-btn sm-edit"
                            onClick={() => handleEdit(store)}
                            title="Edit store"
                            aria-label="Edit store"
                          >
                            <FaEdit />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            className="sm-icon-btn sm-delete"
                            onClick={() => handleDelete(store.id)}
                            title="Delete store"
                            aria-label="Delete store"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ==========================
            Pagination
        ========================== */}

        <div className="sm-pagination">
          <div className="sm-rows">
            <span>
              Showing{" "}
              <strong>
                {filteredStores.length === 0 ? 0 : indexOfFirstRow + 1}–
                {Math.min(indexOfLastRow, filteredStores.length)}
              </strong>{" "}
              of <strong>{filteredStores.length}</strong>
            </span>

            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Rows per page"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="sm-pages">
            <button
              className="sm-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              aria-label="Previous page"
            >
              <FaChevronLeft />
            </button>

            {pageNumbers.map((p) => (
              <button
                key={p}
                className={`sm-page-btn ${p === currentPage ? "is-on" : ""}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}

            <button
              className="sm-page-btn"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              aria-label="Next page"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* ==========================
          Add / Edit Modal
      ========================== */}

      {showModal && (
        <AddStoreModal
          store={editingStore}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingStore(null);
          }}
        />
      )}

    </div>
  );
}

export default StoreManagement;
