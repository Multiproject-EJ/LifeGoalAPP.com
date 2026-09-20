import {mkdirSync} from 'node:fs';
mkdirSync('work',{recursive:true});
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {build}=createRequire(require.resolve('vite'))('esbuild');
await build({entryPoints:['src/features/gamification/level-worlds/services/crystalMinersGame.ts'],bundle:true,format:'esm',platform:'node',outfile:'work/miner-balance-engine.mjs'});
const m=await import('../work/miner-balance-engine.mjs');
for(const buysPerDig of [0,2,8])for(const seed of [17,42,101]) { let randomIndex=seed*10000;
let p=m.createCrystalMinersProgress();let tickets=3,returns=0,spent=0;const rows=[];let dry=0,maxDry=0;
for(let step=0;step<200 && p.eventTrack.levelsCleared<40;step++){
 for(let i=0;i<25;i++)if(p.tools[i]<0)p=m.openMinerGift(p,i,m.minerGiftRarityRoll(++randomIndex));
 if(buysPerDig>0)p=m.upgradeMinerForge(p)??p;
 for(let pass=0;pass<30;pass++){
   let pair=null;
   for(let tier=1;tier<m.MINER_MAX_TIER&&!pair;tier++)for(let a=0;a<25&&!pair;a++)if(p.tools[a]===tier)for(let b=a+1;b<25;b++)if(p.tools[b]===tier&&(a%5===b%5||p.tools.filter(Boolean).length>=23)){pair=[a,b];break;}
   if(!pair)break;p=m.arrangeMinerTools(p,...pair);
 }
 for(let n=0;n<buysPerDig;n++){const next=m.buyMinerTool(p);if(!next)break;p=next;}
 while(p.giftsWaiting>0&&p.tools.includes(0)){p=m.claimWaitingMinerGift(p);for(let i=0;i<25;i++)if(p.tools[i]<0)p=m.openMinerGift(p,i,m.minerGiftRarityRoll(++randomIndex));}
 if(tickets===0){returns++;tickets=5;}
 tickets--;spent++;const level=p.level;const sim=m.simulateMinerDig(p,false);p=m.settleMinerDig(p,sim);dry=sim.ore?0:dry+1;maxDry=Math.max(maxDry,dry);
 if(sim.cleared){rows.push({level,totalDrops:spent,forge:p.forgeLevel,highestTier:Math.max(...p.tools),ore:p.ore});if(level===20)tickets+=20;}
}
console.log(JSON.stringify({model:'headless; gifts and merging in every policy; forge only with buying; fixed seeded gift rolls; no real-world wait/checkout model',seed,buysPerDig,levelsCleared:p.eventTrack.levelsCleared,drops:spent,maxDry,rows}));
}
