// =============================================================
// MIARCUS — RESILIENT EVENT STREAM (SSE)
// -------------------------------------------------------------
// Opens an EventSource with a short-lived, single-use stream ticket
// (the 8-hour login token is no longer put in the URL) and keeps it
// alive safely:
//
//   • every (re)connect fetches a fresh ticket with the normal
//     Authorization header (POST <ticketPath>)
//   • exponential back-off with jitter (2 s → 60 s), reset after a
//     stable connection — no reconnect storms after a network blip
//   • pauses while the browser is offline, resumes on "online"
//   • stops for good on 401/403 (session ended / no permission)
//   • a single close() removes every timer and listener
//
// Usage:
//   const stop = openResilientEventSource({
//       ticketPath: "/api/notifications/stream-token",
//       streamPath: "/api/notifications/stream",
//       events: { notification: (data) => ... },
//       onOpen, onError,
//   });
//   ...
//   stop();
// =============================================================

import axios from "../axiosConfig";

const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 60000;
const STABLE_AFTER_MS = 30000;
const TICKET_TIMEOUT_MS = 15000;

const apiOrigin = () =>
    String(axios.defaults.baseURL || window.location.origin || "")
        .trim()
        .replace(/\/+$/, "")
        .replace(/\/api$/i, "");

const withJitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));

export function openResilientEventSource({
    ticketPath,
    streamPath,
    events = {},
    onOpen,
    onError,
} = {}) {
    if (typeof window === "undefined" || typeof window.EventSource === "undefined") {
        return () => {};
    }

    let source = null;
    let retryTimer = null;
    let stableTimer = null;
    let attempt = 0;
    let stopped = false;
    let connecting = false;

    const clearTimers = () => {
        if (retryTimer) window.clearTimeout(retryTimer);
        if (stableTimer) window.clearTimeout(stableTimer);
        retryTimer = null;
        stableTimer = null;
    };

    const closeSource = () => {
        if (source) {
            source.onopen = null;
            source.onerror = null;
            source.close();
            source = null;
        }
    };

    const schedule = () => {
        if (stopped || retryTimer) return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) return; // "online" resumes
        const delay = withJitter(Math.min(MAX_DELAY_MS, MIN_DELAY_MS * 2 ** attempt));
        attempt = Math.min(attempt + 1, 10);
        retryTimer = window.setTimeout(() => {
            retryTimer = null;
            connect();
        }, delay);
    };

    async function connect() {
        if (stopped || connecting || source) return;
        if (!localStorage.getItem("token")) return;

        connecting = true;
        let ticket;

        try {
            const response = await axios.post(ticketPath, null, { timeout: TICKET_TIMEOUT_MS });
            ticket = String(response?.data?.ticket || "");
        } catch (error) {
            connecting = false;
            const status = error?.response?.status;
            // Session ended (axios interceptor handles 401) or no permission.
            if (status === 401 || status === 403) {
                stopped = true;
                return;
            }
            onError?.(error);
            schedule();
            return;
        }

        connecting = false;
        if (stopped || !ticket) {
            if (!stopped) schedule();
            return;
        }

        try {
            source = new window.EventSource(
                `${apiOrigin()}${streamPath}?ticket=${encodeURIComponent(ticket)}`
            );
        } catch (error) {
            source = null;
            onError?.(error);
            schedule();
            return;
        }

        Object.entries(events).forEach(([name, handler]) => {
            source.addEventListener(name, (event) => {
                let data;
                try {
                    data = JSON.parse(event.data || "{}");
                } catch {
                    return;
                }
                try {
                    handler(data, event);
                } catch (error) {
                    console.error(`Live update handler failed: ${name}`, error);
                }
            });
        });

        source.onopen = () => {
            if (stableTimer) window.clearTimeout(stableTimer);
            // Only reset back-off once the stream has stayed up a while.
            stableTimer = window.setTimeout(() => {
                attempt = 0;
            }, STABLE_AFTER_MS);
            onOpen?.();
        };

        // A ticket is single-use, so never let the browser auto-retry with
        // the same URL: close and reconnect with a fresh ticket instead.
        source.onerror = () => {
            closeSource();
            if (stableTimer) window.clearTimeout(stableTimer);
            stableTimer = null;
            onError?.();
            schedule();
        };
    }

    const onOnline = () => {
        if (stopped || source) return;
        if (retryTimer) window.clearTimeout(retryTimer);
        retryTimer = null;
        attempt = 0;
        connect();
    };

    const onOffline = () => {
        // Drop the dead connection now instead of waiting for TCP timeouts.
        closeSource();
        clearTimers();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    connect();

    return () => {
        stopped = true;
        clearTimers();
        closeSource();
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
    };
}

export default openResilientEventSource;
