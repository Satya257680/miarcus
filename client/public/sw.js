/* =========================================================
   MI ARCUS — SERVICE WORKER
   =========================================================
   Keeps this lightweight and safe:

   - Only caches this site's own static, same-origin files
     (the app shell + icons). It never touches the backend API,
     which lives on a different origin (see axiosConfig.js).
   - Uses a "stale while revalidate" strategy: the cached copy
     answers instantly, while a network request runs in the
     background to refresh the cache for next time. If there is
     no cached copy yet, it waits for the network.
   - Existing with a service worker (even a minimal one) is what
     makes Chrome/Edge/Android offer the native "Install app"
     prompt reliably, on top of the manifest already in place.
   - Old cache versions are cleaned up on activate, so bumping
     CACHE_NAME below is enough to ship a fresh app shell.
========================================================= */

const CACHE_NAME = "miarcus-shell-v1";

const APP_SHELL = [
    "/",
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
            .catch(() => {
                // Never block install if one of the shell files
                // is momentarily unreachable.
            })
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

self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Only handle safe, same-origin GET requests. Everything
    // else (API calls, POST/PUT/DELETE, cross-origin requests)
    // goes straight to the network untouched.
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/")) return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const networkFetch = fetch(request)
                .then((networkResponse) => {
                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        networkResponse.type === "basic"
                    ) {
                        const responseClone = networkResponse.clone();

                        caches
                            .open(CACHE_NAME)
                            .then((cache) =>
                                cache.put(request, responseClone)
                            );
                    }

                    return networkResponse;
                })
                .catch(() => cachedResponse);

            return cachedResponse || networkFetch;
        })
    );
});
