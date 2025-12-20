import { getSupabaseClient } from '../../lib/supabaseClient';
import { VISION_BOARD_BUCKET } from '../../services/visionBoard';

const DAILY_PREFIX = 'daily-game';

export function buildDailyImagePath(userId: string, sessionDate: string): string {
  const dateSlug = sessionDate || new Date().toISOString().slice(0, 10);
  const randomId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
  return `${DAILY_PREFIX}/${userId}/${dateSlug}/${randomId}.webp`;
}

export async function uploadDailyGameImage(
  userId: string,
  file: Blob,
  sessionDate: string,
): Promise<{ path: string | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const path = buildDailyImagePath(userId, sessionDate);
    const { error } = await supabase.storage.from(VISION_BOARD_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/webp',
    });

    if (error) {
      return { path: null, error: new Error(error.message) };
    }

    return { path, error: null };
  } catch (error) {
    return { path: null, error: error as Error };
  }
}

export async function getSignedImageUrl(path: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(VISION_BOARD_BUCKET).createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  } catch (error) {
    console.error('Unable to create signed URL for daily vision image', error);
    return null;
  }
}
