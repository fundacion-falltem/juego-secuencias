// FALLTEM — Secuencias — SW simple para uso offline
const CACHE_NAME = 'secuencias-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './images/icon-192.png',
  './images/icon-512.png',
  './sounds/success-answer.mp3',
  './sounds/wrong-answer.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((r) => r || fetch(event.request))
  );
});
