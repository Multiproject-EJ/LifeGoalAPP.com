import { chromium } from '/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';

const out = path.resolve(process.env.ISLAND19_EVIDENCE_DIR ?? 'work/island-visual-library/island-019-coaster-carnival/evidence/grand-grotto-d019-r01/browser');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(90000);
const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.error('page error', error.message); });
const base = (process.env.ISLAND19_BASE_URL ?? 'http://127.0.0.1:5191') + '/dev/island-template-kit?mode=3d&island=19&level=3&guides=0&island3dQuality=high&island3dEvidence=1';
const frames = [];
const wagon = process.env.ISLAND19_CAPTURE_WAGON ?? 'front';
if (!['front', 'middle'].includes(wagon)) throw new Error('ISLAND19_CAPTURE_WAGON must be front or middle');
const route = JSON.parse(await fs.readFile('src/features/gamification/level-worlds/dev/island19WonderRoute.json', 'utf8'));
const points = route.knots.map(k => new THREE.Vector3(...k.position));
const handles = points.map((p, i) => {
  const previous = points[(i + points.length - 1) % points.length];
  const next = points[(i + 1) % points.length];
  return (route.knots[i].tangent ? new THREE.Vector3(...route.knots[i].tangent) : next.clone().sub(previous))
    .normalize().multiplyScalar(Math.min(p.distanceTo(previous), p.distanceTo(next)) * route.knots[i].handleScale);
});
const railway = new THREE.CurvePath();
points.forEach((p, i) => {
  const n = (i + 1) % points.length;
  railway.add(new THREE.CubicBezierCurve3(p, p.clone().add(handles[i]), points[n].clone().sub(handles[n]), points[n]));
});
const lengths = railway.getCurveLengths();
const phaseMidpoint = id => {
  const i = route.knots.findIndex(k => k.id === id);
  return ((lengths[i-1] ?? 0) + lengths[i]) / 2 / railway.getLength();
};
try {
  for (const [name, id] of [['climb','lift'], ['crest','crest'], ['grand-vault','grotto-south-balcony'], ['treasure-overlook','grotto-treasure-overlook'], ['palace', 'station'], ['bypass', 'bypass-shoulder'], ['plunge', 'plunge-mouth'], ['gold', 'gold-vault'], ['second-drop','grotto-second-drop'], ['diamond', 'diamond-gallery'], ['ocean', 'undersea-panorama'], ['ascent', 'ascent-mouth']]) {
    const progress = phaseMidpoint(id);
    if (process.env.ISLAND19_CAPTURE_FRAMES && !process.env.ISLAND19_CAPTURE_FRAMES.split(',').includes(name)) continue;
    await page.goto(base + '&island19Ride=1&island19RideWagon=' + wagon + '&island19RideProgress=' + progress);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some(c => c.dataset.island19WonderRideActive === 'true'));
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.island19CircuitIReady === 'true');
    await page.waitForTimeout(2000);
    const canvas = page.locator('canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, name + '.png') });
    frames.push({ name, progress, data: await canvas.evaluate(el => ({ ...el.dataset })) });
    console.log('captured', name);
  }
  if (process.env.ISLAND19_CAPTURE_ONLY) {
    await fs.writeFile(path.join(out, 'focused-visual-report.json'), JSON.stringify({ errors, frames }, null, 2));
  } else {
  await page.goto(base + '&island19Ride=1&island19RideWagon=' + wagon);
  await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some(c => c.dataset.island19WonderRideActive === 'true'));
  const frameTiming = page.evaluate(() => new Promise(resolve => {
    const samples = [];
    let previous = performance.now();
    const tick = now => {
      samples.push(now - previous);
      previous = now;
      if (document.querySelector('canvas')?.dataset.island19WonderRideActive !== 'true') resolve(samples);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  const rideFrames = [];
  for (let index = 0; index < 120; index += 1) {
    await page.waitForTimeout(2000);
    const data = await page.locator('canvas').first().evaluate(el => ({ ...el.dataset }));
    rideFrames.push(data);
    if (index % 3 === 0) await page.screenshot({ path: path.join(out, 'ride-' + String(index).padStart(2, '0') + '.png') });
    console.log('ride', data.island19WonderRideProgress, data.island19WonderRidePhase);
    if (data.island19WonderRideActive === 'false') break;
  }
  const frameTimes = (await frameTiming).filter(n => n > 0).sort((a, b) => a - b);
  await fs.writeFile(path.join(out, 'runtime-report.json'), JSON.stringify({ errors, frames, rideFrames, timing: {
    samples: frameTimes.length,
    medianMs: frameTimes[Math.floor(frameTimes.length * .5)],
    p95Ms: frameTimes[Math.floor(frameTimes.length * .95)],
    over50Ms: frameTimes.filter(t => t > 50).length,
  } }, null, 2));
  }
} finally { await browser.close(); }
