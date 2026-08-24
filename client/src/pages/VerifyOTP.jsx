import { useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./login.css";

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      alert("Email not found. Please try again.");
      navigate("/forgot-password");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      alert("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "https://miarcus-backend.onrender.com/api/auth/verify-otp",
        { email, otp }
      );

      if (!res.data?.success) {
        alert(
          res.data?.message ||
            "Unable to verify OTP. Please try again."
        );
        return;
      }

      if (!res.data?.resetToken) {
        alert("OTP verified, but the password reset authorization was not issued. Please request a new OTP.");
        return;
      }

      // Store only the short-lived, server-issued reset authorization.
      sessionStorage.setItem("passwordResetToken", res.data.resetToken);

      alert(res.data.message || "OTP Verified Successfully");

      navigate("/reset-password", {
        replace: true,
        state: { email },
      });
    } catch (err) {
      if (err.response) {
        alert(
          err.response.data?.message ||
            "Invalid or expired OTP. Please try again."
        );
      } else {
        alert("Server Error");
      }
    } finally {
      setLoading(false);
    }
  };

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
        className="login-card auth-card"
        aria-label="Miarcus verify OTP"
      >
        <div className="card-inner auth-card-inner">
          <div className="logo-container">
            <img
              src="/miarcus.png"
              alt="Miarcus"
              className="logo"
            />
          </div>

          <div className="login-header auth-header">
            <h1>Verify OTP</h1>
            <p>Enter the 6-digit OTP sent to your email.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="otp-email">Email Address</label>

              <div className="input-wrapper">
                <span className="input-icon email-icon" aria-hidden="true">
                  @
                </span>

                <input
                  id="otp-email"
                  type="email"
                  value={email}
                  readOnly
                  className="readonly-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="otp">Verification OTP</label>

              <div className="input-wrapper">
                <span className="input-icon otp-icon" aria-hidden="true">
                  #
                </span>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  maxLength={6}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  autoComplete="one-time-code"
                  disabled={loading}
                  className="otp-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP</span>
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

export default VerifyOTP;
