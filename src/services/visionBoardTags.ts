import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { getDemoVisionImageTags, setDemoVisionImageTags } from './demoData';

type VisionImageTagRow = Database['public']['Tables']['vision_board_image_tags']['Row'];
type VisionImageTagInsert = Database['public']['Tables']['vision_board_image_tags']['Insert'];

type ServiceError = PostgrestError | Error | null;

type ServiceResponse<T> = {
  data: T | null;
  error: ServiceError;
};

export async function fetchVisionImageTags(
  userId: string,
  imageIds: string[],
): Promise<ServiceResponse<VisionImageTagRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoVisionImageTags(userId, imageIds), error: null };
  }

  if (imageIds.length === 0) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('vision_board_image_tags')
    .select('*')
    .eq('user_id', userId)
    .in('image_id', imageIds)
    .returns<VisionImageTagRow[]>();

  return { data: response.data, error: response.error };
}

export async function setVisionImageCategories(
  userId: string,
  imageId: string,
  categoryKeys: string[],
): Promise<ServiceResponse<VisionImageTagRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: setDemoVisionImageTags(userId, imageId, categoryKeys), error: null };
  }

  const supabase = getSupabaseClient();
  const { error: deleteError } = await supabase
    .from('vision_board_image_tags')
    .delete()
    .eq('user_id', userId)
    .eq('image_id', imageId);

  if (deleteError) {
    return { data: null, error: deleteError };
  }

  if (categoryKeys.length === 0) {
    return { data: [], error: null };
  }

  const payload: VisionImageTagInsert[] = categoryKeys.map((categoryKey) => ({
    user_id: userId,
    image_id: imageId,
    category_key: categoryKey,
  }));

  const { data, error } = await supabase
    .from('vision_board_image_tags')
    .insert(payload)
    .select()
    .returns<VisionImageTagRow[]>();

  return { data, error };
}
