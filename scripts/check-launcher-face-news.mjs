import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// User decision 2026-10-02: the Today launcher shows the robot only when its
// menu has something new; otherwise it stays the compass (no timed flipping,
// so it never competes with the Today pet).
const nav = readFileSync('src/components/MobileFooterNav.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

assert.match(nav, /const menuLauncherFace: 'compass' \| 'coach' = launcherHasNews \? 'coach' : 'compass';/,
  'The launcher face must follow menu news, not a timer.');
assert.doesNotMatch(nav, /MENU_LAUNCHER_FACE_INTERVAL_MS|getMenuLauncherFace/,
  'The 60-second compass/robot flip must be gone.');
assert.match(app, /const launcherMenuHasNews = showMicroTestNotificationDot \|\| pendingPromotion !== null;/,
  'Menu news covers unseen micro-tests and a pending rank promotion.');
assert.equal((app.match(/launcherHasNews=\{launcherMenuHasNews\}/g) ?? []).length, 2,
  'Every footer launcher receives the menu news flag.');

console.log('launcher face news: ok');
