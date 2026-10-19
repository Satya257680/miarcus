import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "../axiosConfig";

// =============================================================
// STORE PRESENCE HEARTBEAT
// =============================================================
// While a logged-in user has the website open, tell the server
// "I'm here" every 30 seconds. The admin "Store Status" page uses
// this to show which stores are ONLINE / OFFLINE.
//
// - Keeps running while the tab is in the background (the site is
//   still open), and pings immediately when the tab comes back.
// - When the tab/browser is closed or the user logs out, an
//   "offline" ping is sent so the exact offline time is recorded.
// =============================================================

const HEARTBEAT_MS = 30 * 1000;

// Strip a trailing "/api" too: if the base URL is ever configured as
// https://host/api, appending "/api/store-presence/offline" would
// otherwise produce /api/api/... (server logged "API Route Not Found").
const apiBase = () =>
    String(axios.defaults.baseURL || "")
        .replace(/\/+$/, "")
        .replace(/\/api$/i, "");

// One heartbeat at a time: on a slow/unstable store connection a hung
// request must not pile up a backlog behind it (see DevTools screenshots:
// heartbeat requests hanging ~20 s, then ERR_CONNECTION_RESET).
const HEARTBEAT_TIMEOUT_MS = 15 * 1000;
let heartbeatInFlight = false;

const sendHeartbeat = (path) => {
    if (heartbeatInFlight || !localStorage.getItem("token")) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    heartbeatInFlight = true;
    axios
        .post(
            "/api/store-presence/heartbeat",
            { path },
            { timeout: HEARTBEAT_TIMEOUT_MS }
        )
        .catch(() => {})
        .finally(() => {
            heartbeatInFlight = false;
        });
};

export default function useStorePresence() {
    const location = useLocation();
    const firstPathRef = useRef(true);

    useEffect(() => {
        let timer = null;
        let stopped = false;

        const token = () => localStorage.getItem("token");

        const beat = () => {
            if (stopped || !token()) return;
            sendHeartbeat(window.location.pathname);
        };

        const offline = () => {
            const t = token();
            if (!t) return;
            try {
                fetch(`${apiBase()}/api/store-presence/offline`, {
                    method: "POST",
                    keepalive: true,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${t}`,
                    },
                    body: "{}",
                }).catch(() => {});
            } catch {
                // ignore
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === "visible") beat();
        };

        const onOnline = () => beat();

        beat();
        timer = window.setInterval(beat, HEARTBEAT_MS);

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", offline);
        window.addEventListener("online", onOnline);

        return () => {
            stopped = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pagehide", offline);
            window.removeEventListener("online", onOnline);
        };
    }, []);

    // Refresh the "current page" as the user navigates. The first render is
    // skipped — the effect above already sent that heartbeat (it used to be
    // sent twice on every page load).
    useEffect(() => {
        if (firstPathRef.current) {
            firstPathRef.current = false;
            return;
        }
        sendHeartbeat(location.pathname);
    }, [location.pathname]);
}
