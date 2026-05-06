import {
  IMAGE_UPLOAD_WEBP_MIME_TYPE,
  MAX_COMPRESSED_IMAGE_BYTES,
  MAX_ORIGINAL_IMAGE_BYTES,
  ImageUploadOptimizationError,
  getImageUploadCompressionAttempts,
  optimizeImageFileForUpload,
  replaceFileExtensionWithWebp,
} from '../imageUploadOptimizer.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function makeImageFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type, lastModified: 1234 });
}

async function expectRejectsWithCode(
  action: () => Promise<unknown>,
  code: ImageUploadOptimizationError['code'],
  message: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    assert(error instanceof ImageUploadOptimizationError, `${message}: expected ImageUploadOptimizationError`);
    assertEqual(error.code, code, message);
    return;
  }
  throw new Error(`${message}: expected rejection`);
}

export async function runImageUploadOptimizerTests(): Promise<void> {
  const jpeg = await optimizeImageFileForUpload(makeImageFile('dream-photo.jpeg', 'image/jpeg'), {
    kind: 'vision-board',
    encodeImageToWebp: async (_file, attempt) => {
      assertEqual(attempt.maxWidth, 1600, 'JPEG first attempt should use vision-board max width');
      assertEqual(attempt.quality, 0.78, 'JPEG first attempt should use default quality');
      return new Blob([new Uint8Array(128 * 1024)], { type: IMAGE_UPLOAD_WEBP_MIME_TYPE });
    },
  });
  assertEqual(jpeg.type, IMAGE_UPLOAD_WEBP_MIME_TYPE, 'JPEG should convert to WebP MIME type');
  assertEqual(jpeg.name, 'dream-photo.webp', 'JPEG extension should be replaced with .webp');
  assertEqual(jpeg.lastModified, 1234, 'JPEG lastModified should be preserved');

  const png = await optimizeImageFileForUpload(makeImageFile('transparent.png', 'image/png'), {
    kind: 'annual-review',
    encodeImageToWebp: async () => new Blob([new Uint8Array(200 * 1024)], { type: IMAGE_UPLOAD_WEBP_MIME_TYPE }),
  });
  assertEqual(png.type, IMAGE_UPLOAD_WEBP_MIME_TYPE, 'PNG should convert to WebP MIME type');
  assertEqual(png.name, 'transparent.webp', 'PNG extension should be replaced with .webp');


  const dailyAttempts = getImageUploadCompressionAttempts('daily-game');
  assertEqual(dailyAttempts[0]?.maxWidth, 1024, 'Daily Game should start at 1024px max width');
  assertEqual(dailyAttempts[0]?.quality, 0.78, 'Daily Game should start at default quality');

  await expectRejectsWithCode(
    () => optimizeImageFileForUpload(makeImageFile('wrong-encoder.jpg', 'image/jpeg'), {
      kind: 'vision-board',
      encodeImageToWebp: async () => new Blob([new Uint8Array(128 * 1024)], { type: 'image/png' }),
    }),
    'compression_failed',
    'non-WebP encoder output should fail instead of uploading mislabeled bytes',
  );

  await expectRejectsWithCode(
    () => optimizeImageFileForUpload(makeImageFile('too-big.jpg', 'image/jpeg', MAX_ORIGINAL_IMAGE_BYTES + 1), {
      kind: 'vision-board',
      encodeImageToWebp: async () => new Blob([new Uint8Array(1)], { type: IMAGE_UPLOAD_WEBP_MIME_TYPE }),
    }),
    'original_too_large',
    'oversized original should reject',
  );

  await expectRejectsWithCode(
    () => optimizeImageFileForUpload(makeImageFile('notes.txt', 'text/plain'), {
      kind: 'vision-board',
      encodeImageToWebp: async () => new Blob([new Uint8Array(1)], { type: IMAGE_UPLOAD_WEBP_MIME_TYPE }),
    }),
    'unsupported_type',
    'non-image should reject',
  );

  await expectRejectsWithCode(
    () => optimizeImageFileForUpload(makeImageFile('huge-result.png', 'image/png'), {
      kind: 'vision-board',
      encodeImageToWebp: async () => new Blob([new Uint8Array(MAX_COMPRESSED_IMAGE_BYTES + 1)], { type: IMAGE_UPLOAD_WEBP_MIME_TYPE }),
    }),
    'compressed_too_large',
    'compressed result over limit should reject after retries',
  );

  assertEqual(replaceFileExtensionWithWebp('archive.photo.final.PNG'), 'archive.photo.final.webp', 'complex filename extension should be replaced');
  assertEqual(replaceFileExtensionWithWebp('no-extension'), 'no-extension.webp', 'extensionless filename should get .webp');
  assertEqual(replaceFileExtensionWithWebp(''), 'image.webp', 'empty filename should get a safe fallback');
}
