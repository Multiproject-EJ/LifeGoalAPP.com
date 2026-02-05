import { mkdir, copyFile, access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourcePath = path.join(repoRoot, 'src', 'assets', 'V2_app_icon_large_dark.png');
const destDir = path.join(repoRoot, 'public', 'icons');
const destPath = path.join(destDir, 'V2_app_icon_large_dark.png');

const ensureSourceExists = async () => {
  await access(sourcePath);
};

const ensureDestDir = async () => {
  await mkdir(destDir, { recursive: true });
};

const assertPngSize = async (expectedWidth, expectedHeight) => {
  const buffer = await readFile(sourcePath);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (!buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error('Source icon is not a valid PNG file.');
  }

  const ihdrIndex = buffer.indexOf('IHDR', 8, 'ascii');
  if (ihdrIndex === -1) {
    throw new Error('PNG IHDR chunk not found.');
  }

  const width = buffer.readUInt32BE(ihdrIndex + 4);
  const height = buffer.readUInt32BE(ihdrIndex + 8);

  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`Unexpected PNG size: ${width}x${height}. Expected ${expectedWidth}x${expectedHeight}.`);
  }
};

const copyIcon = async () => {
  await ensureSourceExists();
  await ensureDestDir();
  await assertPngSize(1024, 1024);
  await copyFile(sourcePath, destPath);
  console.log('[icons] Copied V2_app_icon_large_dark.png to public/icons');
};

copyIcon();
