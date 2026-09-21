import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

import {
  FaKey,
  FaSearch,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaShieldAlt,
  FaUserShield,
  FaSyncAlt,
  FaCheck,
  FaTrash,
  FaEdit,
  FaUnlockAlt,
} from "react-icons/fa";

// Compact, Password-Management-only edit form: Name, Employee ID,
// Email and Role (User / Administrator / Super Admin) — the Actions
// column here shows Edit, Set/Reset Password and Delete, so role
// management (previously its own "Make/Revoke Super Admin" button)
// lives inside this Edit modal instead.
import EditVaultUserModal from "../components/EditVaultUserModal";

// BUG FIX: this screen's own header text says an admin can "use this
// screen to look up any user's current password, or use Edit to
// update their name, employee ID, email or role" — but nothing in
// the Actions column ever let an admin actually SET/RESET a user's
// password (Edit only ever touched name/employee ID/email/role).
// That left every user whose password shows "— not set —" (and
// anyone who has simply forgotten theirs, since self-service
// "Forgot Password" is disabled for everyone except the Super
// Admin) with no way to get a working password at all. The backend
// endpoint this needs (PUT /api/password-vault/:id) already existed
// and is exactly what user creation itself calls — it just had no
// UI. See SetVaultUserPasswordModal.jsx.
import SetVaultUserPasswordModal from "../components/SetVaultUserPasswordModal";

import "../styles/PasswordManagement.css";

// =================================================================
// MIARCUS — PASSWORD MANAGEMENT
// =================================================================
// Administrator / Super Admin only screen.
//
// Every account's password is created here (when the user is
// added) and can only be changed here — regular users never
// create or choose their own password, and self-service
// "Forgot Password" is disabled for everyone except the Super
// Admin account. This page is effectively the "forgot password"
// path for everybody else: an admin looks up or resets the
// password and it is emailed straight to the user.
// =================================================================

function PasswordManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // ==============================================================
  // EDIT USER (compact form — see EditVaultUserModal import above)
  // ==============================================================

  const [editingUser, setEditingUser] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);

  // ==============================================================
  // SET / RESET PASSWORD
  // ==============================================================

  const [passwordTargetUser, setPasswordTargetUser] = useState(null);

  // ==============================================================
  // DELETE (single user) — confirm modal, not window.confirm()
  // ==============================================================

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // ==============================================================
  // CURRENT VIEWER
  // ==============================================================

  const currentEmail = (localStorage.getItem("email") || "").trim().toLowerCase();

  const currentViewer = useMemo(
    () => users.find((u) => (u.email || "").toLowerCase() === currentEmail),
    [users, currentEmail]
  );

  const canManageSuperAdmin = Boolean(currentViewer?.isSuperAdmin);

  // ==============================================================
  // LOAD VAULT
  // ==============================================================

  const fetchVault = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/password-vault`
      );

      setUsers(response.data?.users || []);
    } catch (error) {
      console.error("Password vault load error:", error);
      setLoadError(
        error.response?.data?.message ||
          "Unable to load the password vault."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  // ==============================================================
  // FILTER
  // ==============================================================

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return users;

    return users.filter((user) =>
      [user.name, user.email, user.employeeId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [users, search]);

  // ==============================================================
  // REVEAL / COPY
  // ==============================================================

  const toggleReveal = (id) => {
    setRevealed((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const copyPassword = async (user) => {
    if (!user.password) return;

    try {
      await navigator.clipboard.writeText(user.password);
      setCopiedId(user.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // ==============================================================
  // EDIT USER
  // ==============================================================
  //
  // Password Management's own list (GET /api/password-vault) only
  // ever carries the narrow set of fields this page needs — id/name/
  // email/is_admin/is_super_admin. EditVaultUserModal's Role field
  // (User/Administrator/Super Admin) and its save logic need the FULL
  // user record (department, designation, reports-to, stores,
  // permissions, status, ...) so that saving the compact form never
  // blanks out fields it doesn't show — so this fetches it fresh from
  // the same GET /api/users the Users page itself uses, right before
  // opening the form, rather than trying to edit from the row's own
  // (incomplete) data.
  // ==============================================================

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
      alert(
        error.response?.data?.message ||
          "Unable to load this user's details."
      );
    } finally {
      setEditLoadingId(null);
    }
  };

  // ==============================================================
  // DELETE USER / DELETE ALL
  // ==============================================================
  //
  // Administrator and Super Admin accounts are never deletable —
  // enforced both here (deleting one shows a message instead of
  // calling the API) and on the server (DELETE /api/password-vault/:id
  // and /delete-all both reject/skip them), matching the same rule
  // the Users screen already applies.
  //
  // Clicking "Delete" opens a confirm modal (see the render section
  // below) instead of the browser's native window.confirm() — Cancel
  // backs out, Delete proceeds.
  // ==============================================================

  const isProtectedUser = (user) =>
    Boolean(user) && (Boolean(user.isAdmin) || Boolean(user.isSuperAdmin));

  const requestDeleteUser = (user) => {
    setDeleteTarget(user);
  };

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
      alert(
        error.response?.data?.message || "Unable to delete this user."
      );
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

  // ==============================================================
  // RENDER
  // ==============================================================

  return (
    <div className="pwd-mgmt-page">
      <div className="pwd-mgmt-header">
        <div className="pwd-mgmt-header-icon">
          <FaKey />
        </div>

        <div>
          <h1>Password Management</h1>
          <p>
            Every user&rsquo;s password is created and controlled here.
            Self-service &ldquo;Forgot Password&rdquo; is disabled for
            everyone except the Super Admin account — use this screen to
            look up any user&rsquo;s current password, use Set/Reset
            Password if they forgot it (or never had one), or use Edit to
            update their name, employee ID, email or role.
          </p>
        </div>
      </div>

      <div className="pwd-mgmt-toolbar">
        <div className="pwd-mgmt-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by name, email or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
      </div>

      <div className="pwd-mgmt-card">
        {loading ? (
          <div className="pwd-mgmt-state">Loading password vault...</div>
        ) : loadError ? (
          <div className="pwd-mgmt-state pwd-mgmt-state-error">
            {loadError}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="pwd-mgmt-state">No users found.</div>
        ) : (
          <div className="pwd-mgmt-table-wrap">
            <table className="pwd-mgmt-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Password</th>
                  <th>Last Updated</th>
                  <th className="pwd-mgmt-actions-col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="pwd-mgmt-name">
                        {user.name}
                        {user.employeeId && (
                          <span>{user.employeeId}</span>
                        )}
                      </div>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <div className="pwd-mgmt-role-badges">
                        {user.isSuperAdmin && (
                          <span className="pwd-mgmt-badge pwd-mgmt-badge-super">
                            <FaShieldAlt /> Super Admin
                          </span>
                        )}

                        {user.isAdmin && !user.isSuperAdmin && (
                          <span className="pwd-mgmt-badge pwd-mgmt-badge-admin">
                            <FaUserShield /> Administrator
                          </span>
                        )}

                        {!user.isAdmin && (
                          <span className="pwd-mgmt-badge pwd-mgmt-badge-user">
                            User
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="pwd-mgmt-password-cell">
                        <span className="pwd-mgmt-password-value">
                          {user.password
                            ? revealed[user.id]
                              ? user.password
                              : "•".repeat(Math.max(8, user.password.length))
                            : "— not set —"}
                        </span>

                        {user.password && (
                          <>
                            <button
                              type="button"
                              className="pwd-mgmt-icon-btn"
                              onClick={() => toggleReveal(user.id)}
                              title={
                                revealed[user.id]
                                  ? "Hide password"
                                  : "Show password"
                              }
                            >
                              {revealed[user.id] ? <FaEyeSlash /> : <FaEye />}
                            </button>

                            <button
                              type="button"
                              className="pwd-mgmt-icon-btn"
                              onClick={() => copyPassword(user)}
                              title="Copy password"
                            >
                              {copiedId === user.id ? <FaCheck /> : <FaCopy />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="pwd-mgmt-updated-cell">
                      {user.passwordUpdatedAt
                        ? new Date(user.passwordUpdatedAt).toLocaleString()
                        : "—"}
                      {user.passwordUpdatedBy && (
                        <span>by {user.passwordUpdatedBy}</span>
                      )}
                    </td>

                    <td className="pwd-mgmt-actions-col">
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
                        className="pwd-mgmt-update-btn"
                        onClick={() => setPasswordTargetUser(user)}
                        title={
                          user.password
                            ? "Reset this user's password"
                            : "Set a password for this user"
                        }
                      >
                        <FaUnlockAlt />
                        {user.password ? "Reset Password" : "Set Password"}
                      </button>

                      <button
                        type="button"
                        className="pwd-mgmt-delete-btn"
                        onClick={() => requestDeleteUser(user)}
                        disabled={deleteBusyId === user.id}
                      >
                        <FaTrash />
                        {deleteBusyId === user.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================
          DELETE USER CONFIRM MODAL

          Same style as the "Delete All" confirm modal below (and the
          Attendance Reports delete confirm) — a warning with Cancel and
          Delete, instead of the browser's native window.confirm().
      ================================================================ */}

      {deleteTarget && (
        <div
          className="pwd-mgmt-confirm-overlay"
          onMouseDown={cancelDeleteUser}
        >
          <div
            className="pwd-mgmt-confirm-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>Delete User</h2>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>
              {deleteTarget.email ? ` (${deleteTarget.email})` : ""}? The
              user&rsquo;s details will be permanently deleted. This cannot
              be undone.
            </p>

            <div className="pwd-mgmt-confirm-buttons">
              <button
                type="button"
                className="pwd-mgmt-confirm-cancel-btn"
                onClick={cancelDeleteUser}
                disabled={deleteBusyId === deleteTarget.id}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pwd-mgmt-confirm-delete-btn"
                onClick={confirmDeleteUser}
                disabled={deleteBusyId === deleteTarget.id}
              >
                {deleteBusyId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          DELETE ALL CONFIRM MODAL
      ================================================================ */}

      {showDeleteAllModal && (
        <div
          className="pwd-mgmt-confirm-overlay"
          onMouseDown={() => !deletingAll && setShowDeleteAllModal(false)}
        >
          <div
            className="pwd-mgmt-confirm-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>Delete All Users</h2>
            <p>
              This permanently deletes every user except Administrator and
              Super Admin accounts, which are always kept. This cannot be
              undone.
            </p>

            <div className="pwd-mgmt-confirm-buttons">
              <button
                type="button"
                className="pwd-mgmt-confirm-cancel-btn"
                onClick={() => setShowDeleteAllModal(false)}
                disabled={deletingAll}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pwd-mgmt-confirm-delete-btn"
                onClick={deleteAllUsers}
                disabled={deletingAll}
              >
                {deletingAll ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          EDIT USER MODAL (compact: name, employee ID, email, role)
      ================================================================ */}

      {editingUser && (
        <EditVaultUserModal
          user={editingUser}
          canManageSuperAdmin={canManageSuperAdmin}
          onClose={() => setEditingUser(null)}
          onSaved={fetchVault}
        />
      )}

      {/* ================================================================
          SET / RESET PASSWORD MODAL
      ================================================================ */}

      {passwordTargetUser && (
        <SetVaultUserPasswordModal
          user={passwordTargetUser}
          onClose={() => setPasswordTargetUser(null)}
          onSaved={fetchVault}
        />
      )}
    </div>
  );
}

export default PasswordManagement;
