import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] || '');
const playCeremony = process.argv.includes('--play-ceremony');
assert.ok(process.argv[2] && !existsSync(out), 'Supply a new evidence directory');
const origin = process.env.ISLAND004_CAPTURE_ORIGIN || 'http://127.0.0.1:5176';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Loopback only');
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
mkdirSync(out, { recursive: true });
const report = { status: 'running', scope: playCeremony ? 'offline real-board ceremony preparation, reveal, cancel/resume, actual guided game and ticket grant; not physical-device acceptance' : 'offline real-board puzzle HUD and mission identity; not ceremony, wheel callback or physical-device acceptance', cases: [], errors: [], externalRequestsBlocked: 0 };
const browser = await chromium.launch({ headless: true,
  executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  for (const fixture of [
    { island: 1, gradual: true, puzzle: false },
    { island: 2, gradual: true, puzzle: false, mission: 'Host the First Games' },
    { island: 3, gradual: true, puzzle: true },
    { island: 4, gradual: true, puzzle: true, mission: 'The Great Re-Docking' },
    { island: 2, gradual: false, puzzle: true, mission: 'The Great Re-Docking' },
  ].filter(fixture => !(playCeremony || process.argv.includes('--ceremony-only')) || (fixture.gradual && fixture.island === 2))) {
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
      await page.evaluate(async ({ island, gradual, playCeremony }) => {
        const { createDemoSession } = await import('/src/services/demoSession.ts');
        const { readIslandRunGameStateRecord, writeIslandRunGameStateRecord } = await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
        const { createOpeningGamesCampaignLedger } = await import('/src/features/gamification/level-worlds/services/islandRunSignatureMissions.ts');
        const { createOpeningGamesCeremonyProgress, OPENING_GAMES_CEREMONY_KEY } = await import('/src/features/gamification/level-worlds/services/islandRunOpeningGames.ts');
        const { ensureIslandRunContractV2ActiveTimedEvent } = await import('/src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts');
        const ledger = gradual ? createOpeningGamesCampaignLedger() : {};
        if (gradual && island >= 3) ledger[OPENING_GAMES_CEREMONY_KEY] = { ...createOpeningGamesCeremonyProgress(), rollsCompleted:12,venuesPreparedAtMs:1,teamsWelcomedAtMs:2,beaconLitAtMs:3,completedAtMs:4 };
        if (playCeremony) ledger[OPENING_GAMES_CEREMONY_KEY] = { ...createOpeningGamesCeremonyProgress(), rollsCompleted:12 };
        const session = createDemoSession();
        const initial = { ...readIslandRunGameStateRecord(session), ...ensureIslandRunContractV2ActiveTimedEvent({ state: readIslandRunGameStateRecord(session), nowMs: Date.now() }).state };
        const result = await writeIslandRunGameStateRecord({ session, client: null,
          triggerSource: 'isolated_feature_introduction_qa', record: {
            ...initial, currentIslandNumber: island, cycleIndex: 0, essence: 1000, dicePool: 100,
            firstRunClaimed: true, firstSessionTutorialState: 'complete', onboardingDisplayNameLoopCompleted: true,
            welcomePackClaimed: true, welcomePackRewardBundleClaimed: true, storyPrologueSeen: true,
            audioEnabled: false, musicEnabled: false, sfxEnabled: false,
            islandStartedAtMs: Date.now(), activeStopIndex: 0, activeStopType: 'hatchery',
            stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
            stopBuildStateByIndex: (playCeremony ? [3,3,1,0,0] : [1,1,1,1,1]).map(buildLevel => ({ buildLevel, requiredEssence: 100, spentEssence: buildLevel ? 100 : 0 })),
            signatureMissionProgressByIsland: ledger,
          } });
        if (!result.ok) throw Error('Fixture write failed');
        localStorage.setItem(`island_run_landmark_coachmark_seen_${session.user.id}`, '1');
      }, { ...fixture, playCeremony });
      await page.goto(origin + '/dev/island-art-preview?islandRunQa=1&island3dQuality=low&disableDiscoveryFog=1');
      // Cold Vite module loading can exceed the interaction timeout on this
      // large preview. Keep the longer allowance limited to initial startup.
      await page.locator('canvas[aria-label^="Interactive 3D"]').first().waitFor({ state: 'visible', timeout: 180000 });
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
        if (playCeremony) {
          const read = () => page.evaluate(async () => {
            const { createDemoSession } = await import('/src/services/demoSession.ts');
            const { readIslandRunGameStateRecord } = await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
            const { resolveOpeningGamesCeremony } = await import('/src/features/gamification/level-worlds/services/islandRunOpeningGames.ts');
            const state = readIslandRunGameStateRecord(createDemoSession());
            return { ceremony: resolveOpeningGamesCeremony(state.signatureMissionProgressByIsland), tickets: state.minigameTicketsByEvent, event: state.activeTimedEvent, dice: state.dicePool };
          });
          const before = await read();
          assert.equal(await page.getByRole('button', { name: /^Reward progress\./ }).count(),0,'bar hidden before beacon');
          await dialog.getByRole('button', { name:'Open ceremony preparations', exact:true }).click();
          const ceremony = page.getByRole('dialog', { name:'Opening ceremony', exact:true });
          await ceremony.getByRole('button', { name:'Prepare ceremony venues', exact:true }).click();
          await ceremony.getByRole('button', { name:'Welcome the teams', exact:true }).click();
          const scrollLocked = await page.evaluate(() => [getComputedStyle(document.body).overflow, getComputedStyle(document.documentElement).overflow].includes('hidden'));
          assert.ok(scrollLocked,'ceremony locks background scrolling');
          await page.screenshot({path:path.join(out,'ceremony-ready.png')});
          await ceremony.getByRole('button', { name:'Light the opening beacon', exact:true }).click();
          await page.getByRole('button', { name:/^Reward progress\./ }).waitFor({state:'visible'});
          const firstGame = () => page.getByRole('button', { name:'Open first games · Free guided round', exact:true });
          await firstGame().waitFor({state:'visible'});
          await page.screenshot({path:path.join(out,'beacon-reveal.png')});
          await firstGame().click();
          await ceremony.getByRole('button', {name:'Play first game · Free',exact:true}).click();
          await ceremony.getByRole('button', {name:'Close Signal Path',exact:true}).click();
          await ceremony.waitFor({state:'hidden'});
          assert.equal((await read()).ceremony.completedAtMs,null,'closing does not complete ceremony');
          assert.deepEqual((await read()).tickets,before.tickets,'closing grants no tickets');
          await firstGame().click();
          await ceremony.getByRole('button', {name:'Play first game · Free',exact:true}).click();
          await ceremony.getByRole('button', {name:'Light the first beacon',exact:true}).waitFor({state:'visible'});
          const pending = (await read()).ceremony.activeAttemptId;
          assert.ok(pending,'attempt persisted');
          await page.reload();
          await firstGame().click();
          await ceremony.getByRole('button', {name:'Resume first game · Free',exact:true}).click();
          assert.equal((await read()).ceremony.activeAttemptId,pending,'reload resumes same attempt');
          await ceremony.getByRole('button', {name:'Light the first beacon',exact:true}).click();
          await page.screenshot({path:path.join(out,'guided-first-game.png')});
          const finishRound = ceremony.getByRole('button', {name:'Open the arena games',exact:true});
          for(let cell=0;cell<25;cell++) {
            if (await finishRound.isVisible()) break;
            try { await ceremony.locator('[data-signal-cell].is-hinted').click({timeout:5000}); }
            catch (error) { if (await finishRound.isVisible()) break; throw error; }
          }
          await finishRound.click();
          await ceremony.getByRole('heading', {name:'The games are open!',exact:true}).waitFor({state:'visible'});
          const after=await read();
          assert.ok(after.ceremony.completedAtMs!==null,'actual game completed ceremony');
          assert.equal(after.event.eventId,before.event.eventId,'same active global event');
          assert.equal(after.tickets[after.event.eventId],(before.tickets[after.event.eventId]??0)+3,'one starter bundle');
          assert.equal(after.dice,before.dice,'tutorial did not spend dice');
          await page.screenshot({path:path.join(out,'ceremony-complete.png')});
          await ceremony.getByRole('button', {name:'Return to the island',exact:true}).click();
          await page.reload();
          await page.getByRole('button', {name:/^Reward progress\./}).waitFor({state:'visible'});
          assert.equal(await firstGame().count(),0,'ordinary event icon replaces introduction');
          assert.deepEqual((await read()).tickets,after.tickets,'reload cannot duplicate grant');
          report.ceremony = { completed:true, resumedAttempt:true, cancelledWithoutReward:true, starterTickets:3, unchangedEventId:after.event.eventId };
        }
      }
      report.cases.push({ ...fixture, puzzleCount, status: 'pass' });
      console.log(`PASS ${name}`);
    } catch (error) {
      const page = context.pages()[0];
      if (page) {
        await page.screenshot({ path: path.join(out, `${name}-failure.png`) });
        writeFileSync(path.join(out, `${name}-failure.txt`), await page.locator('body').innerText());
      }
      throw error;
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
