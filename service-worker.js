const CACHE = 'deqx-fit-v51-component-architecture';
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './hologram.js',
  './supabase-sync.js',
  './manifest.json',
  './icon.svg',
  './assets/hologram-front.jpg',
  './assets/hologram-back.jpg',
  './css/variables.css',
  './css/base.css',
  './css/components/navigation.css',
  './css/components/hologram.css',
  './js/core/utils.js',
  './js/core/state.js',
  './js/core/gamification.js',
  './js/data/foods.data.js',
  './js/data/activities.data.js',
  './js/data/routines.data.js',
  './js/components/hologram.component.js',
  './js/components/navigation.component.js',
  './js/components/home.component.js',
  './js/components/food.component.js',
  './js/components/activity.component.js',
  './js/components/workout.component.js',
  './js/components/budget.component.js',
  './js/components/profile.component.js',
  './js/components/modals.component.js'
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
