// ============ Athlete Management — Service Worker ============
const APP_CACHE  = 'athlete-app-v2';
const CDN_CACHE  = 'athlete-cdn-v2';

const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// ---------- Install: precache local assets ----------
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(LOCAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ---------- Activate: delete old caches ----------
self.addEventListener('activate', (e) => {
  const KEEP = [APP_CACHE, CDN_CACHE];
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------- Fetch: cache-first strategy ----------
self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isCDN = url.hostname !== self.location.hostname;
  const cacheName = isCDN ? CDN_CACHE : APP_CACHE;

  e.respondWith(
    caches.open(cacheName).then(async (cache) => {
      // 1. Check cache first
      const cached = await cache.match(e.request);
      if (cached) {
        // Refresh local cache in background (stale-while-revalidate)
        if (!isCDN) {
          fetch(e.request)
            .then((res) => { if (res.ok) cache.put(e.request, res.clone()); })
            .catch(() => {});
        }
        return cached;
      }

      // 2. Fetch from network and cache the result
      try {
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch (_) {
        // 3. Offline fallback → return cached app shell
        const fallback = await caches.match('/index.html');
        return fallback ?? new Response('Offline', { status: 503 });
      }
    })
  );
});
