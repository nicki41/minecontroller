// Hand-written (no build-plugin precache manifest) — Vite content-hashes
// JS/CSS filenames per build, so instead of an upfront precache list this
// caches static assets lazily as they're actually requested
// (cache-first, falling back to network) and keeps navigations
// network-first so a stale cached HTML shell can never point at hashed
// asset filenames that no longer exist after a new deploy.
//
// Never caches /api/* or /ws/* — those are live server data, not static
// assets, and must always go straight to the network per the panel's own
// requirement.

const CACHE_NAME = "minecontroller-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

function isApiOrWs(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isApiOrWs(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached ?? caches.match("/");
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
