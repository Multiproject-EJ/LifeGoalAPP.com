import type { Session, User } from '@supabase/supabase-js';
import { DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_USER_NAME } from './demoData';

export function createDemoSession(): Session {
  const isoNow = new Date().toISOString();
  const unixNow = Math.floor(Date.now() / 1000);

  const demoUser: User = {
    id: DEMO_USER_ID,
    app_metadata: { provider: 'demo', providers: ['demo'] },
    user_metadata: { full_name: DEMO_USER_NAME, onboarding_complete: true },
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
    raw_user_meta_data: { full_name: DEMO_USER_NAME, onboarding_complete: true },
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
