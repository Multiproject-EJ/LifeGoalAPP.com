import {
  classifyHabitChain,
  validateChainSuggestionResponse,
  KEYSTONE_THRESHOLD,
  MAX_CHAIN_SUGGESTIONS,
  type HabitChainLink,
} from '../habitChainLogic';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

let linkSeq = 0;
function link(partial: Partial<HabitChainLink>): HabitChainLink {
  linkSeq += 1;
  return {
    id: partial.id ?? `link-${linkSeq}`,
    sourceHabitId: partial.sourceHabitId ?? 'source',
    targetHabitId: partial.targetHabitId ?? null,
    lifeArea: partial.lifeArea ?? null,
    direction: partial.direction ?? 'positive',
    strength: partial.strength ?? 'medium',
    consistency: partial.consistency ?? 'sometimes',
    evidence: partial.evidence ?? 'user_confirmed',
    status: partial.status ?? 'active',
    note: partial.note ?? null,
  };
}

export function runAllHabitChainLogicTests(): void {
  // --- classifyHabitChain ---
  {
    const summary = classifyHabitChain([]);
    assertEqual(summary.classification, 'isolated', 'empty links classify as isolated');
    assertEqual(summary.isPossibleKeystone, false, 'empty links are not keystone');
  }

  {
    const summary = classifyHabitChain([link({ targetHabitId: 'h1', direction: 'positive' })]);
    assertEqual(summary.classification, 'support', 'single positive link is support');
    assertEqual(summary.positiveCount, 1, 'positive count is 1');
  }

  {
    // Three distinct positive targets reaches the keystone threshold.
    const links = [
      link({ targetHabitId: 'h1', direction: 'positive' }),
      link({ targetHabitId: 'h2', direction: 'positive' }),
      link({ lifeArea: 'Health', direction: 'positive' }),
    ];
    assertEqual(KEYSTONE_THRESHOLD, 3, 'keystone threshold is 3 for this test');
    const summary = classifyHabitChain(links);
    assertEqual(summary.classification, 'keystone', 'three distinct positive targets is keystone');
    assertEqual(summary.distinctPositiveTargets, 3, 'distinct positive targets counted');
    assertEqual(summary.isPossibleKeystone, true, 'keystone flag set');
  }

  {
    // Duplicate target ids should not inflate distinct count.
    const links = [
      link({ targetHabitId: 'h1', direction: 'positive' }),
      link({ targetHabitId: 'h1', direction: 'positive' }),
    ];
    const summary = classifyHabitChain(links);
    assertEqual(summary.distinctPositiveTargets, 1, 'duplicate targets collapse to one');
    assertEqual(summary.classification, 'support', 'duplicate positives stay support');
  }

  {
    const links = [
      link({ targetHabitId: 'h1', direction: 'negative' }),
      link({ lifeArea: 'Money', direction: 'negative' }),
    ];
    const summary = classifyHabitChain(links);
    assertEqual(summary.classification, 'negative_cascade', 'two negatives is a cascade');
  }

  {
    const summary = classifyHabitChain([link({ lifeArea: 'Fun', direction: 'negative' })]);
    assertEqual(summary.classification, 'friction', 'single negative is friction');
  }

  {
    // Dismissed links never count toward classification.
    const links = [
      link({ targetHabitId: 'h1', direction: 'positive', status: 'dismissed' }),
      link({ targetHabitId: 'h2', direction: 'positive', status: 'dismissed' }),
      link({ targetHabitId: 'h3', direction: 'positive', status: 'dismissed' }),
    ];
    const summary = classifyHabitChain(links);
    assertEqual(summary.classification, 'isolated', 'dismissed links are ignored');
    assertEqual(summary.positiveCount, 0, 'dismissed positives not counted');
  }

  // --- validateChainSuggestionResponse ---
  {
    assertEqual(validateChainSuggestionResponse(null), null, 'null payload rejected');
    assertEqual(validateChainSuggestionResponse('nope'), null, 'string payload rejected');
    assertEqual(validateChainSuggestionResponse({}), null, 'missing suggestions rejected');
    assertEqual(validateChainSuggestionResponse({ suggestions: [] }), null, 'empty suggestions rejected');
  }

  {
    const valid = validateChainSuggestionResponse({
      suggestions: [
        { target_label: 'Drink water', target_kind: 'habit', direction: 'positive', rationale: 'May feel easier.', confidence: 'medium' },
      ],
      safety_note: null,
    });
    assert(valid !== null, 'valid payload accepted');
    assertEqual(valid!.suggestions.length, 1, 'one valid suggestion kept');
    assertEqual(valid!.suggestions[0].direction, 'positive', 'direction preserved');
    assertEqual(valid!.suggestions[0].confidence, 'medium', 'confidence preserved');
  }

  {
    // Invalid direction / missing fields are skipped; bad confidence defaults to low.
    const result = validateChainSuggestionResponse({
      suggestions: [
        { target_label: 'A', target_kind: 'life_area', direction: 'sideways', rationale: 'x' },
        { target_label: '', direction: 'positive', rationale: 'no label' },
        { target_label: 'B', direction: 'negative', rationale: 'ok', confidence: 'wild' },
      ],
    });
    assert(result !== null, 'partially-valid payload accepted');
    assertEqual(result!.suggestions.length, 1, 'only the salvageable suggestion kept');
    assertEqual(result!.suggestions[0].targetLabel, 'B', 'valid suggestion is B');
    assertEqual(result!.suggestions[0].confidence, 'low', 'bad confidence falls back to low');
  }

  {
    // Caps the number of suggestions.
    const many = Array.from({ length: 10 }, (_, index) => ({
      target_label: `Habit ${index}`,
      target_kind: 'habit',
      direction: 'positive',
      rationale: 'May help.',
      confidence: 'low',
    }));
    const result = validateChainSuggestionResponse({ suggestions: many });
    assert(result !== null, 'many suggestions accepted');
    assertEqual(result!.suggestions.length, MAX_CHAIN_SUGGESTIONS, 'suggestions capped at max');
  }

  {
    // Long strings are clamped, never dropped.
    const longLabel = 'x'.repeat(500);
    const result = validateChainSuggestionResponse({
      suggestions: [{ target_label: longLabel, direction: 'positive', rationale: 'y'.repeat(500) }],
    });
    assert(result !== null, 'long-string payload accepted');
    assert(result!.suggestions[0].targetLabel.length <= 60, 'target label clamped');
    assert(result!.suggestions[0].rationale.length <= 160, 'rationale clamped');
  }
}
