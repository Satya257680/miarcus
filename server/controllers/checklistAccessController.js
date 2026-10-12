const service = require("../services/checklistAccessService");

const fail = (res, error, message) => {
    console.error(message, error?.message || error);
    return res.status(500).json({ success: false, message });
};

// GET /api/checklist-access/meta
exports.getMeta = (req, res) =>
    res.json({
        success: true,
        categories: service.CATEGORIES,
        defaults: service.ROLE_DEFAULTS,
        roles: service.ROLE_LABELS
    });

// GET /api/checklist-access/me  (any logged-in user)
exports.getMine = async (req, res) => {
    try {
        const access = await service.getUserAccess(req.user.id);
        res.json({ success: true, role: access.role, unrestricted: access.unrestricted, keys: [...access.keys] });
    } catch (error) {
        fail(res, error, "Failed to load checklist access");
    }
};

// GET /api/checklist-access/users?search=&role=
exports.listUsers = async (req, res) => {
    try {
        const result = await service.listUsers({ search: req.query.search, role: req.query.role });
        res.json({ success: true, ...result });
    } catch (error) {
        fail(res, error, "Failed to load users");
    }
};

const cleanAccess = (input) => {
    const out = {};
    service.CATEGORY_KEYS.forEach((key) => {
        if (typeof input?.[key] === "boolean") out[key] = input[key];
    });
    return out;
};

// PUT /api/checklist-access/users/:id
exports.saveUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid user" });
        }
        const result = await service.saveAccess([id], cleanAccess(req.body?.access), req.user.id);
        if (!result.updated) {
            return res.status(404).json({ success: false, message: "User not found or is an administrator" });
        }
        res.json({ success: true, message: "Checklist access saved" });
    } catch (error) {
        fail(res, error, "Failed to save checklist access");
    }
};

// POST /api/checklist-access/bulk   { user_ids: [], access: { opening: true, ... } }
exports.bulkSave = async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.user_ids) ? req.body.user_ids : [];
        const access = cleanAccess(req.body?.access);
        if (!ids.length) return res.status(400).json({ success: false, message: "Select at least one user" });
        if (!Object.keys(access).length) {
            return res.status(400).json({ success: false, message: "Choose at least one checklist to update" });
        }
        const result = await service.saveAccess(ids, access, req.user.id);
        res.json({ success: true, updated: result.updated, message: `Access updated for ${result.updated} user(s)` });
    } catch (error) {
        fail(res, error, "Failed to update checklist access");
    }
};

// POST /api/checklist-access/reset   { user_ids: [] }
exports.reset = async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.user_ids) ? req.body.user_ids : [];
        if (!ids.length) return res.status(400).json({ success: false, message: "Select at least one user" });
        const result = await service.resetAccess(ids);
        res.json({ success: true, updated: result.updated, message: "Access reset to role defaults" });
    } catch (error) {
        fail(res, error, "Failed to reset checklist access");
    }
};
