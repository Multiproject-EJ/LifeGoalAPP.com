"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCheckinsForUser = fetchCheckinsForUser;
exports.insertCheckin = insertCheckin;
exports.updateCheckin = updateCheckin;
const supabaseClient_1 = require("../lib/supabaseClient");
function authRequiredError() {
    return {
        name: 'PostgrestError',
        code: 'AUTH_REQUIRED',
        details: 'No active authenticated Supabase session.',
        hint: 'Sign in to manage check-ins.',
        message: 'Authentication required.',
    };
}
async function fetchCheckinsForUser(userId, limit = 12) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: [], error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit)
        .returns();
}
async function insertCheckin(payload) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: authRequiredError() };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('checkins')
        .insert(payload)
        .select()
        .returns()
        .single();
}
async function updateCheckin(id, payload) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: authRequiredError() };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('checkins')
        .update(payload)
        .eq('id', id)
        .select()
        .returns()
        .single();
}
