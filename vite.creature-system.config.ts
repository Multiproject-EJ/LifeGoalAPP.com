import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Explicit review build: no auth entry, live state writes, or production app bootstrap. */
export default defineConfig({
  base: './', plugins: [react()], cacheDir: '.vite-creature-system-cache',
  build: { outDir: 'dist-creature-system', emptyOutDir: true, copyPublicDir: false,
    rollupOptions: { input: 'creature-system-lab.html' } },
});
