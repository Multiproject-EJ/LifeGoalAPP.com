import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { getEggStageArtSrc } from '../services/eggService';
import type {
  IslandRunArenaBattleState,
  IslandRunArenaPlayerAction,
} from '../services/islandRunCreatureArenaBattle';

interface CreatureArenaBattleOverlayProps {
  open: boolean;
  battle: IslandRunArenaBattleState | null;
  creatureName: string;
  companionName: string;
  isResolving: boolean;
  message: string;
  rewardBanked: boolean;
  onAction: (action: IslandRunArenaPlayerAction) => void;
  onRetry: () => void;
  onLeave: () => void;
  onContinue: () => void;
}

function formatIntent(intent: IslandRunArenaBattleState['opponentIntent']): string {
  switch (intent) {
    case 'quick_attack': return 'Swift strike';
    case 'heavy_attack': return 'Heavy impact';
    case 'guard': return 'Shell guard';
    case 'charge_power': return 'Gathering power';
    case 'release_power': return 'POWER ATTACK INCOMING';
  }
}

function HealthBar({ label, hp, maxHp, opponent = false }: { label: string; hp: number; maxHp: number; opponent?: boolean }) {
  const percent = Math.max(0, Math.min(100, Math.round((hp / Math.max(1, maxHp)) * 100)));
  return (
    <div className={`creature-arena-hud__fighter${opponent ? ' creature-arena-hud__fighter--opponent' : ''}`}>
      <div className="creature-arena-hud__fighter-copy">
        <strong>{label}</strong>
        <span>{hp} / {maxHp}</span>
      </div>
      <div className="creature-arena-hud__health" role="progressbar" aria-label={`${label} health`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function CreatureArenaBattleOverlay(props: CreatureArenaBattleOverlayProps) {
  const { open, battle } = props;
  useEffect(() => {
    if (!open) return undefined;
    return lockPageScroll();
  }, [open]);

  if (!open || !battle || typeof document === 'undefined') return null;
  const powerReady = battle.player.focus >= 2;
  const terminal = battle.phase !== 'awaiting_command';

  return createPortal(
    <div className="island-run-overlay-root creature-arena-hud" role="dialog" aria-modal="true" aria-label={`Battle ${props.creatureName}`}>
      <div className="creature-arena-hud__vignette" aria-hidden="true" />
      <header className="creature-arena-hud__top">
        <div className="creature-arena-hud__title">
          <span>ISLAND 005 · SUNWHEEL ARENA</span>
          <strong>{terminal ? (battle.phase === 'victory' ? 'ARENA CONQUERED' : 'THE DRIFTER HOLDS') : `TURN ${battle.turnNumber}`}</strong>
        </div>
        <button type="button" className="creature-arena-hud__leave" onClick={props.onLeave} aria-label="Leave arena">×</button>
        <div className="creature-arena-hud__health-grid">
          <HealthBar label={props.companionName} hp={battle.player.hp} maxHp={battle.player.maxHp} />
          <HealthBar label={props.creatureName} hp={battle.opponent.hp} maxHp={battle.opponent.maxHp} opponent />
        </div>
        {!terminal ? (
          <div className={`creature-arena-hud__intent${battle.opponentIntent === 'release_power' ? ' creature-arena-hud__intent--danger' : ''}`}>
            <span>OPPONENT INTENT</span>
            <strong>{formatIntent(battle.opponentIntent)}</strong>
          </div>
        ) : null}
      </header>

      <div className={`creature-arena-hud__message${props.isResolving ? ' creature-arena-hud__message--active' : ''}`} role="status" aria-live="polite">
        {props.message}
      </div>

      {battle.phase === 'awaiting_command' ? (
        <footer className="creature-arena-hud__command-deck">
          <div className="creature-arena-hud__resources">
            <span>FOCUS <strong>{battle.player.focus}/3</strong></span>
            <span>ARENA SHIELDS <strong>{battle.player.shieldCharges}/3</strong></span>
          </div>
          <div className="creature-arena-hud__commands">
            <button type="button" disabled={props.isResolving} onClick={() => props.onAction('quick_attack')}>
              <span>⚡</span><strong>Quick</strong><small>Builds focus</small>
            </button>
            <button type="button" className="creature-arena-hud__command--power" disabled={props.isResolving || !powerReady} onClick={() => props.onAction('power_attack')}>
              <span>✦</span><strong>Power</strong><small>{powerReady ? 'Spend 2 focus' : 'Need 2 focus'}</small>
            </button>
            <button type="button" disabled={props.isResolving} onClick={() => props.onAction('guard')}>
              <span>◆</span><strong>Guard</strong><small>Half damage</small>
            </button>
            <button type="button" disabled={props.isResolving} onClick={() => props.onAction('focus')}>
              <span>◉</span><strong>Focus</strong><small>Gain 2 focus</small>
            </button>
          </div>
          <button
            type="button"
            className="creature-arena-hud__shield-command"
            disabled={props.isResolving || battle.player.shieldCharges < 1}
            onClick={() => props.onAction('shield')}
          >
            <span aria-hidden="true">🛡️</span>
            Spend arena shield · blocks most of the next hit
          </button>
        </footer>
      ) : battle.phase === 'victory' ? (
        <section className="creature-arena-hud__result creature-arena-hud__result--victory">
          <div className="creature-arena-hud__egg-glow" aria-hidden="true" />
          <img src={getEggStageArtSrc('rare', 1)} alt="Crown Drifter species egg" />
          <span>FIRST CLEAR REWARD</span>
          <h3>Crown Drifter Egg</h3>
          <p>{props.rewardBanked ? 'Species locked · safely added to your egg inventory.' : 'Securing your exact-species egg…'}</p>
          <button type="button" disabled={!props.rewardBanked} onClick={props.onContinue}>Continue</button>
        </section>
      ) : (
        <section className="creature-arena-hud__result creature-arena-hud__result--defeat">
          <span>THE ARENA REMEMBERS</span>
          <h3>Try a new rhythm</h3>
          <p>Watch the intent. Guard or spend a shield when the Crown Drifter charges.</p>
          <button type="button" onClick={props.onRetry}>Retry with 3 shields</button>
        </section>
      )}
    </div>,
    document.body,
  );
}
