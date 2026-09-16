// =============================================================
// MIARCUS — GLOBAL "beforeinstallprompt" STORE
// =============================================================
//
// Why this file exists:
//
// The browser only ever fires "beforeinstallprompt" ONCE per page
// load, and it can fire at any moment after the page becomes
// installable — sometimes within a second of load, sometimes a
// little later. It is a plain `window` event, not something tied
// to any particular React component.
//
// The previous implementation attached its listener inside a
// component's `useEffect`, which only runs *after* that component
// has mounted. If the user landed on "/", the event fired while
// only the home page was mounted, and then navigated (client-side)
// to "/login", the Login page's install button would mount a brand
// new listener — but the event had already come and gone. Since
// nothing was listening at the time, the browser's install intent
// was lost for the rest of that page load, and the button fell
// back to showing the manual "open your browser menu" steps even
// though the browser was, in fact, willing to install instantly.
//
// The fix: capture the event exactly once, at the module level,
// as early as this file is first imported (we import it at the
// very top of main.jsx, before React even renders). That happens
// long before a user could possibly click an "Install" button, so
// by the time any component asks "is a native prompt ready?", the
// answer is already correct — regardless of which page mounted the
// button, or how many times the user has navigated since.
// =============================================================

const listeners = new Set();

const isStandaloneDisplay = () => {
    if (typeof window === "undefined") return false;

    const mediaMatch =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches;

    // iOS Safari flag for "launched from home screen".
    const iosStandalone = window.navigator?.standalone === true;

    return Boolean(mediaMatch || iosStandalone);
};

const state = {
    deferredPrompt: null,
    installed: isStandaloneDisplay(),
};

function notify() {
    listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (event) => {
        // Stop the browser's default mini-infobar so the app's own
        // "Install App" button/dialog is the single source of truth.
        event.preventDefault();
        state.deferredPrompt = event;
        notify();
    });

    window.addEventListener("appinstalled", () => {
        state.installed = true;
        state.deferredPrompt = null;
        notify();
    });

    const standaloneQuery =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)");

    standaloneQuery?.addEventListener?.("change", (event) => {
        state.installed = event.matches || isStandaloneDisplay();
        notify();
    });
}

export function getInstallState() {
    return state;
}

export function subscribeToInstallState(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export async function triggerInstallPrompt() {
    const { deferredPrompt } = state;

    if (!deferredPrompt) {
        return "unavailable";
    }

    // Clear it immediately — a captured prompt can only be used
    // once, and clearing eagerly avoids a double-click firing it
    // twice while the first `userChoice` promise is still pending.
    state.deferredPrompt = null;

    deferredPrompt.prompt();

    try {
        const choice = await deferredPrompt.userChoice;

        if (choice?.outcome === "accepted") {
            state.installed = true;
        }

        notify();

        return choice?.outcome || "dismissed";
    } catch {
        notify();
        return "dismissed";
    }
}
