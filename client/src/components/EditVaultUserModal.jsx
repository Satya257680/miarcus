import { useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import { FaTimes } from "react-icons/fa";

import "../styles/PasswordManagement.css";

// =================================================================
// MIARCUS — EDIT USER (Password Management)
// =================================================================
//
// The Password Management screen's Actions column only ever shows
// two buttons: Edit and Delete. This is what "Edit" opens — a
// compact form with just the fields that screen cares about: Name,
// Employee ID, Email and Role (User / Administrator / Super Admin).
// It intentionally does NOT reuse the full multi-step AddUserModal
// (Department/Designation/Stores/Permissions/...), and it does NOT
// touch passwords — Password Management no longer offers a separate
// "Update Password" action.
//
// Role replaces the old standalone "Make/Revoke Super Admin" button:
// picking "Super Admin" here grants it, picking anything else while
// the user currently has it revokes it. Only an existing Super Admin
// (canManageSuperAdmin) is allowed to grant/revoke Super Admin — the
// server enforces this too (PUT /api/password-vault/:id/super-admin),
// this is just so the option isn't offered/changeable in the UI to
// someone who isn't allowed to use it.
//
// `user` is expected to be a FULL record from GET /api/users (the
// same shape AddUserModal edits from), not the narrow password-vault
// row — see PasswordManagement.jsx's openEditUser(). Saving reuses
// that full record for every field this form doesn't show, so
// Department/Designation/Reports To/Stores/Permissions are always
// sent back unchanged and never get blanked out.
// =================================================================

function currentRole(user) {
  if (Number(user?.is_super_admin) === 1) return "superadmin";
  if (Number(user?.is_admin) === 1) return "admin";
  return "user";
}

function EditVaultUserModal({ user, canManageSuperAdmin, onClose, onSaved }) {
  const [name, setName] = useState(user?.name || "");
  const [employeeId, setEmployeeId] = useState(user?.employee_id || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState(currentRole(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startedAsSuperAdmin = Number(user?.is_super_admin) === 1;

  // If this account is already Super Admin and the person editing it
  // isn't one themselves, don't let them change the role either way.
  const roleLocked = startedAsSuperAdmin && !canManageSuperAdmin;

  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedEmployeeId = employeeId.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    setSaving(true);
    setError("");

    const wantsSuperAdmin = role === "superadmin";
    const wantsAdmin = role === "admin" || wantsSuperAdmin;
    const isCurrentlySuperAdmin = startedAsSuperAdmin;

    try {
      // Revoking Super Admin has to happen BEFORE the main update below
      // turns Administrator off (server only allows toggling Super
      // Admin while the account is still an Administrator).
      if (isCurrentlySuperAdmin && !wantsSuperAdmin) {
        await axios.put(
          `${API_BASE_URL}/api/password-vault/${user.id}/super-admin`
        );
      }

      // Full-record update — every field below except
      // fullName/employeeId/email/administrator/active is passed
      // through unchanged from the record this modal was opened
      // with, so Department/Designation/Reports To/Stores/
      // Permissions are preserved exactly as they were.
      await axios.put(`${API_BASE_URL}/api/users/${user.id}`, {
        fullName: trimmedName,
        employeeId: trimmedEmployeeId,
        email: trimmedEmail,
        callContact: user.call_contact || "",
        whatsappContact: user.whatsapp_contact || "",
        reportsTo: user.reports_to_id
          ? { id: user.reports_to_id, name: user.reports_to }
          : null,
        department_id: user.department_id || "",
        designation_id: user.designation_id || "",
        stores: Array.isArray(user.stores) ? user.stores : [],
        permissions: user.permissions || {},
        active: wantsAdmin ? true : user.status === "Active",
        administrator: wantsAdmin,
      });

      // Granting Super Admin has to happen AFTER the update above,
      // since the server requires the account to already be an
      // Administrator before Super Admin can be granted.
      if (!isCurrentlySuperAdmin && wantsSuperAdmin) {
        await axios.put(
          `${API_BASE_URL}/api/password-vault/${user.id}/super-admin`
        );
      }

      alert("User updated successfully.");
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Edit vault user error:", err);
      setError(
        err.response?.data?.message || "Unable to update this user."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pwd-mgmt-modal-overlay" onMouseDown={close}>
      <div
        className="pwd-mgmt-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pwd-mgmt-modal-header">
          <div>
            <h3>Edit User</h3>
            <p>{user?.email}</p>
          </div>

          <button
            type="button"
            className="pwd-mgmt-modal-close"
            onClick={close}
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        {error && <div className="pwd-mgmt-modal-error">{error}</div>}

        <div className="pwd-mgmt-modal-field">
          <label>Name</label>
          <div className="pwd-mgmt-modal-input-wrap">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="pwd-mgmt-modal-field">
          <label>Employee ID</label>
          <div className="pwd-mgmt-modal-input-wrap">
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="pwd-mgmt-modal-field">
          <label>Email</label>
          <div className="pwd-mgmt-modal-input-wrap">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="pwd-mgmt-modal-field">
          <label>Role</label>
          <div className="pwd-mgmt-modal-select-wrap">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={saving || roleLocked}
            >
              <option value="user">User</option>
              <option value="admin">Administrator</option>
              {(canManageSuperAdmin || startedAsSuperAdmin) && (
                <option value="superadmin">Super Admin</option>
              )}
            </select>
          </div>
          {roleLocked && (
            <p className="pwd-mgmt-modal-hint">
              Only a Super Admin can change this user&rsquo;s role.
            </p>
          )}
        </div>

        <div className="pwd-mgmt-modal-footer">
          <button
            type="button"
            className="pwd-mgmt-cancel-btn"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="pwd-mgmt-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditVaultUserModal;
