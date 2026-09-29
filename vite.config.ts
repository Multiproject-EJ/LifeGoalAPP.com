import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Every VITE_/NEXT_PUBLIC_ variable ends up in the public bundle (the app reads
// import.meta.env as a whole object), so provider secrets must never use those
// prefixes. AI keys live only in Supabase edge function secrets (ai-task).
const FORBIDDEN_PUBLIC_ENV = ['VITE_OPENAI_API_KEY', 'NEXT_PUBLIC_OPENAI_API_KEY'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const leaked = FORBIDDEN_PUBLIC_ENV.filter((name) => env[name]?.trim());
  if (leaked.length > 0) {
    throw new Error(
      `${leaked.join(', ')} is set, and would ship to every browser. Remove it from the build `
      + 'environment; the ai-task edge function holds the OpenAI key as a server secret.',
    );
  }

  return {
    base: '/',
    // Worktrees can share node_modules, but never a mutable optimized-dependency
    // cache: concurrent dev servers otherwise invalidate each other's chunks.
    cacheDir: '.vite-cache',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          app: 'index.html',
          creatureSystemLab: 'creature-system-lab.html',
        },
      },
    },
    server: {
      port: 5173,
      open: true,
    },
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  };
});
