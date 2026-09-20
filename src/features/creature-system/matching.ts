import { comparableMixes, relativeMix, projectArchetypes, type EvidenceProfile } from './personality';
import { CREATURE_TARGETS, ROSTER_CREATURE_TARGETS } from './targets';

export const MATCH_MODEL_VERSION = 'kindred-breadth-experimental-2';
export const REFINED_MATCH_MODEL_VERSION = 'direct-motives-experimental-1';
export const targetsForProfile = (player: EvidenceProfile) => player.refinement ? ROSTER_CREATURE_TARGETS : CREATURE_TARGETS;
export type MatchTarget = { id: string; profile: EvidenceProfile };
export const TEAM_ROLES = ['kindred', 'complement', 'favourite'] as const;
export type TeamRole = typeof TEAM_ROLES[number];
export type CreatureTeam = Record<TeamRole, string | null>;
export const emptyTeam = (): CreatureTeam => ({ kindred: null, complement: null, favourite: null });
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const stable = (a: { id: string; score: number }, b: { id: string; score: number }) => Math.abs(b.score-a.score)<1e-9 ? a.id.localeCompare(b.id) : b.score-a.score;
const overlapScore = (distances:number[]) => Math.max(0,Math.min(100,100*(1-sum(distances)/2)));

export function rankKindred(player: EvidenceProfile, targets: readonly MatchTarget[] = targetsForProfile(player)) {
  // Never compare direct motives to inferred foundation traits under one score.
  if (targets.some(t => Boolean(t.profile.refinement) !== Boolean(player.refinement))) return { status: 'incompatible-targets', ranked: [], margin: null, bestId: null };
  if (player.refinement) {
    const refined = player.refinement;
    const status = refined.status === 'undifferentiated' ? 'undifferentiated' : 'needs-refinement';
    if (!refined.mix) return { status, ranked: [], margin: null, bestId: null };
    if (targets.some(t => !t.profile.refinement?.mix)) return { status: 'incomplete-targets', ranked: [], margin: null, bestId: null };
    const ranked = targets.map(target => {
      const mix = target.profile.refinement!.mix!;
      const breakdown = Object.keys(refined.mix!).map(id => ({ id, player: refined.mix![id], creature: mix[id], distance: Math.abs(refined.mix![id] - mix[id]) }));
      return { id: target.id, score: overlapScore(breakdown.map(a=>a.distance)), breakdown };
    }).sort(stable);
    if (ranked.length && ranked[0].score < 1e-9) return { status: 'no-target-overlap', ranked: [], margin: null, bestId: null };
    const margin = ranked.length > 1 ? ranked[0].score - ranked[1].score : null;
    return { status: margin !== null && margin <= 2 + 1e-9 ? 'close' : 'ranked', ranked, margin, bestId: ranked[0]?.id ?? null };
  }
  const scores = player.archetypes.flatMap(a => a.score === null ? [] : [a.score]);
  const status = player.status !== 'usable' ? 'needs-answers' : Math.max(...scores) - Math.min(...scores) < 5 ? 'undifferentiated' : 'ranked';
  if (status !== 'ranked') return { status, ranked: [], margin: null, bestId: null };
  const ranked = targets.filter(t => t.profile.status === 'usable').map(target => {
    const mix = comparableMixes(player, target.profile);
    const breakdown = Object.keys(mix.player).map(id => ({ id, player: mix.player[id], creature: mix.creature[id], distance: Math.abs(mix.player[id] - mix.creature[id]) }));
    return { id: target.id, score: overlapScore(breakdown.map(a=>a.distance)), breakdown };
  }).sort(stable);
  const margin = ranked.length > 1 ? ranked[0].score - ranked[1].score : null;
  return { status: margin !== null && margin <= 2 + 1e-9 ? 'close' : 'ranked', ranked, margin, bestId: ranked[0]?.id ?? null };
}

/** Shared evidence mask across the candidate pool keeps marginal gains comparable.
 * Breadth is the union of four fixed-budget profiles (you + up to 3 creatures).
 * A solo profile begins at 25/100; 100 is a theoretical disjoint ceiling, NOT a completion target.
 * This game index measures represented approaches, never how complete or healthy a person is.
 */
export function rankComplements(player: EvidenceProfile, selectedIds: string[], targets: readonly MatchTarget[] = targetsForProfile(player)) {
  if (rankKindred(player, targets).bestId === null) return { baseline: null, ranked: [] };
  const selected = [...new Set(selectedIds)];
  if (selected.length > 3) return { baseline: null, ranked: [] };
  if (selected.some(id => !targets.some(t => t.id === id))) return { baseline: null, ranked: [] };
  const pool = [player, ...targets.map(t => t.profile)];
  const samples = Object.fromEntries(Object.keys(player.samples).filter(key => pool.every(p => p.samples[key] > 0)).map(key => [key, 1]));
  if (player.refinement && targets.some(t => !t.profile.refinement?.mix)) return { baseline: null, ranked: [] };
  const p = player.refinement?.mix ?? relativeMix(projectArchetypes(player.values, samples));
  const mixes = new Map(targets.map(t => [t.id, player.refinement ? t.profile.refinement!.mix! : relativeMix(projectArchetypes(t.profile.values, samples))]));
  const covered = Object.fromEntries(Object.keys(p).map(id => [id, Math.max(p[id], ...selected.map(key => mixes.get(key)![id]))]));
  const baseline = sum(Object.values(covered)) * 25;
  if (selected.length >= 3) return { baseline, ranked: [] };
  const ranked = targets.filter(t => !selected.includes(t.id)).map(target => {
    const mix = mixes.get(target.id)!;
    const contributions = Object.keys(covered).map(id => ({ id, gain: Math.max(0, mix[id] - covered[id]) * 25 })).sort((a, b) => b.gain - a.gain);
    const score = sum(contributions.map(c => c.gain));
    return { id: target.id, score, after: baseline + score, contributions };
  }).sort(stable);
  return { baseline, ranked };
}

export function validateTeam(team: CreatureTeam, ownedIds: readonly string[]) {
  const owned = new Set(ownedIds), used = new Set<string>(), errors: string[] = [];
  for (const key of Object.keys(team)) if (!TEAM_ROLES.includes(key as TeamRole)) errors.push(`Unknown role: ${key}`);
  for (const role of TEAM_ROLES) {
    const id = team[role];
    if (id === null) continue;
    if (typeof id !== 'string' || !owned.has(id)) errors.push(`Choose an owned creature for ${role}.`);
    if (used.has(id)) errors.push('A family can occupy only one trio slot.');
    used.add(id);
  }
  return errors;
}

/** No auto-assignment. Retests only update suggestions, never saved choices. */
export function changeTeam(team: CreatureTeam, role: TeamRole, id: string | null, ownedIds: readonly string[]) {
  if (!TEAM_ROLES.includes(role)) throw new Error('Unknown team role');
  const next = { ...team, [role]: id };
  const errors = validateTeam(next, ownedIds);
  if (errors.length) throw new Error(errors.join(' '));
  return next;
}

/** Read-only migration proposal: preserve the legacy gameplay companion in Favourite.
 * Unknown owned IDs survive. Unowned stale pointers are quarantined, never granted.
 */
export function proposeLegacyTeam(activeCompanionId: string | null, ownedIds: readonly string[]) {
  return { version: 1, team: { ...emptyTeam(), favourite: activeCompanionId && ownedIds.includes(activeCompanionId) ? activeCompanionId : null },
    legacyActiveCompanionId: activeCompanionId, requiresReview: !!activeCompanionId && !ownedIds.includes(activeCompanionId),
    gameplayEffect: 'legacy-single-companion-unchanged' as const };
}
