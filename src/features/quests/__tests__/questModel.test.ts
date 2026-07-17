import {
  assessQuestReadiness,
  buildCircularCalendarDays,
  emptyBehaviorDesign,
  emptyReflectionPlan,
  emptySmartDefinition,
  groupQuestHabitTags,
  isQuestVisibleOnDate,
  parseBehaviorDesign,
  parseReflectionPlan,
  parseSmartDefinition,
  questToDraft,
  type QuestDraft,
  type QuestHabitTag,
} from '../questModel';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

function completeDraft(): QuestDraft {
  return {
    goalId: 'goal-1',
    campaignId: 'campaign-1',
    title: 'Build a reliable morning practice',
    outcome: 'Complete the practice on 20 mornings',
    kind: 'behavior_experiment',
    status: 'draft',
    startsOn: '2026-07-01',
    endsOn: '2026-07-31',
    lifeWheelCategory: 'health',
    smartDefinition: {
      specific: 'Practice after waking',
      metric: 'completed mornings',
      targetValue: 20,
      targetUnit: 'mornings',
      achievable: 'The minimum version takes five minutes',
      relevant: 'It improves energy and focus',
    },
    behaviorDesign: {
      currentLoop: {
        cue: 'Alarm rings',
        routine: 'Open social media',
        reward: 'Easy stimulation',
        underlyingNeed: 'A gentle transition into the day',
      },
      betterLoop: {
        cue: 'Alarm rings',
        routine: 'Drink water and stretch',
        reward: 'Play one favorite song',
        underlyingNeed: 'A gentle transition into the day',
      },
      experimentQuestion: 'Does leaving water by the bed make starting easier?',
      environmentChanges: ['Put water by the bed', 'Charge phone outside the bedroom'],
      minimumMove: 'Drink three sips of water',
      recoveryRule: 'Restart at the next morning without making up missed days',
      keystoneHabitId: 'habit-1',
    },
    reflectionPlan: emptyReflectionPlan(),
    sourceCompassChapterId: null,
    sourceCompassActivityId: null,
  };
}

export function runAllQuestModelTests(): void {
  const ready = assessQuestReadiness(completeDraft());
  assertEqual(ready.smartScore, 5, 'A complete quest earns a full SMART score');
  assert(ready.loopReady, 'A complete replacement loop is ready');
  assert(ready.readyToActivate, 'A complete quest can activate');

  const draft = completeDraft();
  const restoredDraft = questToDraft({
    ...draft,
    id: 'quest-1',
    userId: 'user-1',
    completedAt: null,
    archivedAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  });
  assertEqual(restoredDraft.title, draft.title, 'A saved Quest can be reopened as a draft');
  assertEqual(restoredDraft.behaviorDesign.keystoneHabitId, 'habit-1', 'Editing preserves the keystone habit');

  const empty = assessQuestReadiness({
    ...completeDraft(),
    outcome: '',
    endsOn: null,
    smartDefinition: emptySmartDefinition(),
    behaviorDesign: emptyBehaviorDesign(),
  });
  assertEqual(empty.smartScore, 0, 'An empty quest has no SMART readiness');
  assertEqual(empty.loopMissing.length, 5, 'An empty quest reports every behavior design gap');
  assert(!empty.readyToActivate, 'An empty quest cannot activate');

  const parsedSmart = parseSmartDefinition({ metric: 'meals', targetValue: 12, ignored: true });
  assertEqual(parsedSmart.metric, 'meals', 'SMART JSON is parsed safely');
  assertEqual(parsedSmart.targetValue, 12, 'SMART numeric targets survive parsing');
  assertEqual(parsedSmart.specific, '', 'Missing SMART fields receive safe defaults');

  const parsedBehavior = parseBehaviorDesign({
    environmentChanges: [' Put fruit in sight ', 42, ''],
    betterLoop: { cue: 'Lunch', routine: 'Choose vegetables', reward: 'Enjoy color' },
  });
  assertEqual(parsedBehavior.environmentChanges.length, 1, 'Invalid environment changes are discarded');
  assertEqual(parsedBehavior.betterLoop.cue, 'Lunch', 'Behavior loops are restored from JSON');

  const parsedReflection = parseReflectionPlan({ cadence: 'daily', allyLettersEnabled: true });
  assertEqual(parsedReflection.cadence, 'daily', 'Reflection cadence is restored');
  assert(parsedReflection.allyLettersEnabled, 'Quest Ally letters can be enabled');

  assert(isQuestVisibleOnDate({ status: 'active', startsOn: '2026-07-01', endsOn: '2026-07-31' }, '2026-07-16'), 'Active quests appear during their date range');
  assert(!isQuestVisibleOnDate({ status: 'active', startsOn: '2026-07-20', endsOn: '2026-07-31' }, '2026-07-16'), 'Future quests stay hidden');
  assert(!isQuestVisibleOnDate({ status: 'draft', startsOn: null, endsOn: null }, '2026-07-16'), 'Draft quests stay hidden');

  const tag: QuestHabitTag = {
    questId: 'quest-1',
    questTitle: 'Morning reset',
    role: 'keystone',
    status: 'active',
    startsOn: '2026-07-01',
    endsOn: '2026-07-31',
    lifeWheelCategory: 'health',
  };
  const grouped = groupQuestHabitTags([
    { habitId: 'habit-1', tag },
    { habitId: 'habit-1', tag },
    { habitId: 'habit-2', tag: { ...tag, role: 'supporting' } },
  ]);
  assertEqual(grouped['habit-1'].length, 1, 'Duplicate quest tags are collapsed per habit');
  assertEqual(grouped['habit-2'][0].role, 'supporting', 'Every linked habit receives its role');

  const calendar = buildCircularCalendarDays('2026-07-16', {
    quests: [{ id: 'quest-1', status: 'active', startsOn: '2026-07-10', endsOn: '2026-07-20' }],
    campaigns: [{ id: 'campaign-1', active: true, startsOn: '2026-07-01', endsOn: '2026-07-31' }],
    goals: [{ id: 'goal-1', startsOn: '2026-07-16', targetDate: '2026-07-20' }],
  });
  const todayMarker = calendar.find((day) => day.date === '2026-07-16');
  assert(Boolean(todayMarker?.isToday), 'The circular calendar identifies today');
  assertEqual(todayMarker?.questIds[0], 'quest-1', 'Quest ranges are marked on the ring');
  assertEqual(todayMarker?.campaignIds[0], 'campaign-1', 'Campaign ranges are marked on the ring');
  assertEqual(todayMarker?.goalStartIds[0], 'goal-1', 'Goal starts are marked on the ring');
  const targetMarker = calendar.find((day) => day.date === '2026-07-20');
  assertEqual(targetMarker?.goalTargetIds[0], 'goal-1', 'Goal targets are marked on the ring');
}
