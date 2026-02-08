#!/usr/bin/env node

/**
 * Lucky Roll Board Game - Implementation Validation
 * 
 * This script validates that all required features from Phase 1 are implemented correctly.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');
const luckyRollDir = join(srcDir, 'features', 'gamification', 'daily-treats');

console.log('🎲 Lucky Roll Board Game - Implementation Validation\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let passed = 0;
let failed = 0;

function check(description, condition) {
  if (condition) {
    console.log(`✅ ${description}`);
    passed++;
  } else {
    console.log(`❌ ${description}`);
    failed++;
  }
}

function fileExists(path) {
  try {
    readFileSync(path, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function fileContains(path, ...patterns) {
  try {
    const content = readFileSync(path, 'utf8');
    return patterns.every(pattern => {
      if (typeof pattern === 'string') {
        return content.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(content);
      }
      return false;
    });
  } catch {
    return false;
  }
}

// Phase 1: Core Infrastructure
console.log('📦 Phase 1: Core Infrastructure\n');

check(
  'luckyRollTypes.ts exists',
  fileExists(join(luckyRollDir, 'luckyRollTypes.ts'))
);

check(
  'luckyRollState.ts exists',
  fileExists(join(luckyRollDir, 'luckyRollState.ts'))
);

check(
  'LuckyRollBoard.tsx exists',
  fileExists(join(luckyRollDir, 'LuckyRollBoard.tsx'))
);

check(
  'luckyRollBoard.css exists',
  fileExists(join(luckyRollDir, 'luckyRollBoard.css'))
);

check(
  'Types include all tile types',
  fileContains(
    join(luckyRollDir, 'luckyRollTypes.ts'),
    'neutral',
    'gain_coins',
    'lose_coins',
    'bonus_dice',
    'game_token',
    'mini_game',
    'mystery',
    'jackpot'
  )
);

check(
  'generateDefaultBoard function exists',
  fileContains(join(luckyRollDir, 'luckyRollState.ts'), 'export function generateDefaultBoard')
);

check(
  'Mini-game tiles placed at correct positions',
  fileContains(
    join(luckyRollDir, 'luckyRollState.ts'),
    '7: { game: \'task_tower\' }',
    '22: { game: \'task_tower\' }',
    '12: { game: \'pomodoro_sprint\' }',
    '27: { game: \'pomodoro_sprint\' }',
    '15: { game: \'vision_quest\' }',
    '20: { game: \'wheel_of_wins\' }'
  )
);

check(
  'rollDice uses crypto.getRandomValues',
  fileContains(join(luckyRollDir, 'luckyRollState.ts'), 'crypto.getRandomValues')
);

check(
  'moveToken handles board wrap',
  fileContains(join(luckyRollDir, 'luckyRollState.ts'), 'newPosition >= boardSize', 'currentLap += 1')
);

check(
  'State persistence with localStorage',
  fileContains(join(luckyRollDir, 'luckyRollState.ts'), 'localStorage', 'saveState', 'loadState')
);

check(
  'Snake-path layout (even rows reversed)',
  fileContains(join(luckyRollDir, 'LuckyRollBoard.tsx'), 'row % 2 === 1', 'reverse()')
);

console.log('\n📦 Phase 2: Dice Economy\n');

check(
  'LuckyRollDiceShop.tsx exists',
  fileExists(join(luckyRollDir, 'LuckyRollDiceShop.tsx'))
);

check(
  'Dice shop imports purchaseDicePack',
  fileContains(join(luckyRollDir, 'LuckyRollDiceShop.tsx'), 'purchaseDicePack')
);

check(
  'Mystery box reveal animation',
  fileContains(join(luckyRollDir, 'LuckyRollDiceShop.tsx'), 'mysteryReveal', 'tier')
);

check(
  'Hearts balance displayed',
  fileContains(join(luckyRollDir, 'LuckyRollDiceShop.tsx'), 'currencyBalance.hearts')
);

console.log('\n📦 Phase 3: Board Features\n');

check(
  'Lap celebration overlay',
  fileContains(join(luckyRollDir, 'LuckyRollBoard.tsx'), 'showLapCelebration', 'lucky-roll-lap-celebration')
);

check(
  'Milestone lap tracking (every 5)',
  fileContains(join(luckyRollDir, 'LuckyRollBoard.tsx'), 'currentLap % 5 === 0', 'isMilestone')
);

check(
  'Tile landing effects',
  fileContains(join(luckyRollDir, 'LuckyRollBoard.tsx'), 'landedTile', 'lucky-roll-landed-effect')
);

console.log('\n📦 Phase 4: Integration\n');

check(
  'App.tsx imports LuckyRollBoard',
  fileContains(join(srcDir, 'App.tsx'), 'import { LuckyRollBoard }')
);

check(
  'showLuckyRoll state variable',
  fileContains(join(srcDir, 'App.tsx'), 'showLuckyRoll', 'setShowLuckyRoll')
);

check(
  'League placeholder removed',
  !fileContains(join(srcDir, 'App.tsx'), 'showLeaguePlaceholder', 'leaguePlaceholderModal')
);

console.log('\n📦 Visual Design\n');

check(
  'Color palette variables defined',
  fileContains(
    join(luckyRollDir, 'luckyRollBoard.css'),
    '--lucky-roll-bg: #2c1810',
    '--lucky-roll-surface: #f5e6d3',
    '--lucky-roll-accent: #d4a574'
  )
);

check(
  'Dice tumble animation',
  fileContains(join(luckyRollDir, 'luckyRollBoard.css'), 'dice-tumble', '@keyframes dice-tumble')
);

check(
  'Token hop animation',
  fileContains(join(luckyRollDir, 'luckyRollBoard.css'), 'token-hop', '@keyframes token-hop')
);

check(
  'Tile landing animation',
  fileContains(join(luckyRollDir, 'luckyRollBoard.css'), 'tile-land', '@keyframes tile-land')
);

check(
  'Lap celebration fade animation',
  fileContains(join(luckyRollDir, 'luckyRollBoard.css'), 'lap-fade-in-out', '@keyframes lap-fade-in-out')
);

check(
  'Pulsing glow on current position',
  fileContains(join(luckyRollDir, 'luckyRollBoard.css'), 'pulse-glow', '@keyframes pulse-glow')
);

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}\n`);

if (failed === 0) {
  console.log('🎉 All validation checks passed! Lucky Roll is ready for testing.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some validation checks failed. Please review the implementation.\n');
  process.exit(1);
}
