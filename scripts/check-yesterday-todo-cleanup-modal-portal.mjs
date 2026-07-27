import { readFileSync } from 'node:fs';

const source = readFileSync('src/features/habits/DailyHabitTracker.tsx', 'utf8');
const appSource = readFileSync('src/App.tsx', 'utf8');
const todoCleanupCss = readFileSync('src/features/habits/TodoCleanupReset.css', 'utf8');
const appCss = readFileSync('src/index.css', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`yesterday-todo-cleanup-modal-portal: ${message}`);
    process.exit(1);
  }
}

const compactReturnStart = source.indexOf('if (isCompact) {');
assert(compactReturnStart !== -1, 'could not find compact return branch');

const compactReturnEnd = source.indexOf('\n  return (\n    <section className="habit-tracker">', compactReturnStart);
assert(compactReturnEnd !== -1, 'could not find end of compact return branch');

const compactReturn = source.slice(compactReturnStart, compactReturnEnd);
assert(
  compactReturn.includes('{yesterdaySundownTodoPortal}'),
  'compact Today view must render the yesterday todo cleanup portal so scroll lock never hides an unmounted modal',
);

const fullReturnStart = source.indexOf('return (', compactReturnEnd);
assert(fullReturnStart !== -1, 'could not find full return branch');
const fullReturn = source.slice(fullReturnStart);
assert(
  fullReturn.includes('{yesterdaySundownTodoPortal}'),
  'full Today view must keep rendering the yesterday todo cleanup portal',
);

assert(
  source.includes("type TodoCleanupAction = 'tomorrow' | 'schedule' | 'finish' | 'tower' | 'delete';"),
  'todo cleanup must expose Task Tower as a first-class staged action',
);
assert(
  source.includes("pendingAction.action === 'tower'"),
  'applying a Task Tower cleanup choice must create a Task Tower action',
);
assert(
  source.includes("stageTodoCleanupAction(todo.id, { action: 'tower' })"),
  'each cleanup row must offer a Task Tower action',
);
assert(
  source.includes("setTodoCleanupBulkAction({ action: 'tower' })"),
  'bulk cleanup must offer Task Tower',
);
assert(
  source.includes('/assets/todo-cleanup/daily-todo-reset-title-v3.webp'),
  'todo cleanup must use the wide image title lockup',
);
assert(
  source.includes('id="yesterday-sundown-todo-help"'),
  'the help button must reveal an independent information panel',
);
assert(
  !source.includes('yesterday-sundown-todo-modal__dialog--help'),
  'help mode must not replace or disable the cleanup controls',
);
assert(
  todoCleanupCss.includes('.yesterday-sundown-todo-modal__help-panel'),
  'the independent help panel must be styled',
);
assert(
  appSource.includes('const [showMobileHome, setShowMobileHome] = useState(isMobileExperience);'),
  'mobile users, including admins, must start on the modern Today home',
);
assert(
  appSource.includes("setActiveWorkspaceNav('planning');\n    if (isMobileExperience) {\n      setShowMobileHome(true);"),
  'the manual cleanup launcher must keep mobile admins on the modern Today home',
);
assert(
  appCss.includes('.mobile-habit-home .habit-checklist__item--expanded')
    && appCss.includes('overflow-y: auto;')
    && appCss.includes('touch-action: pan-y;'),
  'the entire expanded mobile habit card must accept vertical scrolling',
);
assert(
  source.includes("target?.closest<HTMLElement>('.habit-checklist__item--expanded')"),
  'expanded-habit focus scrolling must use the whole card as its scroll container',
);

console.log('yesterday-todo-cleanup-modal-portal: all assertions passed');
