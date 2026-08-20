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
    "https://rytual-peach.vercel.app";

const getAppUrl = () => {

    const configuredUrl = String(
        process.env.PUBLIC_APP_URL || ""
    ).trim();

    if (configuredUrl) {
        return configuredUrl.replace(/\/+$/, "");
    }

    return DEFAULT_PUBLIC_APP_URL;
};

module.exports = {
    DEFAULT_PUBLIC_APP_URL,
    getAppUrl
};
