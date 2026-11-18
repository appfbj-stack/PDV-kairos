/**
 * Service worker do Kairós PDV (PWA).
 *
 * O app e 100% offline: guardamos o "app shell" (index, css, js e icones)
 * no cache do navegador para que o Kairós PDV abra mesmo sem internet.
 *
 * Regra: cache-first para o shell, rede apenas para o que ainda nao existe
 * no cache. Os dados de vendas NAO ficam aqui — eles vivem no localStorage
 * do navegador (ver src/services/db.ts).
 */
const CACHE = 'kairos-pdv-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          // offline e recurso novo: devolve o index (SPA)
          req.mode === 'navigate'
            ? caches.match('./index.html')
            : Promise.reject(new Error('offline'))
        );
    })
  );
});
