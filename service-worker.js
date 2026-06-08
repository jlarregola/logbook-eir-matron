// Service Worker — funcionamiento 100% offline (esencial: en el paritorio puede no haber wifi)

const CACHE_NAME = 'logbook-eir-matron-v10';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './sync.js',
  './manifest.json',
  './icon.svg',
  './jspdf.umd.min.js',
  './supabase.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Cacheamos cada archivo por separado: si uno fallara, no se cae toda la instalación
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia "stale-while-revalidate": responde al instante con lo cacheado, pero
// en segundo plano descarga la última versión y la guarda para la próxima vez.
// Así las mejoras llegan al teléfono sin quedarse atascado en una versión antigua.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Solo gestionamos archivos propios de la app. Las llamadas a la nube
  // (Supabase) y cualquier otro origen externo van directas a la red sin cachear.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => cached);

      // Si hay copia en caché, la usamos ya (rápido y offline); si no, esperamos a la red
      return cached || networkFetch;
    })
  );
});
