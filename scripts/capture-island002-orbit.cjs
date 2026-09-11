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
const origin = new URL(process.env.ISLAND002_CAPTURE_ORIGIN || 'http://127.0.0.1:53284');
if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw Error('Capture requires a local build');
const baseUrl = new URL('/dev/island-template-kit?island=2&mode=3d&level=3&redockingRolls=20', origin).href;
const launchOptions = { executablePath: process.env.ISLAND_CHROME || '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', headless: true };

const angleArgument = process.argv.find(arg => arg.startsWith('--angles='))?.split('=')[1];
const angles = angleArgument ? angleArgument.split(',').map(Number) : [0, 45, 90, 135, 180, 225, 270, 315, 20];
if (!angles.length || angles.some(a => ![0,45,90,135,180,225,270,315,20].includes(a))) throw Error('Invalid evidence angles');
const requestedFocus = process.argv.find(arg => arg.startsWith('--focus='))?.split('=')[1];
if (requestedFocus && !['boss', 'hatchery', 'habit', 'wisdom', 'event'].includes(requestedFocus)) throw Error('Unknown focus');

(async () => {
  const out = newEvidenceDirectory(process.argv[2]);
  const sourceStart = sourceSnapshot();
  const records = [], failures = [];
  let browser, page;
  const consoleErrors = [], failedRequests = [];
  try {
    browser = await chromium.launch(launchOptions);
    page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
    page.on('pageerror', error => { failures.push(String(error)); console.error('PAGEERROR', String(error)); });
    page.on('console', message => {
      if (message.type() !== 'error') return;
      if (consoleErrors.length < 60) consoleErrors.push(message.text().slice(0, 4000));
      if (/Shader Error|VALIDATE_STATUS|GL_INVALID|CONTEXT_LOST_WEBGL/.test(message.text())) failures.push(message.text());
    });
    page.on('requestfailed', request => {
      if (failedRequests.length < 60) failedRequests.push({ url: request.url(), failure: request.failure() });
    });
    for (const mode of (process.argv.includes('--beauty-only') ? ['beauty'] : ['beauty', 'normal'])) {
      requireStableSources(sourceStart, `before ${mode}`);
      await page.goto(baseUrl + (mode === 'normal' ? '&island3dMapStripped=1' : ''), { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Focus a landmark').waitFor({ timeout: 180000 });
      await page.locator('.island-5-three-pilot__topline select').selectOption('high');
      if (mode === 'beauty' && process.argv.includes('--context')) {
        for (const [label, control] of [['overview', 'Overview'], [requestedFocus || 'boss', requestedFocus || 'boss'], ['left', 'Left orbit'], ['right', 'Right orbit']]) {
          requireStableSources(sourceStart, `context/${label}`);
          if (['boss', 'hatchery', 'habit', 'wisdom', 'event'].includes(control)) await page.getByLabel('Focus a landmark').selectOption(control);
          else await page.getByRole('button', { name: control, exact: true }).click();
          await page.waitForTimeout(1600);
          const metrics = await page.getByLabel('3D renderer performance').innerText();
          const style = await page.addStyleTag({ content: '.island-5-three-pilot__topline,.island-5-three-pilot__metrics,.island-5-three-pilot__profiler,.island-5-three-pilot__camera-controls{visibility:hidden!important}' });
          const name = `context-${label}.png`;
          await page.screenshot({ path: path.join(out, name) });
          await style.evaluate(element => element.remove());
          const sourceAfter = requireStableSources(sourceStart, name);
          records.push({ name, metrics, mode, url: page.url(), quality: 'high', camera: { kind: 'context', selected: control },
            canvasDataset: await page.locator('canvas').evaluate(canvas => ({ ...canvas.dataset })),
            imageSha256: sha256(fs.readFileSync(path.join(out, name))), sourceSetSha256: sourceAfter.sourceSetSha256, sourceChanges: [] });
          console.log(name);
        }
        // Re-select Overview first so an unchanged focus select still starts
        // a fresh landmark transition after the right-hand context view.
        await page.getByRole('button', { name: 'Overview', exact: true }).click();
      }
      if (!process.argv.includes('--island')) await page.getByLabel('Focus a landmark').selectOption(requestedFocus || 'boss');
      await page.waitForTimeout(1400);
      for (const angle of angles) {
        requireStableSources(sourceStart, `before ${mode}/${angle}`);
        await page.getByRole('button', { name: `${angle === 20 ? 0 : angle}°`, exact: true }).click();
        if (angle === 20) { await page.getByRole('button', { name: 'High survey', exact: true }).click(); await page.waitForTimeout(1200); }
        await page.waitForTimeout(150);
        const metrics = await page.getByLabel('3D renderer performance').innerText();
        const style = await page.addStyleTag({ content: '.island-5-three-pilot__topline,.island-5-three-pilot__metrics,.island-5-three-pilot__profiler,.island-5-three-pilot__camera-controls{visibility:hidden!important}' });
        const name = `${mode}-${angle === 20 ? 'survey' : String(angle).padStart(3, '0')}.png`;
        await page.screenshot({ path: path.join(out, name), timeout: 60000 });
        await style.evaluate(element => element.remove());
        const sourceAfter = sourceSnapshot();
        const changes = sourceChanges(sourceStart, sourceAfter);
        records.push({ name, angle, metrics, url: page.url(), quality: 'high', mode,
          camera: angle === 20 ? { kind: 'preset', selected: 'High survey', angle: null } : { kind: 'evidence-orbit', landmark: process.argv.includes('--island') ? null : requestedFocus || 'boss', angle },
          modeMeaning: mode === 'normal' ? 'existing map-stripped diagnostic route; not a guaranteed normal-buffer render' : 'beauty',
          canvasDataset: await page.locator('canvas').evaluate(canvas => ({ ...canvas.dataset })),
          imageSha256: sha256(fs.readFileSync(path.join(out, name))),
          sourceSetSha256: sourceAfter.sourceSetSha256, sourceChanges: changes });
        if (changes.length) throw Error(`Source changed while capturing ${name}: ${changes.join(', ')}`);
        console.log(name);
      }
    }
  } catch (error) {
    failures.push(error.stack || String(error));
    if (page && !page.isClosed()) {
      try {
        await page.screenshot({ path: path.join(out, 'capture-load-error.png'), timeout: 10000 });
        fs.writeFileSync(path.join(out, 'capture-load-error.txt'), (await page.locator('body').innerText({ timeout: 5000 })).slice(0, 18000), { flag: 'wx' });
      } catch (diagnosticError) { failures.push(`Could not capture failure state: ${diagnosticError.message}`); }
    }
  }
  finally {
    const sourceEnd = sourceSnapshot();
    const changedDuringCapture = sourceChanges(sourceStart, sourceEnd);
    if (changedDuringCapture.length) failures.push(`Source race invalidates this capture: ${changedDuringCapture.join(', ')}`);
    const status = failures.length ? 'failed' : 'captured-unreviewed';
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ schemaVersion: 2, at: new Date().toISOString(),
      status, visualAcceptance: false, viewport, dpr, sourceStart, sourceEnd, changedDuringCapture, failures, consoleErrors, failedRequests, records }, null, 2), { flag: 'wx' });
    if (browser) await browser.close();
    if (failures.length) { console.error(JSON.stringify({ status, failures })); process.exitCode = 1; }
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
