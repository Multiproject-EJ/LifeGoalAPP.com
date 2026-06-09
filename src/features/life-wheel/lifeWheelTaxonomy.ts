import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';

/**
 * Single source of truth for the 8 canonical life-wheel areas.
 *
 * Historically the game (Island Run habit landmark, suggested-habit library)
 * used one set of 8 "areas" while the check-in questionnaire used a *different*
 * set of 8 category keys, and the two did not line up (Relationships mapped to
 * Love but family/friends had no area; Work and Growth both collapsed to
 * career_development). This module unifies them: every area maps 1:1 to a
 * check-in category key, so a check-in score can be read directly for any area.
 */
export type LifeWheelArea =
  | 'Health'
  | 'Mind'
  | 'Work'
  | 'Money'
  | 'Love'
  | 'Connections'
  | 'Home'
  | 'Fun';

export type LifeWheelAreaMeta = {
  area: LifeWheelArea;
  checkinKey: LifeWheelCategoryKey;
  /** Long label, matches the check-in category label. */
  label: string;
  /** Short chip label used on compact surfaces. */
  shortLabel: string;
  emoji: string;
};

export const LIFE_WHEEL_AREA_TAXONOMY: readonly LifeWheelAreaMeta[] = [
  { area: 'Health', checkinKey: 'health_fitness', label: 'Body & Energy', shortLabel: 'Health', emoji: '🪷' },
  { area: 'Mind', checkinKey: 'spirituality_community', label: 'Mind, Meaning & Awareness', shortLabel: 'Mind', emoji: '🧠' },
  { area: 'Work', checkinKey: 'career_development', label: 'Work, Growth & Productivity', shortLabel: 'Work', emoji: '🎯' },
  { area: 'Money', checkinKey: 'finance_wealth', label: 'Money & Admin', shortLabel: 'Money', emoji: '💵' },
  { area: 'Love', checkinKey: 'love_relations', label: 'Love & Relationships', shortLabel: 'Love', emoji: '💌' },
  { area: 'Connections', checkinKey: 'family_friends', label: 'Family, Friends & Connection', shortLabel: 'Connections', emoji: '🤝' },
  { area: 'Home', checkinKey: 'living_spaces', label: 'Home & Environment', shortLabel: 'Home', emoji: '🏠' },
  { area: 'Fun', checkinKey: 'fun_creativity', label: 'Joy, Play & Creativity', shortLabel: 'Fun', emoji: '🎉' },
] as const;

export const LIFE_WHEEL_AREAS: readonly LifeWheelArea[] = LIFE_WHEEL_AREA_TAXONOMY.map((entry) => entry.area);

const AREA_BY_NAME = LIFE_WHEEL_AREA_TAXONOMY.reduce<Record<LifeWheelArea, LifeWheelAreaMeta>>((acc, entry) => {
  acc[entry.area] = entry;
  return acc;
}, {} as Record<LifeWheelArea, LifeWheelAreaMeta>);

const AREA_BY_CHECKIN_KEY = LIFE_WHEEL_AREA_TAXONOMY.reduce<Record<LifeWheelCategoryKey, LifeWheelAreaMeta>>((acc, entry) => {
  acc[entry.checkinKey] = entry;
  return acc;
}, {} as Record<LifeWheelCategoryKey, LifeWheelAreaMeta>);

export function getLifeWheelAreaMeta(area: LifeWheelArea): LifeWheelAreaMeta {
  return AREA_BY_NAME[area];
}

export function getCheckinKeyForArea(area: LifeWheelArea): LifeWheelCategoryKey {
  return AREA_BY_NAME[area].checkinKey;
}

export function getAreaForCheckinKey(key: LifeWheelCategoryKey): LifeWheelArea {
  return AREA_BY_CHECKIN_KEY[key].area;
}

export function isLifeWheelArea(value: string): value is LifeWheelArea {
  return Object.prototype.hasOwnProperty.call(AREA_BY_NAME, value);
}
