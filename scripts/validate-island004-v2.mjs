import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const output=path.resolve(process.argv[2]||'');
if(!process.argv[2]||existsSync(output))throw Error('Supply a new validation evidence directory');
mkdirSync(output,{recursive:true});
const env={...process.env,PATH:`${path.dirname(process.execPath)}:${process.env.PATH}`};
const results=[];
for(const [id,args]of [
  ['types',['node_modules/typescript/bin/tsc','-b']],
  ['production-build',['node_modules/vite/bin/vite.js','build']],
  ['island-run-services',['scripts/run-island-run-service-tests.mjs']],
  ['island004-focused',['scripts/check-island004-v2.mjs']],
]) {
  const startedAt=new Date().toISOString();
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env});let log='';
    child.stdout.on('data',d=>{log+=d;});child.stderr.on('data',d=>{log+=d;});
    child.on('error',reject);child.on('close',code=>resolve({code,log}));
  });
  writeFileSync(path.join(output,`${id}.log`),result.log);
  const failures=result.log.split('\n').filter(line=>line.startsWith('FAIL '));
  results.push({id,code:result.code,startedAt,finishedAt:new Date().toISOString(),failures});
  console.log(JSON.stringify({id,code:result.code,failures,summary:result.log.split('\n').filter(l=>/tests complete:|focused checks:|built in|error TS/.test(l))}));
}
const boardPath='src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const testPath='src/features/gamification/level-worlds/services/__tests__/islandTechCollectionComponent.test.ts';
const baselineBoard=execFileSync('git',['show',`HEAD:${boardPath}`],{encoding:'utf8'});
const baselineTest=execFileSync('git',['show',`HEAD:${testPath}`],{encoding:'utf8'});
const legacyNeedle="getIslandTechnologyAccess(runtimeState, 'the-concord').active";
const preExisting={name:'islandTechCollectionComponent: board accepts the Assembly finale as Island 1 departure authority alongside legacy Concord completion',baselineHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineBoardHasExpectedLiteral:baselineBoard.includes(legacyNeedle),baselineTestRequiresLiteral:baselineTest.includes(legacyNeedle),boardModified:execFileSync('git',['diff','--name-only','HEAD','--',boardPath],{encoding:'utf8'}).trim().length>0};
const report={scope:'Local type/build/geometry/canonical service validation. No deployment or physical-device test.',results,preExisting};
writeFileSync(path.join(output,'validation.json'),JSON.stringify(report,null,2)+'\n');
const unexpected=results.some(r=>r.code!==0&&(r.id!=='island-run-services'||r.failures.length!==1||!r.failures[0].includes(preExisting.name)||preExisting.baselineBoardHasExpectedLiteral||!preExisting.baselineTestRequiresLiteral||preExisting.boardModified));
if(unexpected)process.exitCode=1;
