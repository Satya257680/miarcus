/* =========================================================
   MI ARCUS — SERVICE WORKER (v2)
   =========================================================
   WHY v2:
   v1 used "stale while revalidate" for EVERYTHING, including
   the HTML page. After every new deployment the browser was
   served the OLD cached index.html, which points at an OLD
   /assets/index-XXXX.js file that no longer exists on the
   server. The server's SPA fallback then answers that .js
   request with index.html (text/html) and the browser shows:

     "Failed to load module script: Expected a JavaScript
      module script but the server responded with a MIME
      type of text/html"

   -> blank white page until the user refreshes.

   v2 rules:
   - Page navigations (HTML)   : NETWORK FIRST, cache only as
                                 an offline fallback.
   - /assets/* (hashed files)  : cache first — safe, because
                                 the file name changes on every
                                 build. Only real JS/CSS/images
                                 are cached, NEVER an HTML reply.
   - Everything else static    : network first, cache fallback.
   - API calls / non-GET       : never touched.
   - Old caches (v1) are deleted on activate.

   v3 (2026-10-19):
   - When a page navigation fails (connection reset / offline)
     it is retried ONCE after a short pause — a reset HTTP/2
     connection is usually replaced immediately.
   - If it still fails: cached app shell -> /offline.html
     (status 503) -> small built-in 503 page. It never returns
     Response.error() any more, which is what produced the
     DevTools warning "The FetchEvent for /gallery resulted in
     a network error response".
   - Only MIARCUS-owned caches ("miarcus-*") are deleted.
   - Failed static/asset fetches return a controlled 504
     instead of an error response.

   v4 (2026-10-19, after the 16:26 DevTools report):
   - v3 turned ANY failed static file into a made-up
     "504 Gateway Timeout" — misleading in the console.
     The worker now only answers requests it can actually
     help with: page navigations, /assets/* and the
     pre-cached app-shell files. Everything else goes
     straight to the network, so DevTools shows the real
     result.
   - A page navigation that gets a gateway error from the
     server (502 / 503 / 504) or a dropped connection is
     retried once; if it still fails, the cached app shell
     (the same index.html every route uses) is served so
     the page opens and its data loads normally.
   - /assets/* is retried once before giving up.
========================================================= */

const CACHE_PREFIX = "miarcus-";
const CACHE_NAME = "miarcus-shell-v4";
const OFFLINE_URL = "/offline.html";
const NAV_RETRY_DELAY_MS = 400;

const APP_SHELL = [
    OFFLINE_URL,
    "/site.webmanifest",
    "/favicon.svg",
    "/miarcus-icon-192.png",
    "/miarcus-icon-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .catch(() => {})
    );

    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        // Delete only our own old caches.
                        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

const isHtmlResponse = (response) =>
    String(response?.headers?.get("content-type") || "")
        .toLowerCase()
        .includes("text/html");

const putInCache = (request, response) => {
    const copy = response.clone();
    caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(request, copy))
        .catch(() => {});
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Gateway / proxy errors that a second attempt usually fixes.
const isGatewayError = (response) =>
    Boolean(response) && [502, 503, 504].includes(response.status);

const offlineFallbackHtml =
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Mi Arcus Portal - Offline</title></head>" +
    '<body style="font-family:system-ui,Arial,sans-serif;padding:24px;text-align:center">' +
    "<h1>We can't reach Mi Arcus right now</h1>" +
    "<p>Please check your internet connection.</p>" +
    '<button onclick="location.reload()">Try again</button>' +
    "</body></html>";

const htmlResponse = (html, status) =>
    new Response(html, {
        status,
        statusText: status === 200 ? "OK" : "Service Unavailable",
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });

// The SPA shell is the same static index.html for every route, so serving
// the cached copy is correct — the app then loads its data from the API
// and shows its own errors if the API is down. Only when there is no
// cached shell at all is the branded offline page shown (status 503).
const fallbackNavigationResponse = (networkResponse) =>
    caches
        .match("/")
        .then((shell) => {
            if (shell) return shell.text().then((html) => htmlResponse(html, 200));
            if (networkResponse) return networkResponse; // real server answer
            return caches
                .match(OFFLINE_URL)
                .then((offline) =>
                    offline
                        ? offline.text().then((html) => htmlResponse(html, 503))
                        : htmlResponse(offlineFallbackHtml, 503)
                );
        })
        .catch(() => networkResponse || htmlResponse(offlineFallbackHtml, 503));

// Network first; one retry after a dropped connection OR a gateway error.
const fetchNavigation = (request) => {
    const attempt = () => fetch(request, { cache: "no-store" });
    return attempt()
        .then((response) => {
            if (!isGatewayError(response)) return response;
            return wait(NAV_RETRY_DELAY_MS)
                .then(attempt)
                .catch(() => response);
        })
        .catch(() => wait(NAV_RETRY_DELAY_MS).then(attempt));
};

const isAppShellFile = (pathname) => APP_SHELL.includes(pathname);

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/")) return;
    if (url.pathname.startsWith("/uploads/")) return;
    if (url.pathname === "/sw.js") return;

    // ------------------------------------------------------
    // 1. PAGE NAVIGATION -> network first (always fresh HTML)
    // ------------------------------------------------------
    if (request.mode === "navigate") {
        event.respondWith(
            fetchNavigation(request)
                .then((response) => {
                    if (isGatewayError(response)) {
                        // Still a gateway error after the retry.
                        return fallbackNavigationResponse(response);
                    }
                    // Only a real, successful app page becomes the offline shell.
                    if (
                        response &&
                        response.ok &&
                        response.type === "basic" &&
                        isHtmlResponse(response) &&
                        url.pathname !== OFFLINE_URL
                    ) {
                        putInCache("/", response);
                    }
                    return response;
                })
                .catch(() => fallbackNavigationResponse(null))
        );
        return;
    }

    // ------------------------------------------------------
    // 2. HASHED BUILD FILES -> cache first, never cache HTML,
    //    one retry on a dropped connection
    // ------------------------------------------------------
    if (url.pathname.startsWith("/assets/")) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached && !isHtmlResponse(cached)) {
                    return cached;
                }

                return fetch(request)
                    .catch(() => wait(NAV_RETRY_DELAY_MS).then(() => fetch(request)))
                    .then((response) => {
                        if (
                            response &&
                            response.ok &&
                            response.type === "basic" &&
                            !isHtmlResponse(response)
                        ) {
                            putInCache(request, response);
                        }
                        return response;
                    });
            })
        );
        return;
    }

    // ------------------------------------------------------
    // 3. PRE-CACHED APP-SHELL FILES (icons, manifest, offline
    //    page) -> network first, cache fallback.
    //    Every other file is NOT intercepted: the browser loads
    //    it directly and DevTools shows the real result.
    // ------------------------------------------------------
    if (!isAppShellFile(url.pathname)) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (
                    response &&
                    response.ok &&
                    response.type === "basic" &&
                    (url.pathname === OFFLINE_URL || !isHtmlResponse(response))
                ) {
                    putInCache(request, response);
                }
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) => cached || fetch(request))
            )
    );
});
