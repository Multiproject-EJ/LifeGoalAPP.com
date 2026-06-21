/** Chapter 2 — The Inner Compass (Islands 21–40). Reserved slots; authored in PR 6. */
import { buildReservedChapter } from './reservedChapter';

export const chapter2InnerCompass = buildReservedChapter({
  id: 'inner_compass',
  order: 2,
  title: 'The Inner Compass',
  coreQuestion:
    'What truly guides me, what gives me life, what do I need, and what pulls me off course?',
  visualMetaphor:
    'A four-direction compass: North = values, East = energy, South = needs, West = drift.',
  outputFields: ['True North', 'Life Spark', 'Shadow Pull', 'Guardian Boundary', 'Compass statement'],
  slotTitles: [
    'Most alive moment',
    'Proud of my behaviour',
    'Felt unlike myself',
    'What I keep seeking',
    'Protect without recognition',
    "Won't trade for success",
    'Value in my behaviour',
    'Claimed value now missing',
    'Need: safety & autonomy',
    'Need: belonging & rest',
    'Need: challenge & clarity',
    'Need: recognition & meaning',
    'Primary strength',
    'When strength overextends',
    'Shadow pattern',
    'Missing counterbalance',
    'Signs of alignment',
    'Signs of drift',
    'Boundary I need',
    'Set the compass',
  ],
});
