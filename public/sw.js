// Zephren Service Worker — PWA Offline Mode v3.1
const CACHE_NAME = 'zephren-v3.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: stale-while-revalidate for assets, network-first for API
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API calls: network only (don't cache authenticated requests)
  if (url.pathname.startsWith('/api/')) return;

  // Supabase / Stripe: network only
  if (url.hostname.includes('supabase') || url.hostname.includes('stripe')) return;

  // Static assets (JS, CSS, images): cache-first with background update
  if (url.pathname.match(/\.(js|css|svg|png|jpg|woff2?|json)$/)) {
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

  // HTML navigation: network-first with cache fallback
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
});

// Background sync for offline project saves
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
