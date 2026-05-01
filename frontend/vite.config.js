import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    sourcemap: 'hidden', // Debugging without exposing source
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
            if (id.includes('recharts') || id.includes('chart.js')) {
              return 'vendor-charts';
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

