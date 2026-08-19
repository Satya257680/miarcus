import { Navigate } from "react-router-dom";

function user() { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } }
function permissions() { try { return JSON.parse(localStorage.getItem("permissions") || "{}"); } catch { return {}; } }
function admin(u) { return u?.administrator===true||u?.administrator===1||u?.administrator==="1"||u?.is_admin===true||u?.is_admin===1||u?.is_admin==="1"; }
function level(v) { return {None:0,View:1,Add:2,Edit:3,Full:4}[v]||0; }

export default function PettyCashPermissionRoute({ required="View", children }) {
    const u=user(); const p=permissions();
    if(admin(u)) return children;
    // Prefer the dedicated module; keep Expenses fallback during migration.
    const current=p?.["Petty Cash"] || p?.Expenses;
    if(level(current)>=level(required)) return children;
    return <Navigate to="/" replace />;
}
