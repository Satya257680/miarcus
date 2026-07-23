import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.css";

function ResetPassword() {

  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Prevent direct access without OTP verification
  useEffect(() => {

    if (!email) {

      alert("Session Expired. Please verify OTP again.");

      navigate("/forgot-password");

    }

  }, [email, navigate]);

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (password.trim() === "" || confirmPassword.trim() === "") {

      alert("Please fill all fields.");

      return;

    }

    if (password.length < 6) {

      alert("Password must be at least 6 characters.");

      return;

    }

    if (password !== confirmPassword) {

      alert("Passwords do not match.");

      return;

    }

    setLoading(true);

    try {

      const res = await axios.post(

        "http://localhost:5000/api/auth/reset-password",

        {

          email,

          password

        }

      );

      alert(res.data.message);

      navigate("/");

    }

    catch (err) {

      if (err.response) {

        alert(err.response.data.message);

      }

      else {

        alert("Server Error");

      }

    }

    finally {

      setLoading(false);

    }

  };

  return (

    <div className="login-page">

      <div className="login-card">

        <div className="forgot-logo">

          <img

            src="/miarcus.png"

            alt="Miarcus Logo"

            className="logo"

          />

        </div>

        <h2>Reset Password</h2>

        <p className="login-subtitle">

          Enter your new password.

        </p>

        <form onSubmit={handleSubmit}>

          <label>New Password</label>

          <input

            type="password"

            placeholder="Enter New Password"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

            required

          />

          <label>Confirm Password</label>

          <input

            type="password"

            placeholder="Confirm New Password"

            value={confirmPassword}

            onChange={(e) => setConfirmPassword(e.target.value)}

            required

          />

          <button

            type="submit"

            disabled={loading}

          >

            {

              loading

                ? "Updating Password..."

                : "Reset Password"

            }

          </button>

        </form>

      </div>

    </div>

  );

}

export default ResetPassword;