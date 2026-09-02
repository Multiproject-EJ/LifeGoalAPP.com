import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');
const manifestPath = resolve(__dirname, 'blockout-render-manifest.json');
const renderBridge = '/Users/ejmac/.codex/skills/img2threejs/forge/stage4_review/render_bridge.py';
const captureRoot = resolve(__dirname, 'captures/blockout');
const url = 'http://127.0.0.1:5188/work/island-visual-library/island-018-jungle-expedition/evidence/blockout-harness.html';

const captures = [
  { id: 'hero', role: 'reference-match', azimuthDegrees: 0, elevationDegrees: 34 },
  { id: 'orbit-plus35', role: 'orbit', azimuthDegrees: 35, elevationDegrees: 34 },
  { id: 'orbit-minus35', role: 'orbit', azimuthDegrees: -35, elevationDegrees: 34 },
  { id: 'profile', role: 'orbit', azimuthDegrees: 78, elevationDegrees: 28 },
  { id: 'rear', role: 'orbit', azimuthDegrees: 180, elevationDegrees: 30 },
  { id: 'head-hero', role: 'head-closeup', azimuthDegrees: 0, elevationDegrees: 42 },
  { id: 'head-threequarter', role: 'head-closeup', azimuthDegrees: 35, elevationDegrees: 42 },
];

await mkdir(captureRoot, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const consoleErrors = [];
try {
  const page = await browser.newPage({ viewport: { width: 620, height: 1000 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__IMG2THREEJS_READY__ === true, null, { timeout: 30000 });

  const records = [];
  for (const capture of captures) {
    const snapshot = await page.evaluate(async (request) => window.__IMG2THREEJS_CAPTURE__?.(request), capture);
    const screenshotPath = resolve(captureRoot, `${capture.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const args = [
      renderBridge,
      'record',
      '--manifest',
      manifestPath,
      '--capture-id',
      capture.id,
      '--screenshot',
      screenshotPath,
      '--ready-signal',
      'true',
    ];
    for (const error of consoleErrors) args.push('--console-error', error);
    const recorded = spawnSync('python3', args, { cwd: repoRoot, encoding: 'utf8' });
    if (recorded.status !== 0) {
      throw new Error(`render_bridge record failed for ${capture.id}: ${recorded.stderr || recorded.stdout}`);
    }
    records.push({ capture, screenshotPath, snapshot });
  }

  console.log(JSON.stringify({ ok: true, records, consoleErrors }, null, 2));
} finally {
  await browser.close();
}
