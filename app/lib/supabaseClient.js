// ========================================================
// SUPABASE CLIENT FOR HABITS MODULE
// Wraps the existing Supabase client with habits-specific helpers
// ========================================================

import { getSupabaseClient, getActiveSupabaseSession } from '../../src/lib/supabaseClient';

// Export the supabase client
export const supabase = getSupabaseClient();

// Get current session
export function getSession() {
  return getActiveSupabaseSession();
}

// Require authentication - redirect if not logged in
export function requireAuth() {
  const session = getSession();
  if (!session) {
    // User should be redirected to sign-in
    throw new Error('Authentication required. Please sign in to continue.');
  }
  return session;
}

// Helper to get VAPID public key from environment
export function getVapidPublicKey(): string {
  // Try window.ENV first (for runtime config), then import.meta.env
  if (typeof window !== 'undefined' && (window as any).ENV?.VAPID_PUBLIC_KEY) {
    return (window as any).ENV.VAPID_PUBLIC_KEY;
  }
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
}

// Helper to get Supabase URL
export function getSupabaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).ENV?.SUPABASE_URL) {
    return (window as any).ENV.SUPABASE_URL;
  }
  return import.meta.env.VITE_SUPABASE_URL || '';
}
