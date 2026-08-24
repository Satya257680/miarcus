const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_ALGORITHM } = require("../config/security");
const { logActivity } = require("../utils/activityLogger");

// Global audit bridge. Existing controllers that already call logActivity are
// excluded to avoid duplicate records. All other business-module mutations are
// automatically captured here, so new/create/update/delete actions appear in
// Recent Activity without requiring every controller to be edited.

const MODULES = [
    ["assets", "Asset Master", "/asset-master"],
    ["theme-preferences", "Settings", "/settings"],
    ["profile", "Profile", "/profile"],
    ["asset-master", "Asset Master", "/asset-master"],
    ["action-points", "Action Points", "/action-points"],
    ["announcements", "Announcements", "/announcements"],
    ["gallery", "Gallery", "/gallery"],
    ["location", "Employee Location", "/employee-location"],
    ["attendance", "Attendance", "/attendance"],
    ["checklist-submissions", "Checklist Submission", "/checklist-submit"],
    ["checklist-reports", "Checklist Reports", "/checklist-reports"],
    ["checklist-types", "Checklist Types", "/settings/checklist-types"],
    ["questions", "Questions", "/settings/questions"],
    ["departments", "Departments", "/settings/departments"],
    ["designations", "Designations", "/settings/designations"],
    ["reports", "Reports To", "/settings/reports-to"],
    ["new-store-openings", "New Store Openings", "/new-store-openings"],
    ["nso-rules", "NSO Rules", "/nso-rules"],
    ["expenses", "Expenses", "/expenses"],
    ["petty-cash", "Petty Cash", "/petty-cash"],
    ["billing", "Billing", "/billing"],
    ["sales-team", "Sales Team", "/sales-team"],
    ["listing-tracker", "Listing Tracker", "/listing-tracker"],
    ["quiz", "Quiz", "/quiz"],
];

const EXCLUDED_PREFIXES = [
    "/api/activities",
    "/api/dashboard",
    "/api/notifications",
    "/api/auth",
    "/api/users",
    "/api/stores",
    "/api/departments",
    "/api/designations",
    "/api/checklist-types",
    "/api/questions",
    "/api/reports",
    "/api/nso-tracking",
];

function moduleFor(pathname) {
    return MODULES.find(([key]) => pathname.startsWith(`/api/${key}`)) || null;
}

function actorId(req) {
    const direct = Number(req.user?.id || 0);
    if (Number.isInteger(direct) && direct > 0) return direct;

    const header = String(req.headers?.authorization || "");
    if (!header.startsWith("Bearer ")) return null;

    try {
        const decoded = jwt.verify(header.slice(7).trim(), JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
        const id = Number(decoded?.id || 0);
        return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

function responseId(payload) {
    const values = [
        payload?.id,
        payload?.entity_id,
        payload?.data?.id,
        payload?.data?.entity_id,
        payload?.data?.insertId,
        payload?.data?.action_point_id,
        payload?.data?.submission_id,
        payload?.data?.expense_id,
    ];
    for (const value of values) {
        const id = Number(value);
        if (Number.isInteger(id) && id > 0) return id;
    }
    return null;
}

function actionFor(req) {
    const method = String(req.method || "").toUpperCase();
    const path = String(req.originalUrl || "").split("?")[0].toLowerCase();
    const body = req.body || {};
    const combined = [path, body.action, body.operation, body.status, body.account_status]
        .filter(Boolean).join(" ").toLowerCase();

    if (/(^|[\/_-])(deactivate|deactivated)([\/_-]|$)/.test(combined)) return "Deactivated";
    if (/(^|[\/_-])(activate|activated)([\/_-]|$)/.test(combined)) return "Activated";
    if (/(^|[\/_-])(disable|disabled)([\/_-]|$)/.test(combined)) return "Disabled";
    if (/(^|[\/_-])(enable|enabled)([\/_-]|$)/.test(combined)) return "Enabled";
    if (/(^|[\/_-])(approve|approved)([\/_-]|$)/.test(combined)) return "Approved";
    if (/(^|[\/_-])(reject|rejected)([\/_-]|$)/.test(combined)) return "Rejected";
    if (/(^|[\/_-])(submit|submitted)([\/_-]|$)/.test(combined)) return "Submitted";
    if (/(^|[\/_-])(complete|completed)([\/_-]|$)/.test(combined)) return "Completed";
    if (/(^|[\/_-])(send|sent)([\/_-]|$)/.test(combined)) return "Sent";
    if (method === "DELETE" || /(^|[\/_-])(delete|deleted|remove|removed)([\/_-]|$)/.test(combined)) return "Deleted";
    if (method === "POST") return "Created";
    if (method === "PUT" || method === "PATCH") return "Updated";
    return "Updated";
}

function entityName(req, payload) {
    const body = req.body || {};
    const candidates = [
        body.name,
        body.title,
        body.employee_name,
        body.store_name,
        body.question,
        body.description,
        payload?.name,
        payload?.data?.name,
        payload?.data?.title,
    ];
    const value = candidates.find((item) => typeof item === "string" && item.trim());
    return value ? value.trim().slice(0, 100) : "record";
}

function install(app) {
    app.use((req, res, next) => {
        const pathname = String(req.originalUrl || "").split("?")[0];
        const method = String(req.method || "").toUpperCase();
        const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
        const module = moduleFor(pathname);

        if (!pathname.startsWith("/api/") || !isMutation || !module) return next();
        if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return next();

        // Sales Team and a few modules have their own targeted activity flows.
        // These are already excluded by their explicit controllers when needed.
        const originalJson = res.json.bind(res);
        let payload = null;
        res.json = (value) => {
            payload = value;
            return originalJson(value);
        };

        res.on("finish", () => {
            if (res.statusCode < 200 || res.statusCode >= 300) return;

            const userId = actorId(req);
            if (!userId) return;

            const action = actionFor(req);
            const id = Number(req.params?.id || 0) || responseId(payload) || 0;
            const [, moduleName] = module;
            const name = entityName(req, payload);
            const title = `${moduleName} ${action}`;
            const description = `${moduleName} ${action.toLowerCase()}${name !== "record" ? `: ${name}` : "."}`;

            logActivity({
                activity_type: `${moduleName} Activity`,
                reference_id: id,
                title,
                description,
                module_name: moduleName,
                status: action === "Deleted" || action === "Disabled" ? "Closed" : "Open",
                priority: "Medium",
                created_by: userId,
                assigned_to: null,
            }).catch((error) => {
                console.error("Global activity audit error:", error.message);
            });
        });

        next();
    });
}

module.exports = install;
