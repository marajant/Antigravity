const CACHE_NAME = 'expense-flow-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/vite.svg'
];

// 1. INSTALL: Cache Static Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

// 2. ACTIVATE: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. FETCH: Strategy
self.addEventListener('fetch', (event) => {
    // Ignore non-http requests (e.g. chrome-extension://)
    if (!event.request.url.startsWith('http')) return;

    // 1. Navigation Requests (Page Load) -> Network First, Fallback to Cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match('/index.html') || caches.match('/');
                })
        );
        return;
    }

    // 2. Static Assets (Fonts, Images, CSS, JS) -> Cache First
    if (
        event.request.destination === 'style' ||
        event.request.destination === 'script' ||
        event.request.destination === 'image' ||
        event.request.destination === 'font'
    ) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 3. Other Requests (APIs, though app is offline-first via Dexie) -> Network Only (or Network First)
    event.respondWith(fetch(event.request));
});
