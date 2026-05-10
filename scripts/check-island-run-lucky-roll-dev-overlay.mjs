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

requireIncludes('overlay', overlay, 'startIslandRunLuckyRoll');
requireIncludes('overlay', overlay, 'advanceIslandRunLuckyRoll');
requireIncludes('overlay', overlay, 'bankIslandRunLuckyRollRewards');
requireIncludes('overlay', overlay, "source: 'dev_lucky_roll_overlay'");
requireIncludes('overlay', overlay, 'import.meta.env.DEV');
requireIncludes('board', board, 'showDevLuckyRollOverlay && isDevModeEnabled && import.meta.env.DEV');
requireIncludes('board', board, 'onOpenLuckyRollDevOverlay={handleOpenDevLuckyRollOverlay}');
requireIncludes('debug panel', debugPanel, 'Open Lucky Roll overlay');

const forbiddenOverlayPatterns = [
  'daily-treats/LuckyRollBoard',
  'LuckyRollBoard',
  'gameRewards',
  'luckyRollAccess',
  'gol_lucky_roll_state',
  'localStorage',
  'persistIslandRunRuntimeStatePatch',
];

for (const pattern of forbiddenOverlayPatterns) {
  if (overlay.includes(pattern)) {
    failures.push(`overlay: forbidden legacy Lucky Roll/state pattern found: ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error('Island Run Lucky Roll dev overlay checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Island Run Lucky Roll dev overlay checks passed.');
