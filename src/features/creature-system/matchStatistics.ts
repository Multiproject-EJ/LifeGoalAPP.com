import { FAMILIES, type Family } from './content';
import { rankKindred, rankComplements, type CreatureTeam } from './matching';
import type { EvidenceProfile } from './personality';

export type Collection = Record<string,{copies:number;form:number}>;
export type CreatureSort = 'owned-name' | 'name' | 'affinity' | 'complement' | 'rarity';
export const CREATURE_SORTS: {id:CreatureSort;label:string}[] = [
  {id:'owned-name',label:'Owned first · A–Z'}, {id:'name',label:'Name · A–Z'},
  {id:'affinity',label:'Best personality match'}, {id:'complement',label:'Most added team breadth'},
  {id:'rarity',label:'Rarity · Mythic first'},
];
export type MatchRow = {family:Family;owned:boolean;affinity:number|null;rank:number|null;complement:number|null;anchor:boolean;shared:string[]};
const displayScore=(n:number)=>Math.round(n*10)/10;
const nameOrder=(a:MatchRow,b:MatchRow)=>a.family.name.localeCompare(b.family.name,'en',{sensitivity:'base'})||a.family.id.localeCompare(b.family.id);
const descending=(a:number|null,b:number|null)=>a===null?(b===null?0:1):b===null?-1:displayScore(b)-displayScore(a);

/** Pure read model. Filtering/sorting must never equip or mutate collection/profile. */
export function matchStatistics(profile:EvidenceProfile,owned:Collection,team:CreatureTeam) {
  const kindred=rankKindred(profile);
  const anchors=[team.kindred,team.favourite].filter((id):id is string=>!!id);
  const complements=rankComplements(profile,anchors);
  const affinity=new Map(kindred.ranked.map(row=>[row.id,row]));
  const additions=new Map(complements.ranked.map(row=>[row.id,row.score]));
  // Competition ranks use the displayed precision: visibly identical scores share a rank.
  const scores=kindred.ranked.map(row=>displayScore(row.score)).sort((a,b)=>b-a);
  const rows:MatchRow[]=FAMILIES.map(family=>{
    const match=affinity.get(family.id),score=match?.score??null;
    const shared=(match?.breakdown??[]).slice().sort((a,b)=>Math.min(b.player,b.creature)-Math.min(a.player,a.creature)||a.id.localeCompare(b.id)).filter(x=>Math.min(x.player,x.creature)>0).slice(0,3).map(x=>x.id);
    return {family,owned:(owned[family.id]?.copies??0)>0,affinity:score,rank:score===null?null:scores.indexOf(displayScore(score))+1,complement:additions.get(family.id)??null,anchor:anchors.includes(family.id),shared};
  });
  const ranked=sortMatchRows(rows,'affinity').filter(row=>row.affinity!==null);
  const rankedOwned=ranked.filter(row=>row.owned);
  return {rows,scored:ranked.length,ownedScored:rankedOwned.length,
    best:ranked.filter(row=>row.rank===1),
    bestOwned:rankedOwned.filter(row=>displayScore(row.affinity!)===displayScore(rankedOwned[0].affinity!)),
    closeCount:ranked.filter(row=>ranked[0].affinity!-row.affinity!<=2+1e-9).length,
    teamBreadth:rankComplements(profile,Object.values(team).filter((id):id is string=>!!id)).baseline,
    complementBaseline:complements.baseline,model:profile.refinement?'Direct motivations · experimental':'Foundation diagnostic · experimental',
  };
}
export function sortMatchRows(rows:readonly MatchRow[],sort:CreatureSort):MatchRow[] {
  const rarity:Record<string,number>={common:1,rare:2,mythic:3};
  return [...rows].sort((a,b)=>{
    const primary=sort==='owned-name'?Number(b.owned)-Number(a.owned):sort==='affinity'?descending(a.affinity,b.affinity):sort==='complement'?descending(a.complement,b.complement):sort==='rarity'?rarity[b.family.rarity]-rarity[a.family.rarity]:0;
    return primary||nameOrder(a,b);
  });
}
