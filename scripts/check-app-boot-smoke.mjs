#!/usr/bin/env node
/**
 * check-app-boot-smoke — headless "does the app boot?" guard.
 *
 * Loads the built app in a real browser and fails if the first paint produces
 * console errors / uncaught exceptions, or if the app shell never mounts. This
 * is a regression net for the class of "blank/white screen on load" bugs the
 * project has hit before (see docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md).
 *
 * Intentionally dependency-light and CI-safe: it **skips with exit 0** when the
 * pieces it needs aren't present, so it never breaks a pipeline that doesn't
 * provide a browser:
 *   - `playwright-core` is not installed            -> skip
 *   - no Chromium under PLAYWRIGHT_BROWSERS_PATH     -> skip
 *   - dist/ has not been built yet                   -> skip (run `npm run build`)
 *
 * To run locally:
 *   npm run build
 *   npm i -D playwright-core        # if not already present
 *   npm run check:app-boot
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.SMOKE_PORT || 4179);
const BOOT_WAIT_MS = 4000;

function skip(reason) {
  console.log(`SKIP check:app-boot — ${reason}`);
  process.exit(0);
}

function fail(reason) {
  console.error(`FAIL check:app-boot — ${reason}`);
  process.exit(1);
}

function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return null;
  for (const entry of readdirSync(root)) {
    if (!entry.startsWith('chromium-')) continue;
    const candidate = path.join(root, entry, 'chrome-linux', 'chrome');
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

if (!existsSync(path.resolve('dist/index.html'))) {
  skip('dist/ not built — run `npm run build` first');
}

const chromiumPath = findChromium();
if (!chromiumPath) {
  skip('no Chromium found under PLAYWRIGHT_BROWSERS_PATH');
}

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  skip('playwright-core is not installed (npm i -D playwright-core to enable)');
}

const url = `http://localhost:${PORT}/`;
const viteBin = path.resolve('node_modules/vite/bin/vite.js');
const preview = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: false,
});

let browser;
let exitCode = 0;
try {
  const up = await waitForServer(url, 20000);
  if (!up) fail(`preview server did not come up on ${url}`);

  const errors = [];
  browser = await chromium.launch({ executablePath: chromiumPath, args: ['--no-sandbox'] });
  const page = await browser.newPage({
    viewport: { width: 414, height: 896 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(BOOT_WAIT_MS);

  const shell = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      mounted: !!root && root.children.length > 0,
      textLen: (document.body.innerText || '').trim().length,
    };
  });

  if (!shell.mounted || shell.textLen < 20) {
    fail(`app shell did not render (mounted=${shell.mounted}, textLen=${shell.textLen})`);
  }

  await page.getByRole('button', { name: 'Start Your Game', exact: true }).click();
  await page.getByRole('button', { name: /Play as guest/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
  await page.waitForTimeout(BOOT_WAIT_MS);

  const islandRunLoaded = await page.getByRole('button', { name: 'Exit Island Run', exact: true }).count();
  if (islandRunLoaded !== 1) {
    fail(`guest Island Run did not open (matching exit controls=${islandRunLoaded})`);
  }
  if (errors.length > 0) {
    fail(`boot or guest entry produced ${errors.length} error(s):\n${errors.join('\n')}`);
  }
  console.log(`PASS check:app-boot — app and guest Island Run booted clean (${shell.textLen} chars rendered, 0 errors)`);
} catch (err) {
  exitCode = 1;
  console.error(`FAIL check:app-boot — ${err?.message || err}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  try { preview.kill('SIGTERM'); } catch { /* noop */ }
}

process.exit(exitCode);
