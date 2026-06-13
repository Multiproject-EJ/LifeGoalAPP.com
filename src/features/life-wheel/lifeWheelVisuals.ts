import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';

/**
 * Single source of truth for the *visual identity* of each life-wheel area:
 * a distinct accent colour and an emoji icon. Every surface that renders a
 * life area (the interactive wheel, goal cards, category chips, the create
 * dialog's area picker) pulls from here so colours and icons stay consistent.
 *
 * Colours are spread around the hue wheel so the eight slices read as clearly
 * different areas at a glance, including on small mobile screens.
 */
export type LifeWheelVisual = {
  key: LifeWheelCategoryKey;
  /** Long label (matches the check-in category label). */
  label: string;
  /** Short chip label used on compact surfaces. */
  shortLabel: string;
  /** Solid accent colour for the area. */
  color: string;
  emoji: string;
};

const VISUAL_BY_KEY: Record<LifeWheelCategoryKey, { color: string; emoji: string }> = {
  spirituality_community: { color: '#8b5cf6', emoji: '🧠' }, // violet
  finance_wealth: { color: '#eab308', emoji: '💰' }, // gold
  love_relations: { color: '#f43f5e', emoji: '💗' }, // rose
  fun_creativity: { color: '#d946ef', emoji: '🎉' }, // fuchsia
  career_development: { color: '#3b82f6', emoji: '🎯' }, // blue
  health_fitness: { color: '#10b981', emoji: '🌿' }, // emerald
  family_friends: { color: '#f97316', emoji: '🤝' }, // orange
  living_spaces: { color: '#14b8a6', emoji: '🏠' }, // teal
};

export const LIFE_WHEEL_VISUALS: readonly LifeWheelVisual[] = LIFE_WHEEL_CATEGORIES.map((category) => ({
  key: category.key,
  label: category.label,
  shortLabel: category.shortLabel,
  color: VISUAL_BY_KEY[category.key].color,
  emoji: VISUAL_BY_KEY[category.key].emoji,
}));

const LIFE_WHEEL_VISUAL_LOOKUP = LIFE_WHEEL_VISUALS.reduce<Record<LifeWheelCategoryKey, LifeWheelVisual>>(
  (acc, visual) => {
    acc[visual.key] = visual;
    return acc;
  },
  {} as Record<LifeWheelCategoryKey, LifeWheelVisual>,
);

export function getLifeWheelVisual(key: LifeWheelCategoryKey): LifeWheelVisual {
  return LIFE_WHEEL_VISUAL_LOOKUP[key];
}

export function getLifeWheelColor(key: LifeWheelCategoryKey): string {
  return LIFE_WHEEL_VISUAL_LOOKUP[key]?.color ?? '#3b82f6';
}

export function getLifeWheelEmoji(key: LifeWheelCategoryKey): string {
  return LIFE_WHEEL_VISUAL_LOOKUP[key]?.emoji ?? '🎯';
}

/** Convert one of the area accent colours to an `rgba()` string at the given alpha. */
export function lifeWheelColorAlpha(key: LifeWheelCategoryKey, alpha: number): string {
  return hexToRgba(getLifeWheelColor(key), alpha);
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isLifeWheelCategoryKey(value: string | null | undefined): value is LifeWheelCategoryKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LIFE_WHEEL_VISUAL_LOOKUP, value);
}
