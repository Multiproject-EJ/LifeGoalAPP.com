// Usage: node scripts/profile-island002-v2-local.mjs NEW_OUTPUT_DIR high
//   [--docking-replay] [--reduced-motion] [--docking-rolls=0..20] [--dpr=1|2]
// Uses the real pilot's unchanged 30s camera choreography. No physical-device claim.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outputArgument, quality = 'high', ...flags] = process.argv.slice(2);
const usage = 'Provide a NEW output directory, low|medium|high, optionally --docking-replay, --docking-rolls=0..20, --reduced-motion, --dpr=1|2';
if (!outputArgument || outputArgument.startsWith('--') || !['low', 'medium', 'high'].includes(quality)) throw Error(usage);
if (flags.some(flag => !/^(--docking-replay|--reduced-motion|--docking-rolls=(?:[0-9]|1[0-9]|20)|--dpr=[12])$/.test(flag))) throw Error(usage);
if (new Set(flags.map(flag => flag.split('=')[0])).size !== flags.length) throw Error('Duplicate options');
const replay = flags.includes('--docking-replay');
const reducedMotion = flags.includes('--reduced-motion');
if (replay && flags.some(flag => flag.startsWith('--docking-rolls='))) throw Error('Replay starts at 0; omit --docking-rolls');
const rolls = Number(flags.find(flag => flag.startsWith('--docking-rolls='))?.split('=')[1] ?? 20);
const dpr = Number(flags.find(flag => flag.startsWith('--dpr='))?.split('=')[1] ?? 2);
const directory = path.resolve(outputArgument);
if (existsSync(directory)) throw Error(`Evidence directory already exists; preserve it and choose a new path: ${directory}`);
const base = new URL(process.env.ISLAND002_PROFILE_ORIGIN || 'http://127.0.0.1:53284');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw Error('This local profiler requires a loopback server');
const url = new URL('/dev/island-template-kit', base);
url.search = new URLSearchParams({ island: '2', mode: '3d', level: '3', redockingRolls: String(replay ? 0 : rolls), ...(replay ? { redockingReplay: '1' } : {}) }).toString();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
function sourceSnapshot() {
  const discovered = git(['ls-files', '--cached', '--others', '--exclude-standard', '--',
    'src/features/gamification/level-worlds/dev/*Celestial*',
    'src/features/gamification/level-worlds/dev/generated/island002*',
  ]).split('\n').filter(Boolean);
  const files = [...new Set([...discovered,
    'src/features/gamification/level-worlds/dev/Island1AnimatedBatches.ts',
    'src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx',
    'src/features/gamification/level-worlds/dev/IslandTemplateKitPage.tsx',
    'src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts',
    'src/features/gamification/level-worlds/dev/IslandConstructionLevelDelta.ts',
    'src/features/gamification/level-worlds/services/islandBoardLayout.ts',
    'scripts/build-island002-palace-blender.py',
    'scripts/profile-island002-v2-local.mjs',
  ])].sort();
  const sources = Object.fromEntries(files.map(file => [file, existsSync(path.join(repository, file)) ? hash(readFileSync(path.join(repository, file))) : null]));
  return { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']), head: git(['rev-parse', 'HEAD']), sources, sourceSetSha256: hash(JSON.stringify(sources)) };
}
function changes(before, after) {
  return [...new Set([...Object.keys(before.sources), ...Object.keys(after.sources)])].filter(file => before.sources[file] !== after.sources[file])
    .concat(before.branch === after.branch ? [] : ['git:branch'], before.head === after.head ? [] : ['git:HEAD']);
}
const sourceStart = sourceSnapshot();
mkdirSync(path.dirname(directory), { recursive: true });
mkdirSync(directory);
const result = {
  schemaVersion: 1, startedAt: new Date().toISOString(), status: 'pending',
  scope: 'Actual Island 002 pilot in one desktop Chromium browser at phone viewport; not physical-iPhone evidence.',
  finalVisualAcceptance: false, physicalDeviceAcceptance: false,
  url: url.href, quality, viewport: { width: 390, height: 844 }, dpr,
  reducedMotion, replay, requestedDockingRolls: replay ? [0, 20] : rolls,
  replayTiming: replay ? 'Unmodified query fixture: 1 roll / 1800ms, 36s to roll20. The 30s profile is a measured subset; the final frame waits for roll20.' : null,
  camera: { profile: 'Unmodified built-in 30s profiler choreography', screenshot: 'Overview preset after profile, 2500ms settle' },
  sourceStart, checkpoints: [], errors: [], console: [], consoleGLErrors: [],
};
let browser;
let page;
function requireStable(label) {
  const current = sourceSnapshot();
  const changed = changes(sourceStart, current);
  result.checkpoints.push({ label, at: new Date().toISOString(), sourceSetSha256: current.sourceSetSha256, changes: changed });
  if (changed.length) throw Error(`Source changed during profile (${label}): ${changed.join(', ')}`);
}
try {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.ISLAND_PLAYWRIGHT || '/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser = await chromium.launch({ headless: true, executablePath: process.env.ISLAND_CHROME || '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
  result.browser = { engine: 'Chromium', version: browser.version(), headless: true, executable: process.env.ISLAND_CHROME || 'bundled chromium-1228' };
  page = await browser.newPage({ viewport: result.viewport, deviceScaleFactor: dpr, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  page.on('pageerror', error => result.errors.push(error.stack || String(error)));
  page.on('console', message => {
    if (!['warning', 'error'].includes(message.type())) return;
    const entry = { type: message.type(), text: message.text(), location: message.location(), at: new Date().toISOString() };
    result.console.push(entry);
    if (/webgl|gl_invalid|gl_out_of_memory|context.?lost|shader.*error|three\.webgl/i.test(entry.text)) result.consoleGLErrors.push(entry);
  });
  await page.addInitScript(() => {
    window.__islandProfileEvidence = { docking: [], visibility: [], contextLoss: [] };
    document.addEventListener('visibilitychange', () => window.__islandProfileEvidence.visibility.push({ atMs: performance.now(), state: document.visibilityState }));
    document.addEventListener('webglcontextlost', () => window.__islandProfileEvidence.contextLoss.push({ atMs: performance.now() }), true);
    let lastRoll = null;
    const observer = new MutationObserver(() => {
      const value = document.querySelector('canvas[data-celestial-redocking-rolls]')?.dataset.celestialRedockingRolls;
      if (value === undefined || value === lastRoll) return;
      lastRoll = value;
      window.__islandProfileEvidence.docking.push({ atMs: performance.now(), rolls: Number(value) });
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-celestial-redocking-rolls'] });
  });
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.island-5-three-pilot__topline select').selectOption(quality, { timeout: 60000 });
  await page.getByLabel('Device model', { exact: true }).fill('Desktop Chromium · 390×844 · local evidence');
  if (!replay) await page.waitForTimeout(2500);
  result.actualUrl = page.url();
  result.environment = await page.evaluate(() => ({ userAgent: navigator.userAgent, dpr: devicePixelRatio, width: innerWidth, height: innerHeight, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, visibility: document.visibilityState }));
  requireStable('before 30s trace');
  result.profileStart = await page.locator('canvas').first().evaluate(canvas => ({ atMs: performance.now(), dataset: { ...canvas.dataset } }));
  await page.getByRole('button', { name: 'Run 30s profile', exact: true }).click();
  await page.getByRole('button', { name: 'Run again', exact: true }).waitFor({ timeout: 55000 });
  result.profileEnd = await page.locator('canvas').first().evaluate(canvas => ({ atMs: performance.now(), dataset: { ...canvas.dataset } }));
  requireStable('after 30s trace');
  result.reportText = await page.getByLabel('30 second device profiler', { exact: true }).innerText();
  // Capture the existing Share report payload locally; do not open an OS share sheet,
  // send a message, or write the host clipboard. Renderer/profiler data is untouched.
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__islandLocalProfileReport = JSON.parse(data.text); } }));
  await page.getByRole('button', { name: 'Share report', exact: true }).click();
  result.report = await page.evaluate(() => window.__islandLocalProfileReport);
  result.reportExtraction = 'Existing Share report JSON payload intercepted locally after measurement';
  if (result.report?.profileSchema !== 'island-3d-m7-v1' || result.report.quality !== quality || !(result.report.sampleCount > 0) || !(result.report.rendererWidth > 0) || !(result.report.rendererHeight > 0) || !(result.report.maxTriangles > 0) || !(result.report.maxDrawCalls > 0)) throw Error('Missing, empty or wrong-tier pilot report');
  if (result.profileEnd.atMs - result.profileStart.atMs < 29900) throw Error('Profile did not span the requested 30s wall-clock window');
  writeFileSync(path.join(directory, 'pilot-report.json'), JSON.stringify(result.report, null, 2) + '\n', { flag: 'wx' });
  if (replay) await page.waitForFunction(() => document.querySelector('canvas[data-celestial-redocking-rolls]')?.dataset.celestialRedockingRolls === '20', undefined, { timeout: 45000 });
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.waitForTimeout(2500);
  result.metrics = await page.getByLabel('3D renderer performance', { exact: true }).innerText();
  result.finalDataset = await page.locator('canvas').first().evaluate(canvas => ({ ...canvas.dataset }));
  await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).click();
  await page.waitForTimeout(200);
  requireStable('before overview frame');
  await page.locator('canvas').first().screenshot({ path: path.join(directory, 'overview.png') });
  result.overview = { file: 'overview.png', sha256: hash(readFileSync(path.join(directory, 'overview.png'))) };
} catch (error) {
  result.errors.push(error.stack || String(error));
} finally {
  if (page && !page.isClosed()) {
    try { result.presentationEvidence = await page.evaluate(() => window.__islandProfileEvidence); }
    catch (error) { result.errors.push(`Could not read presentation evidence: ${error.message}`); }
  }
  result.sourceEnd = sourceSnapshot();
  result.changedDuringProfile = changes(sourceStart, result.sourceEnd);
  if (result.changedDuringProfile.length) result.errors.push(`Source race invalidates evidence: ${result.changedDuringProfile.join(', ')}`);
  if (result.presentationEvidence?.contextLoss.length) result.errors.push('WebGL context loss occurred');
  if (result.presentationEvidence?.visibility.some(entry => entry.state !== 'visible')) result.errors.push('Page left foreground during run');
  if (result.consoleGLErrors.length) result.errors.push('WebGL console diagnostics require review');
  result.status = result.errors.length ? 'failed' : 'captured-unreviewed';
  result.finishedAt = new Date().toISOString();
  writeFileSync(path.join(directory, 'profile.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  if (browser) await browser.close();
  console.log(JSON.stringify({ status: result.status, output: directory, rating: result.report?.rating, errors: result.errors, sourceStable: !result.changedDuringProfile.length }));
  if (result.errors.length) process.exitCode = 1;
}
