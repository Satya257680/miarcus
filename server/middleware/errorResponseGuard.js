// ======================================================
// ERROR RESPONSE GUARD (production only)
// ------------------------------------------------------
// Many controllers answer HTTP 500 with `error: error.message`, and a few
// put a raw MySQL message (`sqlMessage`) into `message`. Those texts can
// reveal table / column names, SQL fragments and file-system paths.
//
// This guard touches ONLY server-error responses (status >= 500) in
// production:
//   • removes internal fields (error, stack, sql, sqlMessage, sqlState,
//     errno, code, details) from the JSON body;
//   • replaces a `message` that is clearly a database / system error with
//     a generic sentence;
//   • adds the request id so support can find the full error in the logs.
//
// 2xx / 3xx / 4xx responses (validation messages, permission denials …)
// are passed through unchanged, and nothing changes in development.
// The original error is still written to the server log by each
// controller.
// ======================================================

const INTERNAL_FIELDS = ["error", "stack", "sql", "sqlMessage", "sqlState", "errno", "code", "details"];

const INTERNAL_MESSAGE =
    /\bER_[A-Z_]+\b|sql syntax|unknown column|table '[^']*'|doesn't exist|cannot read propert|is not a function|is not defined|ECONNREFUSED|ETIMEDOUT|ENOENT|EACCES|EPERM|\bat [\w.<>]+ \(|[A-Za-z]:\\|\/(?:home|var|usr|opt|srv)\//i;

const sanitize = (body, requestId) => {
    if (!body || typeof body !== "object" || Array.isArray(body) || Buffer.isBuffer(body)) return body;
    const clean = { ...body };
    for (const field of INTERNAL_FIELDS) delete clean[field];
    if (typeof clean.message === "string" && INTERNAL_MESSAGE.test(clean.message)) {
        clean.message = "Something went wrong. Please try again or contact support.";
    }
    if (clean.message === undefined) clean.message = "Something went wrong. Please try again or contact support.";
    if (requestId && clean.requestId === undefined) clean.requestId = requestId;
    return clean;
};

const errorResponseGuard = (req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 500) return originalJson(sanitize(body, req.requestId));
        return originalJson(body);
    };
    next();
};

module.exports = errorResponseGuard;
module.exports._sanitize = sanitize;
