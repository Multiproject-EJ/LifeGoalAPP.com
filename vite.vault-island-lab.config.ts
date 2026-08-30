import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    outDir: path.resolve(__dirname, 'dist-vault-island-lab'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'vault-island-lab.html'),
    },
  },
});
