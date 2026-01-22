import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { loadDirtyPersonalityTests } from '../data/personalityTestRepo';
import { putPersonalityTest, type PersonalityTestValue } from '../data/localDb';

export type PersonalityTestRow = Database['public']['Tables']['personality_tests']['Row'];
export type PersonalityTestInsert = Database['public']['Tables']['personality_tests']['Insert'];
export type PersonalityProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type PersonalityProfileRow = Database['public']['Tables']['profiles']['Row'];

export type PersonalityProfileResponse = {
  data: PersonalityProfileRow | null;
  error: PostgrestError | null;
};

export async function upsertPersonalityProfile(
  payload: PersonalityProfileInsert,
): Promise<PersonalityProfileResponse> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .maybeSingle<PersonalityProfileRow>();

  return { data, error };
}

export async function syncPersonalityTestsWithSupabase(userId: string): Promise<void> {
  if (!canUseSupabaseData()) {
    return;
  }

  const supabase = getSupabaseClient();
  const dirtyTests = await loadDirtyPersonalityTests();
  let latestSynced: PersonalityTestValue | null = null;

  for (const test of dirtyTests) {
    const { error } = await supabase.from('personality_tests').insert({
      user_id: test.user_id,
      taken_at: test.taken_at,
      traits: test.traits,
      axes: test.axes,
      answers: test.answers ?? null,
      version: test.version,
    });

    if (error) {
      continue;
    }

    await putPersonalityTest({
      ...test,
      _dirty: false,
    });

    if (!latestSynced || test.taken_at > latestSynced.taken_at) {
      latestSynced = test;
    }
  }

  if (latestSynced) {
    await upsertPersonalityProfile({
      user_id: userId,
      personality_traits: latestSynced.traits,
      personality_axes: latestSynced.axes,
      personality_last_tested_at: latestSynced.taken_at,
    });
  }
}
