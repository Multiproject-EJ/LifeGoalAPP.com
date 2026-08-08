import React, { useState, useEffect, useMemo, type ComponentType } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { registerServiceWorker } from './registerServiceWorker.ts';
import { SupabaseAuthProvider, useSupabaseAuth } from './features/auth/SupabaseAuthProvider.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { resolveRoute } from './routes/resolveRoute.ts';
import { WorldHome } from './world/WorldHome.tsx';
import { Lobby } from './world/Lobby.tsx';
import { TrustPage } from './world/TrustPage.tsx';
import type { BeforeInstallPromptEvent } from './world/useInstallState.ts';
import { SafeErrorBoundary } from './components/SafeErrorBoundary.tsx';
import { initServiceHealthForBrowser } from './services/service-health/browserWiring.ts';
import { registerOfflineSyncExecutors } from './services/offlineSyncExecutors.ts';
import { ServiceStatusBanner } from './components/service-status/index.ts';
import { AnimationLab } from './components/AnimationLab.tsx';
import { HabitGameMobileDownloadGate } from './components/HabitGameLandingShell.tsx';
import { isCurrentClientPhone } from './utils/phoneClient.ts';
import { LevelWorldsHub } from './features/gamification/level-worlds/LevelWorldsHub.tsx';
import { createDemoSession } from './services/demoSession.ts';

// Start monitoring cloud health before anything assumes Supabase is available.
initServiceHealthForBrowser();
// Register queue executors so mutations recorded in earlier sessions can
// resume syncing as soon as the cloud returns.
registerOfflineSyncExecutors();

if (typeof window !== 'undefined') {
  window.__LifeGoalAppDebugger?.log('Initializing React root.', {
    mode: import.meta.env.MODE,
  });

  const isIpadSizedTouchDevice =
    /iPad/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  if (isIpadSizedTouchDevice) {
    document.documentElement.classList.add('platform-ipad');
  }
}

// Extend the global Window interface for the BeforeInstallPromptEvent which is
// not yet part of the standard TypeScript lib.
// (Type is exported from ./world/useInstallState.ts and imported above.)

// Routes that render public (non-app) views.
const NON_APP_ROUTES = new Set(['world', 'lobby', 'privacy', 'terms', 'support']);
const QUEST_VISUAL_SYSTEM_PREVIEW_PATH = '/dev/quest-journey-visual-system';
const ISLAND_ART_PREVIEW_PATH = '/dev/island-art-preview';
const ISLAND_TEMPLATE_KIT_PATH = '/dev/island-template-kit';
const ISLAND_3D_PROFILER_BUILD_ENABLED = import.meta.env.VITE_ISLAND_3D_PROFILE_ENABLED === 'true';
const ISLAND_001_STORY_PREVIEW_PATH = '/dev/island-001-story';
const DAY_ONE_MISSION_PREVIEW_PATH = '/dev/day-one-mission-preview';
const CHAMPIONSHIP_PREVIEW_PATH = '/dev/championship-preview';
const MOMENTUM_MATRIX_PREVIEW_PATH = '/dev/momentum-matrix-preview';
const ARENA_PUZZLE_PREVIEW_PATH = '/dev/arena-puzzle-preview';
const HOLIDAY_MODAL_PREVIEW_PATH = '/dev/holiday-modal-preview';
const HABIT_LANDMARK_PREVIEW_PATH = '/dev/habit-landmark-preview';
const WISDOM_STOP_PREVIEW_PATH = '/dev/wisdom-stop-preview';
const FEATURE_UNLOCK_PREVIEW_PATH = '/dev/feature-unlock-preview';
const TODAYS_OFFER_PREVIEW_PATH = '/dev/todays-offer-preview';

function IslandChampionshipPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./features/gamification/level-worlds/components/IslandChampionshipPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function MomentumMatrixPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./features/gamification/games/momentum-matrix/MomentumMatrixPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function ArenaPuzzlePreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./dev/ArenaPuzzlePreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function HolidayModalPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./dev/HolidayModalPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function HabitLandmarkPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./dev/HabitLandmarkPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function WisdomStopPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./dev/WisdomStopPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function FeatureUnlockPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./dev/FeatureUnlockPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function TodaysOfferPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./dev/TodaysOfferPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function QuestVisualSystemPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./features/quest-journey/QuestJourneyVisualSystemPreview').then((module) => {
      if (isMounted) {
        setPreview(() => module.default);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function IslandArtPreviewContent() {
  const session = useMemo(() => createDemoSession(), []);
  return <LevelWorldsHub session={session} onClose={() => undefined} isAdmin />;
}

function IslandArtPreviewRoute() {
  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        <IslandArtPreviewContent />
      </SupabaseAuthProvider>
    </ThemeProvider>
  );
}

function IslandTemplateKitRoute() {
  const [TemplateKit, setTemplateKit] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./features/gamification/level-worlds/dev/IslandTemplateKitPage').then((module) => {
      if (isMounted) setTemplateKit(() => module.default);
    });
    return () => { isMounted = false; };
  }, []);

  return TemplateKit ? <TemplateKit /> : null;
}

function Island001StoryPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./features/story/Island001StoryPreview').then((module) => {
      if (isMounted) {
        setPreview(() => module.default);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}

function DayOneMissionPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./features/onboarding/DayOneMissionPreview').then((module) => {
      if (isMounted) setPreview(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}


function RootCrashFallback() {
  return (
    <main
      role="alert"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#0a0e1a',
        color: '#f8fafc',
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      }}
    >
      <section
        style={{
          width: 'min(560px, 100%)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          borderRadius: '24px',
          padding: '1.5rem',
          background: 'rgba(15, 23, 42, 0.86)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', color: '#93c5fd', fontWeight: 700 }}>
          HabitGame hit a startup snag
        </p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem' }}>
          We kept the page from going blank.
        </h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#cbd5e1' }}>
          Refresh once to retry. If this keeps happening, open the app with <code>?debug=1</code>
          and share the latest “React root render failed” entry from the debugger.
        </p>
      </section>
    </main>
  );
}

function Root() {
  const isQuestVisualSystemPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === QUEST_VISUAL_SYSTEM_PREVIEW_PATH;
  const isIslandArtPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === ISLAND_ART_PREVIEW_PATH;
  const isIslandTemplateKitRoute =
    ISLAND_3D_PROFILER_BUILD_ENABLED || (
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      window.location.pathname.replace(/\/+$/, '') === ISLAND_TEMPLATE_KIT_PATH
    );
  const isIsland001StoryPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === ISLAND_001_STORY_PREVIEW_PATH;
  const isDayOneMissionPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === DAY_ONE_MISSION_PREVIEW_PATH;
  const isChampionshipPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === CHAMPIONSHIP_PREVIEW_PATH;
  const isMomentumMatrixPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === MOMENTUM_MATRIX_PREVIEW_PATH;
  const isArenaPuzzlePreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === ARENA_PUZZLE_PREVIEW_PATH;
  const isHolidayModalPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === HOLIDAY_MODAL_PREVIEW_PATH;
  const isHabitLandmarkPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === HABIT_LANDMARK_PREVIEW_PATH;
  const isWisdomStopPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === WISDOM_STOP_PREVIEW_PATH;
  const isFeatureUnlockPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === FEATURE_UNLOCK_PREVIEW_PATH;
  const isTodaysOfferPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === TODAYS_OFFER_PREVIEW_PATH;

  const initialRoute = useMemo(() => resolveRoute(), []);
  const isPhoneEntryClient = useMemo(() => isCurrentClientPhone(), []);
  const isDevPhonePreview = useMemo(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('phonePreview') === '1';
  }, []);
  const [showApp, setShowApp] = useState(() => {
    const shouldRenderAppByDefault = !NON_APP_ROUTES.has(initialRoute);
    if (shouldRenderAppByDefault) return true;

    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    const isPeacebetweenHost = host === 'peacebetween.com' || host === 'www.peacebetween.com';
    const isRootPath = window.location.pathname === '/';
    if (isPeacebetweenHost && isRootPath && initialRoute === 'world') {
      return true;
    }
    return false;
  });
  const [showLobby, setShowLobby] = useState(() => initialRoute === 'lobby');
  const [loginOnEntry, setLoginOnEntry] = useState(() => initialRoute === 'login');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isQuestVisualSystemPreviewRoute) {
    return <QuestVisualSystemPreviewRoute />;
  }

  if (isIsland001StoryPreviewRoute) {
    return <Island001StoryPreviewRoute />;
  }

  if (isDayOneMissionPreviewRoute) {
    return <DayOneMissionPreviewRoute />;
  }

  if (isChampionshipPreviewRoute) {
    return <IslandChampionshipPreviewRoute />;
  }

  if (isMomentumMatrixPreviewRoute) {
    return <MomentumMatrixPreviewRoute />;
  }

  if (isArenaPuzzlePreviewRoute) {
    return <ArenaPuzzlePreviewRoute />;
  }

  if (isHolidayModalPreviewRoute) {
    return (
      <ThemeProvider>
        <HolidayModalPreviewRoute />
      </ThemeProvider>
    );
  }

  if (isHabitLandmarkPreviewRoute) {
    return (
      <ThemeProvider>
        <HabitLandmarkPreviewRoute />
      </ThemeProvider>
    );
  }

  if (isWisdomStopPreviewRoute) {
    return (
      <ThemeProvider>
        <WisdomStopPreviewRoute />
      </ThemeProvider>
    );
  }

  if (isFeatureUnlockPreviewRoute) {
    return (
      <ThemeProvider>
        <FeatureUnlockPreviewRoute />
      </ThemeProvider>
    );
  }

  if (isTodaysOfferPreviewRoute) {
    return (
      <ThemeProvider>
        <TodaysOfferPreviewRoute />
      </ThemeProvider>
    );
  }

  if (isIslandArtPreviewRoute) {
    return <IslandArtPreviewRoute />;
  }

  if (isIslandTemplateKitRoute) {
    return <IslandTemplateKitRoute />;
  }

  if (
    !isPhoneEntryClient &&
    !isDevPhonePreview &&
    initialRoute !== 'world' &&
    initialRoute !== 'privacy' &&
    initialRoute !== 'terms' &&
    initialRoute !== 'support'
  ) {
    return <HabitGameMobileDownloadGate />;
  }

  if (!showApp && !showLobby) {
    if (initialRoute === 'privacy' || initialRoute === 'terms' || initialRoute === 'support') {
      return <TrustPage page={initialRoute} />;
    }
    return (
      <WorldHome
        onContinue={() => setShowApp(true)}
        onLogin={() => {
          setLoginOnEntry(true);
          setShowApp(true);
        }}
        beforeInstallPromptEvent={installPrompt}
      />
    );
  }

  if (showLobby) {
    return (
      <ThemeProvider>
        <SupabaseAuthProvider>
          <LobbyRoute
            onEnterApp={() => {
              setShowLobby(false);
              setShowApp(true);
            }}
          />
        </SupabaseAuthProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        <App forceAuthOnMount={loginOnEntry} />
      </SupabaseAuthProvider>
    </ThemeProvider>
  );
}

/**
 * LobbyRoute — renders Lobby when authenticated, redirects to /login when not.
 * Must be rendered inside SupabaseAuthProvider.
 */
function LobbyRoute({ onEnterApp }: { onEnterApp: () => void }) {
  const { isAuthenticated, initializing, session } = useSupabaseAuth();

  useEffect(() => {
    if (!initializing && !isAuthenticated) {
      window.location.replace('/login?next=%2Flobby');
    }
  }, [initializing, isAuthenticated]);

  if (initializing) {
    // Minimal loading state — avoid flash of unauthenticated content.
    return null;
  }

  if (!isAuthenticated) {
    // Redirect is in-flight via useEffect above.
    return null;
  }

  const username = session?.user?.user_metadata?.full_name as string | undefined
    ?? session?.user?.email?.split('@')[0]
    ?? null;

  return <Lobby onEnterApp={onEnterApp} username={username} />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SafeErrorBoundary
      fallback={<RootCrashFallback />}
      onError={(error, info) => {
        // Keep native debug builds observable from Xcode. The in-app debugger
        // remains the user-facing source, while this avoids losing the actual
        // React error when the boundary replaces the tree in Capacitor.
        const errorDetails = error instanceof Error
          ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
          : String(error);
        console.error(
          `React root render failed.\n${errorDetails}\nComponent stack:\n${info.componentStack}`,
        );
        window.__LifeGoalAppDebugger?.error('React root render failed.', {
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
        });
      }}
    >
      <Root />
      <AnimationLab />
      <ServiceStatusBanner />
    </SafeErrorBoundary>
  </React.StrictMode>
);

if (typeof window !== 'undefined') {
  window.__LifeGoalAppDebugger?.log('React root rendered successfully.', {
    strictMode: true,
  });
}

if (import.meta.env.PROD && !ISLAND_3D_PROFILER_BUILD_ENABLED) {
  registerServiceWorker();
}
