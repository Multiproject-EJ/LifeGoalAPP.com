import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, canUseSupabaseData } from '../../../../lib/supabaseClient';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { isDemoSession } from '../../../../services/demoSession';
import { useGamification } from '../../../../hooks/useGamification';
import {
  fetchAdventureLeagueMembership,
  fetchLeaderboardSnapshot,
  joinAdventureLeague,
  refreshAdventureLeagueEntry,
  type LeaderboardEntry,
} from '../../../../services/leaderboard';
import {
  QUICK_ARCHETYPE_QUESTIONS,
  readLocalQuickArchetype,
  resolvePlayerArchetypeLabel,
  scoreQuickArchetypeQuiz,
  writeLocalQuickArchetype,
} from '../../../identity/quickArchetype/quickArchetypeQuiz';
import { ARCHETYPE_DECK, SUIT_COLORS, SUIT_LABELS, type ArchetypeCard } from '../../../identity/archetypes/archetypeDeck';
import './IslandRunScoreboardModal.css';

type Phase = 'intro' | 'quiz' | 'reveal' | 'league';

/**
 * In-game Scoreboard: the Adventure League, archetype first. Players without
 * an archetype take an 8-question quick quiz that places them in the 32-card
 * identity deck; the result is saved on the account (and on the device for
 * guests) and shown on the league. Joining the public league stays opt-in.
 */
export interface ScoreboardPreviewData { top: LeaderboardEntry[]; around: LeaderboardEntry[]; rank: number | null; phase?: Phase }

export function IslandRunScoreboardModal({ session, onClose, preview }: { session: Session; onClose: () => void; preview?: ScoreboardPreviewData }) {
  const userId = session.user.id;
  const metadata = session.user.user_metadata as Record<string, unknown> | undefined;
  const [localArchetype, setLocalArchetype] = useState(() => readLocalQuickArchetype(userId));
  const archetypeLabel = resolvePlayerArchetypeLabel(metadata, localArchetype);
  const [phase, setPhase] = useState<Phase>(preview?.phase ?? (archetypeLabel ? 'league' : 'intro'));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState<ArchetypeCard | null>(null);
  const { profile, levelInfo } = useGamification(session);
  const [joined, setJoined] = useState<boolean | null>(preview ? true : null);
  const [entries, setEntries] = useState<{ top: LeaderboardEntry[]; around: LeaderboardEntry[]; rank: number | null }>(preview ?? { top: [], around: [], rank: null });
  const [filter, setFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloud = Boolean(preview) || (canUseSupabaseData() && !isDemoSession(session));

  useEffect(() => lockPageScroll(), []);

  const displayName = useMemo(() => {
    const name = [metadata?.display_name, metadata?.full_name, metadata?.name].find((v) => typeof v === 'string' && v.trim());
    return typeof name === 'string' ? name : session.user.email?.split('@')[0] || 'Explorer';
  }, [metadata, session.user.email]);
  const level = profile?.combined_journey_level ?? levelInfo?.currentLevel ?? 1;
  const xp = profile?.combined_journey_xp ?? profile?.total_xp ?? 0;

  const loadLeague = useCallback(async () => {
    if (!cloud || preview) return;
    setBusy(true);
    setError(null);
    const membership = await fetchAdventureLeagueMembership(userId);
    setJoined(membership.data.joined);
    if (membership.error) setError(membership.error);
    if (membership.data.joined) {
      if (archetypeLabel) {
        await refreshAdventureLeagueEntry({ viewerUserId: userId, displayName, archetype: archetypeLabel, level, combinedJourneyXp: xp });
      }
      const snapshot = await fetchLeaderboardSnapshot({ viewerUserId: userId, topLimit: 25, contextRadius: 3 });
      setEntries({ top: snapshot.data.topEntries, around: snapshot.data.viewerEntries, rank: snapshot.data.viewerRank });
      if (snapshot.error) setError(snapshot.error);
    }
    setBusy(false);
  }, [archetypeLabel, cloud, displayName, level, userId, xp]);

  useEffect(() => { if (phase === 'league') void loadLeague(); }, [loadLeague, phase]);

  const answer = (answerId: string) => {
    const question = QUICK_ARCHETYPE_QUESTIONS[questionIndex];
    const next = { ...answers, [question.id]: answerId };
    setAnswers(next);
    if (questionIndex + 1 < QUICK_ARCHETYPE_QUESTIONS.length) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    const { dominant } = scoreQuickArchetypeQuiz(next);
    setLocalArchetype(writeLocalQuickArchetype(userId, dominant));
    setRevealed(dominant);
    setPhase('reveal');
    if (cloud) {
      // The leaderboard reads this label from the account.
      void getSupabaseClient().auth.updateUser({
        data: { personality_profile_type: dominant.name, archetype_card_id: dominant.id, archetype_source: 'quick_quiz' },
      }).catch(() => undefined);
    }
  };

  const join = async () => {
    setBusy(true);
    const result = await joinAdventureLeague({ viewerUserId: userId, displayName, archetype: archetypeLabel ?? 'Uncharted', level, combinedJourneyXp: xp });
    setBusy(false);
    if (result.error || !result.data.joined) { setError(result.error ?? 'Could not join right now.'); return; }
    setJoined(true);
    void loadLeague();
  };

  const card = revealed ?? ARCHETYPE_DECK.find((entry) => entry.name === archetypeLabel) ?? null;
  const archetypes = Array.from(new Set(entries.top.map((entry) => entry.archetype))).sort();
  const shownTop = filter ? entries.top.filter((entry) => entry.archetype === filter) : entries.top;

  const renderRow = (entry: LeaderboardEntry) => {
    const deckCard = ARCHETYPE_DECK.find((c) => c.name === entry.archetype);
    return (
      <li key={`${entry.rank}-${entry.userId}`} className={entry.userId === userId ? 'is-me' : undefined}>
        <b>#{entry.rank}</b>
        <span className="scoreboard-row__icon" style={{ background: deckCard ? SUIT_COLORS[deckCard.suit] : '#64748b' }} aria-hidden="true">{deckCard?.icon ?? '❔'}</span>
        <span className="scoreboard-row__who"><strong>{entry.playerName}</strong><small>{entry.archetype} · Lv {entry.level}</small></span>
        <em>{entry.combinedWealth.toLocaleString()} XP</em>
      </li>
    );
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="scoreboard-modal" role="dialog" aria-modal="true" aria-labelledby="scoreboard-title">
      <div className="scoreboard-modal__backdrop" onClick={onClose} />
      <section className="scoreboard-modal__card" data-phase={phase}>
        <button type="button" className="scoreboard-modal__close" aria-label="Close scoreboard" onClick={onClose}>×</button>
        {phase === 'intro' ? (
          <div className="scoreboard-intro">
            <p className="scoreboard-modal__kicker">🏆 Scoreboard</p>
            <h2 id="scoreboard-title">First, find your archetype</h2>
            <p>Everyone on the Adventure League plays as an archetype. Answer 8 quick questions to discover yours. It takes about a minute.</p>
            <div className="scoreboard-intro__suits" aria-hidden="true">
              {(['power', 'heart', 'mind', 'spirit'] as const).map((suit) => <span key={suit} style={{ background: SUIT_COLORS[suit] }}>{SUIT_LABELS[suit].split(' ')[0]}</span>)}
            </div>
            <button type="button" className="scoreboard-modal__primary" onClick={() => setPhase('quiz')}>Start the quiz</button>
          </div>
        ) : null}
        {phase === 'quiz' ? (() => {
          const question = QUICK_ARCHETYPE_QUESTIONS[questionIndex];
          return (
            <div className="scoreboard-quiz" key={question.id}>
              <p className="scoreboard-modal__kicker">Question {questionIndex + 1} of {QUICK_ARCHETYPE_QUESTIONS.length}</p>
              <div className="scoreboard-quiz__progress" aria-hidden="true"><i style={{ width: `${(questionIndex / QUICK_ARCHETYPE_QUESTIONS.length) * 100}%` }} /></div>
              <h2 id="scoreboard-title">{question.prompt}</h2>
              <div className="scoreboard-quiz__answers">
                {question.answers.map((option) => (
                  <button key={option.id} type="button" onClick={() => answer(option.id)}>
                    <span aria-hidden="true">{option.icon}</span>{option.label}
                  </button>
                ))}
              </div>
              {questionIndex > 0 ? <button type="button" className="scoreboard-modal__link" onClick={() => setQuestionIndex(questionIndex - 1)}>‹ Back</button> : null}
            </div>
          );
        })() : null}
        {phase === 'reveal' && card ? (
          <div className="scoreboard-reveal">
            <p className="scoreboard-modal__kicker">Your archetype</p>
            <div className="scoreboard-reveal__card" style={{ '--suit': SUIT_COLORS[card.suit] } as React.CSSProperties}>
              <span aria-hidden="true">{card.icon}</span>
              <h2 id="scoreboard-title">{card.name}</h2>
              <small>{SUIT_LABELS[card.suit]}</small>
              <p>{card.drive}</p>
              <ul>{card.strengths.slice(0, 2).map((strength) => <li key={strength}>✦ {strength}</li>)}</ul>
            </div>
            <p className="scoreboard-reveal__note">Take the full personality test anytime to refine it.</p>
            <button type="button" className="scoreboard-modal__primary" onClick={() => setPhase('league')}>See the scoreboard</button>
          </div>
        ) : null}
        {phase === 'league' ? (
          <div className="scoreboard-league">
            <p className="scoreboard-modal__kicker">🏆 Adventure League</p>
            <h2 id="scoreboard-title">Scoreboard</h2>
            {card ? (
              <div className="scoreboard-league__me" style={{ '--suit': SUIT_COLORS[card.suit] } as React.CSSProperties}>
                <span aria-hidden="true">{card.icon}</span>
                <span><strong>{displayName}</strong><small>{card.name} · Lv {level} · {xp.toLocaleString()} XP</small></span>
                <button type="button" className="scoreboard-modal__link" onClick={() => { setAnswers({}); setQuestionIndex(0); setRevealed(null); setPhase('quiz'); }}>Retake</button>
              </div>
            ) : null}
            {!cloud ? (
              <p className="scoreboard-league__note">Sign in or save your progress to see the Adventure League and appear on it.</p>
            ) : joined === false ? (
              <div className="scoreboard-league__join">
                <p>Joining shows your name, archetype, level and Journey XP to other signed-in players. You can leave anytime from the Score tab.</p>
                <button type="button" className="scoreboard-modal__primary" onClick={() => void join()} disabled={busy}>{busy ? 'Joining…' : 'Join the Adventure League'}</button>
              </div>
            ) : (
              <>
                {archetypes.length > 1 ? (
                  <div className="scoreboard-league__filters" role="tablist" aria-label="Filter by archetype">
                    <button type="button" className={filter === null ? 'is-active' : undefined} onClick={() => setFilter(null)}>All</button>
                    {archetypes.map((name) => <button type="button" key={name} className={filter === name ? 'is-active' : undefined} onClick={() => setFilter(name)}>{name}</button>)}
                  </div>
                ) : null}
                {busy && entries.top.length === 0 ? <p className="scoreboard-league__note">Loading the league…</p> : null}
                <ol className="scoreboard-league__list">{shownTop.slice(0, 10).map(renderRow)}</ol>
                {entries.rank && entries.rank > 10 ? (
                  <>
                    <p className="scoreboard-league__divider">Around you · #{entries.rank}</p>
                    <ol className="scoreboard-league__list">{entries.around.map(renderRow)}</ol>
                  </>
                ) : null}
              </>
            )}
            {error ? <p className="scoreboard-league__error" role="alert">{error}</p> : null}
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
