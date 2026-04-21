"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDemoSession = createDemoSession;
exports.isDemoSession = isDemoSession;
const demoData_1 = require("./demoData");
function createDemoSession() {
    const isoNow = new Date().toISOString();
    const unixNow = Math.floor(Date.now() / 1000);
    const profile = (0, demoData_1.getDemoProfile)();
    const demoUser = {
        id: demoData_1.DEMO_USER_ID,
        app_metadata: { provider: 'demo', providers: ['demo'] },
        user_metadata: {
            full_name: profile.displayName,
            onboarding_complete: profile.onboardingComplete,
            island_run_first_run_claimed: profile.islandRunFirstRunClaimed,
            ai_coach_access: profile.aiCoachAccess,
            island_run_daily_hearts_daykey: profile.dailyHeartsClaimedDayKey,
        },
        aud: 'authenticated',
        confirmation_sent_at: isoNow,
        confirmed_at: isoNow,
        created_at: isoNow,
        email: demoData_1.DEMO_USER_EMAIL,
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
        raw_user_meta_data: {
            full_name: profile.displayName,
            onboarding_complete: profile.onboardingComplete,
            island_run_first_run_claimed: profile.islandRunFirstRunClaimed,
            ai_coach_access: profile.aiCoachAccess,
            island_run_daily_hearts_daykey: profile.dailyHeartsClaimedDayKey,
        },
    };
    return {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        token_type: 'bearer',
        user: demoUser,
        expires_in: 3600,
        expires_at: unixNow + 3600,
        provider_refresh_token: null,
        provider_token: null,
    };
}
function isDemoSession(session) {
    if (!session) {
        return false;
    }
    return session.user?.id === demoData_1.DEMO_USER_ID;
}
