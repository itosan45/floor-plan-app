
const CACHE_NAME = 'inspection-report-cache-v17';
// A list of assets to cache for offline-first functionality.
const urlsToCache = [
  // Core application shell
  '/',
  '/index.html',
  '/manifest.json',

  // Icons
  '/icon-192.png',
  '/icon-512.png',

  // Local TypeScript modules
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/components/icons.tsx',
  '/components/Marker.tsx',
  
  // External libraries from CDN
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  
  // Google Fonts CSS (the font files will be cached on-demand by the fetch handler)
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',

  // Core JavaScript modules from esm.sh (as defined in importmap)
  'https://esm.sh/react@^18.2.0',
  'https://esm.sh/react-dom@^18.2.0/client'
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache, pre-caching core assets for offline use.');
        const cachePromises = urlsToCache.map(urlToCache => {
          return fetch(urlToCache).then(response => {
              if (response.ok || response.type === 'opaque') {
                  return cache.put(urlToCache, response);
              }
              console.warn(`Skipping caching for ${urlToCache} - fetch failed with status: ${response.status}`);
          }).catch(err => {
              console.warn(`Skipping caching for ${urlToCache} - fetch failed:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Cache the new response if it's valid
            if (response && (response.ok || response.type === 'opaque')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // Take control of all pages immediately
      self.clients.claim(),
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});
