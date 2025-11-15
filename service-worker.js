const CACHE_NAME = 'tradingview-terminal-v2';
const RUNTIME_CACHE = 'tradingview-runtime-v2';

const PRECACHE_URLS = [
  '/mobi.html',
  '/desktop.html',
  '/styles.css',
  '/mobi-styles.css',
  '/app.js',
  '/mobi-app.js',
  '/menu.js',
  '/save-load-adapter.js',
  '/favicon.ico',
  '/charting_library/charting_library.js',
  '/image/icons/icon-192x192.png',
  '/image/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip WebSocket and EventSource requests
  if (request.headers.get('upgrade') === 'websocket' || 
      request.destination === 'eventsource') {
    return;
  }

  // Skip API calls and external data
  if (url.pathname.includes('/api/') || 
      url.pathname.includes('/datafeed/') ||
      url.pathname.includes('/socket.io/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Don't cache opaque responses (can cause issues on iOS)
        if (response.type === 'opaque') {
          return response;
        }

        // Don't cache navigation requests (HTML pages) in runtime cache
        // This prevents redirect issues on iOS
        if (request.mode === 'navigate') {
          return response;
        }

        // Cache other resources (JS, CSS, images, etc.)
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch((error) => {
        // If fetch fails, try to return cached version
        console.log('Fetch failed; returning offline page instead.', error);
        
        // For navigation requests, return the cached HTML
        if (request.mode === 'navigate') {
          return caches.match('/mobi.html').then((response) => {
            return response || new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        }
        
        return new Response('Network error', {
          status: 408,
          statusText: 'Request Timeout'
        });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
