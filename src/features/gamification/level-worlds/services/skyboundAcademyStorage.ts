import { SKYBOUND_STARTER_UPGRADES, type SkyboundUpgrades } from './skyboundExpeditionFlight';
import {
  SKYBOUND_ACADEMY_STORAGE_KEY,
  createSkyboundAcademyProgress,
  sanitizeSkyboundAcademyProgress,
  type SkyboundAcademyProgress,
} from './skyboundPilotAcademy';

export interface SkyboundAcademySave {
  progress: SkyboundAcademyProgress;
  upgrades: SkyboundUpgrades;
  salvage: number;
}

const boundedLevel = (value:unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(5,Math.floor(value))) : 0;
export function createSkyboundAcademySave():SkyboundAcademySave { return { progress:createSkyboundAcademyProgress(), upgrades:{...SKYBOUND_STARTER_UPGRADES}, salvage:180 }; }
export function sanitizeSkyboundAcademySave(value:unknown):SkyboundAcademySave {
  const fallback=createSkyboundAcademySave(); if(!value||typeof value!=='object')return fallback;
  const source=value as Partial<SkyboundAcademySave>; const upgrades=source.upgrades as Partial<SkyboundUpgrades>|undefined;
  return { progress:sanitizeSkyboundAcademyProgress(source.progress), upgrades:{launcher:boundedLevel(upgrades?.launcher),airframe:boundedLevel(upgrades?.airframe),engine:boundedLevel(upgrades?.engine)}, salvage:typeof source.salvage==='number'&&Number.isFinite(source.salvage)?Math.max(0,Math.floor(source.salvage)):fallback.salvage };
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
