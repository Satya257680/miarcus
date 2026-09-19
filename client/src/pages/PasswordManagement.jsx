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
  FaTimes,
  FaCheck,
} from "react-icons/fa";

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

// Matches the server-side password policy in config/security.js:
// 8-10 characters, at least one uppercase, one lowercase, one
// number and one special character.
function generateStrongPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";

  const pick = (chars) =>
    chars[Math.floor(Math.random() * chars.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(special)];

  const all = upper + lower + digits + special;
  const targetLength = 9;

  while (required.length < targetLength) {
    required.push(pick(all));
  }

  // Shuffle so the required categories aren't always in the same spot.
  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
}

function PasswordManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const [modalUser, setModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [superAdminBusyId, setSuperAdminBusyId] = useState(null);

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
  // UPDATE PASSWORD MODAL
  // ==============================================================

  const openModal = (user) => {
    setModalUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setModalError("");
  };

  const closeModal = () => {
    if (saving) return;
    setModalUser(null);
  };

  const handleGenerate = () => {
    const generated = generateStrongPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
  };

  const submitPasswordUpdate = async () => {
    if (!modalUser) return;

    if (!newPassword.trim()) {
      setModalError("Please enter a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError("Password and Confirm Password do not match.");
      return;
    }

    setSaving(true);
    setModalError("");

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/password-vault/${modalUser.id}`,
        {
          password: newPassword,
          confirmPassword,
        }
      );

      alert(
        response.data?.message ||
          "Password updated successfully."
      );

      setModalUser(null);
      fetchVault();
    } catch (error) {
      console.error("Password update error:", error);
      setModalError(
        error.response?.data?.message ||
          "Unable to update password."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==============================================================
  // SUPER ADMIN TOGGLE
  // ==============================================================

  const toggleSuperAdmin = async (user) => {
    if (!canManageSuperAdmin) return;

    const action = user.isSuperAdmin ? "revoke" : "grant";

    if (
      !window.confirm(
        `Are you sure you want to ${action} Super Admin access ${
          action === "grant" ? "to" : "from"
        } ${user.name}? Super Admin is the only account allowed to use self-service "Forgot Password".`
      )
    ) {
      return;
    }

    setSuperAdminBusyId(user.id);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/password-vault/${user.id}/super-admin`
      );

      alert(response.data?.message || "Super Admin access updated.");
      fetchVault();
    } catch (error) {
      console.error("Toggle super admin error:", error);
      alert(
        error.response?.data?.message ||
          "Unable to update Super Admin access."
      );
    } finally {
      setSuperAdminBusyId(null);
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
            look up or reset any user&rsquo;s password instead. Updating a
            password here emails the new credentials directly to that
            person.
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
                        className="pwd-mgmt-update-btn"
                        onClick={() => openModal(user)}
                      >
                        Update Password
                      </button>

                      {canManageSuperAdmin && user.isAdmin && (
                        <button
                          type="button"
                          className={`pwd-mgmt-super-btn ${
                            user.isSuperAdmin ? "revoke" : "grant"
                          }`}
                          onClick={() => toggleSuperAdmin(user)}
                          disabled={superAdminBusyId === user.id}
                        >
                          {user.isSuperAdmin
                            ? "Revoke Super Admin"
                            : "Make Super Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================
          UPDATE PASSWORD MODAL
      ================================================================ */}

      {modalUser && (
        <div className="pwd-mgmt-modal-overlay" onMouseDown={closeModal}>
          <div
            className="pwd-mgmt-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pwd-mgmt-modal-header">
              <div>
                <h3>Update Password</h3>
                <p>
                  {modalUser.name} &middot; {modalUser.email}
                </p>
              </div>

              <button
                type="button"
                className="pwd-mgmt-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <FaTimes />
              </button>
            </div>

            {modalError && (
              <div className="pwd-mgmt-modal-error">{modalError}</div>
            )}

            <div className="pwd-mgmt-modal-field">
              <label>New Password</label>
              <div className="pwd-mgmt-modal-input-wrap">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8-10 characters"
                  disabled={saving}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  disabled={saving}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="pwd-mgmt-modal-field">
              <label>Confirm Password</label>
              <div className="pwd-mgmt-modal-input-wrap">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={saving}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="button"
              className="pwd-mgmt-generate-btn"
              onClick={handleGenerate}
              disabled={saving}
            >
              <FaSyncAlt /> Generate Strong Password
            </button>

            <p className="pwd-mgmt-modal-hint">
              Must be 8-10 characters with at least one uppercase letter,
              one lowercase letter, one number and one special character.
              The new password will be emailed to {modalUser.email}{" "}
              automatically.
            </p>

            <div className="pwd-mgmt-modal-footer">
              <button
                type="button"
                className="pwd-mgmt-cancel-btn"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pwd-mgmt-save-btn"
                onClick={submitPasswordUpdate}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save & Send to User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PasswordManagement;
