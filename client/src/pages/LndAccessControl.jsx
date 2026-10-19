import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig";
import { refreshAccess } from "../utils/rbac";
import confirmWithGlass from "../components/common/ConfirmDialog/confirmWithGlass.jsx";
import LndArt from "../components/lnd/LndArt";
import "../styles/pages/LndAccessControl.css";

// =================================================================
// LEARNING & DEVELOPMENT — ACCESS CONTROL (OWNER ONLY)
// =================================================================
// Only the L&D owner can open this page (route + API both enforce it).
//
// Access mode (one click, applies to the sidebar AND the API):
//   Everyone        → every active user sees L&D as a Learner.
//                     Individual "Cannot see" rows still hide it;
//                     Manager / Full grants still apply.
//   No one          → hidden for everybody except the owner.
//                     Individual grants are kept for later.
//   Specific users  → only users granted below can see it (default).
//
// Per user:  Cannot see · Learner (View) · Creator (Add) ·
//            Manager (Edit) · Full control
// The owner always has full control and cannot be locked out.
// =================================================================

const API = `${API_BASE_URL}/api/lnd-access`;

const LEVEL_OPTIONS = [
  { value: "None", label: "Cannot see" },
  { value: "View", label: "Can see · Learner" },
  { value: "Add", label: "Can see · Creator" },
  { value: "Edit", label: "Can see · Manager" },
  { value: "Full", label: "Can see · Full control" },
];
const LEVEL_HELP = {
  View: "Opens My Training, takes assessments, gets certificates",
  Add: "+ creates programs and modules",
  Edit: "+ edits, assigns and publishes programs (Program Management)",
  Full: "+ deletes programs and modules",
};

const MODES = [
  { value: "everyone", title: "Everyone", text: "Grant access to all users", icon: "👥" },
  { value: "nobody", title: "No one", text: "Remove access from everyone", icon: "⦸" },
  { value: "selected", title: "Specific users", text: "Grant / revoke access only for selected users", icon: "✓" },
];

const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const AVATAR_TONES = ["#7c5cff", "#ee3d63", "#f08a16", "#12a874", "#3b6cf0", "#b84dff"];

// Initials only: profile photos are stored inline in the database, and
// loading them for hundreds of users would make this page very heavy.
const Avatar = ({ user }) => (
  <span className="lac-avatar" style={{ background: AVATAR_TONES[Number(user.id) % AVATAR_TONES.length] }} aria-hidden="true">{initials(user.name)}</span>
);

const Spark = ({ tone }) => (
  <svg className={`lac-spark lac-spark--${tone}`} viewBox="0 0 120 40" aria-hidden="true">
    <path d="M0 30 C12 30 14 18 26 20 S42 34 54 26 70 8 82 14 98 30 120 10" fill="none" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export default function LndAccessControl() {
  const [mode, setMode] = useState("selected");
  const [users, setUsers] = useState([]);
  const [totalStores, setTotalStores] = useState(0);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [placeFilter, setPlaceFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [bulkLevel, setBulkLevel] = useState("View");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState(null);

  const flash = useCallback((type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const loadAudit = useCallback(async () => {
    try { setAudit((await axios.get(`${API}/audit`)).data?.audit || []); } catch (_) { /* optional */ }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const res = await axios.get(`${API}/users`);
      setUsers(res.data?.users || []);
      setMode(res.data?.mode || "selected");
      setTotalStores(Number(res.data?.totalStores || 0));
      loadAudit();
    } catch (error) {
      setLoadError(error?.response?.data?.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, [loadAudit]);

  useEffect(() => { load(); }, [load]);

  // Sidebar / route permissions of every open tab follow the change.
  const afterChange = useCallback(() => { refreshAccess(); loadAudit(); }, [loadAudit]);

  const places = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
      String(u.stores || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => set.add(s));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (accessFilter === "can" && u.level === "None") return false;
      if (accessFilter === "cannot" && u.level !== "None") return false;
      if (["View", "Add", "Edit", "Full"].includes(accessFilter) && u.level !== accessFilter) return false;
      if (roleFilter === "owner" && !u.isOwner) return false;
      if (roleFilter === "admin" && !u.administrator) return false;
      if (roleFilter === "user" && (u.administrator || u.isOwner)) return false;
      if (placeFilter && u.department !== placeFilter && !String(u.stores || "").split(",").map((s) => s.trim()).includes(placeFilter)) return false;
      if (!q) return true;
      return [u.name, u.email, u.designation, u.employeeId, u.department, u.stores].join(" ").toLowerCase().includes(q);
    });
  }, [users, search, accessFilter, roleFilter, placeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const nonOwners = users.filter((u) => !u.isOwner);
  const withAccess = users.filter((u) => u.level !== "None").length;
  const locked = mode === "nobody";

  const setSaving = (ids, on) => setSavingIds((prev) => {
    const next = new Set(prev);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    return next;
  });

  const changeLevel = async (user, level) => {
    const previous = user.level;
    setSaving([user.id], true);
    setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, level } : u)));
    try {
      const res = await axios.put(`${API}/users/${user.id}`, { level });
      const finalLevel = res.data?.level || level;
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, level: finalLevel, denied: mode === "everyone" && finalLevel === "None" } : u)));
      flash("success", `${user.name}: ${finalLevel === "None" ? "cannot see Learning & Development" : `can see it (${LEVEL_OPTIONS.find((o) => o.value === finalLevel)?.label.replace("Can see · ", "")})`}`);
      afterChange();
    } catch (error) {
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, level: previous } : u)));
      flash("error", error?.response?.data?.message || "Unable to update access");
    } finally {
      setSaving([user.id], false);
    }
  };

  const bulk = async (level) => {
    const ids = [...selected].filter((id) => !users.find((u) => u.id === id)?.isOwner);
    if (!ids.length) return flash("error", "Select at least one user (the owner cannot be changed).");
    const label = level === "None" ? "Remove access" : "Grant access";
    const ok = await confirmWithGlass({
      title: `${label} for ${ids.length} user(s)?`,
      message: level === "None"
        ? "They will no longer see Learning & Development in the sidebar. Their training progress and certificates are kept."
        : `They will see Learning & Development as: ${LEVEL_OPTIONS.find((o) => o.value === level)?.label.replace("Can see · ", "")}.`,
      confirmText: label,
      danger: level === "None",
    });
    if (!ok) return;
    setBusy("bulk");
    setSaving(ids, true);
    try {
      const res = await axios.put(`${API}/users`, { ids, level });
      const d = res.data || {};
      flash("success", `${d.updated ?? 0} user(s) updated${d.unchanged ? `, ${d.unchanged} already had it` : ""}${d.skippedOwner ? " (owner skipped)" : ""}.`);
      setSelected(new Set());
      await load();
      refreshAccess();
    } catch (error) {
      flash("error", error?.response?.data?.message || "Unable to update access");
    } finally {
      setSaving(ids, false);
      setBusy("");
    }
  };

  const switchMode = async (next) => {
    if (next === mode || busy) return;
    const texts = {
      everyone: { title: "Give everyone access?", message: "Every active user will see Learning & Development as a Learner. Manager / Full grants are kept. You can still set single users to “Cannot see”.", confirm: "Grant to Everyone", danger: false },
      nobody: { title: "Hide from everyone?", message: "Learning & Development will be hidden for everybody except you (the owner). Individual grants are kept and return when you switch to Specific users.", confirm: "Hide from Everyone", danger: true },
      selected: { title: "Switch to specific users?", message: mode === "everyone" ? "Users who can see L&D now keep it as individual grants, so nobody loses access by surprise. Remove the ones you don't want afterwards." : "Only users with an individual grant will see Learning & Development.", confirm: "Use Specific Users", danger: false },
    }[next];
    const ok = await confirmWithGlass({ title: texts.title, message: texts.message, confirmText: texts.confirm, danger: texts.danger });
    if (!ok) return;
    setBusy("mode");
    try {
      const res = await axios.put(`${API}/mode`, { mode: next, keepCurrent: true });
      flash("success", res.data?.message || "Access mode updated");
      await load();
      refreshAccess();
    } catch (error) {
      flash("error", error?.response?.data?.message || "Unable to change access mode");
    } finally {
      setBusy("");
    }
  };

  const pageIds = rows.filter((u) => !u.isOwner).map((u) => u.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) pageIds.forEach((id) => next.delete(id)); else pageIds.forEach((id) => next.add(id));
    return next;
  });
  const toggleOne = (id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const selectFiltered = () => setSelected(new Set(filtered.filter((u) => !u.isOwner).map((u) => u.id)));

  return (
    <div className="lac">
      <section className="lac-hero lac-glass">
        <span className="lac-hero__tile" aria-hidden="true"><LndArt kind="shield" /></span>
        <div className="lac-hero__copy">
          <span className="lac-eyebrow">Learning &amp; Development</span>
          <h1>Access Control</h1>
          <p>Manage who can view Learning &amp; Development in the sidebar. Administrators have no automatic access — only you decide.</p>
        </div>
        <div className="lac-hero__art"><LndArt kind="shield" /></div>
        <div className="lac-hero__note lac-glass">
          <span aria-hidden="true">🔐</span>
          <p>Owner-only page. Changes apply to the sidebar <b>and</b> the server immediately. You always keep full access.</p>
        </div>
      </section>

      <div className="lac-stats">
        <div className="lac-stat lac-glass lac-stat--violet"><span className="lac-stat__icon">👥</span><div><strong>{users.length}</strong><small>Total Users</small></div><Spark tone="violet" /></div>
        <div className="lac-stat lac-glass lac-stat--mint"><span className="lac-stat__icon">✓</span><div><strong>{withAccess}</strong><small>Users with Access</small></div><Spark tone="mint" /></div>
        <div className="lac-stat lac-glass lac-stat--rose"><span className="lac-stat__icon">⦸</span><div><strong>{users.length - withAccess}</strong><small>Users without Access</small></div><Spark tone="rose" /></div>
      </div>

      <section className="lac-modes lac-glass">
        <div className="lac-modes__intro">
          <h2>Bulk Access Control</h2>
          <p>Choose how Learning &amp; Development access is managed for all users.</p>
        </div>
        {MODES.map((m) => (
          <button key={m.value} type="button" className={`lac-mode lac-mode--${m.value} ${mode === m.value ? "is-on" : ""}`} onClick={() => switchMode(m.value)} disabled={busy === "mode"} aria-pressed={mode === m.value}>
            <span className="lac-mode__icon" aria-hidden="true">{m.icon}</span>
            <span className="lac-mode__text"><b>{m.title}</b><small>{m.text}</small></span>
            {mode === m.value && <span className="lac-mode__check" aria-hidden="true">✓</span>}
          </button>
        ))}
      </section>

      {mode === "everyone" && <div className="lac-banner lac-banner--info">Everyone mode: all {nonOwners.length} users can see L&amp;D as Learners. Use “Cannot see” to hide it from single users, or raise someone to Manager / Full.</div>}
      {locked && <div className="lac-banner lac-banner--warn">No one mode: Learning &amp; Development is hidden for everybody except you. Individual settings are kept but cannot be changed until you choose Everyone or Specific users.</div>}

      <div className="lac-filters">
        <label className="lac-search lac-glass"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, designation, store…" aria-label="Search users" /></label>
        <select className="lac-glass" value={accessFilter} onChange={(e) => { setAccessFilter(e.target.value); setPage(1); }} aria-label="Filter access">
          <option value="all">All Access Status</option><option value="can">Can see</option><option value="cannot">Cannot see</option>
          <option value="View">Learners</option><option value="Add">Creators</option><option value="Edit">Managers</option><option value="Full">Full control</option>
        </select>
        <select className="lac-glass" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} aria-label="Filter role">
          <option value="all">All Roles</option><option value="admin">Administrators</option><option value="user">Users</option><option value="owner">Owner</option>
        </select>
        <select className="lac-glass" value={placeFilter} onChange={(e) => { setPlaceFilter(e.target.value); setPage(1); }} aria-label="Filter department or store">
          <option value="">All Departments / Stores</option>{places.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <section className="lac-card lac-glass">
        {loading ? <p className="lac-empty"><span className="lac-spinner" />Loading users…</p>
          : loadError ? <p className="lac-empty lac-empty--err">{loadError} <button className="lac-btn lac-btn--ghost" onClick={load}>Retry</button></p>
          : filtered.length === 0 ? <p className="lac-empty">No users found.</p> : (
          <div className="lac-scroll">
            <table className="lac-table">
              <thead>
                <tr>
                  <th className="lac-col-check"><input type="checkbox" checked={allOnPage} onChange={toggleAll} disabled={locked} aria-label="Select all on this page" /></th>
                  <th>User</th><th>Designation</th><th>Role</th><th>Department / Store</th><th>L&amp;D Sidebar Access</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const can = user.level !== "None";
                  return (
                    <tr key={user.id} className={selected.has(user.id) ? "is-selected" : ""}>
                      <td className="lac-col-check">{!user.isOwner && <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleOne(user.id)} disabled={locked} aria-label={`Select ${user.name}`} />}</td>
                      <td>
                        <div className="lac-user"><Avatar user={user} /><div><div className="lac-user__name">{user.name}</div><div className="lac-user__sub">{user.email}{user.employeeId ? ` · ${user.employeeId}` : ""}</div></div></div>
                      </td>
                      <td>{user.designation || "—"}</td>
                      <td>{user.isOwner ? <span className="lac-badge lac-badge--owner">Owner</span> : user.administrator ? <span className="lac-badge lac-badge--admin">Admin</span> : <span className="lac-badge">User</span>}</td>
                      <td className="lac-place">{Number(user.storeCount) > 2 ? (
                        <span className="lac-stores-pill" title={user.stores}>
                          {totalStores > 0 && Number(user.storeCount) >= totalStores ? `All Stores (${user.storeCount})` : `${user.storeCount} Stores`}
                        </span>
                      ) : ([user.department, user.stores].filter(Boolean).join(" · ") || "—")}</td>
                      <td>
                        {user.isOwner ? <span className="lac-fixed">● Full control (always)</span> : (
                          <div className={`lac-level ${can ? "is-can" : "is-cannot"}`} title={LEVEL_HELP[user.level] || "Hidden in the sidebar and blocked on the server"}>
                            <i aria-hidden="true" />
                            <select value={user.level} disabled={locked || savingIds.has(user.id)} onChange={(e) => changeLevel(user, e.target.value)} aria-label={`L&D access for ${user.name}`}>
                              {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="lac-foot">
          <div className="lac-bulk">
            <span className="lac-bulk__count">👥 {selected.size} selected</span>
            {selected.size < filtered.filter((u) => !u.isOwner).length && filtered.length > 0 && !locked && <button className="lac-link" onClick={selectFiltered}>Select all {filtered.filter((u) => !u.isOwner).length} filtered</button>}
            <select value={bulkLevel} onChange={(e) => setBulkLevel(e.target.value)} disabled={locked} aria-label="Level to grant">
              {LEVEL_OPTIONS.filter((o) => o.value !== "None").map((o) => <option key={o.value} value={o.value}>{o.label.replace("Can see · ", "")}</option>)}
            </select>
            <button className="lac-btn lac-btn--mint" disabled={locked || !selected.size || busy === "bulk"} onClick={() => bulk(bulkLevel)}>Grant Access</button>
            <button className="lac-btn lac-btn--rose" disabled={locked || !selected.size || busy === "bulk"} onClick={() => bulk("None")}>Remove Access</button>
            <button className="lac-btn lac-btn--ghost" disabled={!selected.size} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
          <div className="lac-pages">
            <span>Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}</span>
            <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">‹</button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).filter((n) => Math.abs(n - safePage) <= 2).map((n) => <button key={n} className={n === safePage ? "on" : ""} onClick={() => setPage(n)}>{n}</button>)}
            <button disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} aria-label="Next page">›</button>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}</select>
          </div>
        </footer>
      </section>

      <section className="lac-card lac-glass lac-audit">
        <h2>Recent changes</h2>
        {audit.length === 0 ? <p className="lac-empty">No changes yet.</p> : (
          <ul>
            {audit.map((row) => (
              <li key={row.id}>
                <strong>{row.target_name || "User"}</strong>
                <span className="lac-audit__change">{row.old_level} → {row.new_level}</span>
                <small>by {row.changed_by_name || "owner"} · {new Date(row.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && <div className={`lac-toast lac-toast--${toast.type}`} role="status">{toast.text}</div>}
    </div>
  );
}
