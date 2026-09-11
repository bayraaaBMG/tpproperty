const CACHE = 'bairx-v5';
const OFFLINE_PAGE = '/';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/zurag/icon-192.png',
  '/zurag/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Don't cache Google Fonts or other CDN requests
  if (!url.origin.includes(self.location.hostname) && !url.origin.includes('fonts.googleapis.com')) {
    return;
  }

  // Network-first for navigation (always try fresh HTML)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Same-origin app code (js/css/html) — network-first so a new deploy is picked up
  // immediately instead of silently serving a stale cached script forever. Cache is
  // only a fallback for when the network is unavailable (offline support).
  if (url.origin.includes(self.location.hostname) && /\.(js|css)$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (fonts, images — rarely change, safe to cache aggressively)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => null);
    })
  );
});
