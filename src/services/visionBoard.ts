import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  buildLocalVisionImageId,
  enqueueVisionImageMutation,
  getVisionImageMutationCounts,
  listLocalVisionImageRecordsForUser,
  listPendingVisionImageMutations,
  removeLocalVisionImageRecord,
  removeVisionImageMutation,
  updateVisionImageMutation,
  upsertLocalVisionImageRecord,
} from '../data/visionBoardOfflineRepo';
import {
  DEMO_USER_ID,
  addDemoVisionImage,
  fileToDataUrl,
  getDemoVisionImages,
  removeDemoVisionImage,
  updateDemoVisionImage,
} from './demoData';

export const VISION_BOARD_BUCKET = 'vision-board';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type VisionImageInsert = Database['public']['Tables']['vision_images']['Insert'];
type VisionImageUpdate = Database['public']['Tables']['vision_images']['Update'];

type ServiceError = PostgrestError | Error | null;

type ServiceResponse<T> = {
  data: T | null;
  error: ServiceError;
};

export type VisionImageQueueStatus = { pending: number; failed: number };

function isNetworkLikeError(error: unknown): boolean {
  const message =
    typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message ?? '') : '';
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('offline') ||
    normalized.includes('load failed')
  );
}

async function mergeLocalVisionImages(userId: string, remote: VisionImageRow[]): Promise<VisionImageRow[]> {
  const local = await listLocalVisionImageRecordsForUser(userId);
  if (!local.length) return remote;
  const byId = new Map(remote.map((record) => [record.id, record] as const));
  for (const record of local) {
    byId.set(record.row.id, record.row);
  }
  return Array.from(byId.values()).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

async function blobFromDataUrl(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function isBucketNotFoundError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('bucket') && (lowerMessage.includes('not found') || lowerMessage.includes('not exist'));
}

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

  if (response.error) return { data: response.data, error: response.error };
  const merged = await mergeLocalVisionImages(userId, response.data ?? []);
  return { data: merged, error: null };
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
  if (path.startsWith('data:')) {
    return path;
  }

  if (!canUseSupabaseData()) {
    return path;
  }

  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(VISION_BOARD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function queueLocalVisionFileCreate({
  userId,
  file,
  fileName,
  caption,
  originalFormat,
  visionType,
  reviewIntervalDays,
  linkedGoalIds,
  linkedHabitIds,
}: UploadPayload): Promise<VisionImageRow> {
  const localId = buildLocalVisionImageId();
  const nowIso = new Date().toISOString();
  const stagedDataUrl = await fileToDataUrl(file);
  const localRow: VisionImageRow = {
    id: localId,
    user_id: userId,
    image_path: stagedDataUrl,
    image_url: null,
    image_source: 'file',
    caption: caption?.trim() ? caption.trim() : null,
    created_at: nowIso,
    file_path: null,
    file_format: originalFormat || null,
    vision_type: visionType ?? null,
    review_interval_days: reviewIntervalDays ?? null,
    last_reviewed_at: null,
    linked_goal_ids: linkedGoalIds ?? [],
    linked_habit_ids: linkedHabitIds ?? [],
  };
  const nowMs = Date.now();
  await upsertLocalVisionImageRecord({
    id: localId,
    user_id: userId,
    server_id: null,
    row: localRow,
    sync_state: 'pending_create',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueVisionImageMutation({
    id: `vision-image-mut-${localId}`,
    user_id: userId,
    image_id: localId,
    server_id: null,
    operation: 'create_file',
    payload: {
      user_id: userId,
      image_source: 'file',
      caption: caption?.trim() ? caption.trim() : null,
      file_format: originalFormat || null,
      vision_type: visionType ?? null,
      review_interval_days: reviewIntervalDays ?? null,
      linked_goal_ids: linkedGoalIds ?? [],
      linked_habit_ids: linkedHabitIds ?? [],
      staged_file_data_url: stagedDataUrl,
      staged_file_name: fileName,
      staged_content_type: file instanceof File ? file.type : 'image/webp',
    },
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });
  return localRow;
}

type UploadPayload = {
  userId: string;
  file: File | Blob;
  fileName: string;
  caption?: string | null;
  originalFormat?: string | null;
  visionType?: string | null;
  reviewIntervalDays?: number | null;
  linkedGoalIds?: string[] | null;
  linkedHabitIds?: string[] | null;
};

export async function uploadVisionImage({
  userId,
  file,
  fileName,
  caption,
  originalFormat,
  visionType,
  reviewIntervalDays,
  linkedGoalIds,
  linkedHabitIds,
}: UploadPayload): Promise<ServiceResponse<VisionImageRow>> {
  if (!canUseSupabaseData()) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const record = addDemoVisionImage({
        user_id: userId || DEMO_USER_ID,
        image_path: dataUrl,
        caption: caption?.trim() ? caption.trim() : null,
        file_format: originalFormat || null,
        vision_type: visionType ?? null,
        review_interval_days: reviewIntervalDays ?? null,
        linked_goal_ids: linkedGoalIds ?? [],
        linked_habit_ids: linkedHabitIds ?? [],
      });
      return { data: record, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unable to store vision image.') };
    }
  }

  const supabase = getSupabaseClient();

  const fileExtension = fileName.split('.').pop()?.toLowerCase() ?? 'webp';
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  const sanitizedBaseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const storagePath = `${userId}/${randomId}-${sanitizedBaseName || 'vision-image'}.${fileExtension}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from(VISION_BOARD_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file instanceof File ? file.type : 'image/webp',
    });

  if (storageError) {
    // Log storage error with context for debugging
    console.error('[Vision Board] Storage upload failed:', {
      timestamp: new Date().toISOString(),
      operation: 'storage_upload',
      bucket: VISION_BOARD_BUCKET,
      filePath: storagePath,
      fileName,
      fileSize: file instanceof File ? file.size : (file as Blob).size,
      fileType: file instanceof File ? file.type : 'image/webp',
      userId,
      error: storageError,
    });

    // Provide a more helpful error message for bucket not found
    if (isBucketNotFoundError(storageError.message)) {
      return {
        data: null,
        error: new Error(
          `Storage bucket "${VISION_BOARD_BUCKET}" not found. Please run the 0124_vision_board_storage_bucket.sql migration in your Supabase project to create it. You can still use URL-based images in the meantime.`,
        ),
      };
    }
    if (isNetworkLikeError(storageError)) {
      try {
        const localRecord = await queueLocalVisionFileCreate({
          userId,
          file,
          fileName,
          caption,
          originalFormat,
          visionType,
          reviewIntervalDays,
          linkedGoalIds,
          linkedHabitIds,
        });
        return { data: localRecord, error: null };
      } catch (queueError) {
        return {
          data: null,
          error: queueError instanceof Error ? queueError : new Error('Unable to queue vision image upload.'),
        };
      }
    }

    // Enrich error with context
    const errorMessage = `Storage upload failed: ${storageError.message} (bucket: ${VISION_BOARD_BUCKET}, path: ${storagePath})`;
    return { data: null, error: new Error(errorMessage) };
  }

  const payload: VisionImageInsert = {
    user_id: userId,
    image_path: storageData?.path ?? storagePath,
    image_source: 'file',
    caption: caption?.trim() ? caption.trim() : null,
    file_path: storageData?.path ?? storagePath,
    file_format: originalFormat || fileExtension,
    vision_type: visionType ?? null,
    review_interval_days: reviewIntervalDays ?? null,
    linked_goal_ids: linkedGoalIds ?? [],
    linked_habit_ids: linkedHabitIds ?? [],
  };

  const { data, error } = await supabase
    .from('vision_images')
    .insert(payload)
    .select()
    .returns<VisionImageRow>()
    .single();

  if (error) {
    if (isNetworkLikeError(error)) {
      try {
        const localRecord = await queueLocalVisionFileCreate({
          userId,
          file,
          fileName,
          caption,
          originalFormat,
          visionType,
          reviewIntervalDays,
          linkedGoalIds,
          linkedHabitIds,
        });
        return { data: localRecord, error: null };
      } catch (queueError) {
        return {
          data: null,
          error: queueError instanceof Error ? queueError : new Error('Unable to queue vision image upload.'),
        };
      }
    }
    // Log database error with context for debugging
    console.error('[Vision Board] Database insert failed:', {
      timestamp: new Date().toISOString(),
      operation: 'database_insert',
      table: 'vision_images',
      userId,
      filePath: storagePath,
      fileName,
      error,
    });

    // Enrich error with context
    const errorMessage = `Database insert failed: ${error.message} (file: ${fileName})`;
    return { data: null, error: new Error(errorMessage) };
  }

  return { data, error: null };
}

type UploadUrlPayload = {
  userId: string;
  imageUrl: string;
  caption?: string | null;
  visionType?: string | null;
  reviewIntervalDays?: number | null;
  linkedGoalIds?: string[] | null;
  linkedHabitIds?: string[] | null;
};

export async function uploadVisionImageFromUrl({
  userId,
  imageUrl,
  caption,
  visionType,
  reviewIntervalDays,
  linkedGoalIds,
  linkedHabitIds,
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
        vision_type: visionType ?? null,
        review_interval_days: reviewIntervalDays ?? null,
        linked_goal_ids: linkedGoalIds ?? [],
        linked_habit_ids: linkedHabitIds ?? [],
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
    vision_type: visionType ?? null,
    review_interval_days: reviewIntervalDays ?? null,
    linked_goal_ids: linkedGoalIds ?? [],
    linked_habit_ids: linkedHabitIds ?? [],
  };

  const { data, error } = await supabase
    .from('vision_images')
    .insert(payload)
    .select()
    .returns<VisionImageRow>()
    .single();

  if (error && !isNetworkLikeError(error)) {
    // Log database error with context for debugging
    console.error('[Vision Board] Database insert failed (URL):', {
      timestamp: new Date().toISOString(),
      operation: 'database_insert',
      table: 'vision_images',
      userId,
      imageUrl,
      error,
    });

    // Enrich error with context
    const errorMessage = `Database insert failed: ${error.message} (URL: ${imageUrl})`;
    return { data: null, error: new Error(errorMessage) };
  }
  if (error) {
    const localId = buildLocalVisionImageId();
    const nowIso = new Date().toISOString();
    const localRow: VisionImageRow = {
      id: localId,
      user_id: userId,
      image_path: null,
      image_url: imageUrl,
      image_source: 'url',
      caption: caption?.trim() ? caption.trim() : null,
      created_at: nowIso,
      file_path: null,
      file_format: null,
      vision_type: visionType ?? null,
      review_interval_days: reviewIntervalDays ?? null,
      last_reviewed_at: null,
      linked_goal_ids: linkedGoalIds ?? [],
      linked_habit_ids: linkedHabitIds ?? [],
    };
    const nowMs = Date.now();
    await upsertLocalVisionImageRecord({
      id: localId,
      user_id: userId,
      server_id: null,
      row: localRow,
      sync_state: 'pending_create',
      updated_at_ms: nowMs,
      last_error: null,
    });
    await enqueueVisionImageMutation({
      id: `vision-image-mut-${localId}`,
      user_id: userId,
      image_id: localId,
      server_id: null,
      operation: 'create_url',
      payload,
      status: 'pending',
      attempt_count: 0,
      created_at_ms: nowMs,
      updated_at_ms: nowMs,
      last_error: null,
    });
    return { data: localRow, error: null };
  }

  return { data, error: null };
}

export async function syncQueuedVisionImageMutations(userId: string): Promise<void> {
  if (!canUseSupabaseData()) return;
  const supabase = getSupabaseClient();
  const pending = await listPendingVisionImageMutations(userId);
  for (const mutation of pending) {
    try {
      await updateVisionImageMutation(mutation.id, { status: 'processing', updated_at_ms: Date.now() });
      let error: PostgrestError | null = null;
      if (mutation.operation === 'create_file') {
        const stagedDataUrl = mutation.payload.staged_file_data_url;
        if (!stagedDataUrl) throw new Error('Missing staged file data for queued vision image.');
        const blob = await blobFromDataUrl(stagedDataUrl);
        const fileName = mutation.payload.staged_file_name ?? `queued-${mutation.image_id}.webp`;
        const fileExtension = fileName.split('.').pop()?.toLowerCase() ?? 'webp';
        const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
        const sanitizedBaseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
        const storagePath = `${userId}/${randomId}-${sanitizedBaseName || 'vision-image'}.${fileExtension}`;
        const { data: storageData, error: storageError } = await supabase.storage
          .from(VISION_BOARD_BUCKET)
          .upload(storagePath, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: mutation.payload.staged_content_type ?? 'image/webp',
          });
        if (storageError) throw storageError;
        const queuedPayload: VisionImageInsert = {
          user_id: userId,
          image_path: storageData?.path ?? storagePath,
          image_source: 'file',
          caption: mutation.payload.caption ?? null,
          file_path: storageData?.path ?? storagePath,
          file_format: mutation.payload.file_format ?? fileExtension,
          vision_type: mutation.payload.vision_type ?? null,
          review_interval_days: mutation.payload.review_interval_days ?? null,
          linked_goal_ids: mutation.payload.linked_goal_ids ?? [],
          linked_habit_ids: mutation.payload.linked_habit_ids ?? [],
        };
        const response = await supabase.from('vision_images').insert(queuedPayload).select().returns<VisionImageRow>().single();
        error = response.error;
      } else {
        const queuedPayload: VisionImageInsert = {
          user_id: userId,
          image_url: mutation.payload.image_url ?? null,
          image_source: 'url',
          caption: mutation.payload.caption ?? null,
          vision_type: mutation.payload.vision_type ?? null,
          review_interval_days: mutation.payload.review_interval_days ?? null,
          linked_goal_ids: mutation.payload.linked_goal_ids ?? [],
          linked_habit_ids: mutation.payload.linked_habit_ids ?? [],
        };
        const response = await supabase.from('vision_images').insert(queuedPayload).select().returns<VisionImageRow>().single();
        error = response.error;
      }
      if (error) throw error;
      await removeLocalVisionImageRecord(mutation.image_id);
      await removeVisionImageMutation(mutation.id);
    } catch (error) {
      await updateVisionImageMutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function getVisionImageQueueStatus(userId: string): Promise<VisionImageQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  return getVisionImageMutationCounts(userId);
}

export async function updateVisionImage(
  id: string,
  payload: VisionImageUpdate,
): Promise<ServiceResponse<VisionImageRow>> {
  if (!canUseSupabaseData()) {
    const record = updateDemoVisionImage(id, payload);
    if (!record) {
      return { data: null, error: new Error('Vision board entry not found.') };
    }
    return { data: record, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('vision_images')
    .update(payload)
    .eq('id', id)
    .select()
    .returns<VisionImageRow>()
    .single();

  return { data: response.data, error: response.error };
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
