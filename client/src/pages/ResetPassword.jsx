import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.css";

function ResetPassword() {

  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {

      const res = await axios.post(
        "http://localhost:5000/api/auth/reset-password",
        {
          email,
          password,
        }
      );

      alert(res.data.message);

      navigate("/");

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

        <h2>Reset Password</h2>

        <form onSubmit={handleSubmit}>

          <label>New Password</label>

          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label>Confirm Password</label>

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit">
            Reset Password
          </button>

        </form>

      </div>

    </div>

  );

}

export default ResetPassword;