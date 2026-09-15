// =============================================================
// MIARCUS — SERVICE WORKER REGISTRATION
// =============================================================
//
// Registers /sw.js so the browser can offer the native
// "Install app" prompt and so the app shell keeps working the
// next time it's opened, even on a flaky connection.
//
// This is intentionally a no-op if the browser doesn't support
// service workers (nothing breaks, the site just behaves like a
// normal website there), and it's skipped entirely during local
// `vite dev` so it never interferes with hot-reloading.
// =============================================================

export default function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (import.meta.env.DEV) return;

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .catch((error) => {
                console.warn("Service worker registration failed:", error);
            });
    });
}
