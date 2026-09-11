import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const prefix = process.argv[2], mode = process.argv[3] ?? 'surface';
if (!/^[a-z0-9-]+$/.test(prefix ?? '') || !['surface','hall','hall-hero'].includes(mode)) throw Error('Provide capture prefix and world view');
const browser = await chromium.launch({ headless: true, executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.stack));
  await page.goto(`http://127.0.0.1:53282/island001-assembly-review.html?mode=${mode}&capture=${prefix}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Save mission sequence', exact: true }).click({ timeout: 60000 });
  await page.getByRole('button', { name: 'Saved 10/10 at 13.4s', exact: true }).waitFor({ timeout: 60000 });
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({prefix, mode, frames:14, browser:browser.version(), errors}));
} finally { await browser.close(); }
