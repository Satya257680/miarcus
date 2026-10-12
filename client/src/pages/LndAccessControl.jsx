import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig";
import "../styles/pages/LndAccessControl.css";

// =================================================================
// LEARNING & DEVELOPMENT — ACCESS CONTROL (OWNER ONLY)
// =================================================================
// Only the L&D owner can open this page (route + API both enforce
// it). Choose who may see Learning & Development in the sidebar:
//
//   No access → hidden everywhere (default, even for administrators)
//   Learner   → "View"  : can open training + attempt assessments
//   Manager   → "Edit"  : + create / edit programs and modules
//   Admin     → "Full"  : everything incl. delete
// =================================================================

const LEVEL_OPTIONS = [
  { value: "None", label: "No access" },
  { value: "View", label: "Learner (view & attempt exam)" },
  { value: "Edit", label: "Manager (create & edit)" },
  { value: "Full", label: "Full control" },
];

export default function LndAccessControl() {
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const flash = (type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, auditRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/lnd-access/users`),
        axios.get(`${API_BASE_URL}/api/lnd-access/audit`),
      ]);
      setUsers(usersRes.data?.users || []);
      setAudit(auditRes.data?.audit || []);
    } catch (error) {
      flash("error", error?.response?.data?.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeLevel = async (user, level) => {
    const previous = user.level;
    setSavingId(user.id);
    setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, level } : u)));

    try {
      await axios.put(`${API_BASE_URL}/api/lnd-access/users/${user.id}`, { level });
      flash("success", `${user.name}: ${level === "None" ? "access removed" : `access set to ${level}`}`);
      const auditRes = await axios.get(`${API_BASE_URL}/api/lnd-access/audit`);
      setAudit(auditRes.data?.audit || []);
    } catch (error) {
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, level: previous } : u)));
      flash("error", error?.response?.data?.message || "Unable to update access");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "granted" && u.level === "None") return false;
      if (filter === "none" && u.level !== "None") return false;
      if (!q) return true;
      return [u.name, u.email, u.designation, u.employeeId]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search, filter]);

  const grantedCount = users.filter((u) => u.level !== "None" && !u.isOwner).length;

  return (
    <div className="lnd-access">
      <div className="lnd-access__hero">
        <div>
          <span className="lnd-access__eyebrow">Learning & Development</span>
          <h1>Access Control</h1>
          <p>
            Only you can decide who sees Learning &amp; Development in the sidebar. Administrators
            have no automatic access — grant it here.
          </p>
        </div>
        <div className="lnd-access__stat">
          <strong>{grantedCount}</strong>
          <span>users with access</span>
        </div>
      </div>

      <div className="lnd-access__toolbar">
        <input
          type="search"
          placeholder="Search name, email, designation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All users</option>
          <option value="granted">Has access</option>
          <option value="none">No access</option>
        </select>
      </div>

      <div className="lnd-access__card">
        {loading ? (
          <p className="lnd-access__empty">Loading users…</p>
        ) : filtered.length === 0 ? (
          <p className="lnd-access__empty">No users found.</p>
        ) : (
          <div className="lnd-access__scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>L&amp;D access</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="lnd-access__name">{user.name}</div>
                      <div className="lnd-access__sub">{user.email}</div>
                    </td>
                    <td>{user.designation || "—"}</td>
                    <td>
                      {user.isOwner ? (
                        <span className="lnd-badge lnd-badge--owner">Owner</span>
                      ) : user.administrator ? (
                        <span className="lnd-badge">Administrator</span>
                      ) : (
                        <span className="lnd-badge lnd-badge--muted">User</span>
                      )}
                    </td>
                    <td>
                      {user.isOwner ? (
                        <span className="lnd-access__fixed">Full control (always)</span>
                      ) : (
                        <select
                          className={`lnd-access__level lnd-access__level--${user.level.toLowerCase()}`}
                          value={user.level}
                          disabled={savingId === user.id}
                          onChange={(e) => changeLevel(user, e.target.value)}
                        >
                          {LEVEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="lnd-access__card">
        <h2>Recent changes</h2>
        {audit.length === 0 ? (
          <p className="lnd-access__empty">No changes yet.</p>
        ) : (
          <ul className="lnd-access__audit">
            {audit.map((row) => (
              <li key={row.id}>
                <strong>{row.target_name || "User"}</strong>: {row.old_level} → {row.new_level}
                <span>
                  {" "}
                  by {row.changed_by_name || "owner"} · {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && <div className={`lnd-access__toast lnd-access__toast--${toast.type}`}>{toast.text}</div>}
    </div>
  );
}
