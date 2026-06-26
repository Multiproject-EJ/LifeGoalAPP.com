import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspacePath = resolve(__dirname, '../src/features/goals/GoalWorkspace.tsx');
const indicatorsPath = resolve(__dirname, '../src/features/goals/goalCardIndicators.ts');
const packagePath = resolve(__dirname, '../package.json');

const workspace = readFileSync(workspacePath, 'utf8');
const indicators = readFileSync(indicatorsPath, 'utf8');
const packageJson = readFileSync(packagePath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertMatches(source, pattern, message) {
  assert(pattern.test(source), message);
}

assertIncludes(
  workspace,
  "import { computeGoalCardIndicators } from './goalCardIndicators';",
  'GoalWorkspace must import indicator logic from goalCardIndicators.',
);
assertMatches(
  workspace,
  /computeGoalCardIndicators\(goal,\s*stepsByGoal\[goal\.id\]\s*\?\?\s*\[\]\)/m,
  'Single-goal card must compute strength/progress indicators from the reusable model and goal steps.',
);

assertMatches(
  workspace,
  /type GoalWorkspaceProps = \{[\s\S]*session: Session;[\s\S]*\}/m,
  'GoalWorkspace must remain session-backed for auth-gated rendering.',
);
assertIncludes(
  workspace,
  'const { isConfigured } = useSupabaseAuth();',
  'GoalWorkspace must keep Supabase auth configuration gating.',
);
assertMatches(
  workspace,
  /if \(!isConfigured\) \{[\s\S]*setGoals\(\[\]\);[\s\S]*setHasLoadedOnce\(false\);[\s\S]*return;[\s\S]*\}/m,
  'Goal loading must remain gated behind configured auth state.',
);

assertIncludes(
  workspace,
  'single-goal view',
  'Single-goal mode text must remain visible in the workspace metadata.',
);
assertMatches(
  workspace,
  /role="navigation"\s+aria-label="Single goal navigation"/m,
  'Single-goal review flow must expose an accessible navigation region.',
);
assertMatches(workspace, /<button[\s\S]*>\s*Previous\s*<\/button>/m, 'Previous navigation control must remain present.');
assertMatches(workspace, /<button[\s\S]*>\s*Next\s*<\/button>/m, 'Next navigation control must remain present.');
assertIncludes(workspace, 'Goal {activeGoalIndex + 1} of {searchedGoals.length}', 'Single-goal position text must remain present.');

assertMatches(
  workspace,
  /<label className="goal-list__search">[\s\S]*<span>Search goals<\/span>[\s\S]*type="search"[\s\S]*placeholder="Search title, why, or weekly notes"/m,
  'Search/filter affordance must remain present for single-goal review.',
);
assertMatches(
  workspace,
  /className="goal-list__filters"\s+role="group"\s+aria-label="Filter goals by status"/m,
  'Status filter affordance must remain accessible.',
);

assertIncludes(workspace, 'GOALS-A-P2: Goal strength + completion', 'Indicator rendering section marker must remain present.');
assertIncludes(workspace, 'className="goal-card__indicators"', 'Indicator section must render on the goal card.');
assertIncludes(workspace, 'Strength</span>', 'Strength indicator label must remain present.');
assertIncludes(workspace, 'Progress</span>', 'Progress indicator label must remain present.');
assertIncludes(indicators, 'export function computeGoalCardIndicators', 'Reusable indicator model must continue exporting computeGoalCardIndicators.');

assertMatches(
  workspace,
  /role="progressbar"[\s\S]*aria-valuenow=\{indicators\.completionPct\}[\s\S]*aria-valuemin=\{0\}[\s\S]*aria-valuemax=\{100\}[\s\S]*aria-label=\{indicators\.completionLabel\}/m,
  'Progressbar accessibility semantics must include role, value bounds, current value, and label.',
);

assertIncludes(
  packageJson,
  '"check:goals-single-goal-review": "node scripts/check-goals-single-goal-review-smoke.mjs"',
  'package.json must expose the single-goal review smoke check.',
);

console.log('goals-single-goal-review-smoke: all assertions passed');
