import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  publicDir: false,
  build: {
    outDir: path.resolve(__dirname, 'preview-bundle'),
    emptyOutDir: true,
    sourcemap: false,
    manifest: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/bootstrap.ts'),
      output: {
        entryFileNames: 'app.js',
        inlineDynamicImports: true,
        assetFileNames: (chunkInfo) => {
          if (chunkInfo.name && chunkInfo.name.endsWith('.css')) {
            return 'style.css';
          }
          return 'asset-[name][extname]';
        },
      },
    },
  },
});
