import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const modalPath = resolve(repoRoot, 'src/features/gamification/daily-treats/CountdownCalendarModal.tsx');
const unwrapPath = resolve(repoRoot, 'src/features/gamification/daily-treats/CalendarDoorUnwrap.tsx');
const scratchPath = resolve(repoRoot, 'src/features/gamification/daily-treats/CalendarDoorScratch.tsx');
const motionPreferencesPath = resolve(repoRoot, 'src/features/gamification/daily-treats/motionPreferences.ts');
const stylesPath = resolve(repoRoot, 'src/index.css');

const modal = readFileSync(modalPath, 'utf8');
const unwrap = readFileSync(unwrapPath, 'utf8');
const scratch = readFileSync(scratchPath, 'utf8');
const motionPreferences = readFileSync(motionPreferencesPath, 'utf8');
const styles = readFileSync(stylesPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex !== -1, `Missing section start: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert(endIndex !== -1, `Missing section end after ${start}: ${end}`);
  return source.slice(startIndex, endIndex);
}

function indexAfter(source, needle, fromIndex = 0) {
  const index = source.indexOf(needle, fromIndex);
  assert(index !== -1, `Missing expected text: ${needle}`);
  return index;
}

assert(
  motionPreferences.includes("export const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';")
    && motionPreferences.includes('export const prefersReducedMotion = (): boolean'),
  'Daily Treat reveal components must share the reduced-motion helper.',
);
assert(
  unwrap.includes("import { prefersReducedMotion } from './motionPreferences';")
    && scratch.includes("import { prefersReducedMotion } from './motionPreferences';"),
  'CalendarDoorUnwrap and CalendarDoorScratch must import the shared reduced-motion helper.',
);
assert(
  !unwrap.includes("matchMedia('(prefers-reduced-motion: reduce)')")
    && !scratch.includes("matchMedia('(prefers-reduced-motion: reduce)')"),
  'Daily Treat reveal components must not duplicate inline reduced-motion matchMedia checks.',
);

// The full-screen reveal modal (flip/unwrap/scratch card) was replaced by an
// in-place confetti burst plus a brief floating reward toast. Bonus doors stage
// that feedback behind the Gift Box animation; ordinary doors remain instant.
const handleOpenDoor = sectionBetween(
  modal,
  'const handleOpenDoor = useCallback(async (dayIndex: number, doorType: DoorType, hatch: CalendarHatch,',
  '// Refresh season data to update progress',
);
const confettiIndex = indexAfter(handleOpenDoor, 'burstDoorConfetti(origin)');
const openCallIndex = indexAfter(handleOpenDoor, 'openTodayHatch(userId, seasonData.season.id, dayIndex, doorType)');
assert(
  handleOpenDoor.includes("if (doorType !== 'bonus')") && confettiIndex < openCallIndex,
  'Ordinary-door confetti must burst before awaiting openTodayHatch while bonus gifts reserve it for the animation.',
);
const missingRewardGuardIndex = indexAfter(handleOpenDoor, 'if (!reward)');
const rewardToastIndex = indexAfter(handleOpenDoor, 'const nextRewardToast: RewardToast = {');
assert(
  openCallIndex < missingRewardGuardIndex && missingRewardGuardIndex < rewardToastIndex,
  'Authoritative reward data must be required before preparing the floating reward toast.',
);
assert(
  handleOpenDoor.includes("if (doorType === 'bonus')")
    && handleOpenDoor.includes('setPendingGiftReward(nextRewardToast)')
    && handleOpenDoor.includes('setRewardToast(nextRewardToast)'),
  'Bonus gifts must stage the animation while ordinary doors keep the direct reward toast.',
);
assert(
  handleOpenDoor.includes('formatRewardToast('),
  'handleOpenDoor must derive the reward toast label/icon from the authoritative reward.',
);
assert(
  !modal.includes('setRevealState(')
    && !modal.includes('daily-treats-calendar--reward-reveal')
    && !modal.includes('CalendarDoorFlip'),
  'The full-screen reveal modal must stay removed (no setRevealState / reward-reveal render / door-flip mount).',
);
assert(
  modal.includes('disableForReducedMotion: true'),
  'Door confetti must be disabled under prefers-reduced-motion.',
);

assert(
  unwrap.includes('const DEFAULT_UNWRAP_REVEAL_DELAY_MS = 800;')
    && unwrap.includes('const BONUS_UNWRAP_REVEAL_DELAY_MS = 420;')
    && unwrap.includes('const REDUCED_MOTION_UNWRAP_REVEAL_DELAY_MS = 50;'),
  'CalendarDoorUnwrap must preserve default, bonus, and reduced-motion reveal delays.',
);
assert(
  unwrap.includes('const revealDelayMs = prefersReducedMotion()')
    && unwrap.includes('? REDUCED_MOTION_UNWRAP_REVEAL_DELAY_MS')
    && unwrap.includes('? BONUS_UNWRAP_REVEAL_DELAY_MS')
    && unwrap.includes(': DEFAULT_UNWRAP_REVEAL_DELAY_MS'),
  'CalendarDoorUnwrap must prioritize reduced-motion delay, then bonus delay, then default delay.',
);
assert(
  unwrap.includes("${isBonusDoor ? 'door-unwrap--bonus' : ''}"),
  'CalendarDoorUnwrap must emit a bonus-scoped CSS class only for bonus doors.',
);
assert(
  unwrap.includes("if (isBonusDoor) {\n      playIslandRunSound('egg_open');")
    && unwrap.includes("if (isBonusDoor) {\n        playIslandRunSound('reward_bar_claim_burst');"),
  'CalendarDoorUnwrap sound/haptic feedback must remain scoped to bonus doors.',
);

assert(
  scratch.includes('const SCRATCH_CONFETTI_DURATION_MS = 2000;'),
  'CalendarDoorScratch must keep confetti duration deterministic.',
);
assert(
  scratch.includes('if (tier < 2 || prefersReducedMotion()) return;'),
  'CalendarDoorScratch must suppress confetti for low-tier rewards and reduced-motion users.',
);
assert(
  scratch.includes('window.clearTimeout(confettiTimerRef.current)')
    && scratch.includes('useEffect(() => () => {'),
  'CalendarDoorScratch must clean up confetti timers on day change and unmount.',
);
assert(
  scratch.includes('isDiamondReward && isRevealed && !reduceMotion'),
  'CalendarDoorScratch diamond flash must be gated behind reduced-motion preferences.',
);

const reducedMotionStyles = sectionBetween(
  styles,
  '@media (prefers-reduced-motion: reduce) {\n  .daily-treats-calendar--holiday-personal-quest:not(.daily-treats-calendar--reward-reveal)',
  '/* Same-day Daily Treat bonus:',
);
for (const selector of [
  '.door-unwrap--unwrapping .door-unwrap__wrapper',
  '.door-unwrap__content',
  '.door-scratch__diamond-flash',
  '.door-scratch__confetti-piece',
  '.daily-treats-calendar__opening-shimmer::before',
]) {
  assert(
    reducedMotionStyles.includes(selector),
    `Reduced-motion styles must disable ${selector}.`,
  );
}
assert(
  styles.includes('.daily-treats-calendar__opening-shell')
    && styles.includes('@keyframes daily-treat-opening-shimmer'),
  'Opening shell styles and shimmer keyframes must be present.',
);
assert(
  styles.includes('.door-unwrap--bonus .door-unwrap__wrapper')
    && styles.includes('@keyframes bonus-gift-pop-open'),
  'Bonus unwrap scoped polish must be present.',
);

console.log('daily-treats-reveal-guards: all assertions passed');
