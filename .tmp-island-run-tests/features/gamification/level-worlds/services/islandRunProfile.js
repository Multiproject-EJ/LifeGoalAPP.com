"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistIslandRunProfileMetadata = persistIslandRunProfileMetadata;
const demoSession_1 = require("../../../../services/demoSession");
const demoData_1 = require("../../../../services/demoData");
async function persistIslandRunProfileMetadata(options) {
    const { session, client, metadataPatch } = options;
    if ((0, demoSession_1.isDemoSession)(session)) {
        (0, demoData_1.updateDemoProfile)({
            ...(typeof metadataPatch.onboarding_complete === 'boolean'
                ? { onboardingComplete: metadataPatch.onboarding_complete }
                : {}),
            ...(typeof metadataPatch.island_run_first_run_claimed === 'boolean'
                ? { islandRunFirstRunClaimed: metadataPatch.island_run_first_run_claimed }
                : {}),
            ...(typeof metadataPatch.island_run_daily_hearts_daykey === 'string' || metadataPatch.island_run_daily_hearts_daykey === null
                ? { dailyHeartsClaimedDayKey: metadataPatch.island_run_daily_hearts_daykey }
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
