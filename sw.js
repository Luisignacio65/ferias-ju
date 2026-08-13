/* Service Worker — Ferias Captura de Campo
   Objetivo: que la app cargue y funcione SIN internet después de la primera
   vez que se abre con wifi/datos — para usarla en países con restricciones
   de red (ej. China) sin depender de que GitHub Pages responda en ese momento.

   Los datos que capturas (fotos, notas, gastos) NO pasan por aquí — viven en
   IndexedDB del navegador, totalmente aparte de este archivo. Este service
   worker cachea el "cascarón" de la app (HTML + librerías de PDF) y, además,
   el motor de lectura automática de comprobantes (OCR: español/inglés/
   francés/chino) con sus datos de idioma — en total ~14 MB, una sola vez.

   Cómo actualizar la app más adelante: si cambias index.html, sube también
   este archivo con CACHE_NAME incrementado (v1 -> v2, etc.) para forzar a
   que el celular descargue la versión nueva la próxima vez que haya wifi. */

var CACHE_NAME = 'ferias-shell-v8';
var ARCHIVOS_ESENCIALES = [
  './',
  './index.html',
  './jspdf.umd.min.js',
  './html2canvas.min.js'
];
var ARCHIVOS_OCR = [
  './tesseract.min.js',
  './worker.min.js',
  './tesseract-core.js',
  './tesseract-core.wasm',
  './eng.traineddata',
  './spa.traineddata',
  './fra.traineddata',
  './chi_sim.traineddata'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // El cascarón esencial (chico) debe quedar cacheado sí o sí para que
      // la app abra offline. Los archivos de OCR pesan más (~14 MB): se
      // cachean aparte, uno por uno, para que un fallo puntual en uno de
      // ellos (ej. wifi débil) no tumbe el cascarón esencial ya logrado.
      return cache.addAll(ARCHIVOS_ESENCIALES).then(function () {
        return Promise.all(ARCHIVOS_OCR.map(function (url) {
          return fetch(url).then(function (resp) {
            if (resp && resp.ok) return cache.put(url, resp);
          }).catch(function () { /* se reintenta solo en la próxima visita con red */ });
        }));
      });
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
