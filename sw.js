// My Garden Service Worker
// One fixed cache name — no manual version bumping needed anywhere in
// this file. Freshness is handled by strategy: every file that makes up
// the app shell (the HTML, the manifest, the icon) is checked against the
// network first, so code changes AND branding changes (app name, icon,
// theme color in manifest.webmanifest) both show up automatically the
// next time the app opens with a connection. Cached copies are only used
// as a fallback when there's no network at all (true offline use).
const CACHE_NAME = 'my-garden-cache';
const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

function isAppShellRequest(request){
  if (request.mode === 'navigate') return true;
  return APP_SHELL_FILES.some(f => request.url.endsWith(f.replace('./', '')) || request.url.endsWith(f));
}

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL_FILES).catch(() => {
        // Silently fail if files not found
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up any old cache names from earlier versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip non-GET requests and third-party services this app calls directly
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('api.')) return;
  if (event.request.url.includes('googleapis')) return;
  if (event.request.url.includes('cloudflare')) return;
  if (event.request.url.includes('supabase')) return;
  if (event.request.url.includes('jsdelivr')) return;

  if (isAppShellRequest(event.request)) {
    // Network-first: always try to get the latest version of the app
    // shell (HTML, manifest, icon). Only falls back to the last cached
    // copy if there's no network at all.
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
      })
    );
    return;
  }

  // Anything else this app happens to request isn't part of the precached
  // shell — just pass it straight through to the network.
});
