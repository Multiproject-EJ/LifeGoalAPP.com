import { useCallback, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

export type GoalCoachChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type GoalCoachDraft = {
  title: string;
  description: string;
  life_wheel_category: string | null;
  target_date: string | null;
  status_tag: string;
  milestones: string[];
  tasks: string[];
};

export type GoalCoachChatResponse = {
  assistantMessage: string;
  draftGoal: GoalCoachDraft | null;
};

export type GoalCoachContextGoal = {
  title: string;
  statusTag?: string | null;
  lifeWheelCategory?: string | null;
  targetDate?: string | null;
};

export type GoalCoachContextEvolutionEvent = {
  snapshotType: string;
  summary: string;
  createdAt: string;
};

type SendCoachMessageParams = {
  messages: GoalCoachChatMessage[];
  lifeWheelCategory?: string;
  personalitySummary?: string;
  existingGoals?: string[];
  existingGoalsStructured?: GoalCoachContextGoal[];
  includeGoalEvolution?: boolean;
  goalEvolutionSummary?: string;
  goalEvolutionEvents?: GoalCoachContextEvolutionEvent[];
  finalize?: boolean;
};

export default function useGoalCoachChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (params: SendCoachMessageParams): Promise<GoalCoachChatResponse> => {
    setLoading(true);
    setError(null);

    try {
      const edgeFunctionUrl = import.meta.env.VITE_AI_GOAL_COACH_CHAT_URL;
      if (!edgeFunctionUrl) {
        throw new Error('AI goal coach chat URL is not configured. Please set VITE_AI_GOAL_COACH_CHAT_URL.');
      }

      const supabase = getSupabaseClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Failed to get session: ${sessionError.message}`);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: params.messages,
          finalize: params.finalize,
          context: {
            life_wheel_category: params.lifeWheelCategory,
            personality_summary: params.personalitySummary,
            existing_goals: params.existingGoals,
            existing_goals_structured: params.existingGoalsStructured,
            ai_access: {
              goalEvolution: params.includeGoalEvolution === true,
            },
            goal_evolution_summary: params.goalEvolutionSummary,
            goal_evolution_events: params.goalEvolutionEvents,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to send coach chat message.');
      }

      const assistantMessage =
        typeof data.assistant_message === 'string' && data.assistant_message.trim().length > 0
          ? data.assistant_message.trim()
          : 'I can help with this goal. Tell me the result you want and by when.';

      const rawDraft = data.draft_goal;
      const draftGoal: GoalCoachDraft | null =
        rawDraft && typeof rawDraft === 'object' && typeof rawDraft.title === 'string' && rawDraft.title.trim().length > 0
          ? {
              title: rawDraft.title.trim(),
              description: typeof rawDraft.description === 'string' ? rawDraft.description.trim() : '',
              life_wheel_category:
                typeof rawDraft.life_wheel_category === 'string' && rawDraft.life_wheel_category.trim().length > 0
                  ? rawDraft.life_wheel_category.trim()
                  : null,
              target_date:
                typeof rawDraft.target_date === 'string' && rawDraft.target_date.trim().length > 0
                  ? rawDraft.target_date.trim()
                  : null,
              status_tag:
                typeof rawDraft.status_tag === 'string' && rawDraft.status_tag.trim().length > 0
                  ? rawDraft.status_tag.trim()
                  : 'active',
              milestones: Array.isArray(rawDraft.milestones)
                ? rawDraft.milestones.filter((x: unknown) => typeof x === 'string' && x.trim().length > 0).map((x: string) => x.trim())
                : [],
              tasks: Array.isArray(rawDraft.tasks)
                ? rawDraft.tasks.filter((x: unknown) => typeof x === 'string' && x.trim().length > 0).map((x: string) => x.trim())
                : [],
            }
          : null;

      return { assistantMessage, draftGoal };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error during chat coaching.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    sendMessage,
  };
}
