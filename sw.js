/**
 * Service worker do Kairós PDV (PWA).
 *
 * O app e 100% offline: guardamos o "app shell" (index, css, js e icones)
 * no cache do navegador para que o Kairós PDV abra mesmo sem internet.
 *
 * REGRA IMPORTANTE (18/11/2026):
 *   O HTML (navegacao) e buscado na REDE PRIMEIRO e so depois cai no cache.
 *   Cache-first no HTML quebrava o app depois de uma atualizacao: o index
 *   antigo continuava no cache apontando para um bundle que ja nao existia
 *   no servidor (404) e a tela ficava em branco. Os assets tem hash no nome,
 *   entao podem seguir cache-first com seguranca.
 *
 * Os dados de vendas NAO ficam aqui - eles vivem no localStorage do
 * navegador (ver src/services/db.ts).
 */

const CACHE = 'kairos-pdv-v2';

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

  // Navegacao (HTML): rede primeiro, cache so como reserva offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => {
              cache.put('./index.html', copy);
              cache.put('./', copy);
            });
          }
          return res;
        })
        .catch(() =>
          caches.match('./index.html').then((hit) => hit || caches.match('./'))
        )
    );
    return;
  }

  // Demais recursos: cache primeiro (os arquivos tem hash no nome).
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
        .catch(() => Promise.reject(new Error('offline')));
    })
  );
});
