import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';
import {
  findNewVaultIslandCollectionEntry,
  isVaultIslandCollectionUnlocked,
  resolveVaultIslandCollection,
  resolveVaultIslandWealthDisplay,
  VAULT_ISLAND_COLLECTION_TREASURE_IDS,
} from '../islandRunVaultCollection';

export const islandRunVaultCollectionTests: TestCase[] = [
  {
    name: 'unlocks the special Vault Island only after the Island 004 mission is complete',
    run: () => {
      assertEqual(isVaultIslandCollectionUnlocked(undefined), false, 'a fresh journey has no Vault Island access');
      assertEqual(isVaultIslandCollectionUnlocked({
        '0:4': {
          missionId: 'broken-causeway', version: 1, claimedPickupTileIndices: [1, 8],
          chargesEarned: 2, chargesSpent: 2, activatedStages: 1, lastActivatedStage: 1,
          completedAtMs: null, updatedAtMs: 20,
        },
      }), false, 'partial Island 004 mission progress keeps the vault hidden');
      assertEqual(isVaultIslandCollectionUnlocked({
        '0:6': {
          missionId: 'moon-mirrors', version: 1, claimedPickupTileIndices: [2, 10, 18, 26, 35],
          chargesEarned: 5, chargesSpent: 5, activatedStages: 5, lastActivatedStage: 5,
          completedAtMs: 60, updatedAtMs: 60,
        },
      }), false, 'completing a different island mission cannot unlock the vault');
      assertEqual(isVaultIslandCollectionUnlocked({
        '2:4': {
          missionId: 'broken-causeway', version: 1, claimedPickupTileIndices: [1, 8, 11, 20, 26, 35],
          chargesEarned: 6, chargesSpent: 6, activatedStages: 3, lastActivatedStage: 3,
          completedAtMs: 400, updatedAtMs: 400,
        },
      }), true, 'a completed Island 004 mission remains valid across journey cycles');
    },
  },
  {
    name: 'starts with an empty eight-case museum when no Vault Rush reward has been claimed',
    run: () => {
      const result = resolveVaultIslandCollection(undefined);
      assertDeepEqual(result.unlockedTreasureIds, [], 'no claims unlock no relics');
      assertEqual(result.collectionSize, 8, 'the authored museum has eight displays');
      assertEqual(result.remainingCount, 8, 'all displays remain to be filled');
      assertEqual(result.nextTreasureId, 'crown', 'the first collection target is deterministic');
    },
  },
  {
    name: 'maps canonical money holdings into bounded visual reserve tiers',
    run: () => {
      assertDeepEqual(
        resolveVaultIslandWealthDisplay(-40),
        { holdingsValue: 0, tier: 'empty', ingotsPerStack: 0, looseCoinCount: 0, stackGemCount: 0, looseGemCount: 0 },
        'an empty wallet creates no fake wealth pile',
      );
      assertEqual(resolveVaultIslandWealthDisplay(499).tier, 'starter', 'small holdings use the starter reserve');
      assertEqual(resolveVaultIslandWealthDisplay(500).tier, 'growing', '500 money advances to growing');
      assertEqual(resolveVaultIslandWealthDisplay(2_500).tier, 'abundant', '2500 money advances to abundant');
      const legendary = resolveVaultIslandWealthDisplay(1_000_000_000);
      assertEqual(legendary.tier, 'legendary', 'large wallets use the highest presentation tier');
      assertEqual(legendary.ingotsPerStack, 28, 'ingot geometry remains bounded');
      assertEqual(legendary.looseCoinCount, 64, 'coin geometry remains bounded');
      assertEqual(legendary.looseGemCount, 12, 'gem geometry remains bounded');
    },
  },
  {
    name: 'identifies only a genuinely new distinct-island relic for the reveal ceremony',
    run: () => {
      assertDeepEqual(
        findNewVaultIslandCollectionEntry({ '3': 4 }, { '3': 4, '7': 1 }),
        { treasureId: 'compass', sourceIslandNumber: 7, accessionNumber: 'VI-007-02' },
        'a first claim on a new island unlocks the next authored relic',
      );
      assertEqual(
        findNewVaultIslandCollectionEntry({ '3': 1 }, { '3': 2 }),
        null,
        'a repeat claim on the same island does not launch a duplicate relic ceremony',
      );
      assertEqual(
        findNewVaultIslandCollectionEntry(
          { '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1 },
          { '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1, '9': 1 },
        ),
        null,
        'later claims do not overfill the authored eight-case room',
      );
    },
  },
  {
    name: 'unlocks one ordered relic per distinct qualifying island rather than per repeated claim',
    run: () => {
      const result = resolveVaultIslandCollection({ '12': 5, '3': 2, '7': 1 });
      assertDeepEqual(result.qualifyingIslandNumbers, [3, 7, 12], 'source islands are numeric and stable');
      assertDeepEqual(result.unlockedTreasureIds, ['crown', 'compass', 'obelisk'], 'relic order is canonical');
      assertDeepEqual(result.entries, [
        { treasureId: 'crown', sourceIslandNumber: 3, accessionNumber: 'VI-003-01' },
        { treasureId: 'compass', sourceIslandNumber: 7, accessionNumber: 'VI-007-02' },
        { treasureId: 'obelisk', sourceIslandNumber: 12, accessionNumber: 'VI-012-03' },
      ], 'each relic retains its source island for future museum labels');
      assertEqual(result.unlockedCount, 3, 'five claims on one island still create one museum relic');
      assertEqual(result.nextTreasureId, 'egg', 'the next empty case has a stable identity');
    },
  },
  {
    name: 'sanitizes malformed ledger entries and caps the visible museum at eight relics',
    run: () => {
      const result = resolveVaultIslandCollection({
        '0': 1,
        'bad': 3,
        '2': Number.NaN,
        '1': 1,
        '3': 1,
        '4': 1,
        '5': 1,
        '6': 1,
        '7': 1,
        '8': 1,
        '9': 1,
        '10': 1,
      });
      assertDeepEqual(result.unlockedTreasureIds, [...VAULT_ISLAND_COLLECTION_TREASURE_IDS], 'all authored relics unlock in order');
      assertEqual(result.unlockedCount, 8, 'the visual collection never exceeds its authored case count');
      assertEqual(result.qualifyingIslandNumbers.length, 9, 'later qualifying islands remain visible to progression analytics');
      assertEqual(result.remainingCount, 0, 'a complete museum has no empty displays');
      assertEqual(result.nextTreasureId, null, 'a complete museum has no next relic');
    },
  },
  {
    name: 'keeps the production board and modal read-only at the gameplay boundary',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const modalSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/VaultIslandCollectionModal.tsx', 'utf8');
      const giftModalSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/VaultIslandGiftUnlockModal.tsx', 'utf8');
      const giftModalCss = fsMod.readFileSync('src/features/gamification/level-worlds/components/VaultIslandGiftUnlockModal.css', 'utf8');
      const labSource = fsMod.readFileSync('src/dev/VaultIslandLab.tsx', 'utf8');
      const focusTrapSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/useVaultModalFocusTrap.ts', 'utf8');
      assert(boardSource.includes('resolveVaultIslandCollection(runtimeState.vaultRushClaimsByIsland)'), 'the board derives ownership from the canonical claim ledger');
      assert(boardSource.includes('isVaultIslandCollectionUnlocked(runtimeState.signatureMissionProgressByIsland)'), 'the board derives Vault Island access from the canonical Island 004 mission ledger');
      assert(boardSource.includes('showVaultIslandCollection && isVaultIslandUnlocked'), 'the fullscreen collection has no pre-unlock render path');
      assert(boardSource.includes('className="island-run-prototype__vault-island-floating"'), 'the earned circular Vault Island launcher is mounted beside the compass controls');
      assert(boardSource.includes('findNewVaultIslandCollectionEntry('), 'the canonical claim result is compared before launching a relic ceremony');
      assert(boardSource.includes('unlockedTreasureIds={vaultIslandCollection.unlockedTreasureIds}'), 'the board passes only presentation ownership into the modal');
      assert(boardSource.includes('collectionEntries={vaultIslandCollection.entries}'), 'the board passes canonical relic provenance into the museum');
      assert(boardSource.includes('holdingsValue={runtimeState.essence}'), 'the room receives the canonical money balance as read-only presentation data');
      assert(boardSource.includes("initialView={vaultIslandFeaturedTreasure ? 'vault' : undefined}"), 'a new relic opens directly in the museum');
      assert(boardSource.includes('setShowVaultIslandGiftUnlock(true)'), 'Island 004 completion stages the dedicated gift reveal');
      assert(boardSource.includes('<VaultIslandGiftUnlockModal'), 'the board mounts the Vault Island gift reveal');
      assert(boardSource.includes('setShowVaultIslandCollection(true)'), 'the gift reveal hands off to the real Vault Island collection');
      assert(modalSource.includes('lockFullscreenPageScroll'), 'the fullscreen modal locks background scrolling');
      assert(giftModalSource.includes('createPortal'), 'the unlock reveal renders in the viewport portal');
      assert(giftModalSource.includes('lockFullscreenPageScroll'), 'the unlock reveal locks background scrolling');
      assert(giftModalSource.includes('<CelebrationFireworks'), 'the unlock reveal uses the shared premium fireworks');
      assert(giftModalSource.includes('vault-island-gift-unlock__spotlight-launcher'), 'the new permanent launcher is spotlighted in place');
      assert(giftModalCss.includes('@media (prefers-reduced-motion: reduce)'), 'the reveal has a reduced-motion treatment');
      assert(modalSource.includes('useVaultModalFocusTrap'), 'the collection traps focus inside its fullscreen dialog');
      assert(giftModalSource.includes('useVaultModalFocusTrap'), 'the gift reveal traps focus inside its fullscreen dialog');
      assert(focusTrapSource.includes("event.key !== 'Tab'"), 'the shared focus trap handles keyboard tab wrapping');
      assert(focusTrapSource.includes('previouslyFocused?.focus()'), 'the shared focus trap restores the launcher focus on close');
      assert(labSource.includes('Collection register mode'), 'WebGL failure preserves a readable museum register');
      assert(labSource.includes('Next relic'), 'the fallback register can browse every owned treasure without 3D hit targets');
      assert(!modalSource.includes('persistIslandRunRuntimeStatePatch'), 'the collection modal cannot write gameplay state');
      assert(!modalSource.includes('claimVaultRushReward'), 'the collection modal cannot grant its own rewards');
      assert(!giftModalSource.includes('persistIslandRunRuntimeStatePatch'), 'the gift reveal cannot write gameplay state');
      assert(!giftModalSource.includes('activateStagedRestorationMissionStage'), 'the gift reveal cannot complete its own mission');
    },
  },
];
