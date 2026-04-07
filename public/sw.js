// Zephren Service Worker — PWA Offline Mode v3.5
// Strategii: HTML → network-first, JS/CSS hashed → cache-first,
// alte assets → stale-while-revalidate, API → network-only.
// Background Sync pentru salvare proiecte când conexiunea revine.
const CACHE_NAME = 'zephren-v3.5';
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
        .catch(() => caches.match(e.request)
          .then(cached => cached || caches.match('/'))
          .then(cached => cached || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } }))
        )
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

// ── Offline fallback HTML ────────────────────────────────────────
const OFFLINE_HTML = `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zephren — Offline</title>
<style>
  body{background:#0d1117;color:#e2e8f0;font-family:DM Sans,system-ui,sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem}
  .card{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2rem;max-width:420px;text-align:center}
  h1{color:#f59e0b;margin:0 0 .5rem}
  p{color:#94a3b8;font-size:.9rem;margin:.5rem 0}
  button{background:#f59e0b;color:#0d1117;border:none;padding:.6rem 1.4rem;border-radius:.5rem;
    font-weight:600;cursor:pointer;margin-top:1rem;font-size:.9rem}
  button:hover{background:#fbbf24}
</style></head><body>
<div class="card">
  <div style="font-size:3rem">📡</div>
  <h1>Zephren</h1>
  <p>Nu există conexiune la internet.</p>
  <p>Proiectele salvate local sunt disponibile după reconectare.</p>
  <p style="font-size:.75rem;color:#475569">Datele introduse sunt salvate automat în browserul dvs.</p>
  <button onclick="window.location.reload()">Reîncearcă conexiunea</button>
</div></body></html>`;

// ── Background sync ──────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-projects') {
    e.waitUntil(syncPendingProjects());
  }
});

async function syncPendingProjects() {
  // Proiectele offline sunt stocate în IndexedDB de aplicație
  // SW notifică clientul că poate resincroniza cu Supabase
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'SYNC_READY' }));
}

// ── Messages ─────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data?.type === 'CACHE_PROJECT') {
    // Cache date proiect pentru acces offline
    caches.open(CACHE_NAME).then(cache => {
      const blob = new Blob([JSON.stringify(e.data.project)], { type: 'application/json' });
      cache.put(`/offline-project-${e.data.id}`, new Response(blob));
    });
  }
});
