/** Chapter 3 — The Living Horizon (Islands 41–60). Reserved slots; authored in PR 7. */
import { buildReservedChapter } from './reservedChapter';

export const chapter3LivingHorizon = buildReservedChapter({
  id: 'living_horizon',
  order: 3,
  title: 'The Living Horizon',
  subtitle: 'The Life I Could Live',
  coreQuestion: 'What kind of ordinary life would genuinely fit me, not merely impress me?',
  visualMetaphor:
    'A panoramic future-life landscape: Sanctuary, Workshop, Gathering Place, Vital Path, Open Gate, Horizon.',
  outputFields: ['Desired Rhythm', 'Essential Scene', 'Price I Will Not Pay', 'Horizon statement'],
  slotTitles: [
    'The ordinary morning',
    'Meaningful daytime',
    'Structure vs freedom',
    'A good evening',
    'Ideal environment',
    'Rooted vs mobile',
    'Social needs',
    'Relationships that belong',
    'Problems I prefer',
    'Create / help / lead / analyse',
    'Depth vs variety',
    'What work should make possible',
    'Desired responsibility',
    'Meaningful challenge',
    'Scale vs mastery',
    'Financial enough',
    'Achievement & status enough',
    'If patterns continue',
    'Success that still fails',
    'Create the horizon',
  ],
});
