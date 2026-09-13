const { chromium } = require(process.env.ISLAND_PLAYWRIGHT || '/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const repository = process.cwd();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
function sourceSnapshot() {
  const files = git(['ls-files', '--', 'src/features/gamification/level-worlds/dev', 'src/features/gamification/level-worlds/services/islandRun3DWorldRouting.ts']).split('\n').filter(Boolean).concat(['src/features/gamification/level-worlds/dev/Island3FrozenWorldThreeModel.ts']).sort();
  const sources = Object.fromEntries(files.map(file => {
    const absolute = path.join(repository, file);
    return [file, fs.existsSync(absolute) ? sha256(fs.readFileSync(absolute)) : null];
  }));
  return { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']), head: git(['rev-parse', 'HEAD']), sources,
    sourceSetSha256: sha256(JSON.stringify(sources)) };
}
function sourceChanges(before, after) {
  const files = [...new Set([...Object.keys(before.sources), ...Object.keys(after.sources)])];
  return [...files.filter(file => before.sources[file] !== after.sources[file]),
    ...(before.head !== after.head ? ['git:HEAD'] : []),
    ...(before.branch !== after.branch ? ['git:branch'] : [])];
}
function newEvidenceDirectory(argument) {
  if (!argument || argument.startsWith('--')) throw Error('Supply a new evidence output directory');
  const directory = path.resolve(argument);
  // Refuse the entire prior folder, including partial evidence from a failed run.
  if (fs.existsSync(directory)) throw Error(`Evidence directory already exists; choose a new one: ${directory}`);
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  fs.mkdirSync(directory);
  return directory;
}
function requireStableSources(start, label) {
  const current = sourceSnapshot();
  const changes = sourceChanges(start, current);
  if (changes.length) throw Error(`Source changed during capture (${label}): ${changes.join(', ')}`);
  return current;
}
const viewport = { width: 390, height: 844 };
const dpr = 2;
const baseUrl = 'http://127.0.0.1:53303/dev/island-template-kit?island=3&mode=3d&level=3&island3Ambience=day&frostwellBuilt=1';
const launchOptions = { executablePath: process.env.ISLAND_CHROME || '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', headless: true };

const requestedFocus = process.argv.find(arg => arg.startsWith('--focus='))?.split('=')[1];
if (requestedFocus && !['boss', 'hatchery', 'habit', 'wisdom', 'event', 'frostwell'].includes(requestedFocus)) throw Error('Unknown focus');

(async () => {
  const folder = newEvidenceDirectory(process.argv[2]);
  const sourceStart = sourceSnapshot();
  const records = [], failures = [];
  const cases = requestedFocus ? [['overview', null], [requestedFocus, requestedFocus], ['left', 'Left orbit'], ['right', 'Right orbit']] : process.argv.includes('--palace')
    ? [['overview', null], ['keep', 'boss'], ['left', 'Left orbit'], ['right', 'Right orbit']]
    : [['overview', null], ['keep', 'boss'], ['hatchery', 'hatchery'], ['habit', 'habit'], ['wisdom', 'wisdom'], ['event', 'event'], ['left', 'Left orbit'], ['right', 'Right orbit'], ['survey', 'High survey'], ['night', null], ['frostwell', 'frostwell']];
  let browser;
  try {
    browser = await chromium.launch(launchOptions);
    const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
    page.on('pageerror', error => { failures.push(String(error)); console.error('PAGEERROR', String(error)); });
    for (const [name, view] of cases) {
      requireStableSources(sourceStart, `before ${name}`);
      await page.goto(name === 'night' ? baseUrl.replace('Ambience=day', 'Ambience=night') : baseUrl, { waitUntil: 'domcontentloaded', timeout: 180000 });
      try { await page.locator('canvas').first().waitFor({timeout:180000}); if (await page.getByRole('button',{name:'Show evidence controls',exact:true}).count()) await page.getByRole('button',{name:'Show evidence controls',exact:true}).click(); await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).waitFor({ timeout: 180000 }); }
      catch {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
        await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).waitFor({ timeout: 180000 });
      }
      await page.locator('.island-5-three-pilot__topline select').selectOption('high');
      if (['boss', 'hatchery', 'habit', 'wisdom', 'event', 'frostwell'].includes(view)) await page.getByLabel('Focus a landmark').selectOption(view);
      else if (view) await page.getByRole('button', { name: view, exact: true }).click();
      await page.waitForTimeout(2500);
      const metrics = await page.getByLabel('3D renderer performance').innerText();
      await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).click();
      await page.waitForTimeout(200);
      const file = `${name}.png`;
      await page.screenshot({ path: path.join(folder, file), timeout:120000 });
      const sourceAfter = sourceSnapshot();
      const changes = sourceChanges(sourceStart, sourceAfter);
      records.push({ name, file, metrics, viewport, dpr, url: page.url(), quality: 'high',
        camera: { kind: view ? (['boss', 'hatchery', 'habit', 'wisdom', 'event', 'frostwell'].includes(view) ? 'landmark-focus' : 'preset') : 'default-overview', selected: view },
        canvasDataset: await page.locator('canvas').first().evaluate(canvas => ({ ...canvas.dataset })),
        imageSha256: sha256(fs.readFileSync(path.join(folder, file))),
        sourceSetSha256: sourceAfter.sourceSetSha256, sourceChanges: changes });
      if (changes.length) throw Error(`Source changed while capturing ${name}: ${changes.join(', ')}`);
      console.log(name, metrics.replaceAll('\n', ' '));
    }
  } catch (error) { failures.push(error.stack || String(error)); }
  finally {
    const sourceEnd = sourceSnapshot();
    const changedDuringCapture = sourceChanges(sourceStart, sourceEnd);
    if (changedDuringCapture.length) failures.push(`Source race invalidates this capture: ${changedDuringCapture.join(', ')}`);
    const status = failures.length ? 'failed' : 'captured-unreviewed';
    fs.writeFileSync(path.join(folder, 'capture.json'), JSON.stringify({ schemaVersion: 2, at: new Date().toISOString(),
      status, visualAcceptance: false, viewport, dpr, sourceStart, sourceEnd, changedDuringCapture, failures, records }, null, 2), { flag: 'wx' });
    if (browser) await browser.close();
    if (failures.length) { console.error(JSON.stringify({ status, failures })); process.exitCode = 1; }
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
