import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tracker = readFileSync('src/features/habits/DailyHabitTracker.tsx', 'utf8');
const haptics = readFileSync('src/utils/completionHaptics.ts', 'utf8');

assert.match(
  tracker,
  /previousDirection === null && nextDirection !== null/,
  'The swipe haptic must fire only when a habit first crosses into an armed state.',
);
assert.equal(
  (tracker.match(/triggerHabitSwipeThresholdHaptic\(gesture\.armedDirection, armedDirection\)/g) ?? []).length,
  2,
  'Pointer and touch swipe paths must use the same threshold haptic.',
);
assert.match(
  tracker,
  /triggerImpactHaptic\('strong', \{ channel: 'habit', minIntervalMs: 120 \}\)/,
  'The armed threshold should use one strong habit-channel impact.',
);
assert.doesNotMatch(
  tracker,
  /triggerCompletionHaptic\('light', \{ channel: 'navigation', minIntervalMs: 120 \}\)/,
  'The former light navigation pulse must not remain on the habit threshold.',
);
assert.match(
  haptics,
  /strong: \[48\]/,
  'The non-native fallback should be one strong pulse, not a celebration pattern.',
);
assert.match(
  haptics,
  /triggerHaptic\(profile, options, false, IMPACT_HAPTIC_PATTERNS\)/,
  'Interaction impacts must not be consumed by the low-frequency completion budget.',
);

console.log('habit-swipe-threshold-haptic: all assertions passed');
