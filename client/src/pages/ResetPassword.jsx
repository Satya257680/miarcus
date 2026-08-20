import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.css";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const email =
    location.state?.email ||
    sessionStorage.getItem("passwordResetEmail") ||
    "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verified = sessionStorage.getItem("passwordResetVerified");

    if (!email || verified !== "true") {
      sessionStorage.removeItem("passwordResetEmail");
      sessionStorage.removeItem("passwordResetVerified");
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isStrongPassword = Object.values(passwordRules).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      alert("Please fill all fields.");
      return;
    }

    if (!isStrongPassword) {
      alert(
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "https://miarcus-backend.onrender.com/api/auth/reset-password",
        { email, password }
      );

      alert(res.data.message || "Password reset successfully.");

      sessionStorage.removeItem("passwordResetEmail");
      sessionStorage.removeItem("passwordResetVerified");

      navigate("/", { replace: true });
    } catch (err) {
      if (err.response) {
        alert(
          err.response.data?.message ||
            "Unable to reset your password. Please try again."
        );
      } else {
        alert("Server Error");
      }
    } finally {
      setLoading(false);
    }
  };

  const PasswordEye = ({ visible }) => (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
          <path d="M9.88 4.24A10.6 10.6 0 0 1 12 4c5 0 8.73 4.11 9.73 6a11.8 11.8 0 0 1-3.04 3.76" />
          <path d="M6.61 6.61A11.8 11.8 0 0 0 2.27 10c1 1.89 4.73 6 9.73 6 1.12 0 2.17-.2 3.12-.54" />
        </>
      ) : (
        <>
          <path d="M2.27 12S6 6 12 6s9.73 6 9.73 6S18 18 12 18 2.27 12 2.27 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  const Rule = ({ valid, children }) => (
    <li className={valid ? "password-rule valid" : "password-rule"}>
      <span className="password-rule-icon" aria-hidden="true">
        {valid ? "✓" : "•"}
      </span>
      <span>{children}</span>
    </li>
  );

  return (
    <main className="login-page auth-page">
      <div className="nursery-glow glow-left" />
      <div className="nursery-glow glow-right" />

      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="star star-one">✦</div>
      <div className="star star-two">✦</div>
      <div className="star star-three">✦</div>
      <div className="moon">☾</div>

      <section
        className="login-card auth-card reset-password-card"
        aria-label="Miarcus reset password"
      >
        <div className="card-inner auth-card-inner">
          <div className="logo-container">
            <img src="/miarcus.png" alt="Miarcus" className="logo" />
          </div>

          <div className="login-header auth-header">
            <h1>Reset Password</h1>
            <p>Enter your new password to secure your account.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>

              <div className="input-wrapper">
                <span className="input-icon password-icon" aria-hidden="true">
                  ●
                </span>

                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="password-toggle password-eye"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  <PasswordEye visible={showPassword} />
                </button>
              </div>

              <ul className="password-rules" aria-label="Password requirements">
                <Rule valid={passwordRules.length}>At least 8 characters</Rule>
                <Rule valid={passwordRules.uppercase}>One uppercase letter (A-Z)</Rule>
                <Rule valid={passwordRules.lowercase}>One lowercase letter (a-z)</Rule>
                <Rule valid={passwordRules.number}>One number (0-9)</Rule>
                <Rule valid={passwordRules.special}>One special character (!@#$...)</Rule>
              </ul>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>

              <div className="input-wrapper">
                <span className="input-icon password-icon" aria-hidden="true">
                  ●
                </span>

                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="password-toggle password-eye"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  title={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  disabled={loading}
                >
                  <PasswordEye visible={showConfirmPassword} />
                </button>
              </div>

              {confirmPassword && (
                <div
                  className={
                    password === confirmPassword
                      ? "password-match valid"
                      : "password-match"
                  }
                >
                  {password === confirmPassword
                    ? "✓ Passwords match"
                    : "• Passwords do not match"}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading || !isStrongPassword || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <span className="button-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="auth-back">
            <Link to="/" className="forgot-password">
              ← Back to Login
            </Link>
          </div>

          <div className="login-footer auth-footer">
            <span>© 2026 Miarcus. All rights reserved.</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;
