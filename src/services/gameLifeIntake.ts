import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';

type GameLifeIntakeInsert = Database['public']['Tables']['game_life_intake']['Insert'];

export type GameLifeIntakeSource = 'island_run';
export type GameLifeIntakeState = 'accepted' | 'completed' | 'skipped';
export type GameLifeIntakeStage =
  | 'baseline'
  | 'habit_fit'
  | 'motivation'
  | 'environment'
  | 'reflection';

export type RecordGameLifeIntakeInput = {
  userId: string;
  promptContext: string;
  source?: GameLifeIntakeSource;
  islandNumber?: number | null;
  intakeStage?: GameLifeIntakeStage | null;
  lifeWheelArea?: string | null;
  payload?: Record<string, unknown>;
  state?: GameLifeIntakeState;
  linkedHabitId?: string | null;
  linkedGoalId?: string | null;
  linkedCheckinId?: string | null;
};

/**
 * Record a single life-intake signal collected from an in-game surface.
 *
 * This is intentionally best-effort and never throws: intake capture must
 * never block gameplay or stop completion. If Supabase is unavailable, or the
 * `game_life_intake` table has not been migrated yet, the failure is swallowed
 * (and surfaced only in dev logs).
 */
export async function recordGameLifeIntake(input: RecordGameLifeIntakeInput): Promise<{ ok: boolean }> {
  if (!canUseSupabaseData()) {
    return { ok: false };
  }

  const row: GameLifeIntakeInsert = {
    user_id: input.userId,
    source: input.source ?? 'island_run',
    island_number: input.islandNumber ?? null,
    prompt_context: input.promptContext,
    intake_stage: input.intakeStage ?? null,
    life_wheel_area: input.lifeWheelArea ?? null,
    payload: (input.payload ?? {}) as Json,
    state: input.state ?? 'completed',
    linked_habit_id: input.linkedHabitId ?? null,
    linked_goal_id: input.linkedGoalId ?? null,
    linked_checkin_id: input.linkedCheckinId ?? null,
  };

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('game_life_intake').insert(row);
    if (error) {
      if (import.meta.env.DEV) {
        console.debug('[game-life-intake] insert skipped', error.message);
      }
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[game-life-intake] insert threw', error);
    }
    return { ok: false };
  }
}
