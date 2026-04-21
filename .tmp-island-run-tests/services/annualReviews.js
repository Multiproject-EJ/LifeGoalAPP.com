"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAnnualReviews = fetchAnnualReviews;
exports.fetchAnnualReviewByYear = fetchAnnualReviewByYear;
exports.createAnnualReview = createAnnualReview;
exports.updateAnnualReview = updateAnnualReview;
exports.deleteAnnualReview = deleteAnnualReview;
exports.markAnnualReviewComplete = markAnnualReviewComplete;
exports.fetchAnnualGoalsByReview = fetchAnnualGoalsByReview;
exports.createAnnualGoal = createAnnualGoal;
exports.updateAnnualGoal = updateAnnualGoal;
exports.deleteAnnualGoal = deleteAnnualGoal;
exports.getYearInReviewStats = getYearInReviewStats;
const supabaseClient_1 = require("../lib/supabaseClient");
// ============================================================
// ANNUAL REVIEWS
// ============================================================
/**
 * Fetch all annual reviews for the current user
 */
async function fetchAnnualReviews() {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: [], error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_reviews')
        .select('*')
        .order('year', { ascending: false })
        .returns();
}
/**
 * Fetch a specific annual review by year
 */
async function fetchAnnualReviewByYear(year) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_reviews')
        .select('*')
        .eq('year', year)
        .maybeSingle();
}
/**
 * Create a new annual review
 */
async function createAnnualReview(payload) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_reviews')
        .insert(payload)
        .select()
        .single();
}
/**
 * Update an existing annual review
 */
async function updateAnnualReview(id, payload) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_reviews')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
}
/**
 * Delete an annual review
 */
async function deleteAnnualReview(id) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_reviews')
        .delete()
        .eq('id', id)
        .select()
        .single();
}
/**
 * Mark an annual review as completed
 */
async function markAnnualReviewComplete(id) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_reviews')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
}
// ============================================================
// ANNUAL GOALS
// ============================================================
/**
 * Fetch all annual goals for a specific review
 */
async function fetchAnnualGoalsByReview(reviewId) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: [], error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_goals')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true })
        .returns();
}
/**
 * Create a new annual goal
 */
async function createAnnualGoal(payload) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_goals')
        .insert(payload)
        .select()
        .single();
}
/**
 * Update an existing annual goal
 */
async function updateAnnualGoal(id, payload) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_goals')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
}
/**
 * Delete an annual goal
 */
async function deleteAnnualGoal(id) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    return supabase
        .from('annual_goals')
        .delete()
        .eq('id', id)
        .select()
        .single();
}
// ============================================================
// STATS RPC FUNCTION
// ============================================================
/**
 * Get aggregated stats for a given year
 * Returns: total habits completed, longest streak, most active category
 */
async function getYearInReviewStats(year) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return {
            data: {
                total_habits_completed: 0,
                longest_streak: 0,
                most_active_category: null,
            },
            error: null,
        };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const { data, error } = await supabase.rpc('get_year_in_review_stats', {
        year_input: year,
    });
    if (error) {
        return { data: null, error };
    }
    // RPC returns an array, we want the first (and only) result
    const stats = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return { data: stats, error: null };
}
