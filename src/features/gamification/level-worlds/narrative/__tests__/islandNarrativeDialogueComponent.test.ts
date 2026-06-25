// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

const componentPath = 'src/features/gamification/level-worlds/narrative/components/IslandNarrativeDialogue.tsx';
const previewPath = 'src/features/gamification/level-worlds/narrative/components/IslandNarrativeDialogue.preview.tsx';
const cssPath = 'src/features/gamification/level-worlds/LevelWorlds.css';

const componentSource = readFileSync(componentPath, 'utf8');
const previewSource = readFileSync(previewPath, 'utf8');
const cssSource = readFileSync(cssPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

export const islandNarrativeDialogueComponentTests: TestCase[] = [
  { name: 'dialogue does not render when closed', run: () => assertIncludes(componentSource, 'if (!isOpen) return null;', 'Expected closed render guard') },
  { name: 'component API stays presentation-only', run: () => { const forbidden = ['stopId', 'reward', 'build', 'boss', 'travelTo', 'persist', 'seen', 'localStorage', 'runtimeState']; forbidden.forEach((term) => assert(!componentSource.includes(term), `Dialogue component must not include ${term}`)); } },
  { name: 'renders speaker name and primary/secondary text props', run: () => { assertIncludes(componentSource, '{speakerName}', 'Speaker name should render'); assertIncludes(componentSource, '{text}', 'Primary text should render'); assertIncludes(componentSource, 'secondaryText ?', 'Secondary text should be optional'); } },
  { name: 'supports missing and broken portraits with fallback', run: () => { assertIncludes(componentSource, 'hasPortraitError', 'Expected portrait error state'); assertIncludes(componentSource, 'data-portrait-fallback="true"', 'Expected portrait fallback marker'); assertIncludes(componentSource, 'onError={() => setHasPortraitError(true)}', 'Expected broken portrait handler'); } },
  { name: 'continue callback is isolated from close callback', run: () => { assertIncludes(componentSource, 'onClick={onContinue}', 'Continue button should call onContinue directly'); assertIncludes(componentSource, 'onClick={onClose}', 'Close button should call onClose directly'); } },
  { name: 'Escape closes through presentation close callback', run: () => { assertIncludes(componentSource, "event.key === 'Escape'", 'Expected Escape key handler'); assertIncludes(componentSource, 'onClose();', 'Escape should call onClose'); } },
  { name: 'custom labels and hidden close are supported', run: () => { assertIncludes(componentSource, "continueLabel = DEFAULT_CONTINUE_LABEL", 'Expected default continue label'); assertIncludes(componentSource, "closeLabel = DEFAULT_CLOSE_LABEL", 'Expected default close label'); assertIncludes(componentSource, 'showClose = true', 'Expected showClose default'); assertIncludes(componentSource, '{showClose ?', 'Expected close render guard'); } },
  { name: 'tone classes cover standard wisdom and guardian', run: () => { assertIncludes(componentSource, "'standard' | 'wisdom' | 'guardian'", 'Expected tone union'); ['--standard', '--wisdom', '--guardian'].forEach((suffix) => assertIncludes(cssSource, `.island-narrative-dialogue${suffix}`, `Expected CSS tone ${suffix}`)); } },
  { name: 'accessible dialog attributes and button names are present', run: () => { ['role="dialog"', 'aria-modal="true"', 'aria-labelledby={titleId}', 'aria-describedby={descriptionId}', 'aria-label={closeLabel}'].forEach((needle) => assertIncludes(componentSource, needle, `Missing ${needle}`)); } },
  { name: 'focus management and scroll lock are present', run: () => { assertIncludes(componentSource, 'lockPageScroll', 'Expected existing scroll-lock helper'); assertIncludes(componentSource, 'dialogRef.current?.focus()', 'Expected focus moves into dialog'); assertIncludes(componentSource, 'lastFocusedRef.current?.focus?.()', 'Expected focus return'); } },
  { name: 'reduced-motion behavior and class are present', run: () => { assertIncludes(componentSource, 'data-reduced-motion-safe="true"', 'Expected reduced-motion safe marker'); assertIncludes(cssSource, '@media (prefers-reduced-motion: reduce)', 'Expected reduced-motion CSS'); } },
  { name: 'long content is structurally constrained', run: () => { assertIncludes(cssSource, 'overflow: auto;', 'Expected constrained internal overflow'); assertIncludes(cssSource, 'overflow-wrap: anywhere;', 'Expected safe wrapping'); assertIncludes(cssSource, 'max-height: min(31dvh, 13rem);', 'Expected content max height'); } },
  { name: 'mobile bottom sheet and tablet centered layouts exist', run: () => { assertIncludes(cssSource, 'align-items: flex-end;', 'Expected mobile bottom anchoring'); assertIncludes(cssSource, '@media (min-width: 720px)', 'Expected tablet/desktop breakpoint'); assertIncludes(cssSource, 'align-items: center;', 'Expected larger-screen centering'); } },
  { name: 'preview fixture covers requested states', run: () => { ['Miri', 'Poko', 'Elder Sava', 'Noctyra', 'longer preview line', 'Missing Portrait'].forEach((needle) => assertIncludes(previewSource, needle, `Preview missing ${needle}`)); assertEqual((previewSource.match(/speakerName:/g) ?? []).length, 6, 'Expected six preview states'); } },
  { name: 'no gameplay/action imports are introduced', run: () => { const importLines = componentSource.split('\n').filter((line: string) => line.startsWith('import ')).join('\n'); ['islandRunStateActions', 'persistIslandRunRuntimeStatePatch', 'islandRunRollAction', 'islandRunTileRewardAction', 'IslandRunBoardPrototype'].forEach((needle) => assert(!importLines.includes(needle), `Forbidden import ${needle}`)); } },
  { name: 'no narrative state persistence or localStorage interaction exists', run: () => { ['localStorage', 'sessionStorage', 'indexedDB', 'persistIslandRunRuntimeStatePatch'].forEach((needle) => assert(!componentSource.includes(needle), `Forbidden persistence usage ${needle}`)); } },
];
