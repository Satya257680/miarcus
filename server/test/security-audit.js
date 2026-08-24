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
        const isSelfService = new Set([
            "dashboardRoutes.js",
            "locationRoutes.js",
            "notificationRoutes.js",
            "profileRoutes.js",
            "themePreferenceRoutes.js",
        ]).has(file);

        const hasCustomPermission = source.includes("pettyPermission") || source.includes("scopeExpense") || source.includes("requireExpensePermission");
        if (!source.includes("permissionMiddleware") && !hasCustomPermission && !isSelfService) {
            findings.push(`REVIEW: ${file} contains mutating routes without the common permission middleware.`);
        }
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
