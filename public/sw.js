/**
 * Service Worker for SML Guardian (Sprint 12)
 *
 * Provides offline support through caching strategies:
 * - Static assets: Cache-first (HTML, CSS, JS)
 * - API calls: Network-first with cache fallback
 * - ML models: Cache-first (large downloads from HuggingFace)
 */

const CACHE_NAME = 'sml-guardian-v1';
const STATIC_CACHE = 'sml-guardian-static-v1';
const MODEL_CACHE = 'sml-guardian-models-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] ✅ Service worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] ❌ Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Remove old caches
              return name !== STATIC_CACHE &&
                     name !== MODEL_CACHE &&
                     name !== CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Strategy 1: ML Models from HuggingFace - Cache first (large files)
  if (url.hostname === 'huggingface.co' || url.hostname.includes('cdn-lfs')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving model from cache:', url.pathname);
            return cachedResponse;
          }

          console.log('[SW] Downloading model:', url.pathname);
          return fetch(request)
            .then((response) => {
              // Cache the model for offline use
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(MODEL_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
    return;
  }

  // Strategy 2: API calls - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache on network failure
          return caches.match(request);
        })
    );
    return;
  }

  // Strategy 3: Static assets - Cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, but update cache in background
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, response));
              }
            })
            .catch(() => {
              // Ignore network errors for background updates
            });

          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Cache for next time if it's a JS/CSS file
            if (response.ok && (request.url.endsWith('.js') ||
                                request.url.endsWith('.css') ||
                                request.url.endsWith('.wasm'))) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((name) => caches.delete(name))
          );
        })
        .then(() => {
          console.log('[SW] ✅ All caches cleared');
        })
    );
  }
});
