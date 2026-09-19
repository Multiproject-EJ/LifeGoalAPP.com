import {createCrystalMinersProgress,createMinerBlocks,minerToolPower,minerImpactBudget,minerCourseHeight,minerRecommendedTier,simulateMinerDig,settleMinerDig,sanitizeCrystalMinersProgressByEvent,getMinerReadiness} from '../crystalMinersGame';
import {minerCourseProfile} from '../crystalMinersCourses';
import {createMinerVisualEvents,minerVisibleEffects,createMinerReplayTiming} from '../crystalMinersReplay';
import {assert,assertEqual,assertDeepEqual,type TestCase} from './testHarness';
const fleet=(level:number,tier:number,count=15)=>({...createCrystalMinersProgress(),level,forgeLevel:5,blocks:createMinerBlocks(level),tools:[...Array(count).fill(tier),...Array(25-count).fill(0)]});
export const crystalMinersProgressionTests:TestCase[]=[
  {name:'early courses have fewer obstacles and less depth than late courses',run:()=>{
    const count=(level:number)=>createMinerBlocks(level).filter(b=>b.hp>0&&b.kind!=='treasure').length;
    assert(count(1)<=15,'first course has at most fifteen obstacles');assert(count(39)>=60,'late course has a visibly richer field');assert(count(39)>count(1)*4,'distinct early/late density');assert(minerCourseHeight(1)<minerCourseHeight(39)*.55,'short onboarding shaft');
    for(let level=1;level<=40;level++){const blocks=createMinerBlocks(level);assertEqual(blocks.length,140,'stable save shape');assertEqual(blocks.filter(b=>b.kind==='treasure'&&b.hp===1).length,5,'five finish lines');assert(blocks.filter(b=>b.hp>0).every(b=>b.kind==='treasure'||116+Math.floor(b.id/5)*29<minerCourseHeight(level)-180),'space before chests');assert(blocks.filter(b=>b.kind==='ticket'&&b.hp>0).length<=1,'bounded ticket reward');}
    assertEqual(minerCourseHeight(1,9),1120,'old geometry remains unchanged');
  }},
  {name:'encounter recipes vary lanes and stage introductions instead of repeating one special row',run:()=>{
    const levels=Array.from({length:40},(_,i)=>i+1);const recipes=new Set(levels.map(l=>minerCourseProfile(l).recipe));assert(recipes.size>=7,'distinct encounter recipes');
    for(const [kind,minLevel] of [['iron',4],['ember',11],['charger',16],['key',24]] as const)assert(levels.filter(l=>l<minLevel).every(l=>!createMinerBlocks(l).some(b=>b.kind===kind&&b.hp>0)),`${kind} introduced after basics`);
    for(const kind of ['ticket','spawner','charger','key'] as const){const positions=levels.flatMap(l=>createMinerBlocks(l).filter(b=>b.kind===kind&&b.hp>0).map(b=>b.id));assert(new Set(positions).size>=3,`${kind} changes depth/lane`);}
    assertEqual(new Set([10,20,30,40].map(l=>JSON.stringify(createMinerBlocks(l).filter(b=>b.hp>0).map(b=>[b.id,b.kind])))).size,4,'four distinct reward falls');
  }},
  {name:'every merge increases combined digging capacity and every forge rank improves endurance',run:()=>{
    for(let tier=1;tier<20;tier++)for(let forge=0;forge<=5;forge++){const before=2*minerToolPower(tier)*minerImpactBudget(tier,forge);const after=minerToolPower(tier+1)*minerImpactBudget(tier+1,forge);assert(after>before,`tier ${tier} merge must improve capacity`);if(forge<5)assert(minerImpactBudget(tier,forge+1)>minerImpactBudget(tier,forge),'forge improves all tool tiers');}
  }},
  {name:'weak racks fail late courses while invested racks clear with bounded attempts and replay time',run:()=>{
    for(const level of [16,24,28,38,39,40]){
      const target=minerRecommendedTier(level);const weak=simulateMinerDig(fleet(level,Math.max(1,target-4)),false);assert(!weak.cleared,`under-equipped fleet fails level ${level}`);
      let p=fleet(level,target+1);let cleared=false;
      for(let i=0;i<3;i++){const strong=simulateMinerDig(p);assert(createMinerReplayTiming(strong.frames).travelDuration<=26600,'bounded replay even on tough terrain');p=settleMinerDig(p,strong);if(strong.cleared){cleared=true;break;}}
      assert(cleared,`invested fleet clears level ${level} within three drops`);
    }
  }},
  {name:'readiness reflects remaining terrain and forge investment without touching outcomes',run:()=>{
    const p=fleet(39,12);const before=JSON.stringify(p);const weak=getMinerReadiness({...p,forgeLevel:0});const strong=getMinerReadiness(p);assert(strong.laneCapacity.every((v,i)=>v>weak.laneCapacity[i]),'forge improves capacity estimate');assertDeepEqual(strong.laneResistance,weak.laneResistance,'difficulty never depends on investment or wallet');assertEqual(JSON.stringify(p),before,'guidance read only');const damaged=getMinerReadiness({...p,blocks:p.blocks.map(b=>({...b,hp:0}))});assertEqual(damaged.readyLanes,5,'cleared terrain recognized');
  }},
  {name:'a key opens both linked gates once and its saved unlock survives reload',run:()=>{
    const p=fleet(24,12,5);p.blocks=p.blocks.map(b=>({...b,hp:['key','gate','treasure'].includes(b.kind)?b.hp:0}));const sim=simulateMinerDig(p);assertEqual(sim.keysCollected,1,'key found');assertEqual(sim.gatesOpened,2,'both gates unlocked');assert(sim.frames.flatMap(f=>f.hits).filter(h=>h.broken&&h.kind==='gate').length===2,'one unlock burst per gate');const saved=sanitizeCrystalMinersProgressByEvent({p:{...p,blocks:sim.blocks}}).p;assert(saved,'exact damaged recipe accepted');assertEqual(simulateMinerDig(saved,false).keysCollected,0,'key cannot be reclaimed');assertEqual(simulateMinerDig(saved,false).gatesOpened,0,'gate unlock cannot be replayed');
  }},
  {name:'gates can be broken without a key; chargers and spawners improve only the current drop',run:()=>{
    const p=fleet(28,14,5);p.blocks=p.blocks.map(b=>({...b,hp:b.kind==='gate'||b.kind==='treasure'?b.hp:0}));const sim=simulateMinerDig(p,false);assert(sim.blocks.filter(b=>b.kind==='gate').every(b=>b.hp===0),'strong tools can brute-force a gate');assertEqual(sim.keysCollected,0,'no key needed');
    const charge=fleet(16,8,5);charge.blocks=charge.blocks.map(b=>({...b,hp:['charger','treasure'].includes(b.kind)?b.hp:0}));const charged=simulateMinerDig(charge,false);assertEqual(charged.chargesCollected,1,'one charger consumed');assert(charged.impactsRestored>0&&charged.impactsRestored<=6,'restoration bounded by capacity');assertDeepEqual(settleMinerDig(charge,charged).tools.slice(0,5),charge.tools.slice(0,5),'charge never upgrades permanent tier');
    const spawn=fleet(4,10,5);const spawned=simulateMinerDig(spawn);assertEqual(spawned.spawnedTools,1,'one reinforcement');assert(spawned.frames.some(f=>f.bodies.some(b=>b.id>=25&&b.tier===9)),'reinforcement scales with triggering tool');assert(spawned.frames.every(f=>f.bodies.length<=30),'temporary-body budget');
  }},
  {name:'impact retention survives skipped frames, expires by age and prioritizes rewards within a fixed cap',run:()=>{
    const base=simulateMinerDig(fleet(1,3)).frames[0];const hits=Array.from({length:50},(_,i)=>({blockId:i,x:30,y:150,step:i,kind:i===0?'ticket' as const:'stone' as const,broken:i===0}));
    const events=createMinerVisualEvents([{...base,hits}], [100]);const collision=createMinerVisualEvents([{...base,hits:[hits[1],hits[1],{...hits[1],broken:true}]}],[0]);assertEqual(collision.length,1,'simultaneous impacts share one stable visual identity');assert(collision[0].hit.broken,'breaking impact replaces earlier flashes');assertEqual(minerVisibleEffects(events,99,0).length,0,'future events not visible');const visible=minerVisibleEffects(events,200,0);assertEqual(visible.length,32,'hard visual cap');assert(visible.some(h=>h.kind==='ticket'),'special survives ordinary hit crowding');assertEqual(minerVisibleEffects(events,500,0).length,1,'reward persists across missed frames after ordinary hits expire');assertEqual(minerVisibleEffects(events,800,0).length,0,'all effects expire');assertEqual(minerVisibleEffects(events,200,1000).length,0,'offscreen effects culled');assertEqual(minerVisibleEffects(events,Infinity,0).length,0,'reduced motion skips effects');
  }},
  {name:'new-save reload and repeated legacy admission preserve every active board exactly',run:()=>{
    for(const version of [1,2,3,4,5,6,7,8,9,10] as const){const p={...fleet(28,13),version,layoutVersion:version,blocks:createMinerBlocks(28,version),ore:987,dropTickets:8};const target=p.blocks.find(b=>b.hp>1)!;target.hp=Math.max(1,Math.floor(target.hp/3));p.blocks[135].hp=0;const admitted=sanitizeCrystalMinersProgressByEvent({p}).p;assert(admitted,`layout ${version} admitted`);assertDeepEqual(admitted.blocks,p.blocks,'all damage and open chests exact');assertEqual(admitted.layoutVersion,version,'geometry retained');assertDeepEqual(sanitizeCrystalMinersProgressByEvent({p:admitted}).p,admitted,'reload stable');}
  }},
];
