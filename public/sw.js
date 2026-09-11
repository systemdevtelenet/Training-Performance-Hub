// Service Worker for Training Performance Hub PWA
const CACHE_NAME = 'tph-cache-v2';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - cleans up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept API, Supabase, Next.js internal data, or navigation requests
  if (
    url.pathname.startsWith('/api/') || 
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/_next/') ||
    event.request.mode === 'navigate'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});
