import { getSupabaseClient, hasSupabaseCredentials } from '../lib/supabaseClient';

export type PublicLaunchWaitlistResult = {
  ok: boolean;
  alreadyJoined?: boolean;
  error?: string;
};

export type PublicLaunchWaitlistSource = 'world_home' | 'island_3_gate';
export type PublicLaunchWaitlistChannel = 'email' | 'push';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function joinPublicLaunchWaitlist(
  email: string,
  options: {
    source?: PublicLaunchWaitlistSource;
    channel?: PublicLaunchWaitlistChannel;
  } = {},
): Promise<PublicLaunchWaitlistResult> {
  const normalizedEmail = normalizeEmail(email);
  const source = options.source ?? 'world_home';
  const channel = options.channel ?? 'email';

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
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('public_launch_waitlist')
      .insert({
        email: normalizedEmail,
        source,
        channel,
        landing_variant: 'split_light_dark',
      });

    if (!error) {
      return { ok: true };
    }

    // Rejoining should feel idempotent and must not reveal stored waitlist data.
    if (error.code === '23505') {
      return { ok: true, alreadyJoined: true };
    }

    if (error.code === 'WAITLIST_RATE_LIMIT') {
      return {
        ok: false,
        error: 'Too many attempts from this connection. Please try again in ten minutes.',
      };
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
