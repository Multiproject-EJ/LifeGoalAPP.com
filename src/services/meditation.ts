import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { v4 as uuidv4 } from 'uuid';

export type MeditationSession = Database['public']['Tables']['meditation_sessions']['Row'];
type MeditationSessionInsert = Database['public']['Tables']['meditation_sessions']['Insert'];
type MeditationSessionUpdate = Database['public']['Tables']['meditation_sessions']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

// Demo data storage
const demoMeditationSessions: Map<string, MeditationSession[]> = new Map();

/**
 * Get demo meditation sessions for a user
 */
function getDemoMeditationSessions(userId: string): MeditationSession[] {
  if (!demoMeditationSessions.has(userId)) {
    // Initialize with some sample sessions
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    demoMeditationSessions.set(userId, [
      {
        id: uuidv4(),
        user_id: userId,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        session_date: yesterday,
        session_type: 'breathing',
        duration_seconds: 180,
        completed: true,
        notes: null,
      },
      {
        id: uuidv4(),
        user_id: userId,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        session_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        session_type: 'breathing',
        duration_seconds: 180,
        completed: true,
        notes: null,
      },
    ]);
  }
  return demoMeditationSessions.get(userId) ?? [];
}

/**
 * Add demo meditation session
 */
function addDemoMeditationSession(userId: string, session: MeditationSession): void {
  const sessions = getDemoMeditationSessions(userId);
  sessions.push(session);
  demoMeditationSessions.set(userId, sessions);
}

/**
 * List meditation sessions for the current user
 */
export async function listMeditationSessions(
  userId: string,
  limit: number = 100,
): Promise<ServiceResponse<MeditationSession[]>> {
  if (!canUseSupabaseData()) {
    const sessions = getDemoMeditationSessions(userId);
    // Sort by session_date descending, then created_at descending
    const sorted = [...sessions].sort((a, b) => {
      const dateCompare = b.session_date.localeCompare(a.session_date);
      if (dateCompare !== 0) return dateCompare;
      return b.created_at.localeCompare(a.created_at);
    });
    return { data: sorted.slice(0, limit), error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_sessions')
    .select('*')
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<MeditationSession[]>();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Create a new meditation session
 */
export async function createMeditationSession(
  payload: MeditationSessionInsert,
): Promise<ServiceResponse<MeditationSession>> {
  if (!canUseSupabaseData()) {
    const session: MeditationSession = {
      id: uuidv4(),
      user_id: payload.user_id,
      created_at: payload.created_at ?? new Date().toISOString(),
      session_date: payload.session_date ?? new Date().toISOString().split('T')[0],
      session_type: payload.session_type ?? 'breathing',
      duration_seconds: payload.duration_seconds,
      completed: payload.completed ?? true,
      notes: payload.notes ?? null,
    };
    addDemoMeditationSession(payload.user_id, session);
    return { data: session, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_sessions')
    .insert(payload)
    .select()
    .returns<MeditationSession>()
    .single();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Get meditation stats for a user
 */
export async function getMeditationStats(userId: string): Promise<
  ServiceResponse<{
    totalMinutes: number;
    totalSessions: number;
    currentStreak: number;
  }>
> {
  if (!canUseSupabaseData()) {
    const sessions = getDemoMeditationSessions(userId);
    const completedSessions = sessions.filter((s) => s.completed);
    const totalMinutes = Math.round(
      completedSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
    );
    const totalSessions = completedSessions.length;

    // Calculate streak
    const sortedSessions = [...completedSessions].sort((a, b) =>
      b.session_date.localeCompare(a.session_date),
    );
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    for (const session of sortedSessions) {
      const sessionDate = session.session_date;
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (sessionDate === expectedDate || (currentStreak === 0 && sessionDate === today)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000); // Move back one day
      } else if (currentStreak === 0 && sessionDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
        // Allow streak to start from yesterday
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 172800000); // Move back two days
      } else {
        break;
      }
    }

    return {
      data: { totalMinutes, totalSessions, currentStreak },
      error: null,
    };
  }

  const supabase = getSupabaseClient();

  try {
    // Get total stats
    const { data: sessions, error: sessionsError } = await supabase
      .from('meditation_sessions')
      .select('session_date, duration_seconds, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('session_date', { ascending: false });

    if (sessionsError) {
      return { data: null, error: sessionsError };
    }

    const totalMinutes = Math.round(
      (sessions ?? []).reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
    );
    const totalSessions = sessions?.length ?? 0;

    // Calculate streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    for (const session of sessions ?? []) {
      const sessionDate = session.session_date;
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (sessionDate === expectedDate || (currentStreak === 0 && sessionDate === today)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else if (currentStreak === 0 && sessionDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 172800000);
      } else {
        break;
      }
    }

    return {
      data: { totalMinutes, totalSessions, currentStreak },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch meditation stats'),
    };
  }
}

/**
 * Placeholder meditation sessions for the library
 */
export const PLACEHOLDER_SESSIONS = [
  {
    id: 'quick-breathing',
    title: '3-Minute Breathing',
    description: 'A quick breathing exercise to center yourself',
    duration: 180,
    type: 'breathing',
    icon: '🌬️',
  },
  {
    id: 'focused-breathing',
    title: '5-Minute Focus',
    description: 'Build focus with mindful breathing',
    duration: 300,
    type: 'breathing',
    icon: '🎯',
  },
  {
    id: 'deep-relaxation',
    title: '10-Minute Deep Relaxation',
    description: 'Deeply relax your mind and body',
    duration: 600,
    type: 'breathing',
    icon: '🧘',
  },
] as const;
