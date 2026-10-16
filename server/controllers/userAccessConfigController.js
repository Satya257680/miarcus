const db = require('../config/db');

const isAdmin = (user) => [1, '1', true].includes(user?.is_admin) || [1, '1', true].includes(user?.is_super_admin);
const denyUnlessAdmin = (req, res) => {
  if (!isAdmin(req.user)) { res.status(403).json({ success: false, message: 'Administrator access required' }); return true; }
  return false;
};
const parseJson = (value, fallback = null) => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

async function ensureTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS user_access_overrides (
    user_id BIGINT NOT NULL PRIMARY KEY,
    department_ids JSON NULL,
    all_departments TINYINT(1) NULL,
    store_ids JSON NULL,
    all_stores TINYINT(1) NULL,
    checklist_type_ids JSON NULL,
    all_checklist_types TINYINT(1) NULL,
    module_names JSON NULL,
    updated_by BIGINT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_access_updated_at (updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

exports.list = async (req, res) => {
  if (denyUnlessAdmin(req, res)) return;
  try {
    await ensureTable();
    const rows = await db.query(`SELECT u.id, u.employee_id, u.name, u.email,
      d.department_name AS department, dg.designation_name AS designation,
      a.department_ids, a.all_departments, a.store_ids, a.all_stores,
      a.checklist_type_ids, a.all_checklist_types, a.module_names, a.updated_at
      FROM users u LEFT JOIN departments d ON d.id=u.department_id
      LEFT JOIN designations dg ON dg.id=u.designation_id
      LEFT JOIN user_access_overrides a ON a.user_id=u.id
      WHERE COALESCE(u.status, 'Active') <> 'Deleted' ORDER BY u.name`);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, users: (rows || []).map(r => ({ ...r,
      department_ids: parseJson(r.department_ids), store_ids: parseJson(r.store_ids),
      checklist_type_ids: parseJson(r.checklist_type_ids), module_names: parseJson(r.module_names),
      all_departments: r.all_departments == null ? null : Boolean(r.all_departments),
      all_stores: r.all_stores == null ? null : Boolean(r.all_stores),
      all_checklist_types: r.all_checklist_types == null ? null : Boolean(r.all_checklist_types),
      has_custom_access: r.all_departments != null || r.department_ids != null || r.all_stores != null || r.store_ids != null || r.all_checklist_types != null || r.checklist_type_ids != null || r.module_names != null
    })) });
  } catch (e) { console.error('User access config list failed:', e); res.status(500).json({ success: false, message: 'Unable to load user access settings' }); }
};

exports.getOne = async (req, res) => {
  if (denyUnlessAdmin(req, res)) return;
  try {
    await ensureTable();
    const rows = await db.query('SELECT * FROM user_access_overrides WHERE user_id = ?', [req.params.id]);
    const r = rows?.[0];
    if (!r) return res.json({ success: true, access: { user_id: Number(req.params.id), department_ids: null, all_departments: null, store_ids: null, all_stores: null, checklist_type_ids: null, all_checklist_types: null, module_names: null } });
    res.json({ success: true, access: { ...r, department_ids: parseJson(r.department_ids), store_ids: parseJson(r.store_ids), checklist_type_ids: parseJson(r.checklist_type_ids), module_names: parseJson(r.module_names), all_departments: r.all_departments == null ? null : Boolean(r.all_departments), all_stores: r.all_stores == null ? null : Boolean(r.all_stores), all_checklist_types: r.all_checklist_types == null ? null : Boolean(r.all_checklist_types) } });
  } catch (e) { console.error('Get user access failed:', e); res.status(500).json({ success: false, message: 'Unable to load user access' }); }
};

exports.save = async (req, res) => {
  if (denyUnlessAdmin(req, res)) return;
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ success: false, message: 'Invalid user ID' });
  const body = req.body || {};
  const allowedArray = (v) => v === null || v === undefined ? null : (Array.isArray(v) ? [...new Set(v.map(Number).filter(n => Number.isInteger(n) && n > 0))] : null);
  const boolOrNull = (v) => v === null || v === undefined || v === '' ? null : Boolean(v);
  const jsonOrNull = (v) => v === null || v === undefined ? null : JSON.stringify(v);
  try {
    await ensureTable();
    const found = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!found?.length) return res.status(404).json({ success: false, message: 'User not found' });
    // Omitted fields retain the current value. Explicit null clears an override and returns to default access.
    const existingRows = await db.query('SELECT * FROM user_access_overrides WHERE user_id = ?', [userId]);
    const old = existingRows?.[0] || {};
    const pick = (key, transform = v => v) => Object.prototype.hasOwnProperty.call(body, key)
      ? transform(body[key])
      : (old[key] == null ? null : (['department_ids','store_ids','checklist_type_ids','module_names'].includes(key) ? parseJson(old[key]) : old[key]));
    const values = [
      jsonOrNull(pick('department_ids', allowedArray)), boolOrNull(pick('all_departments', boolOrNull)),
      jsonOrNull(pick('store_ids', allowedArray)), boolOrNull(pick('all_stores', boolOrNull)),
      jsonOrNull(pick('checklist_type_ids', allowedArray)), boolOrNull(pick('all_checklist_types', boolOrNull)),
      jsonOrNull(pick('module_names', v => v === null ? null : Array.isArray(v) ? [...new Set(v.map(String).filter(Boolean))] : null)),
      req.user?.id || null
    ];
    const allEmpty = values.slice(0, 7).every(v => v === null);
    if (allEmpty) {
      await db.query('DELETE FROM user_access_overrides WHERE user_id = ?', [userId]);
    } else {
      await db.query(`INSERT INTO user_access_overrides
        (user_id, department_ids, all_departments, store_ids, all_stores, checklist_type_ids, all_checklist_types, module_names, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE department_ids=VALUES(department_ids), all_departments=VALUES(all_departments),
        store_ids=VALUES(store_ids), all_stores=VALUES(all_stores), checklist_type_ids=VALUES(checklist_type_ids),
        all_checklist_types=VALUES(all_checklist_types), module_names=VALUES(module_names), updated_by=VALUES(updated_by)`, [userId, ...values]);
    }
    res.json({ success: true, message: 'User access settings saved. Unmodified settings were preserved.' });
  } catch (e) { console.error('Save user access failed:', e); res.status(500).json({ success: false, message: 'Unable to save user access settings' }); }
};

exports.clear = async (req, res) => {
  if (denyUnlessAdmin(req, res)) return;
  try { await ensureTable(); await db.query('DELETE FROM user_access_overrides WHERE user_id = ?', [req.params.id]); res.json({ success: true, message: 'Custom access removed; default access rules now apply.' }); }
  catch (e) { console.error('Clear user access failed:', e); res.status(500).json({ success: false, message: 'Unable to reset user access' }); }
};
