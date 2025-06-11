// vite.config.ts
import path from "path";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';

export default defineConfig({
  plugins: [
    react(),

  ],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api/storage': {
        target: 'http://localhost:8002/storage', // Aponta para o Laravel
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/storage/, ''), // Remove o prefixo /api/storage
      },
    },
  },
});
