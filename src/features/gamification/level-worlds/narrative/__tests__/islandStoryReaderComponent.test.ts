// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from '../../services/__tests__/testHarness';

const readerPath = 'src/features/gamification/level-worlds/components/IslandStoryReader.tsx';
const readerCssPath = 'src/features/gamification/level-worlds/components/IslandStoryReader.css';
const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';

const readerSource = readFileSync(readerPath, 'utf8');
const readerCss = readFileSync(readerCssPath, 'utf8');
const boardSource = readFileSync(boardPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

export const islandStoryReaderComponentTests: TestCase[] = [
  { name: 'final CTA is a button with accessible label and click completion handler', run: () => {
    assertIncludes(readerSource, 'type="button"', 'CTA must be an explicit button');
    assertIncludes(readerSource, 'aria-label={completionCtaLabel}', 'CTA must expose an accessible name');
    assertIncludes(readerSource, 'onClick={handleCompletion}', 'CTA must use standard click activation for mouse, keyboard, pointer, and touch compatibility');
  } },
  { name: 'non-reward Done CTA closes exactly once through StoryReader onClose', run: () => {
    assertIncludes(readerSource, 'if (rewardClaimed) return;', 'Completion handler should guard duplicate reward clicks');
    assertIncludes(readerSource, 'if (rewardCoins > 0) {', 'Reward and non-reward paths must remain separate');
    assertIncludes(readerSource, 'onClose();', 'Non-reward completion must invoke close');
    assert(!readerSource.includes('onTouchEnd'), 'CTA must not depend exclusively on touch handlers');
  } },
  { name: 'global prologue reward claim behavior remains reward-only', run: () => {
    assertIncludes(readerSource, 'onRewardClaim?.(rewardCoins);', 'Reward claim callback should remain available for rewarded prologue manifests');
    assertIncludes(readerSource, 'setRewardClaimed(true);', 'Rewarded path should retain claim guard');
    assertIncludes(boardSource, "onRewardClaim={activeStoryEpisode?.kind === 'global_prologue' ? sanctuaryHandlers.storyRewardClaim : undefined}", 'Only global prologue should receive reward callback');
  } },
  { name: 'arrival and resolution close through narrative close branch without reward callback', run: () => {
    assertIncludes(boardSource, "activeStoryEpisode?.kind === 'island_arrival' || activeStoryEpisode?.kind === 'island_resolution'", 'Arrival and resolution should share narrative close branch');
    assertIncludes(boardSource, 'islandNarrativeOpeningFlow.handleStoryEpisodeClosed(activeStoryEpisode);', 'Narrative StoryReader close should delegate to narrative flow');
    assertIncludes(hookSource, "markSeen('I001-B02');", 'Arrival close must mark B02 seen');
    assertIncludes(hookSource, "enqueueBeat('I001-B03');", 'Arrival close must queue B03 after seen state is committed');
    assertIncludes(hookSource, "markSeen('I001-B29');", 'Resolution close must mark B29 seen');
  } },
  { name: 'StoryReader explicit completion copy props avoid generic arrival copy', run: () => {
    assertIncludes(readerSource, 'completionTitle?: string;', 'StoryReader must accept display-only completion title');
    assertIncludes(readerSource, 'completionText?: string;', 'StoryReader must accept display-only completion text');
    assertIncludes(readerSource, 'completionButtonLabel?: string;', 'StoryReader must accept display-only completion button label');
    assertIncludes(boardSource, "completionTitle={activeStoryEpisode?.kind === 'island_arrival' ? 'Luma Isle awaits'", 'Arrival should use approved completion title');
    assertIncludes(boardSource, "activeStoryEpisode?.kind === 'island_resolution' ? 'The route is open'", 'Resolution should use approved completion title');
    assertIncludes(boardSource, "? 'Return to the island' : undefined", 'Arrival/resolution should use approved return copy');
  } },
  { name: 'StoryReader root declares game-owned text and surface tokens', run: () => {
    ['--island-story-text-primary', '--island-story-text-secondary', '--island-story-text-muted', '--island-story-surface', '--island-story-surface-elevated', '--island-story-action-text'].forEach((token) => assertIncludes(readerCss, token, `Missing ${token}`));
  } },
  { name: 'titles, status, body, captions, completion, CTA, and controls use explicit readable colors', run: () => {
    ['.island-story-reader__title', '.island-story-reader__progress', '.island-story-reader__status', '.island-story-reader__panel--text', '.island-story-reader__caption', '.island-story-reader__end-card h4', '.island-story-reader__end-card p', '.island-story-reader__end-card button', '.island-story-reader__icon-btn'].forEach((selector) => assertIncludes(readerCss, selector, `Missing explicit selector ${selector}`));
    assertIncludes(readerCss, 'color: var(--island-story-text-primary);', 'Primary text should not inherit generic app color');
    assertIncludes(readerCss, 'color: var(--island-story-text-secondary);', 'Secondary text should not inherit generic app color');
    assertIncludes(readerCss, 'color: var(--island-story-action-text);', 'CTA text should not use browser default button color');
    assert(!readerCss.includes('color: inherit'), 'StoryReader controls must not inherit app text colors');
  } },
  { name: 'CTA hit target, stacking, focus, and touch-safe wiring are present', run: () => {
    assertIncludes(readerCss, 'min-height: 44px;', 'Interactive targets must meet 44px minimum');
    assertIncludes(readerCss, '.island-story-reader__end-card {\n  position: relative;\n  z-index: 3;', 'Completion card should sit above any navigation/hit layers');
    assertIncludes(readerCss, ':focus-visible', 'Keyboard focus styling must remain visible');
    assertIncludes(readerCss, 'touch-action: manipulation;', 'CTA should use touch-safe standard click activation');
  } },
  { name: 'no full-panel navigation overlay is present to intercept completion CTA', run: () => {
    assert(!readerSource.includes('preventDefault'), 'StoryReader should not cancel CTA clicks via preventDefault');
    assert(!readerSource.includes('pointer-events: none'), 'StoryReader source should not disable pointer events on parent content');
    assert(!readerCss.includes('pointer-events: none'), 'StoryReader CSS should not disable pointer events on parent content');
  } },
];
