import { useCallback, useEffect, useMemo, useState } from 'react';
import axios, { API_BASE_URL } from '../axiosConfig.js';
import '../styles/UserAccessManagement.css';
import confirmWithGlass from "../components/common/ConfirmDialog/confirmWithGlass.jsx";

const API = `${API_BASE_URL}/api`;
const modules = ['Dashboard', 'Action Points', 'Checklist Reports', 'Checklist Submission', 'Checklist Types', 'Questions', 'Departments', 'Designations', 'Store Management', 'Users', 'NSO Rules', 'New Store Openings', 'Attendance', 'Daily Collection', 'Billing', 'Collection Tracking', 'Announcements', 'Gallery', 'Asset Master', 'Visit Planner', 'Travel Plan', 'Expenses', 'Petty Cash', 'Inventory Planning'];
const listFrom = (data, keys) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
const getId = x => Number(x.id ?? x.store_id ?? x.department_id ?? x.checklist_type_id);
const getLabel = (x, kind) => x.name || x.store_name || x.department_name || x.checklist_type_name || x.type_name || x.title || `${kind} ${getId(x)}`;
const initial = { department_ids: null, all_departments: null, store_ids: null, all_stores: null, checklist_type_ids: null, all_checklist_types: null, module_names: null };

export default function UserAccessManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stores, setStores] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const load = useCallback(async () => {
    setLoading(true); setNotice('');
    try {
      const [u, d, s, c] = await Promise.allSettled([
        axios.get(`${API}/users/access-config`, config),
        axios.get(`${API}/departments`, config),
        axios.get(`${API}/stores`, config),
        axios.get(`${API}/checklist-types`, config),
      ]);
      if (u.status !== 'fulfilled') throw u.reason;
      setUsers(listFrom(u.value.data, ['users']));
      if (d.status === 'fulfilled') setDepartments(listFrom(d.value.data, ['departments']));
      if (s.status === 'fulfilled') setStores(listFrom(s.value.data, ['stores']));
      if (c.status === 'fulfilled') setChecklists(listFrom(c.value.data, ['checklistTypes', 'checklist_types', 'types']));
      const failed = [d, s, c].some(x => x.status === 'rejected');
      if (failed) setNotice('Some reference lists could not be loaded with this account. Access settings can still be viewed; check administrator permissions for missing lists.');
    } catch (e) { setNotice(e?.response?.data?.message || 'Unable to load user access. Sign in with an administrator account.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => users.filter(u => {
    const text = `${u.name || ''} ${u.employee_id || ''} ${u.email || ''} ${u.department || ''} ${u.designation || ''}`.toLowerCase();
    const matches = text.includes(query.toLowerCase());
    return matches && (filter === 'all' || (filter === 'custom' ? u.has_custom_access : !u.has_custom_access));
  }), [users, query, filter]);

  const edit = async user => {
    setSelected(user); setDirty({}); setNotice('');
    try {
      const { data } = await axios.get(`${API}/users/${user.id}/access-config`, config);
      setDraft({ ...initial, ...(data.access || {}) });
    } catch (e) { setDraft({ ...initial }); setNotice(e?.response?.data?.message || 'Could not load this user’s settings.'); }
  };
  const setField = (key, value) => { setDraft(old => ({ ...old, [key]: value })); setDirty(old => ({ ...old, [key]: true })); };
  const toggleArray = (key, id) => {
    const current = Array.isArray(draft[key]) ? draft[key].map(Number) : [];
    setField(key, current.includes(Number(id)) ? current.filter(x => x !== Number(id)) : [...current, Number(id)]);
  };
  const save = async () => {
    if (!selected) return;
    setSaving(true); setNotice('');
    try {
      if (!Object.keys(dirty).length) { setSelected(null); return; }
      const changed = Object.fromEntries(Object.keys(dirty).map(key => [key, draft[key]]));
      await axios.put(`${API}/users/${selected.id}/access-config`, changed, config);
      setSelected(null); await load(); setNotice('Changes saved. Only the fields you edited are customized; other access settings remain unchanged.');
    } catch (e) { setNotice(e?.response?.data?.message || 'Could not save access settings.'); }
    finally { setSaving(false); }
  };
  const reset = async () => {
    if (!selected || !(await confirmWithGlass({ title: "Reset Access Overrides", message: `Remove all custom access overrides for ${selected.name}? Existing role-based rules will apply.`, confirmText: "Reset", danger: false }))) return;
    setSaving(true);
    try { await axios.delete(`${API}/users/${selected.id}/access-config`, config); setSelected(null); await load(); setNotice('Custom overrides removed. Existing/default rules apply.'); }
    catch (e) { setNotice(e?.response?.data?.message || 'Could not reset access.'); }
    finally { setSaving(false); }
  };
  const options = (items, kind) => items.map(item => ({ id: getId(item), label: getLabel(item, kind) })).filter(x => Number.isFinite(x.id) && x.id > 0);
  const renderChecks = (key, items, kind) => <div className="uam-checks">{options(items, kind).map(item => <label key={item.id} className="uam-check"><input type="checkbox" checked={(draft[key] || []).map(Number).includes(item.id)} onChange={() => toggleArray(key, item.id)} />{item.label}</label>)}{!items.length && <span className="uam-muted">No options available for this list.</span>}</div>;

  return <main className="uam-page">
    <header className="uam-hero"><div><span className="uam-eyebrow">MIARCUS ADMIN CONSOLE</span><h1>User Access Management</h1><p>Configure optional access overrides for individual users. Leave any setting untouched to keep existing rules.</p></div><button className="uam-primary" onClick={load}>↻ Refresh</button></header>
    <section className="uam-stats"><article><span className="uam-stat-icon purple">♙</span><div><strong>{users.length}</strong><span>Total users</span></div></article><article><span className="uam-stat-icon green">✓</span><div><strong>{users.filter(u => u.has_custom_access).length}</strong><span>Custom access</span></div></article><article><span className="uam-stat-icon blue">⌂</span><div><strong>{users.filter(u => !u.has_custom_access).length}</strong><span>Using default rules</span></div></article></section>
    {notice && <div className="uam-notice" role="status">{notice}</div>}
    <section className="uam-panel"><div className="uam-toolbar"><div className="uam-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by employee, ID, department or designation…" /></div><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter users"><option value="all">All users</option><option value="custom">Custom access</option><option value="default">Default access</option></select></div>
      <div className="uam-table-wrap"><table className="uam-table"><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Store scope</th><th>Checklist scope</th><th>Access mode</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan="7" className="uam-empty">Loading users…</td></tr> : filtered.map(user => <tr key={user.id}><td><div className="uam-employee"><span className="uam-avatar">{(user.name || '?').trim().charAt(0).toUpperCase()}</span><span><b>{user.name}</b><small>{user.employee_id || user.email || `User #${user.id}`}</small></span></div></td><td>{user.department || '—'}</td><td>{user.designation || '—'}</td><td><span className={`uam-pill ${user.all_stores === true ? 'green' : ''}`}>{user.all_stores === true ? 'All stores' : Array.isArray(user.store_ids) ? `${user.store_ids.length} selected` : 'Default'}</span></td><td><span className="uam-pill">{user.all_checklist_types === true ? 'All types' : Array.isArray(user.checklist_type_ids) ? `${user.checklist_type_ids.length} selected` : 'Default'}</span></td><td><span className={`uam-pill ${user.has_custom_access ? 'purple' : ''}`}>{user.has_custom_access ? 'Custom' : 'Role based'}</span></td><td><button className="uam-edit" onClick={() => edit(user)}>Edit access ↗</button></td></tr>)}
      {!loading && filtered.length === 0 && <tr><td colSpan="7" className="uam-empty">No matching users found.</td></tr>}</tbody></table></div>
      <footer className="uam-table-foot">Showing {filtered.length} of {users.length} users <span>Individual overrides · Existing permissions preserved unless changed</span></footer>
    </section>
    {selected && <div className="uam-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><aside className="uam-drawer" role="dialog" aria-modal="true" aria-label={`Edit access for ${selected.name}`}><div className="uam-drawer-head"><div><span className="uam-eyebrow">INDIVIDUAL OVERRIDES</span><h2>Edit User Access</h2><p>{selected.name} · {selected.employee_id || selected.email || `User #${selected.id}`}</p></div><button className="uam-close" onClick={() => setSelected(null)} aria-label="Close">×</button></div>
      <div className="uam-drawer-body"><div className="uam-info">Only modify what you need. Use <b>Use default</b> to leave an area controlled by existing rules.</div>
        <section className="uam-access-section"><h3>Department access <em>Optional</em></h3><select value={draft.all_departments === true ? 'all' : draft.department_ids ? 'specific' : 'default'} onChange={e => { const v=e.target.value; setField('all_departments',v==='default'?null:v==='all'); setField('department_ids',v==='specific'?(draft.department_ids || []):null); }}><option value="default">Use default access</option><option value="all">All departments</option><option value="specific">Specific departments</option></select>{draft.all_departments === false && renderChecks('department_ids', departments, 'Department')}</section>
        <section className="uam-access-section"><h3>Store access <em>Optional</em></h3><select value={draft.all_stores === true ? 'all' : draft.store_ids ? 'specific' : 'default'} onChange={e => { const v=e.target.value; setField('all_stores',v==='default'?null:v==='all'); setField('store_ids',v==='specific'?(draft.store_ids || []):null); }}><option value="default">Use default access</option><option value="all">All stores</option><option value="specific">Specific stores</option></select>{draft.all_stores === false && renderChecks('store_ids', stores, 'Store')}</section>
        <section className="uam-access-section"><h3>Checklist type access <em>Optional</em></h3><select value={draft.all_checklist_types === true ? 'all' : draft.checklist_type_ids ? 'specific' : 'default'} onChange={e => { const v=e.target.value; setField('all_checklist_types',v==='default'?null:v==='all'); setField('checklist_type_ids',v==='specific'?(draft.checklist_type_ids || []):null); }}><option value="default">Use default access</option><option value="all">All checklist types</option><option value="specific">Specific checklist types</option></select>{draft.all_checklist_types === false && renderChecks('checklist_type_ids', checklists, 'Checklist type')}</section>
        <section className="uam-access-section"><h3>Module access <em>Optional</em></h3><p className="uam-muted">This optional list records module scope overrides; it does not replace the existing RBAC permission levels.</p><div className="uam-module-grid">{modules.map(m => <label key={m} className="uam-check"><input type="checkbox" checked={(draft.module_names || []).includes(m)} onChange={() => { const list=draft.module_names || []; setField('module_names',list.includes(m)?list.filter(x=>x!==m):[...list,m]); }} />{m}</label>)}</div><button className="uam-link" onClick={() => setField('module_names', null)}>Use default module access</button></section>
      </div><div className="uam-drawer-foot"><button className="uam-danger-ghost" onClick={reset} disabled={saving}>Reset all overrides</button><div><button className="uam-secondary" onClick={() => setSelected(null)}>Cancel</button><button className="uam-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></div></aside></div>}
  </main>;
}
