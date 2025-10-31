import { FormEvent, useEffect, useState } from 'react';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';

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
  const { session, initializing, isConfigured, signInWithOtp, signInWithPassword, signOut } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'magic' | 'password'>('password');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage(null);
    setAuthError(null);

    if (!email) {
      setAuthError('Enter an email address to continue.');
      return;
    }

    setSubmitting(true);

    try {
      if (authMode === 'password') {
        await signInWithPassword({ email, password });
        setAuthMessage('Signed in successfully.');
      } else {
        await signInWithOtp(email);
        setAuthMessage('Check your inbox for the magic link.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthMessage(null);
    try {
      await signOut();
      setAuthMessage('Signed out.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
    }
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

      <section className="supabase-auth">
        <div className="supabase-auth__header">
          <h2>Supabase Authentication</h2>
          <p>Connect your Supabase project to start persisting goals and habits.</p>
        </div>

        <div className="supabase-auth__content">
          {initializing ? (
            <p className="supabase-auth__status">Loading session…</p>
          ) : !isConfigured ? (
            <p className="supabase-auth__status supabase-auth__status--error">
              Supabase credentials are not configured. Update your environment variables to enable authentication.
            </p>
          ) : session ? (
            <div className="supabase-auth__session">
              <div>
                <span className="supabase-auth__label">Signed in as</span>
                <strong>{session.user.email}</strong>
              </div>
              <button type="button" className="supabase-auth__action" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <form className="supabase-auth__form" onSubmit={handleAuthSubmit}>
              <label className="supabase-auth__field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              {authMode === 'password' && (
                <label className="supabase-auth__field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </label>
              )}

              <div className="supabase-auth__actions">
                <button type="submit" className="supabase-auth__action" disabled={submitting}>
                  {submitting ? 'Sending…' : authMode === 'password' ? 'Sign in' : 'Send magic link'}
                </button>
                <button
                  type="button"
                  className="supabase-auth__toggle"
                  onClick={() => setAuthMode((mode) => (mode === 'password' ? 'magic' : 'password'))}
                >
                  {authMode === 'password' ? 'Use magic link' : 'Use password'}
                </button>
              </div>
            </form>
          )}

          {authMessage && <p className="supabase-auth__status supabase-auth__status--success">{authMessage}</p>}
          {authError && <p className="supabase-auth__status supabase-auth__status--error">{authError}</p>}
        </div>

        <p className="supabase-auth__hint">
          Update your <code>.env.local</code> with Supabase credentials to enable authentication and database helpers.
        </p>
      </section>
    </main>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
