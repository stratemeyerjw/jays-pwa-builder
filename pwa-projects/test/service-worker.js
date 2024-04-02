
      const CACHE_NAME = 'test-cache';
      self.addEventListener('install', (event) => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then((cache) => {
              let base = location.href.replace('/service-worker.js', '');
              debugger
              return cache.addAll([
                base+ '/index.html',
                base+ '/assets/icon-small.png', 
                base+ '/assets/icon-large.png',
                base+ '/DevExtreme/css/dx.material.orange.light.css',
                base+ '/jQuery/jquery-3.7.1.min.js',
                base+ '/DevExtreme/js/dx.all.js',
                base+ '/worker.js',
                base+ '/js/index.js',
                base+ '/css/index.css'
              ])
            })
        );
      });
      self.addEventListener('fetch', (event) => {
        event.respondWith(
          caches.match(event.request)
            .then((response) => {
              return fetch(event.request)
                .then((networkResponse) => {
                  // Check if the response is successful before caching and responding
                  if (networkResponse.ok) {
                    const clonedResponse = networkResponse.clone();
      
                    caches.open(CACHE_NAME)
                      .then((cache) => {
                        cache.put(event.request, clonedResponse);
                      });
                  }
      
                  return networkResponse;
                })
                .catch(() => {
                  return response || caches.match('/offline.html');
                });
            })
        );
      });
      
        