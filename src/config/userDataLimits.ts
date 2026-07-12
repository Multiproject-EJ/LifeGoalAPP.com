/**
 * Per-user data caps — client-side mirror.
 *
 * The authoritative limits live in the `public.user_data_limits` table and
 * are enforced server-side by a database trigger (migration 0278), so
 * nothing a client does — including a script or AI agent looping against
 * the API — can grow a table past its cap. This mirror exists so UI can
 * explain limits up front ("37 of 50 images used") and validate before a
 * round-trip; it must be kept in sync with the migration seed, but drifting
 * is safe because the server always has the final word.
 *
 * When a write is rejected, the resilience layer surfaces it as the
 * `user_limit_reached` AppError category (see service-health).
 * Full rationale and sizing math: docs/DATA_LIMITS.md.
 */

export interface UserDataLimit {
  /** Maximum rows this account may hold in the table (null = uncapped). */
  maxRows: number | null;
  /** Maximum size of a single row in bytes (null = uncapped). */
  maxRowBytes: number | null;
}

export const USER_DATA_LIMITS: Readonly<Record<string, UserDataLimit>> = {
  // Core content
  journal_entries: { maxRows: 10_000, maxRowBytes: 10_240 },
  habits: { maxRows: 200, maxRowBytes: 10_240 },
  habit_logs: { maxRows: 50_000, maxRowBytes: 2_048 },
  habit_completions: { maxRows: 50_000, maxRowBytes: 2_048 },
  habit_analysis_sessions: { maxRows: 1_000, maxRowBytes: 51_200 },
  vb_boards: { maxRows: 20, maxRowBytes: 10_240 },
  vb_cards: { maxRows: 500, maxRowBytes: 10_240 },
  vision_board_image_tags: { maxRows: 2_000, maxRowBytes: 2_048 },
  actions: { maxRows: 2_000, maxRowBytes: 10_240 },
  projects: { maxRows: 200, maxRowBytes: 10_240 },
  project_tasks: { maxRows: 5_000, maxRowBytes: 10_240 },
  today_todos: { maxRows: 1_000, maxRowBytes: 10_240 },
  routines: { maxRows: 100, maxRowBytes: 10_240 },
  routine_logs: { maxRows: 20_000, maxRowBytes: 2_048 },
  annual_reviews: { maxRows: 100, maxRowBytes: 102_400 },
  goal_snapshots: { maxRows: 2_000, maxRowBytes: 25_600 },
  compass_books: { maxRows: 100, maxRowBytes: 102_400 },
  environment_audits: { maxRows: 1_000, maxRowBytes: 25_600 },
  // Health / activity tracking
  meditation_sessions: { maxRows: 20_000, maxRowBytes: 2_048 },
  workout_sessions: { maxRows: 10_000, maxRowBytes: 5_120 },
  exercise_logs: { maxRows: 50_000, maxRowBytes: 2_048 },
  personal_records: { maxRows: 2_000, maxRowBytes: 2_048 },
  // AI coach chat
  ai_coach_threads: { maxRows: 500, maxRowBytes: 5_120 },
  ai_coach_messages: { maxRows: 10_000, maxRowBytes: 8_192 },
  // Reminders / device state
  scheduled_reminders: { maxRows: 500, maxRowBytes: 5_120 },
  push_subscriptions: { maxRows: 20, maxRowBytes: 5_120 },
  feature_votes: { maxRows: 500, maxRowBytes: 2_048 },
  // Gamification / operational logs
  telemetry_events: { maxRows: 25_000, maxRowBytes: 2_048 },
  xp_transactions: { maxRows: 50_000, maxRowBytes: 1_024 },
  spin_history: { maxRows: 10_000, maxRowBytes: 1_024 },
  power_up_transactions: { maxRows: 10_000, maxRowBytes: 1_024 },
  task_tower_sessions: { maxRows: 10_000, maxRowBytes: 5_120 },
  island_run_action_log: { maxRows: 5_000, maxRowBytes: null },
};

/** Limit for a table, or null when the table has no configured cap. */
export function getUserDataLimit(tableName: string): UserDataLimit | null {
  return USER_DATA_LIMITS[tableName] ?? null;
}
