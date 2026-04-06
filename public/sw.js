// ============ Athlete Management — Service Worker ============
const CACHE_NAME = 'athlete-app-v3';

// ---------- Install ----------
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

// ---------- Activate: delete old caches ----------
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ---------- Fetch ----------
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // index.html (ナビゲーションリクエスト) は常にネットワーク優先
  // → アプリ起動時に必ず最新版を取得する
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS/CSS/画像などのアセットはキャッシュ優先（ハッシュ付きファイル名で自動更新）
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch (_) {
        return cached ?? new Response('Offline', { status: 503 });
      }
    })
  );
});
