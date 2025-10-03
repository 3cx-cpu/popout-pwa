import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 7081,
    host: '127.0.0.1'
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  preview: {
    port: 7081,
    host: '127.0.0.1'
  }
});