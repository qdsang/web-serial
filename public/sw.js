const CACHE_NAME = 'web-serial-debug-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.ts',
  '/src/App.vue',
  '/src/style.css',
  '/src/components/SerialLog.vue',
  '/src/components/SerialConfig.vue',
  '/src/components/SerialSend.vue',
  '/src/components/SerialQuickSend.vue',
  '/src/components/SerialScript.vue',
  '/src/components/SerialSettings.vue',
  '/src/utils/ConfigManager.ts',
  '/src/utils/SerialHelper.ts'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});