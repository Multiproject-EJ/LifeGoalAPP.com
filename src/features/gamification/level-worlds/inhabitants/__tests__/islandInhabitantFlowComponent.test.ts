// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
const componentPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantFlow.tsx';
const previewPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantFlow.preview.tsx';
const cssPath = 'src/features/gamification/level-worlds/inhabitants/components/IslandInhabitantFlow.css';
const componentSource = readFileSync(componentPath, 'utf8');
const previewSource = readFileSync(previewPath, 'utf8');
const cssSource = readFileSync(cssPath, 'utf8');
function includes(source: string, expected: string) { assert(source.includes(expected), `Missing ${expected}`); }
function notIncludes(source: string, forbidden: string) { assert(!source.includes(forbidden), `Forbidden ${forbidden}`); }
export const islandInhabitantFlowComponentTests: TestCase[] = [
  { name: 'does not render when closed and opens at encounter layer', run: () => { includes(componentSource, 'if (!isOpen) return null;'); includes(componentSource, "{ kind: 'encounter' }"); } },
  { name: 'reopening changing inhabitant and content reset flow state', run: () => ['resetFlow', 'setLastTopicId(undefined)', 'setConversationResult(undefined)', 'setDiscussedTopicIds([])', '[isOpen, inhabitant.id, topics, conversations, resetFlow]'].forEach((n) => includes(componentSource, n)) },
  { name: 'uses reusable topic-to-conversation resolver', run: () => includes(componentSource, 'resolveIslandInhabitantTopicConversation(inhabitant, topics, conversations, topic)') },
  { name: 'selected topic ID is retained and result metadata is presentation-only', run: () => { includes(componentSource, 'setLastTopicId(topic.id)'); includes(componentSource, 'lastTopicId'); ['reward', 'economy', 'build', 'boss', 'travel'].forEach((n) => notIncludes(componentSource, n)); } },
  { name: 'only one dialog owner exists at a time through embedded children', run: () => { includes(componentSource, 'role="dialog"'); includes(componentSource, 'aria-modal="true"'); assertEqual((componentSource.match(/presentationMode="embedded"/g) ?? []).length, 2, 'Expected two embedded children'); } },
  { name: 'portal and scroll ownership are centralized in flow', run: () => { includes(componentSource, 'createPortal(body, document.body)'); includes(componentSource, "lockPageScroll(['body', 'documentElement'])"); includes(componentSource, 'island-run-overlay-root island-inhabitant-flow'); } },
  { name: 'layer transition and reduced motion exist', run: () => { includes(cssSource, 'island-inhabitant-flow-fade-slide'); includes(cssSource, '@media (prefers-reduced-motion: reduce)'); includes(cssSource, 'island-inhabitant-flow-fade-only'); } },
  { name: 'retro returnTo encounter returns to topics and marks discussed locally', run: () => { includes(componentSource, "if (result.returnTo === 'board')"); includes(componentSource, "setLayer({ kind: 'encounter' })"); includes(componentSource, 'setDiscussedTopicIds'); } },
  { name: 'retro returnTo board closes full flow with result', run: () => { includes(componentSource, "closeReason: 'conversation_returned_to_board'"); includes(componentSource, 'conversationResult: result'); includes(componentSource, 'conversationId: string'); } },
  { name: 'retro early exit returns to encounter', run: () => includes(componentSource, "onExit={() => setLayer({ kind: 'encounter' })}") },
  { name: 'encounter close and Escape close full flow', run: () => { includes(componentSource, "closeReason: 'user_closed'"); includes(componentSource, "event.key !== 'Escape'"); includes(componentSource, 'handleEncounterClose'); } },
  { name: 'missing content error has Back and Close and reports missing_content', run: () => { ['role="alert"', 'aria-live="assertive"', 'Back to topics', "closeReason: 'missing_content'"].forEach((n) => includes(componentSource, n)); } },
  { name: 'session-only discussed marker and no storage', run: () => { includes(componentSource, 'discussedTopicIds'); ['localStorage', 'sessionStorage'].forEach((n) => notIncludes(componentSource, n)); } },
  { name: 'preview fixture covers required isolated states', run: () => ['Initial premium encounter', 'First topic selected → retro conversation', 'Retro conversation returns to encounter', 'Conversation returns to board', 'Missing conversation error', 'Missing character art fallback', 'Missing retro sprite fallback', 'Completed/discussed topic marker', 'Fire biome flow', 'Reduced-motion transition', 'Switching inhabitants while open resets flow', 'Small-phone constrained-height flow'].forEach((n) => includes(previewSource, n)) },
  { name: 'architecture isolation guards', run: () => ['IslandRunBoardPrototype', 'islandRunStateActions', 'persistIslandRunRuntimeStatePatch', 'useIslandRunState', 'supabase', 'feature flag', 'StoryReader'].forEach((n) => notIncludes(componentSource + previewSource, n)) },
];
