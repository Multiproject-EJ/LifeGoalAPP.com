import { assert, type TestCase } from './testHarness';

async function read(path: string): Promise<string> {
  // @ts-ignore
  const fs = await import('fs');
  return fs.readFileSync(path, 'utf8') as string;
}

export const appTabsAuditTests: TestCase[] = [
  {
    name: 'Score: home-grid artwork is scoped to the home hub, Collections keeps its own readable cards',
    run: async () => {
      const score = await read('src/features/gamification/ScoreTab.tsx');
      assert(score.includes('className="score-tab__hub score-tab__hub--home"'), 'home hub is marked');
      assert(score.includes('className="score-tab__hub score-tab__hub--collections"'), 'collections hub is marked');
      const theme = await read('src/styles/first-light-kingdom-theme.css');
      assert(!/\] \.score-tab__hub-card:nth-child\(\d\) \{[^}]*background-image/.test(theme), 'no unscoped positional artwork');
      assert(theme.includes('.score-tab__hub--collections > .score-tab__hub-card .score-tab__hub-title'), 'collections titles shown');
    },
  },
  {
    name: 'Dark cards keep readable headings despite the global navy h1–h6',
    run: async () => {
      const gamification = await read('src/styles/gamification.css');
      assert(gamification.includes('.score-tab__league-invite h3 { color: #fff4cf; }'), 'League invite heading');
      const levelWorlds = await read('src/features/gamification/level-worlds/LevelWorlds.css');
      assert(levelWorlds.includes('.island-soft-save-modal__dialog :is(h1, h2, h3) { color: #f4f9ff; }'), 'guest save prompt heading');
    },
  },
];
