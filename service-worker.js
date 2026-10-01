<<<<<<< HEAD
const CACHE = 'deqx-fit-v49-acid-green-hologram';
=======
const CACHE = 'deqx-fit-v46-badminton-half-activity-burn';
>>>>>>> 0f03ac5efda652c86790879dfaa74ae2c2c1737d
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
<<<<<<< HEAD
  './hologram.js',
  './supabase-sync.js',
  './manifest.json',
  './icon.svg',
  './assets/hologram-front.jpg',
  './assets/hologram-back.jpg'
=======
  './supabase-sync.js',
  './manifest.json',
  './icon.svg'
>>>>>>> 0f03ac5efda652c86790879dfaa74ae2c2c1737d
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy));
        return r;
      }))
    );
  }
});
