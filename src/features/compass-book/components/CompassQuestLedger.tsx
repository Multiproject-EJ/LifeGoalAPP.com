import type { ReactNode } from 'react';

/**
 * A single instrument in the Quest Ledger — one of the tools that used to live
 * in the My Quest launcher submenu (Quest Pulse, Habits, Goals, Check-ins…).
 * The host app owns what each one does; the ledger only draws them in the
 * book's voice.
 */
export type CompassQuestLedgerEntry = {
  /** Stable id, used as the React key and for per-entry styling hooks. */
  id: string;
  title: string;
  /** One line in the book's voice, e.g. "The rituals that carry your days." */
  note: string;
  /** An inked glyph (text, not emoji) drawn in the entry's medallion. */
  glyph: string;
  /**
   * Feature-availability stamp. Mirrors the old submenu's status badges
   * (coming-soon / demo / feedback-sent) as small ink stamps.
   */
  stamp?: { label: string; kind: 'soon' | 'demo' | 'voted' } | null;
  onSelect: () => void;
};

export type CompassQuestLedgerProps = {
  entries: CompassQuestLedgerEntry[];
  /**
   * Write a new habit or goal without leaving the book. Every other entry hands
   * off to a workspace and closes the book; this one stays on the page, so it
   * is presented as the page's own action rather than a ninth instrument.
   */
  onInscribe?: () => void;
  /**
   * The restyled Quest Hub summary (pillars, radar, active quest line),
   * supplied by the host so the book stays decoupled from goal/habit services.
   */
  hub?: ReactNode;
  onBack: () => void;
  onClose: () => void;
};

/**
 * The Quest Ledger — the page after chapter VI, holding everything the old
 * My Quest menu held: the hub summary and the eight instruments. Unlike the
 * chapters it is never island-gated and stores nothing; it is a table of the
 * player's living tools, drawn in ink.
 */
export function CompassQuestLedger({
  entries,
  onInscribe,
  hub,
  onBack,
  onClose,
}: CompassQuestLedgerProps) {
  return (
    <>
      <header className="compass-book__topbar">
        <button
          type="button"
          className="compass-book__back"
          onClick={onBack}
          aria-label="Back to the Reading"
        >
          <span aria-hidden="true">←</span> The Reading
        </button>
        <span className="compass-book__topbar-spacer" />
        <button
          type="button"
          className="compass-book__close"
          onClick={onClose}
          aria-label="Close Compass Book"
        >
          ✕
        </button>
      </header>
      <div className="compass-book__scroll">
        <section className="compass-book__chapter-hero">
          <p className="compass-book__chapter-eyebrow">
            <span className="compass-book__chapter-numeral">⚑</span>
            {' · '}
            The player&rsquo;s page
          </p>
          <h1 className="compass-book__chapter-title">Quest Ledger</h1>
          <p className="compass-book__chapter-question">
            Every instrument of your journey, kept in one binding.
          </p>
        </section>

        {onInscribe ? (
          <button
            type="button"
            className="compass-quest-ledger__inscribe"
            onClick={onInscribe}
          >
            <span className="compass-quest-ledger__inscribe-glyph" aria-hidden="true">
              ✒
            </span>
            <span className="compass-quest-ledger__inscribe-copy">
              <span className="compass-quest-ledger__inscribe-title">Inscribe a new entry</span>
              <span className="compass-quest-ledger__inscribe-note">
                A habit or a quest, written here on the page.
              </span>
            </span>
          </button>
        ) : null}

        {/* Instruments lead. This page replaced a *menu*, so the menu is what
            the player came for; the hub summary is context and sits beneath it.
            (Ordered the other way the eight entries opened ~2.6 screens down.) */}
        <ul className="compass-quest-ledger__list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={`compass-quest-ledger__entry compass-quest-ledger__entry--${entry.id}`}
                onClick={entry.onSelect}
              >
                <span className="compass-quest-ledger__medallion" aria-hidden="true">
                  {entry.glyph}
                </span>
                <span className="compass-quest-ledger__copy">
                  <span className="compass-quest-ledger__title">{entry.title}</span>
                  <span className="compass-quest-ledger__note">{entry.note}</span>
                </span>
                {entry.stamp ? (
                  <span
                    className={`compass-quest-ledger__stamp compass-quest-ledger__stamp--${entry.stamp.kind}`}
                  >
                    {entry.stamp.label}
                  </span>
                ) : null}
                <span className="compass-quest-ledger__chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>

        {hub ? (
          <>
            <p className="compass-quest-ledger__rule" aria-hidden="true">
              ✦ &nbsp;Where you stand&nbsp; ✦
            </p>
            <div className="compass-quest-ledger__hub">{hub}</div>
          </>
        ) : null}
      </div>
    </>
  );
}
