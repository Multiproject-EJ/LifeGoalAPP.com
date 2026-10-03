import { assert, type TestCase } from './testHarness';

async function read(path: string): Promise<string> {
  // @ts-ignore
  const fs = await import('fs');
  return fs.readFileSync(path, 'utf8') as string;
}

export const island006FixesTests: TestCase[] = [
  {
    name: 'Island 006 fishing: landing on a rod tile starts the cast sequence (no stuck "It got away!")',
    run: async () => {
      const board = await read('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      const landing = board.slice(board.indexOf('} else if (rollResult.fishermansVillagePendingCatch) {'));
      const block = landing.slice(0, landing.indexOf('setShowFishermansFishing(true);'));
      assert(block.includes("setFishingPhase('approach');"), 'landing path sets the approach phase before opening the HUD');
      assert(block.includes('setFishingSessionCatchKind('), 'landing path records the catch kind');
      assert(board.includes("if (!showFishermansFishing || !fishermansFishingProgress.pendingCatch || fishingPhase !== 'off') return undefined;"),
        'an open session with a catch on the line self-heals out of the off phase');
    },
  },
  {
    name: 'Island 006 Hoist pad: release reads live progress, a tap teaches the gesture, the beam never covers the hint',
    run: async () => {
      const pads = await read('src/features/gamification/level-worlds/components/BuildStylePads.tsx');
      const stack = pads.slice(pads.indexOf('export function StackBuildPad('), pads.indexOf('/* ── Rhythm'));
      assert(stack.includes('stackReleaseLocks(progressRef.current)'), 'Enter/Space and drags use the live progress');
      assert(stack.includes('setNudge('), 'a plain tap nudges instead of doing nothing');
      assert(stack.includes('bsp-stack__cue') && stack.includes('bsp-stack__rail'), 'visible cue + rail-anchored beam');
      const css = await read('src/features/gamification/level-worlds/components/build-style-pads.css');
      assert(css.includes('.bsp-stack__rail { position: relative; width: 100%; }'), 'rail is the beam positioning context');
    },
  },
  {
    name: 'Egg warmth toast waits for loading screens to clear',
    run: async () => {
      const host = await read('src/features/gamification/level-worlds/components/EggWarmthToastHost.tsx');
      assert(host.includes('.island-5-three-pilot__loading') && host.includes('LOADING_SCREEN_SELECTOR'), 'deferred past the world loading screen');
    },
  },
  {
    name: 'Island 006 polish: readable minigame loading title, Boss Blitz card copy, no honey pot on the clear signal',
    run: async () => {
      const launcher = await read('src/features/gamification/level-worlds/components/IslandRunMinigameLauncher.tsx');
      assert(launcher.includes("<h3 style={{ marginTop: 0, color: '#fff4cf' }}>"), 'loading title has an explicit light colour');
      const board = await read('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      assert(!board.includes('fire on the beat') && board.includes('your ship fires automatically'), 'boss card describes the shooter controls');
      const phone = await read('src/features/gamification/level-worlds/components/IslandMissionBriefingModal.tsx');
      assert(phone.includes("{variant === 'living-compass' || milestoneCount > 0 ? ("), 'honey pot only on milestone missions');
    },
  },
];
