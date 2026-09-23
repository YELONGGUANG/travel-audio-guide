const CACHE = 'travel-audio-guide-shell-v3';
const SHELL = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok && !response.redirected) await cache.put(url, response);
      } catch (error) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.toLowerCase().endsWith('.mp3') || event.request.destination === 'audio') return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && !response.redirected && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      return await caches.match(event.request) || await caches.match('./index.html') || Promise.reject(error);
    }
  })());
});
