import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  // Worktrees can share node_modules, but never a mutable optimized-dependency
  // cache: concurrent dev servers otherwise invalidate each other's chunks.
  cacheDir: '.vite-cache',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
});
