import { useCallback, useSyncExternalStore } from "react";

import {
    getInstallState,
    subscribeToInstallState,
    triggerInstallPrompt,
} from "../utils/installPromptStore";

// =============================================================
// MIARCUS — "INSTALL AS APP" (PWA) HOOK
// =============================================================
//
// This hook wires up the browser's native "Add to Home Screen /
// Install App" flow (the beforeinstallprompt event) and exposes
// a small, easy-to-consume API for any component that wants to
// offer an install button.
//
// It does NOT turn Miarcus into a native app and does not
// require anybody to install anything — it simply lets the
// browser install the already-existing website as a standalone
// app (own window, own icon, works offline for cached pages)
// for whoever chooses to click "Install".
//
// The actual `beforeinstallprompt` event is captured once, at the
// module level, in `../utils/installPromptStore` — imported as
// early as possible (see main.jsx) so it is never missed no
// matter which page/component happens to be mounted when the
// browser decides to fire it. This hook just subscribes to that
// shared store, so every "Install" button — sidebar, login page,
// wherever — reflects the same, always-up-to-date state and can
// fire the *same* native one-click prompt for every user whose
// browser supports it.
//
// Support notes:
// - Chrome / Edge / most Android browsers fire
//   "beforeinstallprompt" — we capture it and can call
//   `promptInstall()` on demand (e.g. from a button click), which
//   opens the browser's own native install dialog directly, no
//   manual steps required.
// - iOS Safari never fires that event; there is no programmatic
//   install API there, so we detect iOS and let the caller show
//   the manual "Share -> Add to Home Screen" instructions.
// - Any other browser without support simply won't be able to
//   install — the caller can show generic manual instructions.
// =============================================================

const detectIOS = () => {
    if (typeof navigator === "undefined") return false;

    const ua = navigator.userAgent || navigator.vendor || "";

    const iOSDevice = /iphone|ipad|ipod/i.test(ua);

    // iPadOS 13+ reports as "MacIntel" but has touch support.
    const iPadOS13Plus =
        navigator.platform === "MacIntel" &&
        Number(navigator.maxTouchPoints) > 1;

    return iOSDevice || iPadOS13Plus;
};

const detectPlatform = () => {
    if (typeof navigator === "undefined") return "desktop";

    const ua = navigator.userAgent || navigator.vendor || "";

    if (detectIOS()) return "ios";
    if (/android/i.test(ua)) return "android";

    return "desktop";
};

export default function useInstallPrompt() {
    const { deferredPrompt, installed } = useSyncExternalStore(
        subscribeToInstallState,
        getInstallState,
        getInstallState
    );

    const isIOS = detectIOS();
    const platform = detectPlatform();

    const promptInstall = useCallback(() => triggerInstallPrompt(), []);

    return {
        // Native prompt is ready to fire right now.
        canPrompt: Boolean(deferredPrompt) && !installed,

        // Already running as an installed app.
        installed,

        // No native prompt exists (iOS / unsupported browser),
        // so a manual how-to should be shown instead.
        needsManualInstructions: !deferredPrompt && !installed,

        isIOS,

        // "ios" | "android" | "desktop" — used to tailor both the
        // install and uninstall manual instructions.
        platform,

        promptInstall,
    };
}
