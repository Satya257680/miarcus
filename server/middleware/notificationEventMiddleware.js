const notificationService = require("../services/notificationService");
const db = require("../config/db");

// ======================================================
// GENERIC BACKEND EVENT -> NOTIFICATION BRIDGE
//
// Every successful POST/PUT/PATCH/DELETE API action passes
// through this middleware. It derives the module/action from
// the endpoint and chooses direct recipients from common user
// fields. If an action has no explicit recipient, all active
// administrators are notified (excluding the actor).
//
// This gives the application a central safety net while
// module-specific services can still create richer targeted
// notifications when needed.
// ======================================================

const ignoredPrefixes = [
    "/api/notifications",
    "/api/auth",
    "/api/upload-test",
    "/api/test"
];

const moduleMap = [
    ["action-points", "Action Points", "/action-points"],
    ["checklist-submissions", "Checklist", "/checklist-reports"],
    ["checklist-reports", "Checklist Reports", "/checklist-reports"],
    ["checklist-types", "Checklist Types", "/settings/checklist-types"],
    ["questions", "Questions", "/settings/questions"],
    ["departments", "Departments", "/settings/departments"],
    ["designations", "Designations", "/settings/designations"],
    ["stores", "Stores", "/settings/stores"],
    ["users", "Users", "/settings/users"],
    ["reports", "Reports To", "/settings/reports-to"],
    ["announcements", "Announcements", "/announcements"],
    ["new-store-openings", "New Store Openings", "/new-store-openings"],
    ["nso-rules", "NSO Rules", "/nso-rules"],
    ["nso-tracking", "NSO Tracking", "/nso-tracking"],
    ["expenses", "Expenses", "/expenses"],
    ["quiz", "Quiz", "/quiz"]
];

function getModule(url) {
    const clean = url.split("?")[0];
    const found = moduleMap.find(([key]) => clean.includes(`/api/${key}`));
    return found || ["System", "System", "/dashboard"];
}

function getAction(method) {
    return {
        POST: "Created",
        PUT: "Updated",
        PATCH: "Updated",
        DELETE: "Deleted"
    }[method] || "Updated";
}

function collectIds(body = {}) {
    const keys = [
        "user_id",
        "assigned_to",
        "assigned_user_id",
        "created_by",
        "submitted_by",
        "approver_id",
        "manager_id",
        "reporting_to",
        "reported_to",
        "employee_user_id"
    ];

    const ids = [];
    for (const key of keys) {
        const value = body[key];
        if (Array.isArray(value)) {
            ids.push(...value);
        } else if (value != null) {
            ids.push(value);
        }
    }

    return [...new Set(ids.map(Number).filter(id => Number.isInteger(id) && id > 0))];
}

function getEntityId(req) {
    const values = [
        req.params?.id,
        req.body?.id,
        req.body?.action_point_id,
        req.body?.submission_id,
        req.body?.new_store_opening_id,
        req.body?.expense_id
    ];

    for (const value of values) {
        const id = Number(value);
        if (Number.isInteger(id) && id > 0) return id;
    }

    return null;
}

async function getAdminsExcept(actorId) {
    const rows = await db.query(`
        SELECT id
        FROM users
        WHERE status = 'Active' AND is_admin = 1
    `);

    return rows
        .map(row => Number(row.id))
        .filter(id => id > 0 && id !== Number(actorId));
}

function install(app) {
    app.use((req, res, next) => {
        const path = req.originalUrl?.split("?")[0] || "";
        const shouldWatch = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
            && path.startsWith("/api/")
            && !ignoredPrefixes.some(prefix => path.startsWith(prefix));

        if (!shouldWatch) return next();

        let handled = false;

        res.on("finish", async () => {
            if (handled || res.statusCode < 200 || res.statusCode >= 300) return;
            handled = true;

            try {
                const actorId = Number(req.user?.id || 0);
                if (!actorId) return;

                const [moduleName, label, link] = getModule(path);
                const action = getAction(req.method);
                const entityId = getEntityId(req);

                let recipientIds = collectIds(req.body || {})
                    .filter(id => id !== actorId);

                // If this action explicitly names a target user, send it
                // directly. Otherwise notify active administrators.
                if (recipientIds.length === 0) {
                    recipientIds = await getAdminsExcept(actorId);
                }

                if (recipientIds.length === 0) return;

                const message = `${label} ${action.toLowerCase()} successfully.`;

                await notificationService.createForUsers(recipientIds, {
                    title: `${label} ${action}`,
                    message,
                    module_name: moduleName,
                    action_name: action,
                    entity_id: entityId,
                    link,
                    type: action === "Deleted" ? "warning" : "info"
                });
            } catch (error) {
                // Notifications must never break the business request.
                console.error("Notification event middleware error:", error.message);
            }
        });

        next();
    });
}

module.exports = install;
