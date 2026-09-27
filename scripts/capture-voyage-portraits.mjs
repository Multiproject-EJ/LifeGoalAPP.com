#!/usr/bin/env node
/**
 * Voyage Map island portraits.
 *
 * Renders each authored 3D island through the dev island-art preview, takes
 * the game's own clean overview snapshot (the Island Complete backdrop), crops
 * it square and saves a small WebP at
 *   public/assets/islands/island-NNN/map/voyage-portrait.webp
 * The manifest (services/islandVoyagePortraits.json) records a fingerprint of
 * each island's 3D world source files; the island-run tests fail when an
 * island has a 3D world but no portrait, or its world changed since capture.
 *
 * Usage (dev server running on :5190):
 *   npm run island-portraits                 # all authored islands
 *   npm run island-portraits -- --islands 3,7
 *   npm run island-portraits -- --base http://127.0.0.1:5173
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MANIFEST = join(ROOT, 'src/features/gamification/level-worlds/services/islandVoyagePortraits.json');
const ROUTING = join(ROOT, 'src/features/gamification/level-worlds/services/islandRun3DWorldRouting.ts');
const DEV_DIR = join(ROOT, 'src/features/gamification/level-worlds/dev');

const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const base = argValue('--base') ?? 'http://127.0.0.1:5190';

/** runtime island -> world source, from the canonical routing table. */
export function readWorldRoutes() {
  const text = readFileSync(ROUTING, 'utf8');
  const routes = new Map();
  for (const match of text.matchAll(/runtimeIslandNumber:\s*(\d+),\s*worldSourceNumber:\s*(\d+)/g)) {
    routes.set(Number(match[1]), Number(match[2]));
  }
  // Multi-line route objects.
  for (const match of text.matchAll(/runtimeIslandNumber:\s*(\d+),\s*\n[^}]*?worldSourceNumber:\s*(\d+)/g)) {
    routes.set(Number(match[1]), Number(match[2]));
  }
  if (/presentationStatus:\s*'placeholder'/.test(text)) {
    for (const match of text.matchAll(/runtimeIslandNumber:\s*(\d+)[^}]*presentationStatus:\s*'placeholder'/g)) routes.delete(Number(match[1]));
  }
  return routes;
}

/** Same rule as the island-run test: the world's own dev modules, shared pilot excluded. */
export function worldFingerprint(runtimeIsland, sourceIsland) {
  const pattern = new RegExp(`^Island0*${sourceIsland}(?![0-9])`);
  const files = readdirSync(DEV_DIR)
    .filter((name) => pattern.test(name) && !/^Island5ThreePilot/.test(name))
    .sort();
  const hash = createHash('sha256');
  hash.update(`route:${runtimeIsland}->${sourceIsland}\n`);
  for (const name of files) hash.update(`${name}\n`).update(readFileSync(join(DEV_DIR, name)));
  return hash.digest('hex').slice(0, 16);
}

async function main() {
  const routes = readWorldRoutes();
  const requested = argValue('--islands');
  const islands = requested
    ? requested.split(',').map(Number).filter((n) => routes.has(n))
    : [...routes.keys()].sort((a, b) => a - b);
  const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  for (const island of islands) {
    const nnn = String(island).padStart(3, '0');
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    try {
      await page.goto(`${base}/dev/island-art-preview?islandVisualPreview=1&islandVisualIsland=${island}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('canvas.island-5-three-pilot__canvas', { timeout: 180000 });
      await page.waitForTimeout(12000);
      for (let i = 0; i < 30; i += 1) {
        const state = await page.evaluate(() => {
          if (!document.querySelector('.wpm-overlay, .wpm-issue-play')) return 'gone';
          const button = document.querySelector('.wpm-collect-btn') || [...document.querySelectorAll('.wpm-overlay button')].find((b) => !b.disabled);
          button?.click();
          return 'busy';
        });
        if (state === 'gone') break;
        await page.waitForTimeout(2000);
      }
      await page.evaluate(() => document.querySelector('[aria-controls="island-run-topbar-menu"]')?.click());
      await page.waitForTimeout(1200);
      await page.evaluate(() => [...document.querySelectorAll('#island-run-topbar-menu button')].find((b) => /Preview island celebration/.test(b.textContent))?.click());
      await page.waitForSelector('img.island-clear-celebration__island', { timeout: 180000 });
      const webp = await page.evaluate(async () => {
        const src = document.querySelector('img.island-clear-celebration__island').src;
        const image = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = src; });
        const side = Math.round(Math.min(image.width, image.height) * 0.96);
        const sx = Math.round((image.width - side) / 2);
        const sy = Math.round(image.height * 0.51 - side / 2);
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        canvas.getContext('2d').drawImage(image, sx, Math.max(0, sy), side, side, 0, 0, 256, 256);
        return canvas.toDataURL('image/webp', 0.82);
      });
      const dir = join(ROOT, `public/assets/islands/island-${nnn}/map`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'voyage-portrait.webp'), Buffer.from(webp.split(',')[1], 'base64'));
      manifest.portraits[String(island)] = {
        path: `/assets/islands/island-${nnn}/map/voyage-portrait.webp`,
        worldSource: routes.get(island),
        worldFingerprint: worldFingerprint(island, routes.get(island)),
        capturedAt: new Date().toISOString().slice(0, 10),
      };
      console.log(`island ${nnn}: portrait saved`);
    } catch (error) {
      console.error(`island ${nnn}: capture failed — ${error.message}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
