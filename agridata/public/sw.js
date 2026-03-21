// public/sw.js

// ==========================================
// 1. OFFLINE CACHING ENGINE (PWA)
// ==========================================
const CACHE_NAME = 'agridata-static-v3';
const DATA_CACHE_NAME = 'agridata-data-v3';
const MAP_CACHE_NAME = 'agridata-map-tiles-v1'; // Added map cache

// Add the URLs of your main UI files here
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png' // Make sure the logo is cached for offline notifications
];

// INSTALLATION: Cache the static files (UI, layouts)
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// ACTIVATION: Clean up old caches if we update the app versions above
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME && key !== MAP_CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// FETCHING: How to handle requests (Online vs Offline)
self.addEventListener('fetch', (evt) => {
  
  // --- 1. CACHE MAP TILES (CartoDB / OpenStreetMap) ---
  if (evt.request.url.includes('basemaps.cartocdn.com') || evt.request.url.includes('openstreetmap.org')) {
    evt.respondWith(
      caches.match(evt.request).then((cachedResponse) => {
        // Return the cached map tile if we have it
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If not, fetch it from the internet and save it for next time
        return fetch(evt.request).then((networkResponse) => {
          return caches.open(MAP_CACHE_NAME).then((cache) => {
            cache.put(evt.request.url, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(() => {
        // If offline and we don't have the tile, just return nothing to prevent breaking
        return new Response(); 
      })
    );
    return; // Stop processing this request
  }

  // --- 2. IF IT IS AN API REQUEST (Data from your Flask/Laravel backend) ---
  if (evt.request.url.includes('/api/')) {
    if (evt.request.method === 'GET') {
      evt.respondWith(
        caches.open(DATA_CACHE_NAME).then((cache) => {
          return fetch(evt.request)
            .then((response) => {
              // If internet works, save a fresh copy of the data and return it
              if (response.status === 200) {
                cache.put(evt.request.url, response.clone());
              }
              return response;
            })
            .catch(() => {
              // IF OFFLINE: Return the last saved data
              return cache.match(evt.request);
            });
        })
      );
    }
    return; // Do not cache POST/PUT/DELETE requests in the service worker
  }

  // --- 3. IF IT IS A PAGE OR IMAGE (UI stuff) ---
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(evt.request.url, fetchRes.clone());
          return fetchRes;
        });
      });
    }).catch(() => {
      // Fallback if everything fails (e.g., user refreshes on an offline page)
      if (evt.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});


// ==========================================
// 2. PUSH NOTIFICATION ENGINE
// ==========================================

self.addEventListener('push', (event) => {
  // Parse the notification data from the server
  const data = event.data ? event.data.json() : { title: 'AgriData', body: 'New notification!' };
  
  const options = {
    body: data.body,
    icon: '/logo192.png', 
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Open the window to the URL provided in the notification data
  event.waitUntil(clients.openWindow(event.notification.data.url));
});