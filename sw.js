// Bump RELEASE whenever any shipped HTML, JS, CSS, manifest or icon changes.
const RELEASE = 'v8';
// CacheStorage is origin-wide; isolate this app from other GitHub Pages projects.
const CACHE_PREFIX = 'clay-training:' + self.registration.scope + ':';
const CACHE_NAME = CACHE_PREFIX + RELEASE;
const APP_URL = new URL('./', self.registration.scope).href;
const ASSETS = [
  './', './index.html', './style.css', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
].map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  // An incomplete download must not replace the working offline release.
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    cache.addAll(ASSETS.map(url => new Request(url, {cache: 'reload'})))
  ));
  // Deliberately wait for all old app windows to close before activating updates.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Limit interception to this app, including its GitHub Pages subdirectory.
  if (!url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode === 'navigate') {
      // App has no server-side routes. Serve the cached launch page even with a query.
      return (await cache.match(APP_URL)) || fetch(request);
    }
    // One coherent release online and offline; updates arrive via a new worker.
    const cached = await cache.match(request);
    return cached || fetch(request);
  })());
});
