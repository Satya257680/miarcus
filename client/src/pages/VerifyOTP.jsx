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

    setLoading(true);

    try {

      const res = await axios.post(

        "http://localhost:5000/api/auth/verify-otp",

        {

          email,

          otp

        }

      );

      alert(res.data.message);

      navigate("/reset-password", {

        state: {

          email

        }

      });

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

        <h2>Verify OTP</h2>

        <p className="login-subtitle">

          Enter the 6-digit OTP sent to your email.

        </p>

        <form onSubmit={handleSubmit}>

          <label>Email</label>

          <input

            type="email"

            value={email}

            readOnly

          />

          <label>OTP</label>

          <input

            type="text"

            placeholder="Enter OTP"

            value={otp}

            maxLength={6}

            onChange={(e) => setOtp(e.target.value)}

            required

          />

          <button

            type="submit"

            disabled={loading}

          >

            {

              loading

              ?

              "Verifying..."

              :

              "Verify OTP"

            }

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

export default VerifyOTP;