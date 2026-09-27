import type { PersonalityScores } from '../personalityScoring';
import type { AxisKey, TraitKey } from '../personalityTestData';
import { ARCHETYPE_DECK, type ArchetypeCard } from '../archetypes/archetypeDeck';
import { rankArchetypes, scoreArchetypes } from '../archetypes/archetypeScoring';

/**
 * Quick archetype quiz: 8 playful scenario questions that place a player in
 * the same 32-card identity deck the full personality test uses. Each answer
 * nudges a few traits from a neutral 50; the deck's own scoring then picks
 * the dominant card. The full test can refine it later.
 */
export const QUICK_ARCHETYPE_QUIZ_VERSION = 1;

type Dimension = TraitKey | AxisKey;
export interface QuickArchetypeAnswer { id: string; icon: string; label: string; nudges: Partial<Record<Dimension, number>> }
export interface QuickArchetypeQuestion { id: string; prompt: string; answers: QuickArchetypeAnswer[] }

export const QUICK_ARCHETYPE_QUESTIONS: QuickArchetypeQuestion[] = [
  { id: 'q1', prompt: 'A new island appears on the horizon. Your first move?', answers: [
    { id: 'a', icon: '📣', label: 'Rally the crew and lead the landing', nudges: { extraversion: 20, conscientiousness: 10 } },
    { id: 'b', icon: '🤝', label: 'Make sure everyone is okay and ready', nudges: { agreeableness: 20, emotionality: 10 } },
    { id: 'c', icon: '🗺️', label: 'Study the map and plan the route', nudges: { conscientiousness: 20, openness: 5, regulation_style: 10 } },
    { id: 'd', icon: '🧭', label: 'Wander off to explore the unknown', nudges: { openness: 25, extraversion: 10, identity_sensitivity: 15 } },
  ] },
  { id: 'q2', prompt: 'A teammate is stuck on a hard level.', answers: [
    { id: 'a', icon: '🏆', label: 'Show them exactly how to win', nudges: { extraversion: 10, conscientiousness: 10, agreeableness: -5 } },
    { id: 'b', icon: '💛', label: 'Sit with them and cheer them on', nudges: { agreeableness: 20, emotionality: 10 } },
    { id: 'c', icon: '🧩', label: 'Break the problem down together', nudges: { conscientiousness: 10, openness: 10, cognitive_entry: 10 } },
    { id: 'd', icon: '✨', label: 'Invent a totally new way to play it', nudges: { openness: 20, identity_sensitivity: 10 } },
  ] },
  { id: 'q3', prompt: 'Your dream reward chest holds…', answers: [
    { id: 'a', icon: '👑', label: 'A crown, for everyone to see', nudges: { extraversion: 15, honesty_humility: -15 } },
    { id: 'b', icon: '🎁', label: 'Gifts to share with friends', nudges: { agreeableness: 15, honesty_humility: 10 } },
    { id: 'c', icon: '📜', label: 'A rare book of secrets', nudges: { openness: 15, conscientiousness: 5 } },
    { id: 'd', icon: '🌌', label: 'A map to somewhere nobody has been', nudges: { openness: 20, emotional_stability: 10, identity_sensitivity: 10 } },
  ] },
  { id: 'q4', prompt: 'A storm hits your island.', answers: [
    { id: 'a', icon: '⚡', label: 'Take charge and give clear orders', nudges: { extraversion: 15, emotional_stability: 10 } },
    { id: 'b', icon: '🛡️', label: 'Protect the people around me', nudges: { agreeableness: 15, emotionality: 15 } },
    { id: 'c', icon: '🔧', label: 'Stay calm and find the fix', nudges: { emotional_stability: 20, conscientiousness: 10 } },
    { id: 'd', icon: '🌧️', label: 'Dance in the rain, it’s an adventure', nudges: { openness: 15, emotional_stability: 10, extraversion: 5, stress_response: 10 } },
  ] },
  { id: 'q5', prompt: 'Your pace on a new project?', answers: [
    { id: 'a', icon: '🚀', label: 'Fast and bold', nudges: { extraversion: 10, emotional_stability: 10, conscientiousness: -5 } },
    { id: 'b', icon: '👥', label: 'Steady, together with others', nudges: { agreeableness: 10, conscientiousness: 10 } },
    { id: 'c', icon: '📐', label: 'Slow, careful and precise', nudges: { conscientiousness: 20, regulation_style: 10 } },
    { id: 'd', icon: '🎨', label: 'In bursts of inspiration', nudges: { openness: 15, identity_sensitivity: 10 } },
  ] },
  { id: 'q6', prompt: 'Friends would call you…', answers: [
    { id: 'a', icon: '🔥', label: 'Driven', nudges: { conscientiousness: 15, extraversion: 10 } },
    { id: 'b', icon: '🤗', label: 'Warm', nudges: { agreeableness: 20 } },
    { id: 'c', icon: '🧠', label: 'Clever', nudges: { openness: 10, conscientiousness: 10 } },
    { id: 'd', icon: '🦋', label: 'Free-spirited', nudges: { openness: 20, extraversion: 5, identity_sensitivity: 10 } },
  ] },
  { id: 'q7', prompt: 'A rule seems unfair.', answers: [
    { id: 'a', icon: '🥊', label: 'Challenge it head-on', nudges: { extraversion: 15, agreeableness: -15 } },
    { id: 'b', icon: '🕊️', label: 'Talk it through so no one gets hurt', nudges: { agreeableness: 20 } },
    { id: 'c', icon: '🔍', label: 'Understand the logic behind it first', nudges: { conscientiousness: 10, emotional_stability: 10 } },
    { id: 'd', icon: '🌀', label: 'Quietly find another path', nudges: { openness: 15, agreeableness: -5, identity_sensitivity: 10 } },
  ] },
  { id: 'q8', prompt: 'What recharges you?', answers: [
    { id: 'a', icon: '🥇', label: 'Winning a challenge', nudges: { extraversion: 15, emotional_stability: 5 } },
    { id: 'b', icon: '🏡', label: 'Time with people I love', nudges: { agreeableness: 10, extraversion: 10, emotionality: 10 } },
    { id: 'c', icon: '📚', label: 'Learning something new', nudges: { openness: 15, conscientiousness: 5 } },
    { id: 'd', icon: '🌲', label: 'Quiet time in nature', nudges: { emotional_stability: 10, openness: 10, identity_sensitivity: 10 } },
  ] },
];

const TRAITS: TraitKey[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'emotional_stability'];
const AXES: AxisKey[] = ['regulation_style', 'stress_response', 'identity_sensitivity', 'cognitive_entry', 'honesty_humility', 'emotionality'];

export function scoreQuickArchetypeQuiz(answers: Record<string, string>): {
  scores: PersonalityScores;
  dominant: ArchetypeCard;
  runnersUp: ArchetypeCard[];
} {
  const totals: Record<Dimension, number> = Object.fromEntries([...TRAITS, ...AXES].map((key) => [key, 50])) as Record<Dimension, number>;
  for (const question of QUICK_ARCHETYPE_QUESTIONS) {
    const answer = question.answers.find((entry) => entry.id === answers[question.id]);
    if (!answer) continue;
    for (const [key, nudge] of Object.entries(answer.nudges) as [Dimension, number][]) totals[key] += nudge;
  }
  const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const scores: PersonalityScores = {
    traits: Object.fromEntries(TRAITS.map((key) => [key, clamp(totals[key])])) as PersonalityScores['traits'],
    axes: Object.fromEntries(AXES.map((key) => [key, clamp(totals[key])])) as PersonalityScores['axes'],
  };
  const ranked = rankArchetypes(scoreArchetypes(scores, ARCHETYPE_DECK));
  return { scores, dominant: ranked[0].card, runnersUp: ranked.slice(1, 3).map((entry) => entry.card) };
}

// Player archetype: the account label if set, else a device-saved quick result.
const LOCAL_KEY = 'lifegoal:quick-archetype:v1:';

export interface StoredQuickArchetype { cardId: string; name: string; version: number; atIso: string }

export function readLocalQuickArchetype(userId: string | null | undefined): StoredQuickArchetype | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY + userId);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.name === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalQuickArchetype(userId: string, card: ArchetypeCard): StoredQuickArchetype {
  const stored = { cardId: card.id, name: card.name, version: QUICK_ARCHETYPE_QUIZ_VERSION, atIso: new Date().toISOString() };
  try { localStorage.setItem(LOCAL_KEY + userId, JSON.stringify(stored)); } catch { /* storage unavailable */ }
  return stored;
}

/** Archetype label the leaderboard uses; null means "take the quiz first". */
export function resolvePlayerArchetypeLabel(
  metadata: Record<string, unknown> | null | undefined,
  local: StoredQuickArchetype | null,
): string | null {
  const fromAccount = [metadata?.personality_profile_type, metadata?.archetype]
    .find((value) => typeof value === 'string' && value.trim().length > 0 && value !== 'Uncharted');
  if (typeof fromAccount === 'string') return fromAccount;
  return local?.name ?? null;
}
