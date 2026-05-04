import type { ArchetypeHand } from '../../identity/archetypes/archetypeHandBuilder';
import { PlayersHandSparkPreview } from '../spark-preview';

type MyPlayerHandPanelProps = {
  hand?: ArchetypeHand | null;
  compact?: boolean;
};

export function MyPlayerHandPanel({ hand, compact = false }: MyPlayerHandPanelProps) {
  if (!hand) {
    return (
      <section
        className={compact ? "player-avatar-panel__section player-avatar-panel__section--compact-hand" : "player-avatar-panel__section"}
        aria-label="My player hand locked"
      >
        <h2 className="player-avatar-panel__section-title">My Player Hand</h2>
        <p className="player-avatar-panel__section-subtitle">Take the personality test to unlock your hand.</p>
      </section>
    );
  }

  return (
    <section
      className={compact ? "player-avatar-panel__section player-avatar-panel__section--compact-hand" : "player-avatar-panel__section"}
      aria-label="My player hand"
    >
      <h2 className="player-avatar-panel__section-title">My Player Hand</h2>
      <p className="player-avatar-panel__section-subtitle">Open your hand anytime from your profile.</p>
      <PlayersHandSparkPreview hand={hand} title="My Player Hand" compact={compact} />
    </section>
  );
}
