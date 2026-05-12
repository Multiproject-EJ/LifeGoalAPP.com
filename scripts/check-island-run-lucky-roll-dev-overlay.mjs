#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const overlayPath = resolve(root, 'src/features/gamification/level-worlds/components/lucky-roll/IslandRunLuckyRollDevOverlay.tsx');
const boardPath = resolve(root, 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
const debugPanelPath = resolve(root, 'src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx');

const overlay = readFileSync(overlayPath, 'utf8');
const board = readFileSync(boardPath, 'utf8');
const debugPanel = readFileSync(debugPanelPath, 'utf8');

const failures = [];

function requireIncludes(label, content, needle) {
  if (!content.includes(needle)) {
    failures.push(`${label}: missing ${needle}`);
  }
}

function requireNotMatches(label, content, pattern, message) {
  if (pattern.test(content)) {
    failures.push(`${label}: ${message}`);
  }
}

requireIncludes('overlay', overlay, 'startIslandRunLuckyRoll');
requireIncludes('overlay', overlay, 'advanceIslandRunLuckyRoll');
requireIncludes('overlay', overlay, 'bankIslandRunLuckyRollRewards');
requireIncludes('overlay', overlay, 'getIslandRunLuckyRollBoardConfig');
requireIncludes('overlay', overlay, 'getIslandRunLuckyRollTileConfig');
requireIncludes('overlay', overlay, "mode: 'production_board'");
requireIncludes('overlay', overlay, 'Treasure Path');
requireIncludes('overlay', overlay, 'Treasure Path unlocked!');
requireIncludes('overlay', overlay, 'You found a hidden reward path.');
requireIncludes('overlay', overlay, 'Roll for free across glowing fields and collect everything at the treasure gate.');
requireIncludes('overlay', overlay, 'Collect Treasure');
requireIncludes('overlay', overlay, 'Dice total');
requireIncludes('overlay', overlay, 'Essence total');
requireIncludes('overlay', overlay, 'Shards total');
requireIncludes('overlay', overlay, 'Treasure Eggs');
requireIncludes('overlay', overlay, 'isDevModeEnabled || usesPostRareCollectTravel');
requireIncludes('overlay', overlay, 'if (!isOverlayEnabled)');
requireIncludes('board', board, "showDevLuckyRollOverlay && (isDevModeEnabled || devLuckyRollCollectMode === 'post_rare_collect_travel')");
requireIncludes('board', board, 'onOpenLuckyRollDevOverlay={handleOpenDevLuckyRollOverlay}');
requireIncludes('board', board, 'showLuckyRollDevLauncher={isDevModeEnabled}');
requireIncludes('board', board, 'startPostRareTreasurePath');
requireIncludes('board', board, 'collectPostRareTreasurePathAndTravel');
requireIncludes('board', board, 'onCollectPostRareTreasurePathAndTravel={handlePostRareTreasurePathCollectAndTravel}');
requireIncludes('debug panel', debugPanel, 'Open Treasure Path overlay');
requireIncludes('debug panel', debugPanel, 'Post-Island Milestone Treasure Path Flow');
requireIncludes('debug panel', debugPanel, 'resolvePostRareTreasurePathState');
requireIncludes('debug panel', debugPanel, 'Collect + Travel');

if (
  debugPanel.includes('bankIslandRunLuckyRollRewards')
  || debugPanel.includes('resolveIslandRunTravelState')
  || debugPanel.includes('performIslandTravel')
) {
  failures.push('debug panel: post-rare flow must not compose bank+travel directly in React');
}

const forbiddenOverlayPatterns = [
  'gameRewards',
  'luckyRollAccess',
  'gol_lucky_roll_state',
  'localStorage',
  'persistIslandRunRuntimeStatePatch',
  'isIslandRunInternalDevToolsEnabled',
];

for (const pattern of forbiddenOverlayPatterns) {
  if (overlay.includes(pattern)) {
    failures.push(`overlay: forbidden legacy Lucky Roll/state pattern found: ${pattern}`);
  }
}

const forbiddenOverlayRegexes = [
  {
    pattern: /\bLuckyRollBoard\b/,
    message: 'forbidden legacy LuckyRollBoard component reference found',
  },
  {
    pattern: /\bLucky Roll\b/,
    message: 'visible Treasure Path overlay copy must not use Lucky Roll wording',
  },
  {
    pattern: /bank your rewards|Collect to bank|Travel to next island/,
    message: 'production Treasure Path collect copy must use collect treasure language, not bank/travel debug wording',
  },
];

for (const { pattern, message } of forbiddenOverlayRegexes) {
  requireNotMatches('overlay', overlay, pattern, message);
}

if (failures.length > 0) {
  console.error('Island Run Lucky Roll dev overlay checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Island Run Lucky Roll dev overlay checks passed.');
