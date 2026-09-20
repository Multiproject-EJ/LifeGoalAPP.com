import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] || '');
const playCeremony = process.argv.includes('--play-ceremony');
const showFrames = process.argv.includes('--show-frames');
const quietShow = process.argv.includes('--quiet-show');
const palaceBuilt = process.argv.includes('--palace-built');
const checkWelcome = process.argv.includes('--welcome-check-in');
const checkOrientation = process.argv.includes('--orientation');
assert.ok(process.argv[2] && !existsSync(out), 'Supply a new evidence directory');
const origin = process.env.ISLAND004_CAPTURE_ORIGIN || 'http://127.0.0.1:5176';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Loopback only');
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
mkdirSync(out, { recursive: true });
const report = { status: 'running', scope: playCeremony ? 'offline real-board ceremony preparation, reveal, cancel/resume, actual guided game and ticket grant; not physical-device acceptance' : 'offline real-board puzzle HUD and mission identity; not ceremony, wheel callback or physical-device acceptance', cases: [], errors: [], externalRequestsBlocked: 0 };
if (showFrames) report.scope = 'actual normal renderer at controlled Date.now ceremony beats, real RAF/timers; automatic reveal only, not game flow or physical-device timing';
const browser = await chromium.launch({ headless: true,
  executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
if (checkWelcome) report.scope = 'offline real-board welcome check-in, next ticket, reload and legacy/004 Hatchery preservation; not first-session or physical-device acceptance';
if (checkOrientation) report.scope = 'offline real-board Island001 host orientation, incorrect answers, close/reopen and saved completion; not full first-session or physical-device acceptance';
try {
  for (const fixture of [
    { island: 1, gradual: true, puzzle: false },
    { island: 2, gradual: true, puzzle: false, mission: 'Host the First Games' },
    { island: 3, gradual: true, puzzle: true },
    { island: 4, gradual: true, puzzle: true, mission: 'The Great Re-Docking' },
    { island: 2, gradual: false, puzzle: true, mission: 'The Great Re-Docking' },
  ].filter(fixture => checkOrientation ? fixture.gradual && fixture.island === 1 : !(playCeremony || process.argv.includes('--ceremony-only')) || (fixture.gradual && fixture.island === 2))) {
    const name = `${fixture.gradual ? 'new' : 'legacy'}-${fixture.island}`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
      reducedMotion: playCeremony && !quietShow ? 'no-preference' : 'reduce', serviceWorkers: 'block' });
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
      await page.evaluate(async ({ island, gradual, playCeremony, palaceBuilt, checkOrientation }) => {
        const { createDemoSession } = await import('/src/services/demoSession.ts');
        const { readIslandRunGameStateRecord, writeIslandRunGameStateRecord } = await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
        const { createOpeningGamesCampaignLedger } = await import('/src/features/gamification/level-worlds/services/islandRunSignatureMissions.ts');
        const { createOpeningGamesCeremonyProgress, OPENING_GAMES_CEREMONY_KEY } = await import('/src/features/gamification/level-worlds/services/islandRunOpeningGames.ts');
        const { ensureIslandRunContractV2ActiveTimedEvent } = await import('/src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts');
        const { getIslandNarrativeDefinition } = await import('/src/features/gamification/level-worlds/narrative/islandNarrativeRegistry.ts');
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
            stopStatesByIndex: Array.from({ length: 5 }, (_,index) => ({ objectiveComplete: checkOrientation && index < 2, buildComplete: false })),
            ...(checkOrientation ? { completedStopsByIsland:{'1':['hatchery','habit']},stopTicketsPaidByIsland:{'1':[1,2]},activeStopIndex:2,activeStopType:'mystery' } : {}),
            // A returning, partially completed Island001 fixture, not a
            // first-session narrative test. Avoid replaying every old build
            // reaction when those first two activities are seeded complete.
            ...(checkOrientation ? {narrativeSeenState:{beats:Object.fromEntries((getIslandNarrativeDefinition(1)?.beats ?? []).map(beat=>[beat.id,Date.now()])),episodes:{}}} : {}),
            stopBuildStateByIndex: (palaceBuilt ? [3,3,3,3,3] : playCeremony ? [3,3,1,0,0] : [1,1,1,1,1]).map(buildLevel => ({ buildLevel, requiredEssence: 100, spentEssence: buildLevel ? 100 : 0 })),
            signatureMissionProgressByIsland: ledger,
          } });
        if (!result.ok) throw Error('Fixture write failed');
        localStorage.setItem(`island_run_landmark_coachmark_seen_${session.user.id}`, '1');
      }, { ...fixture, playCeremony, palaceBuilt, checkOrientation });
      await page.goto(origin + '/dev/island-art-preview?islandRunQa=1&island3dQuality=low&disableDiscoveryFog=1');
      // Cold Vite module loading can exceed the interaction timeout on this
      // large preview. Keep the longer allowance limited to initial startup.
      await page.locator('canvas[aria-label^="Interactive 3D"]').first().waitFor({ state: 'visible', timeout: 180000 });
      await page.waitForTimeout(1500);
      const puzzleCount = await page.getByRole('button', { name: 'Sticker album', exact: true }).count();
      assert.equal(puzzleCount, fixture.puzzle ? 1 : 0, `${name}: puzzle launcher eligibility`);
      assert.equal(await page.getByRole('dialog', { name: 'Traffic light bonus coin flip', exact: true }).count(), 0, 'no unsolicited traffic modal');
      await page.screenshot({ path: path.join(out, `${name}-board.png`) });
      if (checkOrientation) {
        const read = () => page.evaluate(async () => {
          const {createDemoSession}=await import('/src/services/demoSession.ts');
          const {readIslandRunGameStateRecord}=await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
          const state=readIslandRunGameStateRecord(createDemoSession());
          return {stops:state.stopStatesByIndex,tickets:state.minigameTicketsByEvent,paid:state.stopTicketsPaidByIsland,eggs:state.perIslandEggs,dice:state.dicePool,essence:state.essence};
        });
        const orientation=page.getByRole('dialog',{name:'Arena orientation',exact:true});
        const open=async()=>{
          const story=page.getByRole('button',{name:'Return to the island',exact:true});
          if(await story.isVisible()) await story.click();
          if(!await orientation.isVisible()) {
            const orbit=page.getByRole('button',{name:/^Host Orientation —/});
            if(await orbit.isVisible()) await orbit.click();
            // Actual lower-right event venue observed in orientation-ui-v001.
            // The real 3D board hides its 2D orbit controls.
            else await page.mouse.click(346,445);
          }
          await orientation.waitFor({state:'visible'});
        };
        await open();
        const before=await read();
        assert.equal(before.stops[2].objectiveComplete,false,'opening does not complete orientation');
        const layout=await orientation.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,portal:el.parentElement.parentElement===document.body,locked:[getComputedStyle(document.body).overflow,getComputedStyle(document.documentElement).overflow].includes('hidden')};});
        assert.ok(layout.portal&&layout.locked&&layout.x>=0&&layout.y>=0&&layout.right<=layout.w+1&&layout.bottom<=layout.h+1,'viewport portal and scroll lock');
        await orientation.getByRole('button',{name:'Start the arena games now',exact:true}).click();
        assert.equal((await read()).stops[2].objectiveComplete,false,'incorrect answer earns nothing');
        await orientation.getByRole('button',{name:'Build landmarks',exact:true}).click();
        await page.screenshot({path:path.join(out,'orientation-question.png')});
        await orientation.getByRole('button',{name:'Close arena orientation',exact:true}).click();
        assert.equal((await read()).stops[2].objectiveComplete,false,'closing earns nothing');
        await page.reload();
        await page.locator('canvas[aria-label^="Interactive 3D"]').first().waitFor({state:'visible',timeout:180000});
        await open();
        await orientation.getByRole('button',{name:'Build landmarks',exact:true}).click();
        await orientation.getByRole('button',{name:'Island 002 · The opening ceremony',exact:true}).click();
        await orientation.getByRole('heading',{name:'Ready for the journey',exact:true}).waitFor({state:'visible'});
        const after=await read();
        assert.equal(after.stops[2].objectiveComplete,true,'real answers persist completion');
        assert.equal(after.stops[3].objectiveComplete,false,'Wisdom not auto-completed');
        for(const key of ['tickets','paid','eggs','dice','essence']) assert.deepEqual(after[key],before[key],`${key} unchanged`);
        await page.screenshot({path:path.join(out,'orientation-complete.png')});
        await orientation.getByRole('button',{name:'Continue exploring',exact:true}).click();
        await page.reload();
        await page.locator('canvas[aria-label^="Interactive 3D"]').first().waitFor({state:'visible',timeout:180000});
        await open();
        await orientation.getByRole('heading',{name:'Ready for the journey',exact:true}).waitFor({state:'visible'});
        assert.deepEqual((await read()).tickets,before.tickets,'reload cannot give early tickets');
      }
      if (checkWelcome) {
        const read = () => page.evaluate(async () => {
          const { createDemoSession } = await import('/src/services/demoSession.ts');
          const { readIslandRunGameStateRecord } = await import('/src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
          const state = readIslandRunGameStateRecord(createDemoSession());
          return { stops:state.stopStatesByIndex, eggs:state.perIslandEggs, essence:state.essence, dice:state.dicePool, tickets:state.stopTicketsPaidByIsland };
        });
        if (fixture.gradual && fixture.island < 4) {
          const welcome = page.getByRole('dialog', {name:'Welcome venue',exact:true});
          const openWelcome = async () => {
            if (!await welcome.isVisible()) {
              const orbitButton=page.getByRole('button',{name:/^Welcome Venue —/});
              if (await orbitButton.isVisible()) await orbitButton.click();
              else if (fixture.island===2) {
                // Observed in welcome-ui-v002/new-2-failure.png: 3D mode
                // hides the 2D orbit buttons. Tap the actual rear-left venue.
                await page.mouse.click(65,340);
              } else throw Error('No verified 3D welcome target for this fixture');
            }
            await welcome.waitFor({state:'visible'});
          };
          await openWelcome();
          const before=await read();
          assert.equal(before.stops[0].objectiveComplete,false,'building did not complete check-in');
          assert.equal(await welcome.getByText(/set.*egg/i).count(),0,'no early egg prompt');
          const layout=await welcome.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,portal:el.parentElement.parentElement===document.body,locked:[getComputedStyle(document.body).overflow,getComputedStyle(document.documentElement).overflow].includes('hidden')};});
          assert.ok(layout.portal && layout.locked && layout.x>=0 && layout.y>=0 && layout.right<=layout.w+1 && layout.bottom<=layout.h+1,'centered viewport portal and scroll lock');
          await page.screenshot({path:path.join(out,`${name}-welcome.png`)});
          await welcome.getByRole('button',{name:'Check in · Free',exact:true}).click();
          await welcome.getByRole('heading',{name:'You’re checked in!',exact:true}).waitFor({state:'visible'});
          const after=await read();
          assert.equal(after.stops[0].objectiveComplete,true,'check-in saved');
          for(const key of ['eggs','essence','dice','tickets']) assert.deepEqual(after[key],before[key],`${key} unchanged`);
          await page.screenshot({path:path.join(out,`${name}-checked-in.png`)});
          await welcome.getByRole('button',{name:'Continue exploring',exact:true}).click();
          await page.reload();
          await page.locator('canvas[aria-label^="Interactive 3D"]').first().waitFor({state:'visible',timeout:180000});
          await openWelcome();
          await welcome.getByRole('heading',{name:'You’re checked in!',exact:true}).waitFor({state:'visible'});
          assert.equal(await welcome.getByRole('button',{name:'Check in · Free',exact:true}).count(),0,'no replay award');
          assert.deepEqual((await read()).eggs,before.eggs,'reload creates no egg');
          await welcome.getByRole('button',{name:'Continue exploring',exact:true}).click();
          const final=await read();
          assert.equal(final.stops[1].objectiveComplete,false,'next activity is not auto-completed');
          assert.deepEqual(final.tickets,before.tickets,'next ticket not prepaid');
        } else {
          assert.equal(await page.getByRole('button',{name:/^Welcome Venue —/}).count(),0,'legacy/004 keeps Hatchery');
          assert.equal(await page.getByRole('dialog',{name:'Welcome venue',exact:true}).count(),0,'not replaced with early activity');
        }
      }
      // The welcome run owns check-in/reload evidence. A queued narrative can
      // legitimately claim attention after closing it; mission-phone coverage
      // is exercised separately without clicking through that story overlay.
      if (fixture.mission && !checkWelcome) {
        await page.getByRole('button', { name: new RegExp(`^Open Island ${String(fixture.island).padStart(3, '0')} mission tracker`) }).click();
        const dialog = page.getByRole('dialog').filter({ hasText: fixture.mission });
        await dialog.waitFor({ state: 'visible' });
        if (fixture.gradual && fixture.island === 2) {
          const objectiveLabels = ['Prepare the Venues', 'Build Landmarks', 'Complete Landmarks'];
          for (const label of objectiveLabels) await dialog.getByText(label, { exact: true }).waitFor({ state: 'visible' });
          // The phone enters from outside the viewport in normal-motion mode.
          // Check its settled layout, not the first visible animation frame.
          const missionHandle = await dialog.elementHandle();
          await page.waitForFunction(el => { const r=el.getBoundingClientRect();
            return r.x>=0 && r.y>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1;
          }, missionHandle);
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
          // Captures may take longer than an entire show on a busy host. For
          // the separate visual run, freeze Date only; real RAF/timers and the
          // production renderer keep running. Do not claim real-time FPS here.
          const showStartedAt = Date.now();
          if (showFrames) await page.clock.setFixedTime(showStartedAt);
          await ceremony.getByRole('button', { name:'Light the opening beacon', exact:true }).click();
          const show = page.getByRole('dialog', { name:'First Games opening show', exact:true });
          await show.waitFor({state:'visible'});
          assert.equal(await page.getByRole('button', { name: /^Reward progress\./ }).count(),0,'bar withheld until show ends');
          assert.equal(await page.getByRole('button', { name: 'Open first games · Free guided round', exact:true }).count(),0,'first game withheld until show ends');
          await page.screenshot({path:path.join(out,'opening-show.png')});
          const afterBeacon = await read();
          assert.ok(afterBeacon.ceremony.beaconLitAtMs,'beacon persisted before animation');
          assert.equal(afterBeacon.ceremony.completedAtMs,null,'show does not replace participation');
          assert.deepEqual(afterBeacon.tickets,before.tickets,'show itself grants nothing');
          if (showFrames) {
            await page.clock.setFixedTime(showStartedAt + (quietShow ? 600 : 3200));
            await page.waitForTimeout(500);
            await page.screenshot({path:path.join(out,'opening-beacon.png')});
            await page.clock.setFixedTime(showStartedAt + (quietShow ? 900 : 6500));
          }
          await page.waitForFunction(quiet => document.querySelector('canvas[aria-label^="Interactive 3D"]')?.dataset.openingCeremonyPhase === (quiet ? 'introduction' : 'celebration'), quietShow);
          await page.waitForTimeout(1600);
          await page.screenshot({path:path.join(out,'opening-fireworks.png')});
          if (showFrames) await page.clock.setFixedTime(showStartedAt + (quietShow ? 1800 : 12000));
          else await show.getByRole('button', {name:'Skip animation',exact:true}).click();
          await show.waitFor({state:'hidden'});
          assert.deepEqual((await read()).tickets,before.tickets,'skip grants nothing');
          await page.getByRole('button', { name:/^Reward progress\./ }).waitFor({state:'visible'});
          const firstGame = () => page.getByRole('button', { name:'Open first games · Free guided round', exact:true });
          await firstGame().waitFor({state:'visible'});
          await page.waitForTimeout(1400);
          await page.screenshot({path:path.join(out,'beacon-reveal.png')});
          if (showFrames) {
            report.ceremonyFrames = { automaticReveal: true, quietShow, palaceBuilt, controlledDate: true, grantsNothing: true };
            report.cases.push({ ...fixture, puzzleCount, status:'pass' });
            console.log(`PASS ${name} controlled ceremony frames`);
            continue;
          }
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
          const targetTransform = await ceremony.locator('[data-signal-cell].is-hinted').evaluate(el => getComputedStyle(el).transform);
          assert.equal(targetTransform, 'none', 'introductory target glows without moving its tap area');
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
