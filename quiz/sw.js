/* -------------------------------------------------------------
   Service worker — offline-capable with fresh-by-default updates.
   - navigate: network-first (falls back to cached shell offline)
   - other GETs: stale-while-revalidate (serve cache if present,
     refresh in the background so the next load has the new asset)
   Bump CACHE_VERSION when any cached file changes.
   ------------------------------------------------------------- */

const CACHE_VERSION = "v3";
const CACHE_NAME = `citax-quiz-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "questions.json",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Drop any old caches from previous versions.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Same-origin only — let cross-origin (e.g. analytics) pass through.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation so users see fresh HTML when online,
  // but fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  // Stale-while-revalidate for everything else (CSS/JS/JSON/icons):
  // serve the cached copy immediately if we have one, but always try to
  // refresh it in the background so the next visit picks up any changes.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })
  );
});
