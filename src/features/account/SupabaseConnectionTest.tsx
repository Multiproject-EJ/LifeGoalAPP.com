import { FormEvent, useMemo, useState } from 'react';
import type { PostgrestError, Session } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  hasSupabaseCredentials,
  hasActiveSupabaseSession,
  type TypedSupabaseClient,
} from '../../lib/supabaseClient';
import type { Database, Json } from '../../lib/database.types';
import { getDemoState, clearDemoData } from '../../services/demoData';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';

type TableKey =
  | 'profiles'
  | 'goals'
  | 'goal_reflections'
  | 'habits'
  | 'habit_logs'
  | 'vision_images'
  | 'checkins'
  | 'notification_preferences'
  | 'workspace_profiles'
  | 'life_goal_steps'
  | 'life_goal_substeps'
  | 'life_goal_alerts'
  | 'habits_v2'
  | 'habit_logs_v2'
  | 'habit_reminders'
  | 'habit_challenges'
  | 'habit_challenge_members'
  | 'vb_boards'
  | 'vb_sections'
  | 'vb_cards'
  | 'vb_shares'
  | 'vb_checkins'
  | 'push_subscriptions';

type TableReadConfig = {
  key: TableKey;
  label: string;
  table: keyof Database['public']['Tables'];
  column: string;
  optional?: boolean;
};

type TableReadStatus = {
  status: 'success' | 'error' | 'skipped';
  detail?: string;
};

type TableWriteStatus = {
  status: 'success' | 'error' | 'skipped';
  detail?: string;
};

type TableTestStatus = {
  key: TableKey;
  label: string;
  read: TableReadStatus['status'];
  readDetail?: string;
  write: TableWriteStatus['status'];
  writeDetail?: string;
};

type WriteTestContext = {
  client: TypedSupabaseClient;
  userId: string;
  cleanup: Array<() => Promise<void>>;
  goalId?: string;
  habitId?: string;
  habitV2Id?: string;
  lifeGoalStepId?: string;
  boardId?: string;
  sectionId?: string;
  cardId?: string;
  challengeId?: string;
};

type WriteTestDefinition = {
  run?: (ctx: WriteTestContext) => Promise<void>;
  skipReason?: string;
  optional?: boolean;
};

const tableReadConfigs: TableReadConfig[] = [
  { key: 'profiles', label: 'Profiles', table: 'profiles', column: 'user_id', optional: true },
  { key: 'goals', label: 'Goals', table: 'goals', column: 'id' },
  { key: 'goal_reflections', label: 'Goal reflections', table: 'goal_reflections', column: 'id' },
  { key: 'habits', label: 'Habits (legacy)', table: 'habits', column: 'id', optional: true },
  { key: 'habit_logs', label: 'Habit logs (legacy)', table: 'habit_logs', column: 'id', optional: true },
  { key: 'vision_images', label: 'Vision images', table: 'vision_images', column: 'id' },
  { key: 'checkins', label: 'Life wheel check-ins', table: 'checkins', column: 'id' },
  { key: 'notification_preferences', label: 'Notification preferences', table: 'notification_preferences', column: 'user_id' },
  { key: 'workspace_profiles', label: 'Workspace profiles', table: 'workspace_profiles', column: 'user_id' },
  { key: 'life_goal_steps', label: 'Life goal steps', table: 'life_goal_steps', column: 'id' },
  { key: 'life_goal_substeps', label: 'Life goal substeps', table: 'life_goal_substeps', column: 'id' },
  { key: 'life_goal_alerts', label: 'Life goal alerts', table: 'life_goal_alerts', column: 'id' },
  { key: 'habits_v2', label: 'Habits v2', table: 'habits_v2', column: 'id', optional: true },
  { key: 'habit_logs_v2', label: 'Habit logs v2', table: 'habit_logs_v2', column: 'id', optional: true },
  { key: 'habit_reminders', label: 'Habit reminders', table: 'habit_reminders', column: 'id', optional: true },
  { key: 'habit_challenges', label: 'Habit challenges', table: 'habit_challenges', column: 'id' },
  { key: 'habit_challenge_members', label: 'Challenge members', table: 'habit_challenge_members', column: 'id' },
  { key: 'vb_boards', label: 'Vision boards', table: 'vb_boards', column: 'id' },
  { key: 'vb_sections', label: 'Vision board sections', table: 'vb_sections', column: 'id' },
  { key: 'vb_cards', label: 'Vision board cards', table: 'vb_cards', column: 'id' },
  { key: 'vb_shares', label: 'Vision board shares', table: 'vb_shares', column: 'id' },
  { key: 'vb_checkins', label: 'Vision check-ins', table: 'vb_checkins', column: 'id' },
  { key: 'push_subscriptions', label: 'Push subscriptions', table: 'push_subscriptions', column: 'endpoint' },
];

const tableConfigMap = new Map<TableKey, TableReadConfig>(tableReadConfigs.map((config) => [config.key, config]));

class SkipTestError extends Error {}

function generateClientString(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function farFutureDate(offsetDays = 0): string {
  const date = new Date(Date.UTC(2099, 0, 1 + offsetDays));
  return date.toISOString().slice(0, 10);
}

function normalizeError(error: unknown): { code?: string; message: string } {
  if (error && typeof error === 'object' && 'message' in error) {
    const typedError = error as PostgrestError;
    return { code: typedError.code, message: typedError.message };
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

function isMissingRelationError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as PostgrestError).code === '42P01');
}

const writeTestDefinitions: Partial<Record<TableKey, WriteTestDefinition>> = {
  profiles: {
    skipReason: 'Profiles are synced automatically during onboarding. Writing test data could override your display name.',
  },
  goals: {
    async run(ctx) {
      const { data, error } = await ctx.client
        .from('goals')
        .insert({
          user_id: ctx.userId,
          title: 'Supabase diagnostics goal',
          description: 'Temporary goal inserted by the connection test.',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.goalId = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('goals').delete().eq('id', data.id);
      });
    },
  },
  goal_reflections: {
    async run(ctx) {
      if (!ctx.goalId) {
        throw new SkipTestError('Goal write test failed, so reflections cannot be inserted.');
      }

      const entryDate = farFutureDate(2);
      const { data, error } = await ctx.client
        .from('goal_reflections')
        .insert({
          goal_id: ctx.goalId,
          user_id: ctx.userId,
          entry_date: entryDate,
          confidence: 7,
          highlight: 'Connection test highlight',
          challenge: 'Connection test challenge',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('goal_reflections').delete().eq('id', data.id);
      });
    },
  },
  habits: {
    optional: true,
    async run(ctx) {
      if (!ctx.goalId) {
        throw new SkipTestError('Goal write test failed, so legacy habits cannot be inserted.');
      }

      const dailySchedule: Json = { mode: 'daily' };
      const { data, error } = await ctx.client
        .from('habits')
        .insert({
          goal_id: ctx.goalId,
          name: 'Diagnostics habit',
          frequency: 'daily',
          schedule: dailySchedule,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.habitId = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('habits').delete().eq('id', data.id);
      });
    },
  },
  habit_logs: {
    optional: true,
    async run(ctx) {
      if (!ctx.habitId) {
        throw new SkipTestError('Legacy habit insert failed, so legacy habit logs cannot be tested.');
      }

      const { data, error } = await ctx.client
        .from('habit_logs')
        .insert({
          habit_id: ctx.habitId,
          date: farFutureDate(3),
          completed: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('habit_logs').delete().eq('id', data.id);
      });
    },
  },
  vision_images: {
    async run(ctx) {
      const { data, error } = await ctx.client
        .from('vision_images')
        .insert({
          user_id: ctx.userId,
          image_source: 'url',
          image_url: `https://example.com/${generateClientString('vision')}.png`,
          caption: 'Connection test image',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('vision_images').delete().eq('id', data.id);
      });
    },
  },
  checkins: {
    async run(ctx) {
      const { data, error } = await ctx.client
        .from('checkins')
        .insert({
          user_id: ctx.userId,
          date: farFutureDate(4),
          scores: { energy: 6, mood: 7 } as Json,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('checkins').delete().eq('id', data.id);
      });
    },
  },
  notification_preferences: {
    skipReason: 'Notification preferences are singletons per user; skipping to avoid overwriting your current settings.',
  },
  workspace_profiles: {
    skipReason: 'Workspace profile write tests are skipped to avoid clobbering your workspace name.',
  },
  life_goal_steps: {
    async run(ctx) {
      if (!ctx.goalId) {
        throw new SkipTestError('Goal write test failed, so life goal steps cannot be inserted.');
      }

      const { data, error } = await ctx.client
        .from('life_goal_steps')
        .insert({
          goal_id: ctx.goalId,
          step_order: 1,
          title: 'Diagnostics goal step',
          description: 'Added by Supabase diagnostics.',
          due_date: farFutureDate(5),
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.lifeGoalStepId = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('life_goal_steps').delete().eq('id', data.id);
      });
    },
  },
  life_goal_substeps: {
    async run(ctx) {
      if (!ctx.lifeGoalStepId) {
        throw new SkipTestError('Life goal step insert failed, so substeps cannot be tested.');
      }

      const { data, error } = await ctx.client
        .from('life_goal_substeps')
        .insert({
          step_id: ctx.lifeGoalStepId,
          substep_order: 1,
          title: 'Diagnostics substep',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('life_goal_substeps').delete().eq('id', data.id);
      });
    },
  },
  life_goal_alerts: {
    async run(ctx) {
      if (!ctx.goalId) {
        throw new SkipTestError('Goal write test failed, so alerts cannot be inserted.');
      }

      const { data, error } = await ctx.client
        .from('life_goal_alerts')
        .insert({
          goal_id: ctx.goalId,
          user_id: ctx.userId,
          alert_type: 'reminder',
          alert_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          title: 'Diagnostics reminder',
          message: 'Temporary alert created by Supabase diagnostics.',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('life_goal_alerts').delete().eq('id', data.id);
      });
    },
  },
  habits_v2: {
    optional: true,
    async run(ctx) {
      const schedule: Json = { mode: 'daily' };
      const { data, error } = await ctx.client
        .from('habits_v2')
        .insert({
          user_id: ctx.userId,
          title: 'Diagnostics habit v2',
          emoji: '🧪',
          schedule,
          allow_skip: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.habitV2Id = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('habits_v2').delete().eq('id', data.id);
      });
    },
  },
  habit_logs_v2: {
    optional: true,
    async run(ctx) {
      if (!ctx.habitV2Id) {
        throw new SkipTestError('Habits v2 insert failed, so habit logs v2 cannot be tested.');
      }

      const { data, error } = await ctx.client
        .from('habit_logs_v2')
        .insert({
          habit_id: ctx.habitV2Id,
          user_id: ctx.userId,
          ts: new Date().toISOString(),
          done: true,
          value: 1,
          note: 'Connection test log',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('habit_logs_v2').delete().eq('id', data.id);
      });
    },
  },
  habit_reminders: {
    optional: true,
    async run(ctx) {
      if (!ctx.habitV2Id) {
        throw new SkipTestError('Habits v2 insert failed, so habit reminders cannot be inserted.');
      }

      const { data, error } = await ctx.client
        .from('habit_reminders')
        .insert({
          habit_id: ctx.habitV2Id,
          local_time: '07:30:00',
          days: [1, 3, 5],
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('habit_reminders').delete().eq('id', data.id);
      });
    },
  },
  habit_challenges: {
    async run(ctx) {
      const { data, error } = await ctx.client
        .from('habit_challenges')
        .insert({
          owner_id: ctx.userId,
          title: 'Diagnostics challenge',
          description: 'Temporary challenge inserted by diagnostics.',
          start_date: farFutureDate(0),
          end_date: farFutureDate(7),
          scoring: 'count',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.challengeId = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('habit_challenges').delete().eq('id', data.id);
      });
    },
  },
  habit_challenge_members: {
    async run(ctx) {
      if (!ctx.challengeId) {
        throw new SkipTestError('Challenge insert failed, so members cannot be tested.');
      }
      if (!ctx.habitV2Id) {
        throw new SkipTestError('Habits v2 insert failed, so challenge membership cannot be linked to a habit.');
      }

      const { data, error } = await ctx.client
        .from('habit_challenge_members')
        .insert({
          challenge_id: ctx.challengeId,
          user_id: ctx.userId,
          habit_id: ctx.habitV2Id,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('habit_challenge_members').delete().eq('id', data.id);
      });
    },
  },
  vb_boards: {
    async run(ctx) {
      const { data, error } = await ctx.client
        .from('vb_boards')
        .insert({
          user_id: ctx.userId,
          title: 'Diagnostics board',
          board_type: 'vision',
          theme: { palette: 'calm' } as Json,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.boardId = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('vb_boards').delete().eq('id', data.id);
      });
    },
  },
  vb_sections: {
    async run(ctx) {
      if (!ctx.boardId) {
        throw new SkipTestError('Vision board insert failed, so sections cannot be inserted.');
      }

      const { data, error } = await ctx.client
        .from('vb_sections')
        .insert({
          board_id: ctx.boardId,
          title: 'Diagnostics section',
          sort_index: 1,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.sectionId = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('vb_sections').delete().eq('id', data.id);
      });
    },
  },
  vb_cards: {
    async run(ctx) {
      if (!ctx.boardId || !ctx.sectionId) {
        throw new SkipTestError('Vision board or section insert failed, so cards cannot be tested.');
      }

      const { data, error } = await ctx.client
        .from('vb_cards')
        .insert({
          board_id: ctx.boardId,
          section_id: ctx.sectionId,
          user_id: ctx.userId,
          kind: 'text',
          title: 'Diagnostics card',
          affirm: 'Connection test affirmation',
          size: 'M',
          tags: ['diagnostics'],
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cardId = data.id;
      ctx.cleanup.push(async () => {
        await ctx.client.from('vb_cards').delete().eq('id', data.id);
      });
    },
  },
  vb_shares: {
    async run(ctx) {
      if (!ctx.boardId) {
        throw new SkipTestError('Vision board insert failed, so shares cannot be tested.');
      }

      const slug = generateClientString('share');
      const { data, error } = await ctx.client
        .from('vb_shares')
        .insert({
          board_id: ctx.boardId,
          owner_id: ctx.userId,
          slug,
          is_active: false,
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('vb_shares').delete().eq('id', data.id);
      });
    },
  },
  vb_checkins: {
    async run(ctx) {
      if (!ctx.boardId) {
        throw new SkipTestError('Vision board insert failed, so check-ins cannot be tested.');
      }

      const { data, error } = await ctx.client
        .from('vb_checkins')
        .insert({
          user_id: ctx.userId,
          board_id: ctx.boardId,
          the_date: farFutureDate(6),
          mood: 4,
          gratitude: 'Diagnostics gratitude note',
        })
        .select('id')
        .single();

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('vb_checkins').delete().eq('id', data.id);
      });
    },
  },
  push_subscriptions: {
    async run(ctx) {
      const endpoint = `https://example.com/${generateClientString('endpoint')}`;
      const { error } = await ctx.client.from('push_subscriptions').insert({
        user_id: ctx.userId,
        endpoint,
        p256dh: generateClientString('p256dh'),
        auth: generateClientString('auth'),
      });

      if (error) throw error;
      ctx.cleanup.push(async () => {
        await ctx.client.from('push_subscriptions').delete().eq('endpoint', endpoint);
      });
    },
  },
};

async function runTableReadTests(client: TypedSupabaseClient) {
  const results = new Map<TableKey, TableReadStatus>();
  const errors: string[] = [];

  for (const config of tableReadConfigs) {
    try {
      const { error } = await client.from(config.table).select(config.column).limit(1);
      if (error) throw error;
      results.set(config.key, { status: 'success' });
    } catch (error) {
      if (isMissingRelationError(error) && config.optional) {
        results.set(config.key, { status: 'skipped', detail: 'Table not found in this project.' });
      } else {
        const { message, code } = normalizeError(error);
        const detail = `[${code ?? 'error'}] ${message}`;
        results.set(config.key, { status: 'error', detail });
        errors.push(`${config.label}: ${detail}`);
      }
    }
  }

  const habitsOk = ['habits', 'habits_v2'].some((key) => results.get(key as TableKey)?.status === 'success');
  const habitLogsOk = ['habit_logs', 'habit_logs_v2'].some((key) => results.get(key as TableKey)?.status === 'success');

  if (!habitsOk) {
    errors.push('Neither the legacy nor the v2 habits table is accessible. Run the latest migrations before testing again.');
  }
  if (!habitLogsOk) {
    errors.push('Neither the legacy nor the v2 habit logs table is accessible. Run the latest migrations before testing again.');
  }

  return { results, errors, habitsOk, habitLogsOk };
}

async function runWriteTestPlan(client: TypedSupabaseClient, userId: string) {
  const ctx: WriteTestContext = { client, userId, cleanup: [] };
  const results = new Map<TableKey, TableWriteStatus>();
  const errors: string[] = [];

  try {
    for (const config of tableReadConfigs) {
      const definition = writeTestDefinitions[config.key];
      if (!definition) {
        results.set(config.key, { status: 'skipped', detail: 'No write harness configured yet.' });
        continue;
      }

      if (definition.skipReason) {
        results.set(config.key, { status: 'skipped', detail: definition.skipReason });
        continue;
      }

      if (!definition.run) {
        results.set(config.key, { status: 'skipped', detail: 'No write harness configured yet.' });
        continue;
      }

      try {
        await definition.run(ctx);
        results.set(config.key, { status: 'success' });
      } catch (error) {
        if (error instanceof SkipTestError) {
          results.set(config.key, { status: 'skipped', detail: error.message });
        } else if (isMissingRelationError(error) && (definition.optional || config.optional)) {
          results.set(config.key, { status: 'skipped', detail: 'Table not found in this project.' });
        } else {
          const { message, code } = normalizeError(error);
          const detail = `[${code ?? 'error'}] ${message}`;
          results.set(config.key, { status: 'error', detail });
          errors.push(`${config.label}: ${detail}`);
        }
      }
    }
  } finally {
    for (const task of ctx.cleanup.reverse()) {
      try {
        await task();
      } catch (cleanupError) {
        console.warn('Supabase diagnostics cleanup failed:', cleanupError);
      }
    }
  }

  return { results, errors };
}

function combineTableStatuses(
  readResults: Map<TableKey, TableReadStatus>,
  writeResults: Map<TableKey, TableWriteStatus>,
): TableTestStatus[] {
  return tableReadConfigs.map((config) => {
    const read = readResults.get(config.key) ?? { status: 'error', detail: 'Test not run.' };
    const write = writeResults.get(config.key) ?? { status: 'skipped', detail: 'No write harness configured yet.' };

    return {
      key: config.key,
      label: config.label,
      read: read.status,
      readDetail: read.detail,
      write: write.status,
      writeDetail: write.detail,
    };
  });
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

type ConnectionTestResult = {
  credentialsConfigured: boolean;
  sessionActive: boolean;
  databaseConnected: boolean;
  tableStatuses: TableTestStatus[];
  errorMessage?: string;
  testTimestamp?: string;
};

type DemoDataSummary = {
  goals: number;
  habits: number;
  habitLogs: number;
  visionImages: number;
  checkins: number;
  goalReflections: number;
  hasNotificationPreferences: boolean;
};

type SupabaseConnectionTestProps = {
  session: Session;
  isDemoExperience: boolean;
};

export function SupabaseConnectionTest({ session, isDemoExperience }: SupabaseConnectionTestProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [demoDataSummary, setDemoDataSummary] = useState<DemoDataSummary | null>(null);
  const [showDemoData, setShowDemoData] = useState(false);
  const {
    session: supabaseAuthSession,
    mode: authProviderMode,
    isAuthenticated: supabaseAuthenticated,
    signInWithPassword,
    signOut,
  } = useSupabaseAuth();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [sampleQueryStatus, setSampleQueryStatus] = useState<'idle' | 'loading'>('idle');
  const [sampleQueryMessage, setSampleQueryMessage] = useState<string | null>(null);
  const [sampleQueryError, setSampleQueryError] = useState<string | null>(null);

  const isSupabaseMode = authProviderMode === 'supabase';
  const activeSupabaseSession = useMemo(() => {
    if (supabaseAuthSession) {
      return supabaseAuthSession;
    }
    return hasActiveSupabaseSession() ? session : null;
  }, [supabaseAuthSession, session]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSupabaseMode) {
      return;
    }

    const normalizedEmail = authEmail.trim();
    const normalizedPassword = authPassword.trim();

    setAuthStatusMessage(null);
    setAuthErrorMessage(null);

    if (!normalizedEmail) {
      setAuthErrorMessage('Enter the email address tied to your Supabase account.');
      return;
    }
    if (!normalizedPassword) {
      setAuthErrorMessage('Enter your Supabase password to continue.');
      return;
    }

    setAuthSubmitting(true);
    try {
      await signInWithPassword({ email: normalizedEmail, password: normalizedPassword });
      setAuthStatusMessage('Signed in to Supabase successfully.');
      setAuthPassword('');
    } catch (error) {
      setAuthErrorMessage(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAuthSignOut = async () => {
    if (!isSupabaseMode) {
      return;
    }
    setAuthStatusMessage(null);
    setAuthErrorMessage(null);
    setAuthSubmitting(true);
    try {
      await signOut();
      setAuthStatusMessage('Signed out of Supabase. Run the diagnostics again after signing back in.');
    } catch (error) {
      setAuthErrorMessage(error instanceof Error ? error.message : 'Unable to sign out right now.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const runSampleQuery = async () => {
    if (!isSupabaseMode || !activeSupabaseSession) {
      setSampleQueryError('Sign in with Supabase to run sample queries.');
      setSampleQueryMessage(null);
      return;
    }

    setSampleQueryStatus('loading');
    setSampleQueryMessage(null);
    setSampleQueryError(null);

    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('goals')
        .select('id,title,created_at')
        .eq('user_id', activeSupabaseSession.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        setSampleQueryMessage('Connected successfully, but no goals exist for this account yet.');
      } else {
        const goal = data[0];
        const goalTitle = goal.title || goal.id;
        const createdAt = goal.created_at ? new Date(goal.created_at).toLocaleString() : 'unknown';
        setSampleQueryMessage(`Fetched goal “${goalTitle}” (${goal.id}). Created on ${createdAt}.`);
      }
    } catch (error) {
      setSampleQueryError(error instanceof Error ? error.message : 'Unable to run the sample query.');
    } finally {
      setSampleQueryStatus('idle');
    }
  };

  const runConnectionTest = async () => {
    setStatus('testing');
    setTestResult(null);

    const result: ConnectionTestResult = {
      credentialsConfigured: hasSupabaseCredentials(),
      sessionActive: hasActiveSupabaseSession(),
      databaseConnected: false,
      tableStatuses: [],
      testTimestamp: new Date().toISOString(),
    };

    try {
      if (!result.credentialsConfigured) {
        result.errorMessage = 'Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
        setStatus('error');
        setTestResult(result);
        return;
      }

      if (!result.sessionActive) {
        result.errorMessage = 'No active Supabase session. Please sign in to test database connectivity.';
        setStatus('error');
        setTestResult(result);
        return;
      }

      const client = getSupabaseClient();
      if (!activeSupabaseSession) {
        result.errorMessage = 'No Supabase session is available for diagnostics. Please sign in again.';
        setStatus('error');
        setTestResult(result);
        return;
      }
      const readOutcome = await runTableReadTests(client);
      const writeOutcome = await runWriteTestPlan(client, activeSupabaseSession.user.id);
      const tableStatuses = combineTableStatuses(readOutcome.results, writeOutcome.results);

      result.tableStatuses = tableStatuses;

      const blockingReadFailures = tableReadConfigs
        .filter((config) => !config.optional)
        .filter((config) => readOutcome.results.get(config.key)?.status !== 'success');

      result.databaseConnected =
        blockingReadFailures.length === 0 && readOutcome.habitsOk && readOutcome.habitLogsOk;

      const aggregatedErrors = [...readOutcome.errors, ...writeOutcome.errors];

      if (aggregatedErrors.length > 0) {
        result.errorMessage = aggregatedErrors.join('\n');
        setStatus('error');
      } else {
        setStatus('success');
      }

      setTestResult(result);
    } catch (error) {
      result.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus('error');
      setTestResult(result);
    }
  };

  const loadDemoDataSummary = () => {
    const demoState = getDemoState();
    setDemoDataSummary({
      goals: demoState.goals.length,
      habits: demoState.habits.length,
      habitLogs: demoState.habitLogs.length,
      visionImages: demoState.visionImages.length,
      checkins: demoState.checkins.length,
      goalReflections: demoState.goalReflections.length,
      hasNotificationPreferences: demoState.notificationPreferences !== null,
    });
    setShowDemoData(true);
  };

  const handleClearDemoData = () => {
    if (confirm('Are you sure you want to clear all demo data? This action cannot be undone.')) {
      clearDemoData();
      setDemoDataSummary(null);
      setShowDemoData(false);
      alert('Demo data has been cleared. Refresh the page to load fresh demo data.');
    }
  };

  const formatStatusLabel = (
    state: TableReadStatus['status'],
    verb: 'Read' | 'Write',
    detail?: string,
  ): string => {
    if (state === 'success') {
      return `✓ ${verb}`;
    }
    if (state === 'error') {
      return detail ? `✗ ${detail}` : `✗ ${verb} failed`;
    }
    return detail ? `— ${detail}` : `— ${verb} skipped`;
  };

  const getStatusClassName = (state: TableReadStatus['status']): string => {
    if (state === 'success') return 'status-success';
    if (state === 'error') return 'status-error';
    return 'status-muted';
  };

  return (
    <section className="account-panel__card" aria-labelledby="connection-test">
      <p className="account-panel__eyebrow">Developer tools</p>
      <h3 id="connection-test">Supabase connection test</h3>
      <p className="account-panel__hint">
        Verify your Supabase configuration and database connectivity. Use this to diagnose SQL issues and RLS policies.
      </p>

      <div className="connection-test">
        <button
          type="button"
          className="btn btn--primary"
          onClick={runConnectionTest}
          disabled={status === 'testing'}
        >
          {status === 'testing' ? 'Testing connection...' : 'Run connection test'}
        </button>

        {testResult && (
          <div className={`connection-test__result connection-test__result--${status}`}>
            <h4>Test Results</h4>
            <dl className="account-panel__details">
              <div>
                <dt>Credentials configured</dt>
                <dd className={testResult.credentialsConfigured ? 'status-success' : 'status-error'}>
                  {testResult.credentialsConfigured ? '✓ Yes' : '✗ No'}
                </dd>
              </div>
              <div>
                <dt>Session active</dt>
                <dd className={testResult.sessionActive ? 'status-success' : 'status-error'}>
                  {testResult.sessionActive ? '✓ Yes' : '✗ No'}
                </dd>
              </div>
              <div>
                <dt>Database connected</dt>
                <dd className={testResult.databaseConnected ? 'status-success' : 'status-error'}>
                  {testResult.databaseConnected ? '✓ Yes' : '✗ No'}
                </dd>
              </div>
            </dl>

            {testResult.tableStatuses.length > 0 && (
              <>
                <h5>Table access &amp; write coverage</h5>
                <table className="connection-test__matrix">
                  <thead>
                    <tr>
                      <th scope="col">Table</th>
                      <th scope="col">Read test</th>
                      <th scope="col">Write test</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResult.tableStatuses.map((tableStatus) => (
                      <tr key={tableStatus.key}>
                        <td>{tableStatus.label}</td>
                        <td className={getStatusClassName(tableStatus.read)}>
                          {formatStatusLabel(tableStatus.read, 'Read', tableStatus.readDetail)}
                        </td>
                        <td className={getStatusClassName(tableStatus.write)}>
                          {formatStatusLabel(tableStatus.write, 'Write', tableStatus.writeDetail)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {testResult.errorMessage && (
              <div className="connection-test__error">
                <h5>Error Details</h5>
                <pre>{testResult.errorMessage}</pre>
              </div>
            )}

            <p className="connection-test__timestamp">
              Last tested: {testResult.testTimestamp ? new Date(testResult.testTimestamp).toLocaleString() : 'Never'}
            </p>
          </div>
        )}

        <div className="connection-test__auth">
          <div>
            <h4>Supabase auth &amp; session</h4>
            <p className="account-panel__hint">
              Sign in directly within the diagnostics panel to test Supabase authentication and run lightweight data pings.
            </p>
          </div>

          {!isSupabaseMode ? (
            <p className="connection-test__status connection-test__status--error">
              Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.
            </p>
          ) : (
            <>
              {authStatusMessage && (
                <p className="connection-test__status connection-test__status--success">{authStatusMessage}</p>
              )}
              {authErrorMessage && (
                <p className="connection-test__status connection-test__status--error">{authErrorMessage}</p>
              )}

              {supabaseAuthenticated && activeSupabaseSession ? (
                <div className="connection-test__session">
                  <dl className="account-panel__details">
                    <div>
                      <dt>Email</dt>
                      <dd>{activeSupabaseSession.user.email ?? 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt>User ID</dt>
                      <dd className="account-panel__code">{activeSupabaseSession.user.id}</dd>
                    </div>
                    <div>
                      <dt>Last sign-in</dt>
                      <dd>
                        {activeSupabaseSession.user.last_sign_in_at
                          ? new Date(activeSupabaseSession.user.last_sign_in_at).toLocaleString()
                          : 'Not available'}
                      </dd>
                    </div>
                  </dl>

                  <div className="connection-test__session-actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={runSampleQuery}
                      disabled={sampleQueryStatus === 'loading'}
                    >
                      {sampleQueryStatus === 'loading' ? 'Running query…' : 'Run sample query'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleAuthSignOut}
                      disabled={authSubmitting}
                    >
                      {authSubmitting ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </div>
              ) : (
                <form className="connection-test__auth-form supabase-auth__form" onSubmit={handleAuthSubmit}>
                  <label className="supabase-auth__field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label className="supabase-auth__field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <div className="connection-test__auth-actions">
                    <button type="submit" className="btn btn--primary" disabled={authSubmitting}>
                      {authSubmitting ? 'Signing in…' : 'Sign in &amp; enable testing'}
                    </button>
                  </div>
                </form>
              )}

              {sampleQueryMessage && (
                <p className="connection-test__status connection-test__status--success">{sampleQueryMessage}</p>
              )}
              {sampleQueryError && (
                <p className="connection-test__status connection-test__status--error">{sampleQueryError}</p>
              )}
            </>
          )}
        </div>
      </div>

      {isDemoExperience && (
        <div className="demo-data-controls">
          <h4>Demo Data Management</h4>
          <p className="account-panel__hint">
            View and manage the demo data stored locally. This helps you understand what would be synced to Supabase.
          </p>

          <div className="demo-data-controls__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={loadDemoDataSummary}
            >
              {showDemoData ? 'Refresh demo data summary' : 'View demo data summary'}
            </button>
            
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleClearDemoData}
            >
              Clear demo data
            </button>
          </div>

          {showDemoData && demoDataSummary && (
            <div className="demo-data-summary">
              <h5>Current Demo Data</h5>
              <dl className="account-panel__details">
                <div>
                  <dt>Goals</dt>
                  <dd>{demoDataSummary.goals} records</dd>
                </div>
                <div>
                  <dt>Habits</dt>
                  <dd>{demoDataSummary.habits} records</dd>
                </div>
                <div>
                  <dt>Habit logs</dt>
                  <dd>{demoDataSummary.habitLogs} records</dd>
                </div>
                <div>
                  <dt>Vision images</dt>
                  <dd>{demoDataSummary.visionImages} records</dd>
                </div>
                <div>
                  <dt>Check-ins</dt>
                  <dd>{demoDataSummary.checkins} records</dd>
                </div>
                <div>
                  <dt>Goal reflections</dt>
                  <dd>{demoDataSummary.goalReflections} records</dd>
                </div>
                <div>
                  <dt>Notification preferences</dt>
                  <dd>{demoDataSummary.hasNotificationPreferences ? 'Configured' : 'Not configured'}</dd>
                </div>
              </dl>
              <p className="connection-test__note">
                💡 This data is stored in localStorage and does not sync to Supabase in demo mode.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
