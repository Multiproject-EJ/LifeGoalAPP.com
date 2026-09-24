/** Pure puzzle rules. UI and renderers only present committed state. */
export interface TitanAwakening {
  version: 1;
  phase: number; // 0 mix, 1 pour, 2 eyes, 3 teeth, 4 lens, 5 release, 6 sanctuary
  revision: number;
  ingredients: number[];
  eyes: number[];
  teeth: number[];
  lens: number;
  legacyComplete: boolean;
}
export const TITAN_PHASES = ['The summoning potion', 'A drop into darkness', 'The watching eyes', 'Inside the jaw', 'The last thought', 'Someone is inside', 'A new sanctuary'] as const;
export const TITAN_EYE_TARGET = [1, 3];
export const TITAN_TEETH_TARGET = [2, 0, 1];
export const TITAN_LENS_TARGET = 4;
export function sanitizeTitanAwakening(raw: unknown, legacyComplete = false): TitanAwakening {
  const r = raw && typeof raw === 'object' ? raw as Partial<TitanAwakening> : {};
  const int = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
  const phase = int(r.phase, 6);
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 3).filter((v, i) => v === i) : [];
  // Only an ordered prefix is valid, even for malformed saves.
  const prefix: number[] = [];
  for (const v of ingredients) { if (v !== prefix.length) break; prefix.push(v); }
  return { version: 1, phase, revision: int(r.revision, Number.MAX_SAFE_INTEGER),
    ingredients: phase >= 1 ? [0, 1, 2] : prefix,
    eyes: phase >= 3 ? [...TITAN_EYE_TARGET] : [int(r.eyes?.[0], 3), int(r.eyes?.[1], 3)],
    teeth: phase >= 4 ? [...TITAN_TEETH_TARGET] : [int(r.teeth?.[0], 2), int(r.teeth?.[1], 2), int(r.teeth?.[2], 2)],
    lens: phase >= 5 ? TITAN_LENS_TARGET : int(r.lens, 7),
    legacyComplete: r.legacyComplete === true || legacyComplete };
}
export function mergeTitanAwakening(a: TitanAwakening, b: TitanAwakening): TitanAwakening {
  // A solved mechanism cannot be undone by a stale/offline device.
  const winner = a.phase !== b.phase ? (a.phase > b.phase ? a : b)
    : a.revision !== b.revision ? (a.revision > b.revision ? a : b)
      : JSON.stringify(a) >= JSON.stringify(b) ? a : b;
  return sanitizeTitanAwakening({ ...winner, legacyComplete: a.legacyComplete || b.legacyComplete });
}
export type TitanPuzzleInput =
  | { kind: 'ingredient'; index: number }
  | { kind: 'eye' | 'tooth'; index: number; value: number }
  | { kind: 'lens'; value: number }
  | { kind: 'test' | 'pour' | 'release' };
export function applyTitanPuzzleInput(current: TitanAwakening, input: TitanPuzzleInput): { state: TitanAwakening; status: 'ok' | 'wrong' | 'invalid' } {
  const next = sanitizeTitanAwakening(current);
  let status: 'ok' | 'wrong' | 'invalid' = 'invalid';
  if (input.kind === 'ingredient' && next.phase === 0 && [0, 1, 2].includes(input.index)) {
    status = input.index === next.ingredients.length ? 'ok' : 'wrong';
    next.ingredients = status === 'ok' ? [...next.ingredients, input.index] : [];
    if (next.ingredients.length === 3) next.phase = 1;
  } else if (input.kind === 'pour' && next.phase === 1) { next.phase = 2; status = 'ok'; }
  else if (input.kind === 'eye' && next.phase === 2 && [0, 1].includes(input.index) && [0, 1, 2, 3].includes(input.value)) {
    next.eyes[input.index] = input.value; status = 'ok';
  } else if (input.kind === 'tooth' && next.phase === 3 && [0, 1, 2].includes(input.index) && [0, 1, 2].includes(input.value)) {
    next.teeth[input.index] = input.value; status = 'ok';
  } else if (input.kind === 'lens' && next.phase === 4 && Number.isInteger(input.value) && input.value >= 0 && input.value <= 7) {
    next.lens = input.value; status = 'ok';
  } else if (input.kind === 'test' && next.phase >= 2 && next.phase <= 4) {
    const solved = next.phase === 2 ? next.eyes.every((v, i) => v === TITAN_EYE_TARGET[i])
      : next.phase === 3 ? next.teeth.every((v, i) => v === TITAN_TEETH_TARGET[i]) : next.lens === TITAN_LENS_TARGET;
    status = solved ? 'ok' : 'wrong';
    if (solved) next.phase++;
  } else if (input.kind === 'release' && next.phase === 5) { next.phase = 6; status = 'ok'; }
  if (status !== 'invalid') next.revision++;
  return { state: next, status };
}
