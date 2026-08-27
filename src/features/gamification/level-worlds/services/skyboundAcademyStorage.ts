import { SKYBOUND_STARTER_UPGRADES, type SkyboundUpgrades } from './skyboundExpeditionFlight';
import {
  SKYBOUND_ACADEMY_STORAGE_KEY,
  SKYBOUND_LESSONS,
  createSkyboundAcademyProgress,
  sanitizeSkyboundAcademyProgress,
  type SkyboundLessonId,
  type SkyboundAcademyProgress,
} from './skyboundPilotAcademy';

export interface SkyboundAcademySave {
  progress: SkyboundAcademyProgress;
  upgrades: SkyboundUpgrades;
  salvage: number;
}

/** Canonical, event-scoped Academy state stored on IslandRunGameStateRecord. */
export interface SkyboundAcademyEventProgress extends SkyboundAcademySave {
  activeAttemptId: string | null;
  activeLessonId: SkyboundLessonId | null;
  settledAttemptIds: string[];
  bestFlightScore: number;
  updatedAtMs: number;
}

const boundedLevel = (value:unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(5,Math.floor(value))) : 0;
export function createSkyboundAcademySave():SkyboundAcademySave { return { progress:createSkyboundAcademyProgress(), upgrades:{...SKYBOUND_STARTER_UPGRADES}, salvage:0 }; }
export function sanitizeSkyboundAcademySave(value:unknown):SkyboundAcademySave {
  const fallback=createSkyboundAcademySave(); if(!value||typeof value!=='object')return fallback;
  const source=value as Partial<SkyboundAcademySave>; const upgrades=source.upgrades as Partial<SkyboundUpgrades>|undefined;
  return { progress:sanitizeSkyboundAcademyProgress(source.progress), upgrades:{launcher:boundedLevel(upgrades?.launcher),airframe:boundedLevel(upgrades?.airframe),engine:boundedLevel(upgrades?.engine)}, salvage:typeof source.salvage==='number'&&Number.isFinite(source.salvage)?Math.max(0,Math.floor(source.salvage)):fallback.salvage };
}
export function createSkyboundAcademyEventProgress(nowMs=Date.now()):SkyboundAcademyEventProgress { const save=createSkyboundAcademySave(); return {...save,progress:{...save.progress,tickets:0},salvage:0,activeAttemptId:null,activeLessonId:null,settledAttemptIds:[],bestFlightScore:0,updatedAtMs:Math.max(0,Math.floor(nowMs))}; }
export function sanitizeSkyboundAcademyEventProgress(value:unknown):SkyboundAcademyEventProgress {
  const fallback=createSkyboundAcademyEventProgress(0); if(!value||typeof value!=='object'||Array.isArray(value))return fallback;
  const source=value as Partial<SkyboundAcademyEventProgress>; const save=sanitizeSkyboundAcademySave(source);
  const lessonIds=new Set<SkyboundLessonId>(SKYBOUND_LESSONS.map((lesson)=>lesson.id));
  return {...save,progress:{...save.progress,tickets:0},activeAttemptId:typeof source.activeAttemptId==='string'&&source.activeAttemptId.trim()?source.activeAttemptId.trim():null,activeLessonId:typeof source.activeLessonId==='string'&&lessonIds.has(source.activeLessonId as SkyboundLessonId)?source.activeLessonId as SkyboundLessonId:null,settledAttemptIds:Array.isArray(source.settledAttemptIds)?Array.from(new Set(source.settledAttemptIds.filter((id):id is string=>typeof id==='string'&&id.trim().length>0))).slice(-80):[],bestFlightScore:typeof source.bestFlightScore==='number'&&Number.isFinite(source.bestFlightScore)?Math.max(0,Math.floor(source.bestFlightScore)):0,updatedAtMs:typeof source.updatedAtMs==='number'&&Number.isFinite(source.updatedAtMs)?Math.max(0,Math.floor(source.updatedAtMs)):0};
}
export function loadSkyboundAcademySave():SkyboundAcademySave {
  if(typeof window==='undefined')return createSkyboundAcademySave();
  try { const raw=window.localStorage.getItem(SKYBOUND_ACADEMY_STORAGE_KEY); return raw?sanitizeSkyboundAcademySave(JSON.parse(raw)):createSkyboundAcademySave(); } catch { return createSkyboundAcademySave(); }
}
export function saveSkyboundAcademySave(save:SkyboundAcademySave):void {
  if(typeof window==='undefined')return;
  try { window.localStorage.setItem(SKYBOUND_ACADEMY_STORAGE_KEY,JSON.stringify(sanitizeSkyboundAcademySave(save))); } catch { /* A full or blocked local store must never stop a sortie. */ }
}
export function clearSkyboundAcademySave():SkyboundAcademySave {
  if(typeof window!=='undefined') { try { window.localStorage.removeItem(SKYBOUND_ACADEMY_STORAGE_KEY); } catch { /* no-op */ } }
  return createSkyboundAcademySave();
}
