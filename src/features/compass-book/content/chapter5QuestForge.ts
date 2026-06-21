/** Chapter 5 — The Quest Forge (Islands 81–100). Reserved slots; authored in PR 9. */
import { buildReservedChapter } from './reservedChapter';

export const chapter5QuestForge = buildReservedChapter({
  id: 'quest_forge',
  order: 5,
  title: 'The Quest Forge',
  coreQuestion:
    'Which possibilities deserve commitment now, and what must I intentionally not carry?',
  visualMetaphor: 'A forge chamber with a central Quest Crest, a maintenance ring and a Not-Now vault.',
  outputFields: [
    'Calling',
    'First Milestone',
    'Protected Flame',
    'Cost Accepted',
    'Primary Quest',
    'Supporting Quests',
    'Review point',
  ],
  slotTitles: [
    'Gather candidate goals',
    'From earlier chapters',
    'From existing goals',
    'Raw material review',
    'Why I want it',
    'Without recognition',
    'Desire / duty / fear',
    'Process vs outcome',
    'Against my values',
    'Against my needs',
    'Against my horizon',
    'Against my Life Wheel',
    'Resources & obstacle',
    'Controllability',
    'Readiness',
    'Timing choice',
    'Opportunity cost',
    'Build the portfolio',
    'Assign the quests',
    'Forge the crest',
  ],
});
