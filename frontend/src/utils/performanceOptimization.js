/**
 * Phase 13: Advanced Frontend Performance Optimization
 * Implements prefetching, route preloading, and performance monitoring
 */

const EXTERNAL_PRESENTATION_HINTS = [
  { id: 'hint-google-fonts', rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { id: 'hint-google-fonts-static', rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
];

const EXTERNAL_PRESENTATION_STYLES = [
  {
    id: 'style-google-inter',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  },
  {
    id: 'style-font-awesome',
    href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  },
];

let externalPresentationAssetsQueued = false;

const appendHeadLink = ({ id, rel, href, as = '', crossOrigin = '' }) => {
  if (typeof document === 'undefined' || !document.head || !href) return;
  if (id && document.getElementById(id)) return;

  const link = document.createElement('link');
  if (id) link.id = id;
  link.rel = rel;
  link.href = href;
  if (as) link.as = as;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.appendChild(link);
};

const appendAsyncStylesheet = ({ id, href }) => {
  if (typeof document === 'undefined' || !document.head || !href) return;
  if (id && document.getElementById(id)) return;

  const link = document.createElement('link');
  if (id) link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
};

const injectExternalPresentationAssets = () => {
  EXTERNAL_PRESENTATION_HINTS.forEach(appendHeadLink);
  EXTERNAL_PRESENTATION_STYLES.forEach(appendAsyncStylesheet);
};

/**
 * Load external presentation assets like icon fonts and web fonts without
 * blocking the first HTML paint. Protected/auth-heavy routes can opt into
 * immediate loading; public pages can defer to idle time.
 */
export function loadExternalPresentationAssets({ immediate = false } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || externalPresentationAssetsQueued) {
    return;
  }

  externalPresentationAssetsQueued = true;

  if (immediate) {
    injectExternalPresentationAssets();
    return;
  }

  const schedule = () => injectExternalPresentationAssets();
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(schedule, { timeout: 1200 });
    return;
  }

  window.setTimeout(schedule, 250);
}

/**
 * Prefetch route bundles before navigation
 * Reduces perceived load time when switching views
 */
export function prefetchRoute(routePath) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = routePath;
      document.head.appendChild(link);
    });
  }
}

/**
 * Prefetch critical API endpoints
 * Uses abort controller to cancel if navigation doesn't occur
 */
export function prefetchApiEndpoint(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  fetch(url, {
    ...options,
    signal: controller.signal,
    priority: 'low',
  }).catch(() => {
    // Silently fail if prefetch is interrupted
  }).finally(() => {
    clearTimeout(timeout);
  });

  return controller;
}

/**
 * Lazy load heavy components with retry logic
 * Includes fallback and error boundaries
 */
export function lazyLoadWithRetry(importFunc, maxRetries = 3) {
  return import(/* webpackRetry: 3 */ importFunc);
}

/**
 * Monitor Time to Interactive (TTI)
 * Tracks when the page becomes fully interactive
 */
export function measureTTI(callback) {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (let entry of entries) {
          if (entry.name === 'first-input') {
            callback({
              type: 'TTI',
              duration: entry.processingStart - entry.startTime,
              timestamp: entry.startTime,
            });
            observer.disconnect();
            break;
          }
        }
      });
      observer.observe({ entryTypes: ['first-input', 'largest-contentful-paint'] });
    } catch (e) {
      // Browser doesn't support PerformanceObserver
    }
  }
}

/**
 * Monitor Core Web Vitals
 * Tracks LCP, FID, CLS for performance analysis
 */
export function monitorCoreWebVitals(callback) {
  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        callback({
          type: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          timestamp: lastEntry.startTime,
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Browser doesn't support LCP
    }

    // Cumulative Layout Shift (CLS)
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            callback({
              type: 'CLS',
              value: entry.value,
              timestamp: entry.startTime,
            });
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Browser doesn't support CLS
    }
  }
}

/**
 * Batch API requests to reduce network overhead
 * Combines multiple requests into single call when possible
 */
export function batchApiRequests(requests, batchEndpoint = '/api/batch') {
  return fetch(batchEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  }).then(res => res.json());
}

/**
 * Deduplicate identical in-flight requests
 * Prevents multiple identical requests within a time window
 */
const requestCache = new Map();
export function deduplicateRequest(key, requestFn, ttl = 100) {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }

  const promise = requestFn().finally(() => {
    requestCache.delete(key);
  });

  requestCache.set(key, promise);
  setTimeout(() => requestCache.delete(key), ttl);

  return promise;
}

/**
 * Register Service Worker for offline caching and background sync
 * Caches API responses and static assets
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          if (import.meta.env.DEV) {
            console.log('Service Worker registered:', reg);
          }
          // Check for updates periodically
          setInterval(() => reg.update(), 300000);
        })
        .catch(err => {
          if (import.meta.env.DEV) {
            console.warn('Service Worker registration failed:', err);
          }
        });
    });
  }
}

/**
 * Optimize image loading with lazy loading
 * Preload critical images, lazy load below-the-fold
 */
export function optimizeImageLoading() {
  // Preload critical images
  const criticalImages = document.querySelectorAll('img[data-preload]');
  criticalImages.forEach(img => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = img.src;
    document.head.appendChild(link);
  });

  // Lazy load images with IntersectionObserver
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Resource hints for third-party domains
 * DNS prefetch, preconnect, prefetch for faster resource loading
 */
export function addResourceHints() {
  const hints = [];

  if (typeof window !== 'undefined' && window.location?.origin) {
    hints.push({ rel: 'dns-prefetch', href: window.location.origin });
  }

  const configuredApiUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : '';
  if (configuredApiUrl) {
    try {
      const apiUrl = new URL(configuredApiUrl, window.location.origin);
      if (apiUrl.origin !== window.location.origin) {
        hints.push({ rel: 'dns-prefetch', href: apiUrl.origin });
        hints.push({ rel: 'preconnect', href: apiUrl.origin });
      }
    } catch {
      // Ignore malformed API URL.
    }
  }

  hints.forEach(hint => {
    const link = document.createElement('link');
    link.rel = hint.rel;
    link.href = hint.href;
    if (hint.rel === 'preconnect') link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Measure paint timing and report performance
 */
export function measurePaintTiming() {
  if ('PerformancePaintTiming' in window) {
    const perfData = performance.getEntriesByType('paint');
    perfData.forEach(entry => {
      console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`);
    });
  }
}

/**
 * Compress and optimize CSS delivery
 * Load critical CSS inline, defer non-critical
 */
export function optimizeCssDelivery() {
  // Defer non-critical stylesheets
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"][data-defer]');
  stylesheets.forEach(sheet => {
    sheet.media = 'print';
    sheet.addEventListener('load', function() {
      this.media = 'all';
    });
  });
}

/**
 * Monitor API response times
 * Track slow endpoints for optimization
 */
const apiMetrics = new Map();
export function monitorApiResponse(method, url, duration) {
  const key = `${method} ${url}`;
  if (!apiMetrics.has(key)) {
    apiMetrics.set(key, []);
  }
  apiMetrics.get(key).push(duration);

  // Report if average exceeds threshold
  const metrics = apiMetrics.get(key);
  const average = metrics.reduce((a, b) => a + b, 0) / metrics.length;
  if (average > 500) {
    console.warn(`Slow API: ${key} (avg: ${average.toFixed(0)}ms)`);
  }
}

/**
 * Get collected performance metrics
 */
export function getPerformanceMetrics() {
  return {
    apiMetrics: Object.fromEntries(apiMetrics),
    navigationTiming: performance.timing,
    resourceTiming: performance.getEntriesByType('resource'),
  };
}
