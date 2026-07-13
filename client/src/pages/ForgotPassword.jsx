import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./login.css";

function ForgotPassword() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const res = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        { email }
      );

      alert(res.data.message);

      navigate("/reset-password", {
        state: { email },
      });

    } catch (err) {

      if (err.response) {
        alert(err.response.data.message);
      } else {
        alert("Server Error");
      }

    }

  };

  return (

    <div className="login-page">

      <div className="login-card">

        <img
          src="/miarcus.png"
          alt="Logo"
          className="logo"
        />

        <h2>Forgot Password</h2>

        <form onSubmit={handleSubmit}>

          <label>Email Address</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">
            Continue
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