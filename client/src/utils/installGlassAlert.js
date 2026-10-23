// =============================================================
// MI ARCUS — USE THE BRANDED POPUP FOR EVERY alert()
// -------------------------------------------------------------
// The app has ~350 alert("…") calls across 50 modules (create,
// update, delete, submit, upload, validation and error messages).
// Instead of editing every call (risky, easy to miss one), the
// browser's alert() is replaced once, at start-up, with the
// branded Mi Arcus popup (components/common/AlertDialog).
//
// Behaviour notes
// • The browser alert froze the page until OK was pressed; the
//   branded popup does not. Code after alert() keeps running as
//   before (reload lists, close forms, navigate…).
// • If the page reloads or redirects straight after a message
//   (e.g. "Session expired" -> /login, or save -> reload), the
//   unread message is carried over and shown on the next page.
// • Messages are queued; several alerts show one after another.
// • window.__nativeAlert keeps the original for debugging.
// =============================================================

import showAlert, { pendingAlerts } from "../components/common/AlertDialog/alertWithGlass.jsx";

const CARRY_KEY = "miarcus-pending-alerts";
const MAX_CARRIED = 3;

const install = () => {
    if (typeof window === "undefined" || window.__miarcusGlassAlert) return;
    window.__miarcusGlassAlert = true;

    try {
        window.__nativeAlert = window.alert.bind(window);
    } catch {
        // ignore
    }

    window.alert = (message) => {
        showAlert(message);
    };

    // Carry unread messages across a reload / redirect.
    window.addEventListener("pagehide", (event) => {
        if (event.persisted) return; // kept in back/forward cache as-is
        const unread = pendingAlerts().slice(0, MAX_CARRIED);
        if (!unread.length) return;
        try {
            sessionStorage.setItem(CARRY_KEY, JSON.stringify(unread));
        } catch {
            // storage unavailable — nothing to carry
        }
    });

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            try {
                sessionStorage.removeItem(CARRY_KEY);
            } catch {
                // ignore
            }
        }
    });

    // Show messages carried over from the previous page.
    let carried;
    try {
        carried = JSON.parse(sessionStorage.getItem(CARRY_KEY) || "[]");
        sessionStorage.removeItem(CARRY_KEY);
    } catch {
        carried = [];
    }

    if (Array.isArray(carried) && carried.length) {
        const showCarried = () =>
            carried
                .slice(0, MAX_CARRIED)
                .filter((item) => item && typeof item.message === "string")
                .forEach((item) =>
                    showAlert(item.message, {
                        type: item.type,
                        title: item.title,
                    })
                );

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", showCarried, { once: true });
        } else {
            window.setTimeout(showCarried, 0);
        }
    }
};

install();

export default install;
