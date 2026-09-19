import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] || '');
assert.ok(process.argv[2] && !existsSync(out), 'Supply a new evidence directory');
const origin = process.env.ISLAND004_CAPTURE_ORIGIN || 'http://127.0.0.1:5176';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Loopback only');
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
mkdirSync(out, { recursive: true });
const report = { status: 'running', scope: 'offline real-board puzzle HUD and mission identity; not ceremony, wheel callback or physical-device acceptance', cases: [], errors: [], externalRequestsBlocked: 0 };
const browser = await chromium.launch({ headless: true,
  executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  for (const fixture of [
    { island: 1, gradual: true, puzzle: false },
    { island: 2, gradual: true, puzzle: false, mission: 'Host the First Games' },
    { island: 3, gradual: true, puzzle: true },
    { island: 4, gradual: true, puzzle: true, mission: 'The Great Re-Docking' },
    { island: 2, gradual: false, puzzle: true, mission: 'The Great Re-Docking' },
  ].filter(fixture => !process.argv.includes('--ceremony-only') || (fixture.gradual && fixture.island === 2))) {
    const name = `${fixture.gradual ? 'new' : 'legacy'}-${fixture.island}`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
    try {
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
        report.externalRequestsBlocked++;
        return route.abort();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      page.on('pageerror', error => report.errors.push(`${name}: ${error}`));
      await page.goto(origin + '/docs/gauntlets/island-004-v2/gallery.html');
      await page.evaluate(async ({ island, gradual }) => {
        const { createDemoSession } = await import('/src/services/demoSession.ts');
        const { readIslandRunGameStateRecord, writeIslandRunGameStateRecord } = await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
        const { createOpeningGamesCampaignLedger } = await import('/src/features/gamification/level-worlds/services/islandRunSignatureMissions.ts');
        const session = createDemoSession();
        const initial = readIslandRunGameStateRecord(session);
        const result = await writeIslandRunGameStateRecord({ session, client: null,
          triggerSource: 'isolated_feature_introduction_qa', record: {
            ...initial, currentIslandNumber: island, cycleIndex: 0, essence: 1000, dicePool: 100,
            firstRunClaimed: true, firstSessionTutorialState: 'complete', onboardingDisplayNameLoopCompleted: true,
            welcomePackClaimed: true, welcomePackRewardBundleClaimed: true, storyPrologueSeen: true,
            audioEnabled: false, musicEnabled: false, sfxEnabled: false,
            islandStartedAtMs: Date.now(), activeStopIndex: 0, activeStopType: 'hatchery',
            stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
            stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ buildLevel: 1, requiredEssence: 100, spentEssence: 100 })),
            signatureMissionProgressByIsland: gradual ? createOpeningGamesCampaignLedger() : {},
          } });
        if (!result.ok) throw Error('Fixture write failed');
        localStorage.setItem(`island_run_landmark_coachmark_seen_${session.user.id}`, '1');
      }, fixture);
      await page.goto(origin + '/dev/island-art-preview?islandRunQa=1&island3dQuality=low&disableDiscoveryFog=1');
      await page.locator('canvas[aria-label^="Interactive 3D"]').first().waitFor({ state: 'visible' });
      await page.waitForTimeout(1500);
      const puzzleCount = await page.getByRole('button', { name: 'Sticker album', exact: true }).count();
      assert.equal(puzzleCount, fixture.puzzle ? 1 : 0, `${name}: puzzle launcher eligibility`);
      assert.equal(await page.getByRole('dialog', { name: 'Traffic light bonus coin flip', exact: true }).count(), 0, 'no unsolicited traffic modal');
      await page.screenshot({ path: path.join(out, `${name}-board.png`) });
      if (fixture.mission) {
        await page.getByRole('button', { name: new RegExp(`^Open Island ${String(fixture.island).padStart(3, '0')} mission tracker`) }).click();
        const dialog = page.getByRole('dialog').filter({ hasText: fixture.mission });
        await dialog.waitFor({ state: 'visible' });
        if (fixture.gradual && fixture.island === 2) {
          const objectiveLabels = ['Prepare the Venues', 'Build Landmarks', 'Complete Landmarks'];
          for (const label of objectiveLabels) await dialog.getByText(label, { exact: true }).waitFor({ state: 'visible' });
          const layout = await dialog.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
          });
          assert.ok(layout.x >= 0 && layout.y >= 0 && layout.x + layout.width <= layout.viewportWidth + 1 && layout.y + layout.height <= layout.viewportHeight + 1, 'mission phone stays inside the viewport');
        }
        await page.screenshot({ path: path.join(out, `${name}-mission.png`) });
      }
      report.cases.push({ ...fixture, puzzleCount, status: 'pass' });
      console.log(`PASS ${name}`);
    } finally { await context.close(); }
  }
  assert.equal(report.errors.length, 0, 'no uncaught browser errors');
  report.status = 'pass';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  await browser.close();
  writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
}
