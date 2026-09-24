import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

import {
  FaKey,
  FaSearch,
  FaShieldAlt,
  FaUserShield,
  FaSyncAlt,
  FaTrash,
  FaEdit,
  FaEye,
  FaUnlockAlt,
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaChevronDown,
} from "react-icons/fa";

import EditVaultUserModal from "../components/EditVaultUserModal";
import SetVaultUserPasswordModal from "../components/SetVaultUserPasswordModal";
import ViewVaultUserPasswordModal from "../components/ViewVaultUserPasswordModal";
import "../styles/PasswordManagement.css";

function PasswordManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [editingUser, setEditingUser] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [viewPasswordUser, setViewPasswordUser] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const currentEmail = (localStorage.getItem("email") || "").trim().toLowerCase();

  const currentViewer = useMemo(
    () => users.find((u) => (u.email || "").toLowerCase() === currentEmail),
    [users, currentEmail]
  );

  const canManageSuperAdmin = Boolean(currentViewer?.isSuperAdmin);

  const fetchVault = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/api/password-vault`);
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error("Password vault load error:", error);
      setLoadError(
        error.response?.data?.message || "Unable to load the password vault."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const getRole = (user) => {
    if (user.isSuperAdmin) return "super-admin";
    if (user.isAdmin) return "administrator";
    return "user";
  };

  const getRoleLabel = (user) => {
    if (user.isSuperAdmin) return "Super Admin";
    if (user.isAdmin) return "Administrator";
    return "User";
  };

  const getStatus = (user) => {
    const raw = String(user.status || "").trim().toLowerCase();
    if (raw === "inactive" || raw === "disabled" || raw === "0") return "inactive";
    return user.isActivated === false ? "inactive" : "active";
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = !term ||
        [user.name, user.email, user.employeeId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesRole = roleFilter === "all" || getRole(user) === roleFilter;
      const matchesStatus = statusFilter === "all" || getStatus(user) === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  const totalRecords = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const formatUpdated = (user) => {
    if (!user.passwordUpdatedAt) return "—";

    const date = new Date(user.passwordUpdatedAt);
    if (Number.isNaN(date.getTime())) return String(user.passwordUpdatedAt);

    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const isProtectedUser = (user) =>
    Boolean(user) && (Boolean(user.isAdmin) || Boolean(user.isSuperAdmin));

  const openEditUser = async (user) => {
    setEditLoadingId(user.id);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`);
      const fullUser = (response.data?.users || []).find(
        (u) => Number(u.id) === Number(user.id)
      );

      if (!fullUser) {
        alert("Unable to load this user's full details for editing.");
        return;
      }

      setEditingUser(fullUser);
    } catch (error) {
      console.error("Load user for edit error:", error);
      alert(error.response?.data?.message || "Unable to load this user's details.");
    } finally {
      setEditLoadingId(null);
    }
  };

  const requestDeleteUser = (user) => setDeleteTarget(user);

  const cancelDeleteUser = () => {
    if (deleteBusyId) return;
    setDeleteTarget(null);
  };

  const confirmDeleteUser = async () => {
    const user = deleteTarget;
    if (!user) return;

    if (isProtectedUser(user)) {
      alert("Administrator and Super Admin accounts cannot be deleted.");
      setDeleteTarget(null);
      return;
    }

    setDeleteBusyId(user.id);

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/password-vault/${user.id}`
      );
      alert(response.data?.message || "User deleted successfully.");
      setDeleteTarget(null);
      fetchVault();
    } catch (error) {
      console.error("Password vault delete user error:", error);
      alert(error.response?.data?.message || "Unable to delete this user.");
    } finally {
      setDeleteBusyId(null);
    }
  };

  const deleteAllUsers = async () => {
    setDeletingAll(true);

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/password-vault/delete-all`
      );
      alert(
        response.data?.message ||
          "All non-administrator users deleted successfully."
      );
      setShowDeleteAllModal(false);
      fetchVault();
    } catch (error) {
      console.error("Password vault delete-all error:", error);
      alert(error.response?.data?.message || "Unable to delete users.");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="pwd-mgmt-page">
      <section className="pwd-mgmt-hero">
        <div className="pwd-mgmt-hero-icon">
          <FaKey />
        </div>

        <div className="pwd-mgmt-hero-copy">
          <h1>Password Management</h1>
          <p>
            Every user&apos;s password is created and controlled here. Self-service
            &quot;Forgot Password&quot; is disabled for everyone except the Super Admin
            account — use this screen to look up any user&apos;s current password,
            set or reset it if needed, or edit user details.
          </p>
        </div>

        <div className="pwd-mgmt-security-art" aria-hidden="true">
          <div className="pwd-mgmt-art-plus">+</div>
          <div className="pwd-mgmt-shield">
            <div className="pwd-mgmt-lock">
              <span />
            </div>
          </div>
          <div className="pwd-mgmt-password-pill">•••••</div>
        </div>
      </section>

      <section className="pwd-mgmt-toolbar">
        <div className="pwd-mgmt-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by name, email or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="pwd-mgmt-select">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="super-admin">Super Admin</option>
            <option value="administrator">Administrator</option>
            <option value="user">User</option>
          </select>
          <FaChevronDown />
        </label>

        <label className="pwd-mgmt-select">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <FaChevronDown />
        </label>

        <button
          type="button"
          className="pwd-mgmt-refresh"
          onClick={fetchVault}
          disabled={loading}
        >
          <FaSyncAlt className={loading ? "spinning" : ""} />
          Refresh
        </button>

        <button
          type="button"
          className="pwd-mgmt-delete-all-btn"
          onClick={() => setShowDeleteAllModal(true)}
          disabled={loading}
        >
          <FaTrash />
          Delete All
        </button>
      </section>

      <section className="pwd-mgmt-card">
        {loading ? (
          <div className="pwd-mgmt-state">Loading password vault...</div>
        ) : loadError ? (
          <div className="pwd-mgmt-state pwd-mgmt-state-error">{loadError}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="pwd-mgmt-state">No users found.</div>
        ) : (
          <>
            <div className="pwd-mgmt-table-wrap">
              <table className="pwd-mgmt-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Reset Password</th>
                    <th className="pwd-mgmt-actions-head">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((user) => {
                    const status = getStatus(user);
                    const role = getRole(user);

                    return (
                      <tr key={user.id}>
                        <td className="pwd-mgmt-id-cell">{user.employeeId || user.id}</td>

                        <td>
                          <div className="pwd-mgmt-name">{user.name || "—"}</div>
                        </td>

                        <td className="pwd-mgmt-email-cell">{user.email || "—"}</td>

                        <td>
                          <span className={`pwd-mgmt-role-badge ${role}`}>
                            {user.isSuperAdmin ? <FaShieldAlt /> : user.isAdmin ? <FaUserShield /> : <FaUsers />}
                            {getRoleLabel(user)}
                          </span>
                        </td>

                        <td>
                          <span className={`pwd-mgmt-status-badge ${status}`}>
                            {status === "active" ? <FaUserCheck /> : <FaUserTimes />}
                            {status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="pwd-mgmt-updated-cell">
                          <span>{formatUpdated(user)}</span>
                          {user.passwordUpdatedBy && (
                            <small>by {user.passwordUpdatedBy}</small>
                          )}
                        </td>

                        <td className="pwd-mgmt-reset-cell">
                          <button
                            type="button"
                            className="pwd-mgmt-reset-btn"
                            onClick={() => setPasswordTargetUser(user)}
                            title={
                              user.password
                                ? "Reset this user's password"
                                : "Set a password for this user"
                            }
                          >
                            <FaUnlockAlt />
                            Reset Password
                          </button>
                        </td>

                        <td className="pwd-mgmt-actions-cell">
                          <button
                            type="button"
                            className="pwd-mgmt-view-btn"
                            onClick={() => setViewPasswordUser(user)}
                            title="View current password"
                          >
                            <FaEye />
                            View
                          </button>

                          <button
                            type="button"
                            className="pwd-mgmt-edit-btn"
                            onClick={() => openEditUser(user)}
                            disabled={editLoadingId === user.id}
                            title="Edit name, employee ID, email and role"
                          >
                            <FaEdit />
                            {editLoadingId === user.id ? "Loading..." : "Edit"}
                          </button>

                          <button
                            type="button"
                            className="pwd-mgmt-delete-btn"
                            onClick={() => requestDeleteUser(user)}
                            disabled={deleteBusyId === user.id}
                            title="Delete user"
                          >
                            <FaTrash />
                            {deleteBusyId === user.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pwd-mgmt-pagination">
              <div className="pwd-mgmt-pagination-summary">
                Showing {totalRecords === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, totalRecords)} of {totalRecords} users
              </div>

              <div className="pwd-mgmt-pagination-controls">
                <button type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1}>«</button>
                <button type="button" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>‹</button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      type="button"
                      key={page}
                      className={safePage === page ? "active" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}

                <button type="button" onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>›</button>
                <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}>»</button>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Rows per page"
                >
                  <option value={8}>8 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </>
        )}
      </section>

      {deleteTarget && (
        <div className="pwd-mgmt-confirm-overlay" onMouseDown={cancelDeleteUser}>
          <div
            className="pwd-mgmt-confirm-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>Delete User</h2>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>
              {deleteTarget.email ? ` (${deleteTarget.email})` : ""}? The user&apos;s
              details will be permanently deleted. This cannot be undone.
            </p>
            <div className="pwd-mgmt-confirm-buttons">
              <button type="button" className="pwd-mgmt-confirm-cancel-btn" onClick={cancelDeleteUser} disabled={deleteBusyId === deleteTarget.id}>Cancel</button>
              <button type="button" className="pwd-mgmt-confirm-delete-btn" onClick={confirmDeleteUser} disabled={deleteBusyId === deleteTarget.id}>
                {deleteBusyId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="pwd-mgmt-confirm-overlay" onMouseDown={() => !deletingAll && setShowDeleteAllModal(false)}>
          <div className="pwd-mgmt-confirm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <h2>Delete All Users</h2>
            <p>
              This permanently deletes every user except Administrator and Super Admin accounts,
              which are always kept. This cannot be undone.
            </p>
            <div className="pwd-mgmt-confirm-buttons">
              <button type="button" className="pwd-mgmt-confirm-cancel-btn" onClick={() => setShowDeleteAllModal(false)} disabled={deletingAll}>Cancel</button>
              <button type="button" className="pwd-mgmt-confirm-delete-btn" onClick={deleteAllUsers} disabled={deletingAll}>
                {deletingAll ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <EditVaultUserModal
          user={editingUser}
          canManageSuperAdmin={canManageSuperAdmin}
          onClose={() => setEditingUser(null)}
          onSaved={fetchVault}
        />
      )}

      {passwordTargetUser && (
        <SetVaultUserPasswordModal
          user={passwordTargetUser}
          onClose={() => setPasswordTargetUser(null)}
          onSaved={fetchVault}
        />
      )}

      {viewPasswordUser && (
        <ViewVaultUserPasswordModal
          user={viewPasswordUser}
          onClose={() => setViewPasswordUser(null)}
        />
      )}
    </div>
  );
}

export default PasswordManagement;
