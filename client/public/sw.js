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
========================================================= */

const CACHE_NAME = "miarcus-shell-v2";

const APP_SHELL = [
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
                        .filter((key) => key !== CACHE_NAME)
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
    if (
        request.mode === "navigate" ||
        (request.headers.get("accept") || "").includes("text/html")
    ) {
        event.respondWith(
            fetch(request, { cache: "no-store" })
                .then((response) => {
                    if (response && response.ok) {
                        putInCache("/", response);
                    }
                    return response;
                })
                .catch(() =>
                    caches
                        .match("/")
                        .then((cached) => cached || Response.error())
                )
        );
        return;
    }

    // ------------------------------------------------------
    // 2. HASHED BUILD FILES -> cache first, never cache HTML
    // ------------------------------------------------------
    if (url.pathname.startsWith("/assets/")) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached && !isHtmlResponse(cached)) {
                    return cached;
                }

                return fetch(request).then((response) => {
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
    // 3. OTHER STATIC FILES -> network first, cache fallback
    // ------------------------------------------------------
    event.respondWith(
        fetch(request)
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
            })
            .catch(() =>
                caches
                    .match(request)
                    .then((cached) => cached || Response.error())
            )
    );
});
