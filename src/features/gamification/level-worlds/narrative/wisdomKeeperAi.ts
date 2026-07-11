import { getSupabaseClient } from '../../../../lib/supabaseClient';
import {
  getFeatureAvailability,
  getServiceHealthManager,
  guardedCloudCall,
} from '../../../../services/service-health';
import type { AiCoachDataAccess } from '../../../../types/aiCoach';
import { buildWisdomWhisper, type LandmarkWhisperPayload } from './landmarkWhispers';

export type WisdomKeeperAiContext = {
  goals?: Array<{ title?: string; area?: string | null; priority?: string | null; progressNote?: string | null }>;
  habits?: Array<{ title?: string; todayDone?: boolean | null; sevenDayDoneCount?: number | null }>;
  lifeWheelCheckins?: Array<{ date?: string | null; scores?: Record<string, number> | null }>;
  questCompass?: Array<{ area?: string | null; prompt?: string | null; state?: string | null }>;
  recentReflectionSignals?: Array<{ title?: string | null; tags?: string[] | null; mood?: string | null; note?: string | null }>;
};

export type WisdomKeeperPromptBundle = {
  systemPrompt: string;
  userPrompt: string;
  includedContextKinds: string[];
};

export type WisdomKeeperAiGenerator = (prompt: WisdomKeeperPromptBundle) => Promise<string>;

type AiCoachChatResponse = {
  assistant_message?: string | null;
  error?: string | null;
};

export type WisdomKeeperAiResult = {
  whisper: LandmarkWhisperPayload;
  source: 'ai' | 'fallback';
  reason: 'ai_disabled' | 'ai_error' | 'empty_or_unsafe_output' | 'ok';
};

const MAX_OUTPUT_CHARS = 360;
const MAX_OUTPUT_SENTENCES = 3;
const DISALLOWED_OUTPUT_PATTERNS = [
  /\b(ai|chatbot|language model)\b/i,
  /\b(medical|legal|financial|crisis) advice\b/i,
  /\bmust\b/i,
  /\bshould be ashamed\b/i,
  /\bfail(?:ed|ure)?\b/i,
];

function cleanText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

function hasAnyPermittedContext(access: AiCoachDataAccess): boolean {
  return access.goals || access.habits || access.reflections || access.journaling;
}

function formatLines(title: string, values: string[]): string | null {
  const lines = values.map((value) => value.trim()).filter(Boolean).slice(0, 6);
  return lines.length > 0 ? `${title}:\n${lines.map((line) => `- ${line}`).join('\n')}` : null;
}

export function buildWisdomKeeperPromptBundle(
  access: AiCoachDataAccess,
  context: WisdomKeeperAiContext = {},
): WisdomKeeperPromptBundle {
  const sections: string[] = [];
  const includedContextKinds: string[] = [];

  if (access.goals && context.goals?.length) {
    const lines = context.goals.map((goal) => [
      cleanText(goal.title, 80),
      cleanText(goal.area, 40) ? `area=${cleanText(goal.area, 40)}` : '',
      cleanText(goal.priority, 40) ? `priority=${cleanText(goal.priority, 40)}` : '',
      cleanText(goal.progressNote, 120) ? `progress=${cleanText(goal.progressNote, 120)}` : '',
    ].filter(Boolean).join('; '));
    const section = formatLines('Permitted goal signals', lines);
    if (section) { sections.push(section); includedContextKinds.push('goals'); }
  }

  if (access.habits && context.habits?.length) {
    const lines = context.habits.map((habit) => [
      cleanText(habit.title, 80),
      typeof habit.todayDone === 'boolean' ? `today=${habit.todayDone ? 'done' : 'not_logged'}` : '',
      typeof habit.sevenDayDoneCount === 'number' ? `7dDone=${Math.max(0, Math.floor(habit.sevenDayDoneCount))}` : '',
    ].filter(Boolean).join('; '));
    const section = formatLines('Permitted habit signals', lines);
    if (section) { sections.push(section); includedContextKinds.push('habits'); }
  }

  if (access.reflections && context.lifeWheelCheckins?.length) {
    const lines = context.lifeWheelCheckins.map((checkin) => `${cleanText(checkin.date, 20) || 'recent'} scores=${cleanText(JSON.stringify(checkin.scores ?? {}), 240)}`);
    const section = formatLines('Permitted life wheel check-in signals', lines);
    if (section) { sections.push(section); includedContextKinds.push('lifeWheelCheckins'); }
  }

  if (access.reflections && context.questCompass?.length) {
    const lines = context.questCompass.map((item) => [cleanText(item.area, 50), cleanText(item.state, 40), cleanText(item.prompt, 100)].filter(Boolean).join('; '));
    const section = formatLines('Permitted quest/compass signals', lines);
    if (section) { sections.push(section); includedContextKinds.push('questCompass'); }
  }

  if (access.journaling && context.recentReflectionSignals?.length) {
    const lines = context.recentReflectionSignals.map((entry) => [
      cleanText(entry.title, 70) || 'Reflection',
      Array.isArray(entry.tags) && entry.tags.length ? `tags=${entry.tags.map((tag) => cleanText(tag, 24)).filter(Boolean).join(',')}` : '',
      cleanText(entry.mood, 30) ? `mood=${cleanText(entry.mood, 30)}` : '',
      cleanText(entry.note, 120) ? `note=${cleanText(entry.note, 120)}` : '',
    ].filter(Boolean).join('; '));
    const section = formatLines('Permitted journal/reflection signals', lines);
    if (section) { sections.push(section); includedContextKinds.push('recentReflectionSignals'); }
  }

  const contextText = sections.length > 0
    ? sections.join('\n\n')
    : 'No personal app context is available or allowed. Use a general reflection about priorities, balance, effort, or returning.';

  return {
    systemPrompt: [
      'You are the Wisdom Keeper of an island in a habit-building game.',
      'Write one short-to-medium reflection for the player based only on the provided app context.',
      'Be warm, wise, grounded, non-shaming, and non-preachy.',
      'Do not mention that you are an AI. Do not invent facts.',
      'Do not give medical, legal, financial, or crisis advice.',
      'If context is thin, give a general reflection about priorities, balance, effort, or returning.',
      'Return plain text only: 1 to 3 sentences, no markdown, no bullets, no emojis.',
    ].join(' '),
    userPrompt: `Allowed app context for this Wisdom Keeper reflection:\n${contextText}`,
    includedContextKinds,
  };
}

export function sanitizeWisdomKeeperReflection(value: string): string | null {
  const text = cleanText(value, MAX_OUTPUT_CHARS + 80).replace(/^[-*•\d.)\s]+/, '').trim();
  if (!text) return null;
  if (DISALLOWED_OUTPUT_PATTERNS.some((pattern) => pattern.test(text))) return null;
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
  const constrained = sentences.slice(0, MAX_OUTPUT_SENTENCES).join(' ').slice(0, MAX_OUTPUT_CHARS).trim();
  return constrained.length >= 20 ? constrained : null;
}

export function createWisdomKeeperAiCoachGenerator(): WisdomKeeperAiGenerator {
  return async (prompt) => {
    const availability = getFeatureAvailability('ai_coach', getServiceHealthManager().getSnapshot());
    if (availability.status !== 'available') {
      // Callers catch and fall back to the local whisper.
      throw new Error(availability.reason);
    }

    const supabase = getSupabaseClient();
    const result = await guardedCloudCall('edgeFunctions', async () => {
      const { data, error } = await supabase.functions.invoke<AiCoachChatResponse>('ai-coach-chat', {
        body: {
          messages: [{ role: 'user', content: prompt.userPrompt }],
          systemPrompt: prompt.systemPrompt,
          accessSummary: `Wisdom Keeper permitted context: ${prompt.includedContextKinds.length > 0 ? prompt.includedContextKinds.join(', ') : 'none'}.`,
          threadId: null,
        },
      });
      if (error) throw error;
      return data;
    });

    if (!result.ok) throw new Error(result.error.explanation);
    if (result.data?.error) throw new Error('Wisdom Keeper AI request failed.');
    return result.data?.assistant_message?.trim() ?? '';
  };
}

export async function resolveWisdomKeeperAiWhisper(options: {
  aiEnabled: boolean;
  access: AiCoachDataAccess;
  context?: WisdomKeeperAiContext;
  generate?: WisdomKeeperAiGenerator;
  seed?: string;
}): Promise<WisdomKeeperAiResult> {
  const fallback = buildWisdomWhisper(options.seed ?? 'wisdom-ai-fallback');
  if (!options.aiEnabled || !options.generate || !hasAnyPermittedContext(options.access)) {
    return { whisper: fallback, source: 'fallback', reason: 'ai_disabled' };
  }

  try {
    const prompt = buildWisdomKeeperPromptBundle(options.access, options.context ?? {});
    const output = sanitizeWisdomKeeperReflection(await options.generate(prompt));
    if (!output) return { whisper: fallback, source: 'fallback', reason: 'empty_or_unsafe_output' };
    return {
      whisper: { ...fallback, id: 'landmark-whisper:wisdom:ai-reflection', text: output },
      source: 'ai',
      reason: 'ok',
    };
  } catch {
    return { whisper: fallback, source: 'fallback', reason: 'ai_error' };
  }
}
