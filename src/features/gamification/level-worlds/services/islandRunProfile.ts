import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isDemoSession } from '../../../../services/demoSession';
import { updateDemoProfile } from '../../../../services/demoData';

export async function persistIslandRunProfileMetadata(options: {
  session: Session;
  client: SupabaseClient | null;
  metadataPatch: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, metadataPatch } = options;

  if (isDemoSession(session)) {
    updateDemoProfile({
      ...(typeof metadataPatch.onboarding_complete === 'boolean'
        ? { onboardingComplete: metadataPatch.onboarding_complete }
        : {}),
      ...(typeof metadataPatch.island_run_first_run_claimed === 'boolean'
        ? { islandRunFirstRunClaimed: metadataPatch.island_run_first_run_claimed }
        : {}),
      ...(typeof metadataPatch.island_run_daily_hearts_daykey === 'string' || metadataPatch.island_run_daily_hearts_daykey === null
        ? { dailyHeartsClaimedDayKey: metadataPatch.island_run_daily_hearts_daykey as string | null }
        : {}),
    });

    return { ok: true };
  }

  if (!client) {
    return { ok: false, errorMessage: 'Supabase client unavailable.' };
  }

  const { error } = await client.auth.updateUser({
    data: {
      ...session.user.user_metadata,
      ...metadataPatch,
    },
  });

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  return { ok: true };
}
