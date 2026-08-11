import {
  createIslandRunCreatureArenaBattle,
  getIslandRunArenaShieldPickupCount,
  getIslandRunCreatureArenaBattleConfig,
  ISLAND_RUN_ARENA_MAX_FOCUS,
  ISLAND_RUN_ARENA_MAX_SHIELDS,
  resolveIslandRunCreatureArenaTurn,
  selectIslandRunArenaShieldPickupTiles,
  type IslandRunArenaBattleState,
} from '../islandRunCreatureArenaBattle';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

function requireBattle(islandNumber = 5, shieldCharges = 3): IslandRunArenaBattleState {
  const battle = createIslandRunCreatureArenaBattle({
    islandNumber,
    opponentCreatureId: islandNumber === 5 ? 'rare-crown-drifter' : `arena-creature-${islandNumber}`,
    shieldCharges,
    encounterSeed: 42,
  });
  assert(battle !== null, `Island ${islandNumber} should create an arena battle`);
  return battle as IslandRunArenaBattleState;
}

function opponentDamage(result: ReturnType<typeof resolveIslandRunCreatureArenaTurn>): number {
  const event = result.events.find((candidate) => candidate.type === 'opponent_attack');
  return event?.type === 'opponent_attack' ? event.damage : 0;
}

export const islandRunCreatureArenaBattleTests: TestCase[] = [
  {
    name: 'creates battles only for the 24 every-fifth-island arenas',
    run: () => {
      const arenas = Array.from({ length: 120 }, (_, index) => index + 1)
        .filter((islandNumber) => getIslandRunCreatureArenaBattleConfig(islandNumber) !== null);
      assertEqual(arenas.length, 24, 'exactly 24 islands should own creature battles');
      assertEqual(arenas[0], 5, 'Island 005 is the first creature arena');
      assertEqual(arenas[23], 120, 'Island 120 is the final creature arena');
      assertEqual(createIslandRunCreatureArenaBattle({ islandNumber: 4, opponentCreatureId: 'x', shieldCharges: 3 }), null, 'ordinary islands cannot create creature battles');
    },
  },
  {
    name: 'scales opponent durability and damage without changing the player baseline',
    run: () => {
      const first = getIslandRunCreatureArenaBattleConfig(5);
      const last = getIslandRunCreatureArenaBattleConfig(120);
      assert(first !== null && last !== null, 'arena configs should exist');
      assertEqual(first?.playerMaxHp, 100, 'player baseline is 100 HP');
      assertEqual(last?.playerMaxHp, 100, 'late islands keep the readable 100 HP baseline');
      assert((last?.opponentMaxHp ?? 0) > (first?.opponentMaxHp ?? 0), 'later opponents gain durability');
      assert((last?.opponentPowerDamage ?? 0) > (first?.opponentPowerDamage ?? 0), 'later charged attacks become more dangerous');
    },
  },
  {
    name: 'initial state is deterministic and clamps island-bound shields to three',
    run: () => {
      const first = createIslandRunCreatureArenaBattle({ islandNumber: 5, opponentCreatureId: 'rare-crown-drifter', shieldCharges: 99, encounterSeed: 812 });
      const second = createIslandRunCreatureArenaBattle({ islandNumber: 5, opponentCreatureId: 'rare-crown-drifter', shieldCharges: 99, encounterSeed: 812 });
      assertDeepEqual(first, second, 'same encounter seed should reproduce the exact opening state');
      assertEqual(first?.player.shieldCharges, ISLAND_RUN_ARENA_MAX_SHIELDS, 'battle shields clamp to the island-bound cap');
      assertEqual(first?.turnNumber, 1, 'battle opens on turn one');
      assertEqual(first?.phase, 'awaiting_command', 'battle opens ready for one command');
    },
  },
  {
    name: 'charged attacks always telegraph for a full turn before release',
    run: () => {
      const charging = { ...requireBattle(), opponentIntent: 'charge_power' as const };
      const telegraph = resolveIslandRunCreatureArenaTurn(charging, 'focus');
      assertEqual(telegraph.accepted, true, 'focus command should resolve');
      assert(telegraph.events.some((event) => event.type === 'opponent_charge'), 'charge turn emits an animation-ready telegraph event');
      assertEqual(telegraph.state.opponentIntent, 'release_power', 'the next command can respond to the announced power attack');
      assertEqual(telegraph.state.player.hp, charging.player.hp, 'charging itself deals no hidden damage');

      const release = resolveIslandRunCreatureArenaTurn(telegraph.state, 'shield');
      const attack = release.events.find((event) => event.type === 'opponent_attack');
      assert(attack?.type === 'opponent_attack', 'release emits one opponent attack event');
      assertEqual(attack?.type === 'opponent_attack' ? attack.intent : null, 'release_power', 'the announced attack is the one that resolves');
      assertEqual(attack?.type === 'opponent_attack' ? attack.mitigation : null, 'shield', 'the player can answer the telegraph with a shield');
    },
  },
  {
    name: 'guard reduces damage and a spent shield reduces it much further',
    run: () => {
      const base = { ...requireBattle(), opponentIntent: 'heavy_attack' as const };
      const unprotected = resolveIslandRunCreatureArenaTurn(base, 'focus');
      const guarded = resolveIslandRunCreatureArenaTurn(base, 'guard');
      const shielded = resolveIslandRunCreatureArenaTurn(base, 'shield');
      assert(opponentDamage(guarded) < opponentDamage(unprotected), 'guard should materially reduce incoming damage');
      assert(opponentDamage(shielded) < opponentDamage(guarded), 'limited shields should be stronger than free guard');
      assertEqual(shielded.state.player.shieldCharges, base.player.shieldCharges - 1, 'shield charge is consumed exactly once');
    },
  },
  {
    name: 'power attacks require focus while quick attacks build it to a safe cap',
    run: () => {
      const start = { ...requireBattle(), opponentIntent: 'guard' as const };
      const rejected = resolveIslandRunCreatureArenaTurn(start, 'power_attack');
      assertEqual(rejected.accepted, false, 'power attack is rejected without focus');
      assertEqual(rejected.rejection, 'insufficient_focus', 'rejection explains the missing resource');
      assertEqual(rejected.state, start, 'rejected commands do not mutate or advance the battle');

      let state: IslandRunArenaBattleState = start;
      for (let index = 0; index < 5; index += 1) {
        const result = resolveIslandRunCreatureArenaTurn({ ...state, opponentIntent: 'guard' }, 'quick_attack');
        state = { ...result.state, phase: 'awaiting_command', opponent: { ...result.state.opponent, hp: result.state.opponent.maxHp } };
      }
      assertEqual(state.player.focus, ISLAND_RUN_ARENA_MAX_FOCUS, 'quick attacks cannot overfill focus');
      const powered = resolveIslandRunCreatureArenaTurn(state, 'power_attack');
      assertEqual(powered.accepted, true, 'power attack becomes available after focus is earned');
      assertEqual(powered.state.player.focus, ISLAND_RUN_ARENA_MAX_FOCUS - 2, 'power attack spends exactly two focus');
    },
  },
  {
    name: 'a killing player attack resolves before the opponent can deal damage',
    run: () => {
      const base = requireBattle();
      const lethalState: IslandRunArenaBattleState = {
        ...base,
        opponent: { ...base.opponent, hp: 1 },
        opponentIntent: 'release_power',
      };
      const result = resolveIslandRunCreatureArenaTurn(lethalState, 'quick_attack');
      assertEqual(result.state.phase, 'victory', 'lethal attack wins the battle');
      assertEqual(result.state.player.hp, lethalState.player.hp, 'defeated opponent cannot land a late hit');
      assert(!result.events.some((event) => event.type === 'opponent_attack'), 'no impact event is emitted after victory');
      assert(result.events.some((event) => event.type === 'battle_victory'), 'victory event is ready for celebration sequencing');
    },
  },
  {
    name: 'health clamps at zero and terminal battles reject duplicate resolution',
    run: () => {
      const base = requireBattle();
      const vulnerable: IslandRunArenaBattleState = {
        ...base,
        player: { ...base.player, hp: 1 },
        opponentIntent: 'release_power',
      };
      const defeat = resolveIslandRunCreatureArenaTurn(vulnerable, 'focus');
      assertEqual(defeat.state.player.hp, 0, 'damage never drives health negative');
      assertEqual(defeat.state.phase, 'defeat', 'zero health ends the battle');
      const duplicate = resolveIslandRunCreatureArenaTurn(defeat.state, 'quick_attack');
      assertEqual(duplicate.accepted, false, 'finished battle cannot resolve twice');
      assertEqual(duplicate.rejection, 'battle_finished', 'terminal rejection is explicit');
      assertEqual(duplicate.state, defeat.state, 'terminal rejection preserves the exact state object');
    },
  },
  {
    name: 'identical command replay produces identical states and animation events',
    run: () => {
      const play = () => {
        let state = requireBattle(5, 3);
        const turns = [];
        for (const action of ['quick_attack', 'guard', 'focus', 'power_attack'] as const) {
          const result = resolveIslandRunCreatureArenaTurn(state, action);
          turns.push(result);
          if (!result.accepted || result.state.phase !== 'awaiting_command') break;
          state = result.state;
        }
        return turns;
      };
      assertDeepEqual(play(), play(), 'save/restore replay can reproduce both mechanics and presentation events');
    },
  },
  {
    name: 'shield pickup plans are deterministic, topology-supplied, unique, and capped at three',
    run: () => {
      assertEqual(getIslandRunArenaShieldPickupCount(5), 3, 'Island 005 demonstrates the full shield affordance');
      assertEqual(getIslandRunArenaShieldPickupCount(10), 2, 'Island 010 has two pickups');
      assertEqual(getIslandRunArenaShieldPickupCount(15), 1, 'Island 015 has one pickup');
      assertEqual(getIslandRunArenaShieldPickupCount(20), 0, 'some arenas intentionally have no pickups');
      const eligible = [2, 4, 7, 9, 12, 18, 23, 31];
      const first = selectIslandRunArenaShieldPickupTiles({ islandNumber: 5, eligibleTileIndices: eligible });
      const second = selectIslandRunArenaShieldPickupTiles({ islandNumber: 5, eligibleTileIndices: eligible });
      assertDeepEqual(first, second, 'same canonical eligible set produces the same placement');
      assertEqual(first.length, ISLAND_RUN_ARENA_MAX_SHIELDS, 'placement respects the three-charge cap');
      assertEqual(new Set(first).size, first.length, 'one tile cannot hold two shield pickups');
      assert(first.every((tileIndex) => eligible.includes(tileIndex)), 'selector never invents or steals a tile outside the supplied set');
      assertDeepEqual(selectIslandRunArenaShieldPickupTiles({ islandNumber: 6, eligibleTileIndices: eligible }), [], 'ordinary islands receive no arena shields');
    },
  },
];
