import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./login.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://miarcus-backend.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
      {/* Soft nursery background */}
      <div className="nursery-glow glow-left" />
      <div className="nursery-glow glow-right" />

      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="star star-one">✦</div>
      <div className="star star-two">✦</div>
      <div className="star star-three">✦</div>
      <div className="moon">☾</div>

      {/* Decorative toys */}
      <div className="toy toy-blocks">
        <span className="block block-purple">♥</span>
        <span className="block block-yellow">★</span>
        <span className="block block-blue">●</span>
      </div>

      <div className="toy toy-bunny">🐰</div>
      <div className="toy toy-bear">🧸</div>

      {/* ==========================================================
          BABY MASCOT
          The baby slides into the page and then keeps both hands
          around the login card.
      ========================================================== */}
      <div className="baby-scene" aria-hidden="true">
        <div className="baby-shadow" />

        <div className="baby-character">
          <div className="baby-body">
            <div className="baby-bib">♥</div>
          </div>

          <div className="baby-neck" />

          <div className="baby-head">
            <div className="baby-hair hair-one" />
            <div className="baby-hair hair-two" />

            <div className="baby-ear ear-left" />
            <div className="baby-ear ear-right" />

            <div className="baby-eye eye-left">
              <span />
            </div>
            <div className="baby-eye eye-right">
              <span />
            </div>

            <div className="baby-nose" />
            <div className="baby-mouth" />
            <div className="baby-cheek cheek-left" />
            <div className="baby-cheek cheek-right" />
          </div>

          <div className="baby-arm arm-back" />
          <div className="baby-hand hand-back" />

          <div className="baby-arm arm-front" />
          <div className="baby-hand hand-front" />
        </div>
      </div>

      {/* ==========================================================
          LOGIN CARD
      ========================================================== */}
      <section className="login-card" aria-label="Miarcus login">
        <div className="card-inner">
          <div className="logo-container">
            <img
              src="/miarcus.png"
              alt="Miarcus"
              className="logo"
            />
          </div>

          <div className="login-header">
            <h1>Welcome Back!</h1>
            <p>
              Sign in to continue to your Miarcus account
              <span className="header-heart">♥</span>
            </p>
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

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>

              <div className="input-wrapper">
                <span className="input-icon email-icon">✉</span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <span className="input-icon password-icon">●</span>

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
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input type="checkbox" />
                <span className="custom-checkbox" />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="forgot-password"
              >
                Forgot Password?
              </Link>
            </div>

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
                  <span className="button-login-icon">↪</span>
                  <span>Sign In</span>
                  <span className="button-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="or-divider">
            <span />
            <b>or</b>
            <span />
          </div>

          <div className="signup-link">
            <span>Don't have an account?</span>

            <button
              type="button"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="login-footer">
            <span>
              © 2026 Miarcus Baby Products. All rights reserved.
            </span>
            <span className="footer-heart">♥</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
