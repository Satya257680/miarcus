const fs = require("fs");
const path = require("path");

const routesDir = path.resolve(__dirname, "../routes");
const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith("Routes.js"));

const findings = [];

for (const file of routeFiles) {
    const source = fs.readFileSync(path.join(routesDir, file), "utf8");

    if (file !== "authRoutes.js" && !source.includes("authMiddleware")) {
        findings.push(`CRITICAL: ${file} has no authentication middleware.`);
    }

    if (file !== "authRoutes.js" && /router\.(post|put|patch|delete)\s*\(/.test(source)) {
        // Self-service routes: every mutation is scoped to req.user.id in
        // the handler (manually reviewed 2026-10-19).
        //   notificationCenterRoutes — WHERE user_id = req.user.id
        //   storePresenceRoutes      — the caller's own presence only
        //   uploadRoutes             — chunk sessions bound to the uploader
        //   helpCenterRoutes         — own tickets; admin actions use adminOnly
        //   bulkUploadRoutes         — /inspect only parses + deletes the file,
        //                              writes nothing (real imports live in the
        //                              module routes with permissionMiddleware)
        const isSelfService = new Set([
            "dashboardRoutes.js",
            "locationRoutes.js",
            "notificationRoutes.js",
            "profileRoutes.js",
            "themePreferenceRoutes.js",
            "notificationCenterRoutes.js",
            "storePresenceRoutes.js",
            "uploadRoutes.js",
            "helpCenterRoutes.js",
            "bulkUploadRoutes.js",
        ]).has(file);

        // Admin / owner guards are stricter than permissionMiddleware.
        const hasAdminOrOwnerGuard =
            /\badminOnly\b/.test(source) || /\blndOwnerOnly\b/.test(source);

        const hasCustomPermission =
            hasAdminOrOwnerGuard ||
            source.includes("pettyPermission") ||
            source.includes("scopeExpense") ||
            source.includes("requireExpensePermission");
        if (!source.includes("permissionMiddleware") && !hasCustomPermission && !isSelfService) {
            findings.push(`REVIEW: ${file} contains mutating routes without the common permission middleware.`);
        }
    }
}

// Live streams must not accept the long-lived login JWT from the URL
// unless the explicit rollback switch is consulted.
for (const file of ["services/notificationService.js", "routes/chatRoutes.js"]) {
    const source = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
    if (source.includes("authenticateLoginToken(") && !source.includes("legacyQueryTokenAllowed()")) {
        findings.push(`CRITICAL: ${file} accepts a login JWT in the stream URL without the SSE_ALLOW_LOGIN_TOKEN switch.`);
    }
}

const server = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
if (!server.includes("securityHeaders")) findings.push("CRITICAL: security headers middleware is not installed.");
if (!server.includes("apiLimiter")) findings.push("CRITICAL: global API rate limiting is not installed.");
if (!server.includes("originGuard")) findings.push("CRITICAL: browser origin guard is not installed.");
if (!server.includes("ALLOW_PUBLIC_UPLOADS")) findings.push("CRITICAL: upload exposure is not controlled by environment.");

if (findings.length) {
    console.error("MIARCUS SECURITY AUDIT FINDINGS");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 2;
} else {
    console.log("MIARCUS SECURITY AUDIT: no critical static findings.");
}
