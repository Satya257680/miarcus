// ==========================================================
// PUBLIC MIARCUS APPLICATION URL
// ==========================================================
//
// All links sent to users by email must point to the current
// production frontend. Set PUBLIC_APP_URL in Render/Vercel if
// the production URL changes in the future.
//
// IMPORTANT:
// FRONTEND_URL is intentionally not used here because an old
// FRONTEND_URL value can cause invitation/account emails to
// point to the previous Mi Arcus application.
//
// ==========================================================

const DEFAULT_PUBLIC_APP_URL =
    "https://rytual2.miarcus.com";

// Old production URLs that must never be used in emails again.
// If any of these is still present in the environment, it is
// ignored so account/invitation emails always open the current
// Mi Arcus application.
const LEGACY_APP_URLS = [
    "https://rytual-peach.vercel.app",
    "https://rytual.miarcus.com",
    "https://miarcus.vercel.app"
];

const normalize = (value) => String(value || "").trim().replace(/\/+$/, "");

const getAppUrl = () => {

    const configuredUrl = normalize(process.env.PUBLIC_APP_URL);

    if (configuredUrl && !LEGACY_APP_URLS.includes(configuredUrl)) {
        return configuredUrl;
    }

    return DEFAULT_PUBLIC_APP_URL;
};

module.exports = {
    DEFAULT_PUBLIC_APP_URL,
    getAppUrl
};
