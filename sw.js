var CACHE_NAME = 'mis-finanzas-v2';
var ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Estrategia: red primero (para que las actualizaciones se vean de inmediato),
// con la cache como respaldo si no hay conexion. Solo para el propio sitio;
// las llamadas a la API de Apps Script nunca se tocan aqui.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf(self.location.origin) !== 0) return;

  event.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
