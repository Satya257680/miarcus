import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
        }
      );

     alert(response.data.message);

    setTimeout(() => {
    navigate("/dashboard");
      }, 100);
    } catch (error) {
      console.log(error);

      if (error.response) {
        alert(error.response.data.message);
      } else {
        alert("Server Not Running");
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <img
          src="/miarcus.png"
          alt="Miarcus Logo"
          className="logo"
        />

        <h2>Master Login</h2>

        <form onSubmit={handleLogin}>

          <label>Email Address</label>

          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            Sign In
          </button>

        </form>

        <p className="forgot-password">
          <Link to="/forgot-password">
            Forgot Password?
          </Link>
        </p>

        <p className="footer">
          © 2026 Miarcus. All rights reserved.
        </p>

      </div>
    </div>
  );
}

export default Login;