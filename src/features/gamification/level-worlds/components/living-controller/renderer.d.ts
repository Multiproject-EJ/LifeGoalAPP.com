export interface ControllerMenuFace { glyph:string; label:string; }
export interface ControllerMenuFaces {
 shop:ControllerMenuFace; build:ControllerMenuFace; creatures:ControllerMenuFace; concord:ControllerMenuFace;
 roll:{ title:string; detail:string; hint:string };
}
export interface ControllerSnapshot {
 theme:string; reduced:boolean; hidden:boolean; dice:number; multiplier:number; maximum:number;
 rolling:boolean; autoRolling:boolean; jackpot:boolean; buildReady:boolean; rollTitle:string; regenLabel:string;
 concordTitle?:string;
 navigationOnly?:boolean;
 menuFaces?:ControllerMenuFaces;
 arrivalKey?:string; blocked?:boolean; activity?:number;
 onArrivalImpact?:()=>void;
 multiplierMaxJumping?:boolean;
 /** Island sunlight profile: drives the enamel shine and sunbeam sweeps. */
 sunlight?:"full_sun"|"fair"|"none"; islandNumber?:number;
}
export function mountLivingController(host:HTMLDivElement, controls:Record<string,HTMLButtonElement>, getSnapshot:()=>ControllerSnapshot,onReady:()=>void,onError:()=>void):()=>void;
