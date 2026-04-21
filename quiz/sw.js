/* -------------------------------------------------------------
   Service worker — offline-first for static assets and questions.
   Bump CACHE_VERSION when any cached file changes so clients pick
   up the new copy.
   ------------------------------------------------------------- */

const CACHE_VERSION = "v1";
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

  // Cache-first for everything else (CSS/JS/JSON/icons).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache successful basic responses.
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
