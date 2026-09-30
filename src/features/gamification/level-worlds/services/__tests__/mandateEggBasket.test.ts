import { assert, assertEqual, type TestCase } from './testHarness';
import { ARENA_GAMES_CALL, buildMandateEggBasket, MANDATE_EGG_BASKET_HATCH_MS } from '../mandateEggBasket';
import { areAllEggSlotsTerminalForIsland, getEggSlotLedgerKey } from '../islandRunEggMania';

export const mandateEggBasketTests: TestCase[] = [
  {
    name: 'mandate basket: three gifted eggs in free slots beside the Hatchery slot, never gating the island',
    run: () => {
      const own = { tier: 'common' as const, setAtMs: 1, hatchAtMs: 2, status: 'collected' as const };
      const basket = buildMandateEggBasket({ perIslandEggs: { [getEggSlotLedgerKey(1, 0)]: own, [getEggSlotLedgerKey(1, 1)]: own }, islandNumber: 1, nowMs: 100 });
      const keys = Object.keys(basket);
      assertEqual(keys.join(','), [2, 3, 4].map((slot) => getEggSlotLedgerKey(1, slot)).join(','), 'taken slots are skipped; slot 0 stays free');
      assertEqual(Object.values(basket).map((egg) => egg.tier).join(','), 'rare,common,common', '1 rare, 2 common');
      assertEqual(basket[keys[0]].hatchAtMs, 100 + MANDATE_EGG_BASKET_HATCH_MS.rare, 'rare hatches later');
      assert(Object.values(basket).every((egg) => egg.gift === 'mandate-basket' && egg.location === 'spaceship'), 'gifts that travel with the player');
      const ledger = { [getEggSlotLedgerKey(1, 0)]: own, ...basket };
      assert(areAllEggSlotsTerminalForIsland(ledger, 1), 'incubating gifts do not block "collect or sell all Hatchery eggs"');
      assert(!areAllEggSlotsTerminalForIsland(basket, 1), 'gifts alone never stand in for the island’s own egg');
    },
  },
  {
    name: 'mandate basket: eggs fly into the egg column, then the Mission Phone rings for the Arena Games',
    run: async () => {
      assertEqual(ARENA_GAMES_CALL.title, "Get ready, it's time to kick off the Arena Games", 'the call says it');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes("if (result.status === 'ok') mandateBasketPendingRef.current = true;"), 'only a fresh signature plays the basket');
      assert(board.includes('<MandateEggBasketOverlay onDone={handleMandateBasketDone} />'), 'the basket plays');
      assert(board.includes('setArenaGamesCallId(id);') && board.includes('island-run-mission-call-banner'), 'then the phone rings');
      const overlay = fsMod.readFileSync('src/features/gamification/level-worlds/components/MandateEggBasketOverlay.tsx', 'utf8');
      assert(overlay.includes(".island-run-board__rewardbar-hatchery-tray") && overlay.includes('useControllerShopScrollLock()'), 'eggs aim at the egg column; scroll locked');
    },
  },
];
