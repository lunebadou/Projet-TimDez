const CACHE_NAME = "firewatch-pwa-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.webmanifest"
];


// ============================================================
// INSTALLATION
// ============================================================

self.addEventListener("install", function (event) {

    console.log("🔥 FireWatch Service Worker : installation");

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(function (cache) {

                return cache.addAll(FILES_TO_CACHE);

            })

    );

    self.skipWaiting();

});


// ============================================================
// ACTIVATION
// ============================================================

self.addEventListener("activate", function (event) {

    console.log("🔥 FireWatch Service Worker : activation");

    event.waitUntil(

        caches.keys()
            .then(function (cacheNames) {

                return Promise.all(

                    cacheNames
                        .filter(function (cacheName) {

                            return cacheName !== CACHE_NAME;

                        })
                        .map(function (cacheName) {

                            return caches.delete(cacheName);

                        })

                );

            })

    );

    self.clients.claim();

});


// ============================================================
// REQUÊTES
// ============================================================

self.addEventListener("fetch", function (event) {

    event.respondWith(

        fetch(event.request)
            .then(function (response) {

                return response;

            })
            .catch(function () {

                return caches.match(event.request);

            })

    );

});