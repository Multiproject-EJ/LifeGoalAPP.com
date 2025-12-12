/**
 * Image conversion utilities for converting images to WebP format in the browser
 */

export type ConversionResult = {
  blob: Blob;
  format: 'webp';
  originalFormat: string;
  fileName: string;
};

/**
 * Extract file format from a File object
 */
export function getFileFormat(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Map of extensions to formats
  const extensionMap: Record<string, string> = {
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'png': 'png',
    'webp': 'webp',
    'gif': 'gif',
  };
  
  const formatFromExt = extension ? extensionMap[extension] : undefined;
  if (formatFromExt) return formatFromExt;
  
  // Fallback to MIME type
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  
  return mimeMap[file.type] || 'unknown';
}

/**
 * Convert an image file to WebP format using Canvas API
 * @param file - The image file to convert
 * @param quality - WebP quality (0-1), default 0.85
 * @returns Promise<ConversionResult>
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.85
): Promise<ConversionResult> {
  const originalFormat = getFileFormat(file);
  
  // If already WebP, return as is
  if (originalFormat === 'webp') {
    return {
      blob: file,
      format: 'webp',
      originalFormat: 'webp',
      fileName: file.name,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        ctx.drawImage(img, 0, 0);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            
            if (!blob) {
              reject(new Error('Failed to convert image to WebP'));
              return;
            }

            const webpFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            
            resolve({
              blob,
              format: 'webp',
              originalFormat,
              fileName: webpFileName,
            });
          },
          'image/webp',
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Check if WebP conversion is supported in the current browser
 */
export function isWebPSupported(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}
