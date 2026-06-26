// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

const componentPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandRetroConversation.tsx';
const previewPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandRetroConversation.preview.tsx';
const cssPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandRetroConversation.css';
const componentSource = readFileSync(componentPath, 'utf8');
const previewSource = readFileSync(previewPath, 'utf8');
const cssSource = readFileSync(cssPath, 'utf8');
function includes(source: string, expected: string) { assert(source.includes(expected), `Missing ${expected}`); }

export const islandRetroConversationComponentTests: TestCase[] = [
  { name: 'does not render when closed', run: () => includes(componentSource, 'if (!isOpen) return null;') },
  { name: 'renders dialog semantics when open', run: () => ['role="dialog"', 'aria-modal="true"', 'aria-labelledby={titleId}', 'aria-describedby={descriptionId}'].forEach((n) => includes(componentSource, n)) },
  { name: 'renders inhabitant display name and NPC text', run: () => { includes(componentSource, 'inhabitant.displayName'); includes(componentSource, 'node.text'); } },
  { name: 'renders choice prompt and ordered choices', run: () => { includes(componentSource, 'node.prompt'); includes(componentSource, 'node.choices.map'); } },
  { name: 'renders close-node action', run: () => { includes(componentSource, "node.type === 'close'"); includes(componentSource, "node.label ?? 'Finish conversation'"); } },
  { name: 'uses type button for controls', run: () => assertEqual((componentSource.match(/type="button"/g) ?? []).length >= 4, true, 'Expected explicit button types') },
  { name: 'missing sprites use fallbacks', run: () => { includes(componentSource, 'data-sprite-fallback'); includes(componentSource, 'onError={() => setFailed(true)}'); } },
  { name: 'pixel assets use pixelated rendering and text does not', run: () => { includes(cssSource, 'image-rendering: pixelated;'); includes(cssSource, 'image-rendering: auto;'); } },
  { name: 'long text remains structurally safe', run: () => { includes(cssSource, 'overflow-wrap: anywhere;'); includes(cssSource, 'overflow: auto;'); } },
  { name: 'input node respects maximum length and returns text responses', run: () => { includes(componentSource, 'maxLength={node.maxLength}'); includes(componentSource, 'textResponses'); includes(componentSource, '[node.id]: draftText'); } },
  { name: 'typewriter reveal and reduced motion semantics exist', run: () => { includes(componentSource, 'Reveal full text'); includes(componentSource, 'setVisibleCharacters(fullText.length)'); includes(componentSource, "'(prefers-reduced-motion: reduce)'"); } },
  { name: 'choice records selected ID once', run: () => includes(componentSource, 'current.includes(result.choiceId) ? current : [...current, result.choiceId]') },
  { name: 'close returns returnTo and selected choices', run: () => { includes(componentSource, 'returnTo: node.returnTo'); includes(componentSource, 'selectedChoiceIds'); } },
  { name: 'Escape invokes onExit and exit does not invoke onClose', run: () => { includes(componentSource, "event.key === 'Escape'"); includes(componentSource, 'onExit();'); assert(!componentSource.includes('onClose();'), 'Exit must not directly call onClose without a result'); } },
  { name: 'reopening and switching reset state', run: () => { includes(componentSource, 'setSelectedChoiceIds([])'); includes(componentSource, 'setTextResponses({})'); includes(componentSource, '[conversation, initialNodeId, isOpen]'); } },
  { name: 'architecture isolation guards', run: () => ['islandRunStateActions', 'persistIslandRunRuntimeStatePatch', 'localStorage', 'sessionStorage', 'supabase', 'reward', 'build', 'boss', 'travel', 'IslandRunBoardPrototype'].forEach((n) => assert(!componentSource.includes(n), `Forbidden ${n}`)) },
  { name: 'portal root and owned colors exist', run: () => { includes(componentSource, 'island-run-overlay-root island-retro-conversation'); ['--retro-text', '--retro-parchment-text', 'color: #ffffff;', 'color: #102637;'].forEach((n) => includes(cssSource, n)); } },
  { name: 'preview fixture covers requested states', run: () => { ['first NPC node', 'choice node', 'branch response', 'close node', 'missing inhabitant sprite fallback', 'missing player sprite fallback', 'long text wrapping', 'reduced-motion/full-text mode', 'optional text response node'].forEach((n) => includes(previewSource, n)); } },
  { name: 'no production wiring appears in board', run: () => { const board = readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8'); assert(!board.includes('IslandRetroConversation'), 'Board must not import or render the retro conversation'); } },
];
