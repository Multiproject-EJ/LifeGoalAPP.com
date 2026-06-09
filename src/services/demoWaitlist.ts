import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

export type WaitlistChannel = 'email' | 'push';

export async function recordDemoWaitlistSignup({
  userId,
  email,
  channel,
}: {
  userId: string;
  email: string;
  channel: WaitlistChannel;
}): Promise<{ ok: boolean; error?: string }> {
  if (!canUseSupabaseData()) {
    return { ok: false, error: 'Supabase not available.' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const { error } = await supabase
      .from('demo_waitlist')
      .upsert(
        { user_id: userId, email, channel, source: 'island_3_gate', updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save waitlist signup.';
    return { ok: false, error: msg };
  }
}
