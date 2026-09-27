import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const component = 'src/features/gamification/level-worlds/components/';
const baselineCss = execFileSync('git',['show','52f1610f:'+component+'IslandRunThemedTopbar.css'],{encoding:'utf8'});
const baselineGlass = execFileSync('git',['show','52f1610f:'+component+'IslandHudGlass.tsx'],{encoding:'utf8'});
const buildFixture = async before => build({
  stdin:{contents:`
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {IslandHudGlass} from './${component}IslandHudGlass';
    import {LivingController} from './${component}living-controller/LivingController';
    import SignalPath from './src/features/gamification/games/arena-puzzles/signal-path/SignalPathMinigame';
    import Categories from './src/features/gamification/games/arena-puzzles/concord-categories/ConcordCategoriesMinigame';
    import Lexicon from './src/features/gamification/games/arena-puzzles/lexicon-relay/LexiconRelayMinigame';
    import Sigils from './src/features/gamification/games/arena-puzzles/twin-sigils/TwinSigilsMinigame';
    const noop=()=>{};
    const query=new URLSearchParams(location.search);
    const games={signal_path:SignalPath,concord_categories:Categories,lexicon_relay:Lexicon,twin_sigils:Sigils};
    const Game=games[query.get('game')];
    createRoot(document.getElementById('root')).render(Game?
      <Game islandNumber={2} launchConfig={{openingCeremony:query.get('game')==='signal_path',arenaSessionSeconds:null}} onComplete={result=>{window.gameResult=result}}/>:
      <main className="island-run-prototype">
        <div className="island-run-board__topbar island-run-themed-topbar" data-controller-theme="light">
          <IslandHudGlass/>
          <button className="island-run-board__topbar-avatar" aria-label="Player">EJ</button>
          <button className="island-run-board__topbar-wallet"><span>✦</span><strong>12,450</strong></button>
          <button className="island-run-board__topbar-chip"><span>💎</span><strong>248</strong></button>
          <button className="island-run-board__topbar-audio-toggle" aria-label="Sound">♫</button>
          <button className="island-run-board__topbar-menu" aria-label="Menu">☰</button>
        </div>
        <div className="island-run-board__rewardbar-cluster">✦ &nbsp; EVENT JOURNEY &nbsp; ━━━━━━━</div>
        <div className="controller-preview">
          <LivingController dark={false} dev={false} dice={120} multiplier={1} maximum={20} cost={1}
            rolling={false} autoRolling={false} jackpot={false} buildReady={false} tutorial={false}
            blocked={false} rollDisabled={false} multiplierDisabled={false} canHold={true}
            rollTitle="ROLL" regenLabel="Island resources" concordLabel="Story"
            onRoll={noop} onHoldStart={noop} onHoldEnd={noop} onStopAuto={noop}
            onMultiplier={noop} onShop={noop} onBuild={noop} onCreatures={noop} onConcord={noop}
            fallback={<p data-failed>WebGL unavailable</p>}/>
        </div>
      </main>);
  `,resolveDir:root,loader:'tsx'},
  bundle:true,format:'esm',platform:'browser',write:false,outfile:'/virtual/bundle.js',
  define:{'import.meta.env':'{}'},loader:{'.webp':'dataurl','.png':'dataurl','.svg':'dataurl','.mp3':'dataurl'},
  plugins:before?[{name:'baseline',setup(build){
    build.onLoad({filter:/IslandHudGlass\.tsx$/},()=>({contents:baselineGlass,loader:'tsx',resolveDir:path.join(root,component)}));
    build.onLoad({filter:/living-controller\/renderer\.js$/},()=>({contents:execFileSync('git',['show','52f1610f:'+component+'living-controller/renderer.js'],{encoding:'utf8'}),loader:'js',resolveDir:path.join(root,component,'living-controller')}));
  }}]:[],
});
const bundles={before:await buildFixture(true),after:await buildFixture(false)};
const css=readFileSync(component+'IslandRunThemedTopbar.css','utf8');
const fixtureCss=`
 *{box-sizing:border-box}body{margin:0;background:#061626;color:#ecfaff;font-family:system-ui}
 .island-run-prototype{position:relative;max-width:620px;height:750px;margin:30px auto;background:radial-gradient(ellipse at 50% 48%,#235367,#092537 65%,#061626)}
 .island-run-board__topbar{position:absolute;left:14px;right:14px;align-items:center}
 .island-run-board__topbar button{display:flex;align-items:center;justify-content:center;cursor:pointer}
 .island-run-board__topbar-avatar,.island-run-board__topbar-menu,.island-run-board__topbar-audio-toggle{border-radius:50%}
 .island-run-board__rewardbar-cluster{position:absolute;left:12%;right:12%;text-align:center;font-size:10px;padding:8px;border-radius:30px;background:#06213ac9;border:1px solid #6ed4ef55}
 .controller-preview{position:absolute;top:195px;left:0;right:0}
 `;
const server=createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/controller-shell.glb'){
    response.setHeader('Content-Type','model/gltf-binary');
    response.end(readFileSync(component+'living-controller/controller-shell.glb'));return;
  }
  const variant=url.searchParams.get('variant')==='before'?'before':'after';
  if(url.pathname==='/bundle.js'||url.pathname==='/bundle.css'){
    const output=bundles[variant].outputFiles.find(file=>file.path.endsWith(url.pathname));
    response.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'text/css');
    response.end(output?.text??'');return;
  }
  response.setHeader('Content-Type','text/html');
  response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/bundle.css?variant='+variant+'"><style>'+fixtureCss+(variant==='before'?baselineCss:css)+'</style></head><body><div id="root"></div><script type="module" src="/bundle.js?variant='+variant+'"></script></body></html>');
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
let browser;
const evidence=path.resolve('docs/investigations/event-readiness-20260926');
mkdirSync(evidence,{recursive:true});
try{
  browser=await chromium.launch({headless:true,channel:process.env.JOURNEY_BROWSER_CHANNEL||'chrome'});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const url='http://127.0.0.1:'+server.address().port;
  const measurements=[];
  for(const width of [360,390,1280]){
    await page.setViewportSize({width,height:844});
    for(const variant of ['before','after']){
      await page.goto(url+'/?variant='+variant);
      await page.waitForSelector('.living-controller.is-ready',{timeout:30000});
      await page.waitForTimeout(4000);
      const box=await page.locator('.island-run-themed-topbar').boundingBox();
      measurements.push({viewportWidth:width,variant,...box});
      const buttons=await page.locator('.island-run-board__topbar-menu').boundingBox();
      assert(buttons.height>=44,'Menu retains minimum 44px hit height');
      await page.screenshot({path:path.join(evidence,'hud-'+width+'-'+variant+'.png')});
      await page.locator('.island-run-board__topbar').screenshot({path:path.join(evidence,'topbar-'+width+'-'+variant+'.png')});
    }
    const [before,after]=measurements.slice(-2);
    assert.equal(before.width,after.width,'Do not narrow top bar');
    assert(Math.abs(after.height/before.height-.85)<.01,'Height reduced by 15%');
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(url+'/?variant=after');
  const animation=await page.locator('.island-hud-glass__energy').evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(animation,'none','Reduced motion disables sparkle animation');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});
  for(const game of ['signal_path','concord_categories','lexicon_relay','twin_sigils']){
    await page.goto(url+'/?game='+game);
    await page.waitForTimeout(600);
    await page.screenshot({path:path.join(evidence,game+'-briefing.png')});
  }
  assert.deepEqual(errors,[],'No runtime errors in fixture');
  writeFileSync(path.join(evidence,'hud-measurements.json'),JSON.stringify({measurements,errors,scope:'Actual HUD glass and controller components in isolated presentation fixture; puzzle briefing screenshots are not full playtests.'},null,2)+'\n');
  console.log('HUD browser checks passed: unchanged widths; 15% height reduction; 44px menu target; reduced motion; actual controller rendered. Evidence: '+evidence);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
