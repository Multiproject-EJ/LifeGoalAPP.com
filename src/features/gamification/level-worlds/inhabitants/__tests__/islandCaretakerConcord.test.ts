import { getIslandCaretakerConcordContent, hasIslandCaretakerConcordContent } from '../islandCaretakerConcord';
import { authoredCaretakerConcordEntries } from '../definitions/islandCaretakerConcordContent';
import { validateIslandConversationDefinition, validateIslandInhabitantContentSet } from '../islandConversationValidation';
import { island002NarrativeDefinition } from '../../narrative/definitions/island002Narrative';
import { island003NarrativeDefinition } from '../../narrative/definitions/island003Narrative';
import { island004NarrativeDefinition } from '../../narrative/definitions/island004Narrative';
import { island005NarrativeDefinition } from '../../narrative/definitions/island005Narrative';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

const SAMPLE_ISLANDS = [1, 2, 3, 4, 5, 6, 7, 12, 37, 60, 119, 120];

function expectValidContent(islandNumber: number): void {
  const content = getIslandCaretakerConcordContent(islandNumber);
  assert(Boolean(content), `Expected caretaker Concord content for island ${islandNumber}`);
  if (!content) return;
  assertEqual(content.islandNumber, islandNumber, `Expected content islandNumber ${islandNumber}`);
  assertEqual(content.inhabitant.islandNumber, islandNumber, `Expected inhabitant islandNumber ${islandNumber}`);
  assertEqual(content.topics.length, 3, `Expected three topics for island ${islandNumber}`);
  assertEqual(content.conversations.length, content.topics.length, `Expected one conversation per topic for island ${islandNumber}`);
  const setResult = validateIslandInhabitantContentSet({ inhabitants: [content.inhabitant], topics: content.topics, conversations: content.conversations });
  assert(setResult.valid, `Island ${islandNumber} content set invalid: ${setResult.errors.join('; ')}`);
  content.conversations.forEach((conversation) => {
    const result = validateIslandConversationDefinition(conversation);
    assert(result.valid, `Island ${islandNumber} conversation ${conversation.id} invalid: ${result.errors.join('; ')}`);
  });
}

export const islandCaretakerConcordTests: TestCase[] = [
  { name: 'caretaker Concord content exists and validates for islands 1 through 120 samples', run: () => SAMPLE_ISLANDS.forEach(expectValidContent) },
  { name: 'island 1 keeps the canonical Luma caretaker content', run: () => {
    const content = getIslandCaretakerConcordContent(1);
    assertEqual(content?.inhabitant.id, 'luma-caretaker', 'Expected Island 1 to reuse luma-caretaker');
    assertEqual(content?.islandName, 'Luma Isle', 'Expected Island 1 name Luma Isle');
    assertEqual(content?.topics[0]?.id, 'i001-topic-next-step', 'Expected canonical Island 1 topics');
  } },
  { name: 'authored islands 2-5 match their narrative island and civilization names', run: () => {
    const narrativeByIsland = new Map([
      [2, island002NarrativeDefinition],
      [3, island003NarrativeDefinition],
      [4, island004NarrativeDefinition],
      [5, island005NarrativeDefinition],
    ]);
    authoredCaretakerConcordEntries.forEach((entry) => {
      const narrative = narrativeByIsland.get(entry.islandNumber);
      assert(Boolean(narrative), `Expected narrative definition for authored island ${entry.islandNumber}`);
      assertEqual(entry.islandName, narrative?.islandName, `Expected island ${entry.islandNumber} name to match narrative`);
      assertEqual(entry.inhabitant.civilizationName, narrative?.civilizationName, `Expected island ${entry.islandNumber} civilization to match narrative`);
    });
  } },
  { name: 'fallback islands receive stable memoized content with island-scoped ids', run: () => {
    const first = getIslandCaretakerConcordContent(42);
    const second = getIslandCaretakerConcordContent(42);
    assert(first === second, 'Expected memoized fallback content reference');
    assertEqual(first?.inhabitant.id, 'island-042-caretaker', 'Expected island-scoped fallback inhabitant id');
    assert(Boolean(first?.topics.every((topic) => topic.id.startsWith('i042-'))), 'Expected island-scoped fallback topic ids');
    assert(Boolean(first?.conversations.every((conversation) => conversation.id.startsWith('I042-'))), 'Expected island-scoped fallback conversation ids');
  } },
  { name: 'every conversation offers player choices (smart chat)', run: () => SAMPLE_ISLANDS.forEach((islandNumber) => {
    const content = getIslandCaretakerConcordContent(islandNumber);
    content?.conversations.forEach((conversation) => {
      const hasChoice = Object.values(conversation.nodes).some((node) => node.type === 'choice');
      assert(hasChoice, `Expected a choice node in ${conversation.id}`);
    });
  }) },
  { name: 'invalid island numbers return no content', run: () => {
    assertEqual(getIslandCaretakerConcordContent(0), null, 'Expected null for island 0');
    assertEqual(getIslandCaretakerConcordContent(-3), null, 'Expected null for negative island');
    assertEqual(getIslandCaretakerConcordContent(2.5), null, 'Expected null for fractional island');
    assert(!hasIslandCaretakerConcordContent(0), 'Expected hasIslandCaretakerConcordContent(0) to be false');
    assert(hasIslandCaretakerConcordContent(2), 'Expected hasIslandCaretakerConcordContent(2) to be true');
  } },
];
