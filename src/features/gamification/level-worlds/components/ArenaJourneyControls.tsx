import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import { useIslandRunState } from '../hooks/useIslandRunState';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import { ARENA_GAME_CATALOG, getArenaGameDefinition, type ArenaGameId } from '../services/islandRunArenaCatalog';
import { ARENA_DEMO_IDS, ARENA_INTRODUCTIONS, canCompareArenaGames, nextArenaComparison, pendingArenaIntroductions } from '../services/arenaJourney';
import { applyArenaJourneyAction, resolveArenaJourney } from '../services/arenaJourneyActions';
import { resolveIslandRunFeatureAccess } from '../services/islandRunFeatureAccess';
import './ArenaJourneyControls.css';

const introductionCopy: Partial<Record<ArenaGameId, string>> = {
  signal_path: 'The caretaker invites you to connect the beacons. Trace one continuous route through the grid. Start with Signal Path; more games join your catalogue as you explore.',
  crystal_miners: 'The mining crew has a workshop for you. Open your gifts, merge matching tools, then choose Drop to explore the cavern. Your tools and discoveries stay with you between islands.',
  journey_disc_arena: 'The Arena crew welcomes you to the chapter exhibition. Deploy one to four discs and knock your rivals out. Your armory travels with you; exhibitions return on Islands 006, 011, 016 and onward.',
};

/** Presentation-only; the owning controls/action revalidate both receipts on every vote. */
export function ArenaJourneyDialog({ games, comparison, busy, error, onChoose, onClose }: {
  games: readonly ArenaGameId[]; comparison: boolean; busy: boolean; error: string | null;
  onChoose: (id: ArenaGameId) => void; onClose: () => void;
}) {
  const focus = useVaultModalFocusTrap<HTMLDivElement>(() => { if (!busy) onClose(); });
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  return createPortal(<div className="arena-journey-overlay" ref={focus} tabIndex={-1}>
    <section className="arena-journey-dialog" role="dialog" aria-modal="true" aria-labelledby="arena-journey-title">
      <p className="arena-journey-eyebrow">{comparison ? 'Your experience matters' : 'A new game joins your journey'}</p>
      <h2 id="arena-journey-title">{comparison ? 'Which would you play again?' : getArenaGameDefinition(games[0]!).displayName}</h2>
      <p className="arena-journey-subtitle">{comparison ? 'You’ve played both. Pick the one you enjoyed more.' : `Introduced from Island ${String(ARENA_INTRODUCTIONS[games[0]!]).padStart(3, '0')}`}</p>
      <div className={`arena-journey-halves${comparison ? '' : ' is-introduction'}`}>
        {games.map((id, index) => {
          const game = getArenaGameDefinition(id);
          return <div className="arena-journey-half" key={id}>
            {comparison && index === 1 && <span className="arena-journey-divider" aria-hidden="true">OR</span>}
            <button type="button" style={{ '--game-accent': game.accent } as CSSProperties} disabled={busy} onClick={() => onChoose(id)}
              aria-label={comparison ? `Prefer ${game.displayName}` : `Add ${game.displayName} to my catalogue`}>
              <span className="arena-journey-art" aria-hidden="true">{id === 'signal_path' ? <svg viewBox="0 0 160 140">
                <g fill="#76f0d011" stroke="#76f0d033">{Array.from({ length: 12 }, (_, n) => <rect key={n} x={18 + n % 4 * 32} y={20 + Math.floor(n / 4) * 32} width="26" height="26" rx="7" />)}</g>
                <path d="M31 33H127V65H31V97H127" fill="none" stroke="#76f0d0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                {[[31,33,'1'],[95,65,'2'],[127,97,'3']].map(([x,y,label]) => <g key={label}><circle cx={x} cy={y} r="12" fill="#0b2932" stroke="#a0ffe7" strokeWidth="2"/><text x={x} y={Number(y)+4} textAnchor="middle" fill="#eafffa" fontSize="12" fontFamily="system-ui">{label}</text></g>)}
              </svg> : game.iconSrc || game.artSrc ? <img src={game.iconSrc ?? game.artSrc!} alt="" /> : <span>{game.icon}</span>}</span>
              <small>{game.familyLabel}</small><strong>{game.displayName}</strong>
              <p>{comparison ? game.description : introductionCopy[id]}</p>
              <b>{comparison ? 'My pick' : 'Add to my catalogue'} <span aria-hidden="true">↗</span></b>
            </button>
          </div>;
        })}
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="button" className="arena-journey-skip" onClick={onClose} disabled={busy}>{busy ? 'Saving…' : comparison ? 'Skip for now' : 'Later'}</button>
    </section>
  </div>, document.body);
}

export function ArenaJourneyControls({ session, client, verifiedDev, enabledDemos, onToggleDemo, onLaunchDemo }: {
  session: Session; client: SupabaseClient | null; verifiedDev: boolean; enabledDemos: readonly ArenaGameId[];
  onToggleDemo: (id: ArenaGameId) => void; onLaunchDemo: (id: ArenaGameId) => void;
}) {
  const { state } = useIslandRunState(session, client);
  const progress = resolveArenaJourney(state), island = state.currentIslandNumber;
  const pending = pendingArenaIntroductions(island, progress);
  const comparisonPair = nextArenaComparison(island, progress);
  const [panel, setPanel] = useState<{ games: ArenaGameId[]; comparison: boolean; island: number } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const eligible = !!panel && panel.island === island && (panel.comparison
    ? canCompareArenaGames(panel.games, island, progress) : pending.includes(panel.games[0]!));
  useEffect(() => { if (panel && !eligible) setPanel(null); }, [panel, eligible]);
  const choose = async (id: ArenaGameId) => {
    if (!panel || !eligible || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await applyArenaJourneyAction({ session, client, expectedIsland: panel.island,
        command: panel.comparison ? { kind: 'compare', pair: panel.games as [ArenaGameId, ArenaGameId], winner: id } : { kind: 'introduce', gameId: id } });
      if (result) setPanel(null); else setError('Your journey changed. Close this card and try again.');
    } catch { setError('Could not save just now. Please try again.'); }
    finally { setBusy(false); }
  };
  if (!resolveIslandRunFeatureAccess(state).ordinaryEvents) return null;
  return <div className="arena-journey-controls">
    {pending[0] && <button type="button" onClick={() => { setError(null); setPanel({ games: [pending[0]!], comparison: false, island }); }}>
      Meet {getArenaGameDefinition(pending[0]).displayName} <span aria-hidden="true">✦</span>
    </button>}
    {comparisonPair && <button type="button" onClick={() => { setError(null); setPanel({ games: comparisonPair, comparison: true, island }); }}>Compare played games</button>}
    {verifiedDev && <details className="arena-journey-lab"><summary>Developer lab · previews off by default</summary>
      <p>These are not released or introduced games. Previews do not unlock catalogue or comparison credit. Normal ticket rules still apply.</p>
      {ARENA_GAME_CATALOG.filter(game => !ARENA_INTRODUCTIONS[game.id]).map(game => <div key={game.id}>
        <label><input type="checkbox" checked={enabledDemos.includes(game.id)} onChange={() => onToggleDemo(game.id)} />{game.displayName} · {ARENA_DEMO_IDS.includes(game.id) ? 'Demo' : 'Unreleased'}</label>
        <button type="button" disabled={!enabledDemos.includes(game.id)} onClick={() => onLaunchDemo(game.id)}>Preview</button>
      </div>)}
    </details>}
    {eligible && panel && <ArenaJourneyDialog games={panel.games} comparison={panel.comparison} busy={busy} error={error} onChoose={id => void choose(id)} onClose={() => setPanel(null)} />}
  </div>;
}
