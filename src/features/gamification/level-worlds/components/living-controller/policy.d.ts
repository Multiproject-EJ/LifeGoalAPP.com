export const CONTROLLER_THEMES:string[];
export function islandControllerTheme(islandNumber:number,surface?:'island'|'treasure'):string|null;
export function resolveControllerTheme(dark:boolean,dev:boolean,selection:string,islandNumber?:number,preferred?:string,surface?:'island'|'treasure'):string;
export function controllerSwipe(dx:number,dy:number,collapsed:boolean):'show'|'hide'|null;
