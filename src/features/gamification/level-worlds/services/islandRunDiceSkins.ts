/**
 * Dice skins — six original dice finishes the player can buy with Island Run
 * money (the `essence` wallet) and choose for every roll.
 *
 * Visuals live in CSS (`[data-dice-skin]` on the board dice); this module owns
 * the catalogue, placeholder prices and the owner-scoped progress that is
 * persisted in the Island Run mission ledger under `DICE_SKINS_KEY`.
 *
 * Prices are placeholders until the economy pass tunes them.
 */

export const DICE_SKINS_KEY = 'dice-skins-v1';

export type DiceSkinId = 'classic' | 'gold' | 'moonstone' | 'tide-crystal' | 'ember' | 'jade';

export interface DiceSkin {
  id: DiceSkinId;
  name: string;
  tagline: string;
  /** Placeholder price in Island Run money; 0 = starter skin everyone owns. */
  price: number;
}

export const DEFAULT_DICE_SKIN_ID: DiceSkinId = 'classic';

export const DICE_SKINS: readonly DiceSkin[] = [
  { id: 'classic', name: 'Classic Ivory', tagline: 'The dice every crew member starts with.', price: 0 },
  { id: 'jade', name: 'Jade Lantern', tagline: 'Carved green stone with lantern-gold pips.', price: 400 },
  { id: 'moonstone', name: 'Moonstone', tagline: 'Polished silver with a cool blue sheen.', price: 800 },
  { id: 'tide-crystal', name: 'Tide Crystal', tagline: 'Clear sea glass that catches the light.', price: 1_200 },
  { id: 'ember', name: 'Obsidian Ember', tagline: 'Volcanic black with glowing ember pips.', price: 2_000 },
  { id: 'gold', name: 'Sunforged Gold', tagline: 'Solid gold with deep engraved pips.', price: 3_000 },
];

const SKIN_IDS = new Set<string>(DICE_SKINS.map((skin) => skin.id));

export function isDiceSkinId(value: unknown): value is DiceSkinId {
  return typeof value === 'string' && SKIN_IDS.has(value);
}

export function resolveDiceSkin(id: DiceSkinId): DiceSkin {
  return DICE_SKINS.find((skin) => skin.id === id) ?? DICE_SKINS[0]!;
}

export interface DiceSkinProgress {
  missionId: 'dice-skins';
  version: 1;
  /** Purchased skins (the starter skin is always owned and never stored). */
  ownedSkinIds: DiceSkinId[];
  selectedSkinId: DiceSkinId;
  /** When the selection last changed; the newer selection wins on merge. */
  selectedAtMs: number;
  updatedAtMs: number;
}

export function createDiceSkinProgress(): DiceSkinProgress {
  return { missionId: 'dice-skins', version: 1, ownedSkinIds: [], selectedSkinId: DEFAULT_DICE_SKIN_ID, selectedAtMs: 0, updatedAtMs: 0 };
}

function time(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Catalogue order, known ids only, starter skin never stored. */
function normaliseOwned(ids: readonly unknown[]): DiceSkinId[] {
  return DICE_SKINS.map((skin) => skin.id).filter((id) => id !== DEFAULT_DICE_SKIN_ID && ids.includes(id));
}

export function isDiceSkinOwned(progress: DiceSkinProgress, id: DiceSkinId): boolean {
  return id === DEFAULT_DICE_SKIN_ID || progress.ownedSkinIds.includes(id);
}

export function sanitizeDiceSkinProgress(value: unknown): DiceSkinProgress {
  const base = createDiceSkinProgress();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  const ownedSkinIds = normaliseOwned(Array.isArray(record.ownedSkinIds) ? record.ownedSkinIds : []);
  const progress: DiceSkinProgress = {
    ...base,
    ownedSkinIds,
    selectedAtMs: time(record.selectedAtMs),
    updatedAtMs: time(record.updatedAtMs),
  };
  // A selection must point at an owned skin; anything else falls back to the starter.
  progress.selectedSkinId = isDiceSkinId(record.selectedSkinId) && isDiceSkinOwned(progress, record.selectedSkinId)
    ? record.selectedSkinId : DEFAULT_DICE_SKIN_ID;
  return progress;
}

/** Devices merge by union of owned skins; the most recent selection wins. */
export function mergeDiceSkinProgress(a: DiceSkinProgress, b: DiceSkinProgress): DiceSkinProgress {
  const newer = b.selectedAtMs > a.selectedAtMs ? b : a;
  return sanitizeDiceSkinProgress({
    ...a,
    ownedSkinIds: [...a.ownedSkinIds, ...b.ownedSkinIds],
    selectedSkinId: newer.selectedSkinId,
    selectedAtMs: newer.selectedAtMs,
    updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
  });
}

export type DiceSkinPurchaseResult =
  | { applied: true; progress: DiceSkinProgress; money: number; spent: number }
  | { applied: false; reason: 'unknown_skin' | 'already_owned' | 'insufficient_money'; progress: DiceSkinProgress; money: number; spent: 0 };

/** Buying a skin spends its price and equips it straight away. */
export function applyDiceSkinPurchase(progress: DiceSkinProgress, skinId: unknown, money: number, nowMs: number): DiceSkinPurchaseResult {
  const wallet = Math.max(0, Math.floor(Number.isFinite(money) ? money : 0));
  if (!isDiceSkinId(skinId)) return { applied: false, reason: 'unknown_skin', progress, money: wallet, spent: 0 };
  if (isDiceSkinOwned(progress, skinId)) return { applied: false, reason: 'already_owned', progress, money: wallet, spent: 0 };
  const price = resolveDiceSkin(skinId).price;
  if (wallet < price) return { applied: false, reason: 'insufficient_money', progress, money: wallet, spent: 0 };
  return {
    applied: true,
    money: wallet - price,
    spent: price,
    progress: sanitizeDiceSkinProgress({
      ...progress,
      ownedSkinIds: [...progress.ownedSkinIds, skinId],
      selectedSkinId: skinId,
      selectedAtMs: nowMs,
      updatedAtMs: nowMs,
    }),
  };
}

export type DiceSkinSelectResult =
  | { applied: true; progress: DiceSkinProgress }
  | { applied: false; reason: 'unknown_skin' | 'not_owned' | 'already_selected'; progress: DiceSkinProgress };

export function applyDiceSkinSelection(progress: DiceSkinProgress, skinId: unknown, nowMs: number): DiceSkinSelectResult {
  if (!isDiceSkinId(skinId)) return { applied: false, reason: 'unknown_skin', progress };
  if (!isDiceSkinOwned(progress, skinId)) return { applied: false, reason: 'not_owned', progress };
  if (progress.selectedSkinId === skinId) return { applied: false, reason: 'already_selected', progress };
  return { applied: true, progress: { ...progress, selectedSkinId: skinId, selectedAtMs: nowMs, updatedAtMs: nowMs } };
}
