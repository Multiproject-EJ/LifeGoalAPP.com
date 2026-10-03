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
  {
    name: 'Task Tower: Sky Citadel look is a full-screen portal sheet above the app nav with its tools docked',
    run: async () => {
      const tab = await read('src/features/actions/ActionsTab.tsx');
      assert((tab.match(/\{showTaskTower && createPortal\(/g) ?? []).length === 2, 'both tower overlays render in a body portal');
      assert(tab.includes('dock={('), 'projects / timer / tasks shortcuts are docked inside the tower');
      const tower = await read('src/features/gamification/games/task-tower/TaskTower.tsx');
      assert(tower.includes("body.style.overflow = 'hidden';"), 'page scroll is locked while open');
      assert(tower.includes('className="task-tower__empty-state"') && tower.includes('task-tower__add-form--empty'), 'empty tower invites a first task');
      const scene = await read('src/features/gamification/games/task-tower/TaskTowerScene.tsx');
      assert(scene.includes('function spirePath') && scene.includes('task-tower__cloudbank'), 'castle spires above the clouds');
      const css = await read('src/features/gamification/games/task-tower/taskTower.css');
      assert(css.includes('Sky Citadel skin') && css.includes('height: 100dvh;'), 'skin present, full-screen on phones');
    },
  },
  {
    name: 'Bank is a two-pocket Treasury: game currencies from the canonical store, XP and Zen tokens; retired currencies hidden',
    run: async () => {
      const treasury = await read('src/features/gamification/TreasuryPanel.tsx');
      assert(treasury.includes('useIslandRunState(session, null)'), 'reads the canonical Island Run store');
      for (const field of ['state.essence', 'state.shards', 'state.dicePool', 'state.minigameTicketsByEvent', 'state.stickerProgress.fragments']) {
        assert(treasury.includes(field), `game pocket shows ${field}`);
      }
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|apply[A-Z]\w+\(/.test(treasury), 'read-only: no gameplay writes');
      const score = await read('src/features/gamification/ScoreTab.tsx');
      for (const retired of ['🛡️ Shields', '✨ Shards', '💎 Diamonds', '🪙 Coins', 'Gold wallet', 'handleConvertShields']) {
        assert(!score.includes(retired), `${retired} retired from the Bank`);
      }
      assert(score.includes('<TreasuryPanel'), 'Bank renders the Treasury');
    },
  },
  {
    name: 'Gold is retired: XP mints no Gold, treats and the spin pay Money, habits pay dice, promises stake Zen tokens',
    run: async () => {
      const xp = await read('src/services/gamification.ts');
      assert(!xp.includes('total_points: currentProfile.total_points +') && !xp.includes('convertXpToGold'), 'XP no longer converts into Gold');
      const spin = await read('src/services/dailySpin.ts');
      assert(!spin.includes("addToProfile('total_points'"), 'spin prizes never credit Gold');
      assert(spin.includes("if (award.currency === 'gold') totals.essence += award.amount;"), 'legacy gold prizes pay Money');
      const treats = await read('src/features/gamification/daily-treats/CountdownCalendarModal.tsx');
      assert(!treats.includes('awardDailyTreatGold') && !treats.includes('Gold`'), 'treats pay Money, never Gold');
      const habits = await read('src/features/habits/DailyHabitTracker.tsx');
      assert(habits.includes('grantHabitCheckInDice({ session, client, habitId, dateKey: dateISO, rewardValue })'), 'habit check-ins pay dice canonically');
      assert(!habits.includes("label: 'Gold'") && !habits.includes('convertXpToGold'), 'no Gold in Today wins or habit badges');
      assert(habits.includes('<section className="habit-tracker habit-tracker--compact">\n        <EggWarmthToastHost />'), 'Today (compact tracker) shows the dice and egg toasts');
      const wizard = await read('src/features/gamification/ContractWizard.tsx');
      assert(wizard.includes("useState<ContractStakeType>('tokens')") && !wizard.includes("onClick={() => setStakeType('gold')}"), 'new promises stake Zen tokens only');
      for (const shell of ['src/App.tsx', 'src/components/QuickActionsFAB.tsx', 'src/components/GamificationHeader.tsx']) {
        const source = await read(shell);
        assert(!source.includes('splitGoldBalance') && !source.includes('Gold wallet') && !source.includes('Gold bank'), `${shell} shows no Gold`);
      }
    },
  },
];
