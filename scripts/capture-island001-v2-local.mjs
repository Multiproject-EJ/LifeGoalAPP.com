import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const prefix = process.argv[2];
const mode = process.argv[3] || 'hatchery';
const phone = process.argv.includes('--phone');
const single = process.argv.includes('--single');
const level = Number(process.argv.find(value => value.startsWith('--level='))?.split('=')[1] ?? 3);
if (!/^[a-z0-9-]+$/.test(prefix ?? '')) throw Error('Provide an immutable capture prefix');
if (!['hatchery','habit','wisdom','event','surface','hall','hall-hero'].includes(mode) || ![0,1,2,3].includes(level)) throw Error('Invalid review mode/level');
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
});
try {
  const page = await browser.newPage({ viewport: { width: phone ? 390 : 1440, height: phone ? 844 : 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => console.error('PAGE ERROR', error.message));
  const url = `http://127.0.0.1:53282/island001-assembly-review.html?mode=${mode}&capture=${prefix}&level=${level}${phone ? '&phone=1' : ''}`;
  await page.goto(`${url}${single ? '' : '&clay=1'}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Save capture', exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Save capture', exact: true }).click();
  await page.getByRole('button', { name: 'Capture saved', exact: true }).waitFor();
  if (!single) {
  await page.getByRole('button', { name: 'Save orbit', exact: true }).click();
  await page.getByRole('button', { name: 'Saved 360/360', exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Save structural views', exact: true }).click();
  await page.getByRole('button', { name: 'Saved normals', exact: true }).waitFor({ timeout: 60000 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Save capture', exact: true }).click();
  await page.getByRole('button', { name: 'Capture saved', exact: true }).waitFor();
  }
  console.log(JSON.stringify({ prefix, mode, level, browser: browser.version(), frames: single ? 1 : 17, source: 'actual browser canvas; same review-page cameras and capture controls' }));
} finally { await browser.close(); }
