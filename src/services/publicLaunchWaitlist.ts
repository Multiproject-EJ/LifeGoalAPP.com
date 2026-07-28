import { getSupabaseClient, hasSupabaseCredentials } from '../lib/supabaseClient';

export type PublicLaunchWaitlistResult = {
  ok: boolean;
  alreadyJoined?: boolean;
  error?: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function joinPublicLaunchWaitlist(
  email: string,
): Promise<PublicLaunchWaitlistResult> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { ok: false, error: 'Enter your email to join the waitlist.' };
  }

  if (!hasSupabaseCredentials()) {
    return {
      ok: false,
      error: 'The waitlist is temporarily unavailable. Please try again shortly.',
    };
  }

  try {
    // The generated database types update after this migration is applied.
    // Keep the public write isolated here until the next schema type refresh.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const { error } = await supabase
      .from('public_launch_waitlist')
      .insert({
        email: normalizedEmail,
        source: 'world_home',
        landing_variant: 'split_light_dark',
      });

    if (!error) {
      return { ok: true };
    }

    // Rejoining should feel idempotent and must not reveal stored waitlist data.
    if (error.code === '23505') {
      return { ok: true, alreadyJoined: true };
    }

    throw error;
  } catch (error) {
    console.error('Public waitlist signup failed:', error);
    return {
      ok: false,
      error: 'We could not save your spot. Please try again.',
    };
  }
}
