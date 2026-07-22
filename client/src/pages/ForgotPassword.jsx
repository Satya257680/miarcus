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

    setLoading(true);

    try {

      const res = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        {
          email,
        }
      );

      alert(res.data.message);

      // Current flow
      // Later, when OTP is added, change this to:
      // navigate("/verify-otp", { state: { email } });

      navigate("/reset-password", {
        state: { email },
      });

    } catch (err) {

      if (err.response) {

        alert(err.response.data.message);

      } else {

        alert("Server Error");

      }

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="login-page">

      <div className="login-card">

        {/* Logo */}

        <div className="forgot-logo">

          <img
            src="/miarcus.png"
            alt="Miarcus Logo"
            className="logo"
          />

        </div>

        <h2>Forgot Password</h2>

        <p className="login-subtitle">
          Enter your registered email address to continue.
        </p>

        <form onSubmit={handleSubmit}>

          <label>Email Address</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>

        </form>

        <p className="forgot-password">

          <Link to="/">
            Back to Login
          </Link>

        </p>

      </div>

    </div>

  );

}

export default ForgotPassword;