const { chromium } = require(process.env.ISLAND_PLAYWRIGHT || '/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const repository = path.resolve(__dirname, '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
function sourceSnapshot() {
  const listed = git(['ls-files', '--cached', '--others', '--exclude-standard', '--',
    'src/features/gamification/level-worlds/dev/*Celestial*',
    'src/features/gamification/level-worlds/dev/generated/island002*',
  ]).split('\n').filter(Boolean);
  const required = [
    'src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts',
    'src/features/gamification/level-worlds/dev/Island2CelestialV2Landmarks.ts',
    'src/features/gamification/level-worlds/dev/Island2CelestialV2Batch.ts',
    'src/features/gamification/level-worlds/dev/Island1AnimatedBatches.ts',
    'src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx',
    'src/features/gamification/level-worlds/dev/IslandTemplateKitPage.tsx',
    'src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts',
    'src/features/gamification/level-worlds/dev/IslandConstructionLevelDelta.ts',
    'src/features/gamification/level-worlds/services/islandBoardLayout.ts',
    'src/features/gamification/level-worlds/dev/generated/island002-palace-roof.json',
    'scripts/build-island002-palace-blender.py',
    'scripts/capture-island002-v2.cjs',
    'scripts/capture-island002-orbit.cjs',
  ];
  const files = [...new Set([...listed, ...required])].sort();
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
const baseUrl = 'http://127.0.0.1:53284/dev/island-template-kit?island=2&mode=3d&level=3&redockingRolls=20';
const launchOptions = { executablePath: process.env.ISLAND_CHROME || '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', headless: true };

const requestedFocus = process.argv.find(arg => arg.startsWith('--focus='))?.split('=')[1];
if (requestedFocus && !['boss', 'hatchery', 'habit', 'wisdom', 'event'].includes(requestedFocus)) throw Error('Unknown focus');

(async () => {
  const folder = newEvidenceDirectory(process.argv[2]);
  const sourceStart = sourceSnapshot();
  const records = [], failures = [];
  const cases = requestedFocus ? [['overview', null], [requestedFocus, requestedFocus], ['left', 'Left orbit'], ['right', 'Right orbit']] : process.argv.includes('--palace')
    ? [['overview', null], ['palace', 'boss'], ['left', 'Left orbit'], ['right', 'Right orbit']]
    : [['overview', null], ['palace', 'boss'], ['hatchery', 'hatchery'], ['habit', 'habit'], ['wisdom', 'wisdom'], ['event', 'event'], ['left', 'Left orbit'], ['right', 'Right orbit'], ['survey', 'High survey']];
  let browser;
  try {
    browser = await chromium.launch(launchOptions);
    const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
    page.on('pageerror', error => { failures.push(String(error)); console.error('PAGEERROR', String(error)); });
    for (const [name, view] of cases) {
      requireStableSources(sourceStart, `before ${name}`);
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      try { await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).waitFor({ timeout: 15000 }); }
      catch {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).waitFor({ timeout: 60000 });
      }
      await page.locator('.island-5-three-pilot__topline select').selectOption('high');
      if (['boss', 'hatchery', 'habit', 'wisdom', 'event'].includes(view)) await page.getByLabel('Focus a landmark').selectOption(view);
      else if (view) await page.getByRole('button', { name: view, exact: true }).click();
      await page.waitForTimeout(2500);
      const metrics = await page.getByLabel('3D renderer performance').innerText();
      await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).click();
      await page.waitForTimeout(200);
      const file = `${name}.png`;
      await page.screenshot({ path: path.join(folder, file) });
      const sourceAfter = sourceSnapshot();
      const changes = sourceChanges(sourceStart, sourceAfter);
      records.push({ name, file, metrics, viewport, dpr, url: page.url(), quality: 'high',
        camera: { kind: view ? (['boss', 'hatchery', 'habit', 'wisdom', 'event'].includes(view) ? 'landmark-focus' : 'preset') : 'default-overview', selected: view },
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
