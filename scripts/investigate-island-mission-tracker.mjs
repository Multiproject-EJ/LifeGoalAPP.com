// Read-only reproduction of mission phone build/activity coupling.
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { resolveIslandMissionTrackerPresentation: resolve } = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/islandRunMissionTracker.ts');
  const rows = [];
  for (const islandNumber of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20]) {
    for (const activity of ['unfinished','done-egg-ready','done-egg-collected']) {
      const state = { currentIslandNumber:islandNumber, cycleIndex:0, bossTrialResolvedIslandNumber:null,
        perIslandEggs:{[String(islandNumber)]:{tier:'common',setAtMs:1,hatchAtMs:2,status:activity==='done-egg-collected'?'collected':'ready'}},
        signatureMissionProgressByIsland:{},
        stopStatesByIndex:Array.from({length:5},()=>({objectiveComplete:activity!=='unfinished',buildComplete:true})),
        stopBuildStateByIndex:Array.from({length:5},()=>({requiredEssence:100,spentEssence:100,buildLevel:3})) };
      const result=resolve({islandNumber,state});
      rows.push({islandNumber,activity,actualLevel3Buildings:islandNumber===1?4:5,objectives:result.objectives,overallProgressPercent:result.overallProgressPercent,complete:result.complete});
    }
  }
  const output={at:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Synthetic canonical state fixtures; no private account data, persistence writes or gameplay actions.',rows};
  writeFileSync('docs/gauntlets/island-003-v2/qa/mission-phone-reproduction-v001.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(rows.filter(r=>r.activity==='unfinished').map(r=>({island:r.islandNumber,L3:r.actualLevel3Buildings,rows:r.objectives.map(o=>`${o.label}: ${o.displayValue??`${o.value}/${o.target}`}`)})),null,2));
}finally{await server.close()}
