import type { SkyboundFlightState, SkyboundLevelId } from './skyboundExpeditionFlight';

export type SkyboundAcademyRankId = 'cadet' | 'trainee' | 'aviator' | 'elite' | 'ace';
export type SkyboundAircraftId = 'toy_glider' | 'prop_trainer' | 'jet_trainer' | 'storm_interceptor' | 'goldwing_fighter';
export type SkyboundLessonId =
  | 'cadet_launch' | 'cadet_gates' | 'cadet_weather' | 'cadet_exam'
  | 'trainee_runway' | 'trainee_energy' | 'trainee_landing' | 'trainee_exam'
  | 'aviator_launch' | 'aviator_boost' | 'aviator_dive' | 'aviator_exam'
  | 'elite_catapult' | 'elite_crosswind' | 'elite_storm' | 'elite_exam'
  | 'ace_afterburner' | 'ace_supersonic' | 'ace_formation' | 'ace_exam';
export type SkyboundCadetLessonId = Extract<SkyboundLessonId, `cadet_${string}`>;
export type SkyboundLessonStandardKind = 'distance' | 'salvage' | 'rings' | 'hazards';

export interface SkyboundAircraftRank {
  id: SkyboundAcademyRankId; rank: number; title: string; callsign: string;
  aircraftId: SkyboundAircraftId; aircraftName: string; launchMethod: string;
  lesson: string; theme: string; accent: string; rewardTickets: number;
}
export interface SkyboundLessonStandard { id: string; kind: SkyboundLessonStandardKind; label: string; target: number; }
export interface SkyboundLesson {
  id: SkyboundLessonId; rankId: SkyboundAcademyRankId; index: number; globalIndex: number;
  name: string; shortName: string; briefing: string; instructorTip: string;
  levelId: SkyboundLevelId; goalDistance: number;
  standards: readonly [SkyboundLessonStandard, SkyboundLessonStandard, SkyboundLessonStandard]; exam: boolean;
}
export type SkyboundCadetLesson = SkyboundLesson & { id: SkyboundCadetLessonId };
export interface SkyboundLessonStandardResult extends SkyboundLessonStandard { met: boolean; value: number; }
export interface SkyboundLessonEvaluation {
  lessonId: SkyboundLessonId; standardResults: readonly SkyboundLessonStandardResult[];
  standardsMet: number; passed: boolean; ace: boolean; academyXpEarned: number;
}
export interface SkyboundAcademyProgress {
  tickets: number; sorties: number; academyXp: number;
  completedLessonIds: readonly SkyboundLessonId[]; aceLessonIds: readonly SkyboundLessonId[];
  promotedRankIds: readonly SkyboundAcademyRankId[]; medalRankIds: readonly SkyboundAcademyRankId[];
  certificateAwarded: boolean;
}
export interface SkyboundTicketSpendResult { ok: boolean; progress: SkyboundAcademyProgress; failureReason: 'insufficient_tickets' | null; }
export interface SkyboundAcademySettlement {
  progress: SkyboundAcademyProgress;
  ticketsAwarded: number;
}

export const SKYBOUND_SORTIE_TICKET_COST = 1;
export const SKYBOUND_STARTER_TICKETS = 30;
export const SKYBOUND_ACADEMY_STORAGE_KEY = 'habitgame.skybound-pilot-academy.v1';

export const SKYBOUND_AIRCRAFT_RANKS: readonly SkyboundAircraftRank[] = [
  { id:'cadet',rank:1,title:'Cadet',callsign:'Paperwing',aircraftId:'toy_glider',aircraftName:'Toy Glider',launchMethod:'Academy slingshot',lesson:'Launch control',theme:'Meadow Campus',accent:'#61e7f2',rewardTickets:3 },
  { id:'trainee',rank:2,title:'Trainee',callsign:'Kestrel',aircraftId:'prop_trainer',aircraftName:'Prop Trainer',launchMethod:'Short runway',lesson:'Flight energy',theme:'Coastal Airfield',accent:'#68baff',rewardTickets:4 },
  { id:'aviator',rank:3,title:'Aviator',callsign:'Vortex',aircraftId:'jet_trainer',aircraftName:'Jet Trainer',launchMethod:'Runway boost',lesson:'Boost timing',theme:'Sunset Canyon',accent:'#ffbd68',rewardTickets:4 },
  { id:'elite',rank:4,title:'Elite',callsign:'Tempest',aircraftId:'storm_interceptor',aircraftName:'Storm Interceptor',launchMethod:'Launch catapult',lesson:'Storm mastery',theme:'Thunder Range',accent:'#bb8cff',rewardTickets:5 },
  { id:'ace',rank:5,title:'Ace',callsign:'Goldwing',aircraftId:'goldwing_fighter',aircraftName:'Goldwing Fighter',launchMethod:'Afterburner launch',lesson:'Gold Wings exam',theme:'Stratosphere',accent:'#ffe36d',rewardTickets:0 },
] as const;

const standards = (prefix:string,distance:number,rings:number,salvage:number,hazards=1): readonly [SkyboundLessonStandard,SkyboundLessonStandard,SkyboundLessonStandard] => [
  { id:`${prefix}-distance`,kind:'distance',label:`Reach ${distance}m`,target:distance },
  rings > 0 ? { id:`${prefix}-rings`,kind:'rings',label:`Clear ${rings} rings`,target:rings } : { id:`${prefix}-salvage`,kind:'salvage',label:`Collect ${salvage} crests`,target:salvage },
  { id:`${prefix}-hazards`,kind:'hazards',label:hazards === 0 ? 'Perfect safety' : `No more than ${hazards} impact`,target:hazards },
];

export const SKYBOUND_LESSONS: readonly SkyboundLesson[] = [
  {id:'cadet_launch',rankId:'cadet',index:0,globalIndex:0,name:'Launch Drill',shortName:'Launch',briefing:'Build a clean sling launch and follow the first crest line.',instructorTip:'Pull low for power, then release at 35–45°.',levelId:'meadow',goalDistance:360,standards:standards('cadet-launch',160,0,3),exam:false},
  {id:'cadet_gates',rankId:'cadet',index:1,globalIndex:1,name:'Precision Gates',shortName:'Gates',briefing:'Hold a smooth line through the cyan training gates.',instructorTip:'Small steering inputs preserve speed.',levelId:'meadow',goalDistance:360,standards:[{id:'cadet-gates-distance',kind:'distance',label:'Reach 220m',target:220},{id:'cadet-gates-rings',kind:'rings',label:'Clear 1 ring',target:1},{id:'cadet-gates-salvage',kind:'salvage',label:'Collect 4 crests',target:4}],exam:false},
  {id:'cadet_weather',rankId:'cadet',index:2,globalIndex:2,name:'Weather Control',shortName:'Weather',briefing:'Use Stabilizer to resist ridge gusts without losing your line.',instructorTip:'Stabilize briefly; holding it costs speed.',levelId:'canyon',goalDistance:330,standards:standards('cadet-weather',270,1,3),exam:false},
  {id:'cadet_exam',rankId:'cadet',index:3,globalIndex:3,name:'Cadet Checkride',shortName:'Exam',briefing:'Combine launch power, precision, Boost, and Stabilizer.',instructorTip:'Bank early and line up the final gold gate.',levelId:'meadow',goalDistance:360,standards:standards('cadet-exam',320,2,4),exam:true},
  {id:'trainee_runway',rankId:'trainee',index:0,globalIndex:4,name:'Runway Start',shortName:'Runway',briefing:'Bring the Kestrel Prop Trainer cleanly off the coastal runway.',instructorTip:'Build power before pitching up.',levelId:'coast',goalDistance:430,standards:standards('trainee-runway',380,1,4),exam:false},
  {id:'trainee_energy',rankId:'trainee',index:1,globalIndex:5,name:'Energy Turns',shortName:'Energy',briefing:'Trade altitude for speed through the cliff markers.',instructorTip:'Dive gently before the long climb.',levelId:'coast',goalDistance:510,standards:standards('trainee-energy',460,2,5),exam:false},
  {id:'trainee_landing',rankId:'trainee',index:2,globalIndex:6,name:'Landing Pattern',shortName:'Pattern',briefing:'Fly the complete circuit without damaging the trainer.',instructorTip:'Stabilizer settles the aircraft before the last gate.',levelId:'canyon',goalDistance:580,standards:standards('trainee-pattern',520,2,5,0),exam:false},
  {id:'trainee_exam',rankId:'trainee',index:3,globalIndex:7,name:'Prop Checkride',shortName:'Exam',briefing:'Prove runway, energy, and precision handling.',instructorTip:'Save boost for the canyon exit.',levelId:'coast',goalDistance:650,standards:standards('trainee-exam',600,3,6),exam:true},
  {id:'aviator_launch',rankId:'aviator',index:0,globalIndex:8,name:'Jet Launch',shortName:'Launch',briefing:'Learn the Vortex trainer’s faster runway-boost departure.',instructorTip:'Keep the nose nearly level until clear.',levelId:'canyon',goalDistance:720,standards:standards('aviator-launch',660,2,6),exam:false},
  {id:'aviator_boost',rankId:'aviator',index:1,globalIndex:9,name:'Boost Gates',shortName:'Boost',briefing:'Chain boost rings without emptying the drive reserve.',instructorTip:'Pulse boost between rings.',levelId:'canyon',goalDistance:800,standards:standards('aviator-boost',740,3,7),exam:false},
  {id:'aviator_dive',rankId:'aviator',index:2,globalIndex:10,name:'Precision Dive',shortName:'Dive',briefing:'Descend through the low canyon gates, then recover.',instructorTip:'Start the recovery before the final low gate.',levelId:'canyon',goalDistance:880,standards:standards('aviator-dive',820,4,7),exam:false},
  {id:'aviator_exam',rankId:'aviator',index:3,globalIndex:11,name:'Jet Checkride',shortName:'Exam',briefing:'Complete a fast technical canyon line.',instructorTip:'Speed is useful only when you own the next turn.',levelId:'storm',goalDistance:960,standards:standards('aviator-exam',900,4,8),exam:true},
  {id:'elite_catapult',rankId:'elite',index:0,globalIndex:12,name:'Catapult Start',shortName:'Catapult',briefing:'Launch the Tempest Interceptor directly into heavy weather.',instructorTip:'Correct the first gust immediately.',levelId:'storm',goalDistance:1020,standards:standards('elite-catapult',950,3,8),exam:false},
  {id:'elite_crosswind',rankId:'elite',index:1,globalIndex:13,name:'Crosswind Canyon',shortName:'Crosswind',briefing:'Hold the center line while the range pushes sideways.',instructorTip:'Counter-bank, then let the aircraft settle.',levelId:'storm',goalDistance:1100,standards:standards('elite-crosswind',1030,4,8),exam:false},
  {id:'elite_storm',rankId:'elite',index:2,globalIndex:14,name:'Storm Corridor',shortName:'Storm',briefing:'Read lightning spires and weave through the safe corridor.',instructorTip:'Never boost into an unseen gap.',levelId:'storm',goalDistance:1180,standards:standards('elite-storm',1110,5,9),exam:false},
  {id:'elite_exam',rankId:'elite',index:3,globalIndex:15,name:'Interceptor Checkride',shortName:'Exam',briefing:'Master launch, wind, damage control, and storm navigation.',instructorTip:'A clean line beats a reckless fast one.',levelId:'storm',goalDistance:1260,standards:standards('elite-exam',1200,5,10),exam:true},
  {id:'ace_afterburner',rankId:'ace',index:0,globalIndex:16,name:'Afterburner Launch',shortName:'Launch',briefing:'Take the Goldwing into the upper atmosphere.',instructorTip:'Let the launch rail aim you before boosting.',levelId:'stratosphere',goalDistance:1340,standards:standards('ace-launch',1270,4,10),exam:false},
  {id:'ace_supersonic',rankId:'ace',index:1,globalIndex:17,name:'Supersonic Gates',shortName:'Speed',briefing:'Fly a high-speed sequence above the cloud deck.',instructorTip:'Commit to one smooth arc through each trio.',levelId:'stratosphere',goalDistance:1440,standards:standards('ace-speed',1370,5,10),exam:false},
  {id:'ace_formation',rankId:'ace',index:2,globalIndex:18,name:'Gold Formation',shortName:'Formation',briefing:'Trace the ceremonial Gold Wings formation route.',instructorTip:'Follow the gold crests; they draw the ideal path.',levelId:'stratosphere',goalDistance:1540,standards:standards('ace-formation',1470,6,12,0),exam:false},
  {id:'ace_exam',rankId:'ace',index:3,globalIndex:19,name:'Final Wings Exam',shortName:'Final',briefing:'Complete the Academy’s ultimate course and earn your wings.',instructorTip:'Use everything the five ranks taught you.',levelId:'stratosphere',goalDistance:1660,standards:standards('ace-exam',1600,7,12),exam:true},
] as const;

export const SKYBOUND_CADET_LESSONS = SKYBOUND_LESSONS.filter((lesson): lesson is SkyboundCadetLesson => lesson.rankId === 'cadet');
const normalizeWhole = (value:number) => Number.isFinite(value) ? Math.max(0,Math.floor(value)) : 0;
const unique = <T,>(values:readonly T[]):readonly T[] => [...new Set(values)];
const rankIndex = (rankId:SkyboundAcademyRankId) => SKYBOUND_AIRCRAFT_RANKS.findIndex((rank) => rank.id === rankId);

export function createSkyboundAcademyProgress(tickets=SKYBOUND_STARTER_TICKETS):SkyboundAcademyProgress { return {tickets:normalizeWhole(tickets),sorties:0,academyXp:0,completedLessonIds:[],aceLessonIds:[],promotedRankIds:['cadet'],medalRankIds:[],certificateAwarded:false}; }
export function getSkyboundRank(rankId:SkyboundAcademyRankId) { return SKYBOUND_AIRCRAFT_RANKS.find((rank)=>rank.id===rankId) ?? SKYBOUND_AIRCRAFT_RANKS[0]; }
export function getSkyboundLesson(lessonId:SkyboundLessonId) { return SKYBOUND_LESSONS.find((lesson)=>lesson.id===lessonId) ?? SKYBOUND_LESSONS[0]; }
export function getSkyboundCadetLesson(lessonId:SkyboundCadetLessonId) { return getSkyboundLesson(lessonId) as SkyboundCadetLesson; }
export function getSkyboundRankLessons(rankId:SkyboundAcademyRankId) { return SKYBOUND_LESSONS.filter((lesson)=>lesson.rankId===rankId); }
export function getSkyboundCurrentRank(progress:SkyboundAcademyProgress) { const unlocked=SKYBOUND_AIRCRAFT_RANKS.filter((rank)=>progress.promotedRankIds.includes(rank.id)); return unlocked[unlocked.length-1]??SKYBOUND_AIRCRAFT_RANKS[0]; }
export function isSkyboundRankUnlocked(progress:SkyboundAcademyProgress,rankId:SkyboundAcademyRankId) { return progress.promotedRankIds.includes(rankId); }
export function isSkyboundLessonUnlocked(progress:SkyboundAcademyProgress,lessonId:SkyboundLessonId) { const lesson=getSkyboundLesson(lessonId); if(!isSkyboundRankUnlocked(progress,lesson.rankId)) return false; if(lesson.index===0) return true; const previous=getSkyboundRankLessons(lesson.rankId)[lesson.index-1]; return Boolean(previous&&progress.completedLessonIds.includes(previous.id)); }
export function isSkyboundCadetLessonUnlocked(progress:SkyboundAcademyProgress,lessonId:SkyboundCadetLessonId) { return isSkyboundLessonUnlocked(progress,lessonId); }
export function spendSkyboundSortieTicket(progress:SkyboundAcademyProgress):SkyboundTicketSpendResult { if(progress.tickets<1)return{ok:false,progress,failureReason:'insufficient_tickets'}; return{ok:true,progress:{...progress,tickets:progress.tickets-1,sorties:progress.sorties+1},failureReason:null}; }
const standardValue=(kind:SkyboundLessonStandardKind,flight:SkyboundFlightState)=>kind==='distance'?Math.round(flight.x):kind==='salvage'?flight.salvageCollected:kind==='rings'?flight.ringsCleared:flight.hazardHits;
export function evaluateSkyboundLesson(lessonId:SkyboundLessonId,flight:SkyboundFlightState):SkyboundLessonEvaluation { const lesson=getSkyboundLesson(lessonId); const standardResults=lesson.standards.map((standard)=>{const value=standardValue(standard.kind,flight);return{...standard,value,met:standard.kind==='hazards'?value<=standard.target:value>=standard.target};}); const standardsMet=standardResults.filter((standard)=>standard.met).length; const coreSkillMet=standardResults[1]?.met===true; const passed=standardsMet>=2&&coreSkillMet; const ace=standardsMet===3; return{lessonId,standardResults,standardsMet,passed,ace,academyXpEarned:25+standardsMet*15+(passed?25:0)+(ace?25:0)+(lesson.exam&&passed?50:0)}; }
export function settleSkyboundAcademyLessonWithRewards(progress:SkyboundAcademyProgress,evaluation:SkyboundLessonEvaluation):SkyboundAcademySettlement { const lesson=getSkyboundLesson(evaluation.lessonId); const wasComplete=progress.completedLessonIds.includes(lesson.id); const completedLessonIds=evaluation.passed?unique([...progress.completedLessonIds,lesson.id]):progress.completedLessonIds; const aceLessonIds=evaluation.ace?unique([...progress.aceLessonIds,lesson.id]):progress.aceLessonIds; let promotedRankIds=progress.promotedRankIds; let medalRankIds=progress.medalRankIds; let ticketsAwarded=0; if(evaluation.passed&&lesson.exam&&!wasComplete){medalRankIds=unique([...medalRankIds,lesson.rankId]);const nextRank=SKYBOUND_AIRCRAFT_RANKS[rankIndex(lesson.rankId)+1];if(nextRank)promotedRankIds=unique([...promotedRankIds,nextRank.id]);ticketsAwarded=getSkyboundRank(lesson.rankId).rewardTickets;} const certificateAwarded=progress.certificateAwarded||(evaluation.passed&&lesson.id==='ace_exam'); return{ticketsAwarded,progress:{...progress,tickets:progress.tickets+ticketsAwarded,academyXp:progress.academyXp+evaluation.academyXpEarned,completedLessonIds,aceLessonIds,promotedRankIds,medalRankIds,certificateAwarded}}; }
export function settleSkyboundAcademyLesson(progress:SkyboundAcademyProgress,evaluation:SkyboundLessonEvaluation):SkyboundAcademyProgress { return settleSkyboundAcademyLessonWithRewards(progress,evaluation).progress; }
export function sanitizeSkyboundAcademyProgress(value:unknown):SkyboundAcademyProgress {
  const fallback=createSkyboundAcademyProgress();
  if(!value||typeof value!=='object')return fallback;
  const source=value as Partial<SkyboundAcademyProgress>;
  const lessons=new Set(SKYBOUND_LESSONS.map((lesson)=>lesson.id));
  const ranks=new Set(SKYBOUND_AIRCRAFT_RANKS.map((rank)=>rank.id));
  return {
    tickets:normalizeWhole(source.tickets??fallback.tickets),
    sorties:normalizeWhole(source.sorties??0),
    academyXp:normalizeWhole(source.academyXp??0),
    completedLessonIds:unique((source.completedLessonIds??[]).filter((id):id is SkyboundLessonId=>lessons.has(id))),
    aceLessonIds:unique((source.aceLessonIds??[]).filter((id):id is SkyboundLessonId=>lessons.has(id))),
    promotedRankIds:unique(['cadet' as const,...(source.promotedRankIds??[]).filter((id):id is SkyboundAcademyRankId=>ranks.has(id))]),
    medalRankIds:unique((source.medalRankIds??[]).filter((id):id is SkyboundAcademyRankId=>ranks.has(id))),
    certificateAwarded:source.certificateAwarded===true,
  };
}
