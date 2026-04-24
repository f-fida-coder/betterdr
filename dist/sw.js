/**
 * Service Worker for BetterDR
 * Implements caching strategies and offline support
 */

// Bump CACHE_VERSION to purge clients that were serving stale admin/auth
// responses under the old blanket /api/* stale-while-revalidate rule.
const CACHE_VERSION = 'v1.2';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
];

// Only these exact public read-only endpoints are safe to cache. Everything
// else — /api/admin/**, /api/auth/**, /api/wallet/**, /api/bets/**, etc. —
// MUST hit the network so balances and transactions reflect live DB state.
const CACHEABLE_API_PATHS = [
  '/api/matches',
  '/api/matches/sports',
  '/api/betting/rules',
];

const isCacheableApi = (pathname) => (
  CACHEABLE_API_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
);

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

self.addEventListener('message', (event) => {
  const type = event?.data?.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests: only the explicit public, read-only endpoints get SWR.
  // Everything else under /api/ bypasses the SW entirely (authenticated and
  // mutating-adjacent routes like /api/admin/**, /api/auth/**, /api/wallet/**,
  // /api/bets/** must never serve a stale cache — real-time balance, pending,
  // and session state depend on a live response).
  if (url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url.pathname)) {
      return event.respondWith(staleWhileRevalidate(request, API_CACHE));
    }
    return; // fall through to default network handling
  }

  // Navigation requests: App Shell network-first with offline fallback.
  if (request.mode === 'navigate') {
    return event.respondWith(navigationNetworkFirst(request));
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

async function navigationNetworkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch (error) {
    const appShell = await cache.match('/index.html');
    if (appShell) {
      return appShell;
    }
    const assetsCache = await caches.open(ASSETS_CACHE);
    const fallbackShell = await assetsCache.match('/index.html');
    if (fallbackShell) {
      return fallbackShell;
    }
    return new Response('Offline - App shell unavailable', { status: 503 });
  }
}

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
    if (response && response.ok) {
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
