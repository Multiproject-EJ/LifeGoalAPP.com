import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useIslandRunState } from '../hooks/useIslandRunState';
import type { ArenaGameId } from '../services/islandRunArenaCatalog';
import { nextArenaComparison, pendingArenaIntroductions } from '../services/arenaJourney';
import { applyArenaJourneyAction, resolveArenaJourney } from '../services/arenaJourneyActions';
import { applyArenaStadiumAction } from '../services/arenaStadiumActions';
import { arenaStadiumEnterable, arenaStadiumNeedsRoundSettlement, arenaStadiumVisitKey, currentArenaStadium } from '../services/arenaStadium';
import { ArenaJourneyDialog } from './ArenaJourneyControls';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';

/** No gameplay mirrors: every step and interruption comes from the saved visit. */
export function ArenaStadiumActivity({ session, client, gameOpen, onComplete, onEarnTickets, children }: {
  session: Session; client: SupabaseClient | null; gameOpen: boolean;
  onComplete: () => void; onEarnTickets: () => void; children: ReactNode;
}) {
  const { state } = useIslandRunState(session, client);
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  const key = arenaStadiumVisitKey(state), visit = currentArenaStadium(state);
  const progress = resolveArenaJourney(state);
  const pending = pendingArenaIntroductions(state.currentIslandNumber, progress);
  const pair = visit?.playedAtMs ? nextArenaComparison(state.currentIslandNumber, progress, true) : null;
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const completeRef = useRef(onComplete); completeRef.current = onComplete;
  const enterable = arenaStadiumEnterable(state);
  const needsRefresh = !visit || arenaStadiumNeedsRoundSettlement(state)
    || (!!visit.playedAtMs && !pair && pending.length === 0 && !visit.completedAtMs);
  useEffect(() => {
    if (gameOpen || !enterable || !needsRefresh || inFlight.current || error) return;
    inFlight.current = true; setBusy(true);
    void applyArenaStadiumAction({ session, client, expectedVisitKey: key, command: { kind: visit ? 'refresh' : 'enter' } })
      .then(result => { if (result?.complete) completeRef.current(); })
      .catch(() => setError('Your stadium progress could not be saved. Please retry.'))
      .finally(() => { inFlight.current = false; setBusy(false); });
  }, [session, client, key, gameOpen, enterable, needsRefresh, visit, error]);
  async function choose(id: ArenaGameId) {
    if (inFlight.current || busy) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const result = await applyArenaJourneyAction({ session, client, expectedIsland: state.currentIslandNumber,
        command: pair && !pending.length ? { kind: 'compare', pair, winner: id } : { kind: 'introduce', gameId: id } });
      if (!result) setError('Your journey changed. Reopen the stadium to continue.');
    } catch { setError('Could not save just now. Please try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (!enterable || gameOpen) return null;
  const intro = pending[0];
  return <>
    {intro || pair ? <ArenaJourneyDialog required games={intro ? [intro] : pair!} comparison={!intro}
      busy={busy} error={error} onChoose={id => void choose(id)} onClose={() => {}} /> : <>
      <p className="arena-stadium__rule">Finish one round to complete this stadium visit. A loss counts; leaving before a round settles does not.</p>
      {!visit?.playedAtMs && children}
      {!(state.activeTimedEvent && (state.minigameTicketsByEvent[state.activeTimedEvent.eventId] ?? 0) > 0) && !visit?.playedAtMs
        ? <button type="button" className="arena-stadium__earn" onClick={onEarnTickets}>Earn tickets on the board · stadium still required</button> : null}
      {error && <p className="arena-stadium__status" role="alert">{error} <button type="button" onClick={() => setError(null)}>Retry save</button></p>}
      {busy && <p className="arena-stadium__status" role="status">Saving stadium progress…</p>}
    </>}
  </>;
}
