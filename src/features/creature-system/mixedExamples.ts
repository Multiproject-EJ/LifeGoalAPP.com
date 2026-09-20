import { MOTIVE_QUESTIONS } from './refinement';
import { buildEvidenceProfile, withRefinement } from './personality';

/** Narrative-first review examples, not creature self-matches or population data.
 * All unspecified motives are explicitly rated 2 for these synthetic examples only.
 */
const briefs = [
  {id:'supporter',label:'Thoughtful supporter',story:'Wants to understand and help people, but also needs quiet reflection and reliable personal boundaries.',ratings:{empath:5,caregiver:5,mentor:4,healer:4,guardian:4,philosopher:3,sage:3,devotee:3}},
  {id:'builder',label:'Curious builder',story:'Loves understanding how something works, experimenting with alternatives and making a practical result.',ratings:{engineer:5,inventor:5,analyst:4,architect:4,scholar:4,explorer:4,detective:3,pioneer:3}},
  {id:'pathfinder',label:'Quiet pathfinder',story:'Imagines a self-chosen future and explores it carefully while staying attached to a few trusted people.',ratings:{dreamer:5,explorer:5,visionary:4,rebel:4,creator:4,devotee:4,empath:3,pioneer:3}},
  {id:'organiser',label:'Steady organiser',story:'Wants shared work to be dependable and fair, with clear direction, cooperation and room to recover.',ratings:{commander:5,enforcer:5,strategist:4,diplomat:4,engineer:4,guardian:4,peacemaker:3,caregiver:3}},
] as const;
export const MIXED_EXAMPLES=briefs.map(brief=>({...brief,profile:withRefinement(buildEvidenceProfile({}),Object.fromEntries(MOTIVE_QUESTIONS.map(q=>[q.id,(brief.ratings as Record<string,number>)[q.archetypeId]??2])))}));
