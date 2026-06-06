import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getPiecePosition, padPieceNumber } from './naming.mjs';

export function getExpectedMaskName(index, position) {
  return `mask_${padPieceNumber(index)}_${position}.png`;
}

export function getExpectedMasks({ masksDir, rows, columns }) {
  const masks = [];
  let index = 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const position = getPiecePosition(row, column, rows, columns);
      const filename = getExpectedMaskName(index, position);
      masks.push({
        index,
        id: padPieceNumber(index),
        row,
        column,
        position,
        filename,
        path: masksDir ? path.join(masksDir, filename) : null,
      });
      index += 1;
    }
  }
  return masks;
}

export async function fileExists(filePath) {
  if (!filePath) return false;
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function maskAlphaFromRgbaPixel(data, offset) {
  const luminance = Math.max(data[offset], data[offset + 1], data[offset + 2]);
  const sourceAlpha = data[offset + 3];
  return Math.round((luminance * sourceAlpha) / 255);
}

export async function readMaskAlpha({ maskPath, expectedWidth, expectedHeight }) {
  const metadata = await sharp(maskPath, { failOn: 'warning' }).metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (width !== expectedWidth || height !== expectedHeight) {
    return {
      ok: false,
      width,
      height,
      error: `mask canvas ${width}x${height}; expected ${expectedWidth}x${expectedHeight}`,
      alpha: null,
      visiblePixels: 0,
    };
  }

  const { data, info } = await sharp(maskPath, { failOn: 'warning' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alpha = new Uint8Array(info.width * info.height);
  let visiblePixels = 0;
  for (let sourceOffset = 0, pixel = 0; sourceOffset < data.length; sourceOffset += info.channels, pixel += 1) {
    const maskAlpha = maskAlphaFromRgbaPixel(data, sourceOffset);
    alpha[pixel] = maskAlpha;
    if (maskAlpha > 0) visiblePixels += 1;
  }

  return {
    ok: true,
    width: info.width,
    height: info.height,
    error: null,
    alpha,
    visiblePixels,
  };
}

export async function readAvailableMaskAlpha(mask, expectedWidth, expectedHeight) {
  if (!mask.path || !await fileExists(mask.path)) {
    return {
      ...mask,
      exists: false,
      ok: false,
      width: null,
      height: null,
      error: 'missing mask file',
      alpha: null,
      visiblePixels: 0,
    };
  }

  try {
    const read = await readMaskAlpha({
      maskPath: mask.path,
      expectedWidth,
      expectedHeight,
    });
    return {
      ...mask,
      exists: true,
      ...read,
    };
  } catch (error) {
    return {
      ...mask,
      exists: true,
      ok: false,
      width: null,
      height: null,
      error: error instanceof Error ? error.message : String(error),
      alpha: null,
      visiblePixels: 0,
    };
  }
}
