import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./login.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      alert("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "https://miarcus-backend.onrender.com/api/auth/forgot-password",
        {
          email: trimmedEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data?.success) {
        // Start a fresh password-reset session for this OTP request.
        sessionStorage.removeItem("passwordResetToken");
        sessionStorage.setItem("passwordResetEmail", trimmedEmail);

        alert(
          response.data.message ||
            "OTP has been sent to your registered email address."
        );

        navigate("/verify-otp", {
          replace: true,
          state: {
            email: trimmedEmail,
          },
        });

        return;
      }

      alert(
        response.data?.message ||
          "Unable to process your request. Please try again."
      );
    } catch (error) {
      console.error("Forgot Password Error:", error);

      if (error.response) {
        alert(
          error.response.data?.message ||
            "Unable to process your request. Please try again."
        );
      } else if (error.request) {
        alert(
          "The server is not responding. Please make sure the backend server is running."
        );
      } else if (error.code === "ECONNABORTED") {
        alert(
          "The request timed out. Please check your server and try again."
        );
      } else {
        alert("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ======================================================
          BACKGROUND DECORATION
          ====================================================== */}

      <div className="login-background-shape shape-one"></div>

      <div className="login-background-shape shape-two"></div>

      <div className="login-background-shape shape-three"></div>

      {/* ======================================================
          FORGOT PASSWORD CARD
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
            HEADER
            ==================================================== */}

        <div className="login-header">

          <h1>Forgot Password</h1>

          <p>
            Enter your registered email address to receive
            a verification OTP.
          </p>

        </div>

        {/* ====================================================
            FORM
            ==================================================== */}

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          {/* ==================================================
              EMAIL
              ================================================== */}

          <div className="form-group">

            <label htmlFor="forgot-email">
              Email Address
            </label>

            <div className="input-wrapper">

              <span
                className="input-icon"
                aria-hidden="true"
              >
                @
              </span>

              <input
                id="forgot-email"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />

            </div>

          </div>

          {/* ==================================================
              SEND OTP BUTTON
              ================================================== */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <span
                  className="login-spinner"
                  aria-hidden="true"
                ></span>

                <span>Sending OTP...</span>
              </>
            ) : (
              <>
                <span>Send OTP</span>

                <span
                  className="button-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </>
            )}

          </button>

        </form>

        {/* ====================================================
            BACK TO LOGIN
            ==================================================== */}

        <div className="forgot-password-container">

          <Link
            to="/"
            className="forgot-password"
          >
            ← Back to Login
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

export default ForgotPassword;