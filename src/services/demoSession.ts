import type { Session, User } from '@supabase/supabase-js';
import { DEMO_USER_EMAIL, DEMO_USER_ID, getDemoProfile } from './demoData';

export function createDemoSession(): Session {
  const isoNow = new Date().toISOString();
  const unixNow = Math.floor(Date.now() / 1000);
  const profile = getDemoProfile();

  const demoUser: User = {
    id: DEMO_USER_ID,
    app_metadata: { provider: 'demo', providers: ['demo'] },
    user_metadata: { full_name: profile.displayName, onboarding_complete: profile.onboardingComplete },
    aud: 'authenticated',
    confirmation_sent_at: isoNow,
    confirmed_at: isoNow,
    created_at: isoNow,
    email: DEMO_USER_EMAIL,
    email_confirmed_at: isoNow,
    factors: [],
    identities: [],
    invited_at: isoNow,
    last_sign_in_at: isoNow,
    phone: '',
    phone_confirmed_at: null,
    recovery_sent_at: isoNow,
    role: 'authenticated',
    updated_at: isoNow,
    raw_app_meta_data: { provider: 'demo', providers: ['demo'] },
    raw_user_meta_data: { full_name: profile.displayName, onboarding_complete: profile.onboardingComplete },
  } as unknown as User;

  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    token_type: 'bearer',
    user: demoUser,
    expires_in: 3600,
    expires_at: unixNow + 3600,
    provider_refresh_token: null,
    provider_token: null,
  } as Session;
}

export function isDemoSession(session: Session | null | undefined): boolean {
  if (!session) {
    return false;
  }
  return session.user?.id === DEMO_USER_ID;
}
