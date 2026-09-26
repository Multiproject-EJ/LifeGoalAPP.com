import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'docs/investigations/world-portal-20260926';
const bundle = await build({
  stdin: { contents: `
    import React, { StrictMode, useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { WorldPortalCouncilControl } from './src/features/gamification/level-worlds/components/WorldPortalCouncil';
    import { readIslandRunGameStateRecord, writeIslandRunGameStateRecord } from './src/features/gamification/level-worlds/services/islandRunGameStateStore';
    import { resetIslandRunStateSnapshot, getIslandRunStateSnapshot } from './src/features/gamification/level-worlds/services/islandRunStateStore';
    import { resolveWorldPortalProgress } from './src/features/gamification/level-worlds/services/worldPortalProgress';
    const root = createRoot(document.getElementById('root'));
    let session = {user:{id:'browser-council-owner',user_metadata:{}}};
    function Fixture({owner}) {
      const [open,setOpen]=useState(false);
      return <><button id="launch" onClick={()=>setOpen(true)}>Open council</button>
        <p>Background game content</p>
        {open && <WorldPortalCouncilControl key={owner.user.id} session={owner} client={null}
          onClose={()=>setOpen(false)} onOpenApp={()=>{window.openedApp=true;setOpen(false)}}/>}</>;
    }
    window.showCouncil = async (island=40,cycle=0,id='browser-council-owner',fresh=true) => {
      session={user:{id,user_metadata:{}}};
      const state={...readIslandRunGameStateRecord(session),currentIslandNumber:island,cycleIndex:cycle};
      if(fresh) state.signatureMissionProgressByIsland={};
      await writeIslandRunGameStateRecord({session,client:null,record:state});
      resetIslandRunStateSnapshot(session,state);
      root.render(<StrictMode><Fixture key={id} owner={session}/></StrictMode>);
    };
    window.portalReceipt = () => resolveWorldPortalProgress(getIslandRunStateSnapshot(session).signatureMissionProgressByIsland);
    const originalSet=Storage.prototype.setItem;
    window.failStorage = (fail) => {Storage.prototype.setItem=fail?()=>{throw Error('Storage full')}:originalSet;};
  `, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, format: 'iife', platform: 'browser', write: false, outdir: '/tmp/world-portal-check',
  define: { 'import.meta.env': '{}' },
});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).text;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).text;
const publicRoot = path.resolve('public');
const server = createServer(async (request, response) => {
  const urlPath = new URL(request.url, 'http://localhost').pathname;
  if (urlPath.startsWith('/assets/')) {
    const asset = path.resolve(publicRoot, '.' + urlPath);
    if (!asset.startsWith(publicRoot + path.sep)) { response.writeHead(403).end(); return; }
    try { response.setHeader('Content-Type', 'image/webp'); response.end(await readFile(asset)); }
    catch { response.writeHead(404).end(); }
    return;
  }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:200vh;background:#080f1e;color:white;font-family:system-ui}'+css+'</style></head><body><div id="root"></div><script>'+js.replaceAll('</script>', '<\\/script>')+'</script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const results = [];
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const url = 'http://127.0.0.1:' + server.address().port;
  for (const [name, width, height, reducedMotion] of [
    ['phone',390,844,'no-preference'], ['short-phone',360,640,'no-preference'],
    ['desktop',1280,900,'no-preference'], ['reduced-motion',430,932,'reduce'],
  ]) {
    const page = await browser.newPage({ viewport:{width,height}, reducedMotion });
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url);
    await page.evaluate(()=>window.showCouncil());
    await page.getByRole('button',{name:'Open council',exact:true}).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(await dialog.evaluate(node=>node.parentElement.parentElement===document.body),true,'top-level portal');
    const box=await dialog.boundingBox();
    assert(box.x>=0 && box.y>=0 && box.x+box.width<=width+1 && box.y+box.height<=height+1,'dialog in viewport');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow==='hidden'||document.body.style.overflow==='hidden'),true,'background locked');
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.world-portal-speakers img')).every(img=>img.complete && img.naturalWidth>0));
    await page.screenshot({path:output+'/'+name+'.png'});
    await page.getByRole('button',{name:'Return to game',exact:true}).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Hear the council','focus wraps');
    await page.getByRole('button',{name:'Hear the council',exact:true}).click();
    if (name === 'phone') await page.screenshot({path:output+'/phone-handover.png'});
    assert.equal(await page.evaluate(()=>window.portalReceipt()),null,'reading story does not claim');
    await page.getByRole('button',{name:'Accept the portal',exact:true}).click();
    await page.getByRole('heading',{name:'Two worlds. One journey.'}).waitFor();
    if (name === 'phone') await page.screenshot({path:output+'/phone-owned.png'});
    const first=await page.evaluate(()=>window.portalReceipt());
    assert(first,'canonical action produced receipt');
    await page.getByRole('button',{name:'Keep exploring',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.activeElement.id),'launch','focus restored');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow==='hidden'||document.body.style.overflow==='hidden'),false,'scroll unlocked');
    await page.reload();
    await page.evaluate(()=>window.showCouncil(1,1,'browser-council-owner',false));
    await page.getByRole('button',{name:'Open council',exact:true}).click();
    await page.getByRole('button',{name:'Hear the council',exact:true}).click();
    await page.getByRole('heading',{name:'Two worlds. One journey.'}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.portalReceipt()),first,'replay after cycle+reload unchanged');
    await page.getByRole('button',{name:'Return to app',exact:false}).click();
    assert.equal(await page.evaluate(()=>window.openedApp),true,'exit callback reached only after story');
    assert.deepEqual(errors,[]);
    results.push({name,width,height,reducedMotion,errors});
    await page.close();
  }
  const page=await browser.newPage(); await page.goto(url);
  await page.evaluate(()=>window.showCouncil(39));
  await page.getByRole('button',{name:'Open council',exact:true}).click();
  assert.equal(await page.getByRole('dialog').count(),0,'pre-040 invisible');
  await page.evaluate(()=>window.showCouncil(40));
  await page.getByRole('button',{name:'Open council',exact:true}).click();
  await page.getByRole('button',{name:'Hear the council',exact:true}).click();
  await page.evaluate(()=>window.failStorage(true));
  await page.getByRole('button',{name:'Accept the portal',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(),/could not save/);
  await page.getByRole('button',{name:'Return to game',exact:true}).click();
  await page.getByRole('button',{name:'Open council',exact:true}).click();
  await page.getByRole('button',{name:'Hear the council',exact:true}).click();
  await page.evaluate(()=>window.failStorage(false));
  await page.getByRole('button',{name:'Accept the portal',exact:true}).click();
  await page.getByRole('heading',{name:'Two worlds. One journey.'}).waitFor();
  await page.evaluate(()=>window.showCouncil(1,0,'other-owner'));
  assert.equal(await page.getByRole('dialog').count(),0,'owner switch closes old ceremony');
  assert.equal(await page.evaluate(()=>window.portalReceipt()),null,'no ownership leak');
  await page.close();
  await writeFile(output+'/browser-check.json',JSON.stringify({scope:'Actual React council/control and canonical local action under StrictMode; synthetic accounts, no remote client, not full-board E2E',results,extraChecks:['pre-040','storage failure/reopen/retry','owner switch']},null,2)+'\n');
  console.log('PASS portal browser: responsive, images, focus, scroll, handover, reload/replay, storage retry, owner isolation');
} finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
