import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RecoverableErrorBoundary } from '../../components/RecoverableErrorBoundary';
import { lockFullscreenPageScroll } from '../../utils/scrollLock';
import './GameFirstShell.css';

/** This replaces the full-app render tree, rather than covering a live Today page. */
export function GameFirstShell({ phase, offline, developerError, renderGame, account, accountRequested,
  onAccount, onCloseAccount, onSignIn, onRetry, onRecover = () => window.location.reload(), overlays, guestTransferPending = false }: {
  phase: 'loading' | 'ready' | 'error'; offline: boolean; developerError: boolean;
  renderGame: (openHelp: () => void) => ReactNode; account: ReactNode; accountRequested: boolean;
  onAccount: () => void; onCloseAccount: () => void; onSignIn?: () => void;
  onRetry: () => void; onRecover?: () => void; overlays?: ReactNode;
  guestTransferPending?: boolean;
}) {
  const [panel, setPanel] = useState<'help' | 'account' | null>(accountRequested ? 'account' : null);
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  useEffect(() => { if (accountRequested) setPanel('account'); }, [accountRequested]);
  const back = () => { setPanel(null); onCloseAccount(); };
  const help = () => setPanel('help');
  const failure = <section className="game-first-status" role="alert">
    <p>Island Run could not open. Your saved progress has not been reset.</p>
    <button type="button" onClick={onRecover}>Recover game</button>
    <button type="button" onClick={help}>Account &amp; help</button>
  </section>;
  return <div className="game-first-shell" data-world-portal-gate="game-first">
    <div hidden={panel !== null}>
      {phase === 'ready' ? <RecoverableErrorBoundary fallback={failure}>{renderGame(help)}</RecoverableErrorBoundary>
        : <section className="game-first-status" aria-live="polite">
          <p className="game-first-eyebrow">Your island journey</p>
          <h1>{guestTransferPending ? 'Securing your guest journey' : phase === 'loading' ? 'Opening your saved journey…' : 'We couldn’t load your journey'}</h1>
          <p>{guestTransferPending ? 'Your guest run is still saved on this device. The account transfer must finish before play resumes. If the connection is stuck, use Account & help to recover without resetting.'
            : phase === 'loading' ? 'Checking your save and access before opening the game.'
            : 'No usable save is available on this device yet. Retry the connection; we won’t start over or overwrite your journey.'}</p>
          <button type="button" onClick={onRetry}>Retry connection</button>
          <button type="button" onClick={help}>Account &amp; help</button>
        </section>}
    </div>
    {panel !== null && <section className="game-first-essentials" aria-label="Game account and help">
      <header><button type="button" onClick={back}>← Back to game</button><h1>{panel === 'account' ? 'Your account' : 'Account & help'}</h1></header>
      {panel === 'account' && account ? account : <div className="game-first-help">
        <p>Your journey starts in Island Run. At Island 040, the caretakers offer the portal to Today, habits and goals. Your existing data stays intact.</p>
        <button type="button" onClick={() => { onAccount(); setPanel('account'); }}>Account, privacy &amp; accessibility settings</button>
        {onSignIn && <button type="button" onClick={onSignIn}>Sign in or save this guest run</button>}
        <nav aria-label="Essential information"><a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>
          <a href="/support" target="_blank" rel="noopener noreferrer">Support</a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a></nav>
        <h2>Game recovery</h2>
        <p>Reload and resume your saved game. This does not reset your island, rewards, habits or goals.</p>
        <button type="button" onClick={onRecover}>Recover game</button>
        {(offline || developerError) && <p role="status">{offline ? 'Using this device’s save. Account sync may still be unavailable. ' : ''}
          {developerError ? 'Developer access could not be verified. You can retry without changing your progress.' : ''}</p>}
        <button type="button" onClick={onRetry}>Retry save / developer check</button>
      </div>}
    </section>}
    {overlays && createPortal(overlays, document.body)}
  </div>;
}
