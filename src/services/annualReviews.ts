import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

// Type aliases for annual reviews
export type AnnualReview = Database['public']['Tables']['annual_reviews']['Row'];
type AnnualReviewInsert = Database['public']['Tables']['annual_reviews']['Insert'];
type AnnualReviewUpdate = Database['public']['Tables']['annual_reviews']['Update'];

// Type aliases for annual goals
export type AnnualGoal = Database['public']['Tables']['annual_goals']['Row'];
type AnnualGoalInsert = Database['public']['Tables']['annual_goals']['Insert'];
type AnnualGoalUpdate = Database['public']['Tables']['annual_goals']['Update'];

// RPC function return type
/**
 * Statistics for a user's year in review.
 * Used by the Year in Review/Manifest feature to show aggregated data.
 */
export type YearInReviewStats = {
  /** Total number of habit completions (done=true) during the specified year */
  total_habits_completed: number;
  /**
   * The overall best streak across all of the user's habits.
   * Note: This is the all-time best streak, not year-specific, as streaks
   * can span across years. Provides context on user consistency.
   */
  longest_streak: number;
  /** The Life Wheel category (domain_key) with the most habit completions during the year, or null if no habits have categories */
  most_active_category: string | null;
};

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

// ============================================================
// ANNUAL REVIEWS
// ============================================================

/**
 * Fetch all annual reviews for the current user
 */
export async function fetchAnnualReviews(): Promise<ServiceResponse<AnnualReview[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_reviews')
    .select('*')
    .order('year', { ascending: false })
    .returns<AnnualReview[]>();
}

/**
 * Fetch a specific annual review by year
 */
export async function fetchAnnualReviewByYear(
  year: number,
): Promise<ServiceResponse<AnnualReview>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_reviews')
    .select('*')
    .eq('year', year)
    .maybeSingle<AnnualReview>();
}

/**
 * Create a new annual review
 */
export async function createAnnualReview(
  payload: AnnualReviewInsert,
): Promise<ServiceResponse<AnnualReview>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_reviews')
    .insert(payload)
    .select()
    .single<AnnualReview>();
}

/**
 * Update an existing annual review
 */
export async function updateAnnualReview(
  id: string,
  payload: AnnualReviewUpdate,
): Promise<ServiceResponse<AnnualReview>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_reviews')
    .update(payload)
    .eq('id', id)
    .select()
    .single<AnnualReview>();
}

/**
 * Delete an annual review
 */
export async function deleteAnnualReview(
  id: string,
): Promise<ServiceResponse<AnnualReview>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_reviews')
    .delete()
    .eq('id', id)
    .select()
    .single<AnnualReview>();
}

/**
 * Mark an annual review as completed
 */
export async function markAnnualReviewComplete(
  id: string,
): Promise<ServiceResponse<AnnualReview>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_reviews')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single<AnnualReview>();
}

// ============================================================
// ANNUAL GOALS
// ============================================================

/**
 * Fetch all annual goals for a specific review
 */
export async function fetchAnnualGoalsByReview(
  reviewId: string,
): Promise<ServiceResponse<AnnualGoal[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_goals')
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true })
    .returns<AnnualGoal[]>();
}

/**
 * Create a new annual goal
 */
export async function createAnnualGoal(
  payload: AnnualGoalInsert,
): Promise<ServiceResponse<AnnualGoal>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_goals')
    .insert(payload)
    .select()
    .single<AnnualGoal>();
}

/**
 * Update an existing annual goal
 */
export async function updateAnnualGoal(
  id: string,
  payload: AnnualGoalUpdate,
): Promise<ServiceResponse<AnnualGoal>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single<AnnualGoal>();
}

/**
 * Delete an annual goal
 */
export async function deleteAnnualGoal(
  id: string,
): Promise<ServiceResponse<AnnualGoal>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('annual_goals')
    .delete()
    .eq('id', id)
    .select()
    .single<AnnualGoal>();
}

// ============================================================
// STATS RPC FUNCTION
// ============================================================

/**
 * Get aggregated stats for a given year
 * Returns: total habits completed, longest streak, most active category
 */
export async function getYearInReviewStats(
  year: number,
): Promise<ServiceResponse<YearInReviewStats>> {
  if (!canUseSupabaseData()) {
    return {
      data: {
        total_habits_completed: 0,
        longest_streak: 0,
        most_active_category: null,
      },
      error: null,
    };
  }

  const supabase = getSupabaseClient();
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
