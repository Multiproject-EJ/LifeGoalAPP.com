import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import { useIslandRunState } from '../hooks/useIslandRunState';
import { advanceOpeningGamesPreparation, OPENING_GAMES_TEAM_ROLL_TARGET, resolveOpeningGamesCeremony } from '../services/islandRunOpeningGames';
import { beginIslandRunOpeningGame, prepareIslandRunOpeningGames, settleIslandRunOpeningGame } from '../services/islandRunOpeningGamesAction';
import type { IslandRunMinigameResult } from '../services/islandRunMinigameTypes';
import { IslandRunMinigameLauncher } from './IslandRunMinigameLauncher';
import { registerAllMinigameManifests } from '../services/islandRunMinigameManifests';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './OpeningGamesCeremonyModal.css';

export function OpeningGamesCeremonyModal({ session, client, onClose, onBuild, onBeaconLit }: {
  session: Session; client: SupabaseClient | null; onClose: () => void; onBuild: () => void; onBeaconLit: () => void;
}) {
  const { state } = useIslandRunState(session, client);
  const progress = resolveOpeningGamesCeremony(state.signatureMissionProgressByIsland);
  const [launch, setLaunch] = useState<Awaited<ReturnType<typeof beginIslandRunOpeningGame>>>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const perform = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await action(); } catch { setError('That step could not finish. Please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const settle = (result: IslandRunMinigameResult) => perform(async () => {
    if (!launch) return;
    const outcome = await settleIslandRunOpeningGame({ session, client, attemptId: launch.attemptId, result });
    if (outcome.status === 'invalid-result' || outcome.status === 'ineligible') {
      setError('This round could not be accepted. Return to the island and resume the ceremony.');
      setLaunch(null);
      return;
    }
    setLaunch(null);
    if (outcome.status === 'cancelled') onClose();
  });
  const close = () => { if (!busyRef.current) { if (launch) void settle({ completed: false }); else onClose(); } };
  const focusRef = useVaultModalFocusTrap<HTMLDivElement>(close);
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  const action = progress.venuesPreparedAtMs === null ? 'prepare-venues'
    : progress.teamsWelcomedAtMs === null ? 'welcome-teams' : 'light-beacon';
  const availability = advanceOpeningGamesPreparation({ ledger: state.signatureMissionProgressByIsland,
    islandNumber: state.currentIslandNumber, action, buildLevels: state.stopBuildStateByIndex.map(stop => stop.buildLevel), nowMs: 0 });
  const completed = progress.completedAtMs !== null;
  const beacon = progress.beaconLitAtMs !== null;
  const labels = { 'prepare-venues': 'Prepare ceremony venues', 'welcome-teams': 'Welcome the teams', 'light-beacon': 'Light the opening beacon' };
  const next = () => perform(async () => {
    if (beacon) {
      registerAllMinigameManifests();
      const attempt = await beginIslandRunOpeningGame({ session, client });
      setLaunch(attempt);
      if (!attempt) setError('This game is not available right now. Return to the island and try again.');
      return;
    }
    const result = await prepareIslandRunOpeningGames({ session, client, action });
    if (result.status !== 'ok' && result.status !== 'already-complete') { setError('Finish the preparation shown above, then try again.'); return; }
    if (action === 'light-beacon') onBeaconLit();
  });
  return createPortal(
    <div className="opening-games-overlay" ref={focusRef} tabIndex={-1}>
      <section className={`opening-games-dialog${launch ? ' opening-games-dialog--playing' : ''}`} role="dialog" aria-modal="true" aria-label="Opening ceremony">
        {!launch && <button className="opening-games-close" aria-label="Close opening ceremony" onClick={close} disabled={busy}>×</button>}
        {launch ? <IslandRunMinigameLauncher key={launch.attemptId} minigameId={launch.minigameId} islandNumber={state.currentIslandNumber}
          launchConfig={launch.config} onComplete={result => void settle(result)} /> : <>
          <p className="opening-games-eyebrow">Island 002 · Opening ceremony</p>
          <div className="opening-games-emblem" aria-hidden="true">{completed ? '✦' : beacon ? '⌁' : '♛'}</div>
          <h2>{completed ? 'The games are open!' : beacon ? 'Take part in the first game' : 'Host the First Games'}</h2>
          <p>{completed ? 'Your first round is complete. Three starter tickets have been added to the active event. Your reward bar can help you earn more.'
            : beacon ? 'Signal Path is a free guided introduction. Follow the glowing cells. Taking part is enough—no minimum score is required.'
            : action === 'prepare-venues' ? 'Prepare the welcome venue and Event Arena. Each needs its first funded building level; the whole palace does not need to be finished.'
            : action === 'welcome-teams' ? `Teams are arriving as you explore: ${progress.rollsCompleted} / ${OPENING_GAMES_TEAM_ROLL_TARGET} rolls. Welcome them when everyone is here.`
            : 'The teams are here. Light the beacon to reveal your reward bar and the first-games button on the island.'}</p>
          {!completed && <ol className="opening-games-steps" aria-label="Ceremony steps">
            {[['Prepare venues', progress.venuesPreparedAtMs], ['Welcome teams', progress.teamsWelcomedAtMs], ['Light beacon', progress.beaconLitAtMs], ['Play first game', progress.completedAtMs]].map(([label, at]) =>
              <li key={String(label)}><span aria-hidden="true">{at !== null ? '✓' : '○'}</span> {label}</li>)}
          </ol>}
          {completed ? <button onClick={close}>Return to the island</button>
            : !beacon && availability.status === 'builds-required' ? <button onClick={onBuild}>Build ceremony venues</button>
            : !beacon && availability.status === 'teams-required' ? <button onClick={close}>Return to the board</button>
            : <button disabled={busy || (!beacon && availability.status !== 'ok')} onClick={() => void next()}>
              {busy ? 'Preparing…' : beacon ? progress.activeAttemptId ? 'Resume first game · Free' : 'Play first game · Free' : labels[action]}
            </button>}
        </>}
        {error && <p role="alert">{error}</p>}
        {busy && <p role="status">Saving ceremony progress…</p>}
      </section>
    </div>, document.body,
  );
}
