import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  DEMO_USER_ID,
  addDemoVisionImage,
  fileToDataUrl,
  getDemoVisionImages,
  removeDemoVisionImage,
} from './demoData';

export const VISION_BOARD_BUCKET = 'vision-board';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type VisionImageInsert = Database['public']['Tables']['vision_images']['Insert'];

type ServiceError = PostgrestError | Error | null;

type ServiceResponse<T> = {
  data: T | null;
  error: ServiceError;
};

export async function fetchVisionImages(userId: string): Promise<ServiceResponse<VisionImageRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoVisionImages(userId || DEMO_USER_ID), error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('vision_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<VisionImageRow[]>();

  return { data: response.data, error: response.error };
}

export function getVisionImagePublicUrl(record: VisionImageRow): string {
  // If image is from a URL, return the URL directly
  if (record.image_source === 'url' && record.image_url) {
    return record.image_url;
  }

  // For file-based images, use the path
  const path = record.image_path;
  if (!path) {
    return '';
  }

  if (!canUseSupabaseData()) {
    return path;
  }

  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(VISION_BOARD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

type UploadPayload = {
  userId: string;
  file: File | Blob;
  fileName: string;
  caption?: string | null;
};

export async function uploadVisionImage({
  userId,
  file,
  fileName,
  caption,
}: UploadPayload): Promise<ServiceResponse<VisionImageRow>> {
  if (!canUseSupabaseData()) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const record = addDemoVisionImage({
        user_id: userId || DEMO_USER_ID,
        image_path: dataUrl,
        caption: caption?.trim() ? caption.trim() : null,
      });
      return { data: record, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unable to store vision image.') };
    }
  }

  const supabase = getSupabaseClient();

  const fileExtension = fileName.split('.').pop()?.toLowerCase() ?? 'jpeg';
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  const sanitizedBaseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const storagePath = `${userId}/${randomId}-${sanitizedBaseName || 'vision-image'}.${fileExtension}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from(VISION_BOARD_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file instanceof File ? file.type : undefined,
    });

  if (storageError) {
    return { data: null, error: new Error(storageError.message) };
  }

  const payload: VisionImageInsert = {
    user_id: userId,
    image_path: storageData?.path ?? storagePath,
    image_source: 'file',
    caption: caption?.trim() ? caption.trim() : null,
  };

  const { data, error } = await supabase
    .from('vision_images')
    .insert(payload)
    .select()
    .returns<VisionImageRow>()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

type UploadUrlPayload = {
  userId: string;
  imageUrl: string;
  caption?: string | null;
};

export async function uploadVisionImageFromUrl({
  userId,
  imageUrl,
  caption,
}: UploadUrlPayload): Promise<ServiceResponse<VisionImageRow>> {
  // Validate URL format
  try {
    new URL(imageUrl);
  } catch {
    return { data: null, error: new Error('Invalid URL format') };
  }

  if (!canUseSupabaseData()) {
    try {
      const record = addDemoVisionImage({
        user_id: userId || DEMO_USER_ID,
        image_url: imageUrl,
        image_source: 'url',
        caption: caption?.trim() ? caption.trim() : null,
      });
      return { data: record, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unable to store vision image.') };
    }
  }

  const supabase = getSupabaseClient();

  const payload: VisionImageInsert = {
    user_id: userId,
    image_url: imageUrl,
    image_source: 'url',
    caption: caption?.trim() ? caption.trim() : null,
  };

  const { data, error } = await supabase
    .from('vision_images')
    .insert(payload)
    .select()
    .returns<VisionImageRow>()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function deleteVisionImage(record: VisionImageRow): Promise<ServiceError> {
  if (!canUseSupabaseData()) {
    removeDemoVisionImage(record.id);
    return null;
  }

  const supabase = getSupabaseClient();

  const { error: deleteError } = await supabase.from('vision_images').delete().eq('id', record.id);
  if (deleteError) {
    return deleteError;
  }

  // Only delete from storage if this is a file-based image
  if (record.image_source === 'file' && record.image_path) {
    const { error: storageError } = await supabase.storage.from(VISION_BOARD_BUCKET).remove([record.image_path]);
    if (storageError) {
      return new Error(storageError.message);
    }
  }

  return null;
}
