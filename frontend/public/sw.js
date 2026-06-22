/*
 * Self-destructing service worker.
 *
 * The app NO LONGER uses a service worker. A previous caching worker caused
 * stale bundles to stick on clients — notably a phone kept serving an old build
 * after a deploy, so mobile and desktop diverged. This file exists ONLY to
 * evict that worker from any client that still has it registered: on activation
 * it deletes every cache, unregisters itself, and reloads open tabs so they
 * fetch fresh code from the network. New clients never register a worker, and
 * the app actively unregisters on load (see unregisterLegacyServiceWorker).
 *
 * Do not add caching logic here. If a worker is ever reintroduced, do it in a
 * new file/scope so this self-destruct can fully retire first.
 */

self.addEventListener('install', () => {
  // Activate immediately, replacing any previously-installed caching worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1) Purge every cache this origin holds (old assets/api/runtime caches).
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch (e) {
      // best-effort — ignore
    }
    // 2) Unregister this worker so no future request is intercepted.
    try {
      await self.registration.unregister();
    } catch (e) {
      // ignore
    }
    // 3) Reload open tabs so they re-fetch index.html + chunks from the network
    //    (uncontrolled now), landing them on the latest deployed bundle.
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    } catch (e) {
      // ignore
    }
  })());
});

// Older app builds post SKIP_WAITING after an update is found — honor it so
// this self-destruct worker takes over promptly.
self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// No fetch handler: the browser goes straight to the network for everything.
