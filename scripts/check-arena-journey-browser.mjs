import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='src/features/gamification/level-worlds/';
const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {ArenaJourneyControls} from './${base}components/ArenaJourneyControls';
import {IslandRunArenaChoice} from './${base}components/IslandRunArenaChoice';
import {useIslandRunState} from './${base}hooks/useIslandRunState';
import {readIslandRunGameStateRecord} from './${base}services/islandRunGameStateStore';
import {resetIslandRunStateSnapshot,getIslandRunStateSnapshot} from './${base}services/islandRunStateStore';
import {ARENA_JOURNEY_KEY,sanitizeArenaJourney,introducedArenaGames} from './${base}services/arenaJourney';
import {resolveArenaJourney} from './${base}services/arenaJourneyActions';
import {DEFAULT_ARENA_MINIGAME_PREFERENCES} from './${base}services/islandRunArenaPreferences';
const session={user:{id:'arena-browser-fixture',user_metadata:{}}};
const initial=readIslandRunGameStateRecord(session);
window.seed=(island,introduced=[],played=[])=>resetIslandRunStateSnapshot(session,{...initial,currentIslandNumber:island,
 signatureMissionProgressByIsland:{[ARENA_JOURNEY_KEY]:sanitizeArenaJourney({introduced:Object.fromEntries(introduced.map(id=>[id,1])),played:Object.fromEntries(played.map(id=>[id,2]))})}});
window.seed(2);
window.voteCount=()=>Object.keys(resolveArenaJourney(getIslandRunStateSnapshot(session)).comparisons).length;
function App(){const {state}=useIslandRunState(session,null);const [enabled,setEnabled]=useState([]);const [dev,setDev]=useState(false);window.dev=setDev;
 const ids=introducedArenaGames(state.currentIslandNumber,resolveArenaJourney(state));
 return <main><h1>Arena journey fixture</h1><p data-catalogue>{ids.join(',')}</p><button id="outside">Outside focus target</button>
 <ArenaJourneyControls session={session} client={null} verifiedDev={dev} enabledDemos={enabled} onToggleDemo={id=>setEnabled(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])} onLaunchDemo={id=>{window.preview=id}}/>
 <IslandRunArenaChoice allowedGameIds={ids} playerKey={session.user.id} islandNumber={state.currentIslandNumber} activeEventId="lucky_spin" activeEventRuntimeId="fixture"
 preferences={DEFAULT_ARENA_MINIGAME_PREFERENCES} tickets={3} activeEventName="Shared event channel" activeEventIcon="✦" rewardProgress={1} rewardThreshold={5} nextRewardIcon="✦" nextRewardLabel="Event progress" onLaunch={()=>{}} onTune={()=>{}}/>
 </main>}
createRoot(document.getElementById('root')).render(<App/>);
`},bundle:true,format:'esm',platform:'browser',write:false,outfile:'/virtual/bundle.js',define:{'import.meta.env':'{}'},loader:{'.webp':'dataurl','.png':'dataurl','.svg':'dataurl'}});
const server=createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost');
 if(['/bundle.js','/bundle.css'].includes(url.pathname)){response.setHeader('Content-Type',url.pathname.endsWith('js')?'text/javascript':'text/css');response.end(result.outputFiles.find(f=>f.path.endsWith(url.pathname))?.text??'');return}
 if(['/assets/event-games/crystal-miners/cover.svg','/assets/event-games/crystal-miners/icon.svg'].includes(url.pathname)){response.setHeader('Content-Type','image/svg+xml');response.end(readFileSync('public'+url.pathname));return}
 response.setHeader('Content-Type','text/html');response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*{box-sizing:border-box}body{margin:0;background:#091a29;color:#eaf9ff;font-family:system-ui}main{max-width:700px;margin:auto;padding:20px;min-height:1600px}button{font:inherit}h1{font-size:20px}</style></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const evidence=path.resolve('docs/investigations/event-readiness-20260926/journey');mkdirSync(evidence,{recursive:true});
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByRole('button',{name:'Meet Signal Path'}).click();
 await page.getByRole('dialog').waitFor();
 await page.screenshot({path:path.join(evidence,'introduction-390.png')});
 await page.getByRole('button',{name:'Add Signal Path to my catalogue'}).click();
 await page.waitForFunction(()=>document.querySelector('[data-catalogue]').textContent==='signal_path');
 assert.equal(await page.locator('.arena-choice__card').count(),1,'one introduced game is one card');
 assert.equal(await page.getByRole('button',{name:'Compare played games'}).count(),0,'no unplayed comparison');
 await page.evaluate(()=>window.seed(3,['signal_path','crystal_miners'],['signal_path']));
 assert.equal(await page.getByRole('button',{name:'Compare played games'}).count(),0,'one played is not enough');
 await page.evaluate(()=>window.seed(3,['signal_path','crystal_miners'],['signal_path','crystal_miners']));
 const boxes=[];
 for(const width of [360,390,1280]){
  await page.setViewportSize({width,height:844});
  await page.getByRole('button',{name:'Compare played games'}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  const halves=await page.locator('.arena-journey-half').all();const a=await halves[0].boundingBox(),b=await halves[1].boundingBox();
  assert(Math.abs(a.width-b.width)<1,'equal halves');assert.equal(a.y,b.y,'side by side even on phone');
  const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=845,'inside viewport');boxes.push({width,dialog:box,halves:[a,b]});
  const locked=await page.evaluate(()=>getComputedStyle(document.body).overflow==='hidden'||getComputedStyle(document.documentElement).overflow==='hidden'||getComputedStyle(document.body).position==='fixed');
  assert(locked,'background scroll locked');
  await page.getByRole('button',{name:'Skip for now'}).focus();await page.keyboard.press('Tab');
  assert(await page.locator('.arena-journey-dialog').evaluate(el=>el.contains(document.activeElement)),'focus trapped');
  await page.screenshot({path:path.join(evidence,'evaluator-'+width+'.png')});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
 }
 await page.getByRole('button',{name:'Compare played games'}).click();
 await page.evaluate(()=>window.seed(2,['signal_path','crystal_miners'],['signal_path','crystal_miners']));
 await page.getByRole('dialog').waitFor({state:'detached'});
 assert.equal(await page.getByRole('button',{name:'Compare played games'}).count(),0,'stale comparison disappears');
 await page.evaluate(()=>window.seed(3,['signal_path','crystal_miners'],['signal_path','crystal_miners']));
 await page.getByRole('button',{name:'Compare played games'}).click();
 await page.getByRole('button',{name:'Prefer Signal Path'}).click();
 await page.getByRole('dialog').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>window.voteCount()),1,'UI vote persisted through canonical action');
 await page.evaluate(()=>window.seed(2,['signal_path'],['signal_path']));
 await page.evaluate(()=>window.dev(true));await page.getByText('Developer lab · previews off by default').click();
 const check=page.getByLabel('Twin Sigils · Demo');assert.equal(await check.isChecked(),false,'default off');await check.check();
 assert.equal(await page.locator('[data-catalogue]').textContent(),'signal_path','lab never expands introduced catalogue');
 await page.evaluate(()=>window.seed(1,['signal_path','crystal_miners'],['signal_path','crystal_miners']));
 await page.waitForFunction(()=>!document.querySelector('.arena-journey-controls'));
 assert.equal(await page.locator('.arena-choice__card').count(),0,'island1 empty including dev');
 assert.deepEqual(errors,[],'no runtime errors');
 writeFileSync(path.join(evidence,'browser-check.json'),JSON.stringify({status:'pass',boxes,errors,scope:'Actual controls, chooser and canonical store with synthetic owner; no authenticated full-board or live database test.'},null,2)+'\n');
 console.log('PASS Arena browser: introduction, one-card launch, two-play gate, equal phone/desktop halves, viewport, scroll/focus, stale travel, dev isolation');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
