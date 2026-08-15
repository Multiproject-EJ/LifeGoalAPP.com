import {
  getIslandRunArenaCreatureSlot,
  ISLAND_RUN_ARENA_CREATURE_COUNT,
  isIslandRunArenaIsland,
  resolveIslandRunArenaCreatureMotion,
  shouldPresentIslandRunArenaCreature,
} from '../islandRunArenaCreaturePresentation';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunArenaCreaturePresentationTests: TestCase[] = [
  {
    name: 'derives exactly 24 creature arenas from the canonical 120-island journey',
    run: () => {
      assertEqual(ISLAND_RUN_ARENA_CREATURE_COUNT, 24, '120 / 5 must yield 24 creature arenas');
      const arenaIslands = Array.from({ length: 120 }, (_, index) => index + 1).filter(isIslandRunArenaIsland);
      assertEqual(arenaIslands.length, 24, 'every fifth island and only every fifth island should host an arena creature');
      assertEqual(arenaIslands[0], 5, 'the first arena creature should appear on Island 005');
      assertEqual(arenaIslands[23], 120, 'the final arena creature should appear on Island 120');
      assertEqual(getIslandRunArenaCreatureSlot(5), 0, 'Island 005 owns arena slot zero');
      assertEqual(getIslandRunArenaCreatureSlot(120), 23, 'Island 120 owns arena slot twenty-three');
      assertEqual(getIslandRunArenaCreatureSlot(2), null, 'ordinary islands must not consume an arena-creature slot');
    },
  },
  {
    name: 'keeps Crown Drifter present from Island 005 opening without changing later arena reveal gates',
    run: () => {
      const opening = resolveIslandRunArenaCreatureMotion({ islandNumber: 5, bossBuildLevel: 0, elapsedSeconds: 0 });
      assertEqual(opening.mode, 'roaming', 'Island 005 should open with Crown Drifter already floating in the world');
      assertEqual(opening.visible, true, 'Island 005 Crown Drifter must remain visible at canonical Boss build Level 0');
      assertEqual(opening.emergenceProgress, 1, 'the opening creature should not replay a below-ground reveal');
      assertEqual(shouldPresentIslandRunArenaCreature(5, 0), true, 'only Island 005 receives the always-present pilot exception');
      assertEqual(shouldPresentIslandRunArenaCreature(10, 0), false, 'Island 010 must keep the ordinary build reveal rule');
      const emerging = resolveIslandRunArenaCreatureMotion({ islandNumber: 10, bossBuildLevel: 1, elapsedSeconds: 0.8 });
      assertEqual(emerging.mode, 'emerging', 'later arenas should still stage the creature from Boss Level 1');
      assert(emerging.emergenceProgress > 0 && emerging.emergenceProgress < 1, 'Level-1 emergence should be visibly staged');
      assertEqual(resolveIslandRunArenaCreatureMotion({ islandNumber: 1, bossBuildLevel: 3, elapsedSeconds: 12 }).visible, false, 'non-arena islands stay creature-free');
    },
  },
  {
    name: 'roams deterministically and occasionally follows the player direction',
    run: () => {
      const roaming = resolveIslandRunArenaCreatureMotion({ islandNumber: 5, bossBuildLevel: 1, elapsedSeconds: 8, tokenPosition: [3.4, 0.4, 0] });
      const followTime = 19.85;
      const followTarget: readonly [number, number, number] = [3.4, 0.4, 0];
      const sameMomentWithoutPlayer = resolveIslandRunArenaCreatureMotion({ islandNumber: 5, bossBuildLevel: 1, elapsedSeconds: followTime });
      const following = resolveIslandRunArenaCreatureMotion({ islandNumber: 5, bossBuildLevel: 1, elapsedSeconds: followTime, tokenPosition: followTarget });
      assertEqual(roaming.mode, 'roaming', 'ordinary cycle time should use the inner arena route');
      assertEqual(following.mode, 'following', 'the occasional follow window should target the player direction');
      const baselineDistance = Math.hypot(
        followTarget[0] - sameMomentWithoutPlayer.position[0],
        followTarget[2] - sameMomentWithoutPlayer.position[2],
      );
      const followingDistance = Math.hypot(
        followTarget[0] - following.position[0],
        followTarget[2] - following.position[2],
      );
      assert(followingDistance < baselineDistance, 'follow phase should carry the creature closer to the player-side ring');
      assertDeepEqual(
        resolveIslandRunArenaCreatureMotion({ islandNumber: 5, bossBuildLevel: 1, elapsedSeconds: 19.85, tokenPosition: [3.4, 0.4, 0] }),
        following,
        'presentation motion should remain deterministic for screenshots and replay',
      );
    },
  },
];
