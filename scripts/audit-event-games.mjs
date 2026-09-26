import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const names=[
  'islandRunFeatureAccess','arenaPuzzleGames','islandWorkshopGame','fortuneEngineGame','fortuneEngineProgression',
  'fortuneEngineStateActions','companionFeastGame','companionFeastProgression',
  'spaceExcavatorDepths','spaceExcavatorClues','spaceExcavatorObjects','spaceExcavatorRewardUx',
  'skyboundPilotAcademy','momentumMatrixGame','momentumMatrixStateActions',
  'crystalMiners','crystalMinersProgression','journeyDiscArenaGame',
  'journeyDiscArenaStateActions','journeyDiscArenaProgression',
];
const source=names.map((name,i)=>`import { ${name}Tests as suite${i} } from './src/features/gamification/level-worlds/services/__tests__/${name}.test';`).join('\n')+`
  import {CONCORD_PUZZLES,LEXICON_PUZZLES,SIGNAL_PATH_PUZZLES,TWIN_SIGIL_PUZZLES} from './src/features/gamification/level-worlds/services/arenaPuzzleGames';
  import {mkdirSync,writeFileSync} from 'node:fs';
  (async()=>{
    const report={suites:[],puzzles:{concord:CONCORD_PUZZLES.length,lexicon:LEXICON_PUZZLES.length,signalPath:SIGNAL_PATH_PUZZLES.length,twinSigils:TWIN_SIGIL_PUZZLES.length},scope:'Local model/action tests only. Passing does not certify full playability, mobile UX, or live settlement.'};
    const suites=[${names.map((name,i)=>`{name:'${name}',tests:suite${i}}`).join(',')}];
    for(const suite of suites){
      const failures=[];
      for(const test of suite.tests){try{await test.run()}catch(error){failures.push({name:test.name,message:String(error)})}}
      report.suites.push({name:suite.name,total:suite.tests.length,passed:suite.tests.length-failures.length,failures});
    }
    mkdirSync('docs/investigations/event-readiness-20260926',{recursive:true});
    writeFileSync('docs/investigations/event-readiness-20260926/model-audit.json',JSON.stringify(report,null,2)+'\\n');
    console.log(JSON.stringify(report,null,2));
    if(report.suites.some(suite=>suite.failures.length))process.exitCode=1;
  })().catch(error=>{console.error(error);process.exitCode=1});
`;
const result=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',write:false,define:{'import.meta.env':'{}'}});
const run=spawnSync(process.execPath,['--input-type=commonjs'],{input:result.outputFiles[0].text,encoding:'utf8'});
process.stdout.write(run.stdout??'');process.stderr.write(run.stderr??'');if(run.error)throw run.error;process.exitCode=run.status??1;
