import { useEffect, useState } from 'react';

const phaseChecklist = [
  {
    title: 'Phase 1: App Shell Setup',
    description:
      'Bootstrap React + Vite project, add PWA manifest, and register a service worker for offline caching.',
  },
  {
    title: 'Phase 2: Supabase Integration',
    description:
      'Configure Supabase project credentials, initialize client, and scaffold database interactions.',
  },
  {
    title: 'Phase 3: Core Features',
    description:
      'Implement goal management, daily habit tracker, dashboard analytics, vision board, and check-ins.',
  },
  {
    title: 'Phase 4: Offline & Push Enhancements',
    description:
      'Finalize background sync, offline caching strategies, and push notification workflows.',
  }
];

export default function App() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
  };

  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <h1>LifeGoalApp</h1>
        <p className="tagline">Design a smoother path to your goals.</p>
        {installPromptEvent && (
          <button className="install-button" onClick={handleInstallClick}>
            Install App
          </button>
        )}
      </header>

      <section className="phase-list">
        <h2>Development Roadmap</h2>
        <p className="phase-list__intro">
          We&apos;re building the LifeGoalApp in iterative phases to make sure every feature feels polished and purposeful.
        </p>
        <ol>
          {phaseChecklist.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
