// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from './testHarness';

const cssPath = 'src/features/gamification/level-worlds/LevelWorlds.css';
const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const buildModalPath = 'src/features/gamification/level-worlds/components/BuildModalV2.tsx';
const dialoguePath = 'src/features/gamification/level-worlds/narrative/components/IslandNarrativeDialogue.tsx';
const toastPath = 'src/features/gamification/level-worlds/narrative/components/IslandNarrativeToast.tsx';
const storyReaderCssPath = 'src/features/gamification/level-worlds/components/IslandStoryReader.css';

const css = readFileSync(cssPath, 'utf8');
const boardSource = readFileSync(boardPath, 'utf8');
const buildModalSource = readFileSync(buildModalPath, 'utf8');
const dialogueSource = readFileSync(dialoguePath, 'utf8');
const toastSource = readFileSync(toastPath, 'utf8');
const storyReaderCss = readFileSync(storyReaderCssPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

function assertSelectorHasColor(selector: string, message = `${selector} must declare a color`) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert(new RegExp(`${escaped}[^{}]*\\{[^}]*color\\s*:`).test(css), message);
}

export const islandRunModalTextColorGuardTests: TestCase[] = [
  { name: 'shared Island Run roots declare fixed game-owned text tokens', run: () => {
    ['.level-worlds-island-run-shell,', '.island-run-overlay-root', '--island-game-text-primary: #eafcff;', '--island-game-text-secondary:', '--island-game-action-text: #ffffff;', '--island-game-surface:', 'color: var(--island-game-text-primary);', 'color-scheme: dark;'].forEach((needle) => assertIncludes(css, needle, `Missing shared token ${needle}`));
    assert(!css.includes('@media (prefers-color-scheme') || !/--island-game-text-primary\s*:/.test(css.split('@media (prefers-color-scheme')[1] ?? ''), 'System appearance media queries must not redefine Island Run text tokens');
  } },
  { name: 'portal-rendered Island Run overlays carry the shared overlay root class', run: () => {
    [boardSource, buildModalSource, dialogueSource, toastSource].forEach((source) => assertIncludes(source, 'island-run-overlay-root', 'Portal/overlay source must include island-run-overlay-root'));
    assert(!boardSource.includes('className="island-stop-modal-backdrop"'), 'Board stop modal portals must not rely on body-inherited colors');
  } },
  { name: 'StoryReader keeps component-owned text tokens', run: () => {
    ['--island-story-text-primary', '--island-story-text-secondary', '--island-story-action-text', 'color: var(--island-story-text-primary);'].forEach((needle) => assertIncludes(storyReaderCss, needle, `StoryReader missing ${needle}`));
  } },
  { name: 'dialogue and toast define explicit text and button colors', run: () => {
    ['.island-narrative-dialogue', '.island-narrative-dialogue__speaker-kicker', '.island-narrative-dialogue__speaker', '.island-narrative-dialogue__copy--secondary', '.island-narrative-dialogue__continue', '.island-narrative-toast', '.island-narrative-toast__card', '.island-narrative-toast__label', '.island-narrative-toast__speaker', '.island-narrative-toast__text', '.island-narrative-toast__landmark'].forEach((selector) => assertSelectorHasColor(selector));
  } },
  { name: 'Build, travel, win, and stop surfaces define explicit readable colors', run: () => {
    ['.bm2-shell', '.bm2-header__title', '.bm2-header__essence', '.bm2-card__name', '.bm2-card__status', '.bm2-card__disabled-hint', '.island-travel-overlay', '.island-travel-overlay__title', '.island-travel-overlay__subtitle', '.island-win-celebration__card', '.island-win-celebration__title', '.island-win-celebration__subtitle', '.island-stop-modal h3,', '.island-stop-modal p', '.island-stop-modal button'].forEach((selector) => assertSelectorHasColor(selector));
  } },
  { name: 'inputs, placeholders, native buttons, disabled controls, and fallback states are explicit', run: () => {
    ['.island-run-overlay-root button,', '.island-run-overlay-root input,', '.island-run-overlay-root input::placeholder,', '.island-run-compass-modal__input', '.wpm-error', '.wpm-already-claimed', '.bm2-artwork__placeholder-label', '.island-stop-modal__btn:disabled'].forEach((selector) => assertSelectorHasColor(selector));
    assertIncludes(css, 'caret-color: var(--island-game-focus);', 'Input caret must be visible on Island Run dark surfaces');
  } },
  { name: 'guard risky modal inheritance patterns in Island Run CSS', run: () => {
    const riskyGenericTokens = ['var(--text-primary)', 'var(--text-secondary)', 'var(--foreground)', 'var(--muted-foreground)'];
    riskyGenericTokens.forEach((needle) => assert(!css.includes(needle), `Island Run CSS must not use generic app text token ${needle}`));
    assert(!/\.island-[^{]*(modal|overlay|dialogue|toast)[^{]*\{[^}]*color:\s*inherit\b/.test(css), 'Island Run modal/overlay selectors must not use color: inherit');
  } },
];
