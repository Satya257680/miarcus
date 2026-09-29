import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "../axiosConfig";

// =============================================================
// STORE PRESENCE HEARTBEAT
// =============================================================
// While a logged-in user has the website open, tell the server
// "I'm here" every 45 seconds. The admin "Store Status" page uses
// this to show which stores are ONLINE / OFFLINE.
//
// - Paused while the tab is hidden (so a forgotten background
//   tab does not keep a store "online" forever).
// - When the tab is closed, a best-effort "offline" ping is sent.
// =============================================================

const HEARTBEAT_MS = 45 * 1000;

const apiBase = () =>
    String(axios.defaults.baseURL || "").replace(/\/+$/, "");

export default function useStorePresence() {
    const location = useLocation();

    useEffect(() => {
        let timer = null;
        let stopped = false;

        const token = () => localStorage.getItem("token");

        const beat = () => {
            if (stopped || !token()) return;
            if (document.visibilityState === "hidden") return;

            axios
                .post("/api/store-presence/heartbeat", {
                    path: window.location.pathname,
                })
                .catch(() => {});
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

        beat();
        timer = window.setInterval(beat, HEARTBEAT_MS);

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", offline);

        return () => {
            stopped = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pagehide", offline);
        };
    }, []);

    // Refresh the "current page" as the user navigates.
    useEffect(() => {
        if (!localStorage.getItem("token")) return;
        axios
            .post("/api/store-presence/heartbeat", { path: location.pathname })
            .catch(() => {});
    }, [location.pathname]);
}
