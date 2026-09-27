import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ISLAND40_PREVIEW_URL || 'http://127.0.0.1:5196';
const useWorkbench = process.env.ISLAND40_USE_WORKBENCH === '1';
const previewPath = useWorkbench ? '/dev/island-template-kit' : '/scripts/fixtures/island040-placeholder.html';
const output = 'docs/investigations/island040-placeholder-20260926';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const [name, width, height, level, reducedMotion] of [
    ['phone-l3', 390, 844, 3, false],
    ['phone-l0', 390, 844, 0, false],
    ['short-phone', 360, 640, 3, false],
    ['wide-phone-reduced', 430, 932, 3, true],
    ['desktop', 1280, 900, 3, false],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + previewPath + '?mode=3d&island=40&level=' + level + '&island3dEvidence=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const world = page.locator('[data-world-source="40"]');
    await world.waitFor({ timeout: 120000 });
    await page.locator('.island-5-three-pilot__loading').waitFor({ state: 'hidden', timeout: 60000 });
    assert.equal(await world.getAttribute('data-presentation-status'), 'placeholder');
    const canvasSize = await page.locator('canvas').evaluate(canvas => ({
      width: canvas.clientWidth, height: canvas.clientHeight,
    }));
    if (!useWorkbench) assert.deepEqual(canvasSize, { width, height }, 'actual renderer matches viewport, not a cropped fixed phone frame');
    assert.match(await page.locator('.island-40-placeholder-label').innerText(), /portal not active/);
    await page.screenshot({ path: output + '/' + name + '.png' });
    if (name === 'phone-l3') {
      for (const [label, view] of [['90°', 'right'], ['180°', 'rear'], ['270°', 'left']]) {
        // Evidence mode intentionally hides workbench controls, but these invoke
        // the real renderer's existing review-camera handlers, not a mock scene.
        await page.getByRole('button', { name: label, exact: true, includeHidden: true }).evaluate(button => button.click());
        await page.waitForTimeout(1800);
        await page.screenshot({ path: output + '/phone-' + view + '.png' });
      }
    }
    assert.deepEqual(errors, []);
    results.push({ name, width, height, canvasSize, level, reducedMotion, errors });
    console.log('PASS', name);
    await page.close();
  }
  await writeFile(output + '/browser-check.json', JSON.stringify({ scope: useWorkbench ? 'Actual shared renderer in fixed-frame dev workbench' : 'Actual shared renderer in viewport-sized development fixture; not authenticated full-board E2E or physical-phone performance', results }, null, 2) + '\n');
} finally {
  await browser.close();
}
