import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import {
  FaLock,
  FaUsers,
  FaStore,
  FaUserTie,
  FaSearch,
  FaSyncAlt,
  FaSun,
  FaMoon,
  FaMapMarkedAlt,
  FaPaintRoller,
  FaSitemap,
  FaInfoCircle,
  FaSave,
} from "react-icons/fa";
import "../styles/ChecklistAccessControl.css";

const API = API_BASE_URL;

const CHECKLISTS = [
  { key: "opening", label: "Opening Checklist", short: "Opening", icon: <FaSun />, tone: "amber" },
  { key: "closing", label: "Closing Checklist", short: "Closing", icon: <FaMoon />, tone: "violet" },
  { key: "rm", label: "RM Visit Checklist", short: "RM Visit", icon: <FaMapMarkedAlt />, tone: "rose" },
  { key: "vm", label: "VM Visit Checklist", short: "VM Visit", icon: <FaPaintRoller />, tone: "green" },
  { key: "asm", label: "ASM Visit Checklist", short: "ASM Visit", icon: <FaSitemap />, tone: "blue" },
];

const ROLE_FILTERS = [
  { value: "", label: "All Roles" },
  { value: "store", label: "Store Users" },
  { value: "rm", label: "RM" },
  { value: "vm", label: "VM" },
  { value: "asm", label: "ASM" },
];

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

const Toggle = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className={`cac-switch ${checked ? "on" : ""}`}
    onClick={() => onChange(!checked)}
  >
    <span />
  </button>
);

const ChecklistAccessControl = () => {
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, store: 0, rm: 0, vm: 0, asm: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // {type, text}
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [quickId, setQuickId] = useState("");
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState({});

  const flash = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API}/api/checklist-access/users`, {
        params: { search: search.trim(), role },
      });
      setUsers(response.data?.data || []);
      setCounts(response.data?.counts || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Admins are always unrestricted, so they are not listed for editing.
  const editable = useMemo(() => users.filter((u) => !u.locked), [users]);

  const quickUser = useMemo(
    () => editable.find((u) => String(u.id) === String(quickId)) || null,
    [editable, quickId]
  );

  useEffect(() => {
    setDraft(quickUser ? { ...quickUser.access } : {});
  }, [quickUser]);

  const patchAccess = async (id, access) => {
    await axios.put(`${API}/api/checklist-access/users/${id}`, { access });
  };

  // One-click toggle directly in the table
  const toggleRow = async (user, key, value) => {
    const previous = users;
    setUsers((list) =>
      list.map((u) => (u.id === user.id ? { ...u, access: { ...u.access, [key]: value } } : u))
    );
    try {
      await patchAccess(user.id, { [key]: value });
      flash("ok", `${user.name}: ${CHECKLISTS.find((c) => c.key === key).short} ${value ? "enabled" : "disabled"}`);
      load();
    } catch (err) {
      setUsers(previous);
      flash("err", err?.response?.data?.message || "Could not save access");
    }
  };

  const saveQuick = async () => {
    if (!quickUser) return;
    setSaving(true);
    try {
      await patchAccess(quickUser.id, draft);
      flash("ok", `Access saved for ${quickUser.name}`);
      await load();
    } catch (err) {
      flash("err", err?.response?.data?.message || "Could not save access");
    } finally {
      setSaving(false);
    }
  };

  const resetUsers = async (ids) => {
    if (!ids.length) return;
    try {
      await axios.post(`${API}/api/checklist-access/reset`, { user_ids: ids });
      flash("ok", "Access reset to role defaults");
      await load();
    } catch (err) {
      flash("err", err?.response?.data?.message || "Could not reset access");
    }
  };

  const applyBulk = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      await axios.post(`${API}/api/checklist-access/bulk`, {
        user_ids: [...selected],
        access: bulkDraft,
      });
      flash("ok", `Access updated for ${selected.size} user(s)`);
      setBulkOpen(false);
      setBulkDraft({});
      setSelected(new Set());
      await load();
    } catch (err) {
      flash("err", err?.response?.data?.message || "Could not update access");
    } finally {
      setSaving(false);
    }
  };

  const allSelected = editable.length > 0 && editable.every((u) => selected.has(u.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(editable.map((u) => u.id)));
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const stats = [
    { label: "Total Users", value: counts.total, sub: "Active employees", icon: <FaUsers />, tone: "violet" },
    { label: "Store Users", value: counts.store, sub: "Opening + Closing", icon: <FaStore />, tone: "green" },
    { label: "RM Users", value: counts.rm, sub: "Regional managers", icon: <FaUserTie />, tone: "rose" },
    { label: "VM Users", value: counts.vm, sub: "Visiting managers", icon: <FaUserTie />, tone: "violet" },
    { label: "ASM Users", value: counts.asm, sub: "Area sales managers", icon: <FaUserTie />, tone: "blue" },
  ];

  return (
    <div className="cac-page">
      <section className="cac-hero">
        <div className="cac-hero-icon"><FaLock /></div>
        <div className="cac-hero-text">
          <small>CHECKLIST MANAGEMENT</small>
          <h1>
            Checklist Access Control <span className="cac-pill">Admin Only</span>
          </h1>
          <p>
            Grant or restrict checklist types for each user. Users will only see the checklists
            enabled for them in Checklist Submit.
          </p>
        </div>
        <ul className="cac-hero-legend">
          {CHECKLISTS.map((c) => (
            <li key={c.key} className={`tone-${c.tone}`}>
              <i>{c.icon}</i>
              {c.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="cac-stats">
        {stats.map((s) => (
          <div key={s.label} className="cac-stat">
            <i className={`tone-${s.tone}`}>{s.icon}</i>
            <div>
              <small>{s.label}</small>
              <strong>{s.value ?? 0}</strong>
              <span>{s.sub}</span>
            </div>
          </div>
        ))}
      </section>

      {notice && <div className={`cac-notice ${notice.type}`}>{notice.text}</div>}

      <div className="cac-layout">
        <section className="cac-card cac-table-card">
          <header className="cac-card-head">
            <div>
              <h2>User Checklist Access</h2>
              <p>Manage which checklist types are visible for each user.</p>
            </div>
            <div className="cac-tools">
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
                {ROLE_FILTERS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <label className="cac-search">
                <FaSearch />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, employee ID, store..."
                />
              </label>
              <button className="cac-btn primary" disabled={!selected.size} onClick={() => setBulkOpen(true)}>
                <FaSyncAlt /> Bulk Update{selected.size ? ` (${selected.size})` : ""}
              </button>
            </div>
          </header>

          {error && <div className="cac-notice err">{error}</div>}

          <div className="cac-table-wrap">
            <table className="cac-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
                  <th>#</th>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Store</th>
                  {CHECKLISTS.map((c) => (
                    <th key={c.key} className="cac-col-check">
                      <i className={`tone-${c.tone}`}>{c.icon}</i>
                      {c.short}
                      <br />Checklist
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !users.length && (
                  <tr><td colSpan={11} className="cac-empty">Loading users…</td></tr>
                )}
                {!loading && !users.length && (
                  <tr><td colSpan={11} className="cac-empty">No users found.</td></tr>
                )}
                {users.map((u, index) => (
                  <tr key={u.id} className={selected.has(u.id) ? "is-selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={u.locked}
                        checked={selected.has(u.id)}
                        onChange={() => toggleOne(u.id)}
                        aria-label={`Select ${u.name}`}
                      />
                    </td>
                    <td>{index + 1}</td>
                    <td>
                      <div className="cac-user">
                        <span className="cac-avatar">{initials(u.name)}</span>
                        <div>
                          {u.name}
                          {u.customized && <em title="Differs from role defaults">custom</em>}
                        </div>
                      </div>
                    </td>
                    <td>{u.employee_id || "—"}</td>
                    <td><span className={`cac-role role-${u.role}`}>{u.role_label}</span></td>
                    <td className="cac-store" title={u.stores}>{u.stores || "—"}</td>
                    {CHECKLISTS.map((c) => (
                      <td key={c.key} className="cac-col-check">
                        <Toggle
                          checked={!!u.access[c.key]}
                          disabled={u.locked}
                          label={`${u.name} ${c.label}`}
                          onChange={(value) => toggleRow(u, c.key, value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="cac-card cac-quick">
          <header className="cac-card-head">
            <div>
              <h2>Quick Assign to User</h2>
              <p>Select a user and configure their checklist access.</p>
            </div>
          </header>

          <label className="cac-label">Select User <b>*</b></label>
          <select value={quickId} onChange={(e) => setQuickId(e.target.value)} className="cac-select">
            <option value="">Choose a user…</option>
            {editable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.employee_id ? ` (${u.employee_id})` : ""} — {u.role_label}
              </option>
            ))}
          </select>

          <h3 className="cac-label">Checklist Access</h3>
          <ul className="cac-quick-list">
            {CHECKLISTS.map((c) => (
              <li key={c.key}>
                <span><i className={`tone-${c.tone}`}>{c.icon}</i>{c.label}</span>
                <Toggle
                  checked={!!draft[c.key]}
                  disabled={!quickUser}
                  label={c.label}
                  onChange={(value) => setDraft((d) => ({ ...d, [c.key]: value }))}
                />
              </li>
            ))}
          </ul>

          <p className="cac-hint">
            <FaInfoCircle /> This user will only see the enabled checklist types in the Checklist
            Submission module. Role defaults: Store User → Opening/Closing, RM → RM Visit, VM → VM
            Visit, ASM → ASM Visit.
          </p>

          <div className="cac-actions">
            <button className="cac-btn" disabled={!quickUser} onClick={() => quickUser && resetUsers([quickUser.id])}>
              <FaSyncAlt /> Reset
            </button>
            <button className="cac-btn primary" disabled={!quickUser || saving} onClick={saveQuick}>
              <FaSave /> {saving ? "Saving…" : "Save Access"}
            </button>
          </div>
        </aside>
      </div>

      {bulkOpen && (
        <div className="cac-modal-backdrop" onClick={() => setBulkOpen(false)}>
          <div className="cac-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>Bulk Update — {selected.size} user(s)</h2>
            <p>Choose Enable or Disable for the checklists you want to change. “No change” leaves them as they are.</p>
            <ul className="cac-bulk-list">
              {CHECKLISTS.map((c) => (
                <li key={c.key}>
                  <span><i className={`tone-${c.tone}`}>{c.icon}</i>{c.label}</span>
                  <select
                    value={bulkDraft[c.key] === undefined ? "" : String(bulkDraft[c.key])}
                    onChange={(e) =>
                      setBulkDraft((d) => {
                        const next = { ...d };
                        if (e.target.value === "") delete next[c.key];
                        else next[c.key] = e.target.value === "true";
                        return next;
                      })
                    }
                  >
                    <option value="">No change</option>
                    <option value="true">Enable</option>
                    <option value="false">Disable</option>
                  </select>
                </li>
              ))}
            </ul>
            <div className="cac-actions">
              <button className="cac-btn" onClick={() => resetUsers([...selected]).then(() => { setBulkOpen(false); setSelected(new Set()); })}>
                Reset to defaults
              </button>
              <button className="cac-btn" onClick={() => setBulkOpen(false)}>Cancel</button>
              <button className="cac-btn primary" disabled={saving || !Object.keys(bulkDraft).length} onClick={applyBulk}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistAccessControl;
