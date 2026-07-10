import { useState } from "react";
import "./login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    console.log({
      email,
      password,
    });
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
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">
            Sign In
          </button>

        </form>

        <p className="forgot">
          Forgot Password?
        </p>

        <p className="footer">
          Miarcus Portal
        </p>

      </div>

    </div>
  );
}

export default Login;