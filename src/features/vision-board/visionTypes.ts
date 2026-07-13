export const DEFAULT_VISION_TYPE = 'goal';

export const VISION_TYPES = [
  { value: 'goal', label: 'Goal' },
  { value: 'habit', label: 'Habit' },
  { value: 'identity', label: 'Identity' },
  { value: 'experience', label: 'Experience' },
  { value: 'environment', label: 'Environment' },
];

export function getVisionTypeLabel(value: string | null | undefined): string {
  return VISION_TYPES.find((type) => type.value === value)?.label ?? 'Goal';
}
