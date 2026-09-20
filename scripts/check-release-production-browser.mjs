import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

// Isolated browser only: never authenticates or mutates a real account.
const origin = process.env.RELEASE_SMOKE_ORIGIN || 'http://127.0.0.1:4186';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Loopback only');
const out = process.argv[2];
assert(out, 'Supply a new evidence directory');
mkdirSync(out, {recursive:true});
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({headless:true, executablePath:'/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce',isMobile:true,hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'});
const page = await context.newPage();
const report = {status:'running',scope:'production bundle, disposable guest and offline local palace fixture; not physical-device acceptance',errors:[],cases:[]};
page.on('pageerror',error=>report.errors.push(error.message));
page.setDefaultTimeout(60000);
async function enterGuest() {
  await page.getByRole('button',{name:/Play as guest/}).click();
  await page.locator('.guest-free-play-modal__actions .auth-card__primary').click();
  await page.locator('.guest-free-play-modal__actions .auth-card__primary').filter({hasText:'Begin my voyage'}).click();
}
try {
  await page.goto(origin+'/app', {waitUntil:'domcontentloaded',timeout:90000});
  await enterGuest();
  console.log('Guest voyage started');
  await page.locator('canvas[aria-label^="Interactive 3D"]').first().waitFor({state:'visible'});
  await page.screenshot({path:out+'/guest-island-001.png'});
  report.cases.push('Fresh guest entry mounts the actual 3D Island001');
  // Stop all external traffic before editing this disposable guest fixture.
  await context.route('**/*',route=>{
    const url = new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(url.hostname) || ['data:','blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  await page.evaluate(()=>{
    const key='island_run_runtime_state_demo-user-0001';
    const state=JSON.parse(localStorage.getItem(key));
    if (!state) throw Error('Expected disposable demo record');
    if (JSON.stringify(state.signatureMissionProgressByIsland).includes('opening-games-v1')) throw Error('Unexpected new campaign enrollment');
    Object.assign(state,{currentIslandNumber:4,cycleIndex:0,essence:1000,dicePool:100,
      firstRunClaimed:true,firstSessionTutorialState:'complete',onboardingDisplayNameLoopCompleted:true,
      welcomePackClaimed:true,welcomePackRewardBundleClaimed:true,storyPrologueSeen:true,
      audioEnabled:false,musicEnabled:false,sfxEnabled:false,activeStopIndex:0,activeStopType:'hatchery',
      stopStatesByIndex:Array.from({length:5},()=>({objectiveComplete:false,buildComplete:true})),
      stopBuildStateByIndex:Array.from({length:5},()=>({buildLevel:3,requiredEssence:100,spentEssence:100})),
      signatureMissionProgressByIsland:{}});
    localStorage.setItem(key,JSON.stringify(state));
    localStorage.setItem('island_run_landmark_coachmark_seen_demo-user-0001','1');
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await enterGuest();
  const canvas=page.locator('canvas[aria-label^="Interactive 3D"]').first();
  await canvas.waitFor({state:'visible'});
  await page.waitForTimeout(2500);
  await page.screenshot({path:out+'/production-palace-004.png'});
  report.canvas=await canvas.evaluate(el=>({...el.dataset}));
  report.text=(await page.locator('body').innerText()).slice(-9000);
  report.cases.push('Unmarked saves are not enrolled; production Island004 L3 renders without development flags');
  assert.equal(report.errors.length,0,'No uncaught browser errors');
  report.status='pass';
} catch(error) {
  report.status='fail';report.failure=String(error);
  await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
  report.text=(await page.locator('body').innerText()).slice(-9000);
  process.exitCode=1;
} finally {
  writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  await browser.close();
}
