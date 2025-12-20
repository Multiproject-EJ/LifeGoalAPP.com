export type WebpOptions = {
  maxSize?: number;
  quality?: number;
};

/**
 * Convert an input image to WebP with optional resizing.
 */
export async function convertImageToWebp(input: Blob | File, options: WebpOptions = {}): Promise<Blob> {
  const { maxSize = 1024, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Could not create canvas context'));
            return;
          }

          const maxDimension = Math.max(img.width, img.height);
          const scale = maxDimension > maxSize ? maxSize / maxDimension : 1;
          const targetWidth = Math.max(1, Math.round(img.width * scale));
          const targetHeight = Math.max(1, Math.round(img.height * scale));

          canvas.width = targetWidth;
          canvas.height = targetHeight;
          context.drawImage(img, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Unable to convert image to WebP'));
                return;
              }
              resolve(blob);
            },
            'image/webp',
            quality,
          );
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to convert image'));
        }
      };
      img.onerror = () => reject(new Error('Unable to load image for conversion'));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(input);
  });
}
