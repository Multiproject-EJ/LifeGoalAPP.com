export interface HabitAiSuggestionInput {
  prompt: string;
}

export type HabitScheduleChoice = 'every_day' | 'specific_days' | 'x_per_week';

export interface HabitAiSuggestion {
  title: string;
  emoji: string | null;
  type: 'boolean' | 'quantity' | 'duration';
  targetValue?: number | null;
  targetUnit?: string | null;
  scheduleChoice: HabitScheduleChoice;
  remindersEnabled: boolean;
  reminderTime: string | null;
}

export interface HabitAiSuggestionResult {
  suggestion: HabitAiSuggestion | null;
  error: string | null;
  source: 'openai' | 'fallback' | 'unavailable';
}

function hasOpenAIKey(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  return typeof apiKey === 'string' && apiKey.length > 0;
}

function buildFallbackSuggestion(prompt: string): HabitAiSuggestion {
  const lower = prompt.toLowerCase();

  if (lower.includes('water') || lower.includes('hydrate')) {
    return {
      title: 'Drink water',
      emoji: '💧',
      type: 'quantity',
      targetValue: 8,
      targetUnit: 'glasses',
      scheduleChoice: 'every_day',
      remindersEnabled: true,
      reminderTime: '09:00',
    };
  }

  if (lower.includes('walk') || lower.includes('run') || lower.includes('exercise') || lower.includes('workout')) {
    return {
      title: 'Move your body',
      emoji: '🏃',
      type: 'duration',
      targetValue: 30,
      targetUnit: 'minutes',
      scheduleChoice: 'every_day',
      remindersEnabled: true,
      reminderTime: '07:30',
    };
  }

  if (lower.includes('journal') || lower.includes('gratitude')) {
    return {
      title: 'Journal check-in',
      emoji: '📓',
      type: 'boolean',
      scheduleChoice: 'every_day',
      remindersEnabled: true,
      reminderTime: '20:30',
    };
  }

  if (lower.includes('sleep') || lower.includes('bed')) {
    return {
      title: 'Sleep on time',
      emoji: '🛌',
      type: 'boolean',
      scheduleChoice: 'every_day',
      remindersEnabled: true,
      reminderTime: '22:00',
    };
  }

  return {
    title: prompt.trim() || 'Daily focus habit',
    emoji: '✨',
    type: 'boolean',
    scheduleChoice: 'every_day',
    remindersEnabled: false,
    reminderTime: null,
  };
}

function buildPrompt(userPrompt: string): string {
  return `You are a habit design assistant. Based on the user's intent, return a concise JSON object with these fields only:
- title (string)
- emoji (string or null)
- type (one of: boolean, quantity, duration)
- targetValue (number or null)
- targetUnit (string or null)
- scheduleChoice (one of: every_day, specific_days, x_per_week)
- remindersEnabled (boolean)
- reminderTime (string in HH:MM or null)

User intent: ${userPrompt}

Return JSON only, no markdown.`;
}

async function callOpenAI(prompt: string, timeoutMs: number = 3000): Promise<HabitAiSuggestion | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('OpenAI habit suggestion returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(content) as HabitAiSuggestion;
      if (!parsed || typeof parsed.title !== 'string') {
        return null;
      }

      return parsed;
    } catch (err) {
      console.warn('Failed to parse OpenAI habit suggestion JSON:', err);
      return null;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('OpenAI habit suggestion timed out');
    } else {
      console.warn('OpenAI habit suggestion failed:', err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateHabitSuggestion(
  input: HabitAiSuggestionInput
): Promise<HabitAiSuggestionResult> {
  const trimmed = input.prompt.trim();
  if (!trimmed) {
    return {
      suggestion: null,
      error: 'Add a habit idea first so AI can help.',
      source: 'unavailable',
    };
  }

  if (!hasOpenAIKey()) {
    return {
      suggestion: buildFallbackSuggestion(trimmed),
      error: null,
      source: 'fallback',
    };
  }

  const aiSuggestion = await callOpenAI(buildPrompt(trimmed));
  if (!aiSuggestion) {
    return {
      suggestion: buildFallbackSuggestion(trimmed),
      error: null,
      source: 'fallback',
    };
  }

  return {
    suggestion: {
      ...aiSuggestion,
      title: aiSuggestion.title || trimmed,
    },
    error: null,
    source: 'openai',
  };
}
