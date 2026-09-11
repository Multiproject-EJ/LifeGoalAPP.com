import { createRequire } from 'node:module';
import { writeFileSync, existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [prefix, quality = 'high'] = process.argv.slice(2);
const mission = process.argv.includes('--mission');
if (!/^[a-z0-9-]+$/.test(prefix ?? '') || !['low','medium','high'].includes(quality)) throw Error('Provide immutable prefix and quality');
const output = `docs/gauntlets/island-001-v2/qa/reviews/${prefix}-${quality}-profile.json`;
if (existsSync(output)) throw Error('Evidence already exists');
const browser = await chromium.launch({ headless: true, executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const result = { scope: 'Actual full pilot in desktop Chromium at phone viewport. Not a physical-phone measurement.', browser: browser.version(), viewport: [390,844], quality, mission, errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.goto('http://127.0.0.1:53282/dev/island-template-kit?island=1&mode=3d&level=3&assemblyCharges=10', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.island-5-three-pilot__topline select').selectOption(quality, { timeout: 60000 });
  await page.getByRole('button', { name: 'Run 30s profile', exact: true }).click({ timeout: 60000 });
  if (mission) {
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.getByTestId('assembly-crater-preview-controls').getByRole('button', { name: 'Play 3 + 5 + 2', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.getByRole('button', { name: 'Run again', exact: true }).waitFor({ timeout: 55000 });
  result.report = await page.locator('[aria-label="30 second device profiler"]').innerText();
  result.metrics = await page.locator('[aria-label="3D renderer performance"]').innerText();
  await page.getByRole('button', { name: 'Hide overlays for evidence', exact: true }).click();
  await page.locator('canvas[aria-label="Interactive 3D Assembly Crater island"]').screenshot({ path: `docs/gauntlets/island-001-v2/qa/raw/${prefix}-${quality}-phone.png` });
} catch (error) { result.failure = error.stack; process.exitCode = 1; }
finally { writeFileSync(output, JSON.stringify(result,null,2)+'\n', {flag:'wx'}); console.log(JSON.stringify(result)); await browser.close(); }
