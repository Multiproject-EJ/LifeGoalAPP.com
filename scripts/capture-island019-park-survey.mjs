import { chromium } from '/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve(process.env.ISLAND19_EVIDENCE_DIR ?? 'work/island-visual-library/island-019-coaster-carnival/evidence/park-detail-d021/baseline');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1100 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
const frames = [];
const baseUrl = process.env.ISLAND19_BASE_URL ?? 'http://127.0.0.1:5191';
try {
  for (const [name, azimuth, width, height] of [['rear',180,1000,1100], ['overview',0,1000,1100], ['left',-60,1000,1100], ['right',60,1000,1100], ['phone',0,390,844]]) {
    await page.setViewportSize({ width, height });
    await page.goto(baseUrl + '/dev/island-template-kit?mode=3d&island=19&level=3&guides=0&island3dQuality=high&island3dEvidence=1&island3dEvidencePreset=overview&island3dEvidenceDistanceScale=1.18&island3dEvidenceAzimuth=' + azimuth);
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.island19CircuitIReady === 'true', null, { timeout: 120000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, name + '.png') });
    frames.push({ name, data: await page.locator('canvas').first().evaluate(el => ({ ...el.dataset })) });
    console.log('captured', name);
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ errors, frames }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png') });
  console.error(await page.locator('body').innerText());
  throw error;
} finally { await browser.close(); }
