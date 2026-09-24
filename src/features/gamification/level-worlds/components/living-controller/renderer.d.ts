export interface ControllerSnapshot {
 theme:string; reduced:boolean; hidden:boolean; dice:number; multiplier:number; maximum:number;
 rolling:boolean; autoRolling:boolean; jackpot:boolean; buildReady:boolean; rollTitle:string; regenLabel:string;
 concordTitle?:string;
 multiplierMaxJumping?:boolean;
}
export function mountLivingController(host:HTMLDivElement, controls:Record<string,HTMLButtonElement>, getSnapshot:()=>ControllerSnapshot,onReady:()=>void,onError:()=>void):()=>void;
