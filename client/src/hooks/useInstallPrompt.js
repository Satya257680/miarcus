import { useCallback, useEffect, useState } from "react";

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
// Support notes:
// - Chrome / Edge / most Android browsers fire
//   "beforeinstallprompt" — we capture it and can call
//   `promptInstall()` on demand (e.g. from a button click).
// - iOS Safari never fires that event; there is no programmatic
//   install API there, so we detect iOS and let the caller show
//   the manual "Share -> Add to Home Screen" instructions.
// - Any other browser without support simply won't be able to
//   install — the caller can show generic manual instructions.
// =============================================================

const isStandaloneDisplay = () => {
    if (typeof window === "undefined") return false;

    const mediaMatch =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches;

    // iOS Safari flag for "launched from home screen".
    const iosStandalone = window.navigator?.standalone === true;

    return Boolean(mediaMatch || iosStandalone);
};

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

export default function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installed, setInstalled] = useState(isStandaloneDisplay);
    const [isIOS] = useState(detectIOS);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            // Stop the browser's default mini-infobar so we can
            // show our own "Install App" button instead.
            event.preventDefault();
            setDeferredPrompt(event);
        };

        const handleAppInstalled = () => {
            setInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt
        );

        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt
            );

            window.removeEventListener(
                "appinstalled",
                handleAppInstalled
            );
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) {
            return "unavailable";
        }

        deferredPrompt.prompt();

        try {
            const choice = await deferredPrompt.userChoice;

            setDeferredPrompt(null);

            if (choice?.outcome === "accepted") {
                setInstalled(true);
            }

            return choice?.outcome || "dismissed";
        } catch {
            setDeferredPrompt(null);
            return "dismissed";
        }
    }, [deferredPrompt]);

    return {
        // Native prompt is ready to fire right now.
        canPrompt: Boolean(deferredPrompt) && !installed,

        // Already running as an installed app.
        installed,

        // No native prompt exists (iOS / unsupported browser),
        // so a manual how-to should be shown instead.
        needsManualInstructions: !deferredPrompt && !installed,

        isIOS,

        promptInstall,
    };
}
