// ======================================================
// MIARCUS SECURITY HEADERS
// Dependency-free replacement for the most important
// Helmet protections. Keep this middleware before routes.
// ======================================================

const securityHeaders = (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=(), usb=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

    // HSTS is safe only when HTTPS is the deployment protocol.
    if (process.env.NODE_ENV === "production") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // The API returns JSON and does not need a browser HTML execution context.
    if (req.path.startsWith("/api/")) {
        res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    }

    next();
};

module.exports = securityHeaders;
