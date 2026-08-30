import {
  SKYBOUND_STARTER_UPGRADES,
  type SkyboundUpgrades,
} from './skyboundExpeditionFlight';
import {
  SKYBOUND_AIRCRAFT_RANKS,
  SKYBOUND_LESSONS,
  createSkyboundAcademyProgress,
  getSkyboundRankLessons,
  type SkyboundAcademyRankId,
  type SkyboundAssemblyLevel,
} from './skyboundPilotAcademy';
import type { SkyboundAcademySave } from './skyboundAcademyStorage';

export interface SkyboundAcademyEvaluatorScenario {
  rankId: SkyboundAcademyRankId;
  lessonIndex: number;
  assemblyLevel: SkyboundAssemblyLevel;
  upgradeLevel: number;
}

const clampWhole = (value:number,minimum:number,maximum:number) => (
  Math.max(minimum,Math.min(maximum,Math.floor(Number.isFinite(value)?value:minimum)))
);

/**
 * Builds a disposable Academy career for the development evaluator. The result
 * is passed directly to the minigame and is never written to event storage.
 */
export function createSkyboundAcademyEvaluatorSave(scenario:SkyboundAcademyEvaluatorScenario):SkyboundAcademySave {
  const rankIndex=Math.max(0,SKYBOUND_AIRCRAFT_RANKS.findIndex((rank)=>rank.id===scenario.rankId));
  const rank=SKYBOUND_AIRCRAFT_RANKS[rankIndex];
  const lessonIndex=clampWhole(scenario.lessonIndex,0,3);
  const assemblyLevel=clampWhole(scenario.assemblyLevel,0,4) as SkyboundAssemblyLevel;
  const upgradeLevel=clampWhole(scenario.upgradeLevel,0,5);
  const promotedRankIds=SKYBOUND_AIRCRAFT_RANKS.slice(0,rankIndex+1).map((item)=>item.id);
  const priorRankIds=new Set(SKYBOUND_AIRCRAFT_RANKS.slice(0,rankIndex).map((item)=>item.id));
  const completedLessonIds=SKYBOUND_LESSONS
    .filter((lesson)=>priorRankIds.has(lesson.rankId)||(lesson.rankId===rank.id&&lesson.index<lessonIndex))
    .map((lesson)=>lesson.id);
  const aircraftAssemblyLevels={cadet:0,trainee:0,aviator:0,elite:0,ace:0} as Record<SkyboundAcademyRankId,SkyboundAssemblyLevel>;
  for(const priorRank of SKYBOUND_AIRCRAFT_RANKS.slice(0,rankIndex))aircraftAssemblyLevels[priorRank.id]=4;
  aircraftAssemblyLevels[rank.id]=assemblyLevel;
  const progress=createSkyboundAcademyProgress(99);
  const upgrades:SkyboundUpgrades={
    ...SKYBOUND_STARTER_UPGRADES,
    launcher:upgradeLevel,
    airframe:upgradeLevel,
    engine:upgradeLevel,
  };
  return {
    progress:{
      ...progress,
      academyXp:completedLessonIds.length*100,
      completedLessonIds,
      aceLessonIds:completedLessonIds,
      promotedRankIds,
      medalRankIds:SKYBOUND_AIRCRAFT_RANKS.slice(0,rankIndex).map((item)=>item.id),
      aircraftAssemblyLevels,
    },
    upgrades,
    salvage:9_999,
  };
}

export function getSkyboundAcademyEvaluatorLesson(scenario:SkyboundAcademyEvaluatorScenario) {
  return getSkyboundRankLessons(scenario.rankId)[clampWhole(scenario.lessonIndex,0,3)];
}
