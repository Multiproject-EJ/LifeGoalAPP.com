import {
  shouldRenderActiveStopModal,
  shouldRenderFirstRunCelebration,
  shouldRenderPerfectCompanionHint,
} from '../islandRunModalVisibility';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunModalVisibilityTests: TestCase[] = [
  {
    name: 'body-portaled Island Run popups stay in the viewport and above the game layer',
    run: async () => {
      // A popup the board counts as open but the player cannot see hides the
      // controller and disables the Shop, which reads as a frozen game.
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const levelWorldsCss = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      const mapCss = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunSolarMapOverlay.css', 'utf8');
      const appCss = fsMod.readFileSync('src/index.css', 'utf8');
      const gameLayerZ = Number(/\.level-worlds-entry-modal \{[^}]*z-index: (\d+)/.exec(appCss)?.[1]);
      const portalZ = Number(/body > \.island-run-overlay-root\.island-stop-modal-backdrop \{\s*z-index: (\d+)/.exec(levelWorldsCss)?.[1]);
      assert(gameLayerZ > 0 && portalZ > gameLayerZ, 'Shop and Bonus Encounter portals render above the game layer');
      assert(boardSource.includes('{showShopPanel && typeof document !== \'undefined\' && createPortal(')
        && boardSource.includes('{showEncounterModal && typeof document !== \'undefined\' ? createPortal(('), 'Shop and Bonus Encounter are body portals covered by that rule');
      assert(/\.island-run-solar-map-overlay \{\s*position: fixed;\s*inset: 0;/.test(mapCss), 'the Island Map root is a viewport-anchored overlay');
      const craterCss = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandAssemblyCraterModal.css', 'utf8');
      const craterZ = Number(/\.assembly-v2-overlay\{[^}]*z-index:var\(--island-run-mission-overlay-z,(\d+)\)/.exec(craterCss)?.[1]);
      assert(craterZ > gameLayerZ, 'the Island 001 Assembly Crater mission renders above the game layer');
      const eggRevealCss = fsMod.readFileSync('src/features/gamification/level-worlds/components/EggBatchReveal.css', 'utf8');
      const eggRevealZ = Number(/\.egg-card-stack \{[^}]*z-index: (\d+)/.exec(eggRevealCss)?.[1]);
      assert(eggRevealZ > gameLayerZ, 'hatched creature cards render above the game layer');
      assert(/\.island-run-board__topbar-menu-panel \{\s*max-height:[^;]+;\s*overflow-y: auto;/.test(levelWorldsCss), 'the board menu scrolls so Exit Island Run stays reachable');
    },
  },
  {
    name: 'arrival story outranks first-run and active-stop modals',
    run: () => {
      assertEqual(shouldRenderFirstRunCelebration({
        requested: true,
        storyReaderOpen: true,
      }), false, 'first-run celebration should wait behind story');
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true,
        storyReaderOpen: true,
        firstRunCelebrationOpen: true,
      }), false, 'active stop should wait behind story and first-run setup');
    },
  },
  {
    name: 'active stop appears after story and first-run setup close',
    run: () => {
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true,
        storyReaderOpen: false,
        firstRunCelebrationOpen: false,
      }), true, 'active stop should render when higher-priority modals are closed');
    },
  },
  {
    name: 'companion hint waits for hatch reveal and creature card',
    run: () => {
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: true,
        creatureCardOpen: false,
      }), false, 'hint should wait behind hatch reveal');
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: false,
        creatureCardOpen: true,
      }), false, 'hint should wait behind creature card');
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: false,
        creatureCardOpen: false,
      }), true, 'hint should appear after reveal surfaces close');
    },
  },
  {
    name: 'the Mission Phone never stacks on a landmark modal: the stop waits behind it and returns when the phone closes',
    run: async () => {
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true, storyReaderOpen: false, firstRunCelebrationOpen: false, missionPhoneOpen: true,
      }), false, 'hidden while the phone is open');
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true, storyReaderOpen: false, firstRunCelebrationOpen: false, missionPhoneOpen: false,
      }), true, 'back once the phone closes');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('missionPhoneOpen: Boolean(activeMissionBriefing) || showMissionPhoneBriefing,'), 'the board passes the phone state');
    },
  },
  {
    name: 'the Vault Casino owns the screen: no mission banner or board chrome over it (QA Island 003)',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const block = board.slice(board.indexOf('const doesModalOwnAttention = Boolean('), board.indexOf('walletPanelOriginRect !== null,'));
      assert(block.includes('activeVaultCasinoPlay !== null ||'), 'Vault Casino counts as a screen-owning modal');
      assert(board.includes('{incomingMissionBriefing && showMissionMessageBanner && !doesModalOwnAttention ?'), 'the banner waits for it');
    },
  },
  {
    name: 'dev money grant refreshes the board state so the top bar shows it immediately (QA Island 003)',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const handler = board.slice(board.indexOf('const handleDevGrantEssence = useCallback('), board.indexOf('const handleDevSpeedHatchEgg = useCallback('));
      assert(handler.includes('setRuntimeState(result.record);') && handler.includes('runtimeStateRef.current = result.record;'), 'grant updates the rendered wallet');
    },
  },
  {
    name: 'Frostwell: every spin and its drilling are watched to the end, then the view returns to the island',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandFrostwellMissionModal.tsx', 'utf8');
      assert(!modal.includes('Finish animation') && !modal.includes('Finish and return to island'), 'no skip buttons during the drilling');
      assert(modal.includes("{busy ? null : <button className=\"frostwell-v2__close\"") && modal.includes('const close = () => { if (!busyRef.current) onClose(); };')
        && modal.includes("if (event.key === 'Escape' && !busyRef.current) onClose();"), 'no close, backdrop tap or Escape while busy');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const effect = board.slice(board.indexOf('const frostwellPreviousPhaseRef = useRef('), board.indexOf('}, [closeFrostwellMission, frostwellPresentationBuilt, frostwellSequence.phase]);'));
      assert(effect.includes("if (frostwellSequence.phase !== 'complete' || previous === 'complete' || previous === 'ready') return;")
        && effect.includes("closeFrostwellMission();\n    setBuildCameraFocusRequest({ preset: 'overview', transition: 'standard' });"), 'after the drilling the camera returns to the island');
    },
  },
  {
    name: 'Boss modal: "landmarks incomplete" only when a landmark is really below Level 3 (QA Island 003)',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('? canonicalIslandCompletion.buildsComplete < canonicalIslandCompletion.landmarkCount'), 'build gap comes from the builds requirement only');
      assert(board.includes("openedStopIsPlayable && isCurrentIslandLandmarkBuildIncomplete && !isCurrentIslandBossDefeated ? ("), 'notice keyed to builds');
      assert(board.includes("isCurrentIslandLandmarkBuildIncomplete ? '🔒 Full Rewards Locked — Finish Landmark Upgrades' : bossTrialResolved ? '👑 Complete the Boss stop'"), 'button says what is actually left');
    },
  },
  {
    name: 'QA Island 004: hatchery says "ready" when its egg can be collected; the phone action stays on screen; the hatch timer leaves room',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes("openedStopIsPlayable && islandNumber >= 4\n                          ? 'Ready: collect your egg into the spaceship incubator."), 'ready copy when collectable');
      const css = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      const action = css.slice(css.indexOf('.island-mission-tracker__mission-action {'), css.indexOf('.island-mission-tracker__milestones {'));
      assert(action.includes('position: sticky;') && action.includes('bottom: 0;'), 'the phone main action is pinned to the screen bottom');
      assert(css.includes('.island-run-board__rewardbar-hatchery-egg-button:has(.island-run-board__rewardbar-hatchery-time) { margin-bottom: 14px; }'), 'hatch timer does not cover Lucky Spin');
    },
  },
  {
    name: 'Mission Phone is "what you need now": one Do-this-now card first; stats and landmark flags fold away without losing info',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandMissionBriefingModal.tsx', 'utf8');
      const card = modal.indexOf('<section className="island-mission-tracker__now" aria-label="Do this now">');
      assert(card > 0 && card < modal.indexOf('<ol className="island-mission-tracker__checklist"'), 'the Do-this-now card comes before the checklist');
      assert(modal.indexOf('island-mission-tracker__mission-action--card') > card, 'the main action lives in the card');
      assert(modal.includes('const nextObjectiveIndex = normalizedProgress.findIndex((item) => !item.complete);'), 'otherwise the card shows the first unfinished objective');
      assert(modal.includes('statsExpanded ? (') && modal.includes('<MissionPhoneStatChips stats={stats} onExpand={() => setStatsExpanded(true)} />'), 'island details collapse into chips (tap for the full cards)');
      assert(modal.includes('!flagsExpanded ? (') && modal.includes('built to Level 3</span>'), 'landmark flags collapse into one row');
      assert(modal.includes('onClick={() => setFlagsExpanded(false)}>Hide landmarks'), 'and can be folded back');
    },
  },
  {
    name: 'QA Island 005: a Wisdom slider left on its midpoint still records an answer when released; build titles stay readable',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const renderer = fsMod.readFileSync('src/features/compass-book/components/CompassActivityRenderer.tsx', 'utf8');
      assert(renderer.includes("onPointerUp={(event) => {\n              if (current === null) onChange(block.questionId, { kind: 'scale', value: Number(event.currentTarget.value) });"), 'releasing an unanswered slider records its value');
      const css = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      assert(/\.bm2-celebration-title h2 \{[^}]*color: inherit;/.test(css), 'the build celebration title keeps its gold colour');
    },
  },
];
