export type ImageUploadKind = 'vision-board' | 'annual-review' | 'daily-game' | 'special-vision-star';

export const IMAGE_UPLOAD_WEBP_MIME_TYPE = 'image/webp';
export const MAX_ORIGINAL_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_COMPRESSED_IMAGE_BYTES = 750 * 1024;
export const DEFAULT_WEBP_QUALITY = 0.78;
export const FALLBACK_WEBP_QUALITY = 0.68;

export const ALLOWED_IMAGE_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/png', IMAGE_UPLOAD_WEBP_MIME_TYPE]);

const IMAGE_UPLOAD_KIND_MAX_WIDTH: Record<ImageUploadKind, number> = {
  'vision-board': 1600,
  'annual-review': 1600,
  'daily-game': 1024,
  'special-vision-star': 1600,
};

type CompressionAttempt = {
  maxWidth: number;
  quality: number;
};

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

type EncodeImageToWebp = (file: File, attempt: CompressionAttempt) => Promise<Blob>;

export type OptimizeImageUploadOptions = {
  kind: ImageUploadKind;
  encodeImageToWebp?: EncodeImageToWebp;
};

export class ImageUploadOptimizationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'unsupported_type'
      | 'original_too_large'
      | 'compressed_too_large'
      | 'compression_failed',
  ) {
    super(message);
    this.name = 'ImageUploadOptimizationError';
  }
}

export function getImageUploadMaxWidth(kind: ImageUploadKind): number {
  return IMAGE_UPLOAD_KIND_MAX_WIDTH[kind];
}

export function replaceFileExtensionWithWebp(fileName: string): string {
  const trimmedName = fileName.trim();
  if (!trimmedName) return 'image.webp';

  const lastSlashIndex = Math.max(trimmedName.lastIndexOf('/'), trimmedName.lastIndexOf('\\'));
  const nameOnly = trimmedName.slice(lastSlashIndex + 1) || 'image';
  const extensionIndex = nameOnly.lastIndexOf('.');
  const baseName = extensionIndex > 0 ? nameOnly.slice(0, extensionIndex) : nameOnly;
  return `${baseName || 'image'}.webp`;
}

export function validateImageUploadFile(file: File): void {
  if (!ALLOWED_IMAGE_UPLOAD_MIME_TYPES.has(file.type)) {
    throw new ImageUploadOptimizationError(
      'Please upload a JPG, PNG, or WebP image. GIF, HEIC, HEIF, SVG, and other file types are not supported.',
      'unsupported_type',
    );
  }

  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new ImageUploadOptimizationError('Images must be 5 MB or smaller before optimization.', 'original_too_large');
  }
}

function getCompressionAttempts(kind: ImageUploadKind): CompressionAttempt[] {
  const startingWidth = getImageUploadMaxWidth(kind);
  if (kind === 'daily-game') {
    return [
      { maxWidth: startingWidth, quality: DEFAULT_WEBP_QUALITY },
      { maxWidth: 900, quality: 0.72 },
      { maxWidth: 768, quality: FALLBACK_WEBP_QUALITY },
    ];
  }

  return [
    { maxWidth: startingWidth, quality: DEFAULT_WEBP_QUALITY },
    { maxWidth: 1400, quality: 0.72 },
    { maxWidth: 1200, quality: FALLBACK_WEBP_QUALITY },
  ];
}

async function loadImageFromFile(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  if (typeof document === 'undefined') {
    throw new Error('Image optimization requires browser image APIs.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to load image for optimization.'));
      element.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function defaultEncodeImageToWebp(file: File, attempt: CompressionAttempt): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Image optimization requires canvas support.');
  }

  const image = await loadImageFromFile(file);
  try {
    const scale = image.width > attempt.maxWidth ? attempt.maxWidth / image.width : 1;
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create canvas context for image optimization.');
    }

    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image.source, 0, 0, targetWidth, targetHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Unable to encode image as WebP.'));
            return;
          }
          resolve(blob);
        },
        IMAGE_UPLOAD_WEBP_MIME_TYPE,
        attempt.quality,
      );
    });
  } finally {
    image.close?.();
  }
}

export async function optimizeImageFileForUpload(
  file: File,
  options: OptimizeImageUploadOptions,
): Promise<File> {
  validateImageUploadFile(file);

  const encodeImageToWebp = options.encodeImageToWebp ?? defaultEncodeImageToWebp;
  const attempts = getCompressionAttempts(options.kind);
  let lastBlob: Blob | null = null;

  try {
    for (const attempt of attempts) {
      const blob = await encodeImageToWebp(file, attempt);
      lastBlob = blob;
      if (blob.size <= MAX_COMPRESSED_IMAGE_BYTES) {
        return new File([blob], replaceFileExtensionWithWebp(file.name), {
          type: IMAGE_UPLOAD_WEBP_MIME_TYPE,
          lastModified: file.lastModified,
        });
      }
    }
  } catch (error) {
    throw new ImageUploadOptimizationError(
      error instanceof Error ? error.message : 'Unable to optimize image before upload.',
      'compression_failed',
    );
  }

  throw new ImageUploadOptimizationError(
    `This image is still too large after optimization${lastBlob ? ` (${Math.ceil(lastBlob.size / 1024)} KB)` : ''}. Please choose a smaller image or crop it before uploading.`,
    'compressed_too_large',
  );
}
