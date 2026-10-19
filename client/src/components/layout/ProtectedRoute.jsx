import { Navigate } from "react-router-dom";

// =============================================================
// PROTECTED ROUTE (UX guard only)
// -------------------------------------------------------------
// The server is the security boundary: every API checks the JWT,
// the user's status, token version and RBAC. This guard only stops
// the app shell from rendering for someone who is clearly not
// signed in, so they go straight to the login page instead of
// seeing a page full of failing requests.
//
// It used to check only localStorage.userId (any value passed).
// It now also requires a well-formed, unexpired access token.
// =============================================================

const SESSION_KEYS = [
  "token",
  "user",
  "permissions",
  "userId",
  "userName",
  "employeeId",
  "email",
  "departmentId",
  "profilePhoto",
];

// Reads the `exp` claim (seconds). Signature is NOT checked here —
// that is the server's job. Returns null when it cannot be read.
const readTokenExpiry = (token) => {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(window.atob(padded));
    const exp = Number(payload?.exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
};

const hasUsableSession = () => {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (!userId || !token) return false;

  const exp = readTokenExpiry(token);
  // Malformed token → not usable. Small clock-skew allowance (30 s).
  if (exp === null) return false;
  return exp * 1000 > Date.now() - 30 * 1000;
};

function ProtectedRoute({ children }) {
  if (!hasUsableSession()) {
    try {
      SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore storage errors
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
