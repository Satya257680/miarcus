import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./login.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  // ============================================================
  // HANDLE INPUT
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  // ============================================================
  // HANDLE LOGIN
  // ============================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const email = formData.email.trim();
    const password = formData.password;

    // ----------------------------------------------------------
    // FRONTEND VALIDATION
    // ----------------------------------------------------------

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
      console.log("==========================================");
      console.log("LOGIN REQUEST");
      console.log("Email :", email);
      console.log("API   :", `${API_BASE_URL}/api/auth/login`);
      console.log("==========================================");

      // --------------------------------------------------------
      // LOGIN API
      // --------------------------------------------------------

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

      console.log("LOGIN RESPONSE :", response.data);

      // --------------------------------------------------------
      // CHECK RESPONSE
      // --------------------------------------------------------

      if (!response.data || response.data.success !== true) {
        setErrorMessage(
          response.data?.message || "Login failed. Please try again."
        );

        return;
      }

      // --------------------------------------------------------
      // USER
      // --------------------------------------------------------

      const user = response.data.user;

      if (!user) {
        setErrorMessage(
          "Login succeeded, but user information was not returned."
        );

        return;
      }

      // --------------------------------------------------------
      // CLEAR OLD SESSION
      // --------------------------------------------------------

      localStorage.removeItem("token");
      localStorage.removeItem("permissions");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("employeeId");
      localStorage.removeItem("email");
      localStorage.removeItem("departmentId");
      localStorage.removeItem("profilePhoto");

      // --------------------------------------------------------
      // SAVE JWT TOKEN
      // --------------------------------------------------------

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      // --------------------------------------------------------
      // SAVE PERMISSIONS
      // --------------------------------------------------------

      localStorage.setItem(
        "permissions",
        JSON.stringify(response.data.permissions || {})
      );

      // --------------------------------------------------------
      // SAVE COMPLETE USER
      // --------------------------------------------------------

      localStorage.setItem("user", JSON.stringify(user));

      // --------------------------------------------------------
      // SAVE USER ID
      // --------------------------------------------------------

      if (user.id !== undefined && user.id !== null) {
        localStorage.setItem("userId", String(user.id));
      }

      // --------------------------------------------------------
      // SAVE USER NAME
      // --------------------------------------------------------

      localStorage.setItem(
        "userName",
        user.name || user.full_name || ""
      );

      // --------------------------------------------------------
      // SAVE EMPLOYEE ID
      // --------------------------------------------------------

      localStorage.setItem(
        "employeeId",
        user.employee_id || user.employeeId || ""
      );

      // --------------------------------------------------------
      // SAVE EMAIL
      // --------------------------------------------------------

      localStorage.setItem(
        "email",
        user.email || email
      );

      // --------------------------------------------------------
      // SAVE DEPARTMENT ID
      // --------------------------------------------------------

      localStorage.setItem(
        "departmentId",
        user.department_id ||
          user.departmentId ||
          ""
      );

      // --------------------------------------------------------
      // SAVE PROFILE PHOTO
      // --------------------------------------------------------

      if (user.profile_photo) {
        localStorage.setItem(
          "profilePhoto",
          user.profile_photo
        );
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      setSuccessMessage(
        response.data.message || "Login successful."
      );

      // --------------------------------------------------------
      // REDIRECT
      // --------------------------------------------------------

      setTimeout(() => {
        navigate("/dashboard", {
          replace: true,
        });
      }, 500);
    } catch (error) {
      console.error("==========================================");
      console.error("LOGIN ERROR");
      console.error("==========================================");
      console.error(error);

      // ========================================================
      // SERVER RESPONSE ERROR
      // ========================================================

      if (error.response) {
        const status = error.response.status;
        const serverMessage =
          error.response.data?.message;

        console.error("Status  :", status);
        console.error("Message :", serverMessage);

        // ------------------------------------------------------
        // 503 DATABASE / SERVER TEMPORARY ERROR
        // ------------------------------------------------------

        if (status === 503) {
          setErrorMessage(
            serverMessage ||
              "The database connection is temporarily unavailable. Please try again."
          );

          return;
        }

        // ------------------------------------------------------
        // 500 SERVER ERROR
        // ------------------------------------------------------

        if (status === 500) {
          setErrorMessage(
            serverMessage ||
              "An internal server error occurred. Please try again."
          );

          return;
        }

        // ------------------------------------------------------
        // 401 INVALID LOGIN
        // ------------------------------------------------------

        if (status === 401) {
          setErrorMessage(
            serverMessage ||
              "Invalid email or password."
          );

          return;
        }

        // ------------------------------------------------------
        // 403 FORBIDDEN
        // ------------------------------------------------------

        if (status === 403) {
          setErrorMessage(
            serverMessage ||
              "You do not have permission to login."
          );

          return;
        }

        // ------------------------------------------------------
        // OTHER SERVER ERRORS
        // ------------------------------------------------------

        setErrorMessage(
          serverMessage ||
            "Unable to login. Please try again."
        );

        return;
      }

      // ========================================================
      // REQUEST TIMEOUT
      // ========================================================

      if (error.code === "ECONNABORTED") {
        setErrorMessage(
          "The server took too long to respond. Please try again."
        );

        return;
      }

      // ========================================================
      // NETWORK ERROR
      // ========================================================

      if (error.request) {
        setErrorMessage(
          "Unable to connect to the server. Please make sure the backend is running."
        );

        return;
      }

      // ========================================================
      // UNKNOWN ERROR
      // ========================================================

      setErrorMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RETURN
  // ============================================================

  return (
    <div className="login-page">

      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="login-background-shape shape-one"></div>
      <div className="login-background-shape shape-two"></div>
      <div className="login-background-shape shape-three"></div>

      {/* ======================================================
          LOGIN CARD
      ====================================================== */}

      <div className="login-card">

        {/* ====================================================
            LOGO
        ==================================================== */}

        <div className="logo-container">
          <img
            src="/miarcus.png"
            alt="Miarcus Logo"
            className="logo"
          />
        </div>

        {/* ====================================================
            TITLE
        ==================================================== */}

        <div className="login-header">
          <h1>Master Login</h1>

          <p>
            Sign in to continue to your Miarcus account
          </p>
        </div>

        {/* ====================================================
            ERROR MESSAGE
        ==================================================== */}

        {errorMessage && (
          <div className="login-message login-error">
            <span className="message-icon">
              !
            </span>

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {/* ====================================================
            SUCCESS MESSAGE
        ==================================================== */}

        {successMessage && (
          <div className="login-message login-success">
            <span className="message-icon">
              ✓
            </span>

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          className="login-form"
          onSubmit={handleLogin}
        >

          {/* ==================================================
              EMAIL
          ================================================== */}

          <div className="form-group">

            <label htmlFor="email">
              Email Address
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                @
              </span>

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

          {/* ==================================================
              PASSWORD
          ================================================== */}

          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                •
              </span>

              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
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
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>

            </div>

          </div>

          {/* ==================================================
              SIGN IN BUTTON
          ================================================== */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="login-spinner"></span>

                <span>
                  Signing In...
                </span>
              </>
            ) : (
              <>
                <span>
                  Sign In
                </span>

                <span className="button-arrow">
                  →
                </span>
              </>
            )}

          </button>

        </form>

        {/* ====================================================
            FORGOT PASSWORD
        ==================================================== */}

        <div className="forgot-password-container">

          <Link
            to="/forgot-password"
            className="forgot-password"
          >
            Forgot Password?
          </Link>

        </div>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="login-footer">

          <span>
            © 2026 Miarcus. All rights reserved.
          </span>

        </div>

      </div>
    </div>
  );
}

export default Login;