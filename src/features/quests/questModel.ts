export type QuestKind = 'smart_goal' | 'behavior_experiment' | 'milestone' | 'recovery';
export type QuestStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type QuestHabitRole = 'keystone' | 'supporting';
export type QuestReflectionType = 'check_in' | 'loop_review' | 'completion' | 'ally_reply';

export type SmartDefinition = {
  specific: string;
  metric: string;
  targetValue: number | null;
  targetUnit: string;
  achievable: string;
  relevant: string;
};

export type BehaviorLoop = {
  cue: string;
  routine: string;
  reward: string;
  underlyingNeed: string;
};

export type BehaviorDesign = {
  currentLoop: BehaviorLoop;
  betterLoop: BehaviorLoop;
  experimentQuestion: string;
  environmentChanges: string[];
  minimumMove: string;
  recoveryRule: string;
  keystoneHabitId: string | null;
};

export type ReflectionPlan = {
  cadence: 'daily' | 'weekly' | 'milestones';
  evidenceQuestions: string[];
  allyLettersEnabled: boolean;
};

export type Quest = {
  id: string;
  userId: string;
  goalId: string | null;
  campaignId: string | null;
  title: string;
  outcome: string;
  kind: QuestKind;
  status: QuestStatus;
  startsOn: string | null;
  endsOn: string | null;
  lifeWheelCategory: string | null;
  smartDefinition: SmartDefinition;
  behaviorDesign: BehaviorDesign;
  reflectionPlan: ReflectionPlan;
  sourceCompassChapterId: string | null;
  sourceCompassActivityId: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestDraft = Omit<
  Quest,
  'id' | 'userId' | 'completedAt' | 'archivedAt' | 'createdAt' | 'updatedAt'
>;

export function questToDraft(quest: Quest): QuestDraft {
  return {
    goalId: quest.goalId,
    campaignId: quest.campaignId,
    title: quest.title,
    outcome: quest.outcome,
    kind: quest.kind,
    status: quest.status,
    startsOn: quest.startsOn,
    endsOn: quest.endsOn,
    lifeWheelCategory: quest.lifeWheelCategory,
    smartDefinition: quest.smartDefinition,
    behaviorDesign: quest.behaviorDesign,
    reflectionPlan: quest.reflectionPlan,
    sourceCompassChapterId: quest.sourceCompassChapterId,
    sourceCompassActivityId: quest.sourceCompassActivityId,
  };
}

export type QuestHabitTag = {
  questId: string;
  questTitle: string;
  role: QuestHabitRole;
  status: QuestStatus;
  startsOn: string | null;
  endsOn: string | null;
  lifeWheelCategory: string | null;
};

export type QuestReadiness = {
  smartScore: number;
  smartTotal: 5;
  smartMissing: Array<'specific' | 'measurable' | 'achievable' | 'relevant' | 'time_bound'>;
  loopReady: boolean;
  loopMissing: Array<'current_loop' | 'better_loop' | 'experiment' | 'minimum_move' | 'recovery_rule'>;
  readyToActivate: boolean;
};

export type CircularCalendarDay = {
  date: string;
  dayNumber: number;
  isToday: boolean;
  questIds: string[];
  campaignIds: string[];
  goalStartIds: string[];
  goalTargetIds: string[];
};

export type CircularCalendarSource = {
  quests: Array<Pick<Quest, 'id' | 'status' | 'startsOn' | 'endsOn'>>;
  campaigns: Array<{ id: string; startsOn: string | null; endsOn: string | null; active: boolean }>;
  goals: Array<{ id: string; startsOn: string | null; targetDate: string | null }>;
};

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const asString = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const asNullableString = (value: unknown): string | null => {
  const result = asString(value);
  return result || null;
};

const asFiniteNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const asStringArray = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map(asString).filter(Boolean)
    : []
);

export function emptyBehaviorLoop(): BehaviorLoop {
  return { cue: '', routine: '', reward: '', underlyingNeed: '' };
}

export function emptySmartDefinition(): SmartDefinition {
  return {
    specific: '',
    metric: '',
    targetValue: null,
    targetUnit: '',
    achievable: '',
    relevant: '',
  };
}

export function emptyBehaviorDesign(): BehaviorDesign {
  return {
    currentLoop: emptyBehaviorLoop(),
    betterLoop: emptyBehaviorLoop(),
    experimentQuestion: '',
    environmentChanges: [],
    minimumMove: '',
    recoveryRule: '',
    keystoneHabitId: null,
  };
}

export function emptyReflectionPlan(): ReflectionPlan {
  return {
    cadence: 'weekly',
    evidenceQuestions: [
      'What made the better loop easier this time?',
      'What should I change in the next experiment?',
    ],
    allyLettersEnabled: false,
  };
}

export function parseSmartDefinition(value: unknown): SmartDefinition {
  const record = asRecord(value);
  return {
    specific: asString(record.specific),
    metric: asString(record.metric),
    targetValue: asFiniteNumber(record.targetValue),
    targetUnit: asString(record.targetUnit),
    achievable: asString(record.achievable),
    relevant: asString(record.relevant),
  };
}

export function parseBehaviorLoop(value: unknown): BehaviorLoop {
  const record = asRecord(value);
  return {
    cue: asString(record.cue),
    routine: asString(record.routine),
    reward: asString(record.reward),
    underlyingNeed: asString(record.underlyingNeed),
  };
}

export function parseBehaviorDesign(value: unknown): BehaviorDesign {
  const record = asRecord(value);
  return {
    currentLoop: parseBehaviorLoop(record.currentLoop),
    betterLoop: parseBehaviorLoop(record.betterLoop),
    experimentQuestion: asString(record.experimentQuestion),
    environmentChanges: asStringArray(record.environmentChanges),
    minimumMove: asString(record.minimumMove),
    recoveryRule: asString(record.recoveryRule),
    keystoneHabitId: asNullableString(record.keystoneHabitId),
  };
}

export function parseReflectionPlan(value: unknown): ReflectionPlan {
  const record = asRecord(value);
  const cadence = record.cadence;
  return {
    cadence: cadence === 'daily' || cadence === 'milestones' ? cadence : 'weekly',
    evidenceQuestions: asStringArray(record.evidenceQuestions),
    allyLettersEnabled: record.allyLettersEnabled === true,
  };
}

function hasLoop(loop: BehaviorLoop): boolean {
  return Boolean(loop.cue && loop.routine && loop.reward);
}

/**
 * A quest is not just a smaller goal. It must be measurable and it must teach
 * the player something about the behavior loop they are replacing.
 */
export function assessQuestReadiness(quest: Pick<
  QuestDraft,
  'outcome' | 'endsOn' | 'smartDefinition' | 'behaviorDesign'
>): QuestReadiness {
  const smartMissing: QuestReadiness['smartMissing'] = [];
  const specific = Boolean(quest.smartDefinition.specific || quest.outcome.trim());
  const measurable = Boolean(
    quest.smartDefinition.metric
    && (quest.smartDefinition.targetValue !== null || quest.smartDefinition.targetUnit),
  );

  if (!specific) smartMissing.push('specific');
  if (!measurable) smartMissing.push('measurable');
  if (!quest.smartDefinition.achievable) smartMissing.push('achievable');
  if (!quest.smartDefinition.relevant) smartMissing.push('relevant');
  if (!quest.endsOn) smartMissing.push('time_bound');

  const loopMissing: QuestReadiness['loopMissing'] = [];
  if (!hasLoop(quest.behaviorDesign.currentLoop)) loopMissing.push('current_loop');
  if (!hasLoop(quest.behaviorDesign.betterLoop)) loopMissing.push('better_loop');
  if (!quest.behaviorDesign.experimentQuestion) loopMissing.push('experiment');
  if (!quest.behaviorDesign.minimumMove) loopMissing.push('minimum_move');
  if (!quest.behaviorDesign.recoveryRule) loopMissing.push('recovery_rule');

  const smartScore = 5 - smartMissing.length;
  return {
    smartScore,
    smartTotal: 5,
    smartMissing,
    loopReady: loopMissing.length === 0,
    loopMissing,
    readyToActivate: smartScore === 5 && loopMissing.length === 0,
  };
}

export function isQuestVisibleOnDate(
  quest: Pick<Quest, 'status' | 'startsOn' | 'endsOn'>,
  date: string,
): boolean {
  if (quest.status === 'archived' || quest.status === 'draft') return false;
  if (quest.startsOn && date < quest.startsOn) return false;
  if (quest.endsOn && date > quest.endsOn) return false;
  return true;
}

export function groupQuestHabitTags(
  links: Array<{ habitId: string; tag: QuestHabitTag }>,
): Record<string, QuestHabitTag[]> {
  return links.reduce<Record<string, QuestHabitTag[]>>((grouped, link) => {
    const current = grouped[link.habitId] ?? [];
    if (!current.some((tag) => tag.questId === link.tag.questId)) {
      grouped[link.habitId] = [...current, link.tag];
    }
    return grouped;
  }, {});
}

function addDaysToIso(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isWithin(date: string, startsOn: string | null, endsOn: string | null): boolean {
  if (startsOn && date < startsOn) return false;
  if (endsOn && date > endsOn) return false;
  return Boolean(startsOn || endsOn);
}

/** Builds the shared 28-day ring used by Today and, later, Compass Book. */
export function buildCircularCalendarDays(
  referenceDate: string,
  source: CircularCalendarSource,
  dayCount = 28,
): CircularCalendarDay[] {
  const firstDate = addDaysToIso(referenceDate, -Math.floor(dayCount / 4));
  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDaysToIso(firstDate, index);
    return {
      date,
      dayNumber: Number(date.slice(8, 10)),
      isToday: date === referenceDate,
      questIds: source.quests
        .filter((quest) => isQuestVisibleOnDate(quest, date))
        .map((quest) => quest.id),
      campaignIds: source.campaigns
        .filter((campaign) => campaign.active && isWithin(date, campaign.startsOn, campaign.endsOn))
        .map((campaign) => campaign.id),
      goalStartIds: source.goals
        .filter((goal) => goal.startsOn === date)
        .map((goal) => goal.id),
      goalTargetIds: source.goals
        .filter((goal) => goal.targetDate === date)
        .map((goal) => goal.id),
    };
  });
}
