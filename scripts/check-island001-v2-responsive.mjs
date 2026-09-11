import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const prefix = process.argv[2];
if (!/^[a-z0-9-]+$/.test(prefix ?? '')) throw Error('Provide immutable evidence prefix');
const output = `docs/gauntlets/island-001-v2/qa/reviews/${prefix}-responsive.json`;
if (existsSync(output)) throw Error('Evidence already exists');
const browser = await chromium.launch({ headless: true, executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const result = { scope: 'Actual game renderer in desktop Chromium at short and wide phone viewports, plus comparison viewer. Not physical-device verification.', checks: [], errors: [] };
try {
 const manifest = JSON.parse(readFileSync('src/features/gamification/level-worlds/dev/Island1V2AssetManifest.json', 'utf8'));
 const page = await browser.newPage({viewport:{width:375,height:667},deviceScaleFactor:1});
 page.on('pageerror', e => result.errors.push(e.stack));
 const selector='canvas[aria-label="Interactive 3D Assembly Crater island"]';
 await page.goto('http://127.0.0.1:53282/dev/island-template-kit?island=1&mode=3d&level=3&assemblyCharges=10',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator(`${selector}[data-assembly-construction-phase="complete"]`).waitFor({timeout:60000});
 for(const [id,asset] of Object.entries(manifest.models)) {
  const response = await page.request.get(`http://127.0.0.1:53282${asset.url}?v=${asset.sha256.slice(0,12)}`);
  assert.equal(response.status(),200);
  const bytes=await response.body();
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  result.checks.push(`${id}-public-url-hash-and-bytes`);
 }
 for(const [width,height] of [[375,667],[430,932]]) {
  await page.setViewportSize({width,height});
  await page.getByRole('button',{name:'Overview',exact:true}).click();
  await page.waitForTimeout(1800);
  await page.locator(selector).screenshot({path:`docs/gauntlets/island-001-v2/qa/raw/${prefix}-${width}x${height}-overview.png`});
  await page.getByLabel('Focus a landmark').selectOption('boss');
  await page.waitForTimeout(1800);
  await page.locator(selector).screenshot({path:`docs/gauntlets/island-001-v2/qa/raw/${prefix}-${width}x${height}-hall.png`});
  result.checks.push(`${width}x${height}-overview-and-hall`);
 }
 await page.setViewportSize({width:1440,height:1080});
 await page.goto('http://127.0.0.1:53282/docs/gauntlets/island-001-v2/qa/comparisons/island001-v2-before-after.html',{waitUntil:'load'});
 for(const button of await page.locator('nav button').all()) {
  await button.click();
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  result.checks.push(`comparison-${await button.innerText()}`);
 }
 await page.locator('nav button').first().click();
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 await page.locator('#comparison').screenshot({path:`docs/gauntlets/island-001-v2/qa/comparisons/${prefix}-island-comparison.png`});
 await page.getByRole('button',{name:'Assembly',exact:true}).click();
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 await page.locator('#comparison').screenshot({path:`docs/gauntlets/island-001-v2/qa/comparisons/${prefix}-assembly-comparison.png`});
 assert.equal(result.errors.length,0);
} catch(error) { result.failure=error.stack;process.exitCode=1; }
finally { writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));await browser.close(); }
