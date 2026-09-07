// My Garden — service worker
// Caches the app shell so the tracker keeps working offline / on a flaky
// connection. Bump CACHE_NAME whenever app.html (or another cached file)
// changes so returning visitors pick up the new version instead of a
// stale cached copy.
const CACHE_NAME = 'my-garden-cache-v1';
const APP_SHELL = [
  './app.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigation/app shell requests so edits show up as soon
// as the device is back online, falling back to the cached copy when
// offline. Everything else (fonts, etc.) is cache-first to save requests.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isAppShell = APP_SHELL.some((path) => req.url.endsWith(path.replace('./', '')));

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
