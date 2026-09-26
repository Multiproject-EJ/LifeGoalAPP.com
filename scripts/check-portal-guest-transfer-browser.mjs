import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
// Execute the actual App effect, not a rewritten version of its coordination.
const source=await readFile('src/App.tsx','utf8');
const ast=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const app=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='App');
const effect=app.body.statements.find(n=>ts.isExpressionStatement(n)&&n.getText(ast).startsWith('useEffect(')
  &&n.getText(ast).includes('void claimLocalIslandRunGuestProgress(')).getText(ast);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React,{StrictMode,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
const root=createRoot(document.getElementById('root')),client={};
let funnel={claimStatus:'claim_pending',claimSource:'exit'},run=0;
const pending=[],events=[];
const readIslandRunGuestFunnelState=()=>funnel;
const claimLocalIslandRunGuestProgress=({session})=>new Promise((resolve,reject)=>pending.push({owner:session.user.id,resolve,reject}));
function Fixture({supabaseSession}) {
  const [guestClaimAttempt,setGuestClaimAttempt]=useState(0);
  const [settled,setGuestClaimSettledOwner]=useState(null),[failed,setGuestClaimFailedOwner]=useState(null);
  const guestClaimInFlightUserIdRef=useRef(null),guestClaimRequestRef=useRef(0),guestClaimOwnerRef=useRef(null);
  guestClaimOwnerRef.current=supabaseSession?.user.id??null;
  const record=(kind,value)=>events.push({owner:supabaseSession?.user.id,kind,value:typeof value==='function'?'updater':value});
  const setAuthError=value=>record('error',value),setAuthMessage=value=>record('message',value);
  const setShowAuthPanel=value=>record('auth',value),setLevelWorldsEntryPanel=value=>record('panel',value);
  const setShowLevelWorldsFromEntry=value=>record('game',value);
  ${effect}
  return <output id="claim-state" data-owner={supabaseSession?.user.id??''} data-settled={settled??''} data-failed={failed??''}/>;
}
window.showClaimOwner=(id,fresh=false)=>{
  if(fresh){run++;funnel={claimStatus:'claim_pending',claimSource:'exit'};events.length=0}
  root.render(<StrictMode><Fixture key={run} supabaseSession={id?{user:{id}}:null}/></StrictMode>);
};
window.claimPending=()=>pending.map(p=>p.owner);
window.claimEvents=()=>events;
window.finishClaim=(owner,result)=>{
  const index=pending.findIndex(p=>p.owner===owner),request=pending.splice(index,1)[0];
  if(!request)throw Error('No pending request');
  funnel={...funnel,claimStatus:result==='error'?'claim_failed':result==='conflict'?'claim_failed':'claimed'};
  result==='error'?request.reject(Error('offline')):request.resolve({status:result,registryBonusUsct:100});
};
`},bundle:true,write:false,platform:'browser',format:'iife'});
const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<div id="root"></div><script>'+bundle.outputFiles[0].text.replaceAll('</script>','<\\/script>')+'</script>')});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const show=async(id,fresh=false)=>{
    await page.evaluate(([id,fresh])=>window.showClaimOwner(id,fresh),[id,fresh]);
    await page.waitForFunction(id=>document.querySelector('#claim-state')?.dataset.owner===id,id??'');
  };
  const pending=owner=>page.waitForFunction(owner=>window.claimPending().includes(owner),owner);
  await show('a',true);await pending('a');
  assert.deepEqual(await page.evaluate(()=>window.claimPending()),['a'],'StrictMode starts one claim');
  await show('b');
  assert.deepEqual(await page.evaluate(()=>window.claimPending()),['a'],'account switch cannot import concurrently');
  await page.evaluate(()=>window.finishClaim('a','claimed'));
  await page.waitForFunction(()=>window.claimPending().length===0);
  assert.deepEqual(await page.evaluate(()=>window.claimEvents()),[],'old success cannot change new account UI');
  await show('c',true);await pending('c');await show('d');
  await page.evaluate(()=>window.finishClaim('c','error'));
  await pending('d');
  assert.deepEqual(await page.evaluate(()=>window.claimEvents()),[],'old failure cannot change new account UI');
  await page.evaluate(()=>window.finishClaim('d','claimed'));
  await page.waitForFunction(()=>document.querySelector('#claim-state').dataset.settled==='d');
  assert((await page.evaluate(()=>window.claimEvents())).every(event=>event.owner==='d'),'only current owner receives result');
  await show('retry',true);await pending('retry');
  await page.evaluate(()=>window.finishClaim('retry','error'));
  await page.waitForFunction(()=>document.querySelector('#claim-state').dataset.failed==='retry');
  assert.equal(await page.locator('#claim-state').getAttribute('data-settled'),'','failed transfer stays blocked');
  await show('conflict',true);await pending('conflict');
  await page.evaluate(()=>window.finishClaim('conflict','conflict'));
  await page.waitForFunction(()=>document.querySelector('#claim-state').dataset.settled==='conflict');
  assert((await page.evaluate(()=>window.claimEvents())).some(event=>event.kind==='error'),'existing-save conflict remains visible');
  assert.deepEqual(errors,[]);
  console.log('PASS actual App guest-transfer effect: StrictMode single claim, serial account switches, stale response isolation, failure barrier and safe existing-save conflict.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
