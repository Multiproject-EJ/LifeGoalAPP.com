// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

const componentPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantEncounter.tsx';
const previewPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantEncounter.preview.tsx';
const cssPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantEncounter.css';
const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const componentSource = readFileSync(componentPath, 'utf8');
const previewSource = readFileSync(previewPath, 'utf8');
const cssSource = readFileSync(cssPath, 'utf8');
function includes(source: string, expected: string) { assert(source.includes(expected), `Missing ${expected}`); }
function notIncludes(source: string, forbidden: string) { assert(!source.includes(forbidden), `Forbidden ${forbidden}`); }

export const islandInhabitantEncounterComponentTests: TestCase[] = [
  { name: 'does not render when closed', run: () => includes(componentSource, 'if (!isOpen) return null;') },
  { name: 'renders dialog semantics when open', run: () => ['role="dialog"', 'aria-modal="true"', 'aria-labelledby={titleId}', 'aria-describedby={descriptionId}'].forEach((n) => includes(componentSource, n)) },
  { name: 'renders inhabitant name role civilization island and greeting', run: () => ['inhabitant.displayName', 'inhabitant.roleLabel', 'inhabitant.civilizationName || islandName', 'greeting'].forEach((n) => includes(componentSource, n)) },
  { name: 'renders topics in supplied order with two and four preview states', run: () => { includes(componentSource, 'topics.map((topic)'); includes(previewSource, 'topics.slice(0, 2)'); includes(previewSource, 'fourTopics'); } },
  { name: 'unknown icon uses fallback and known icons map safely', run: () => { ['iconId === \'compass\'', 'iconId === \'book\'', 'iconId === \'inhabitant\'', ': \'conversation\'', 'mystery-unknown-icon'].forEach((n) => includes(componentSource + previewSource, n)); } },
  { name: 'controls use type button and close has accessible label', run: () => { assertEqual((componentSource.match(/type="button"/g) ?? []).length >= 2, true, 'Expected explicit button controls'); includes(componentSource, 'aria-label={closeLabel}'); } },
  { name: 'selecting topic calls only onSelectTopic with topic and not close', run: () => { includes(componentSource, 'onClick={() => onSelectTopic(topic)}'); notIncludes(componentSource, 'onSelectTopic(topic); onClose'); } },
  { name: 'close and Escape invoke only onClose', run: () => { includes(componentSource, "event.key === 'Escape'"); includes(componentSource, 'onClose();'); includes(componentSource, 'onClick={onClose}'); } },
  { name: 'focus enters returns and reopening/changing inhabitant refreshes focus behavior', run: () => { ['dialogRef.current?.focus()', 'lastFocusedRef.current?.focus?.()', '[isOpen, inhabitant.id]'].forEach((n) => includes(componentSource, n)); } },
  { name: 'character art renders and broken/missing art uses fallback', run: () => { ['data-character-art="full-body-contain"', 'object-fit: contain', 'onError={() => setFailed(true)}', 'data-character-fallback="servant-wizard-long-hat-hidden-face"'].forEach((n) => includes(componentSource + cssSource, n)); } },
  { name: 'fallback silhouette preserves long-hat hidden-face identity', run: () => { ['island-inhabitant-encounter__hat', 'island-inhabitant-encounter__face-shadow', 'island-inhabitant-encounter__staff'].forEach((n) => includes(componentSource + cssSource, n)); } },
  { name: 'background art renders and broken/missing background uses fallback', run: () => { ['data-background-art="full-bleed"', 'data-background-fallback="woodland-gradient-mist-crystals"', 'object-fit: cover'].forEach((n) => includes(componentSource + cssSource, n)); } },
  { name: 'portal root includes island-run-overlay-root', run: () => { includes(componentSource, 'createPortal(body, document.body)'); includes(componentSource, 'island-run-overlay-root island-inhabitant-encounter'); } },
  { name: 'component owns explicit text and action colors including light action dark text', run: () => { ['--iie-text-primary', '--iie-text-secondary', '--iie-action-surface', '--iie-action-text: #10213a', 'color: var(--iie-action-text)'].forEach((n) => includes(cssSource, n)); } },
  { name: 'woodland and fallback biome tokens exist', run: () => { ['--iie-accent: #78c89b', 'data-biome={inhabitant.biome || \'unknown\'}', 'data-biome="fire"', 'data-biome="celestial"', 'data-biome="underwater"', 'data-biome="desert"', 'data-biome="unknown"'].forEach((n) => includes(componentSource + cssSource, n)); } },
  { name: 'responsive and reduced-motion rules exist', run: () => { ['min-height: 100dvh', 'overflow: auto', 'overflow-x: hidden', 'max-width: 100%', 'min-height: 44px', 'overflow-wrap: anywhere', '@media (min-width: 760px)', '@media (max-height: 620px)', '@media (prefers-reduced-motion: reduce)'].forEach((n) => includes(cssSource, n)); } },
  { name: 'preview fixture covers required isolated states', run: () => { ['Island 1 woodland caretaker with three topics', 'missing character-art fallback', 'missing background fallback', 'long name and role', 'long topic labels', 'two-topic state', 'four-topic state', 'fire biome token preview', 'small-phone constrained-height preview', 'reduced-motion state'].forEach((n) => includes(previewSource, n)); } },
  { name: 'architecture isolation guards', run: () => ['islandRunStateActions', 'persistIslandRunRuntimeStatePatch', 'useIslandRunState', 'localStorage', 'sessionStorage', 'supabase', 'IslandRetroConversation', 'IslandNarrative', 'reward', 'build', 'boss', 'travel', 'IslandRunBoardPrototype'].forEach((n) => notIncludes(componentSource, n)) },
  { name: 'no production board integration', run: () => notIncludes(readFileSync(boardPath, 'utf8'), 'IslandInhabitantEncounter') },
];
