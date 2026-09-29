// =============================================================
// MIARCUS — SERVICE WORKER REGISTRATION
// =============================================================
//
// Registers /sw.js so the browser can offer the native
// "Install app" prompt.
//
// - updateViaCache: "none" -> the browser always re-downloads
//   sw.js itself, so a fixed/new worker is picked up right
//   after a deployment instead of days later.
// - We ask for an update when the tab becomes visible again.
// - Skipped during local `vite dev`.
// =============================================================

export default function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (import.meta.env.DEV) return;

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js", { updateViaCache: "none" })
            .then((registration) => {
                registration.update().catch(() => {});

                if (registration.waiting) {
                    registration.waiting.postMessage("SKIP_WAITING");
                }

                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === "visible") {
                        registration.update().catch(() => {});
                    }
                });
            })
            .catch((error) => {
                console.warn("Service worker registration failed:", error);
            });
    });
}
