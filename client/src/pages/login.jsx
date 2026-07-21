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

      if (response.data.success) {
        const user = response.data.user;

        // ===============================
        // Save complete user object
        // ===============================
        localStorage.setItem(
          "user",
          JSON.stringify(user)
        );

        // Optional (keep these because other pages may use them)
        localStorage.setItem("userId", user.id);
        localStorage.setItem("userName", user.name);
        localStorage.setItem(
          "employeeId",
          user.employee_id || ""
        );

        localStorage.setItem(
          "email",
          user.email || ""
        );

        localStorage.setItem(
          "departmentId",
          user.department_id || ""
        );

        if (user.profile_photo) {
          localStorage.setItem(
            "profilePhoto",
            user.profile_photo
          );
        }

        alert(response.data.message);

        navigate("/dashboard");
      }
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

        <div className="logo-container">
          <img
            src="/miarcus.png"
            alt="Miarcus Logo"
            className="logo"
          />
        </div>

        <h2 className="login-title">
          Master Login
        </h2>

        <form onSubmit={handleLogin}>

          <label>Email Address</label>

          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
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