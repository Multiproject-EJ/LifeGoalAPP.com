import assert from 'node:assert/strict';
import {
  parseResolutionOptionsFromContent,
  parseSharedSummaryCardsFromContent,
} from '../../src/features/conflict-resolver/services/conflictAiSchemas';
import { buildResolutionOptionsFallback } from '../../src/features/conflict-resolver/services/conflictResolutionFallbacks';
import {
  buildConflictRoutingPromptContext,
  normalizeConflictRoutingForPrompt,
} from '../../src/features/conflict-resolver/services/conflictRoutingPromptContext';
import { resolveResolutionOptionsContent } from '../../src/features/conflict-resolver/services/conflictAiOrchestrator';
import {
  buildSharedSummaryCardsForDisplay,
  resolveResolutionBuilderNextStage,
  resolveSharedSessionUiStage,
  sanitizeForSharedSummary,
} from '../../src/features/conflict-resolver/hooks/useConflictSession';

function includesAny(text: string, terms: RegExp[]): boolean {
  return terms.some((term) => term.test(text));
}

function runStrictJsonParsing() {
  const validSummary = JSON.stringify({ summaryCards: [
    { id: 'what_happened', title: 'What happened', text: 'A timing expectation was missed.' },
  ] });
  const validOptions = JSON.stringify({ options: [
    { id: 'boundary', title: 'Clarify the boundary', description: 'Name the limit and the next step.' },
  ] });

  assert.equal(parseSharedSummaryCardsFromContent('{bad json').length, 0);
  assert.equal(parseResolutionOptionsFromContent('{bad json').length, 0);
  assert.equal(parseSharedSummaryCardsFromContent('```json\n' + validSummary + '\n```').length, 0);
  assert.equal(parseResolutionOptionsFromContent('```json\n' + validOptions + '\n```').length, 0);
  assert.equal(parseSharedSummaryCardsFromContent(JSON.stringify({ summaryCards: [{ id: 'wrong', title: '', text: '' }] })).length, 0);
  assert.equal(parseResolutionOptionsFromContent(JSON.stringify({ options: [{ id: 'x', title: '', description: '' }] })).length, 0);
  assert.equal(parseSharedSummaryCardsFromContent(validSummary).length, 1);
  assert.equal(parseResolutionOptionsFromContent(validOptions).length, 1);
}

function runSafetyFallbackBehavior() {
  const options = buildResolutionOptionsFallback({ safetyFlag: true });
  const text = options.map((option) => `${option.title} ${option.description}`).join(' ').toLowerCase();
  assert.ok(includesAny(text, [/support/, /document/, /boundary/, /trusted/]));
  assert.equal(includesAny(text, [/sorry/, /apolog/, /invite/, /agreement/, /reconcil/, /forgive/, /both sides/, /mutual/]), false);

  for (const content of [undefined, '{bad', JSON.stringify({ options: [{ title: 'You should apologize', description: 'You should invite them and agree because both sides must reconcile.' }] })]) {
    const resolved = resolveResolutionOptionsContent({ content, conflictRouting: { safetyFlag: true } });
    assert.equal(resolved.source, 'fallback');
    assert.deepEqual(resolved.options, options);
    assert.equal(includesAny(resolved.options.map((option) => `${option.title} ${option.description}`).join(' ').toLowerCase(), [/apolog/, /invite/, /agreement/, /reconcil/, /forgive/, /both sides/, /mutual/]), false);
  }
}

function runFairnessFallbackBehavior() {
  const warnedAi = JSON.stringify({ options: [
    { id: 'you_1', title: 'You must change', description: 'You always make this hard and you need to fix your behavior.' },
    { id: 'you_2', title: 'Your apology', description: 'Your next step is to admit your fault.' },
  ] });
  const resolved = resolveResolutionOptionsContent({ content: warnedAi, conflictRouting: { primaryConflictType: 'boundary_issue' } });
  assert.equal(resolved.fallbackUsed, true);
  assert.equal(resolved.fallbackReason, 'fairness_warnings');
  assert.equal(resolved.source, 'fallback');
  assert.ok(resolved.fairnessWarnings.length > 0);
  assert.equal(resolved.rejectedAiOptionCount, 2);
  assert.deepEqual(resolved.options, buildResolutionOptionsFallback({ primaryConflictType: 'boundary_issue' }));
}

function runRoutingNormalization() {
  assert.deepEqual(normalizeConflictRoutingForPrompt(undefined), { primaryConflictType: null, safetyFlag: false });
  assert.deepEqual(normalizeConflictRoutingForPrompt({ primaryConflictType: 'hurt_broken_trust' }), { primaryConflictType: 'hurt_broken_trust', safetyFlag: false });
  assert.deepEqual(normalizeConflictRoutingForPrompt({ secondarySignals: 'not-array' } as never), { primaryConflictType: null, safetyFlag: false });
  assert.doesNotThrow(() => buildConflictRoutingPromptContext({ primaryConflictType: 'surprise' } as never));
  assert.doesNotThrow(() => buildResolutionOptionsFallback({ primaryConflictType: 'surprise' } as never));
}

function runSharedHydrationResolver() {
  assert.equal(resolveSharedSessionUiStage('private_capture', false), 'conflict_type_routing');
  assert.equal(resolveSharedSessionUiStage('private_capture', true), 'private_capture');
  assert.equal(resolveSharedSessionUiStage('shared_read', false), 'parallel_read');
  const answers = { what_happened: 'draft stays' };
  assert.equal(buildSharedSummaryCardsForDisplay({ aiSummaryCards: [], answers, selectedType: 'shared_conflict' })[0].text, 'draft stays');
}

function runSharedSummaryFallbackBehavior() {
  const answers = {
    what_happened: 'You always called me stupid.',
    what_it_meant: '',
    what_is_needed: 'I need a calmer boundary.',
  };
  const cards = buildSharedSummaryCardsForDisplay({ aiSummaryCards: [], answers, selectedType: 'shared_conflict' });
  assert.equal(cards[0].text.includes('No summary available yet'), false);
  assert.equal(cards[1].text, 'No entry yet.');
  assert.ok(cards[0].toneSoftened);
  assert.ok(cards[0].moderationNotes.length > 0);
  assert.equal(sanitizeForSharedSummary('You never listen, idiot.').text.includes('idiot'), false);
}

function runSafetyClosePath() {
  assert.equal(resolveResolutionBuilderNextStage({ conflictRouting: { safetyFlag: true }, selectedResolution: null, activeProposalId: null }), 'safety_support_close');
  assert.notEqual(resolveResolutionBuilderNextStage({ conflictRouting: { safetyFlag: true }, selectedResolution: 'x', activeProposalId: null }), 'apology_alignment');
  assert.equal(resolveResolutionBuilderNextStage({ conflictRouting: { safetyFlag: false }, selectedResolution: null, activeProposalId: null }), null);
}

runStrictJsonParsing();
runSafetyFallbackBehavior();
runFairnessFallbackBehavior();
runRoutingNormalization();
runSharedHydrationResolver();
runSharedSummaryFallbackBehavior();
runSafetyClosePath();
console.log('Conflict Resolver behavioral validation checks passed.');
