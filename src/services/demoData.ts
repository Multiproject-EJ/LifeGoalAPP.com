import type { Json } from '../lib/database.types';
import type {
  Database,
} from '../lib/database.types';
import { DEFAULT_JOURNAL_TYPE } from '../features/journal/constants';
import { DEFAULT_AI_COACH_ACCESS, type AiCoachDataAccess } from '../types/aiCoach';

export type GoalRow = Database['public']['Tables']['goals']['Row'];
export type GoalInsert = Database['public']['Tables']['goals']['Insert'];
export type GoalUpdate = Database['public']['Tables']['goals']['Update'];
export type HabitRow = Database['public']['Tables']['habits_v2']['Row'];
export type HabitInsert = Database['public']['Tables']['habits_v2']['Insert'];
export type HabitUpdate = Database['public']['Tables']['habits_v2']['Update'];
export type HabitLogRow = Database['public']['Tables']['habit_logs_v2']['Row'];
export type HabitLogInsert = Database['public']['Tables']['habit_logs_v2']['Insert'];
export type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
export type VisionImageInsert = Database['public']['Tables']['vision_images']['Insert'];
export type VisionImageUpdate = Database['public']['Tables']['vision_images']['Update'];
export type CheckinRow = Database['public']['Tables']['checkins']['Row'];
export type CheckinInsert = Database['public']['Tables']['checkins']['Insert'];
export type CheckinUpdate = Database['public']['Tables']['checkins']['Update'];
export type NotificationPreferencesRow = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesInsert = Database['public']['Tables']['notification_preferences']['Insert'];
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];
export type GoalReflectionRow = Database['public']['Tables']['goal_reflections']['Row'];
export type GoalReflectionInsert = Database['public']['Tables']['goal_reflections']['Insert'];
export type GoalReflectionUpdate = Database['public']['Tables']['goal_reflections']['Update'];
export type JournalEntryRow = Database['public']['Tables']['journal_entries']['Row'];
export type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
export type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update'];

export const DEMO_USER_ID = 'demo-user-0001';
export const DEMO_USER_EMAIL = 'demo@lifegoalapp.com';
export const DEMO_USER_NAME = 'Demo Creator';

export type DemoProfile = {
  displayName: string;
  onboardingComplete: boolean;
  aiCoachAccess: AiCoachDataAccess;
};

const STORAGE_KEY = 'lifegoalapp-demo-db-v1';

type DemoState = {
  profile: DemoProfile;
  goals: GoalRow[];
  habits: HabitRow[];
  habitLogs: HabitLogRow[];
  visionImages: VisionImageRow[];
  checkins: CheckinRow[];
  notificationPreferences: NotificationPreferencesRow | null;
  goalReflections: GoalReflectionRow[];
  journalEntries: JournalEntryRow[];
};

type StructuredCloneFn = <T>(value: T) => T;

const structuredCloneFn: StructuredCloneFn | undefined =
  typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone : undefined;

function clone<T>(value: T): T {
  if (structuredCloneFn) {
    return structuredCloneFn(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${random}`;
}

const today = new Date();
const iso = (date: Date) => date.toISOString();
const isoDateOnly = (date: Date) => date.toISOString().slice(0, 10);

type DemoHabitSeed = {
  id: string;
  goalId: string;
  title: string;
  schedule: Json;
  domainKey?: string | null;
  createdAt?: string | null;
};

function createDemoHabit(seed: DemoHabitSeed): HabitRow {
  return {
    id: seed.id,
    user_id: DEMO_USER_ID,
    title: seed.title,
    emoji: null,
    type: 'boolean',
    target_num: null,
    target_unit: null,
    schedule: seed.schedule,
    allow_skip: null,
    start_date: null,
    archived: false,
    created_at: seed.createdAt ?? iso(new Date()),
    autoprog: {
      tier: 'standard',
      baseSchedule: seed.schedule,
      baseTarget: null,
      lastShiftAt: null,
      lastShiftType: null,
    },
    domain_key: seed.domainKey ?? null,
    goal_id: seed.goalId,
  };
}

const defaultState: DemoState = {
  profile: {
    displayName: DEMO_USER_NAME,
    onboardingComplete: false,
    aiCoachAccess: DEFAULT_AI_COACH_ACCESS,
  },
  goals: [
    {
      id: createId('goal'),
      user_id: DEMO_USER_ID,
      title: 'Launch the LifeGoal beta cohort',
      description: 'Invite 25 early adopters, gather feedback, and iterate on the habit tracker experience.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 4)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
      progress_notes:
        'Beta content is finalized. Scheduling 1:1 kickoff calls next week and preparing support docs for onboarding.',
      status_tag: 'on_track',
      life_wheel_category: null,
      start_date: null,
      timing_notes: null,
      estimated_duration_days: null,
    },
    {
      id: createId('goal'),
      user_id: DEMO_USER_ID,
      title: 'Design the 2024 vision board refresh',
      description: 'Collect inspiring imagery, craft narrative captions, and share with accountability partners.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 12)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() + 2, 1)),
      progress_notes:
        'Gathered 60% of imagery, but workshop facilitation partner is double-booked. Need a backup facilitator.',
      status_tag: 'off_track',
      life_wheel_category: null,
      start_date: null,
      timing_notes: null,
      estimated_duration_days: null,
    },
    {
      id: createId('goal'),
      user_id: DEMO_USER_ID,
      title: 'Archive the pilot insights playbook',
      description: 'Synthesize interviews, share top 10 learnings, and distribute the retrospective deck to the team.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 3, 22)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 30)),
      progress_notes: 'Deliverables shipped! Scheduling a celebration retro and exporting learnings to Notion.',
      status_tag: 'achieved',
      life_wheel_category: null,
      start_date: null,
      timing_notes: null,
      estimated_duration_days: null,
    },
  ],
  habits: [],
  habitLogs: [],
  visionImages: [],
  checkins: [],
  notificationPreferences: null,
  goalReflections: [],
  journalEntries: [],
};

// Populate habits and dependent tables once goals exist so references align.
(function seedRelatedData() {
  const goalLaunch = defaultState.goals[0];
  const goalVision = defaultState.goals[1];
  const goalArchive = defaultState.goals[2];

  const morningRitualId = createId('habit');
  const outreachHabitId = createId('habit');
  const visionBoardId = createId('habit');

  defaultState.habits = [
    createDemoHabit({
      id: morningRitualId,
      goalId: goalLaunch.id,
      title: 'Morning focus ritual',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'career',
    }),
    createDemoHabit({
      id: outreachHabitId,
      goalId: goalLaunch.id,
      title: 'Reach out to a beta tester',
      schedule: { mode: 'specific_days', days: ['mon', 'wed', 'fri'] } as Json,
      domainKey: 'relationships',
    }),
    createDemoHabit({
      id: visionBoardId,
      goalId: goalVision.id,
      title: 'Source a new inspiration image',
      schedule: { mode: 'specific_days', days: ['sat'] } as Json,
      domainKey: 'creativity',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Hydrate with 80 oz of water',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'health',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Midday stretch walk',
      schedule: { mode: 'specific_days', days: ['mon', 'tue', 'wed', 'thu', 'fri'] } as Json,
      domainKey: 'health',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Inbox zero sweep',
      schedule: { mode: 'specific_days', days: ['mon', 'tue', 'wed', 'thu'] } as Json,
      domainKey: 'career',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Review tomorrow\'s priorities',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'mindset',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Capture product insight',
      schedule: { mode: 'specific_days', days: ['mon', 'wed', 'fri'] } as Json,
      domainKey: 'career',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Update roadmap milestone',
      schedule: { mode: 'specific_days', days: ['mon'] } as Json,
      domainKey: 'career',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Host accountability check-in',
      schedule: { mode: 'specific_days', days: ['wed'] } as Json,
      domainKey: 'relationships',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Share progress update with community',
      schedule: { mode: 'specific_days', days: ['fri'] } as Json,
      domainKey: 'community',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Schedule deep work block',
      schedule: { mode: 'specific_days', days: ['tue', 'thu'] } as Json,
      domainKey: 'career',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Strength training circuit',
      schedule: { mode: 'specific_days', days: ['tue', 'thu'] } as Json,
      domainKey: 'health',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Digital sunset ritual',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'wellness',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Sleep by 10:30 routine',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'wellness',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalLaunch.id,
      title: 'Balanced breakfast prep',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'health',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Reflect in vision journal',
      schedule: { mode: 'specific_days', days: ['sun'] } as Json,
      domainKey: 'personal_growth',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Curate mood board snippet',
      schedule: { mode: 'specific_days', days: ['thu'] } as Json,
      domainKey: 'creativity',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Capture photo inspiration',
      schedule: { mode: 'specific_days', days: ['sat', 'sun'] } as Json,
      domainKey: 'creativity',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Schedule creative play session',
      schedule: { mode: 'specific_days', days: ['sat'] } as Json,
      domainKey: 'fun',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Sketch storyboard concept',
      schedule: { mode: 'specific_days', days: ['tue'] } as Json,
      domainKey: 'creativity',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Practice gratitude note',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'mindset',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: '10-minute mindful breathing',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'personal_growth',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Write 3 lines in reflection journal',
      schedule: { mode: 'daily' } as Json,
      domainKey: 'personal_growth',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalVision.id,
      title: 'Plan weekend adventure',
      schedule: { mode: 'specific_days', days: ['thu'] } as Json,
      domainKey: 'fun',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalArchive.id,
      title: 'Review financial dashboard',
      schedule: { mode: 'specific_days', days: ['mon'] } as Json,
      domainKey: 'finances',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalArchive.id,
      title: 'Reconcile budget entries',
      schedule: { mode: 'specific_days', days: ['fri'] } as Json,
      domainKey: 'finances',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalArchive.id,
      title: 'Offer mentorship comment',
      schedule: { mode: 'specific_days', days: ['wed'] } as Json,
      domainKey: 'giving_back',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalArchive.id,
      title: 'Declutter workspace reset',
      schedule: { mode: 'specific_days', days: ['fri'] } as Json,
      domainKey: 'environment',
    }),
    createDemoHabit({
      id: createId('habit'),
      goalId: goalArchive.id,
      title: 'Tend to plant watering',
      schedule: { mode: 'specific_days', days: ['wed'] } as Json,
      domainKey: 'environment',
    }),
  ];

  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateIso = date.toISOString().slice(0, 10);
    defaultState.habitLogs.push(
      {
        id: createId('habit-log'),
        habit_id: morningRitualId,
        user_id: DEMO_USER_ID,
        ts: iso(date),
        date: dateIso,
        value: null,
        done: i % 7 !== 2,
        note: null,
        mood: null,
      },
      {
        id: createId('habit-log'),
        habit_id: outreachHabitId,
        user_id: DEMO_USER_ID,
        ts: iso(date),
        date: dateIso,
        value: null,
        done: i % 3 === 0,
        note: null,
        mood: null,
      },
    );
  }

  defaultState.visionImages = [
    {
      id: createId('vision'),
      user_id: DEMO_USER_ID,
      image_path: null,
      image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
      image_source: 'url',
      caption: 'Morning deep work setup to stay consistent with focus ritual.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 5)),
      file_path: null,
      file_format: null,
      vision_type: 'habit',
      review_interval_days: 21,
      last_reviewed_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 20)),
      linked_goal_ids: [goalLaunch.id],
      linked_habit_ids: [morningRitualId],
    },
    {
      id: createId('vision'),
      user_id: DEMO_USER_ID,
      image_path: null,
      image_url: 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=800&q=80',
      image_source: 'url',
      caption: 'Community celebration after the beta launch milestone.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 20)),
      file_path: null,
      file_format: null,
      vision_type: 'goal',
      review_interval_days: 30,
      last_reviewed_at: null,
      linked_goal_ids: [goalLaunch.id],
      linked_habit_ids: [outreachHabitId],
    },
  ];

  defaultState.checkins = [
    {
      id: createId('checkin'),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      scores: {
        spirituality_community: 5,
        finance_wealth: 6,
        love_relations: 5,
        fun_creativity: 5,
        career_development: 7,
        health_fitness: 6,
        family_friends: 5,
        living_spaces: 6,
      },
    },
    {
      id: createId('checkin'),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      scores: {
        spirituality_community: 6,
        finance_wealth: 6,
        love_relations: 6,
        fun_creativity: 6,
        career_development: 8,
        health_fitness: 7,
        family_friends: 6,
        living_spaces: 7,
      },
    },
    {
      id: createId('checkin'),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
      scores: {
        spirituality_community: 3,
        finance_wealth: 8,
        love_relations: 4,
        fun_creativity: 3,
        career_development: 9,
        health_fitness: 4,
        family_friends: 4,
        living_spaces: 4,
      },
    },
  ];

  defaultState.notificationPreferences = {
    user_id: DEMO_USER_ID,
    habit_reminders_enabled: true,
    habit_reminder_time: '08:00',
    checkin_nudges_enabled: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
    subscription: null,
    created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 12)),
    updated_at: iso(new Date(today.getFullYear(), today.getMonth(), 2)),
  };

  defaultState.goalReflections = [
    {
      id: createId('reflection'),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)).slice(0, 10),
      confidence: 4,
      highlight:
        'Completed onboarding playbook recordings and received strong feedback from the first beta captain.',
      challenge: 'Need to coordinate calendar slots with three testers who have limited availability this week.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)),
    },
    {
      id: createId('reflection'),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)).slice(0, 10),
      confidence: 5,
      highlight: 'Shipped revised habit tracker walkthrough and booked 5 new intro calls.',
      challenge: 'Document follow-up questions so we can convert interest into active beta signups.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)),
    },
    {
      id: createId('reflection'),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 19)).slice(0, 10),
      confidence: 4,
      highlight: 'Wrapped partner onboarding guides and scheduled joint announcement with marketing.',
      challenge: 'Need a final review of the pricing FAQ before we hit publish.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 19)),
    },
    {
      id: createId('reflection'),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 2, 21)).slice(0, 10),
      confidence: 3,
      highlight: 'Outlined migration checklist and synced with engineering on rollout blockers.',
      challenge: 'Still clarifying analytics requirements with two stakeholders.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 21)),
    },
    {
      id: createId('reflection'),
      goal_id: goalVision.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8)).slice(0, 10),
      confidence: 3,
      highlight: 'Gathered quotes for printing the updated vision board and drafted storytelling script.',
      challenge: 'Still missing imagery for the community impact section and facilitator backup.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8)),
    },
    {
      id: createId('reflection'),
      goal_id: goalVision.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 7)).slice(0, 10),
      confidence: 4,
      highlight: 'Finalized the mood board color palette and secured three new contributor stories.',
      challenge: 'Need approval on licensing terms for two photos sourced from the community.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 7)),
    },
    {
      id: createId('reflection'),
      goal_id: goalVision.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 2, 11)).slice(0, 10),
      confidence: 2,
      highlight: 'Mapped storytelling outline and flagged where we need additional imagery.',
      challenge: 'Waiting on legal review for featuring partner logos in the board.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 11)),
    },
  ];

  defaultState.journalEntries = [
    {
      id: createId('journal'),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      title: 'Beta kickoff energy',
      content:
        'Hosted three intro calls and felt the cohort\'s excitement. Captured five new insight threads to unpack tomorrow.',
      mood: 'excited',
      tags: ['beta', 'momentum'],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalLaunch.id],
      linked_habit_ids: [morningRitualId, outreachHabitId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
    },
    {
      id: createId('journal'),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      title: 'Vision sprint reflection',
      content:
        'Spent the afternoon curating the board refresh. Loved the deep purple palette that emerged and tagged next steps for the mood boards.',
      mood: 'happy',
      tags: ['vision', 'creative flow'],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalVision.id],
      linked_habit_ids: [visionBoardId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
    },
    {
      id: createId('journal'),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      title: 'Integrating pilot learnings',
      content:
        'Documented the post-pilot insights. Noticed a confidence dip midweek when decisions piled up, but feel steady after the walk-and-talk debrief.',
      mood: 'neutral',
      tags: ['reflection', 'pilot'],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalArchive.id],
      linked_habit_ids: [visionBoardId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
    },
  ];
})();

function normalizeGoalRow(goal: GoalRow): GoalRow {
  let statusTag = goal.status_tag ?? 'on_track';
  if (statusTag === 'blocked' || statusTag === 'off-track') {
    statusTag = 'off_track';
  }
  return {
    ...goal,
    description: goal.description ?? null,
    target_date: goal.target_date ?? null,
    progress_notes: goal.progress_notes ?? null,
    status_tag: statusTag,
  };
}

function loadState(): DemoState {
  if (typeof window === 'undefined') {
    return clone(defaultState);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const goals = (parsed.goals ?? clone(defaultState.goals)).map(normalizeGoalRow);
    const profile = {
      ...defaultState.profile,
      ...(parsed.profile ?? {}),
    };
    return {
      profile,
      goals,
      habits: parsed.habits ?? clone(defaultState.habits),
      habitLogs: parsed.habitLogs ?? clone(defaultState.habitLogs),
      visionImages: parsed.visionImages ?? clone(defaultState.visionImages),
      checkins: parsed.checkins ?? clone(defaultState.checkins),
      notificationPreferences:
        parsed.notificationPreferences ?? clone(defaultState.notificationPreferences),
      goalReflections: parsed.goalReflections ?? clone(defaultState.goalReflections),
      journalEntries: parsed.journalEntries ?? clone(defaultState.journalEntries),
    } satisfies DemoState;
  } catch (error) {
    console.warn('Unable to parse demo data state, falling back to defaults.', error);
    return clone(defaultState);
  }
}

let state = loadState();

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist demo data to localStorage.', error);
  }
}

type StateUpdater<T> = (current: T) => T;

function updateState(updater: StateUpdater<DemoState>) {
  state = updater(state);
  persist();
}

export function getDemoProfile(): DemoProfile {
  return clone(state.profile);
}

export function updateDemoProfile(payload: Partial<DemoProfile>): DemoProfile {
  let nextProfile: DemoProfile = state.profile;
  updateState((current) => {
    nextProfile = {
      ...current.profile,
      ...payload,
    };
    return { ...current, profile: nextProfile };
  });
  return clone(nextProfile);
}

function sortByDateDesc<T extends { created_at?: string | null; date?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aDate = (a.created_at ?? a.date ?? '') as string;
    const bDate = (b.created_at ?? b.date ?? '') as string;
    return aDate > bDate ? -1 : aDate < bDate ? 1 : 0;
  });
}

function sortJournalEntries(entries: JournalEntryRow[]): JournalEntryRow[] {
  return [...entries].sort((a, b) => {
    const aDate = a.entry_date ?? '';
    const bDate = b.entry_date ?? '';
    if (aDate === bDate) {
      const aCreated = a.created_at ?? '';
      const bCreated = b.created_at ?? '';
      return aCreated > bCreated ? -1 : aCreated < bCreated ? 1 : 0;
    }
    return aDate > bDate ? -1 : 1;
  });
}

export function getDemoGoals(userId: string): GoalRow[] {
  return clone(
    sortByDateDesc(state.goals.filter((goal) => goal.user_id === userId).map(normalizeGoalRow)),
  );
}

export function addDemoGoal(payload: GoalInsert): GoalRow {
  const record = normalizeGoalRow({
    id: payload.id ?? createId('goal'),
    user_id: payload.user_id,
    title: payload.title,
    description: payload.description ?? null,
    created_at: payload.created_at ?? new Date().toISOString(),
    target_date: payload.target_date ?? null,
    progress_notes: payload.progress_notes ?? null,
    status_tag: payload.status_tag ?? null,
    life_wheel_category: payload.life_wheel_category ?? null,
    start_date: payload.start_date ?? null,
    timing_notes: payload.timing_notes ?? null,
    estimated_duration_days: payload.estimated_duration_days ?? null,
  });

  updateState((current) => ({ ...current, goals: [record, ...current.goals] }));
  return clone(record);
}

export function updateDemoGoal(id: string, payload: GoalUpdate): GoalRow | null {
  let updated: GoalRow | null = null;
  updateState((current) => {
    const goals = current.goals.map((goal) => {
      if (goal.id !== id) return goal;
      updated = normalizeGoalRow({
        ...goal,
        ...payload,
        description: payload.description ?? goal.description,
        target_date: payload.target_date ?? goal.target_date,
        progress_notes: payload.progress_notes ?? goal.progress_notes,
        status_tag: payload.status_tag ?? goal.status_tag,
        life_wheel_category: payload.life_wheel_category ?? goal.life_wheel_category,
        start_date: payload.start_date ?? goal.start_date,
        timing_notes: payload.timing_notes ?? goal.timing_notes,
        estimated_duration_days: payload.estimated_duration_days ?? goal.estimated_duration_days,
      });
      return updated;
    });
    return { ...current, goals };
  });
  return updated ? clone(updated) : null;
}

export function removeDemoGoal(id: string): GoalRow | null {
  let removed: GoalRow | null = null;
  updateState((current) => {
    const goals = current.goals.filter((goal) => {
      if (goal.id === id) {
        removed = goal;
        return false;
      }
      return true;
    });
    const habits = current.habits.filter((habit) => habit.goal_id !== id);
    const habitIds = new Set(habits.map((habit) => habit.id));
    const habitLogs = current.habitLogs.filter((log) => habitIds.has(log.habit_id));
    const goalReflections = current.goalReflections.filter((reflection) => reflection.goal_id !== id);
    return { ...current, goals, habits, habitLogs, goalReflections };
  });
  return removed ? clone(normalizeGoalRow(removed)) : null;
}

export function getDemoHabitsByGoal(goalId: string): HabitRow[] {
  return clone(
    state.habits
      .filter((habit) => habit.goal_id === goalId)
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

export function getDemoHabitsForUser(userId: string): HabitRow[] {
  const goalIds = new Set(state.goals.filter((goal) => goal.user_id === userId).map((goal) => goal.id));
  return clone(
    state.habits
      .filter((habit) => habit.goal_id && goalIds.has(habit.goal_id))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}

export function upsertDemoHabit(payload: HabitInsert | HabitUpdate): HabitRow {
  let nextRecord: HabitRow | null = null;
  updateState((current) => {
    const habits = [...current.habits];
    if (payload.id) {
      const index = habits.findIndex((habit) => habit.id === payload.id);
      if (index >= 0) {
        const existing = habits[index];
        nextRecord = {
          ...existing,
          ...payload,
          schedule: (payload.schedule ?? existing.schedule) as Json,
        };
        habits[index] = nextRecord;
        return { ...current, habits };
      }
    }

    nextRecord = {
      id: payload.id ?? createId('habit'),
      user_id: payload.user_id ?? (payload as HabitInsert).user_id ?? DEMO_USER_ID,
      title: payload.title ?? (payload as HabitInsert).title ?? 'New habit',
      emoji: payload.emoji ?? (payload as HabitInsert).emoji ?? null,
      type: payload.type ?? (payload as HabitInsert).type ?? 'boolean',
      target_num: payload.target_num ?? (payload as HabitInsert).target_num ?? null,
      target_unit: payload.target_unit ?? (payload as HabitInsert).target_unit ?? null,
      schedule: (payload.schedule ?? (payload as HabitInsert).schedule ?? { mode: 'daily' }) as Json,
      allow_skip: payload.allow_skip ?? (payload as HabitInsert).allow_skip ?? null,
      start_date: payload.start_date ?? (payload as HabitInsert).start_date ?? null,
      archived: payload.archived ?? (payload as HabitInsert).archived ?? false,
      created_at: payload.created_at ?? (payload as HabitInsert).created_at ?? new Date().toISOString(),
      autoprog: payload.autoprog ?? (payload as HabitInsert).autoprog ?? null,
      domain_key: payload.domain_key ?? (payload as HabitInsert).domain_key ?? null,
      goal_id: payload.goal_id ?? (payload as HabitInsert).goal_id ?? null,
    };
    habits.push(nextRecord);
    habits.sort((a, b) => a.title.localeCompare(b.title));
    return { ...current, habits };
  });

  if (!nextRecord) {
    throw new Error('Unable to resolve habit payload.');
  }

  return clone(nextRecord);
}

export function removeDemoHabit(id: string): HabitRow | null {
  let removed: HabitRow | null = null;
  updateState((current) => {
    const habits = current.habits.filter((habit) => {
      if (habit.id === id) {
        removed = habit;
        return false;
      }
      return true;
    });
    const habitLogs = current.habitLogs.filter((log) => log.habit_id !== id);
    return { ...current, habits, habitLogs };
  });
  return removed ? clone(removed) : null;
}

export function logDemoHabitCompletion(payload: HabitLogInsert): HabitLogRow {
  const record: HabitLogRow = {
    id: payload.id ?? createId('habit-log'),
    habit_id: payload.habit_id,
    user_id: payload.user_id ?? DEMO_USER_ID,
    ts: payload.ts ?? new Date().toISOString(),
    date: payload.date ?? isoDateOnly(new Date()),
    value: payload.value ?? null,
    done: payload.done ?? true,
    note: payload.note ?? null,
    mood: payload.mood ?? null,
  };
  updateState((current) => ({ ...current, habitLogs: [...current.habitLogs, record] }));
  return clone(record);
}

export function clearDemoHabitCompletion(habitId: string, date: string): HabitLogRow | null {
  let removed: HabitLogRow | null = null;
  updateState((current) => {
    const habitLogs = current.habitLogs.filter((log) => {
      if (log.habit_id === habitId && log.date === date) {
        removed = log;
        return false;
      }
      return true;
    });
    return { ...current, habitLogs };
  });
  return removed ? clone(removed) : null;
}

export function getDemoHabitLogsForDate(date: string, habitIds: string[]): HabitLogRow[] {
  if (!habitIds.length) return [];
  const idSet = new Set(habitIds);
  return clone(state.habitLogs.filter((log) => log.date === date && idSet.has(log.habit_id)));
}

export function getDemoHabitLogsForRange(habitIds: string[], startDate: string, endDate: string): HabitLogRow[] {
  if (!habitIds.length) return [];
  const idSet = new Set(habitIds);
  return clone(
    state.habitLogs.filter((log) => {
      if (!idSet.has(log.habit_id)) return false;
      return log.date >= startDate && log.date <= endDate;
    }),
  );
}

export function getDemoVisionImages(userId: string): VisionImageRow[] {
  return clone(
    state.visionImages
      .filter((image) => image.user_id === userId)
      .sort((a, b) => (a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0)),
  );
}

export function addDemoVisionImage(payload: VisionImageInsert): VisionImageRow {
  const record: VisionImageRow = {
    id: payload.id ?? createId('vision'),
    user_id: payload.user_id,
    image_path: payload.image_path ?? null,
    image_url: payload.image_url ?? null,
    image_source: payload.image_source ?? 'file',
    caption: payload.caption ?? null,
    created_at: payload.created_at ?? new Date().toISOString(),
    file_path: payload.file_path ?? null,
    file_format: payload.file_format ?? null,
    vision_type: payload.vision_type ?? 'goal',
    review_interval_days: payload.review_interval_days ?? 30,
    last_reviewed_at: payload.last_reviewed_at ?? null,
    linked_goal_ids: payload.linked_goal_ids ?? [],
    linked_habit_ids: payload.linked_habit_ids ?? [],
  };
  updateState((current) => ({ ...current, visionImages: [record, ...current.visionImages] }));
  return clone(record);
}

export function updateDemoVisionImage(id: string, payload: VisionImageUpdate): VisionImageRow | null {
  let updated: VisionImageRow | null = null;
  updateState((current) => {
    const visionImages = current.visionImages.map((image) => {
      if (image.id !== id) {
        return image;
      }
      updated = {
        ...image,
        ...payload,
        vision_type: payload.vision_type ?? image.vision_type ?? 'goal',
        review_interval_days: payload.review_interval_days ?? image.review_interval_days ?? 30,
        linked_goal_ids: payload.linked_goal_ids ?? image.linked_goal_ids ?? [],
        linked_habit_ids: payload.linked_habit_ids ?? image.linked_habit_ids ?? [],
      };
      return updated;
    });
    return { ...current, visionImages };
  });
  return updated ? clone(updated) : null;
}

export function removeDemoVisionImage(id: string): VisionImageRow | null {
  let removed: VisionImageRow | null = null;
  updateState((current) => {
    const visionImages = current.visionImages.filter((image) => {
      if (image.id === id) {
        removed = image;
        return false;
      }
      return true;
    });
    return { ...current, visionImages };
  });
  return removed ? clone(removed) : null;
}

export function getDemoCheckins(userId: string, limit = 12): CheckinRow[] {
  const rows = state.checkins
    .filter((checkin) => checkin.user_id === userId)
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .slice(0, limit);
  return clone(rows);
}

export function addDemoCheckin(payload: CheckinInsert): CheckinRow {
  const record: CheckinRow = {
    id: payload.id ?? createId('checkin'),
    user_id: payload.user_id,
    date: payload.date,
    scores: payload.scores,
  };
  updateState((current) => ({ ...current, checkins: [record, ...current.checkins] }));
  return clone(record);
}

export function updateDemoCheckin(id: string, payload: CheckinUpdate): CheckinRow | null {
  let updated: CheckinRow | null = null;
  updateState((current) => {
    const checkins = current.checkins.map((checkin) => {
      if (checkin.id !== id) return checkin;
      updated = { ...checkin, ...payload, scores: payload.scores ?? checkin.scores };
      return updated;
    });
    return { ...current, checkins };
  });
  return updated ? clone(updated) : null;
}

export function getDemoNotificationPreferences(userId: string): NotificationPreferencesRow | null {
  if (state.notificationPreferences?.user_id !== userId) {
    return null;
  }
  return clone(state.notificationPreferences);
}

export function upsertDemoNotificationPreferences(
  userId: string,
  payload: NotificationPreferencesInsert | NotificationPreferencesUpdate,
): NotificationPreferencesRow {
  const record: NotificationPreferencesRow = {
    user_id: userId,
    habit_reminders_enabled:
      'habit_reminders_enabled' in payload
        ? Boolean(payload.habit_reminders_enabled)
        : state.notificationPreferences?.habit_reminders_enabled ?? false,
    habit_reminder_time:
      'habit_reminder_time' in payload
        ? payload.habit_reminder_time ?? null
        : state.notificationPreferences?.habit_reminder_time ?? null,
    checkin_nudges_enabled:
      'checkin_nudges_enabled' in payload
        ? Boolean(payload.checkin_nudges_enabled)
        : state.notificationPreferences?.checkin_nudges_enabled ?? false,
    timezone:
      'timezone' in payload
        ? payload.timezone ?? null
        : state.notificationPreferences?.timezone ?? null,
    subscription:
      'subscription' in payload
        ? (payload.subscription as Json | null)
        : (state.notificationPreferences?.subscription ?? null),
    created_at: state.notificationPreferences?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  updateState((current) => ({ ...current, notificationPreferences: record }));
  return clone(record);
}

export function clearDemoNotificationPreferences(userId: string): NotificationPreferencesRow | null {
  if (state.notificationPreferences?.user_id !== userId) {
    return null;
  }
  const cleared: NotificationPreferencesRow = {
    ...state.notificationPreferences,
    habit_reminders_enabled: false,
    checkin_nudges_enabled: false,
    habit_reminder_time: null,
    subscription: null,
    updated_at: new Date().toISOString(),
  };
  updateState((current) => ({ ...current, notificationPreferences: cleared }));
  return clone(cleared);
}

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
    throw new Error('FileReader is not available in this environment.');
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file as data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function resetDemoState() {
  state = clone(defaultState);
  persist();
}

export function getDemoGoalReflections(goalId: string): GoalReflectionRow[] {
  return clone(
    state.goalReflections
      .filter((reflection) => reflection.goal_id === goalId)
      .sort((a, b) => (a.entry_date > b.entry_date ? -1 : a.entry_date < b.entry_date ? 1 : 0)),
  );
}

export function addDemoGoalReflection(payload: GoalReflectionInsert): GoalReflectionRow {
  const record: GoalReflectionRow = {
    id: payload.id ?? createId('reflection'),
    goal_id: payload.goal_id,
    user_id: payload.user_id,
    entry_date: payload.entry_date,
    confidence: payload.confidence ?? null,
    highlight: payload.highlight ?? null,
    challenge: payload.challenge ?? null,
    created_at: payload.created_at ?? new Date().toISOString(),
  };

  updateState((current) => ({ ...current, goalReflections: [record, ...current.goalReflections] }));
  return clone(record);
}

export function updateDemoGoalReflection(
  id: string,
  payload: GoalReflectionUpdate,
): GoalReflectionRow | null {
  let updated: GoalReflectionRow | null = null;
  updateState((current) => {
    const goalReflections = current.goalReflections.map((reflection) => {
      if (reflection.id !== id) return reflection;
      updated = {
        ...reflection,
        ...payload,
        entry_date: payload.entry_date ?? reflection.entry_date,
        confidence: payload.confidence ?? reflection.confidence,
        highlight: payload.highlight ?? reflection.highlight,
        challenge: payload.challenge ?? reflection.challenge,
        created_at: payload.created_at ?? reflection.created_at,
      };
      return updated;
    });
    return { ...current, goalReflections };
  });
  return updated ? clone(updated) : null;
}

export function removeDemoGoalReflection(id: string): GoalReflectionRow | null {
  let removed: GoalReflectionRow | null = null;
  updateState((current) => {
    const goalReflections = current.goalReflections.filter((reflection) => {
      if (reflection.id === id) {
        removed = reflection;
        return false;
      }
      return true;
    });
    return { ...current, goalReflections };
  });
  return removed ? clone(removed) : null;
}

export function getDemoJournalEntries(userId: string): JournalEntryRow[] {
  return clone(sortJournalEntries(state.journalEntries.filter((entry) => entry.user_id === userId)));
}

export function addDemoJournalEntry(payload: JournalEntryInsert): JournalEntryRow {
  const record: JournalEntryRow = {
    id: payload.id ?? createId('journal'),
    user_id: payload.user_id,
    created_at: payload.created_at ?? new Date().toISOString(),
    updated_at: payload.updated_at ?? new Date().toISOString(),
    entry_date: payload.entry_date ?? isoDateOnly(new Date()),
    title: payload.title ?? null,
    content: payload.content,
    mood: payload.mood ?? null,
    tags: payload.tags ?? null,
    is_private: payload.is_private ?? true,
    attachments: payload.attachments ?? null,
    linked_goal_ids: payload.linked_goal_ids ?? null,
    linked_habit_ids: payload.linked_habit_ids ?? null,
    type: payload.type ?? DEFAULT_JOURNAL_TYPE,
    mood_score: payload.mood_score ?? null,
    category: payload.category ?? null,
    unlock_date: payload.unlock_date ?? null,
    goal_id: payload.goal_id ?? null,
    irrational_fears: payload.irrational_fears ?? null,
    training_solutions: payload.training_solutions ?? null,
    concrete_steps: payload.concrete_steps ?? null,
  };

  updateState((current) => ({
    ...current,
    journalEntries: sortJournalEntries([record, ...current.journalEntries]),
  }));

  return clone(record);
}

export function updateDemoJournalEntry(
  id: string,
  payload: JournalEntryUpdate,
): JournalEntryRow | null {
  let updated: JournalEntryRow | null = null;
  updateState((current) => {
    const journalEntries = current.journalEntries.map((entry) => {
      if (entry.id !== id) return entry;
      updated = {
        ...entry,
        ...payload,
        entry_date: payload.entry_date ?? entry.entry_date,
        title: payload.title ?? entry.title,
        content: payload.content ?? entry.content,
        mood: payload.mood ?? entry.mood,
        tags: payload.tags ?? entry.tags,
        is_private: payload.is_private ?? entry.is_private,
        attachments: payload.attachments ?? entry.attachments,
        linked_goal_ids: payload.linked_goal_ids ?? entry.linked_goal_ids,
        linked_habit_ids: payload.linked_habit_ids ?? entry.linked_habit_ids,
        updated_at: new Date().toISOString(),
      } satisfies JournalEntryRow;
      return updated;
    });
    return { ...current, journalEntries: sortJournalEntries(journalEntries) };
  });
  return updated ? clone(updated) : null;
}

export function removeDemoJournalEntry(id: string): JournalEntryRow | null {
  let removed: JournalEntryRow | null = null;
  updateState((current) => {
    const journalEntries = current.journalEntries.filter((entry) => {
      if (entry.id === id) {
        removed = entry;
        return false;
      }
      return true;
    });
    return { ...current, journalEntries };
  });
  return removed ? clone(removed) : null;
}

export function getDemoState(): DemoState {
  return clone(state);
}

export function clearDemoData(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    state = clone(defaultState);
  } catch (error) {
    console.warn('Unable to clear demo data from localStorage.', error);
  }
}
