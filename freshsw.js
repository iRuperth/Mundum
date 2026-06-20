// Dev "always fresh" service worker for Mundum (root scope → covers / and /previews).
// Problem: when you edit a model in src/*.js and reload a preview, the browser
// serves the CACHED module, so you keep seeing the OLD creature/character. This SW
// makes every same-origin GET go to the NETWORK with the HTTP cache bypassed, so a
// reload always pulls the latest source — no more stale previews. It caches nothing
// itself; it only forces freshness. (Harmless for the live game too.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // leave CDNs/externals alone
  event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => fetch(req)));
});
