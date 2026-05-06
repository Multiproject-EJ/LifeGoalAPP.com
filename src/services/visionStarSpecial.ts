import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { optimizeImageFileForUpload, IMAGE_UPLOAD_WEBP_MIME_TYPE } from '../utils/imageUploadOptimizer';
import { VISION_BOARD_BUCKET } from './visionBoard';

export type VisionStarSpecialRequest = {
  habitNames: string[];
  goalTitles: string[];
  userDisplayName: string;
  isAvatarPOV: boolean;
};

export type VisionStarSpecialResult = {
  caption: string;
  panels: string[];
  imagePrompt: string;
  imageDataUrl: string;
};

export async function generateSpecialVisionStar(
  payload: VisionStarSpecialRequest,
): Promise<{ data: VisionStarSpecialResult | null; error: Error | null; source: 'supabase' | 'demo' | 'unavailable' }> {
  if (!canUseSupabaseData()) {
    return {
      data: null,
      error: new Error('Supabase is not configured for AI image generation.'),
      source: 'unavailable',
    };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke<VisionStarSpecialResult>('vision-star-special', {
      body: payload,
    });

    if (error) {
      return {
        data: null,
        error: new Error(error.message || 'Unable to generate special vision star.'),
        source: 'supabase',
      };
    }

    if (!data || !data.imageDataUrl || !Array.isArray(data.panels) || data.panels.length === 0) {
      return {
        data: null,
        error: new Error('Invalid response from vision-star-special function.'),
        source: 'supabase',
      };
    }

    return { data, error: null, source: 'supabase' };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error generating special vision star.'),
      source: 'supabase',
    };
  }
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64Data] = dataUrl.split(',');
  if (!header || !base64Data || !header.startsWith('data:')) {
    throw new Error('Invalid image data URL returned from special vision star generation.');
  }
  const mimeMatch = header.match(/^data:([^;]+);base64$/);
  const mimeType = mimeMatch?.[1] ?? 'image/png';

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let idx = 0; idx < binaryString.length; idx += 1) {
    bytes[idx] = binaryString.charCodeAt(idx);
  }

  return new File([bytes], fileName, { type: mimeType });
}

export async function persistSpecialVisionStarImage(
  userId: string,
  imageDataUrl: string,
): Promise<{ publicUrl: string | null; error: Error | null }> {
  if (!canUseSupabaseData()) {
    return { publicUrl: null, error: new Error('Supabase is not configured.') };
  }

  try {
    const sourceFile = dataUrlToFile(imageDataUrl, 'special-vision-star.png');
    const optimizedFile = await optimizeImageFileForUpload(sourceFile, { kind: 'special-vision-star' });
    const supabase = getSupabaseClient();
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const storagePath = `${userId}/special-vision-star/${randomId}.webp`;

    const { error: uploadError } = await supabase.storage.from(VISION_BOARD_BUCKET).upload(storagePath, optimizedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: IMAGE_UPLOAD_WEBP_MIME_TYPE,
    });

    if (uploadError) {
      return { publicUrl: null, error: new Error(uploadError.message) };
    }

    const { data } = supabase.storage.from(VISION_BOARD_BUCKET).getPublicUrl(storagePath);
    return { publicUrl: data.publicUrl || null, error: null };
  } catch (error) {
    return {
      publicUrl: null,
      error: error instanceof Error ? error : new Error('Unknown error persisting special vision star image.'),
    };
  }
}
