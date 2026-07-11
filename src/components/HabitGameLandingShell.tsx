import { useEffect, useState, type FormEventHandler, type ReactNode } from 'react';
import {
  hasCachedAuthSession,
  isCloudUnavailableForAuthGate,
  resolveAuthGateOutageBranch,
  shouldShowAuthConnectionNotice,
  type AuthInitializationStatus,
} from '../features/auth/authInitialization';
import { useServiceHealth } from '../hooks/useServiceHealth';
import { getServiceHealthManager } from '../services/service-health';
import { ServiceStatusModal } from './service-status';

export type HabitGameAuthTab = 'login' | 'signup';

type HabitGameLandingLayoutProps = {
  authCard: ReactNode;
  themeToggle: ReactNode;
};

export function HabitGameLandingLayout({ authCard, themeToggle }: HabitGameLandingLayoutProps) {
  return (
    <div className="app app--auth-gate">
      <header className="auth-gate__masthead">
        <a className="auth-gate__brand" href="/" aria-label="HabitGame home">
          HabitGame
        </a>
        {themeToggle}
      </header>

      <main className="auth-layout auth-gate__layout">
        <div className="auth-panel auth-gate__panel">{authCard}</div>
      </main>
    </div>
  );
}

type HabitGameAuthCardProps = {
  activeAuthTab: HabitGameAuthTab;
  authError: string | null;
  authMessage: string | null;
  authMessageVisible: boolean;
  email: string;
  fullName: string;
  initializationStatus: AuthInitializationStatus;
  initializing: boolean;
  isAuthGateOnline: boolean;
  isConfigured: boolean;
  password: string;
  submitting: boolean;
  onAuthInitializationRetry: () => void;
  onAuthSubmit: FormEventHandler<HTMLFormElement>;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onGoogleSignIn: () => void;
  onPasswordChange: (value: string) => void;
  onTabChange: (tab: HabitGameAuthTab) => void;
  onPlayFree: (payload: { displayName: string; shipName: string }) => void | Promise<void>;
};

const authTabs: { id: HabitGameAuthTab; label: string }[] = [
  { id: 'login', label: 'Log in' },
  { id: 'signup', label: 'Sign up' },
];

const authTabCopy: Record<HabitGameAuthTab, { title: string; subtitle: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: 'Log in to sync your rituals, goals, and check-ins across devices.',
  },
  signup: {
    title: 'Create your LifeGoal account',
    subtitle: 'Sign up with email or Google to unlock your full ship.',
  },
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export function HabitGameAuthCard({
  activeAuthTab,
  authError,
  authMessage,
  authMessageVisible,
  email,
  fullName,
  initializationStatus,
  initializing,
  isAuthGateOnline,
  isConfigured,
  password,
  submitting,
  onAuthInitializationRetry,
  onAuthSubmit,
  onEmailChange,
  onFullNameChange,
  onGoogleSignIn,
  onPasswordChange,
  onTabChange,
  onPlayFree,
}: HabitGameAuthCardProps) {

  const [guestStep, setGuestStep] = useState<'closed' | 'timeline' | 'customize'>('closed');
  const [captainName, setCaptainName] = useState('');
  const [shipName, setShipName] = useState('');
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [showServiceStatus, setShowServiceStatus] = useState(false);
  const { snapshot } = useServiceHealth();

  useEffect(() => {
    if (guestStep === 'closed') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [guestStep]);

  const handleSailToLumaIsle = async () => {
    setGuestSubmitting(true);
    setGuestError(null);
    try {
      await onPlayFree({ displayName: captainName.trim(), shipName: shipName.trim() });
      setGuestStep('closed');
    } catch (error) {
      setGuestError(error instanceof Error ? error.message : 'Unable to open Island Run right now. Please try again.');
    } finally {
      setGuestSubmitting(false);
    }
  };

  const guestModal = guestStep === 'closed' ? null : (
    <div className="guest-free-play-modal" role="dialog" aria-modal="true" aria-labelledby="guest-free-play-title">
      <div className="guest-free-play-modal__backdrop" />
      <section className="guest-free-play-modal__panel">
        {guestStep === 'timeline' ? (
          <>
            <h2 id="guest-free-play-title">Play free first. Save when you’re ready.</h2>
            <p>You can explore Luma Isle as a guest, earn rewards, and try the first Island Run loop. When you save your game with a free account, we’ll keep your progress — no payment today.</p>
            <ul>
              <li>Play as a guest.</li>
              <li>Earn starter rewards.</li>
              <li>Save your game for free.</li>
            </ul>
            {guestError ? <p className="guest-free-play-modal__error" role="alert">{guestError}</p> : null}
            <div className="guest-free-play-modal__actions">
              <button type="button" className="auth-card__primary" onClick={() => setGuestStep('customize')}>Continue</button>
              <button type="button" className="guest-free-play-modal__secondary" onClick={() => { setGuestStep('closed'); onTabChange('signup'); }}>Create free account now</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="guest-free-play-title">Name your captain</h2>
            <p>Miri is watching for a new light on First Light Shore. What should the island call you?</p>
            <label className="supabase-auth__field"><span>Captain name</span><input value={captainName} onChange={(event) => setCaptainName(event.target.value)} placeholder="Captain Nova" /></label>
            <label className="supabase-auth__field"><span>Ship name</span><input value={shipName} onChange={(event) => setShipName(event.target.value)} placeholder="The Luma Skiff" /></label>
            <div className="guest-free-play-modal__actions">
              <button type="button" className="auth-card__primary" onClick={handleSailToLumaIsle} disabled={guestSubmitting}>{guestSubmitting ? 'Opening Island Run…' : 'Sail to Luma Isle'}</button>
              <button type="button" className="guest-free-play-modal__secondary" onClick={handleSailToLumaIsle} disabled={guestSubmitting}>Skip for now</button>
            </div>
          </>
        )}
      </section>
    </div>
  );

  const showAuthConnectionNotice = shouldShowAuthConnectionNotice({
    initializationStatus,
    isConfigured,
    isOnline: isAuthGateOnline,
  });

  // Startup state machine (Part 3): branch on service health + cached session,
  // not on initializationStatus strings alone.
  const outageBranch = resolveAuthGateOutageBranch({
    connectionTroubled: showAuthConnectionNotice,
    cloudUnavailable: isCloudUnavailableForAuthGate(snapshot),
    hasCachedSession: hasCachedAuthSession(),
  });

  const handleTryAgain = () => {
    const manager = getServiceHealthManager();
    manager.setNetworkOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    void manager.runRecoveryProbes();
    onAuthInitializationRetry();
  };

  const outageNotice =
    outageBranch === 'none' ? null : outageBranch === 'returning_user' ? (
      <div className="supabase-auth__status supabase-auth__status--info auth-card__connection-notice" role="status">
        <p>Cloud services are unreachable, but your game is ready.</p>
        <p>Changes stay on this device until cloud sync returns.</p>
        <div className="auth-card__outage-actions">
          <button type="button" className="auth-card__retry" onClick={handleTryAgain}>
            Continue locally
          </button>
          <button type="button" className="auth-card__retry" onClick={() => setShowServiceStatus(true)}>
            View service status
          </button>
        </div>
      </div>
    ) : (
      <div className="supabase-auth__status supabase-auth__status--info auth-card__connection-notice" role="status">
        <p>HabitGame is having trouble connecting.</p>
        <p>Your progress is safe. You can retry, or play a demo while services recover.</p>
        <div className="auth-card__outage-actions">
          <button type="button" className="auth-card__retry" onClick={handleTryAgain}>
            Try again
          </button>
          <button type="button" className="auth-card__retry" onClick={() => setGuestStep('timeline')}>
            Play demo
          </button>
          <button type="button" className="auth-card__retry" onClick={() => setShowServiceStatus(true)}>
            View service status
          </button>
        </div>
      </div>
    );

  const statusElements = (
    <>
      {authMessage && (
        <p
          className={`supabase-auth__status supabase-auth__status--success ${
            authMessageVisible ? '' : 'supabase-auth__status--hidden'
          }`}
        >
          {authMessage}
        </p>
      )}
      {authError && <p className="supabase-auth__status supabase-auth__status--error">{authError}</p>}
    </>
  );

  const renderLoginPanel = () => (
    <div
      className="auth-tab-panel"
      role="tabpanel"
      id="auth-panel-login"
      aria-labelledby="auth-tab-login"
    >
      <form className="supabase-auth__form" onSubmit={onAuthSubmit}>
        <label className="supabase-auth__field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="supabase-auth__field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        <div className="supabase-auth__actions">
          <button type="submit" className="supabase-auth__action auth-card__primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </div>
      </form>

      <div className="auth-card__providers">
        <div className="supabase-auth__divider">or</div>
        <button
          type="button"
          className="auth-provider auth-provider--google"
          onClick={onGoogleSignIn}
          disabled={submitting || !isConfigured}
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </div>
  );

  const renderSignupPanel = () => (
    <div
      className="auth-tab-panel"
      role="tabpanel"
      id="auth-panel-signup"
      aria-labelledby="auth-tab-signup"
    >
      <form className="supabase-auth__form" onSubmit={onAuthSubmit}>
        <label className="supabase-auth__field">
          <span>Your name</span>
          <input
            type="text"
            name="fullName"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            placeholder="Jordan Goalsetter"
            autoComplete="name"
            required
          />
        </label>

        <label className="supabase-auth__field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="supabase-auth__field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Create a secure password"
            autoComplete="new-password"
            required
          />
        </label>

        <div className="supabase-auth__actions">
          <button type="submit" className="supabase-auth__action auth-card__primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up with email'}
          </button>
        </div>
      </form>

      <div className="auth-card__providers">
        <div className="supabase-auth__divider">or</div>
        <button
          type="button"
          className="auth-provider auth-provider--google"
          onClick={onGoogleSignIn}
          disabled={submitting || !isConfigured}
        >
          <GoogleIcon />
          Sign up with Google
        </button>
      </div>
    </div>
  );

  const renderTabPanel = () => {
    if (initializing && initializationStatus === 'loading' && isAuthGateOnline) {
      return <p className="supabase-auth__status supabase-auth__status--info">Loading session…</p>;
    }
    if (activeAuthTab === 'signup') {
      return renderSignupPanel();
    }
    return renderLoginPanel();
  };

  return (
    <div className="auth-card">
      <header className="auth-card__header">
        <h2>{authTabCopy[activeAuthTab].title}</h2>
        <p>{authTabCopy[activeAuthTab].subtitle}</p>
      </header>

      <div className="auth-card__guest-entry">
        <button type="button" className="auth-card__primary" onClick={() => setGuestStep('timeline')}>Play My Game for Free</button>
        <p>Start Island Run as a guest. Save your progress later with a free account.</p>
      </div>

      <div className="auth-card__tabs" role="tablist" aria-label="Choose how to access LifeGoal">
        {authTabs.map((tab) => {
          const isActive = activeAuthTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`auth-tab-${tab.id}`}
              aria-controls={`auth-panel-${tab.id}`}
              aria-selected={isActive}
              className={`auth-tab ${isActive ? 'auth-tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="auth-card__body">
        {renderTabPanel()}

        {!isConfigured ? (
          <p className="supabase-auth__status supabase-auth__status--error">
            Supabase credentials are not configured. Update your environment variables to enable live authentication.
          </p>
        ) : null}

        {outageNotice}

        {statusElements}
      </div>
      {guestModal}
      {showServiceStatus ? <ServiceStatusModal onClose={() => setShowServiceStatus(false)} /> : null}
    </div>
  );
}

type HabitGameLandingShellProps = HabitGameAuthCardProps & {
  themeToggle: ReactNode;
};

export function HabitGameLandingShell({ themeToggle, ...authCardProps }: HabitGameLandingShellProps) {
  return (
    <HabitGameLandingLayout
      themeToggle={themeToggle}
      authCard={<HabitGameAuthCard {...authCardProps} />}
    />
  );
}
