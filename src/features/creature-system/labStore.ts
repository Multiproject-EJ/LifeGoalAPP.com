import { getEggSellRewardOptions, type EggTier, type EggSellRewardChoice } from '../gamification/level-worlds/services/eggService';
import { changeTeam, emptyTeam, type CreatureTeam, type TeamRole } from './matching';
import { getFamily } from './content';

/** Explicit, isolated fixture harness. Never reads/writes an account, production save or wallet. */
export type LabEgg = { id: string; tier: EggTier; familyId: string; status: 'incubating' | 'ready' | 'collected' | 'sold'; readyAt: number; reward?: { choice: EggSellRewardChoice; amount: number } };
export type LabState = { version: 1; owned: Record<string, { copies: number; form: number }>; team: CreatureTeam; eggs: LabEgg[]; lastResult: string | null };
export function initialLabState(): LabState {
  return { version: 1, owned: Object.fromEntries(['common-twilight-seed', 'common-bloom-mite', 'mythic-celest-pup'].map(id => [id, { copies: 1, form: 1 }])), team: emptyTeam(),
    eggs: [
      { id: 'fixture-common', tier: 'common', familyId: 'common-bloom-mite', status: 'ready', readyAt: 0 },
      { id: 'fixture-rare', tier: 'rare', familyId: 'rare-cinder-mouse', status: 'ready', readyAt: 0 },
      { id: 'fixture-mythic', tier: 'mythic', familyId: 'mythic-echo-phoenix', status: 'ready', readyAt: 0 },
    ], lastResult: null };
}
export type LabAction = { type: 'equip'; role: TeamRole; id: string | null } | { type: 'collect'; eggId: string; now: number } | { type: 'sell'; eggId: string; choice: EggSellRewardChoice; now: number };
export function reduceLab(state: LabState, action: LabAction): LabState {
  if (action.type === 'equip') return { ...state, team: changeTeam(state.team, action.role, action.id, Object.keys(state.owned)), lastResult: action.id ? `Selected ${getFamily(action.id)?.name ?? action.id} as ${action.role}.` : `Cleared ${action.role}.` };
  const egg = state.eggs.find(e => e.id === action.eggId);
  if (!egg) throw new Error('Egg not found');
  // Terminal state owns settlement idempotency, including collect-versus-sell races.
  if (egg.status === 'collected' || egg.status === 'sold') return state;
  if (!Number.isFinite(action.now) || action.now < egg.readyAt) throw new Error('Egg is still incubating');
  const family = getFamily(egg.familyId);
  if (!family || family.rarity !== egg.tier) throw new Error('Invalid locked egg outcome');
  if (action.type === 'sell') {
    const reward = getEggSellRewardOptions(egg.tier).find(option => option.choice === action.choice);
    if (!reward) throw new Error('Invalid reward choice');
    return { ...state, eggs: state.eggs.map(e => e.id === egg.id ? { ...e, status: 'sold', reward: { choice: reward.choice, amount: reward.amount } } : e),
      lastResult: `Preview only: sold for ${reward.amount} ${reward.choice}. No live wallet changed.` };
  }
  const previous = state.owned[egg.familyId];
  return { ...state, owned: { ...state.owned, [egg.familyId]: { copies: (previous?.copies ?? 0) + 1, form: previous?.form ?? 1 } },
    eggs: state.eggs.map(e => e.id === egg.id ? { ...e, status: 'collected' } : e),
    lastResult: `${previous ? 'Another copy of' : 'Discovered'} ${family.name}. ${previous ? 'Existing form and team preserved.' : 'Now available for your trio.'}` };
}

export function createLabStore(seed = initialLabState()) {
  let state = seed;
  const listeners = new Set<() => void>();
  return { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispatch: (action: LabAction) => { const next = reduceLab(state, action); if (next !== state) { state = next; listeners.forEach(l => l()); } },
    reset: () => { state = initialLabState(); listeners.forEach(l => l()); } };
}
