import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { GoalReflectionRow } from './goalReflections';

export type FollowUpPrompt = {
  id: string;
  title: string;
  summary: string;
  focus: string;
  actions: string[];
  confidenceSignal: 'boost' | 'sustain' | 'celebrate';
};

type PromptServiceResponse = {
  data: FollowUpPrompt[] | null;
  error: PostgrestError | null;
  source: 'supabase' | 'demo';
};

type SupabaseFunctionPayload = {
  goalId: string;
  goalTitle?: string;
  reflections: Array<{
    id: string;
    entryDate: string | null;
    confidence: number | null;
    highlight: string | null;
    challenge: string | null;
  }>;
};

type SupabaseFunctionResponse = {
  prompts?: Array<{
    id: string;
    title: string;
    summary: string;
    focus: string;
    actions: string[];
    confidenceSignal?: FollowUpPrompt['confidenceSignal'];
  }>;
};

export async function generateFollowUpPrompts(
  goalId: string,
  goalTitle: string | undefined,
  reflections: GoalReflectionRow[],
): Promise<PromptServiceResponse> {
  if (!goalId) {
    return { data: [], error: null, source: 'demo' };
  }

  if (!canUseSupabaseData()) {
    return { data: buildDemoFollowUpPrompts(goalId, goalTitle, reflections), error: null, source: 'demo' };
  }

  const supabase = getSupabaseClient();

  try {
    const payload: SupabaseFunctionPayload = {
      goalId,
      goalTitle,
      reflections: reflections.slice(0, 10).map((reflection) => ({
        id: reflection.id,
        entryDate: reflection.entry_date,
        confidence: reflection.confidence ?? null,
        highlight: reflection.highlight ?? null,
        challenge: reflection.challenge ?? null,
      })),
    };

    const { data, error } = await supabase.functions.invoke<SupabaseFunctionResponse>(
      'generate-reflection-prompts',
      {
        body: payload,
      },
    );

    if (error) {
      console.warn('Falling back to demo follow-up prompts after Supabase function error.', error);
      return { data: buildDemoFollowUpPrompts(goalId, goalTitle, reflections), error: null, source: 'demo' };
    }

    const prompts = normalizeSupabasePrompts(goalId, data);
    if (prompts.length > 0) {
      return { data: prompts, error: null, source: 'supabase' };
    }

    return { data: buildDemoFollowUpPrompts(goalId, goalTitle, reflections), error: null, source: 'demo' };
  } catch (error) {
    console.warn('Falling back to demo follow-up prompts after invocation failure.', error);
    return { data: buildDemoFollowUpPrompts(goalId, goalTitle, reflections), error: null, source: 'demo' };
  }
}

function normalizeSupabasePrompts(goalId: string, response: SupabaseFunctionResponse | null): FollowUpPrompt[] {
  if (!response || !Array.isArray(response.prompts)) {
    return [];
  }

  return response.prompts
    .map((prompt, index) => {
      const actions = Array.isArray(prompt.actions) ? prompt.actions.filter(Boolean) : [];
      if (!prompt.title || !prompt.summary || actions.length === 0) {
        return null;
      }

      return {
        id: prompt.id || `${goalId}-supabase-${index}`,
        title: prompt.title,
        summary: prompt.summary,
        focus: prompt.focus || 'Next step',
        actions,
        confidenceSignal: prompt.confidenceSignal ?? 'sustain',
      } satisfies FollowUpPrompt;
    })
    .filter((prompt): prompt is FollowUpPrompt => Boolean(prompt));
}

function buildDemoFollowUpPrompts(
  goalId: string,
  goalTitle: string | undefined,
  reflections: GoalReflectionRow[],
): FollowUpPrompt[] {
  if (!reflections.length) {
    return [];
  }

  const ordered = [...reflections].sort((a, b) => {
    const aTime = new Date(a.entry_date ?? a.created_at ?? 0).getTime();
    const bTime = new Date(b.entry_date ?? b.created_at ?? 0).getTime();
    return bTime - aTime;
  });

  const recent = ordered.slice(0, 6);
  const latest = recent[0];
  if (!latest) {
    return [];
  }

  const previous = recent[1] ?? null;
  const latestConfidence = normalizeConfidence(latest.confidence);
  const recentAverage = averageConfidence(recent.slice(0, 3));
  const trailingAverage = averageConfidence(recent.slice(3, 6));
  const trendDelta =
    recentAverage !== null && trailingAverage !== null ? Number((recentAverage - trailingAverage).toFixed(1)) : null;

  const prompts: FollowUpPrompt[] = [];

  if (latest.highlight) {
    prompts.push({
      id: `${goalId}-celebrate`,
      title: 'Amplify this week’s highlight',
      summary: `Protect the momentum from “${latest.highlight}” so it becomes a repeatable win${
        goalTitle ? ` for ${goalTitle}` : ''
      }.`,
      focus: selectHighlightFocus(latest.highlight),
      actions: buildHighlightActions(latest.highlight),
      confidenceSignal: latestConfidence && latestConfidence >= 4 ? 'celebrate' : 'sustain',
    });
  }

  if (latest.challenge) {
    prompts.push({
      id: `${goalId}-challenge`,
      title: 'Coach through the current blocker',
      summary: `Break “${latest.challenge}” into the next coaching experiment so progress returns quickly.`,
      focus: selectChallengeFocus(latest.challenge),
      actions: buildChallengeActions(latest.challenge),
      confidenceSignal: latestConfidence && latestConfidence <= 3 ? 'boost' : 'sustain',
    });
  }

  if (trendDelta !== null) {
    if (trendDelta <= -0.3) {
      prompts.push({
        id: `${goalId}-stabilize`,
        title: 'Stabilize the confidence trend',
        summary: `Confidence dipped ${Math.abs(trendDelta)} points across recent reflections. Design a reset ritual to steady the next review.`,
        focus: 'Confidence recovery',
        actions: buildTrendRecoveryActions(latest, previous),
        confidenceSignal: 'boost',
      });
    } else if (trendDelta >= 0.3) {
      prompts.push({
        id: `${goalId}-double-down`,
        title: 'Double down on what’s working',
        summary: `Confidence climbed ${trendDelta} points lately. Capture the routines that created the lift so you can repeat them.`,
        focus: 'Momentum design',
        actions: buildTrendMomentumActions(latest, previous),
        confidenceSignal: 'celebrate',
      });
    }
  }

  if (prompts.length === 0) {
    prompts.push({
      id: `${goalId}-reflection-cadence`,
      title: 'Plan the next reflection touchpoint',
      summary: 'Translate your notes into one concrete win, one unlock, and one check-in date.',
      focus: 'Weekly cadence',
      actions: [
        'List one win you want to extend into next week and add it to your calendar.',
        'Identify the single biggest unlock you can deliver in the next 72 hours.',
        'Schedule your next reflection to keep the coaching rhythm alive.',
      ],
      confidenceSignal: 'sustain',
    });
  }

  return prompts.slice(0, 3);
}

function normalizeConfidence(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.min(5, Math.max(1, Number(value.toFixed(1))));
}

function averageConfidence(reflections: GoalReflectionRow[]): number | null {
  const confidences = reflections
    .map((reflection) => normalizeConfidence(reflection.confidence))
    .filter((value): value is number => value !== null);

  if (confidences.length === 0) {
    return null;
  }

  const total = confidences.reduce((sum, value) => sum + value, 0);
  return Number((total / confidences.length).toFixed(1));
}

function selectHighlightFocus(text: string): string {
  const lowered = text.toLowerCase();
  if (/(team|collaboration|partner|client)/.test(lowered)) {
    return 'Relationship win';
  }
  if (lowered.includes('launch') || lowered.includes('release') || lowered.includes('ship')) {
    return 'Delivery milestone';
  }
  if (lowered.includes('learning') || lowered.includes('workshop') || lowered.includes('research')) {
    return 'Learning loop';
  }
  return 'Momentum boost';
}

function selectChallengeFocus(text: string): string {
  const lowered = text.toLowerCase();
  if (lowered.includes('time') || lowered.includes('schedule') || lowered.includes('calendar')) {
    return 'Timeboxing';
  }
  if (lowered.includes('stakeholder') || lowered.includes('communication') || lowered.includes('alignment')) {
    return 'Stakeholder sync';
  }
  if (lowered.includes('resource') || lowered.includes('budget') || lowered.includes('support')) {
    return 'Resource planning';
  }
  if (lowered.includes('clarity') || lowered.includes('scope') || lowered.includes('plan')) {
    return 'Clarity reset';
  }
  return 'Blocker focus';
}

function buildHighlightActions(text: string): string[] {
  const lowered = text.toLowerCase();
  if (lowered.includes('team') || lowered.includes('partner') || lowered.includes('client')) {
    return [
      'Capture the collaboration moves that made the win possible in your playbook.',
      'Send a quick thank-you or recap to the partner to reinforce the behavior.',
      'Book a 15-minute retro to agree on how to repeat the success next sprint.',
    ];
  }

  if (lowered.includes('launch') || lowered.includes('release') || lowered.includes('ship')) {
    return [
      'Document the launch checklist that kept the delivery smooth.',
      'Identify one metric that proves the launch is creating impact.',
      'Schedule a quick review to decide the next enhancement while excitement is high.',
    ];
  }

  if (lowered.includes('learning') || lowered.includes('research') || lowered.includes('experiment')) {
    return [
      'Summarize the top insight you want to apply immediately.',
      'Share the learning with one teammate or stakeholder.',
      'Pick a follow-up experiment to run within the next week.',
    ];
  }

  return [
    'Write down the core behavior that led to the win and add it to your weekly ritual.',
    'Identify who needs to know about the progress and send a short update.',
    'Set a reminder to repeat the winning action in next week’s schedule.',
  ];
}

function buildChallengeActions(text: string): string[] {
  const lowered = text.toLowerCase();
  if (lowered.includes('time') || lowered.includes('schedule') || lowered.includes('calendar')) {
    return [
      'Block a focused working session dedicated to the stuck work.',
      'Drop one lower-priority commitment to create breathing room.',
      'Share your updated schedule with stakeholders so expectations stay aligned.',
    ];
  }

  if (lowered.includes('stakeholder') || lowered.includes('communication') || lowered.includes('alignment')) {
    return [
      'Draft the single message you need stakeholders to align on.',
      'Book a quick sync to close gaps or reset expectations.',
      'Document decisions in a shared space so momentum is easy to reference.',
    ];
  }

  if (lowered.includes('resource') || lowered.includes('budget') || lowered.includes('support')) {
    return [
      'List the resources you truly need versus nice-to-haves.',
      'Identify one sponsor who can unlock the missing support.',
      'Propose a lightweight experiment that fits within the current constraints.',
    ];
  }

  if (lowered.includes('clarity') || lowered.includes('scope') || lowered.includes('plan')) {
    return [
      'Rewrite the desired outcome in one sentence to regain clarity.',
      'Break the work into the next two concrete milestones.',
      'Confirm the plan with your team or coach to reduce ambiguity.',
    ];
  }

  return [
    'Define what success looks like for the blocked area in one sentence.',
    'List the first tiny move that would create momentum within 48 hours.',
    'Ask for a specific resource, partner, or decision to clear the path.',
  ];
}

function buildTrendRecoveryActions(
  latest: GoalReflectionRow,
  previous: GoalReflectionRow | null,
): string[] {
  const latestHighlight = latest.highlight ? `Bring back the energy from “${latest.highlight}.”` : 'Reconnect with last month’s wins.';
  const previousChallenge = previous?.challenge
    ? `Close the loop on the lingering blocker: “${previous.challenge}.”`
    : 'Review your prior blockers to confirm they are resolved.';

  return [
    latestHighlight,
    previousChallenge,
    'Decide on one ritual (daily standup, end-of-week retro, etc.) that will rebuild confidence steadily.',
  ];
}

function buildTrendMomentumActions(
  latest: GoalReflectionRow,
  previous: GoalReflectionRow | null,
): string[] {
  const highlightMomentum = latest.highlight
    ? `List the ingredients that made “${latest.highlight}” possible.`
    : 'Capture the behaviors that lifted confidence.';
  const continuity = previous?.highlight
    ? `Contrast this win with last week’s highlight (“${previous.highlight}”) to spot the throughline.`
    : 'Note the throughline between recent reflections to make the momentum durable.';

  return [
    highlightMomentum,
    continuity,
    'Decide how you will celebrate progress and communicate the next bold step.',
  ];
}
