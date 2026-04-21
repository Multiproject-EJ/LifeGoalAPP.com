"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISION_BOARD_BUCKET = void 0;
exports.fetchVisionImages = fetchVisionImages;
exports.getVisionImagePublicUrl = getVisionImagePublicUrl;
exports.uploadVisionImage = uploadVisionImage;
exports.uploadVisionImageFromUrl = uploadVisionImageFromUrl;
exports.syncQueuedVisionImageMutations = syncQueuedVisionImageMutations;
exports.getVisionImageQueueStatus = getVisionImageQueueStatus;
exports.clearQueuedVisionImageMutations = clearQueuedVisionImageMutations;
exports.retryFailedVisionImageMutations = retryFailedVisionImageMutations;
exports.updateVisionImage = updateVisionImage;
exports.deleteVisionImage = deleteVisionImage;
const supabaseClient_1 = require("../lib/supabaseClient");
const visionBoardOfflineRepo_1 = require("../data/visionBoardOfflineRepo");
const demoData_1 = require("./demoData");
const offlineSyncTelemetry_1 = require("./offlineSyncTelemetry");
exports.VISION_BOARD_BUCKET = 'vision-board';
function authRequiredError(message) {
    return new Error(message);
}
function isNetworkLikeError(error) {
    const message = typeof error === 'object' && error && 'message' in error ? String(error.message ?? '') : '';
    const normalized = message.toLowerCase();
    return (normalized.includes('failed to fetch') ||
        normalized.includes('network') ||
        normalized.includes('offline') ||
        normalized.includes('load failed'));
}
async function mergeLocalVisionImages(userId, remote) {
    const local = await (0, visionBoardOfflineRepo_1.listLocalVisionImageRecordsForUser)(userId);
    if (!local.length)
        return remote;
    const byId = new Map(remote.map((record) => [record.id, record]));
    for (const record of local) {
        byId.set(record.row.id, record.row);
    }
    return Array.from(byId.values()).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}
async function blobFromDataUrl(dataUrl) {
    const response = await fetch(dataUrl);
    return response.blob();
}
function isBucketNotFoundError(message) {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('bucket') && (lowerMessage.includes('not found') || lowerMessage.includes('not exist'));
}
async function fetchVisionImages(userId) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: [], error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const response = await supabase
        .from('vision_images')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .returns();
    if (response.error)
        return { data: response.data, error: response.error };
    const merged = await mergeLocalVisionImages(userId, response.data ?? []);
    return { data: merged, error: null };
}
function getVisionImagePublicUrl(record) {
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
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return path;
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const { data } = supabase.storage.from(exports.VISION_BOARD_BUCKET).getPublicUrl(path);
    return data.publicUrl;
}
async function queueLocalVisionFileCreate({ userId, file, fileName, caption, originalFormat, visionType, reviewIntervalDays, linkedGoalIds, linkedHabitIds, }) {
    const localId = (0, visionBoardOfflineRepo_1.buildLocalVisionImageId)();
    const nowIso = new Date().toISOString();
    const stagedDataUrl = await (0, demoData_1.fileToDataUrl)(file);
    const localRow = {
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
    await (0, visionBoardOfflineRepo_1.upsertLocalVisionImageRecord)({
        id: localId,
        user_id: userId,
        server_id: null,
        row: localRow,
        sync_state: 'pending_create',
        updated_at_ms: nowMs,
        last_error: null,
    });
    await (0, visionBoardOfflineRepo_1.enqueueVisionImageMutation)({
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
    (0, offlineSyncTelemetry_1.recordOfflineSyncEvent)({
        feature: 'vision_board',
        event: 'queue_enqueued',
        userId,
        pending: 1,
    });
    return localRow;
}
async function uploadVisionImage({ userId, file, fileName, caption, originalFormat, visionType, reviewIntervalDays, linkedGoalIds, linkedHabitIds, }) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: authRequiredError('Authentication required.') };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const fileExtension = fileName.split('.').pop()?.toLowerCase() ?? 'webp';
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const sanitizedBaseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const storagePath = `${userId}/${randomId}-${sanitizedBaseName || 'vision-image'}.${fileExtension}`;
    const { data: storageData, error: storageError } = await supabase.storage
        .from(exports.VISION_BOARD_BUCKET)
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
            bucket: exports.VISION_BOARD_BUCKET,
            filePath: storagePath,
            fileName,
            fileSize: file instanceof File ? file.size : file.size,
            fileType: file instanceof File ? file.type : 'image/webp',
            userId,
            error: storageError,
        });
        // Provide a more helpful error message for bucket not found
        if (isBucketNotFoundError(storageError.message)) {
            return {
                data: null,
                error: new Error(`Storage bucket "${exports.VISION_BOARD_BUCKET}" not found. Please run the 0124_vision_board_storage_bucket.sql migration in your Supabase project to create it. You can still use URL-based images in the meantime.`),
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
            }
            catch (queueError) {
                return {
                    data: null,
                    error: queueError instanceof Error ? queueError : new Error('Unable to queue vision image upload.'),
                };
            }
        }
        // Enrich error with context
        const errorMessage = `Storage upload failed: ${storageError.message} (bucket: ${exports.VISION_BOARD_BUCKET}, path: ${storagePath})`;
        return { data: null, error: new Error(errorMessage) };
    }
    const payload = {
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
        .returns()
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
            }
            catch (queueError) {
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
async function uploadVisionImageFromUrl({ userId, imageUrl, caption, visionType, reviewIntervalDays, linkedGoalIds, linkedHabitIds, }) {
    // Validate URL format
    try {
        new URL(imageUrl);
    }
    catch {
        return { data: null, error: new Error('Invalid URL format') };
    }
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: authRequiredError('Authentication required.') };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const payload = {
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
        .returns()
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
        const localId = (0, visionBoardOfflineRepo_1.buildLocalVisionImageId)();
        const nowIso = new Date().toISOString();
        const localRow = {
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
        await (0, visionBoardOfflineRepo_1.upsertLocalVisionImageRecord)({
            id: localId,
            user_id: userId,
            server_id: null,
            row: localRow,
            sync_state: 'pending_create',
            updated_at_ms: nowMs,
            last_error: null,
        });
        await (0, visionBoardOfflineRepo_1.enqueueVisionImageMutation)({
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
        (0, offlineSyncTelemetry_1.recordOfflineSyncEvent)({
            feature: 'vision_board',
            event: 'queue_enqueued',
            userId,
            pending: 1,
        });
        return { data: localRow, error: null };
    }
    return { data, error: null };
}
async function syncQueuedVisionImageMutations(userId) {
    if (!(0, supabaseClient_1.canUseSupabaseData)())
        return;
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const pending = await (0, visionBoardOfflineRepo_1.listPendingVisionImageMutations)(userId);
    (0, offlineSyncTelemetry_1.recordOfflineSyncEvent)({
        feature: 'vision_board',
        event: 'sync_started',
        userId,
        pending: pending.length,
    });
    for (const mutation of pending) {
        try {
            await (0, visionBoardOfflineRepo_1.updateVisionImageMutation)(mutation.id, { status: 'processing', updated_at_ms: Date.now() });
            let error = null;
            if (mutation.operation === 'create_file') {
                const stagedDataUrl = mutation.payload.staged_file_data_url;
                if (!stagedDataUrl)
                    throw new Error('Missing staged file data for queued vision image.');
                const blob = await blobFromDataUrl(stagedDataUrl);
                const fileName = mutation.payload.staged_file_name ?? `queued-${mutation.image_id}.webp`;
                const fileExtension = fileName.split('.').pop()?.toLowerCase() ?? 'webp';
                const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
                const sanitizedBaseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
                const storagePath = `${userId}/${randomId}-${sanitizedBaseName || 'vision-image'}.${fileExtension}`;
                const { data: storageData, error: storageError } = await supabase.storage
                    .from(exports.VISION_BOARD_BUCKET)
                    .upload(storagePath, blob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: mutation.payload.staged_content_type ?? 'image/webp',
                });
                if (storageError)
                    throw storageError;
                const queuedPayload = {
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
                const response = await supabase.from('vision_images').insert(queuedPayload).select().returns().single();
                error = response.error;
            }
            else {
                const queuedPayload = {
                    user_id: userId,
                    image_url: mutation.payload.image_url ?? null,
                    image_source: 'url',
                    caption: mutation.payload.caption ?? null,
                    vision_type: mutation.payload.vision_type ?? null,
                    review_interval_days: mutation.payload.review_interval_days ?? null,
                    linked_goal_ids: mutation.payload.linked_goal_ids ?? [],
                    linked_habit_ids: mutation.payload.linked_habit_ids ?? [],
                };
                const response = await supabase.from('vision_images').insert(queuedPayload).select().returns().single();
                error = response.error;
            }
            if (error)
                throw error;
            await (0, visionBoardOfflineRepo_1.removeLocalVisionImageRecord)(mutation.image_id);
            await (0, visionBoardOfflineRepo_1.removeVisionImageMutation)(mutation.id);
            (0, offlineSyncTelemetry_1.recordOfflineSyncEvent)({
                feature: 'vision_board',
                event: 'sync_succeeded',
                userId,
                attemptCount: mutation.attempt_count + 1,
            });
        }
        catch (error) {
            await (0, visionBoardOfflineRepo_1.updateVisionImageMutation)(mutation.id, {
                status: 'failed',
                attempt_count: mutation.attempt_count + 1,
                updated_at_ms: Date.now(),
                last_error: error instanceof Error ? error.message : String(error),
            });
            (0, offlineSyncTelemetry_1.recordOfflineSyncEvent)({
                feature: 'vision_board',
                event: 'sync_failed',
                userId,
                attemptCount: mutation.attempt_count + 1,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
async function getVisionImageQueueStatus(userId) {
    if (!(0, supabaseClient_1.canUseSupabaseData)())
        return { pending: 0, failed: 0 };
    return (0, visionBoardOfflineRepo_1.getVisionImageMutationCounts)(userId);
}
async function clearQueuedVisionImageMutations(userId) {
    await (0, visionBoardOfflineRepo_1.clearVisionImageMutationsForUser)(userId);
    (0, offlineSyncTelemetry_1.recordOfflineSyncEvent)({
        feature: 'vision_board',
        event: 'queue_cleared',
        userId,
    });
}
async function retryFailedVisionImageMutations(userId) {
    await (0, visionBoardOfflineRepo_1.retryFailedVisionImageMutationsForUser)(userId);
    (0, offlineSyncTelemetry_1.recordOfflineSyncEvent)({
        feature: 'vision_board',
        event: 'queue_retry_requested',
        userId,
    });
}
async function updateVisionImage(id, payload) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: authRequiredError('Authentication required.') };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const response = await supabase
        .from('vision_images')
        .update(payload)
        .eq('id', id)
        .select()
        .returns()
        .single();
    return { data: response.data, error: response.error };
}
async function deleteVisionImage(record) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return authRequiredError('Authentication required.');
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const { error: deleteError } = await supabase.from('vision_images').delete().eq('id', record.id);
    if (deleteError) {
        return deleteError;
    }
    // Only delete from storage if this is a file-based image
    if (record.image_source === 'file' && record.image_path) {
        const { error: storageError } = await supabase.storage.from(exports.VISION_BOARD_BUCKET).remove([record.image_path]);
        if (storageError) {
            return new Error(storageError.message);
        }
    }
    return null;
}
