import type { ImpactTreeSource } from '../services/impactTrees';

export const IMPACT_TREE_SOURCE_CONFIG: Record<
  ImpactTreeSource,
  { label: string; fallbackDetail?: string }
> = {
  weekly_closure: {
    label: 'Weekly closure watering',
    fallbackDetail: 'Weekly closure ritual completed.',
  },
  level_up: {
    label: 'Level-up milestone',
    fallbackDetail: 'New level reached.',
  },
  streak_30: {
    label: '30-day streak celebration',
    fallbackDetail: 'A month of steady momentum.',
  },
  seasonal_event: {
    label: 'Seasonal event boost',
    fallbackDetail: 'Seasonal momentum added to your Tree of Life.',
  },
  manual: {
    label: 'Manual growth moment',
    fallbackDetail: 'A manual growth moment was recorded.',
  },
};
