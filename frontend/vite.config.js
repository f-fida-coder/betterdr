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
    minify: true, // Use default minifier (esbuild)
    rollupOptions: {
      output: {
        // Explicit content-hash filenames so browsers never serve stale JS/CSS.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Advanced code splitting for better caching
        manualChunks: (id) => {
          // Keep shared app API/auth code out of admin-only chunks so the
          // public landing page doesn't preload dashboard/admin bundles.
          if (id.includes('/src/api.js')) {
            return 'app-api';
          }
          // Vendor chunk for node_modules
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('router') || id.includes('@tanstack')) {
              return 'vendor-routing';
            }
            return 'vendor-common';
          }
          // Separate chunks for admin views
          if (id.includes('admin-views')) {
            return 'admin-views';
          }
          // Separate chunks for casino views
          if (id.includes('Casino') || id.includes('LiveCasino')) {
            return 'casino-views';
          }
        },
      },
    },
    // Optimize chunk splitting
    chunkSizeWarningLimit: 1000,
    // Improved source maps for production debugging
    sourcemap: 'hidden',
    // Reduce JS parsing time with es2020 target
    target: 'es2020',
  },
  // CSS optimization
  css: {
    postcss: {
      plugins: [
        {
          postcssPlugin: 'inline-critical-css',
          Once(root) {
            // Mark critical CSS with special comment for inline extraction
            root.walkComments(comment => {
              if (comment.text.includes('critical')) {
                comment.root().insertBefore(comment.prev(), comment);
              }
            });
          },
        },
      ],
    },
  },
})
