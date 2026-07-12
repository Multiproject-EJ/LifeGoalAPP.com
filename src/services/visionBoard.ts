import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  clearVisionImageMutationsForUser,
  listLocalVisionImageRecordsForUser,
  listPendingVisionImageMutations,
  removeVisionImageMutation,
  upsertLocalVisionImageRecord,
} from '../data/visionBoardOfflineRepo';
import { guardedCloudCall } from './service-health';
import { getMutationQueue, getSyncEngine } from './offline-queue';
import {
  generateClientId,
  shouldQueueAfterFailure,
  toPostgrestError,
} from './offlineWriteThrough';
import {
  fileToDataUrl,
} from './demoData';
import { recordOfflineSyncEvent } from './offlineSyncTelemetry';
import {
  IMAGE_UPLOAD_WEBP_MIME_TYPE,
  optimizeImageFileForUpload,
  replaceFileExtensionWithWebp,
} from '../utils/imageUploadOptimizer';

export const VISION_BOARD_BUCKET = 'vision-board';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type VisionImageInsert = Database['public']['Tables']['vision_images']['Insert'];
type VisionImageUpdate = Database['public']['Tables']['vision_images']['Update'];

type ServiceError = PostgrestError | Error | null;

type ServiceResponse<T> = {
  data: T | null;
  error: ServiceError;
};

function authRequiredError(message: string): Error {
  return new Error(message);
}

export type VisionImageQueueStatus = { pending: number; failed: number };

/** Payload shape for queued vision-image creates (shared MutationQueue). */
export type VisionImageQueuedCreate = {
  imageId: string;
  userId: string;
  caption: string | null;
  visionType: string | null;
  reviewIntervalDays: number | null;
  linkedGoalIds: string[];
  linkedHabitIds: string[];
  imageUrl?: string | null;
  stagedFileDataUrl?: string;
  stagedFileName?: string;
  stagedContentType?: string;
};

async function mergeLocalVisionImages(userId: string, remote: VisionImageRow[]): Promise<VisionImageRow[]> {
  const local = await listLocalVisionImageRecordsForUser(userId);
  if (!local.length) return remote;
  const byId = new Map(remote.map((record) => [record.id, record] as const));
  for (const record of local) {
    byId.set(record.row.id, record.row);
  }
  return Array.from(byId.values()).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export async function blobFromDataUrl(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function isBucketNotFoundError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('bucket') && (lowerMessage.includes('not found') || lowerMessage.includes('not exist'));
}

export async function fetchVisionImages(userId: string): Promise<ServiceResponse<VisionImageRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('vision_images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<VisionImageRow[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });

  if (!result.ok) {
    // Outage: staged offline uploads stay visible; the translated error lets
    // the board explain why the rest is missing.
    const merged = await mergeLocalVisionImages(userId, []);
    return { data: merged, error: toPostgrestError(result.error) };
  }
  const merged = await mergeLocalVisionImages(userId, result.data);
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
  visionType,
  reviewIntervalDays,
  linkedGoalIds,
  linkedHabitIds,
}: UploadPayload): Promise<VisionImageRow> {
  const imageId = generateClientId();
  const nowIso = new Date().toISOString();
  const stagedDataUrl = await fileToDataUrl(file);
  const localRow: VisionImageRow = {
    id: imageId,
    user_id: userId,
    image_path: stagedDataUrl,
    image_url: null,
    image_source: 'file',
    caption: caption?.trim() ? caption.trim() : null,
    created_at: nowIso,
    file_path: null,
    file_format: 'webp',
    vision_type: visionType ?? null,
    review_interval_days: reviewIntervalDays ?? null,
    last_reviewed_at: null,
    linked_goal_ids: linkedGoalIds ?? [],
    linked_habit_ids: linkedHabitIds ?? [],
  };
  await upsertLocalVisionImageRecord({
    id: imageId,
    user_id: userId,
    server_id: null,
    row: localRow,
    sync_state: 'pending_create',
    updated_at_ms: Date.now(),
    last_error: null,
  });
  const payload: VisionImageQueuedCreate = {
    imageId,
    userId,
    caption: caption?.trim() ? caption.trim() : null,
    visionType: visionType ?? null,
    reviewIntervalDays: reviewIntervalDays ?? null,
    linkedGoalIds: linkedGoalIds ?? [],
    linkedHabitIds: linkedHabitIds ?? [],
    stagedFileDataUrl: stagedDataUrl,
    stagedFileName: fileName,
    stagedContentType: IMAGE_UPLOAD_WEBP_MIME_TYPE,
  };
  await getMutationQueue().enqueue({
    feature: 'vision_board',
    operation: 'vision_image.create_file',
    payload,
    dedupeKey: imageId,
  });
  recordOfflineSyncEvent({
    feature: 'vision_board',
    event: 'queue_enqueued',
    userId,
    pending: 1,
  });
  return localRow;
}

type UploadPayload = {
  userId: string;
  file: File;
  fileName: string;
  caption?: string | null;
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
  visionType,
  reviewIntervalDays,
  linkedGoalIds,
  linkedHabitIds,
}: UploadPayload): Promise<ServiceResponse<VisionImageRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError('Authentication required.') };
  }

  let optimizedFile: File;
  try {
    optimizedFile = await optimizeImageFileForUpload(file, { kind: visionType === 'annual-review' ? 'annual-review' : 'vision-board' });
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unable to optimize image before upload.') };
  }

  const supabase = getSupabaseClient();

  const webpFileName = replaceFileExtensionWithWebp(fileName || optimizedFile.name);
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  const sanitizedBaseName = webpFileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const storagePath = `${userId}/${randomId}-${sanitizedBaseName || 'vision-image'}.webp`;

  const queueUpload = async (): Promise<ServiceResponse<VisionImageRow>> => {
    try {
      const localRecord = await queueLocalVisionFileCreate({
        userId,
        file: optimizedFile,
        fileName: webpFileName,
        caption,
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
  };

  const storageResult = await guardedCloudCall('storage', async () => {
    const { data, error } = await supabase.storage
      .from(VISION_BOARD_BUCKET)
      .upload(storagePath, optimizedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: IMAGE_UPLOAD_WEBP_MIME_TYPE,
      });
    if (error) throw error;
    return data;
  });

  if (!storageResult.ok) {
    // Keep the actionable configuration hint (app-authored copy, not raw text)
    if (isBucketNotFoundError(storageResult.error.technicalDetail ?? '')) {
      return {
        data: null,
        error: new Error(
          `Storage bucket "${VISION_BOARD_BUCKET}" not found. Please run the 0124_vision_board_storage_bucket.sql migration in your Supabase project to create it. You can still use URL-based images in the meantime.`,
        ),
      };
    }
    if (shouldQueueAfterFailure(storageResult.error)) {
      return queueUpload();
    }
    return { data: null, error: new Error(storageResult.error.explanation) };
  }

  const storageData = storageResult.data;
  const payload: VisionImageInsert = {
    user_id: userId,
    image_path: storageData?.path ?? storagePath,
    image_source: 'file',
    caption: caption?.trim() ? caption.trim() : null,
    file_path: storageData?.path ?? storagePath,
    file_format: 'webp',
    vision_type: visionType ?? null,
    review_interval_days: reviewIntervalDays ?? null,
    linked_goal_ids: linkedGoalIds ?? [],
    linked_habit_ids: linkedHabitIds ?? [],
  };

  const insertResult = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('vision_images')
      .insert(payload)
      .select()
      .returns<VisionImageRow>()
      .single();
    if (error) throw error;
    return data;
  });

  if (!insertResult.ok) {
    if (shouldQueueAfterFailure(insertResult.error)) {
      return queueUpload();
    }
    return { data: null, error: new Error(insertResult.error.explanation) };
  }

  return { data: insertResult.data, error: null };
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
    return { data: null, error: authRequiredError('Authentication required.') };
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

  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('vision_images')
      .insert(payload)
      .select()
      .returns<VisionImageRow>()
      .single();
    if (error) throw error;
    return data;
  });

  if (!result.ok) {
    if (!shouldQueueAfterFailure(result.error)) {
      return { data: null, error: new Error(result.error.explanation) };
    }

    const imageId = generateClientId();
    const nowIso = new Date().toISOString();
    const localRow: VisionImageRow = {
      id: imageId,
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
    await upsertLocalVisionImageRecord({
      id: imageId,
      user_id: userId,
      server_id: null,
      row: localRow,
      sync_state: 'pending_create',
      updated_at_ms: Date.now(),
      last_error: null,
    });
    const queuedPayload: VisionImageQueuedCreate = {
      imageId,
      userId,
      caption: caption?.trim() ? caption.trim() : null,
      visionType: visionType ?? null,
      reviewIntervalDays: reviewIntervalDays ?? null,
      linkedGoalIds: linkedGoalIds ?? [],
      linkedHabitIds: linkedHabitIds ?? [],
      imageUrl,
    };
    await getMutationQueue().enqueue({
      feature: 'vision_board',
      operation: 'vision_image.create_url',
      payload: queuedPayload,
      dedupeKey: imageId,
    });
    recordOfflineSyncEvent({
      feature: 'vision_board',
      event: 'queue_enqueued',
      userId,
      pending: 1,
    });
    return { data: localRow, error: null };
  }

  return { data: result.data, error: null };
}

let legacyVisionQueueMigrated = false;

/**
 * One-time convergence of the pre-framework vision-image queue onto the
 * shared MutationQueue. Staged file uploads and queued URL images survive
 * the upgrade.
 */
export async function migrateLegacyVisionImageQueue(userId: string): Promise<void> {
  if (legacyVisionQueueMigrated) return;
  legacyVisionQueueMigrated = true;

  try {
    const queue = getMutationQueue();
    for (const legacy of await listPendingVisionImageMutations(userId)) {
      const imageId = legacy.image_id.startsWith('local-') ? generateClientId() : legacy.image_id;
      const shared: VisionImageQueuedCreate = {
        imageId,
        userId,
        caption: legacy.payload.caption ?? null,
        visionType: legacy.payload.vision_type ?? null,
        reviewIntervalDays: legacy.payload.review_interval_days ?? null,
        linkedGoalIds: legacy.payload.linked_goal_ids ?? [],
        linkedHabitIds: legacy.payload.linked_habit_ids ?? [],
        imageUrl: legacy.payload.image_url ?? null,
        stagedFileDataUrl: legacy.payload.staged_file_data_url ?? undefined,
        stagedFileName: legacy.payload.staged_file_name ?? undefined,
        stagedContentType: legacy.payload.staged_content_type ?? undefined,
      };
      await queue.enqueue({
        feature: 'vision_board',
        operation: legacy.operation === 'create_file' ? 'vision_image.create_file' : 'vision_image.create_url',
        payload: shared,
        dedupeKey: imageId,
      });
      await removeVisionImageMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyVisionQueueMigrated = false;
  }
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncQueuedVisionImageMutations(userId: string): Promise<void> {
  if (!canUseSupabaseData()) return;
  await migrateLegacyVisionImageQueue(userId);
  recordOfflineSyncEvent({
    feature: 'vision_board',
    event: 'sync_started',
    userId,
  });
  await getSyncEngine().syncNow();
}

export async function getVisionImageQueueStatus(_userId: string): Promise<VisionImageQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== 'vision_board') continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
}

export async function clearQueuedVisionImageMutations(userId: string): Promise<void> {
  await clearVisionImageMutationsForUser(userId);
  recordOfflineSyncEvent({
    feature: 'vision_board',
    event: 'queue_cleared',
    userId,
  });
}

export async function retryFailedVisionImageMutations(userId: string): Promise<void> {
  await getMutationQueue().retryFailed();
  recordOfflineSyncEvent({
    feature: 'vision_board',
    event: 'queue_retry_requested',
    userId,
  });
}

export async function updateVisionImage(
  id: string,
  payload: VisionImageUpdate,
): Promise<ServiceResponse<VisionImageRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError('Authentication required.') };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('vision_images')
      .update(payload)
      .eq('id', id)
      .select()
      .returns<VisionImageRow>()
      .single();
    if (response.error) throw response.error;
    return response.data;
  });

  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

export async function deleteVisionImage(record: VisionImageRow): Promise<ServiceError> {
  if (!canUseSupabaseData()) {
    return authRequiredError('Authentication required.');
  }

  const supabase = getSupabaseClient();

  const deleteResult = await guardedCloudCall('database', async () => {
    const { error } = await supabase.from('vision_images').delete().eq('id', record.id);
    if (error) throw error;
    return null;
  });
  if (!deleteResult.ok) {
    return toPostgrestError(deleteResult.error);
  }

  // Only delete from storage if this is a file-based image
  if (record.image_source === 'file' && record.image_path) {
    const storageResult = await guardedCloudCall('storage', async () => {
      const { error } = await supabase.storage.from(VISION_BOARD_BUCKET).remove([record.image_path!]);
      if (error) throw error;
      return null;
    });
    if (!storageResult.ok) {
      return new Error(storageResult.error.explanation);
    }
  }

  return null;
}
