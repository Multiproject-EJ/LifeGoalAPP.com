import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getDemoProfile, updateDemoProfile } from './demoData';
import { isDemoSession } from './demoSession';
import {
  DEFAULT_AI_COACH_ACCESS,
  normalizeAiCoachAccess,
  type AiCoachDataAccess,
} from '../types/aiCoach';

const AI_COACH_ACCESS_KEY = 'ai_coach_access';

export function getAiCoachAccess(session: Session | null): AiCoachDataAccess {
  if (!session) {
    return DEFAULT_AI_COACH_ACCESS;
  }

  if (isDemoSession(session)) {
    const profile = getDemoProfile();
    return normalizeAiCoachAccess(profile.aiCoachAccess);
  }

  const metadataAccess = session.user?.user_metadata?.[AI_COACH_ACCESS_KEY] as
    | Partial<AiCoachDataAccess>
    | undefined;

  return normalizeAiCoachAccess(metadataAccess);
}

export async function updateAiCoachAccess(
  session: Session,
  access: AiCoachDataAccess,
): Promise<{ data: AiCoachDataAccess | null; error: Error | null }> {
  if (isDemoSession(session)) {
    updateDemoProfile({ aiCoachAccess: access });
    return { data: access, error: null };
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        [AI_COACH_ACCESS_KEY]: access,
      },
    });

    if (error) {
      throw error;
    }

    return { data: access, error: null };
  } catch (error) {
    console.error('Failed to update AI coach access settings:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating AI coach access settings'),
    };
  }
}
