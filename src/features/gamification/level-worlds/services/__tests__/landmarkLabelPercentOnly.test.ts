import { assert, type TestCase } from './testHarness';

export const landmarkLabelPercentOnlyTests: TestCase[] = [
  {
    name: 'landmark plot labels show only their build % until the building is 100% built, then its name',
    run: async () => {
      // @ts-ignore Node-only source contract check.
      const fs = await import('fs');
      const pilot = fs.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes("item.percent >= 100 ? <span><strong>{item.title}</strong><small>{item.status}</small></span> : null"), 'name and status only at 100%');
      assert(pilot.includes("item.percent < 100 ? ' island-landmark-progress-label--percent-only' : ''"), 'compact percent-only pill before that');
      assert(pilot.includes('aria-label={`${item.title}: ${item.percent}% built. ${item.status}`}'), 'screen readers still hear the name');
    },
  },
];
