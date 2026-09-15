import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FaCamera,
  FaStore,
  FaChartBar,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import "./login.css";

// =================================================================
// MIARCUS — LOGIN
// =================================================================
// Professional dark, split-screen sign-in screen matching the rest
// of the Jawandsons Group product family (VistaraX, etc). Purely a
// visual pass — the authentication flow below is unchanged.
// =================================================================

const HIGHLIGHTS = [
  {
    icon: <FaCamera />,
    text: "Photo-verified attendance at every shift",
  },
  {
    icon: <FaStore />,
    text: "Live view of every store and who's on duty",
  },
  {
    icon: <FaChartBar />,
    text: "Audit-ready reports, exportable anytime",
  },
];

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email,
          password,
        },
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data || response.data.success !== true) {
        setErrorMessage(
          response.data?.message || "Login failed. Please try again."
        );
        return;
      }

      const user = response.data.user;

      if (!user) {
        setErrorMessage(
          "Login succeeded, but user information was not returned."
        );
        return;
      }

      // Clear the previous session.
      localStorage.removeItem("token");
      localStorage.removeItem("permissions");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("employeeId");
      localStorage.removeItem("email");
      localStorage.removeItem("departmentId");
      localStorage.removeItem("profilePhoto");

      // Save authentication data.
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      localStorage.setItem(
        "permissions",
        JSON.stringify(response.data.permissions || {})
      );

      localStorage.setItem("user", JSON.stringify(user));

      if (user.id !== undefined && user.id !== null) {
        localStorage.setItem("userId", String(user.id));
      }

      localStorage.setItem(
        "userName",
        user.name || user.full_name || ""
      );

      localStorage.setItem(
        "employeeId",
        user.employee_id || user.employeeId || ""
      );

      localStorage.setItem("email", user.email || email);

      localStorage.setItem(
        "departmentId",
        user.department_id || user.departmentId || ""
      );

      if (user.profile_photo) {
        localStorage.setItem("profilePhoto", user.profile_photo);
      }

      setSuccessMessage(response.data.message || "Login successful.");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 650);
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;

        if (status === 503) {
          setErrorMessage(
            serverMessage ||
              "The database connection is temporarily unavailable. Please try again."
          );
          return;
        }

        if (status === 500) {
          setErrorMessage(
            serverMessage ||
              "An internal server error occurred. Please try again."
          );
          return;
        }

        if (status === 401) {
          setErrorMessage(
            serverMessage || "Invalid email or password."
          );
          return;
        }

        if (status === 403) {
          setErrorMessage(
            serverMessage || "You do not have permission to login."
          );
          return;
        }

        setErrorMessage(
          serverMessage || "Unable to login. Please try again."
        );
        return;
      }

      if (error.code === "ECONNABORTED") {
        setErrorMessage(
          "The server took too long to respond. Please try again."
        );
        return;
      }

      if (error.request) {
        setErrorMessage(
          "Unable to connect to the server. Please make sure the backend is running."
        );
        return;
      }

      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Miarcus sign in">
        {/* ==========================================================
            LEFT — BRAND PANEL
        ========================================================== */}
        <div className="login-brand-panel">
          <div className="login-brand-glow glow-a" />
          <div className="login-brand-glow glow-b" />

          <div className="login-brand-top">
            <Link to="/" className="login-brand-mark">
              <img src="/miarcus.png" alt="Miarcus" />
              <span>
                Miarcus
                <small>RETAIL OPERATIONS</small>
              </span>
            </Link>
          </div>

          <div className="login-brand-copy">
            <h1>
              Every store, verified
              <br />
              the moment work starts.
            </h1>

            <p>
              Built in-house for Mi Arcus Baby Products — one secure
              portal for attendance, billing, collections and store
              operations.
            </p>

            <ul className="login-highlights">
              {HIGHLIGHTS.map((item) => (
                <li key={item.text}>
                  <span className="login-highlight-icon">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="login-brand-mock">
            <div className="login-mock-avatar">
              S
              <FaCheckCircle className="login-mock-badge" />
            </div>

            <div className="login-mock-info">
              <span className="login-mock-name">Satyajit Nayak</span>
              <span className="login-mock-id">MIA-2026-000112</span>

              <div className="login-mock-bars">
                <span />
                <span />
              </div>
            </div>

            <span className="login-mock-status">Checked In</span>
          </div>
        </div>

        {/* ==========================================================
            RIGHT — SIGN IN FORM
        ========================================================== */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-form-head">
              <h2>Welcome back</h2>
              <p>Sign in to access your Miarcus dashboard</p>
            </div>

            {errorMessage && (
              <div className="login-message login-error" role="alert">
                <span className="message-icon">!</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="login-message login-success" role="status">
                <span className="message-icon">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>

                <div className="input-wrapper">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@miarcus.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="username"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-group-head">
                  <label htmlFor="password">Password</label>
                  <Link to="/forgot-password" className="forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <div className="input-wrapper input-wrapper-icon">
                  <span className="input-icon">
                    <FaLock />
                  </span>

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe((prev) => !prev)}
                />
                <span className="custom-checkbox" />
                <span>Remember me on this device</span>
              </label>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <FaArrowRight />
                  </>
                )}
              </button>
            </form>

            <p className="login-security-note">
              Protected by JWT authentication, bcrypt password hashing,
              and role-based access control.
            </p>

            <Link to="/" className="login-back-home">
              ← Back to Miarcus home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
