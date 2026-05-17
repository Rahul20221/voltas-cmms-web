/* VOLTAS CMMS PWA Service Worker (online-first, caches app shell) */

const CACHE_NAME = "voltas-cmms-shell-v1";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./manifest.webmanifest",
  "./js/utils.js",
  "./js/api.js",
  "./js/auth.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Don't cache or interfere with cross-origin requests (e.g., Apps Script API).
  if (url.origin !== self.location.origin) return;

  // Navigation requests: go network-first so users always get latest; fallback to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

