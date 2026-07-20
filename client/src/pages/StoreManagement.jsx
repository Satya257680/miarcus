import { useEffect, useState, useRef } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileExport,
  FaFileImport,
} from "react-icons/fa";

import "../styles/StoreManagement.css";
import AddStoreModal from "../components/AddStoreModal";

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

  const [showModal, setShowModal] = useState(false);

  const [editingStore, setEditingStore] = useState(null);
  const fileInputRef = useRef(null);

  // Pagination

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

    fetchStores();

  }, []);

  // ==========================
  // Search
  // ==========================

  useEffect(() => {

    const keyword = search.toLowerCase();

    const filtered = stores.filter((store) => {

      return (

        store.store_name?.toLowerCase().includes(keyword) ||

        store.store_code?.toLowerCase().includes(keyword) ||

        store.country?.toLowerCase().includes(keyword) ||

        store.state?.toLowerCase().includes(keyword) ||

        store.city?.toLowerCase().includes(keyword)

      );

    });

    setFilteredStores(filtered);

    setCurrentPage(1);

  }, [search, stores]);

  // ==========================
  // Add Store
  // ==========================

  const handleAddStore = () => {

    setEditingStore(null);

    setShowModal(true);

  };

  // ==========================
  // Edit Store
  // ==========================

  const handleEdit = (store) => {

    setEditingStore(store);

    setShowModal(true);

  };

  // ==========================
  // Delete Store
  // ==========================

  const handleDelete = async (id) => {

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
  // Delete All
  // ==========================

  const handleDeleteAll = async () => {

    if (
      !window.confirm(
        "Delete all stores?"
      )
    ) {
      return;
    }

    try {

      const res = await deleteAllStores();

      if (res.success) {

        fetchStores();

      }

    } catch (err) {

      console.error(err);

    }

  };

  // ==========================
  // Save Store
  // ==========================

  const handleSave = async (data) => {

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
  // Export CSV
  // ==========================

  const handleExport = () => {
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

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "stores.csv";

    link.click();
  };

  // ==========================
  // Import CSV (Placeholder)
  // ==========================

  const handleImport = () => {
    fileInputRef.current.click();
};

const handleFileChange = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    try {

        const res = await importStores(file);

        if (res.success) {

            alert(res.message);

            fetchStores();

        } else {

            alert(res.message);

        }

    } catch (err) {

        console.error(err);

        alert(
            err.response?.data?.message ||
            "CSV Import Failed"
        );

    }

};

 return (
  <div className="store-page">

    {/* Hidden File Input for CSV Import */}
    <input
      type="file"
      accept=".csv"
      ref={fileInputRef}
      style={{ display: "none" }}
      onChange={handleFileChange}
    />

    {/* ==========================
        Header
    ========================== */}

    <div className="store-header">

      <h2>Store Management</h2>

      <div className="store-actions">

        <button
          className="export-btn"
          onClick={handleExport}
        >
          <FaFileExport />
          Export
        </button>

        <button
          className="import-btn"
          onClick={handleImport}
        >
          <FaFileImport />
          Import
        </button>

        <button
          className="delete-all-btn"
          onClick={handleDeleteAll}
        >
          <FaTrash />
          Delete All
        </button>

        <button
          className="add-store-btn"
          onClick={handleAddStore}
        >
          <FaPlus />
          Add Store
        </button>

      </div>

    </div>
      {/* ==========================
          Search
      ========================== */}

      <div className="store-search">

        <FaSearch />

        <input
          type="text"
          placeholder="Search Store..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>

      {/* ==========================
          Table
      ========================== */}

      <div className="store-table-container">

        <table className="store-table">

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

              <tr>
                <td colSpan="8" className="text-center">
                  Loading...
                </td>
              </tr>

            ) : currentStores.length === 0 ? (

              <tr>
                <td colSpan="8" className="text-center">
                  No Stores Found
                </td>
              </tr>

            ) : (

              currentStores.map((store, index) => (

                <tr key={store.id}>

                  <td>{indexOfFirstRow + index + 1}</td>

                  <td>{store.store_code}</td>

                  <td>{store.store_name}</td>

                  <td>{store.country}</td>

                  <td>{store.state}</td>

                  <td>{store.city}</td>

                  <td>
                    <span
                      className={
                        store.status === "Active"
                          ? "status active"
                          : "status inactive"
                      }
                    >
                      {store.status}
                    </span>
                  </td>

                  <td>

                    <button
                      className="edit-btn"
                      onClick={() =>
                        handleEdit(store)
                      }
                    >
                      <FaEdit />
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        handleDelete(store.id)
                      }
                    >
                      <FaTrash />
                    </button>

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

      <div className="pagination">

        <div className="rows-per-page">

          <span>Rows Per Page:</span>

          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>

        </div>

        <div className="page-buttons">

          <button
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((prev) => prev - 1)
            }
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            disabled={
              currentPage === totalPages ||
              totalPages === 0
            }
            onClick={() =>
              setCurrentPage((prev) => prev + 1)
            }
          >
            Next
          </button>

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