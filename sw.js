var CACHE_NAME = 'mis-finanzas-v3';
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

// Red primero con limite de tiempo: si la red tarda mas de NETWORK_TIMEOUT_MS
// (datos moviles lentos/inestables), usamos la copia en cache de inmediato en
// vez de dejar al usuario viendo la pantalla principal sin avanzar. La
// peticion de red sigue en marcha de todas formas y actualiza la cache para
// la proxima vez. Solo aplica al propio sitio; las llamadas a la API de Apps
// Script nunca se tocan aqui.
var NETWORK_TIMEOUT_MS = 3000;

function timeout(ms) {
  return new Promise(function (resolve) {
    setTimeout(function () { resolve(null); }, ms);
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf(self.location.origin) !== 0) return;

  var networkFetch = fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
    return res;
  }).catch(function () { return null; });

  event.respondWith(
    Promise.race([networkFetch, timeout(NETWORK_TIMEOUT_MS)]).then(function (res) {
      if (res) return res;
      // La red no respondio a tiempo (o fallo): usa cache si existe.
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        // Sin cache todavia (primera visita en red lenta): espera la red sin limite.
        return networkFetch.then(function (res2) {
          return res2 || caches.match('./index.html');
        });
      });
    })
  );
});
