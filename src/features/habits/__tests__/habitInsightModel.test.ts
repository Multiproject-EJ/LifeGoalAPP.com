import {
  CUE_CHIP_GROUPS,
  cueLabel,
  formatInsightsForPrompt,
  summarizeInsights,
  type HabitInsightRecord,
} from '../habitInsightModel';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

export function runHabitInsightModelTests(): void {
  // Cue catalogue has unique values and human labels.
  const allValues = CUE_CHIP_GROUPS.flatMap((g) => g.chips.map((c) => c.value));
  assertEqual(new Set(allValues).size, allValues.length, 'Cue values are unique');
  assertEqual(cueLabel('tired'), 'Tired', 'cueLabel maps known value');
  assertEqual(cueLabel('unknown_value'), 'unknown value', 'cueLabel falls back to humanised raw value');

  const insights: HabitInsightRecord[] = [
    { cueTags: ['tired', 'scrolling'], note: 'Always after dinner', capturedOn: '2026-06-25' },
    { cueTags: ['tired'], note: null, capturedOn: '2026-06-26' },
    { cueTags: ['bored', 'tired'], note: 'too tired to start', capturedOn: '2026-06-27' },
  ];

  const summary = summarizeInsights(insights);
  assertEqual(summary.total, 3, 'Summary counts all insights');
  assertEqual(summary.topCues[0].value, 'tired', 'Most frequent cue ranked first');
  assertEqual(summary.topCues[0].count, 3, 'Tired counted three times');
  // Notes returned newest-first.
  assertEqual(summary.notes[0], 'too tired to start', 'Newest note first');
  assert(summary.notes.includes('Always after dinner'), 'Includes earlier note');

  // De-duplication of identical notes (case-insensitive).
  const dupSummary = summarizeInsights([
    { cueTags: [], note: 'Same note', capturedOn: '2026-06-27' },
    { cueTags: [], note: 'same note', capturedOn: '2026-06-26' },
  ]);
  assertEqual(dupSummary.notes.length, 1, 'Duplicate notes collapsed');

  // Prompt formatting.
  const prompt = formatInsightsForPrompt(summary);
  assert(prompt !== null, 'Prompt produced when there is data');
  assert(prompt!.includes('Tired (x3)'), 'Prompt shows counted top cue');
  assert(prompt!.includes('"too tired to start"'), 'Prompt quotes a note');

  // Empty input yields no prompt.
  assertEqual(formatInsightsForPrompt(summarizeInsights([])), null, 'No prompt without data');
  assertEqual(
    formatInsightsForPrompt(summarizeInsights([{ cueTags: [], note: '   ', capturedOn: '2026-06-27' }])),
    null,
    'No prompt when only blank notes',
  );
}
