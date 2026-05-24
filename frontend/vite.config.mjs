import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import { constants as zlibConstants } from 'node:zlib'

// PHASE 7 CSS DEFER PLUGIN DISABLED 2026-05-08: the rel="preload" -> stylesheet
// swap was suspected of contributing to white-screen-on-login regression.
// Reverted to vanilla Vite behavior (blocking <link rel=stylesheet>) until
// a safe CSS-deferral path is validated end-to-end in browser.
const deferLazyRouteCss = {
  name: 'defer-lazy-route-css',
  enforce: 'post',
  transformIndexHtml(html) {
    return html;
  },
};

// Pre-compress JS/CSS at build time. Server-side Brotli on Hostinger compresses
// dynamically at ~level 5; building at level 11 saves an extra ~10-15% on
// every cold cache miss. The .htaccess rules below pick up these files via
// content negotiation. Keep `deleteOriginFile: false` so the raw .js/.css
// stay shippable to clients that don't send Accept-Encoding.
const brotliPrecompress = compression({
  algorithm: 'brotliCompress',
  ext: '.br',
  verbose: false,
  threshold: 1024,
  deleteOriginFile: false,
  filter: /\.(js|mjs|css|html|json|svg|wasm)$/i,
  compressionOptions: { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } },
});
const gzipPrecompress = compression({
  algorithm: 'gzip',
  ext: '.gz',
  verbose: false,
  threshold: 1024,
  deleteOriginFile: false,
  filter: /\.(js|mjs|css|html|json|svg|wasm)$/i,
  compressionOptions: { level: 9 },
});

// Bundle visualizer (Phase 12). Emits a treemap of every chunk + module size —
// open it via `npm run analyze` after a build to see what grew. Lives outside
// dist/ so it doesn't ship to production. Run on every build, very cheap.
// build to see what grew. `gzipSize` and `brotliSize` are computed so the
// numbers match what the wire actually sees.
const bundleStats = visualizer({
  filename: '../bundle-stats.html',
  template: 'treemap',
  gzipSize: true,
  brotliSize: true,
  emitFile: false,
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), deferLazyRouteCss, brotliPrecompress, gzipPrecompress, bundleStats],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'esbuild',
    // Vite by default emits <link rel="modulepreload"> in index.html for the
    // entry chunk AND every transitive dependency of every dynamic import the
    // entry can reach. For an SPA where most landing-page visitors never log
    // in, that ships the dashboard / admin / casino / mybets / scoreboard
    // chunks (~500 KB combined) on the public landing page even though
    // they're React.lazy()'d. Filter them out of the initial HTML preload —
    // they'll still load fast when navigated to (the lazy import triggers
    // its own modulepreload at runtime).
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostType }) => {
        if (hostType !== 'html') return deps;
        return deps.filter((dep) => !/-views-[^.]+\.js$/.test(dep));
      },
    },
    // Hardened: previously 'hidden' (maps generated but not referenced).
    // 'hidden' still emits .map files to dist/ which can be fetched directly
    // from the web server even without a sourceMappingURL hint, leaking the
    // entire codebase. Disable map emission outright. If you later wire up a
    // private error-monitoring service (Sentry, Bugsnag), flip this back to
    // 'hidden' AND add a post-build step that uploads maps to that service
    // and deletes them from dist/ before deploy.
    sourcemap: false,
    target: 'es2020',
    // Strip console.* and debugger statements from prod bundle — reduces
    // bundle size and prevents internal log leakage to end users.
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        // Explicit content-hash filenames for aggressive caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // Phase 3A: Aggressive code splitting for faster TTI
        manualChunks: (id) => {
          // Core framework chunks
          if (id.includes('node_modules')) {
            // Fix: react and react-dom are separate packages — use || not &&
            // so each package resolves to the shared vendor-react chunk.
            if (id.includes('/react-dom/') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('react-router') || id.includes('@tanstack/react-query')) {
              return 'vendor-routing';
            }
            return 'vendor-common';
          }
          
          // Shared utilities & contexts (loaded early)
          if (id.includes('src/utils/') || id.includes('src/hooks/')) {
            return 'utils-shared';
          }
          if (id.includes('src/contexts/')) {
            return 'contexts-shared';
          }
          if (id.includes('src/api.js')) {
            return 'app-api';
          }
          
          // Route-specific chunks (lazy loaded on demand)
          // ErrorBoundary and LoadingSpinner are imported by both the entry
          // (main.jsx) and lazy chunks (AdminPanel, UserDashboardShell).
          // Without an explicit rule Rollup co-locates them in admin-views,
          // making admin-views a static entry import and putting its CSS in
          // <head> as a blocking stylesheet. Pin them to utils-shared instead.
          if (id.includes('ErrorBoundary') || id.includes('LoadingSpinner')) {
            return 'utils-shared';
          }
          if (id.includes('Admin')) {
            return 'admin-views';
          }
          if (id.includes('Casino') || id.includes('LiveCasino')) {
            return 'casino-views';
          }
          if (id.includes('Dashboard')) {
            return 'dashboard-views';
          }
          if (id.includes('Scoreboard')) {
            return 'scoreboard-views';
          }
          if (id.includes('MyBets')) {
            return 'mybets-views';
          }
          if (id.includes('Support')) {
            return 'support-views';
          }
        },
      },
    },
    // Warning thresholds (helps identify bloated chunks)
    chunkSizeWarningLimit: 600,
    // Report compression savings
    reportCompressedSize: true,
    // Inline small static assets
    assetsInlineLimit: 8192,
  },
  // Optimize CSS
  css: {
    minify: true,
  },
})

