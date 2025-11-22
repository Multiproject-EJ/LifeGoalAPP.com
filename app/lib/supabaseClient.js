export const supabase = window.supabase ??
  window.createSupabaseClient?.() ??
  (() => {
    const url  = window.ENV?.SUPABASE_URL  || '<PUT_SUPABASE_URL>';
    const key  = window.ENV?.SUPABASE_ANON_KEY || '<PUT_SUPABASE_ANON_KEY>';
    // Use global supabase-js if already bundled; otherwise assume app injects client
    return window.supabase || supabase.createClient(url, key);
  })();

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    // Redirect to existing sign-in panel in the app (do not redesign layout)
    document.dispatchEvent(new CustomEvent('show-sign-in'));
  }
  return session;
}

export function getVapidPublicKey() {
  return window.ENV?.VAPID_PUBLIC_KEY || import.meta?.env?.VITE_VAPID_PUBLIC_KEY || '';
}

export function getSupabaseUrl() {
  return window.ENV?.SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL || '<PUT_SUPABASE_URL>';
}
