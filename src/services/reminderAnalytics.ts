import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

export type ReminderAnalyticsSummary = {
  rangeDays: number;
  sends: number;
  actions: {
    done: number;
    snooze: number;
    dismiss: number;
  };
  actionRatePct: number;
  doneRatePct: number;
  habitsWithPrefs: number;
  habitsEnabledPct: number;
};

export type ReminderAnalyticsDaily = {
  day: string;
  sends: number;
  done: number;
  snooze: number;
  dismiss: number;
};

// Demo mode storage keys
const DEMO_ANALYTICS_SUMMARY_KEY = 'demo_reminder_analytics_summary';
const DEMO_ANALYTICS_DAILY_KEY = 'demo_reminder_analytics_daily';

function getDemoSummary(rangeDays: number): ReminderAnalyticsSummary {
  return {
    rangeDays,
    sends: 0,
    actions: { done: 0, snooze: 0, dismiss: 0 },
    actionRatePct: 0,
    doneRatePct: 0,
    habitsWithPrefs: 0,
    habitsEnabledPct: 0,
  };
}

function getDemoDaily(rangeDays: number): ReminderAnalyticsDaily[] {
  const result: ReminderAnalyticsDaily[] = [];
  const endDate = new Date();
  for (let i = rangeDays; i >= 0; i--) {
    const date = new Date();
    date.setDate(endDate.getDate() - i);
    result.push({
      day: date.toISOString().split('T')[0],
      sends: 0,
      done: 0,
      snooze: 0,
      dismiss: 0,
    });
  }
  return result;
}

/**
 * Fetch aggregated reminder analytics summary
 */
export async function fetchReminderAnalyticsSummary(
  rangeDays: 7 | 30 = 30
): Promise<ServiceResponse<ReminderAnalyticsSummary>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoSummary(rangeDays), error: null };
  }

  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { data: null, error: sessionError || new Error('No session') };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders/analytics/summary?range=${rangeDays}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: new Error(errorData.error || 'Failed to fetch analytics summary') };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch daily reminder analytics
 */
export async function fetchReminderAnalyticsDaily(
  rangeDays: 7 | 30 = 30
): Promise<ServiceResponse<ReminderAnalyticsDaily[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoDaily(rangeDays), error: null };
  }

  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { data: null, error: sessionError || new Error('No session') };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders/analytics/daily?range=${rangeDays}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: new Error(errorData.error || 'Failed to fetch daily analytics') };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format date for chart display
 */
export function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}
