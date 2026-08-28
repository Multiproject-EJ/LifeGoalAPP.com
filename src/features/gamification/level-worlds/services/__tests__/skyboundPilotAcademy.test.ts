import {
  SKYBOUND_AIRCRAFT_RANKS,
  SKYBOUND_CADET_LESSONS,
  SKYBOUND_LESSONS,
  createSkyboundAcademyProgress,
  evaluateSkyboundLesson,
  getSkyboundAssemblyLevel,
  getSkyboundAssemblyPartCost,
  getSkyboundRankLessons,
  installSkyboundNextAssemblyPart,
  isSkyboundCadetLessonUnlocked,
  isSkyboundRankUnlocked,
  isSkyboundLessonUnlocked,
  settleSkyboundAcademyLesson,
  spendSkyboundSortieTicket,
} from '../skyboundPilotAcademy';
import { SKYBOUND_STARTER_UPGRADES, createSkyboundFlight } from '../skyboundExpeditionFlight';
import { createSkyboundAcademyEvaluatorSave, getSkyboundAcademyEvaluatorLesson } from '../skyboundAcademyEvaluator';

type TestCase = { name: string; run: () => void };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function flightResult(options: {
  distance: number;
  salvage: number;
  rings: number;
  hazards: number;
}) {
  return {
    ...createSkyboundFlight({
      power: 1,
      angleDeg: 35,
      upgrades: SKYBOUND_STARTER_UPGRADES,
      levelId: 'meadow',
    }),
    status: 'landed' as const,
    x: options.distance,
    salvageCollected: options.salvage,
    ringsCleared: options.rings,
    hazardHits: options.hazards,
    smoothFlightMs: 12_000,
  };
}

export const skyboundPilotAcademyTests: TestCase[] = [
  {
    name: 'defines five aircraft ranks from toy glider to Goldwing Fighter',
    run: () => {
      assert(SKYBOUND_AIRCRAFT_RANKS.length === 5, 'academy should contain exactly five aircraft ranks');
      assert(SKYBOUND_AIRCRAFT_RANKS[0].aircraftId === 'toy_glider', 'Cadet must start in a toy glider');
      assert(SKYBOUND_AIRCRAFT_RANKS[4].aircraftId === 'goldwing_fighter', 'Ace must finish in the Goldwing Fighter');
    },
  },
  {
    name: 'authors exactly four sequential flights for every one of the five ranks',
    run: () => {
      assert(SKYBOUND_LESSONS.length === 20, 'the full Academy event should contain 20 flights');
      for (const rank of SKYBOUND_AIRCRAFT_RANKS) {
        const lessons = SKYBOUND_LESSONS.filter((lesson) => lesson.rankId === rank.id);
        assert(lessons.length === 4, `${rank.id} should contain three drills and one checkride`);
        assert(lessons[3].exam, `${rank.id} fourth flight should be its exam`);
      }
    },
  },
  {
    name: 'spends exactly one ticket only through the sortie spend service',
    run: () => {
      const initial = createSkyboundAcademyProgress(2);
      const first = spendSkyboundSortieTicket(initial);
      assert(first.ok, 'a player with tickets should launch');
      assert(initial.tickets === 2 && initial.sorties === 0, 'ticket spend must not mutate prior progress');
      assert(first.progress.tickets === 1 && first.progress.sorties === 1, 'one launch should spend exactly one ticket');
      const second = spendSkyboundSortieTicket(first.progress);
      const blocked = spendSkyboundSortieTicket(second.progress);
      assert(!blocked.ok && blocked.progress === second.progress, 'ticketless launch should fail without changing progress');
    },
  },
  {
    name: 'unlocks Cadet lessons sequentially',
    run: () => {
      const initial = createSkyboundAcademyProgress();
      assert(isSkyboundCadetLessonUnlocked(initial, 'cadet_launch'), 'Launch Drill should be open immediately');
      assert(!isSkyboundCadetLessonUnlocked(initial, 'cadet_gates'), 'Precision Gates should initially be locked');
      const evaluation = evaluateSkyboundLesson('cadet_launch', flightResult({ distance: 170, salvage: 3, rings: 0, hazards: 1 }));
      const completed = settleSkyboundAcademyLesson(initial, evaluation);
      assert(!isSkyboundCadetLessonUnlocked(completed, 'cadet_gates'), 'the next drill should wait for its visible wing installation');
      const settled = installSkyboundNextAssemblyPart(completed, 'cadet');
      assert(isSkyboundCadetLessonUnlocked(settled, 'cadet_gates'), 'passing Launch Drill should unlock Precision Gates');
    },
  },
  {
    name: 'passes with two standards and awards Ace for all three',
    run: () => {
      const standard = evaluateSkyboundLesson('cadet_gates', flightResult({ distance: 225, salvage: 1, rings: 1, hazards: 0 }));
      const ace = evaluateSkyboundLesson('cadet_gates', flightResult({ distance: 270, salvage: 6, rings: 2, hazards: 0 }));
      assert(standard.standardsMet === 2 && standard.passed && !standard.ace, 'two standards should be a normal pass');
      assert(ace.standardsMet === 3 && ace.passed && ace.ace, 'three standards should be an Ace pass');
      assert(ace.academyXpEarned > standard.academyXpEarned, 'Ace should award more academy XP');
    },
  },
  {
    name: 'requires the lesson core skill instead of allowing passive distance and safety passes',
    run: () => {
      const passive = evaluateSkyboundLesson('cadet_gates', flightResult({ distance: 270, salvage: 6, rings: 0, hazards: 0 }));
      assert(passive.standardsMet === 2, 'passive flight should still report its two completed standards');
      assert(!passive.passed, 'missing the precision gate objective must require retraining');
    },
  },
  {
    name: 'makes energy and landing lessons require their named flying skill',
    run: () => {
      const energyBase=flightResult({distance:510,salvage:8,rings:3,hazards:0});
      const missedFlow=evaluateSkyboundLesson('trainee_energy',{...energyBase,smoothFlightMs:3_900});
      const heldFlow=evaluateSkyboundLesson('trainee_energy',{...energyBase,smoothFlightMs:4_000});
      assert(!missedFlow.passed&&heldFlow.passed,'Energy Turns should require four complete seconds of Flow');

      const landingBase=flightResult({distance:540,salvage:8,rings:3,hazards:0});
      const flewPast=evaluateSkyboundLesson('trainee_landing',{...landingBase,status:'finished',terminalReason:'goal'});
      const touchedDown=evaluateSkyboundLesson('trainee_landing',{...landingBase,status:'landed',terminalReason:'touchdown'});
      assert(!flewPast.passed&&touchedDown.passed,'Landing Pattern should require a controlled touchdown instead of a fly-through');
    },
  },
  {
    name: 'promotes the Cadet to Trainee only after passing the mini exam',
    run: () => {
      let progress = createSkyboundAcademyProgress();
      for(let part=0;part<4;part+=1)progress=installSkyboundNextAssemblyPart(progress,'cadet');
      for (const lesson of SKYBOUND_CADET_LESSONS) {
        const evaluation = evaluateSkyboundLesson(lesson.id, flightResult({ distance: 400, salvage: 8, rings: 3, hazards: 0 }));
        progress = settleSkyboundAcademyLesson(progress, evaluation);
        if (!lesson.exam) assert(!isSkyboundRankUnlocked(progress, 'trainee'), 'ordinary drills must not grant promotion');
      }
      assert(isSkyboundRankUnlocked(progress, 'trainee'), 'passing the Cadet exam should unlock Trainee');
      assert(progress.aceLessonIds.length === 4, 'perfect Cadet chapter should retain every Ace result');
    },
  },
  {
    name: 'completes all five rank exams and awards the final Gold Wings certificate',
    run: () => {
      let progress = createSkyboundAcademyProgress();
      for (const lesson of SKYBOUND_LESSONS) {
        while(getSkyboundAssemblyLevel(progress,lesson.rankId)<(lesson.exam?4:lesson.index))progress=installSkyboundNextAssemblyPart(progress,lesson.rankId);
        assert(isSkyboundLessonUnlocked(progress, lesson.id), `${lesson.id} should unlock in sequence during a perfect career`);
        const evaluation = evaluateSkyboundLesson(lesson.id, flightResult({ distance: 2_000, salvage: 30, rings: 20, hazards: 0 }));
        progress = settleSkyboundAcademyLesson(progress, evaluation);
      }
      assert(progress.completedLessonIds.length === 20, 'all 20 flights should remain recorded');
      assert(progress.medalRankIds.length === 5, 'each rank exam should award one medal');
      assert(progress.promotedRankIds.length === 5, 'all five aircraft ranks should be unlocked');
      assert(progress.certificateAwarded, 'the final wings exam should award the certificate');
    },
  },
  {
    name: 'builds every aircraft from fuselage through four priced physical parts',
    run: () => {
      let progress=createSkyboundAcademyProgress();
      assert(getSkyboundAssemblyLevel(progress,'cadet')===0,'fresh Cadet aircraft should begin as a bare fuselage');
      for(let expected=1;expected<=4;expected+=1){
        progress=installSkyboundNextAssemblyPart(progress,'cadet');
        assert(getSkyboundAssemblyLevel(progress,'cadet')===expected,`installation ${expected} should advance exactly once`);
        assert(getSkyboundAssemblyPartCost('cadet',expected as 1|2|3|4)>0,'every installed part should have a salvage cost');
      }
      assert(installSkyboundNextAssemblyPart(progress,'cadet')===progress,'a completed aircraft must not install a fifth part');
    },
  },
  {
    name: 'builds disposable evaluator careers for every rank without bypassing production progression rules',
    run: () => {
      for (const [rankIndex,rank] of SKYBOUND_AIRCRAFT_RANKS.entries()) {
        const scenario={rankId:rank.id,lessonIndex:3,assemblyLevel:2 as const,upgradeLevel:4};
        const save=createSkyboundAcademyEvaluatorSave(scenario);
        const lesson=getSkyboundAcademyEvaluatorLesson(scenario);
        assert(lesson.rankId===rank.id&&lesson.exam,`${rank.id} evaluator should select its checkride`);
        assert(save.progress.promotedRankIds.length===rankIndex+1,`${rank.id} evaluator should unlock only reached ranks`);
        assert(save.progress.aircraftAssemblyLevels[rank.id]===2,`${rank.id} evaluator should preserve the requested partial build`);
        assert(save.upgrades.launcher===4&&save.upgrades.airframe===4&&save.upgrades.engine===4,'evaluator should apply the requested fleet upgrade level');
        assert(!isSkyboundLessonUnlocked(save.progress,lesson.id),'a partial evaluator aircraft should expose, not weaken, the production checkride gate');
        assert(save.progress.completedLessonIds.includes(getSkyboundRankLessons(rank.id)[2].id),'evaluator should pre-complete the lessons before its selected checkride');
      }
    },
  },
];
