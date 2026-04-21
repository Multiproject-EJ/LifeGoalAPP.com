"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTelemetryPreference = fetchTelemetryPreference;
exports.upsertTelemetryPreference = upsertTelemetryPreference;
exports.isTelemetryEnabled = isTelemetryEnabled;
exports.recordTelemetryEvent = recordTelemetryEvent;
exports.recordBalanceShiftEvent = recordBalanceShiftEvent;
exports.listTelemetryEvents = listTelemetryEvents;
exports.getGoalCoachTelemetrySummary = getGoalCoachTelemetrySummary;
exports.getGoalCoachTelemetryDailySeries = getGoalCoachTelemetryDailySeries;
exports.buildGoalCoachTelemetrySnapshot = buildGoalCoachTelemetrySnapshot;
exports.getTelemetryDifficultyAdjustment = getTelemetryDifficultyAdjustment;
const supabaseClient_1 = require("../lib/supabaseClient");
const demoData_1 = require("./demoData");
const preferenceCache = new Map();
const BALANCE_SHIFT_STORAGE_KEY = 'lifegoalapp-telemetry-balance-shift';
function getBalanceShiftKey(userId) {
    return `${BALANCE_SHIFT_STORAGE_KEY}-${userId}`;
}
function readBalanceShiftState(userId) {
    if (typeof window === 'undefined')
        return null;
    try {
        const raw = window.localStorage.getItem(getBalanceShiftKey(userId));
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch (error) {
        console.warn('Unable to read balance shift telemetry state.', error);
        return null;
    }
}
function writeBalanceShiftState(userId, state) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(getBalanceShiftKey(userId), JSON.stringify(state));
    }
    catch (error) {
        console.warn('Unable to persist balance shift telemetry state.', error);
    }
}
async function fetchTelemetryPreference(userId) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        const demoPreference = (0, demoData_1.getDemoTelemetryPreference)(userId);
        return { data: demoPreference, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('telemetry_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    return { data: data ?? null, error };
}
async function upsertTelemetryPreference(userId, telemetryEnabled) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        const data = (0, demoData_1.updateDemoTelemetryPreference)({
            user_id: userId,
            telemetry_enabled: telemetryEnabled,
        });
        preferenceCache.set(userId, data.telemetry_enabled);
        return { data, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('telemetry_preferences')
        .upsert({
        user_id: userId,
        telemetry_enabled: telemetryEnabled,
    }, { onConflict: 'user_id' })
        .select()
        .single();
    if (!error && data) {
        preferenceCache.set(userId, data.telemetry_enabled);
    }
    return { data: data ?? null, error };
}
async function isTelemetryEnabled(userId) {
    const cached = preferenceCache.get(userId);
    if (typeof cached === 'boolean') {
        return cached;
    }
    const { data } = await fetchTelemetryPreference(userId);
    const enabled = data?.telemetry_enabled ?? false;
    preferenceCache.set(userId, enabled);
    return enabled;
}
async function recordTelemetryEvent(options) {
    const telemetryEnabled = await isTelemetryEnabled(options.userId);
    if (!telemetryEnabled) {
        return { data: null, error: null };
    }
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        const data = (0, demoData_1.addDemoTelemetryEvent)({
            user_id: options.userId,
            event_type: options.eventType,
            metadata: options.metadata ?? {},
        });
        return { data, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('telemetry_events')
        .insert({
        user_id: options.userId,
        event_type: options.eventType,
        metadata: options.metadata ?? {},
    })
        .select()
        .single();
    return { data: data ?? null, error };
}
async function recordBalanceShiftEvent(options) {
    const lastState = readBalanceShiftState(options.userId);
    if (lastState?.status === options.harmonyStatus && lastState.referenceDate === options.referenceDate) {
        return;
    }
    await recordTelemetryEvent({
        userId: options.userId,
        eventType: 'balance_shift',
        metadata: {
            previousStatus: lastState?.status ?? null,
            harmonyStatus: options.harmonyStatus,
            referenceDate: options.referenceDate,
            ...(options.metadata ?? {}),
        },
    });
    writeBalanceShiftState(options.userId, {
        status: options.harmonyStatus,
        referenceDate: options.referenceDate,
    });
}
async function listTelemetryEvents(options) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        const events = (0, demoData_1.getDemoTelemetryEvents)(options.userId);
        return events
            .filter((event) => (options.eventTypes ? options.eventTypes.includes(event.event_type) : true))
            .filter((event) => (options.sinceISO ? event.occurred_at >= options.sinceISO : true))
            .slice(0, options.limit ?? events.length);
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    let query = supabase
        .from('telemetry_events')
        .select('*')
        .eq('user_id', options.userId)
        .order('occurred_at', { ascending: false });
    if (options.sinceISO) {
        query = query.gte('occurred_at', options.sinceISO);
    }
    if (options.eventTypes && options.eventTypes.length > 0) {
        query = query.in('event_type', options.eventTypes);
    }
    if (options.limit) {
        query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Failed to load telemetry events:', error);
        return [];
    }
    return (data ?? []);
}
async function getGoalCoachTelemetrySummary(options) {
    const events = await listTelemetryEvents({
        userId: options.userId,
        sinceISO: options.sinceISO,
        eventTypes: ['goal_coach_chat_sent', 'goal_coach_chat_draft_received', 'goal_coach_chat_goal_created'],
        limit: 500,
    });
    const summary = {
        totalSent: 0,
        totalDraftReceived: 0,
        totalGoalCreated: 0,
        conversionRate: 0,
        byContextProfile: {},
    };
    for (const event of events) {
        const metadata = event.metadata ?? {};
        const cohort = typeof metadata.cohort === 'string' ? metadata.cohort.trim() : 'unknown';
        if (options.cohort && options.cohort !== 'all' && cohort !== options.cohort) {
            continue;
        }
        const profileRaw = typeof metadata.contextProfile === 'string' ? metadata.contextProfile.trim() : '';
        const contextProfile = profileRaw || 'unknown';
        if (!summary.byContextProfile[contextProfile]) {
            summary.byContextProfile[contextProfile] = {
                sent: 0,
                draftReceived: 0,
                goalCreated: 0,
                conversionRate: 0,
            };
        }
        if (event.event_type === 'goal_coach_chat_sent') {
            summary.totalSent += 1;
            summary.byContextProfile[contextProfile].sent += 1;
        }
        else if (event.event_type === 'goal_coach_chat_draft_received') {
            summary.totalDraftReceived += 1;
            summary.byContextProfile[contextProfile].draftReceived += 1;
        }
        else if (event.event_type === 'goal_coach_chat_goal_created') {
            summary.totalGoalCreated += 1;
            summary.byContextProfile[contextProfile].goalCreated += 1;
        }
    }
    summary.conversionRate = summary.totalSent > 0 ? summary.totalGoalCreated / summary.totalSent : 0;
    Object.values(summary.byContextProfile).forEach((bucket) => {
        bucket.conversionRate = bucket.sent > 0 ? bucket.goalCreated / bucket.sent : 0;
    });
    return summary;
}
async function getGoalCoachTelemetryDailySeries(options) {
    const events = await listTelemetryEvents({
        userId: options.userId,
        sinceISO: options.sinceISO,
        eventTypes: ['goal_coach_chat_sent', 'goal_coach_chat_draft_received', 'goal_coach_chat_goal_created'],
        limit: 1000,
    });
    const byDay = new Map();
    for (const event of events) {
        const metadata = event.metadata ?? {};
        const cohort = typeof metadata.cohort === 'string' ? metadata.cohort.trim() : 'unknown';
        if (options.cohort && options.cohort !== 'all' && cohort !== options.cohort) {
            continue;
        }
        const day = event.occurred_at.slice(0, 10);
        if (!byDay.has(day)) {
            byDay.set(day, {
                day,
                sent: 0,
                draftReceived: 0,
                goalCreated: 0,
                conversionRate: 0,
            });
        }
        const point = byDay.get(day);
        if (event.event_type === 'goal_coach_chat_sent') {
            point.sent += 1;
        }
        else if (event.event_type === 'goal_coach_chat_draft_received') {
            point.draftReceived += 1;
        }
        else if (event.event_type === 'goal_coach_chat_goal_created') {
            point.goalCreated += 1;
        }
    }
    return Array.from(byDay.values())
        .sort((a, b) => a.day.localeCompare(b.day))
        .map((point) => ({
        ...point,
        conversionRate: point.sent > 0 ? point.goalCreated / point.sent : 0,
    }));
}
function buildGoalCoachTelemetrySnapshot(options) {
    return {
        exportedAt: new Date().toISOString(),
        lookbackDays: options.lookbackDays,
        cohort: options.cohort,
        summary: options.summary,
        dailySeries: options.dailySeries,
    };
}
async function getTelemetryDifficultyAdjustment(userId) {
    const defaultMinProgressStreak = 14;
    try {
        const telemetryEnabled = await isTelemetryEnabled(userId);
        if (!telemetryEnabled) {
            return { minProgressStreak: defaultMinProgressStreak };
        }
        const since = new Date();
        since.setDate(since.getDate() - 14);
        const events = await listTelemetryEvents({
            userId,
            sinceISO: since.toISOString(),
            eventTypes: ['intervention_accepted', 'balance_shift'],
        });
        const interventionCount = events.filter((event) => event.event_type === 'intervention_accepted').length;
        const balanceShift = events.find((event) => {
            if (event.event_type !== 'balance_shift')
                return false;
            const metadata = event.metadata;
            return metadata?.harmonyStatus === 'rebalancing';
        });
        if (interventionCount >= 2 || balanceShift) {
            return { minProgressStreak: 21 };
        }
    }
    catch (error) {
        console.warn('Unable to apply telemetry difficulty adjustment.', error);
    }
    return { minProgressStreak: defaultMinProgressStreak };
}
