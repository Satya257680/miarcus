const { securityEvent } = require("../utils/securityLogger");

const securityAudit = (req, res, next) => {
    const startedAt = Date.now();

    res.on("finish", () => {
        if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
            securityEvent(
                res.statusCode === 429 ? "rate_limit" : res.statusCode === 401 ? "authentication_failure" : "authorization_failure",
                {
                    userId: req.user?.id || null,
                    ip: req.ip,
                    method: req.method,
                    path: req.path,
                    requestId: req.requestId,
                    userAgent: req.get("user-agent") || null,
                    details: { status: res.statusCode, durationMs: Date.now() - startedAt },
                }
            );
        }
    });

    next();
};

module.exports = securityAudit;
