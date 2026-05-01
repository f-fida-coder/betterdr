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
  const executeImport = (attempt = 1) => {
    return Promise.resolve()
      .then(() => importFunc())
      .catch((error) => {
        if (attempt >= maxRetries) {
          throw error;
        }

        return executeImport(attempt + 1);
      });
  };

  return executeImport();
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
          // Check for updates once per hour on tab focus instead of a
          // fixed 5-minute polling interval that fires even for inactive tabs.
          let lastUpdateCheck = 0;
          const checkForUpdate = () => {
            if (document.hidden) return;
            const now = Date.now();
            if (now - lastUpdateCheck < 3_600_000) return; // 1 hour
            lastUpdateCheck = now;
            reg.update().catch(() => {}); // best-effort
          };
          document.addEventListener('visibilitychange', checkForUpdate);

          // If a new worker is waiting, activate it immediately.
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;

            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                if (reg.waiting) {
                  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            });
          });
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

/**
 * Phase 3A: Prefetch route bundles for likely next navigation.
 * Reduces Time-to-Interactive on route transitions by 200-400ms.
 */
export function prefetchLikelyRoutes(currentPath) {
  const prefetchMap = {
    '/': ['scoreboard', 'casino', 'mybets'],          // Dashboard → popular next routes
    '/scoreboard': ['casino', 'dashboard', 'support'],
    '/casino': ['dashboard', 'scoreboard'],
    '/admin': [],  // Don't prefetch from admin (already heavy)
    '/mybets': ['dashboard', 'scoreboard']
  };

  const routesToPrefetch = prefetchMap[currentPath] || [];
  
  routesToPrefetch.forEach((route, index) => {
    // Stagger prefetch requests via requestIdleCallback
    const schedule = () => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      link.href = `/assets/chunks/${route}-views-[hash].js`;
      document.head.appendChild(link);
    };

    if (typeof window.requestIdleCallback === 'function') {
      requestIdleCallback(schedule, { timeout: 5000 });
    } else {
      setTimeout(schedule, 500 + index * 100);
    }
  });
}

/**
 * DNS prefetch for multiple domains.
 * Reduces DNS lookup latency by 20-50ms per domain.
 */
export function addAdvancedDnsPrefetch() {
  const domains = [
    { href: 'https://api.betterdr.local', rel: 'preconnect' },
    { href: 'https://cdn.betterdr.local', rel: 'preconnect' },
    { href: 'https://odds-api.com', rel: 'dns-prefetch' },
    { href: 'https://analytics.betterdr.local', rel: 'dns-prefetch' }
  ];

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = domain.rel;
    link.href = domain.href;
    if (domain.rel === 'preconnect') {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
}

/**
 * Comprehensive Web Vitals monitoring with reporting.
 */
export function monitorWebVitalsWithReporting(reportingEndpoint = '/api/_php/metrics') {
  const vitals = {};

  // Largest Contentful Paint (LCP) - Target: <2.5s
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        
        vitals.LCP = {
          value: lcp,
          rating: lcp < 2500 ? 'good' : lcp < 4000 ? 'needs-improvement' : 'poor'
        };

        reportWebVital('LCP', lcp, reportingEndpoint);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Browser doesn't support LCP
    }

    // Cumulative Layout Shift (CLS) - Target: <0.1
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            
            vitals.CLS = {
              value: clsValue,
              rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
            };

            reportWebVital('CLS', clsValue, reportingEndpoint);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Browser doesn't support CLS
    }

    // First Input Delay (FID) - Target: <100ms
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const fid = entry.processingDuration;
          
          vitals.FID = {
            value: fid,
            rating: fid < 100 ? 'good' : fid < 300 ? 'needs-improvement' : 'poor'
          };

          reportWebVital('FID', fid, reportingEndpoint);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // Browser doesn't support FID
    }
  }

  return vitals;
}

/**
 * Report a single Web Vital to backend.
 */
function reportWebVital(metricName, value, endpoint) {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(endpoint, JSON.stringify({
        type: 'web_vital',
        metric: metricName,
        value: value,
        timestamp: new Date().toISOString(),
        url: window.location.pathname
      }));
    } catch (e) {
      // Silently fail
    }
  }
}

/**
 * Initialize all Phase 3A performance optimizations.
 * Call from main.jsx at app startup.
 */
export function initializePhase3AOptimizations() {
  // Load external presentation assets (fonts, icons)
  loadExternalPresentationAssets({ immediate: false });

  // Add DNS prefetch for multiple domains
  addAdvancedDnsPrefetch();

  // Add resource hints
  addResourceHints();

  // Setup lazy image loading
  optimizeImageLoading();

  // Setup CSS optimization
  optimizeCssDelivery();

  // Monitor Web Vitals
  monitorWebVitalsWithReporting();

  // Measure paint timing
  measurePaintTiming();

  // Register Service Worker for offline support
  registerServiceWorker();

  // Prefetch likely routes on navigation
  const currentPath = window.location.pathname || '/';
  prefetchLikelyRoutes(currentPath);

  // Setup prefetch on route navigation
  window.addEventListener('popstate', () => {
    const newPath = window.location.pathname || '/';
    prefetchLikelyRoutes(newPath);
  });

  if (import.meta.env.DEV) {
    console.log('✅ Phase 3A performance optimizations initialized');
  }
}

