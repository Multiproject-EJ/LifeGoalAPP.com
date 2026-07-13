// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from '../../services/__tests__/testHarness';

const readerPath = 'src/features/gamification/level-worlds/components/IslandStoryReader.tsx';
const readerCssPath = 'src/features/gamification/level-worlds/components/IslandStoryReader.css';
const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';
// The reader now delegates scene rendering + the completion CTA to the shared
// StoryPlayer engine, so several UI-contract assertions target it directly.
const storyPlayerPath = 'src/features/story/StoryPlayer.tsx';
const storyPlayerCssPath = 'src/features/story/StoryPlayer.css';

const readerSource = readFileSync(readerPath, 'utf8');
const readerCss = readFileSync(readerCssPath, 'utf8');
const boardSource = readFileSync(boardPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');
const storyPlayerSource = readFileSync(storyPlayerPath, 'utf8');
const storyPlayerCss = readFileSync(storyPlayerCssPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

export const islandStoryReaderComponentTests: TestCase[] = [
  { name: 'final CTA is a button with accessible label wired to reward completion', run: () => {
    // The CTA now lives in the shared StoryPlayer; the reader wires reward completion into it.
    assertIncludes(storyPlayerSource, 'type="button"', 'StoryPlayer CTA must be an explicit button');
    assertIncludes(storyPlayerSource, "aria-label={isLast ? completionLabel : 'Next'}", 'Final CTA must expose the completion label as its accessible name');
    assertIncludes(readerSource, 'onComplete={handleCompletion}', 'Reader must wire completion to the StoryPlayer CTA via onComplete');
    assertIncludes(readerSource, 'completionLabel={completionCtaLabel}', 'Reader must pass the completion CTA label to StoryPlayer');
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
  { name: 'story surfaces use explicit readable colors via themeable tokens', run: () => {
    // StoryPlayer paints from themeable tokens rather than inheriting app colors...
    assertIncludes(storyPlayerCss, 'color: var(--story-text-primary)', 'Primary text should use the themeable token, not a generic app color');
    assertIncludes(storyPlayerCss, 'color: var(--story-text-secondary)', 'Secondary text should use the themeable token');
    assert(!storyPlayerCss.includes('color: inherit'), 'StoryPlayer must not inherit app text colors');
    // ...and the island theme maps the game-owned colors onto those tokens.
    assertIncludes(readerCss, '--story-text-primary: var(--island-story-text-primary)', 'Island theme must map game-owned text color onto the shared token');
    assertIncludes(readerCss, '--story-accent-text: var(--island-story-action-text)', 'Island theme must map game-owned action text onto the shared token');
  } },
  { name: 'CTA hit target, focus, and touch-safe wiring are present', run: () => {
    assertIncludes(storyPlayerCss, 'min-height: 44px', 'Interactive targets must meet 44px minimum');
    assertIncludes(storyPlayerCss, ':focus-visible', 'Keyboard focus styling must remain visible');
    assertIncludes(storyPlayerCss, 'touch-action: manipulation', 'CTA should use touch-safe standard click activation');
  } },
  { name: 'no full-panel navigation overlay is present to intercept completion CTA', run: () => {
    assert(!readerSource.includes('preventDefault'), 'StoryReader should not cancel CTA clicks via preventDefault');
    assert(!readerSource.includes('pointer-events: none'), 'StoryReader source should not disable pointer events on parent content');
    assert(!readerCss.includes('pointer-events: none'), 'StoryReader CSS should not disable pointer events on parent content');
  } },
];
