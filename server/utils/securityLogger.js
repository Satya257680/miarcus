const db = require("../config/db");

function securityEvent(event, details = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        event: String(event || "security_event"),
        userId: details.userId ?? null,
        ip: details.ip || null,
        method: details.method || null,
        path: details.path || null,
        requestId: details.requestId || null,
        userAgent: details.userAgent || null,
        details: details.details || undefined,
    };

    console.warn("[SECURITY_EVENT]", JSON.stringify(payload));

    // Best-effort persistence. A logging failure must never break the request.
    Promise.resolve().then(() => db.query(
        `INSERT INTO security_events (event_type,user_id,ip_address,method,request_path,request_id,user_agent,details_json) VALUES (?,?,?,?,?,?,?,?)`,
        [payload.event, payload.userId, payload.ip, payload.method, payload.path, payload.requestId, payload.userAgent, payload.details ? JSON.stringify(payload.details) : null]
    )).catch(() => {});
}

module.exports = { securityEvent };
