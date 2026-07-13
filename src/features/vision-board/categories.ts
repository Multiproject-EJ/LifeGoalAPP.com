export const FOUR_VISIONARIES = [
  { key: 'things_living', label: 'Things & Living' },
  { key: 'body_style', label: 'Body & Style' },
  { key: 'happenings_events', label: 'The Happenings & Events' },
  { key: 'personality_inspiration', label: 'The Personality Type Inspiration' },
] as const;

export type FourVisionaryCategory = (typeof FOUR_VISIONARIES)[number];
export type FourVisionaryCategoryKey = FourVisionaryCategory['key'];
