const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const out = process.argv[2];
assert(out && !fs.existsSync(out), 'Supply a fresh evidence folder');
fs.mkdirSync(out, { recursive: true });
const files = ['components/IslandFrostwellMissionModal.tsx', 'hooks/useFrostwellMissionSequence.ts', 'LevelWorlds.css', ...['Island5ThreePilot.tsx', 'IslandTemplateKitPage.tsx', 'FrostwellIceworksThreeModel.ts', 'Island3FrostmoonThreeWorld.ts', 'Island3FrozenWorldThreeModel.ts', 'FrostmoonSeafoodTradeThreeModel.ts', 'Island1AnimatedBatches.ts'].map(f => 'dev/' + f)];
const snapshot = () => Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync('src/features/gamification/level-worlds/' + f)).digest('hex')]));
(async () => {
  const report = { scope: 'Production UI/model in deterministic dev fixture. Playwright clock freezes each phase for accurate keyframes; live motion evidence is recorded separately.', sourceStart: snapshot(), records: [], errors: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    page.on('pageerror', e => report.errors.push(String(e)));
    await page.clock.install();
    await page.goto('http://127.0.0.1:53303/dev/island-template-kit?island=3&mode=3d&level=3&frostwellDepth=470&frostwellMissionV2=1&island3Ambience=day&island3dEvidence=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.locator('.frostwell-v2__hub').waitFor({ timeout: 180000 });
    await page.waitForTimeout(1500);
    // A wide future margin tolerates slow CDP round-trips while time runs.
    await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 60000);
    const shot = async (name, heading) => {
      assert.equal(await page.locator('.frostwell-v2 h2').innerText(), heading);
      await page.screenshot({ path: path.join(out, name + '.png') });
      assert.equal(await page.locator('.frostwell-v2 h2').innerText(), heading, 'Phase must not drift during screenshot');
      report.records.push({ name, heading, dataset: await page.locator('canvas').first().evaluate(c => ({ ...c.dataset })), imageSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(out, name + '.png'))).digest('hex') });
    };
    await shot('01-launch', 'What lies 500 metres below?');
    await page.locator('.frostwell-v2__hub').dispatchEvent('click');
    await page.clock.runFor(64);
    await page.clock.runFor(3000);
    await shot('03-descent', 'Into the blue');
    await page.clock.runFor(4000);
    await shot('04-startup', 'The iceworks awaken');
    await page.clock.runFor(6000);
    await shot('05-complete', 'Life beneath the ice');
  } catch (error) { report.errors.push(error.stack || String(error)); }
  finally {
    if (browser) await browser.close();
    report.sourceEnd = snapshot();
    report.sourceStable = JSON.stringify(report.sourceStart) === JSON.stringify(report.sourceEnd);
    fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ errors: report.errors, sourceStable: report.sourceStable, records: report.records.map(r => ({ name: r.name, heading: r.heading })) }));
    if (report.errors.length || !report.sourceStable) process.exitCode = 1;
  }
})();
