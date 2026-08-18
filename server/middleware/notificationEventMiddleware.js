const jwt = require("jsonwebtoken");
const notificationService = require("../services/notificationService");
const db = require("../config/db");

// ======================================================
// MIARCUS - GLOBAL CHANGE -> NOTIFICATION BRIDGE
//
// Every successful business mutation (POST/PUT/PATCH/DELETE)
// is converted into an in-app notification.
//
// IMPORTANT:
// This middleware runs before route-level authMiddleware, so
// it resolves the actor directly from the Bearer JWT. This
// fixes the old req.user timing problem.
//
// Notifications are sent to every ACTIVE user except the
// person who performed the change. The notification contains
// a module-specific link so clicking it opens that module.
// ======================================================

const ignoredPrefixes = [
    // These modules already create their own audience-aware
    // notifications or are not business-change events.
    "/api/notifications",
    "/api/auth",
    "/api/profile",
    "/api/activity",
    "/api/dashboard",
    "/api/upload-test",
    "/api/test"
];

// Starting a public quiz session is not a module change.
// The actual public quiz submission IS watched below.
const ignoredExactOrPrefixes = [
    "/api/quiz/public/session"
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
    ["reports-to", "Reports To", "/settings/reports-to"],
    ["announcements", "Announcements", "/announcements"],
    ["new-store-openings", "New Store Openings", "/new-store-openings"],
    ["nso-rules", "NSO Rules", "/nso-rules"],
    ["nso-tracking", "NSO Tracking", "/nso-tracking"],
    ["expenses", "Expenses", "/expenses"],
    ["quiz", "Quiz", "/quiz/report"]
];

function getModule(url) {
    const clean = String(url || "").split("?")[0];
    const found = moduleMap.find(([key]) => clean.includes(`/api/${key}`));
    return found || ["System", "System", "/dashboard"];
}

// ======================================================
// ACTION DETECTION
// ======================================================
// The old middleware only looked at HTTP method, which meant
// POST /disable and POST /approve were incorrectly reported as
// "Created". We now inspect the endpoint and body status too.

function getAction(req) {
    const method = String(req.method || "").toUpperCase();
    const path = String(req.originalUrl || "").split("?")[0].toLowerCase();
    const body = req.body || {};

    const combined = [
        path,
        body.action,
        body.operation,
        body.status,
        body.account_status
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    // Status changes such as PUT /users/:id with status=Inactive
    // should be shown as Disabled, while a normal POST that creates
    // an Active record must still be shown as Created.
    if (
        (method === "PUT" || method === "PATCH") &&
        String(body.status || body.account_status || "").toLowerCase() === "inactive"
    ) {
        return "Disabled";
    }

    if (
        (method === "PUT" || method === "PATCH") &&
        String(body.status || body.account_status || "").toLowerCase() === "active"
    ) {
        return "Enabled";
    }

    if (/(^|[\/_-])(disable|disabled)([\/_-]|$)/.test(combined)) {
        return "Disabled";
    }

    if (/(^|[\/_-])(enable|enabled)([\/_-]|$)/.test(combined)) {
        return "Enabled";
    }

    if (/(^|[\/_-])(deactivate|deactivated)([\/_-]|$)/.test(combined)) {
        return "Deactivated";
    }

    if (/(^|[\/_-])(activate|activated)([\/_-]|$)/.test(combined)) {
        return "Activated";
    }

    if (/(^|[\/_-])(approve|approved)([\/_-]|$)/.test(combined)) {
        return "Approved";
    }

    if (/(^|[\/_-])(reject|rejected)([\/_-]|$)/.test(combined)) {
        return "Rejected";
    }

    if (/(^|[\/_-])(publish|published)([\/_-]|$)/.test(combined)) {
        return "Published";
    }

    if (/(^|[\/_-])(submit|submitted)([\/_-]|$)/.test(combined)) {
        return "Submitted";
    }

    if (/(^|[\/_-])(complete|completed)([\/_-]|$)/.test(combined)) {
        return "Completed";
    }

    if (/(^|[\/_-])(bulk[-_ ]?upload|import|imported)([\/_-]|$)/.test(combined)) {
        return "Imported";
    }

    if (/(^|[\/_-])(send|sent)([\/_-]|$)/.test(combined)) {
        return "Sent";
    }

    if (/(^|[\/_-])(delete|deleted|remove|removed|destroy)([\/_-]|$)/.test(combined)) {
        return "Deleted";
    }

    if (method === "DELETE") return "Deleted";
    if (method === "POST") return "Created";
    if (method === "PUT" || method === "PATCH") return "Updated";

    return "Updated";
}

// ======================================================
// ACTOR FROM JWT
// ======================================================

function getActorId(req) {
    // Route-level auth may already have populated req.user in
    // some future configuration, so use it when available.
    const existing = Number(req.user?.id || 0);
    if (Number.isInteger(existing) && existing > 0) return existing;

    const authHeader = req.headers?.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return 0;

    const token = authHeader.slice(7).trim();
    if (!token) return 0;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const id = Number(decoded?.id || 0);
        return Number.isInteger(id) && id > 0 ? id : 0;
    } catch {
        return 0;
    }
}

// ======================================================
// ALL ACTIVE USERS
// ======================================================

async function getActiveUsersExcept(excludedIds = []) {
    const excluded = new Set(
        excludedIds
            .map(Number)
            .filter(id => Number.isInteger(id) && id > 0)
    );

    const rows = await db.query(`
        SELECT id
        FROM users
        WHERE status = 'Active'
        ORDER BY id ASC
    `);

    return rows
        .map(row => Number(row.id))
        .filter(id => id > 0 && !excluded.has(id));
}

// ======================================================
// ENTITY ID / RESPONSE DATA
// ======================================================

function findId(value) {
    if (value == null) return null;

    const id = Number(value);
    if (Number.isInteger(id) && id > 0) return id;

    return null;
}

function getEntityId(req, responsePayload = null) {
    const candidates = [
        req.params?.id,
        req.body?.id,
        req.body?.action_point_id,
        req.body?.submission_id,
        req.body?.new_store_opening_id,
        req.body?.expense_id,
        req.body?.quiz_id,
        responsePayload?.id,
        responsePayload?.entity_id,
        responsePayload?.announcementId,
        responsePayload?.actionPointId,
        responsePayload?.submissionId,
        responsePayload?.data?.id,
        responsePayload?.data?.action_point_id,
        responsePayload?.data?.submission_id,
        responsePayload?.data?.quiz_id,
        responsePayload?.data?.expense_id
    ];

    for (const candidate of candidates) {
        const id = findId(candidate);
        if (id) return id;
    }

    return null;
}

function getResponseParticipantId(responsePayload) {
    const candidates = [
        responsePayload?.participant_id,
        responsePayload?.data?.participant_id
    ];

    for (const candidate of candidates) {
        const id = findId(candidate);
        if (id) return id;
    }

    return null;
}

function getType(action) {
    if (["Deleted", "Disabled", "Deactivated", "Rejected"].includes(action)) {
        return "warning";
    }

    if (["Approved", "Enabled", "Activated", "Completed"].includes(action)) {
        return "success";
    }

    return "info";
}

// ======================================================
// INSTALL
// ======================================================

function install(app) {
    app.use((req, res, next) => {
        const path = req.originalUrl?.split("?")[0] || "";

        const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(
            String(req.method || "").toUpperCase()
        );

        const isApi = path.startsWith("/api/");

        const isPublicQuizSubmit =
            /^\/api\/quiz\/public\/session\/[^/]+\/submit\/?$/i.test(path);

        // Announcement creation already has audience-aware notification
        // logic in announcementController.js. Let the generic bridge handle
        // announcement update/delete/bulk actions, but do not duplicate the
        // normal create notification. Read/email-delivery bookkeeping is not
        // a business change and should not notify everyone.
        const isAnnouncementCreate =
            path === "/api/announcements" ||
            path === "/api/announcements/";

        const isAnnouncementBookkeeping =
            /^\/api\/announcements\/[^/]+\/read\/?$/i.test(path) ||
            /^\/api\/announcements\/email\/[^/]+\/delivered\/?$/i.test(path);

        const ignored =
            ignoredPrefixes.some(prefix => path.startsWith(prefix)) ||
            ignoredExactOrPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`) && !isPublicQuizSubmit) ||
            isAnnouncementCreate ||
            isAnnouncementBookkeeping;

        // Public quiz submission is explicitly allowed through even though
        // it lives below /api/quiz/public/session/.
        if (!isMutation || !isApi || (ignored && !isPublicQuizSubmit)) {
            return next();
        }

        // Capture JSON response payload when the controller uses res.json().
        // This lets us include the newly-created entity id in the notification
        // without changing every controller.
        const originalJson = res.json.bind(res);
        res.json = (payload) => {
            res.locals.notificationPayload = payload;
            return originalJson(payload);
        };

        let handled = false;

        res.on("finish", async () => {
            if (handled || res.statusCode < 200 || res.statusCode >= 300) return;
            handled = true;

            try {
                const actorId = getActorId(req);
                const [moduleName, label, link] = getModule(path);
                const action = getAction(req);
                const responsePayload = res.locals.notificationPayload || null;
                const entityId = getEntityId(req, responsePayload);

                // For public quiz submission, the participant may have a
                // corresponding application user account. Do not send the
                // "Quiz Submitted" notification back to that participant.
                const participantId = isPublicQuizSubmit
                    ? getResponseParticipantId(responsePayload)
                    : null;

                const excludedIds = [actorId, participantId].filter(Boolean);
                const recipientIds = await getActiveUsersExcept(excludedIds);

                if (recipientIds.length === 0) return;

                let title = `${label} ${action}`;
                let message = `${label} ${action.toLowerCase()} successfully.`;

                if (isPublicQuizSubmit) {
                    const participantName =
                        responsePayload?.participant_name || "A participant";
                    const quizName =
                        responsePayload?.quiz_name || "Quiz";
                    const percentage =
                        responsePayload?.percentage != null
                            ? `${responsePayload.percentage}%`
                            : "completed";

                    title = "Quiz Completed";
                    message = `${participantName} completed ${quizName} (${percentage}).`;
                }

                await notificationService.createForUsers(recipientIds, {
                    title,
                    message,
                    module_name: moduleName,
                    action_name: action,
                    entity_id: entityId,
                    link,
                    type: getType(action)
                });
            } catch (error) {
                // Notifications must never break the business request.
                console.error(
                    "Global notification event middleware error:",
                    error.message
                );
            }
        });

        next();
    });
}

module.exports = install;
