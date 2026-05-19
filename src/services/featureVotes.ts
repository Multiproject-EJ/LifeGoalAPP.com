import { getSupabaseClient } from '../lib/supabaseClient';

export type FeatureVoteState = 'would_help_my_quest' | 'looks_fun' | 'not_for_me';

export type FeatureVoteRow = {
  id: string;
  user_id: string;
  feature_id: string;
  vote_state: FeatureVoteState;
  suggestion_text: string | null;
  source_surface: string | null;
  source_route: string | null;
  feature_category: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UpsertFeatureVoteInput = {
  featureId: string;
  voteState: FeatureVoteState;
  suggestionText?: string;
  sourceSurface?: string;
  sourceRoute?: string;
  featureCategory?: string;
  metadata?: Record<string, unknown>;
};

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export async function getMyFeatureVote(
  featureId: string,
): Promise<{ data: FeatureVoteRow | null; error: Error | null }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: new Error('Sign in to save your roadmap feedback.') };
    }

    const { data, error } = await getUntypedSupabase()
      .from('feature_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_id', featureId)
      .maybeSingle();

    if (error) throw error;
    return { data: (data as FeatureVoteRow | null) ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load roadmap feedback.'),
    };
  }
}

export async function upsertFeatureVote(
  input: UpsertFeatureVoteInput,
): Promise<{ data: FeatureVoteRow | null; error: Error | null }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: new Error('Sign in to save your roadmap feedback.') };
    }

    const { data, error } = await getUntypedSupabase()
      .from('feature_votes')
      .upsert(
        {
          user_id: userId,
          feature_id: input.featureId,
          vote_state: input.voteState,
          suggestion_text: input.suggestionText?.trim() || null,
          source_surface: input.sourceSurface ?? null,
          source_route: input.sourceRoute ?? null,
          feature_category: input.featureCategory ?? null,
          metadata: input.metadata ?? {},
        },
        { onConflict: 'user_id,feature_id' },
      )
      .select('*')
      .single();

    if (error) throw error;
    return { data: data as FeatureVoteRow, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to save roadmap feedback.'),
    };
  }
}
