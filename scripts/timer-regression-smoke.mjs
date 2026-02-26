import { readFile } from 'node:fs/promises';

const checks = [
  {
    name: 'TimerTab exposes session-plan mode toggle',
    file: 'src/features/timer/TimerTab.tsx',
    pattern: /timerMode\s*===\s*'session-plan'/m,
  },
  {
    name: 'TimerTab renders SessionPlanner with analytics refresh callback',
    file: 'src/features/timer/TimerTab.tsx',
    pattern: /<SessionPlanner[\s\S]*onSourceAnalyticsUpdated=\{refreshSourceAnalytics\}/m,
  },
  {
    name: 'SessionPlanner stores plan state in localStorage',
    file: 'src/features/timer/SessionPlanner.tsx',
    pattern: /const STORAGE_KEY = 'lifegoal_timer_session_plan_v1';/m,
  },
  {
    name: 'SessionPlanner stores custom templates in localStorage',
    file: 'src/features/timer/SessionPlanner.tsx',
    pattern: /const CUSTOM_TEMPLATE_STORAGE_KEY = 'lifegoal_timer_session_custom_templates_v1';/m,
  },
  {
    name: 'SessionPlanner stores recent session history in localStorage',
    file: 'src/features/timer/SessionPlanner.tsx',
    pattern: /const SESSION_HISTORY_STORAGE_KEY = 'lifegoal_timer_session_history_v1';/m,
  },
  {
    name: 'SessionPlanner includes built-in quick templates',
    file: 'src/features/timer/SessionPlanner.tsx',
    pattern: /id:\s*'pomodoro-classic'[\s\S]*id:\s*'study-sprint'[\s\S]*id:\s*'deep-work-90'/m,
  },
  {
    name: 'SessionPlanner records completion telemetry event',
    file: 'src/features/timer/SessionPlanner.tsx',
    pattern: /type:\s*'session_plan_completed'/m,
  },
  {
    name: 'SessionPlanner records analytics contribution on completion',
    file: 'src/features/timer/SessionPlanner.tsx',
    pattern: /recordTimerSourceAnalytics\(sourceType,\s*focusActualSeconds\)/m,
  },
  {
    name: 'Timer telemetry type includes session planner template/history events',
    file: 'src/features/timer/timerSession.ts',
    pattern: /'session_plan_template_applied'[\s\S]*'session_plan_custom_template_saved'[\s\S]*'session_plan_history_cleared'/m,
  },
];

let failed = 0;
for (const check of checks) {
  const content = await readFile(check.file, 'utf8');
  const ok = check.pattern.test(content);
  const prefix = ok ? 'PASS' : 'FAIL';
  console.log(`${prefix}: ${check.name}`);
  if (!ok) {
    console.log(`  file: ${check.file}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} regression smoke check(s) failed.`);
  process.exit(1);
}

console.log('\nAll timer regression smoke checks passed.');
