import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'docs/investigations/world-portal-entry-20260927';
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
import React, {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useVerifiedDeveloper} from './src/features/onboarding/useVerifiedDeveloper';
import {useWorldPortalEntry} from './src/features/onboarding/useWorldPortalEntry';
import {GameFirstShell} from './src/features/onboarding/GameFirstShell';
import {acceptWorldPortal} from './src/features/gamification/level-worlds/services/worldPortalActions';
import {getIslandRunStateSnapshot, resetIslandRunStateSnapshot, __resetIslandRunStateStoreForTests} from './src/features/gamification/level-worlds/services/islandRunStateStore';
import {readIslandRunGameStateRecord, writeIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests} from './src/features/gamification/level-worlds/services/islandRunGameStateStore';
import {WORLD_PORTAL_KEY} from './src/features/gamification/level-worlds/services/worldPortalProgress';
const root=createRoot(document.getElementById('root'));
const pendingAdmin=[],pendingSave=[];
const verify=owner=>new Promise((resolve,reject)=>pendingAdmin.push({owner,resolve,reject}));
let currentSession=null;
const client={from(){let owner;return {select(){return this},eq(key,value){owner=value;return this},maybeSingle(){return new Promise(resolve=>pendingSave.push({owner,resolve}))}}}};
window.resolveAdmin=(owner,value)=>{for(const q of pendingAdmin.splice(0)){if(q.owner===owner){value==='error'?q.reject(Error('offline')):q.resolve(value)}else pendingAdmin.push(q)}};
window.resolveSave=(owner,value)=>{for(const q of pendingSave.splice(0)){if(q.owner===owner)q.resolve(value==='error'?{data:null,error:{message:'offline'}}:{data:value,error:null});else pendingSave.push(q)}};
function Harness({session,online}) {
  const developer=useVerifiedDeveloper(session?.user.id??null,verify);
  const [route,setRoute]=useState('Today');
  const [account,setAccount]=useState(false);
  const [transfer,setTransfer]=useState(false);
  const [transferFailed,setTransferFailed]=useState(false);
  const entry=useWorldPortalEntry(session,online?client:null,developer,transfer,transferFailed);
  window.setTransfer=(pending,failed=false)=>{setTransfer(pending);setTransferFailed(failed)};
  window.setRoute=setRoute;
  window.entry={phase:entry.phase,showGameFirst:entry.showGameFirst,reason:entry.access.reason,verified:developer.verified,owner:developer.owner};
  const leave=()=>{if(entry.access.canLeaveGameForToday){setRoute('Today');entry.leaveGame()}};
  return <div data-owner={session?.user.id??''}>
    {entry.showGameFirst?<GameFirstShell phase={entry.phase} offline={entry.offline} developerError={developer.status==='error'} guestTransferPending={transfer}
      accountRequested={account} account={account?<p>Account privacy controls</p>:null}
      onAccount={()=>setAccount(true)} onCloseAccount={()=>setAccount(false)}
      onRetry={()=>{entry.retry();developer.retry()}} onRecover={()=>{window.recoverCalls=(window.recoverCalls??0)+1}}
      renderGame={help=><div data-game="true" style={{padding:24}}>
        <h1>Island Run</h1><button onClick={help}>Account &amp; help</button>
        <button onClick={async()=>{await acceptWorldPortal({session,client:null,expectedIsland:entry.journeyState.currentIslandNumber,expectedCycle:entry.journeyState.cycleIndex});window.claimFinished=true}}>Handover fixture</button>
        {entry.access.canLeaveGameForToday&&<button onClick={leave}>Open Today</button>}
      </div>}/>
      : session?<div data-full-app="true"><h1>{route}</h1></div>:<p>Signed out</p>}
  </div>;
}
window.showOwner=async(owner,island=1,owned=false,{online=false,seed=true}={})=>{
  currentSession=owner?{user:{id:owner,user_metadata:{is_admin:true,developer:true,early_access:true}}}:null;
  if(currentSession && seed) {
    const baseline=readIslandRunGameStateRecord(currentSession);
    const state={...baseline,runtimeVersion:baseline.runtimeVersion+1,currentIslandNumber:island,signatureMissionProgressByIsland:owned?{[WORLD_PORTAL_KEY]:{missionId:'world-portal',version:1,acceptedAtMs:100,updatedAtMs:100}}:{}};
    await writeIslandRunGameStateRecord({session:currentSession,client:null,record:state});
    resetIslandRunStateSnapshot(currentSession,state);
  }
  root.render(<StrictMode><Harness session={currentSession} online={online}/></StrictMode>);
};
window.pending=()=>({admin:pendingAdmin.map(q=>q.owner),save:pendingSave.map(q=>q.owner)});
window.reloadStore=()=>{__resetIslandRunStateStoreForTests();resetIslandRunRuntimeCommitCoordinatorForTests()};
const originalSet=Storage.prototype.setItem;
window.failStorage=fail=>{Storage.prototype.setItem=fail?()=>{throw Error('full')}:originalSet};
` },
  bundle: true, platform: 'browser', format: 'iife', write: false, outdir: '/tmp/world-portal-entry',
  define: { 'import.meta.env': '{}' },
});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;
const css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
const server=createServer((_request,response)=>{
  response.setHeader('Content-Type','text/html');
  response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui}'+css+'</style><div id="root"></div><script>'+js.replaceAll('</script>','<\\/script>')+'</script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const results=[];
try {
  await mkdir(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const show=async(owner,island=1,owned=false,options={})=>{
    await page.evaluate(args=>window.showOwner(...args),[owner,island,owned,options]);
    await page.waitForFunction(owner=>window.entry?.owner===owner,owner);
  };
  const admin=async(owner,value=false)=>{
    await page.waitForFunction(owner=>window.pending().admin.includes(owner),owner);
    await page.evaluate(([owner,value])=>window.resolveAdmin(owner,value),[owner,value]);
  };
  const game=()=>page.locator('[data-game]').waitFor();
  const full=()=>page.locator('[data-full-app]').waitFor();
  await show('ordinary',39);
  assert.equal(await page.locator('[data-full-app]').count(),0,'no Today before admin check');
  await admin('ordinary');await game();
  for(const route of ['Today','Habits','Goals','Journal','AI Coach','Timer']) {
    await page.evaluate(route=>window.setRoute(route),route);
    assert.equal(await page.locator('[data-full-app]').count(),0,'navigation cannot bypass gate: '+route);
  }
  assert.equal(await page.getByRole('button',{name:'Open Today'}).count(),0,'no exit');
  assert.equal(await page.evaluate(()=>window.entry.reason),'game-first','spoofed user metadata ignored');
  await page.getByRole('button',{name:'Account & help',exact:true}).click();
  await page.screenshot({path:output+'/phone-help.png'});
  for(const [name,href] of [['Privacy policy','/privacy'],['Support','/support'],['Terms','/terms']])
    assert.equal(await page.getByRole('link',{name,exact:true}).getAttribute('href'),href);
  const storageBefore=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.getByRole('button',{name:'Recover game',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.recoverCalls),1);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),storageBefore,'recovery does not erase saves');
  await page.getByRole('button',{name:'Account, privacy & accessibility settings'}).click();
  await page.getByText('Account privacy controls',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Back to game',exact:false}).click();await game();
  results.push('ordinary/legacy user gated; navigation containment; metadata ignored; essential links and non-destructive recovery');

  await show('developer',1);
  assert.equal(await page.locator('[data-full-app]').count(),0,'no stale bypass');
  await admin('developer',true);await full();
  // Immediately switch away: the old developer result must never grant access.
  await show('next-ordinary',2);
  assert.equal(await page.locator('[data-full-app]').count(),0,'developer bypass does not cross owners');
  await admin('next-ordinary');await game();
  await show('late-admin',1);await show('other-player',1);
  await admin('late-admin',true);
  assert.equal(await page.locator('[data-full-app]').count(),0,'late previous-account verification ignored');
  await admin('other-player');await game();
  results.push('verified developer bypass, account-switch and late-admin response isolation');

  await show('remote-old',1,false,{online:true,seed:false});
  await page.waitForFunction(()=>window.pending().save.includes('remote-old'));
  await show('remote-current',3);
  await admin('remote-current');await game();
  await page.evaluate(()=>window.resolveSave('remote-old',{runtime_version:100,current_island_number:40,
    signature_mission_progress_by_island:{'island-040-caretaker-world-portal-v1':{missionId:'world-portal',version:1,acceptedAtMs:100,updatedAtMs:100}}}));
  assert.equal(await page.locator('[data-full-app]').count(),0,'late remote ownership stays with its original owner');
  results.push('late prior-owner remote receipt cannot unlock current account');

  await show('council',40);await admin('council');await game();
  await page.evaluate(()=>window.failStorage(true));
  await page.getByRole('button',{name:'Handover fixture'}).click();
  await page.waitForFunction(()=>window.claimFinished);
  assert.equal(await page.getByRole('button',{name:'Open Today'}).count(),0,'optimistic failed save is not ownership');
  await page.evaluate(()=>{window.failStorage(false);window.claimFinished=false});
  await page.getByRole('button',{name:'Handover fixture'}).click();
  await page.getByRole('button',{name:'Open Today'}).waitFor();
  assert.equal(await page.locator('[data-full-app]').count(),0,'handover remains in game until explicit exit');
  await page.getByRole('button',{name:'Open Today'}).click();await full();
  assert.equal(await page.locator('[data-full-app] h1').innerText(),'Today');
  await page.reload();
  await show('council',40,false,{seed:false});await full();
  results.push('storage failure cannot unlock; successful handover retains ceremony; explicit exit to Today; reload starts outside game');

  await show('uncached',1,false,{online:true,seed:false});
  await admin('uncached');
  await page.waitForFunction(()=>window.pending().save.includes('uncached'));
  await page.evaluate(()=>window.resolveSave('uncached','error'));
  await page.getByRole('heading',{name:'We couldn’t load your journey'}).waitFor();
  assert.equal(await page.locator('[data-game]').count(),0,'no fresh playable state after failed remote fetch');
  await page.screenshot({path:output+'/phone-load-error.png'});
  await page.getByRole('button',{name:'Retry connection',exact:true}).click();
  await page.waitForFunction(()=>window.pending().save.includes('uncached'));
  await page.evaluate(()=>window.resolveSave('uncached',null));
  await admin('uncached');await game();
  results.push('uncached remote failure blocks fresh game; explicit retry/no-row opens new journey');

  await show('offline-existing',12,false,{online:true});
  await admin('offline-existing','error');
  await page.waitForFunction(()=>window.pending().save.includes('offline-existing'));
  await page.evaluate(()=>window.resolveSave('offline-existing','error'));await game();
  assert.equal(await page.locator('[data-full-app]').count(),0,'admin error fails closed');
  await page.getByRole('button',{name:'Account & help',exact:true}).click();
  await page.getByRole('button',{name:'Retry save / developer check'}).click();
  await admin('offline-existing',true);
  // Existing game stays mounted, but its explicit exit is now available.
  await page.getByRole('button',{name:'Back to game',exact:false}).click();
  await page.getByRole('button',{name:'Open Today'}).click();await full();
  results.push('offline saved play, failed developer verification, retry recovery');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await admin('offline-existing',false);await game();
  results.push('developer revocation on refresh returns to gated game');
  await page.evaluate(()=>window.setTransfer(true));
  await page.getByRole('heading',{name:'Securing your guest journey'}).waitFor();
  assert.equal(await page.locator('[data-game]').count(),0,'guest transfer blocks board mounting');
  await page.evaluate(()=>window.setTransfer(true,true));
  await page.waitForFunction(()=>window.entry.phase==='error');
  assert.equal(await page.locator('[data-game]').count(),0,'failed transfer remains recoverable, not a fresh run');
  await page.evaluate(()=>window.setTransfer(false));
  await page.waitForFunction(()=>window.pending().save.includes('offline-existing'));
  await page.evaluate(()=>window.resolveSave('offline-existing','error'));await game();
  results.push('pending and failed guest transfer cannot mount board; verified/resolved transfer resumes hydration');
  await show('never-resolves',1,false,{online:true,seed:false});
  await page.getByRole('heading',{name:'We couldn’t load your journey'}).waitFor({timeout:16000});
  assert.equal(await page.locator('[data-full-app]').count(),0,'timeouts never grant access');
  assert.equal(await page.locator('[data-game]').count(),0,'timeout cannot create fresh run');
  await page.getByRole('button',{name:'Account & help',exact:true}).click();
  await page.getByRole('button',{name:'Recover game',exact:true}).waitFor();
  results.push('bounded unresolved startup exposes help/retry without granting access or starting over');
  await show(null);await page.getByText('Signed out',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-full-app]').count(),0);
  assert.deepEqual(errors,[]);
  await page.close();
  for(const [name,width,height] of [['short-phone',360,640],['desktop',1280,900]]) {
    const check=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    await check.goto('http://127.0.0.1:'+server.address().port);
    await check.evaluate(()=>window.showOwner('layout',1));
    await check.waitForFunction(()=>window.pending().admin.includes('layout'));
    await check.evaluate(()=>window.resolveAdmin('layout',false));
    await check.getByRole('button',{name:'Account & help',exact:true}).click();
    assert(await check.getByRole('button',{name:'Recover game'}).isVisible());
    await check.screenshot({path:output+'/'+name+'-help.png'});await check.close();
  }
  await writeFile(output+'/browser-check.json',JSON.stringify({scope:'Actual entry/admin hooks, GameFirstShell and canonical local handover; synthetic accounts and controlled remote/admin responses, not authenticated full-App E2E',results,errors},null,2)+'\n');
  console.log('PASS portal entry browser:',results.join('; '));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
