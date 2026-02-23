import { readFile } from 'node:fs/promises';

const checks = [
  {
    name: 'TimerTab reduced-motion guard function exists',
    file: 'src/features/timer/TimerTab.tsx',
    pattern: /function prefersReducedMotion\(\): boolean \{/m,
  },
  {
    name: 'TimerTab completion celebration gate uses reduced-motion guard',
    file: 'src/features/timer/TimerTab.tsx',
    pattern: /const shouldAnimateCelebration = !prefersReducedMotion\(\);/m,
  },
  {
    name: 'TimerTab CSS includes reduced-motion media query for celebration',
    file: 'src/features/timer/TimerTab.css',
    pattern: /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.timer-tab__celebration-dot\s*\{\s*animation:\s*none;/m,
  },
  {
    name: 'Footer alert CSS includes reduced-motion media query',
    file: 'src/index.css',
    pattern: /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.mobile-footer-nav__button--timer-alert\s*\{\s*animation:\s*none;/m,
  },
  {
    name: 'App alert-state vibration cue remains present',
    file: 'src/App.tsx',
    pattern: /navigator\.vibrate\?\.\(\[200, 100, 260, 100, 200\]\);/m,
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
