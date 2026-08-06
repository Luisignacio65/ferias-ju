/* Service Worker — Ferias Captura de Campo
   Objetivo: que la app cargue y funcione SIN internet después de la primera
   vez que se abre con wifi/datos — para usarla en países con restricciones
   de red (ej. China) sin depender de que GitHub Pages responda en ese momento.

   Los datos que capturas (fotos, notas, gastos) NO pasan por aquí — viven en
   IndexedDB del navegador, totalmente aparte de este archivo. Este service
   worker solo cachea el "cascarón" de la app: el HTML y las dos librerías
   de generación de PDF.

   Cómo actualizar la app más adelante: si cambias index.html, sube también
   este archivo con CACHE_NAME incrementado (v1 -> v2, etc.) para forzar a
   que el celular descargue la versión nueva la próxima vez que haya wifi. */

var CACHE_NAME = 'ferias-shell-v1';
var ARCHIVOS_CASCARON = [
  './',
  './index.html',
  './jspdf.umd.min.js',
  './html2canvas.min.js'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ARCHIVOS_CASCARON);
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres.map(function (n) {
          if (n !== CACHE_NAME) return caches.delete(n);
        })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cacheado) {
      // Cache-first: si ya lo tenemos guardado, se usa de inmediato (sirve
      // aunque no haya red). Al mismo tiempo, si SÍ hay red, se refresca la
      // copia guardada en segundo plano para la próxima vez.
      var redFetch = fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200) {
          var copia = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, copia); });
        }
        return resp;
      }).catch(function () { return cacheado; });
      return cacheado || redFetch;
    })
  );
});
