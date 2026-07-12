/**
 * Compact in-game renderer for a single Compass fragment, to be mounted at an
 * Island Run stop (Wisdom slice; Habit-stop overflow slice). It reuses the exact
 * block inputs, goals/habits picker, and AI helper from the Player-Menu book, so
 * answering in-game and in-book are identical. Self-contained and NOT yet wired
 * to the board — that is the next, gameplay-touching PR.
 */

import { useEffect, useState } from 'react';
import type { CompassAnswerValue } from '../types';
import type { CompassAnswerEntry } from '../hooks/useCompassBook';
import { getChapterDefinition } from '../content/compassBookCurriculum';
import {
  fragmentSlotBlocks,
  getIslandFragment,
  isFragmentSlotComplete,
  type IslandFragmentSlot,
} from '../logic/islandFragment';
import { loadCompassPlayerData } from '../services/compassPlayerData';
import { loadCompassShadowBridge } from '../services/compassShadowBridge';
import type { CompassShadowBridgeData } from '../logic/shadowBridge';
import { EMPTY_COMPASS_PLAYER_DATA, type CompassPlayerData } from '../logic/playerOptions';
import { CompassActivityRenderer } from './CompassActivityRenderer';
import { makeHelpSlot, makePickSlot, makeShadowHintSlot } from './compassBlockSlots';

type DraftValues = Record<string, CompassAnswerValue | undefined>;

export type CompassStopFragmentProps = {
  islandNumber: number;
  /** Which slice to present. Defaults to the Wisdom slice. */
  slot?: IslandFragmentSlot;
  /** Signed-in user id, for the goals/habits picker. */
  userId?: string | null;
  /** Previously saved answers for this island's activity (questionId → value). */
  savedValues?: DraftValues;
  saving?: boolean;
  /** Persist the answered slice. The caller writes to `compass_chapter_states`. */
  onSave: (activityId: string, entries: CompassAnswerEntry[]) => Promise<void> | void;
  /** Optional dismiss (only when answering is not required to leave the stop). */
  onSkip?: () => void;
};

export function CompassStopFragment({
  islandNumber,
  slot = 'wisdom',
  userId,
  savedValues,
  saving = false,
  onSave,
  onSkip,
}: CompassStopFragmentProps) {
  const fragment = getIslandFragment(islandNumber);
  const blocks = fragment ? fragmentSlotBlocks(fragment, slot) : [];

  const [draft, setDraft] = useState<DraftValues>(() => ({ ...(savedValues ?? {}) }));
  const [playerData, setPlayerData] = useState<CompassPlayerData>(EMPTY_COMPASS_PLAYER_DATA);
  const [shadowBridge, setShadowBridge] = useState<CompassShadowBridgeData | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCompassPlayerData(userId)
      .then((data) => {
        if (!cancelled) setPlayerData(data);
      })
      .catch(() => {
        /* Pickers degrade to plain text on failure. */
      });
    loadCompassShadowBridge(userId)
      .then((data) => {
        if (!cancelled) setShadowBridge(data);
      })
      .catch(() => {
        /* No personality data — the fragment renders without the hint. */
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Nothing answerable in this slice (e.g. a seal island's Habit overflow).
  if (!fragment || blocks.length === 0) return null;

  const chapter = getChapterDefinition(fragment.chapterId);
  const complete = isFragmentSlotComplete(fragment, slot, draft);
  const activityId = fragment.activityId;

  function handleChange(questionId: string, value: CompassAnswerValue | undefined) {
    setJustSaved(false);
    setDraft((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSave() {
    const entries: CompassAnswerEntry[] = [];
    for (const block of blocks) {
      const value = draft[block.questionId];
      if (value) entries.push({ questionId: block.questionId, value, confirmed: true });
    }
    await onSave(activityId, entries);
    setJustSaved(true);
  }

  return (
    <section className="compass-stop" aria-label="Answer a Compass fragment">
      <header className="compass-stop__header">
        <span className="compass-stop__eyebrow">
          {chapter.title} · Island {fragment.islandNumber}
        </span>
        <h3 className="compass-stop__title">{fragment.title}</h3>
        {fragment.description ? <p className="compass-stop__note">{fragment.description}</p> : null}
      </header>

      <CompassActivityRenderer
        blocks={blocks}
        values={draft}
        onChange={handleChange}
        renderContext={makeShadowHintSlot(fragment.chapterId, shadowBridge, draft, handleChange)}
        renderPick={makePickSlot(playerData, handleChange)}
        renderHelp={makeHelpSlot(fragment.chapterId, draft, handleChange)}
      />

      {justSaved ? <p className="compass-stop__saved">✓ Saved to your Compass Book.</p> : null}

      <div className="compass-stop__actions">
        {onSkip ? (
          <button type="button" className="compass-book__secondary" onClick={onSkip} disabled={saving}>
            Not now
          </button>
        ) : null}
        <button
          type="button"
          className="compass-book__primary"
          onClick={handleSave}
          disabled={!complete || saving}
        >
          {saving ? 'Saving…' : justSaved ? 'Update' : 'Save'}
        </button>
      </div>
    </section>
  );
}
