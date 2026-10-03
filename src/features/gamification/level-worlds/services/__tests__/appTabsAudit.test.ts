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
  {
    name: 'Task Tower: dice reach the playable Island Run pool, the tower stands on the ground, tasks add in one step',
    run: async () => {
      const tower = await read('src/features/gamification/games/task-tower/TaskTower.tsx');
      assert((tower.match(/grantTaskTowerIslandRunDice\(session, /g) ?? []).length === 3, 'block, storey and all-clear dice all go to the canonical pool');
      assert(tower.includes('telemetryDiceSource: ISLAND_RUN_ECONOMY_SOURCES.taskTowerDice'), 'canonical token-hop action with its own source');
      assert(tower.includes('aria-label="Add a task to the tower"') && tower.includes('placeQueuedBlock(blocks, action)'), 'in-tower add drops new tasks live');
      const css = await read('src/features/gamification/games/task-tower/taskTower.css');
      assert(css.includes('.task-tower__game-area > .task-tower__grid {\n  margin-top: auto;'), 'tower anchored to the ground');
      const quick = await read('src/features/actions/components/QuickAddAction.tsx');
      assert(quick.includes("if (e.key === 'Enter' && !adding && title.trim()) {") && quick.includes('void handleSubmit();'), 'Enter adds immediately');
      assert(quick.includes('More details…'), 'details are optional');
    },
  },
  {
    name: 'Task Tower: a finished Must-do warms eggs through the shared daily cap',
    run: async () => {
      const hook = await read('src/features/actions/hooks/useActions.ts');
      assert(hook.includes("if (session && data.category === 'must_do') {") && hook.includes('warmEggsFromSource({ session, source: `task:${id}` })'), 'must-do completion warms eggs');
      const tab = await read('src/features/actions/ActionsTab.tsx');
      assert((tab.match(/<EggWarmthToastHost \/>/g) ?? []).length === 2, 'toast shows on the Actions screens');
    },
  },
];
