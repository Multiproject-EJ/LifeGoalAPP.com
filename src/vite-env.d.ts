/// <reference types="vite/client" />

declare global {
  interface LifeGoalDebuggerApi {
    show: () => void;
    hide: () => void;
    toggle: () => void;
    clear: () => void;
    log: (message: string, detail?: unknown) => void;
    warn: (message: string, detail?: unknown) => void;
    error: (message: string, detail?: unknown) => void;
    persist: (enabled: boolean) => void;
    info?: Record<string, unknown>;
  }

  interface Window {
    __LifeGoalAppDebugger?: LifeGoalDebuggerApi;
  }
}

export {};

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_REDIRECT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
