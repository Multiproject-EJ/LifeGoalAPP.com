import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/LifeGoalAPP.com/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
});
