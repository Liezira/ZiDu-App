import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // FIX: Hapus jspdf, xlsx, framer-motion dari manualChunks
          // karena tidak dipakai di kode → akan error saat build
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons':    ['lucide-react'],
        },
      },
    },
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
  },

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
  },

  server: {
    hmr: { overlay: true },
  },
});
