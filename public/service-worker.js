/* One-use cleanup worker for the pre-Milestone-1 PortableLM deployment. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.toLowerCase().includes('portablelm'))
        .map((key) => caches.delete(key)),
    );

    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await self.registration.unregister();

    for (const client of clients) {
      try {
        await client.navigate(client.url);
      } catch {
        client.postMessage({ type: 'PORTABLELM_LEGACY_CACHE_CLEARED' });
      }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
