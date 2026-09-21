import { useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import { FaTimes, FaEye, FaEyeSlash, FaSyncAlt } from "react-icons/fa";

import "../styles/PasswordManagement.css";

// =================================================================
// MIARCUS — SET / RESET USER PASSWORD (Password Management)
// =================================================================
//
// BUG FIX: regular users never choose their own password and
// self-service "Forgot Password" is disabled for everyone except
// the Super Admin account (see PasswordManagement.jsx's own header
// text) — Password Management is supposed to be the "forgot
// password" path for everybody else. The backend has always fully
// supported this (PUT /api/password-vault/:id, wired up in
// controllers/passwordVaultController.js — it hashes + encrypts the
// new password, stores it, and emails it to the user), and it is
// exactly what user creation itself calls
// (controllers/userController.js). But the Password Management
// screen's Actions column only ever offered Edit (name/employee
// ID/email/role) and Delete — nothing in the UI ever called that
// endpoint, so an admin/Super Admin had no way to set a password
// for a user who forgot theirs, and no way to set one at all for a
// legacy account that shows "— not set —" in the Password column.
// This modal — opened from a new "Set/Reset Password" action next
// to Edit/Delete — is what was missing.
//
// Matches the server-side rule in server/config/security.js:
// 8-10 characters, at least one uppercase, one lowercase, one
// number and one special character. (Same rule + generator already
// used when creating a new user — see AddUserModal.jsx.)
// =================================================================

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,10}$/;

function generateStrongPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";

  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const all = upper + lower + digits + special;

  while (required.length < 9) {
    required.push(pick(all));
  }

  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
}

function SetVaultUserPasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const hasExistingPassword = Boolean(user?.password);

  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const handleGenerate = () => {
    const generated = generateStrongPassword();
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setError("");
  };

  const handleSave = async () => {
    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    if (!PASSWORD_RULE.test(password)) {
      setError(
        "Password must be 8-10 characters and include an uppercase letter, a lowercase letter, a number and a special character."
      );
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/password-vault/${user.id}`,
        { password, confirmPassword }
      );

      const emailSent = response.data?.emailSent !== false;

      alert(
        response.data?.message ||
          (emailSent
            ? "Password updated and emailed to the user successfully."
            : "Password updated successfully, but the notification email could not be sent.")
      );

      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Set vault user password error:", err);
      setError(
        err.response?.data?.message || "Unable to update the password."
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
            <h3>{hasExistingPassword ? "Reset Password" : "Set Password"}</h3>
            <p>
              {user?.name} — {user?.email}
            </p>
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
        {notice && <div className="pwd-mgmt-modal-error">{notice}</div>}

        <button
          type="button"
          className="pwd-mgmt-generate-btn"
          onClick={handleGenerate}
          disabled={saving}
        >
          <FaSyncAlt />
          Generate Strong Password
        </button>

        <div className="pwd-mgmt-modal-field">
          <label>New Password</label>
          <div className="pwd-mgmt-modal-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
              autoComplete="new-password"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="pwd-mgmt-modal-field">
          <label>Confirm Password</label>
          <div className="pwd-mgmt-modal-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
              autoComplete="new-password"
              placeholder="Re-enter new password"
            />
          </div>
        </div>

        <p className="pwd-mgmt-modal-hint">
          8-10 characters, with at least one uppercase letter, one lowercase
          letter, one number and one special character. This user does not
          choose their own password — once saved, the new password is
          emailed to them directly, exactly like when their account was
          first created.
        </p>

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
            {saving ? "Saving..." : "Save Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetVaultUserPasswordModal;
