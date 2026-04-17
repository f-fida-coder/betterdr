/**
 * Service Worker for BetterDR
 * Implements caching strategies and offline support
 */

const CACHE_VERSION = 'v1.0';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

const API_ENDPOINTS_TO_CACHE = [
  '/api/matches',
  '/api/betting/rules',
];

const CACHE_STRATEGY = {
  networkFirst: ['GET'],
  cacheFirst: ['fonts', 'images', 'css'],
  staleWhileRevalidate: ['/api/'],
};

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== RUNTIME_CACHE && name !== ASSETS_CACHE && name !== API_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests: Stale-While-Revalidate
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(
      staleWhileRevalidate(request, API_CACHE)
    );
  }

  // Static assets: Cache First
  if (isStaticAsset(url.pathname)) {
    return event.respondWith(
      cacheFirst(request, ASSETS_CACHE)
    );
  }

  // HTML/App shell: Network First
  event.respondWith(
    networkFirst(request, RUNTIME_CACHE)
  );
});

/**
 * Network First strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cache.match(request) || 
      new Response('Offline - Resource not available', { status: 503 });
  }
}

/**
 * Cache First strategy
 * Use cache, fallback to network
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

/**
 * Stale While Revalidate strategy
 * Return cached immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    return cached || new Response('Offline', { status: 503 });
  });

  return cached || fetchPromise;
}

/**
 * Determine if URL is a static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i.test(pathname);
}

/**
 * Background Sync for offline actions
 * Queue failed requests and retry when online
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bets') {
    event.waitUntil(
      syncPendingBets()
    );
  }
});

async function syncPendingBets() {
  const db = await openDatabase();
  const pending = await getAllFromStore(db, 'pending_bets');
  
  for (const bet of pending) {
    try {
      const response = await fetch('/api/bets/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bet),
      });
      if (response.ok) {
        await deleteFromStore(db, 'pending_bets', bet.id);
      }
    } catch (error) {
      // Keep in queue for retry
      console.warn('Failed to sync bet:', error);
    }
  }
}

/**
 * Open IndexedDB for offline storage
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('betterdr', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_bets')) {
        db.createObjectStore('pending_bets', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all items from object store
 */
function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete from object store
 */
function deleteFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
