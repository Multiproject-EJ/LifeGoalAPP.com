import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { COMPASS_BOOK_CHAPTER_IDS, type CompassAnswerValue } from '../../../compass-book/types';
import { getChapterDefinition } from '../../../compass-book/content/compassBookCurriculum';
import { useCompassBook, type CompassAnswerEntry } from '../../../compass-book/hooks/useCompassBook';
import {
  areBlocksAnswered,
  getIslandFragment,
} from '../../../compass-book/logic/islandFragment';
import {
  buildCompassIllumination,
  type CompassIlluminationSignal,
} from '../../../compass-book/logic/compassIllumination';
import { buildWisdomCompassInsight } from '../../../compass-book/logic/wisdomCompassInsight';
import {
  EMPTY_COMPASS_PLAYER_DATA,
  type CompassPlayerData,
} from '../../../compass-book/logic/playerOptions';
import { loadCompassPlayerData } from '../../../compass-book/services/compassPlayerData';
import { loadCompassShadowBridge } from '../../../compass-book/services/compassShadowBridge';
import {
  getNativeCompassAIStatus,
  suggestPrivateCompassNextStep,
  type NativeCompassAIStatus,
} from '../../../compass-book/services/nativeCompassAI';
import type { CompassShadowBridgeData } from '../../../compass-book/logic/shadowBridge';
import { CompassActivityRenderer } from '../../../compass-book/components/CompassActivityRenderer';
import {
  makeHelpSlot,
  makeInnerCompassHintSlot,
  makePickSlot,
} from '../../../compass-book/components/compassBlockSlots';

type DraftValues = Record<string, CompassAnswerValue | undefined>;

type WisdomCaretakerCompassEncounterProps = {
  session: Session;
  islandNumber: number;
  onComplete: (message: string) => void;
  onComeBackLater?: () => void;
  /** Dev-only visual proof: deterministic in-memory Compass, with no remote/local writes. */
  previewMode?: boolean;
};

function savedDraftForActivity(
  activityId: string,
  answers: ReadonlyArray<{ activityId: string; questionId: string; value: CompassAnswerValue }>,
): DraftValues {
  const draft: DraftValues = {};
  for (const answer of answers) {
    if (answer.activityId === activityId) draft[answer.questionId] = answer.value;
  }
  return draft;
}

function scoreAriaLabel(signal: CompassIlluminationSignal): string {
  return `${signal.label}: ${signal.score} of 4, ${signal.stateLabel}`;
}

export function WisdomCaretakerCompassEncounter({
  session,
  islandNumber,
  onComplete,
  onComeBackLater,
  previewMode = false,
}: WisdomCaretakerCompassEncounterProps) {
  const fragment = useMemo(() => getIslandFragment(islandNumber), [islandNumber]);
  const book = useCompassBook(session, { demo: previewMode });
  const syncedActivityRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<DraftValues>({});
  const [playerData, setPlayerData] = useState<CompassPlayerData>(EMPTY_COMPASS_PLAYER_DATA);
  const [shadowBridge, setShadowBridge] = useState<CompassShadowBridgeData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [stage, setStage] = useState<'question' | 'insight'>('question');
  const [nativeAIStatus, setNativeAIStatus] = useState<NativeCompassAIStatus | null>(null);
  const [nativeAISuggestion, setNativeAISuggestion] = useState<string | null>(null);
  const [nativeAIError, setNativeAIError] = useState<string | null>(null);
  const [nativeAIBusy, setNativeAIBusy] = useState(false);

  useEffect(() => {
    syncedActivityRef.current = null;
    setDraft({});
    setDirty(false);
    setSavingError(null);
    setStage('question');
    setNativeAISuggestion(null);
    setNativeAIError(null);
  }, [fragment?.activityId]);

  useEffect(() => {
    if (previewMode) {
      setPlayerData(EMPTY_COMPASS_PLAYER_DATA);
      setShadowBridge(null);
      return undefined;
    }
    let cancelled = false;
    void getNativeCompassAIStatus().then((status) => {
      if (!cancelled) setNativeAIStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fragment || dirty) return;
    const syncKey = `${fragment.activityId}:${book.ready ? 'ready' : 'local'}`;
    if (syncedActivityRef.current === syncKey) return;
    const state = book.getChapterState(fragment.chapterId);
    const saved = savedDraftForActivity(fragment.activityId, state?.answers ?? []);
    setDraft(saved);
    syncedActivityRef.current = syncKey;
  }, [book.ready, book.getChapterState, dirty, fragment]);

  useEffect(() => {
    if (previewMode) {
      setPlayerData(EMPTY_COMPASS_PLAYER_DATA);
      setShadowBridge(null);
      return undefined;
    }
    let cancelled = false;
    void Promise.all([
      loadCompassPlayerData(session.user.id),
      loadCompassShadowBridge(session.user.id),
    ]).then(([nextPlayerData, nextShadowBridge]) => {
      if (cancelled) return;
      setPlayerData(nextPlayerData);
      setShadowBridge(nextShadowBridge);
    }).catch(() => {
      /* Both context layers are optional; the authored question still works. */
    });
    return () => {
      cancelled = true;
    };
  }, [previewMode, session.user.id]);

  const illumination = useMemo(() => {
    const counts = Object.fromEntries(COMPASS_BOOK_CHAPTER_IDS.map((chapterId) => {
      const progress = book.getProgress(chapterId, 120);
      return [chapterId, { completed: progress.completedCount, total: progress.totalCount }];
    }));
    return buildCompassIllumination(counts);
  }, [book.getProgress]);

  if (!fragment || fragment.inputs.length === 0) {
    return (
      <section className="wisdom-caretaker" aria-label="Wisdom caretaker">
        <p className="wisdom-caretaker__error">This island&apos;s Compass question is not available yet.</p>
        {onComeBackLater ? (
          <button type="button" className="wisdom-caretaker__later" onClick={onComeBackLater}>
            Come back later
          </button>
        ) : null}
      </section>
    );
  }

  const chapter = getChapterDefinition(fragment.chapterId);
  const complete = areBlocksAnswered(fragment.inputs, draft);
  const insight = buildWisdomCompassInsight({
    chapterId: fragment.chapterId,
    blocks: fragment.inputs,
    values: draft,
    playerData,
  });
  const activeSignal = illumination.find((signal) => signal.id === insight.signalId)
    ?? illumination[0];

  const handleChange = (questionId: string, value: CompassAnswerValue | undefined) => {
    setDirty(true);
    setSavingError(null);
    setDraft((current) => ({ ...current, [questionId]: value }));
  };

  const handleSave = async () => {
    if (!complete || book.saving) return;
    setSavingError(null);
    const entries: CompassAnswerEntry[] = fragment.inputs.flatMap((block) => {
      const value = draft[block.questionId];
      return value ? [{ questionId: block.questionId, value, confirmed: true }] : [];
    });
    try {
      await book.saveActivityAnswers(fragment.chapterId, fragment.activityId, entries);
      setDirty(false);
      setStage('insight');
    } catch {
      setSavingError('Your answer is still on this screen. Please try saving it again.');
    }
  };

  const handleNativeAISuggestion = async () => {
    if (!nativeAIStatus?.available || nativeAIBusy) return;
    setNativeAIBusy(true);
    setNativeAIError(null);
    try {
      const text = await suggestPrivateCompassNextStep({
        question: fragment.inputs.map((block) => block.prompt).join(' '),
        answer: insight.answerSummary,
        authoredMeaning: insight.interpretation,
        authoredBridge: insight.bridge,
      });
      setNativeAISuggestion(text);
    } catch {
      setNativeAIError('Your authored Compass insight is safe. The optional iPhone suggestion was not available this time.');
    } finally {
      setNativeAIBusy(false);
    }
  };

  if (stage === 'insight') {
    return (
      <section className="wisdom-caretaker wisdom-caretaker--insight" aria-labelledby="wisdom-insight-title">
        <div className="wisdom-caretaker__ornament" aria-hidden="true">✦</div>
        <header className="wisdom-caretaker__insight-header">
          <span>Saved to your Compass Book</span>
          <h2 id="wisdom-insight-title">Your choice has a home</h2>
          <p>Miri keeps the answer as a clue — never a permanent label.</p>
        </header>

        <div className="wisdom-caretaker__answer">
          <small>You chose</small>
          <strong>{insight.answerSummary}</strong>
        </div>

        <div className="wisdom-caretaker__meaning">
          <div>
            <span aria-hidden="true">✧</span>
            <p><strong>What this clarifies</strong>{insight.interpretation}</p>
          </div>
          <div>
            <span aria-hidden="true">↗</span>
            <p><strong>Where it connects</strong>{insight.bridge}</p>
          </div>
        </div>

        <div className="wisdom-caretaker__signal-focus">
          <div>
            <span>{activeSignal.label} signal</span>
            <strong>{activeSignal.stateLabel}</strong>
          </div>
          <b>{activeSignal.score}<small>/4</small></b>
        </div>

        <div className="wisdom-caretaker__scores" aria-label="Compass illumination">
          {illumination.map((signal) => (
            <div
              key={signal.id}
              className={`wisdom-caretaker__score${signal.id === activeSignal.id ? ' is-active' : ''}`}
              aria-label={scoreAriaLabel(signal)}
            >
              <span>{signal.label}</span>
              <strong>{signal.score}</strong>
              <small>{signal.stateLabel}</small>
            </div>
          ))}
        </div>

        <div className="wisdom-caretaker__next-step">
          <span aria-hidden="true">⌁</span>
          <p><strong>A practical use</strong>{insight.nextStep}</p>
        </div>

        <p className="wisdom-caretaker__growth-note">{insight.growthNote}</p>

        {nativeAIStatus?.available ? (
          <aside className="wisdom-caretaker__native-ai" aria-label="Optional private iPhone reflection">
            <div>
              <span aria-hidden="true">⌁</span>
              <p>
                <strong>Optional on-device AI</strong>
                Only this question and answer are processed privately on this iPhone. The Compass works fully without it.
              </p>
            </div>
            {nativeAISuggestion ? (
              <blockquote>{nativeAISuggestion}</blockquote>
            ) : (
              <button type="button" disabled={nativeAIBusy} onClick={() => void handleNativeAISuggestion()}>
                {nativeAIBusy ? 'Miri is considering…' : 'Suggest one gentle next step'}
              </button>
            )}
            {nativeAIError ? <small role="status">{nativeAIError}</small> : null}
          </aside>
        ) : null}

        <button
          type="button"
          className="wisdom-caretaker__continue"
          onClick={() => onComplete(
            `${fragment.title} saved to your Compass Book. ${activeSignal.label}: ${activeSignal.stateLabel}.`,
          )}
        >
          Continue the island
          <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="wisdom-caretaker__edit" onClick={() => setStage('question')}>
          Revise my answer
        </button>
      </section>
    );
  }

  return (
    <section className="wisdom-caretaker" aria-labelledby="wisdom-caretaker-title">
      <header className="wisdom-caretaker__header">
        <div className="wisdom-caretaker__crest" aria-hidden="true">✦</div>
        <div>
          <p>Miri · Wisdom caretaker</p>
          <h2 id="wisdom-caretaker-title">{fragment.title}</h2>
        </div>
        <span>{islandNumber}/120</span>
      </header>

      <div className="wisdom-caretaker__chapter-line">
        <span>{chapter.title}</span>
        <i aria-hidden="true" />
        <strong>{activeSignal.label}</strong>
      </div>

      <p className="wisdom-caretaker__invitation">
        Choose what feels most true right now. There is no wrong answer, and you can revise it later.
      </p>

      {!book.ready ? <p className="wisdom-caretaker__loading">Opening your private Compass…</p> : null}

      <div className="wisdom-caretaker__question-card">
        <CompassActivityRenderer
          blocks={fragment.inputs}
          values={draft}
          onChange={handleChange}
          renderContext={makeInnerCompassHintSlot(fragment.chapterId, shadowBridge, draft, handleChange)}
          renderPick={makePickSlot(playerData, handleChange)}
          renderHelp={makeHelpSlot(fragment.chapterId, draft, handleChange)}
        />
      </div>

      {savingError ? <p className="wisdom-caretaker__error" role="alert">{savingError}</p> : null}

      <button
        type="button"
        className="wisdom-caretaker__save"
        disabled={!complete || book.saving}
        onClick={() => void handleSave()}
      >
        {book.saving ? 'Placing the insight…' : 'Place this in my Compass'}
        <span aria-hidden="true">✦</span>
      </button>

      {onComeBackLater ? (
        <button type="button" className="wisdom-caretaker__later" onClick={onComeBackLater} disabled={book.saving}>
          Come back later
        </button>
      ) : null}
    </section>
  );
}
