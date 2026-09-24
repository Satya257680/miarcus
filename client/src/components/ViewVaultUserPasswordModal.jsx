import { useState } from "react";
import { FaClipboard, FaEye, FaEyeSlash, FaKey, FaTimes, FaCheck } from "react-icons/fa";

import "../styles/PasswordManagement.css";

function ViewVaultUserPasswordModal({ user, onClose }) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const password = String(user?.password || "");

  const copyPassword = async () => {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Copy password failed:", error);
    }
  };

  return (
    <div className="pwd-mgmt-modal-overlay" onMouseDown={onClose}>
      <div
        className="pwd-mgmt-modal pwd-mgmt-password-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwd-view-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pwd-mgmt-modal-header pwd-mgmt-password-view-header">
          <div className="pwd-mgmt-modal-title-wrap">
            <div className="pwd-mgmt-modal-icon">
              <FaKey />
            </div>
            <div>
              <h3 id="pwd-view-title">Current Password</h3>
              <p>{user?.name || "User"} &bull; {user?.email || "No email"}</p>
            </div>
          </div>

          <button
            type="button"
            className="pwd-mgmt-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="pwd-mgmt-password-view-body">
          <div className="pwd-mgmt-password-user-card">
            <div className="pwd-mgmt-password-avatar">
              {(user?.name || "U").trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{user?.employeeId || "Employee ID not available"}</span>
            </div>
          </div>

          {password ? (
            <>
              <div className="pwd-mgmt-password-label-row">
                <span>Current Password</span>
                <span className="pwd-mgmt-password-live">
                  <i /> Current
                </span>
              </div>

              <div className="pwd-mgmt-password-display">
                <input
                  type={visible ? "text" : "password"}
                  value={password}
                  readOnly
                  aria-label="Current password"
                />

                <button
                  type="button"
                  className="pwd-mgmt-password-icon-btn"
                  onClick={() => setVisible((value) => !value)}
                  title={visible ? "Hide password" : "Show password"}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <FaEyeSlash /> : <FaEye />}
                </button>

                <button
                  type="button"
                  className="pwd-mgmt-password-copy-btn"
                  onClick={copyPassword}
                  title="Copy password"
                >
                  {copied ? <FaCheck /> : <FaClipboard />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="pwd-mgmt-password-info">
                <FaKey />
                <span>
                  This is the currently stored password. If an administrator
                  resets the password, this value updates automatically.
                </span>
              </div>
            </>
          ) : (
            <div className="pwd-mgmt-password-empty">
              <div className="pwd-mgmt-empty-icon">
                <FaKey />
              </div>
              <h4>No password available</h4>
              <p>
                This user does not have a stored password yet. Use
                <strong> Reset Password </strong>
                to create one.
              </p>
            </div>
          )}
        </div>

        <div className="pwd-mgmt-modal-footer">
          <button
            type="button"
            className="pwd-mgmt-cancel-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewVaultUserPasswordModal;
