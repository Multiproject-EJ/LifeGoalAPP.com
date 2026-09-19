import type { MinerBlock } from './crystalMinersGame';

export type MinerLayoutVersion = 1|2|3|4|5|6|7|8|9|10;
export type MinerRecipe = 'first_fall'|'soft_cascade'|'demolition'|'route_choice'|'reinforcement'|'linked_vault'|'two_paths'|'reward_rain';
/** Encounter identity is independent of cave colour and the player's wallet. */
export function minerCourseProfile(level:number) {
  const boss=level%10===0;
  const rows=boss?18+Math.floor(level/10)*2:6+Math.floor((level-1)*18/38);
  const recipe:MinerRecipe=level<=2?'first_fall':boss?'reward_rain':level>=24&&(level%4===0||level===39)?'linked_vault':level%10>=8?'two_paths':level===4||level%4===1?'reinforcement':level>=7&&level%4===3?'route_choice':level>=5&&level%4===2?'demolition':'soft_cascade';
  return {rows,height:116+rows*29+180,recipe,requiredChests:level%10===8||level%10===9?2:1};
}
export const MINER_RECIPE_NAMES:Record<MinerRecipe,string>={first_fall:'First discoveries',soft_cascade:'Crystal cascade',demolition:'Demolition pocket',route_choice:'A turn toward treasure',reinforcement:'Reinforcements',linked_vault:'The linked vault',two_paths:'Two paths to treasure',reward_rain:'Guardian treasure fall'};

/** Keep a fixed 140-cell save shape; unused rows are empty, not more obstacles. */
export function createAuthoredMinerBlocks(level:number,targetPower:number):MinerBlock[] {
  const {rows,recipe}=minerCourseProfile(level);
  const boss=level%10===0,chapter=Math.floor((level-1)/10);
  const blocks:MinerBlock[]=Array.from({length:140},(_,id)=>({id,kind:id>=135?'treasure':'stone',hp:id>=135?1:0,maxHp:1}));
  const pressure=level<=3?.7:2.5+Math.min(8.5,(level-4)*.25);
  const hardness:Partial<Record<MinerBlock['kind'],number>>={ice:.55,iron:2.1,obsidian:1.65,tnt:.35,gift:.45,gate:3};
  const oneHit=new Set<MinerBlock['kind']>(['treasure','ticket','spawner','balloon','deflector','charger','key']);
  const put=(row:number,lane:number,kind:MinerBlock['kind'],hp?:number)=>{
    const id=Math.min(26,Math.max(0,row))*5+(lane+5)%5;
    const maxHp=hp??(oneHit.has(kind)?1:Math.max(1,Math.ceil(targetPower*pressure*(.8+row/rows*.6)*(hardness[kind]??1))));
    blocks[id]={id,kind,hp:maxHp,maxHp};return id;
  };
  // Different boss reward silhouettes: staggered ribbons, side pockets, paired
  // balloon rows, then a broad cascade. The guardian remains a shared barrier.
  if(boss){
    const stage=level/10;
    for(let row=2;row<rows;row++)for(let lane=0;lane<5;lane++){
      if(row>=7&&row<=12)continue;
      const prize=stage===1?(row+lane)%4===0:stage===2?(row%5===1||(lane%2===0&&row%5===3)):stage===3?(row%4===2&&lane!==row%5):(row+lane*2)%5<=1;
      if(prize)put(row,lane,(row+lane)%3===0?'crystal':'ore',1);
    }
    put(8,2,'boss',Math.ceil(targetPower*(140+stage*35)));
    for(let lane=0;lane<5;lane++)put(rows-3+(lane+stage)%2,lane,stage===3&&lane%2===0?'balloon':'gift',1);
    put(rows-5,(stage*2+1)%5,'ticket');
    if(stage>=2)put(rows-7,(stage+3)%5,'charger');
    return blocks;
  }
  for(let row=0;row<rows;row++)for(let lane=0;lane<5;lane++){
    const hash=(row*43+lane*29+level*19+row*lane*7)%101;
    if(hash>45+level*.6||row%5===3)continue;
    let kind:MinerBlock['kind']=row%3===0?'ice':level>=3&&row%3===1?'brick':'stone';
    if(hash%9===0)kind='ore';
    else if(level>=3&&hash%13===0)kind='crystal';
    else if(level>=5&&row>2&&hash%17===0)kind='iron';
    else if(level>=21&&row>rows/2&&hash%19===0)kind='obsidian';
    put(row,lane,kind);
  }
  const focus=(Math.floor(level/4)+level*2)%5;
  const middle=Math.max(2,Math.floor(rows*.46));
  // Each early lane demonstrates a short, achievable path, not a wall of 70 tiles.
  if(level<=2)for(let lane=0;lane<5;lane++)put(1+(lane+level)%3,lane,'ore',1);
  if(level>=2)put(rows-2,(focus+2)%5,'gift');
  if(recipe==='demolition'){
    const r=Math.min(rows-4,middle);
    put(r,focus,'tnt');put(r,(focus+1)%5,'iron');put(r+1,focus,'iron');
    if(level>=18)put(r+1,(focus+1)%5,'tnt');
    put(r+2,focus,'gift');
  }
  if(recipe==='reinforcement'||level===4){
    put(middle,focus,'spawner');
    put(middle+2,focus,'iron');put(middle+3,focus,'crystal');
  }
  if(recipe==='route_choice'){
    const destination=focus===4?3:focus+1;
    put(middle,focus,'deflector');put(middle+2,destination,'crystal');put(middle+3,destination,'gift');
  }
  if(level>=7&&level%3===1)put(2+(level%Math.max(1,rows-5)),(focus+3)%5,'balloon');
  if(level>=11)put(Math.min(rows-2,3+level%(rows-3)),(focus+1)%5,'ember');
  if(level>=16&&(level%3===1||recipe==='two_paths'))put(Math.max(2,Math.floor(rows*.6)-(level%3)),(focus+4)%5,'charger');
  if(recipe==='linked_vault'){
    put(Math.floor(rows*.3),focus,'key');
    put(Math.floor(rows*.68),(focus+1)%5,'gate');put(Math.floor(rows*.74),(focus+3)%5,'gate');
    put(rows-2,(focus+3)%5,'crystal');
  }
  if(level%10===6)put(Math.min(rows-2,Math.floor(rows*(.45+chapter*.1))),(chapter*2+Math.floor(level/3))%5,'ticket');
  return blocks;
}
