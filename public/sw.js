// Zephren Service Worker — PWA Offline Mode v3.2
// Vite uses content-hashed filenames (energy-calc-DXTG34GY.js) so
// cache-first for JS/CSS is safe — each deploy produces unique URLs.
// HTML is always network-first to pick up new hashes.
const CACHE_NAME = 'zephren-v3.2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// Install: cache shell assets, skip waiting to activate immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: purge ALL old caches so stale JS/CSS from previous deploys are gone
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API / Supabase / Stripe: network only
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname.includes('supabase') || url.hostname.includes('stripe')) return;

  // HTML navigation: ALWAYS network-first (picks up new asset hashes on deploy)
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Hashed assets (JS/CSS with content hash in filename): cache-first
  // These are immutable — the hash changes on every build
  if (url.pathname.match(/\/assets\/.*-[a-zA-Z0-9]{8}\.(js|css)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Other static assets (fonts, images, manifest): stale-while-revalidate
  if (url.pathname.match(/\.(svg|png|jpg|woff2?|json)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// Background sync for offline project saves
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
