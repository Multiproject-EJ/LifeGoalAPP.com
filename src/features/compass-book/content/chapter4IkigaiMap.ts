/** Chapter 4 — The Ikigai Map (Islands 61–80). Reserved slots; authored in PR 8. */
import { buildReservedChapter } from './reservedChapter';

export const chapter4IkigaiMap = buildReservedChapter({
  id: 'ikigai_map',
  order: 4,
  title: 'The Ikigai Map',
  coreQuestion: 'Which possible directions have enough alignment to deserve a real-world test?',
  visualMetaphor:
    'A constellation map (not a four-circle Venn) of five forces: Curiosity, Capability, Contribution, Viability, Willingness.',
  outputFields: ['Spark', 'Gift', 'Need', 'Trial', 'Mirage warning', 'Chosen experiment'],
  slotTitles: [
    'Repeated interests',
    'Unfinished ideas',
    'Problems that hold attention',
    'Explored without pressure',
    'Demonstrated strengths',
    'Emerging strengths',
    'Underused strengths',
    'Could become exceptional',
    'People I understand',
    'Problems I care about',
    'Transformations worth helping',
    'Who I want to help',
    'Income & opportunity',
    'Access & experience',
    'Fit with my horizon',
    'Tolerance for the process',
    'Willing to be a beginner',
    'Generate three paths',
    'Choose the Trial',
    'Illuminate the constellation',
  ],
});
