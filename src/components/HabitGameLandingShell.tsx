import { useEffect, useState, type FormEventHandler, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  hasCachedAuthSession,
  isCloudUnavailableForAuthGate,
  resolveAuthGateOutageBranch,
  shouldShowAuthConnectionNotice,
  type AuthInitializationStatus,
} from '../features/auth/authInitialization';
import { useServiceHealth } from '../hooks/useServiceHealth';
import { getServiceHealthManager } from '../services/service-health';
import { patchIslandRunGuestFunnelState } from '../features/gamification/level-worlds/services/islandRunGuestFunnelState';
import { ServiceStatusModal } from './service-status';
import { CompassCrestBrand } from './CompassCrestBrand';

export type HabitGameAuthTab = 'login' | 'signup';

type HabitGameLandingLayoutProps = {
  authCard: ReactNode;
  variant?: 'auth' | 'download';
};

export function HabitGameLandingLayout({ authCard, variant = 'auth' }: HabitGameLandingLayoutProps) {
  const { snapshot } = useServiceHealth();

  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = metaThemeColor?.getAttribute('content') ?? null;

    root.classList.add('auth-gate-active');
    metaThemeColor?.setAttribute('content', '#071a36');

    return () => {
      root.classList.remove('auth-gate-active');
      if (previousThemeColor) {
        metaThemeColor?.setAttribute('content', previousThemeColor);
      }
    };
  }, []);

  const syncStatus = (() => {
    switch (snapshot.overall) {
      case 'OFFLINE':
        return 'Offline mode • Your progress is safe';
      case 'DEGRADED':
      case 'MAINTENANCE':
        return 'Cloud sync delayed • Your progress is safe';
      case 'ACCOUNT_ACTION_REQUIRED':
        return 'Sign in again • Your progress is safe';
      case 'UNSAFE':
        return 'Saving paused • We’ll help you recover';
      case 'ONLINE':
      default:
        return null;
    }
  })();

  return (
    <div className="app app--auth-gate" data-brand-theme="first-light">
      <header className="auth-gate__masthead">
        <div className="auth-gate__brand-lockup">
          <a className="auth-gate__brand" href="/" aria-label="HabitGame home">
            <CompassCrestBrand
              className="auth-gate__canonical-brand"
              surface="light"
              animated
              curved
              asHeading
            />
          </a>
        </div>
        {syncStatus ? (
          <p className="auth-gate__sync-pill" role="status">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M7.5 18.5h9a4.5 4.5 0 0 0 .8-8.93A5.75 5.75 0 0 0 6.4 8.2 5.15 5.15 0 0 0 7.5 18.5Z" />
              <path d="m9.3 13.25 1.65 1.65 3.75-4.1" />
            </svg>
            <span>{syncStatus}</span>
          </p>
        ) : null}
      </header>

      <main className={`auth-layout auth-gate__layout${variant === 'download' ? ' auth-gate__layout--download' : ''}`}>
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
  { id: 'login', label: 'Sign in' },
  { id: 'signup', label: 'Sign up' },
];

const authTabCopy: Record<HabitGameAuthTab, { title: string; subtitle: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: 'Continue your journey. Your progress is waiting.',
  },
  signup: {
    title: 'Begin your journey',
    subtitle: 'Create your free account and carry your progress across devices.',
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

  const [guestStep, setGuestStep] = useState<'closed' | 'audio' | 'timeline'>('closed');
  const [guestAmbienceEnabled, setGuestAmbienceEnabled] = useState(true);
  const [guestMusicEnabled, setGuestMusicEnabled] = useState(true);
  const [guestSfxEnabled, setGuestSfxEnabled] = useState(true);
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

  useEffect(() => {
    if (guestStep === 'closed') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setGuestError(null);
      setGuestStep((current) => current === 'timeline' ? 'audio' : 'closed');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guestStep]);

  const handleBeginVoyage = async () => {
    setGuestSubmitting(true);
    setGuestError(null);
    try {
      patchIslandRunGuestFunnelState({
        entryAudioChoiceCompleted: true,
        entryAmbienceEnabled: guestAmbienceEnabled,
        entryMusicEnabled: guestMusicEnabled,
        entrySfxEnabled: guestSfxEnabled,
      });
      await onPlayFree({ displayName: '', shipName: '' });
      setGuestStep('closed');
    } catch (error) {
      setGuestError(error instanceof Error ? error.message : 'Unable to open Island Run right now. Please try again.');
    } finally {
      setGuestSubmitting(false);
    }
  };

  const guestModal = guestStep === 'closed' ? null : (
    <div className="guest-free-play-modal" role="dialog" aria-modal="true" aria-labelledby="guest-free-play-title">
      <div className="guest-free-play-modal__backdrop" aria-hidden="true" />
      <section className={`guest-free-play-modal__panel guest-free-play-modal__panel--${guestStep}`}>
        <div className="guest-free-play-modal__topline">
          {guestStep === 'timeline' ? (
            <button
              type="button"
              className="guest-free-play-modal__back"
              onClick={() => {
                setGuestError(null);
                setGuestStep('audio');
              }}
            >
              ← Back
            </button>
          ) : <span />}
          <span className="guest-free-play-modal__step">
            {guestStep === 'audio' ? '1 of 2' : '2 of 2'}
          </span>
          <button
            type="button"
            className="guest-free-play-modal__close"
            onClick={() => setGuestStep('closed')}
            aria-label="Close guest play setup"
          >
            ×
          </button>
        </div>
        {guestStep === 'audio' ? (
          <>
            <div className="guest-free-play-modal__audio-scene" aria-hidden="true">
              <div className="guest-free-play-modal__audio-orbit guest-free-play-modal__audio-orbit--outer" />
              <div className="guest-free-play-modal__audio-orbit guest-free-play-modal__audio-orbit--inner" />
              <img src="/assets/brand/habitgame-compass-crest-rankless.webp" alt="" />
              <span>Sound Check</span>
            </div>
            <div className="guest-free-play-modal__copy">
              <span className="guest-free-play-modal__eyebrow">Before you step aboard</span>
              <h2 id="guest-free-play-title">Choose your sound</h2>
              <p>Change this anytime.</p>
            </div>
            <div className="guest-free-play-modal__audio-options" role="group" aria-label="Audio settings">
              <button
                type="button"
                className={`guest-free-play-modal__audio-option guest-free-play-modal__audio-option--ambience${guestAmbienceEnabled ? ' guest-free-play-modal__audio-option--on' : ''}`}
                aria-pressed={guestAmbienceEnabled}
                onClick={() => setGuestAmbienceEnabled((current) => !current)}
              >
                <span aria-hidden="true">≈</span>
                <span className="guest-free-play-modal__audio-option-copy">
                  <strong>Ambience</strong>
                  <small>Wind &amp; water</small>
                </span>
                <i aria-hidden="true">{guestAmbienceEnabled ? 'On' : 'Off'}</i>
              </button>
              <button
                type="button"
                className={`guest-free-play-modal__audio-option guest-free-play-modal__audio-option--music${guestMusicEnabled ? ' guest-free-play-modal__audio-option--on' : ''}`}
                aria-pressed={guestMusicEnabled}
                onClick={() => setGuestMusicEnabled((current) => !current)}
              >
                <span aria-hidden="true">♫</span>
                <span className="guest-free-play-modal__audio-option-copy">
                  <strong>Music</strong>
                  <small>Story &amp; ceremonies</small>
                </span>
                <i aria-hidden="true">{guestMusicEnabled ? 'On' : 'Off'}</i>
              </button>
              <button
                type="button"
                className={`guest-free-play-modal__audio-option guest-free-play-modal__audio-option--player${guestSfxEnabled ? ' guest-free-play-modal__audio-option--on' : ''}`}
                aria-pressed={guestSfxEnabled}
                onClick={() => setGuestSfxEnabled((current) => !current)}
              >
                <span aria-hidden="true">✦</span>
                <span className="guest-free-play-modal__audio-option-copy">
                  <strong>Player Sounds</strong>
                  <small>Dice &amp; rewards</small>
                </span>
                <i aria-hidden="true">{guestSfxEnabled ? 'On' : 'Off'}</i>
              </button>
            </div>
            {guestError ? <p className="guest-free-play-modal__error" role="alert">{guestError}</p> : null}
            <div className="guest-free-play-modal__actions">
              <button type="button" className="auth-card__primary" onClick={() => {
                patchIslandRunGuestFunnelState({
                  entryAudioChoiceCompleted: true,
                  entryAmbienceEnabled: guestAmbienceEnabled,
                  entryMusicEnabled: guestMusicEnabled,
                  entrySfxEnabled: guestSfxEnabled,
                });
                setGuestStep('timeline');
              }}>Continue</button>
            </div>
          </>
        ) : (
          <>
            <div className="guest-free-play-modal__scene">
              <img
                src="/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp"
                alt=""
                aria-hidden="true"
              />
              <span>First Light Shore</span>
            </div>
            <div className="guest-free-play-modal__copy">
              <span className="guest-free-play-modal__eyebrow">Guest voyage</span>
              <h2 id="guest-free-play-title">Play now. Save later.</h2>
              <p>Names can wait until your next rank.</p>
            </div>
            <div className="guest-free-play-modal__route" aria-label="First voyage sequence">
              <span><b>1</b> Welcome pack</span>
              <span><b>2</b> Sail to Luma</span>
              <span><b>3</b> Save free later</span>
            </div>
            {guestError ? <p className="guest-free-play-modal__error" role="alert">{guestError}</p> : null}
            <div className="guest-free-play-modal__actions">
              <button type="button" className="auth-card__primary" onClick={handleBeginVoyage} disabled={guestSubmitting}>{guestSubmitting ? 'Preparing your issue…' : 'Begin my voyage'}</button>
              <button type="button" className="guest-free-play-modal__secondary" onClick={() => { setGuestStep('closed'); onTabChange('signup'); }}>Create free account now</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
  const guestModalPortal = guestModal && typeof document !== 'undefined'
    ? createPortal(guestModal, document.body)
    : null;

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
          <button type="button" className="auth-card__retry" onClick={() => setGuestStep('audio')}>
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
            {submitting ? 'Signing in…' : 'Sign in'}
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
    <div className="auth-card auth-card--first-light" data-brand-theme="first-light">
      <header className="auth-card__header">
        <h2>{authTabCopy[activeAuthTab].title}</h2>
        <p>{authTabCopy[activeAuthTab].subtitle}</p>
      </header>

      <div className="auth-card__tabs" role="tablist" aria-label="Choose how to access HabitGame">
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

        {activeAuthTab === 'login' && outageBranch === 'none' ? (
          <div className="auth-card__guest-entry">
            <button type="button" className="auth-card__guest-button" onClick={() => setGuestStep('audio')}>
              <span aria-hidden="true">✦</span>
              <span>
                <strong>Play as guest</strong>
                <small>Explore Island Run now. Save your progress later.</small>
              </span>
              <span className="auth-card__guest-arrow" aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}

        {!isConfigured ? (
          <p className="supabase-auth__status supabase-auth__status--error">
            Supabase credentials are not configured. Update your environment variables to enable live authentication.
          </p>
        ) : null}

        {outageNotice}

        {statusElements}
      </div>
      {guestModalPortal}
      {showServiceStatus ? <ServiceStatusModal onClose={() => setShowServiceStatus(false)} /> : null}
    </div>
  );
}

type HabitGameLandingShellProps = HabitGameAuthCardProps;

export function HabitGameLandingShell(authCardProps: HabitGameLandingShellProps) {
  return (
    <HabitGameLandingLayout
      authCard={<HabitGameAuthCard {...authCardProps} />}
    />
  );
}

export function HabitGameMobileDownloadGate() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const phoneUrl = typeof window === 'undefined' ? 'habitgame.app' : window.location.origin;

  const copyPhoneUrl = async () => {
    const fallbackInput = document.createElement('textarea');
    fallbackInput.value = phoneUrl;
    fallbackInput.setAttribute('readonly', '');
    fallbackInput.style.position = 'fixed';
    fallbackInput.style.opacity = '0';
    document.body.appendChild(fallbackInput);
    fallbackInput.select();
    const fallbackCopied = document.execCommand('copy');
    fallbackInput.remove();

    if (fallbackCopied) {
      setCopyState('copied');
      return;
    }

    try {
      await navigator.clipboard.writeText(phoneUrl);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const downloadCard = (
    <section className="mobile-download-card" aria-labelledby="mobile-download-title">
      <header className="mobile-download-card__header">
        <div className="mobile-download-card__phone" aria-hidden="true">
          <span>✦</span>
        </div>
        <div>
          <p className="mobile-download-card__eyebrow">Made for your phone</p>
          <h1 id="mobile-download-title">Your adventure belongs in your pocket.</h1>
          <p>HabitGame is a mobile-first PWA and iPhone app. Continue on a phone to log in, play as a guest, and build your real-life game.</p>
        </div>
      </header>

      <div className="mobile-download-card__address" aria-label="HabitGame phone address">
        <div>
          <span>Open this address on your phone</span>
          <strong>{phoneUrl}</strong>
        </div>
        <button type="button" onClick={copyPhoneUrl}>
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      {copyState === 'error' ? (
        <p className="mobile-download-card__copy-error">Copy was unavailable. Type the address above into your phone browser.</p>
      ) : null}

      <div className="mobile-download-card__options">
        <article>
          <div className="mobile-download-card__option-title">
            <span aria-hidden="true"></span>
            <div><small>iPhone app</small><h2>App Store</h2></div>
          </div>
          <p>The native iPhone release is on its way.</p>
          <button type="button" disabled>Coming soon</button>
        </article>

        <article>
          <div className="mobile-download-card__option-title">
            <span aria-hidden="true">◉</span>
            <div><small>iPhone · Safari</small><h2>Install the PWA</h2></div>
          </div>
          <ol>
            <li>Open HabitGame in Safari on your iPhone.</li>
            <li>Tap Share, then <strong>Add to Home Screen</strong>.</li>
            <li>Tap Add to install it like an app.</li>
          </ol>
        </article>

        <article>
          <div className="mobile-download-card__option-title">
            <span aria-hidden="true">◆</span>
            <div><small>Android · Chrome</small><h2>Install the PWA</h2></div>
          </div>
          <ol>
            <li>Open HabitGame in Chrome on your Android phone.</li>
            <li>Open the browser menu and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            <li>Confirm to add HabitGame to your phone.</li>
          </ol>
        </article>
      </div>

      <p className="mobile-download-card__note">Desktop and tablet play are intentionally paused while the phone experience is being shaped.</p>
    </section>
  );

  return <HabitGameLandingLayout variant="download" authCard={downloadCard} />;
}
