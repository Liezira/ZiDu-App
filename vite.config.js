import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // Code splitting — pisah vendor chunks biar browser bisa cache terpisah
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — hampir tidak pernah berubah, cache lama
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — pisah karena besar
          'vendor-supabase': ['@supabase/supabase-js'],
          // Icons — load sekali, cache lama
          'vendor-icons': ['lucide-react'],
          // Heavy libs — hanya load saat dibutuhkan
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-excel': ['xlsx'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Minify lebih agresif
    minify: 'esbuild',
    // Chunk size warning threshold
    chunkSizeWarningLimit: 600,
  },

  // Optimize deps — pre-bundle saat dev server start
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    // Exclude heavy libs dari pre-bundle (lazy load saja)
    exclude: ['jspdf', 'jspdf-autotable', 'xlsx', 'framer-motion'],
  },

  // Faster HMR di development
  server: {
    hmr: { overlay: true },
  },
});
