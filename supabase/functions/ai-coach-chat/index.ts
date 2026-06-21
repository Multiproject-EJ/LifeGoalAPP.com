import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import OpenAI from 'https://esm.sh/openai@4.67.3';

type ChatRole = 'user' | 'assistant' | 'system';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AiCoachChatRequest = {
  messages: ChatMessage[];
  systemPrompt?: string;
  accessSummary?: string;
  threadId?: string | null;
};

type AiCoachDataAccess = {
  goals: boolean;
  goalEvolution: boolean;
  habits: boolean;
  journaling: boolean;
  reflections: boolean;
  visionBoard: boolean;
  lifeStage: boolean;
};

type CoachContextOptions = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  access: AiCoachDataAccess;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MODEL = 'gpt-5-nano';
const MAX_TURNS = 18;
const MAX_MESSAGE_CHARS = 1600;
const MAX_SYSTEM_CHARS = 5000;
const MAX_CONTEXT_CHARS = 7000;
const AI_COACH_ACCESS_KEY = 'ai_coach_access';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeText(value: unknown, limit = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function normalizeThreadId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

function isChatRole(role: unknown): role is ChatRole {
  return role === 'user' || role === 'assistant' || role === 'system';
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        role: isChatRole(obj.role) ? obj.role : null,
        content: safeText(obj.content, MAX_MESSAGE_CHARS),
      };
    })
    .filter((msg): msg is ChatMessage => Boolean(msg.role) && msg.content.length > 0)
    .filter((msg) => msg.role !== 'system')
    .slice(-MAX_TURNS);
}

function normalizeAccess(value: unknown): AiCoachDataAccess {
  const obj = value && typeof value === 'object' ? value as Partial<AiCoachDataAccess> : {};
  return {
    goals: obj.goals ?? true,
    goalEvolution: obj.goalEvolution ?? true,
    habits: obj.habits ?? true,
    journaling: obj.journaling ?? true,
    reflections: obj.reflections ?? true,
    visionBoard: obj.visionBoard ?? true,
    lifeStage: obj.lifeStage ?? false,
  };
}

function truncateJson(value: unknown, limit = 900): string {
  return safeText(JSON.stringify(value ?? null), limit);
}

async function safeQuery<T>(label: string, query: PromiseLike<{ data: T | null; error: { message?: string } | null }>): Promise<T | null> {
  try {
    const { data, error } = await query;
    if (error) {
      console.warn(`[ai-coach-chat] Context query skipped (${label}):`, error.message ?? error);
      return null;
    }
    return data ?? null;
  } catch (error) {
    console.warn(`[ai-coach-chat] Context query failed (${label}):`, error);
    return null;
  }
}

function formatList(title: string, items: string[]): string | null {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return `${title}:\n${cleaned.map((item) => `- ${item}`).join('\n')}`;
}

async function buildCoachContextBundle(options: CoachContextOptions): Promise<string> {
  const { supabase, userId, access } = options;
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const sections: string[] = [];
  sections.push(`AI data access: ${Object.entries(access).map(([key, enabled]) => `${key}=${enabled ? 'allowed' : 'blocked'}`).join(', ')}`);

  if (access.goals) {
    const goals = await safeQuery<Array<Record<string, unknown>>>('goals', supabase
      .from('goals')
      .select('id,title,description,status_tag,life_wheel_category,secondary_life_wheel_categories,target_date,progress_notes,priority_level,weekly_workload_target,plan_quality_score,environment_score,why_it_matters')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8));

    const goalLines = (goals ?? []).map((goal) => [
      `"${safeText(goal.title, 120)}"`,
      safeText(goal.status_tag, 40) ? `status=${safeText(goal.status_tag, 40)}` : null,
      safeText(goal.life_wheel_category, 60) ? `area=${safeText(goal.life_wheel_category, 60)}` : null,
      safeText(goal.priority_level, 40) ? `priority=${safeText(goal.priority_level, 40)}` : null,
      typeof goal.plan_quality_score === 'number' ? `planScore=${goal.plan_quality_score}/5` : null,
      typeof goal.environment_score === 'number' ? `environmentScore=${goal.environment_score}/5` : null,
      safeText(goal.progress_notes, 220) ? `progress=${safeText(goal.progress_notes, 220)}` : null,
    ].filter(Boolean).join('; '));
    const goalSection = formatList('Current goals', goalLines);
    if (goalSection) sections.push(goalSection);
  }

  if (access.goalEvolution) {
    const snapshots = await safeQuery<Array<Record<string, unknown>>>('goal_snapshots', supabase
      .from('goal_snapshots')
      .select('snapshot_type,summary,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6));
    const snapshotSection = formatList('Recent goal evolution', (snapshots ?? []).map((snapshot) => `${safeText(snapshot.snapshot_type, 40)}: ${safeText(snapshot.summary, 220)} (${safeText(snapshot.created_at, 24)})`));
    if (snapshotSection) sections.push(snapshotSection);
  }

  if (access.habits) {
    const habits = await safeQuery<Array<Record<string, unknown>>>('habits_v2', supabase
      .from('habits_v2')
      .select('id,title,type,status,target_num,target_unit,schedule,archived,goal_id,habit_environment,environment_score,environment_risk_tags,habit_intent,duration_mode,duration_value,duration_unit')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(12));
    const habitIds = (habits ?? []).map((habit) => safeText(habit.id, 80)).filter(Boolean);
    const logs = habitIds.length > 0
      ? await safeQuery<Array<Record<string, unknown>>>('habit_logs_v2', supabase
        .from('habit_logs_v2')
        .select('habit_id,date,done,value,note,mood')
        .eq('user_id', userId)
        .in('habit_id', habitIds)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false })
        .limit(80))
      : [];
    const doneToday = new Set((logs ?? []).filter((log) => log.date === today && log.done === true).map((log) => safeText(log.habit_id, 80)));
    const habitLines = (habits ?? []).map((habit) => {
      const id = safeText(habit.id, 80);
      const sevenDayDone = (logs ?? []).filter((log) => log.habit_id === id && log.done === true).length;
      return [
        `"${safeText(habit.title, 100)}"`,
        safeText(habit.status, 40) ? `status=${safeText(habit.status, 40)}` : null,
        doneToday.has(id) ? 'today=done' : 'today=not_done_or_not_logged',
        `7dDoneLogs=${sevenDayDone}`,
        safeText(habit.target_unit, 40) ? `target=${habit.target_num ?? ''} ${safeText(habit.target_unit, 40)}`.trim() : null,
        typeof habit.environment_score === 'number' ? `environmentScore=${habit.environment_score}/5` : null,
        Array.isArray(habit.environment_risk_tags) && habit.environment_risk_tags.length > 0 ? `riskTags=${habit.environment_risk_tags.join(',')}` : null,
        safeText(habit.habit_environment, 160) ? `environment=${safeText(habit.habit_environment, 160)}` : null,
      ].filter(Boolean).join('; ');
    });
    const habitSection = formatList('Active habits and completion signals', habitLines);
    if (habitSection) sections.push(habitSection);
  }

  if (access.journaling) {
    const journals = await safeQuery<Array<Record<string, unknown>>>('journal_entries', supabase
      .from('journal_entries')
      .select('title,content,mood,tags,entry_date')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(16));
    const taggedJournals = (journals ?? []).filter((entry) => Array.isArray(entry.tags) && entry.tags.length > 0).slice(0, 8);
    const journalSection = formatList('Tagged journal signals', taggedJournals.map((entry) => [
      safeText(entry.entry_date, 20),
      safeText(entry.title, 100) || 'Untitled',
      Array.isArray(entry.tags) && entry.tags.length > 0 ? `tags=${entry.tags.join(',')}` : null,
      safeText(entry.mood, 40) ? `mood=${safeText(entry.mood, 40)}` : null,
      `note=${safeText(entry.content, 280)}`,
    ].filter(Boolean).join('; ')));
    if (journalSection) sections.push(journalSection);
  }

  if (access.reflections) {
    const checkins = await safeQuery<Array<Record<string, unknown>>>('checkins', supabase
      .from('checkins')
      .select('date,scores')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5));
    const checkinSection = formatList('Recent life score check-ins', (checkins ?? []).map((checkin) => `${safeText(checkin.date, 20)} scores=${truncateJson(checkin.scores, 500)}`));
    if (checkinSection) sections.push(checkinSection);
  }

  const [gameProfile, reputation, islandRun, intake] = await Promise.all([
    safeQuery<Record<string, unknown>>('gamification_profiles', supabase
      .from('gamification_profiles')
      .select('current_level,total_xp,current_streak,longest_streak,lives,max_lives,total_points,gamification_enabled')
      .eq('user_id', userId)
      .maybeSingle()),
    safeQuery<Record<string, unknown>>('user_reputation_scores', supabase
      .from('user_reputation_scores')
      .select('reliability_rating,reliability_tier,contracts_started,contracts_completed,contracts_failed,longest_contract_streak')
      .eq('user_id', userId)
      .maybeSingle()),
    safeQuery<Record<string, unknown>>('island_run_runtime_state', supabase
      .from('island_run_runtime_state')
      .select('current_island_number,first_run_claimed,daily_hearts_claimed_day_key,boss_trial_resolved_island_number')
      .eq('user_id', userId)
      .maybeSingle()),
    safeQuery<Array<Record<string, unknown>>>('game_life_intake', supabase
      .from('game_life_intake')
      .select('source,island_number,prompt_context,intake_stage,life_wheel_area,state,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)),
  ]);

  const gameLines = [
    gameProfile ? `Gamification: level=${gameProfile.current_level}, xp=${gameProfile.total_xp}, streak=${gameProfile.current_streak}, lives=${gameProfile.lives}/${gameProfile.max_lives}, points=${gameProfile.total_points}` : null,
    reputation ? `Reliability: rating=${reputation.reliability_rating}, tier=${reputation.reliability_tier}, completed=${reputation.contracts_completed}, failed=${reputation.contracts_failed}, longestStreak=${reputation.longest_contract_streak}` : null,
    islandRun ? `Island Run: island=${islandRun.current_island_number}, firstRunClaimed=${islandRun.first_run_claimed}, bossResolvedIsland=${islandRun.boss_trial_resolved_island_number ?? 'none'}` : null,
    ...(intake ?? []).map((row) => `Game intake: ${safeText(row.source, 40)} island=${row.island_number ?? 'n/a'} area=${safeText(row.life_wheel_area, 60) || 'n/a'} state=${safeText(row.state, 40)} prompt=${safeText(row.prompt_context, 120)}`),
  ].filter(Boolean) as string[];
  const gameSection = formatList('Scores and game progress', gameLines);
  if (gameSection) sections.push(gameSection);

  return safeText(sections.join('\n\n'), MAX_CONTEXT_CHARS);
}

async function getOpenAIForUser(userId: string, supabase: ReturnType<typeof createClient>): Promise<OpenAI> {
  let apiKey: string | undefined;

  const { data: settings } = await supabase
    .from('ai_settings')
    .select('provider, api_key')
    .eq('user_id', userId)
    .eq('provider', 'openai')
    .maybeSingle();

  if (settings?.provider === 'openai' && settings.api_key?.trim()) {
    apiKey = settings.api_key.trim();
  }

  if (!apiKey) {
    apiKey = Deno.env.get('OPENAI_API_KEY');
  }

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No OpenAI API key available. Configure ai_settings.api_key or OPENAI_API_KEY.');
  }

  return new OpenAI({ apiKey });
}

async function getUserModel(userId: string, supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: settings } = await supabase
    .from('ai_settings')
    .select('provider, model')
    .eq('user_id', userId)
    .eq('provider', 'openai')
    .maybeSingle();

  if (settings?.provider === 'openai' && settings.model?.trim()) {
    return settings.model.trim();
  }

  return DEFAULT_MODEL;
}

async function getOrCreateThread(options: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  requestedThreadId: string | null;
  latestUserMessage: string;
}): Promise<string> {
  const { supabase, userId, requestedThreadId, latestUserMessage } = options;

  if (requestedThreadId) {
    const { data: existingThread, error: existingError } = await supabase
      .from('ai_coach_threads')
      .select('id')
      .eq('id', requestedThreadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to load AI coach thread: ${existingError.message}`);
    }

    if (existingThread?.id) {
      return existingThread.id;
    }
  }

  const title = safeText(latestUserMessage, 80) || 'Coach chat';
  const { data: insertedThread, error: insertError } = await supabase
    .from('ai_coach_threads')
    .insert({
      user_id: userId,
      surface: 'main_coach',
      title,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !insertedThread?.id) {
    throw new Error(`Failed to create AI coach thread: ${insertError?.message ?? 'missing thread id'}`);
  }

  return insertedThread.id;
}

async function insertCoachMessage(options: {
  supabase: ReturnType<typeof createClient>;
  threadId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { supabase, threadId, userId, role, content, metadata = {} } = options;
  const { error } = await supabase
    .from('ai_coach_messages')
    .insert({
      thread_id: threadId,
      user_id: userId,
      role,
      content,
      token_estimate: estimateTokens(content),
      metadata,
    });

  if (error) {
    throw new Error(`Failed to save AI coach ${role} message: ${error.message}`);
  }
}

async function touchThread(options: {
  supabase: ReturnType<typeof createClient>;
  threadId: string;
  userId: string;
}): Promise<void> {
  const { supabase, threadId, userId } = options;
  const { error } = await supabase
    .from('ai_coach_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', threadId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update AI coach thread: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as AiCoachChatRequest;
    const messages = normalizeMessages(body.messages);
    const latestUserMessage = messages[messages.length - 1]?.content ?? '';
    const requestedThreadId = normalizeThreadId(body.threadId);

    if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
      return new Response(JSON.stringify({ error: 'A latest user message is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const access = normalizeAccess(user.user_metadata?.[AI_COACH_ACCESS_KEY]);
    const coachContext = await buildCoachContextBundle({ supabase, userId: user.id, access });

    const threadId = await getOrCreateThread({
      supabase,
      userId: user.id,
      requestedThreadId,
      latestUserMessage,
    });

    await insertCoachMessage({
      supabase,
      threadId,
      userId: user.id,
      role: 'user',
      content: latestUserMessage,
      metadata: { source: 'ai_coach_chat' },
    });

    const openai = await getOpenAIForUser(user.id, supabase);
    const model = await getUserModel(user.id, supabase);
    const clientSystemPrompt = safeText(body.systemPrompt, MAX_SYSTEM_CHARS);
    const accessSummary = safeText(body.accessSummary, 600);
    const systemPrompt = [
      clientSystemPrompt || 'You are the LifeGoalApp AI Coach: calm, grounded, pragmatic, privacy-aware, and focused on tiny next steps.',
      'Ask short reflective questions before prescribing actions. Offer 2-3 small options when useful. Never shame the user or promise guaranteed outcomes.',
      'Do not claim you changed goals, habits, journals, or gameplay state. If an action would modify app data, present it as a suggestion for the user to confirm in the UI.',
      accessSummary ? `Visible privacy summary: ${accessSummary}` : null,
      coachContext ? `Current app context bundle (privacy-filtered, summarized Supabase data):\n${coachContext}` : null,
      'Use the context bundle to answer concretely about goals, habits, tagged journal signals, scores, incomplete work, and game progress. If data is absent or blocked, ask a short clarifying question instead of inventing details.',
      'Reply as plain text. Keep the response concise: usually 2-5 short paragraphs or bullets.',
    ].filter(Boolean).join('\n\n');

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const assistantMessage = completion.choices?.[0]?.message?.content?.trim();
    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    const safeAssistantMessage = safeText(assistantMessage, 4000);

    await insertCoachMessage({
      supabase,
      threadId,
      userId: user.id,
      role: 'assistant',
      content: safeAssistantMessage,
      metadata: { source: 'openai', model },
    });
    await touchThread({ supabase, threadId, userId: user.id });

    return new Response(JSON.stringify({ thread_id: threadId, assistant_message: safeAssistantMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ai-coach-chat] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error in ai-coach-chat.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
