import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  FACTORY_MODE_RECTANGLE_PLACEHOLDER,
  getFactoryOutputNames,
  getPieceFilename,
  getPiecePosition,
  padPieceNumber,
} from './naming.mjs';

function encode(image, outputFormat) {
  if (outputFormat === 'png') return image.png();
  if (outputFormat === 'webp') return image.webp({ lossless: true });
  throw new Error(`Unsupported output format: ${outputFormat}`);
}

function svgForOutline({ width, height, rows, columns, includeBackground }) {
  const minDimension = Math.max(1, Math.min(width, height));
  const borderStroke = Math.max(4, Math.round(minDimension * 0.012));
  const gridStroke = Math.max(2, Math.round(minDimension * 0.006));
  const shadowStroke = Math.max(borderStroke + 4, Math.round(minDimension * 0.018));
  const lines = [];

  lines.push(`<rect x="${shadowStroke / 2}" y="${shadowStroke / 2}" width="${width - shadowStroke}" height="${height - shadowStroke}" fill="none" stroke="rgba(0,0,0,0.75)" stroke-width="${shadowStroke}"/>`);
  lines.push(`<rect x="${borderStroke / 2}" y="${borderStroke / 2}" width="${width - borderStroke}" height="${height - borderStroke}" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="${borderStroke}"/>`);

  for (let column = 1; column < columns; column += 1) {
    const x = Math.floor((column * width) / columns);
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(0,0,0,0.7)" stroke-width="${gridStroke + 2}"/>`);
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,255,255,0.9)" stroke-width="${gridStroke}"/>`);
  }

  for (let row = 1; row < rows; row += 1) {
    const y = Math.floor((row * height) / rows);
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(0,0,0,0.7)" stroke-width="${gridStroke + 2}"/>`);
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,0.9)" stroke-width="${gridStroke}"/>`);
  }

  const background = includeBackground ? '<rect width="100%" height="100%" fill="rgba(255,255,255,0.04)"/>' : '';
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${background}${lines.join('')}</svg>`);
}

export function computeGridCells({ width, height, rows, columns }) {
  const cells = [];
  let index = 1;
  for (let row = 0; row < rows; row += 1) {
    const top = Math.floor((row * height) / rows);
    const bottom = Math.floor(((row + 1) * height) / rows);
    for (let column = 0; column < columns; column += 1) {
      const left = Math.floor((column * width) / columns);
      const right = Math.floor(((column + 1) * width) / columns);
      const position = getPiecePosition(row, column, rows, columns);
      cells.push({
        index,
        id: padPieceNumber(index),
        row,
        column,
        position,
        bounds: {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        },
      });
      index += 1;
    }
  }
  return cells;
}

export async function slicePuzzle(config) {
  const names = getFactoryOutputNames(config.outputFormat);
  await mkdir(config.outputRoot, { recursive: true });
  await mkdir(path.join(config.outputRoot, names.piecesDirectory), { recursive: true });
  await mkdir(path.join(config.outputRoot, names.qaDirectory), { recursive: true });

  const input = sharp(config.inputMaster, { failOn: 'warning' }).ensureAlpha();
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read master dimensions from ${config.inputMaster}`);
  }

  const masterMetadata = {
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    format: metadata.format,
    hasAlpha: Boolean(metadata.hasAlpha),
  };

  const files = {
    completedMaster: path.join(config.outputRoot, names.completedMaster),
    completedStrongOutline: path.join(config.outputRoot, names.completedStrongOutline),
    emptyBoardOutline: path.join(config.outputRoot, names.emptyBoardOutline),
    reassembledCheck: path.join(config.outputRoot, names.qaDirectory, names.reassembledCheck),
    qcReport: path.join(config.outputRoot, names.qcReport),
    manifest: path.join(config.outputRoot, names.manifest),
  };

  await encode(sharp(config.inputMaster).ensureAlpha(), config.outputFormat).toFile(files.completedMaster);

  const outlineSvg = svgForOutline({
    width: metadata.width,
    height: metadata.height,
    rows: config.grid.rows,
    columns: config.grid.columns,
    includeBackground: false,
  });
  await encode(
    sharp(config.inputMaster).ensureAlpha().composite([{ input: outlineSvg, left: 0, top: 0 }]),
    config.outputFormat,
  ).toFile(files.completedStrongOutline);

  const emptyBoardSvg = svgForOutline({
    width: metadata.width,
    height: metadata.height,
    rows: config.grid.rows,
    columns: config.grid.columns,
    includeBackground: true,
  });
  await encode(sharp(emptyBoardSvg).ensureAlpha(), config.outputFormat).toFile(files.emptyBoardOutline);

  const cells = computeGridCells({
    width: metadata.width,
    height: metadata.height,
    rows: config.grid.rows,
    columns: config.grid.columns,
  });

  const transparentCanvas = {
    create: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  };

  const pieces = [];
  for (const cell of cells) {
    const pieceFilename = getPieceFilename({
      index: cell.index,
      position: cell.position,
      outputFormat: config.outputFormat,
    });
    const outputPath = path.join(config.outputRoot, names.piecesDirectory, pieceFilename);
    const regionBuffer = await sharp(config.inputMaster)
      .ensureAlpha()
      .extract({
        left: cell.bounds.x,
        top: cell.bounds.y,
        width: cell.bounds.width,
        height: cell.bounds.height,
      })
      .png()
      .toBuffer();

    await encode(
      sharp(transparentCanvas).composite([{ input: regionBuffer, left: cell.bounds.x, top: cell.bounds.y }]),
      config.outputFormat,
    ).toFile(outputPath);

    pieces.push({ ...cell, outputPath });
  }

  await encode(
    sharp(transparentCanvas).composite(pieces.map((piece) => ({ input: piece.outputPath, left: 0, top: 0 }))),
    config.outputFormat,
  ).toFile(files.reassembledCheck);

  return {
    mode: FACTORY_MODE_RECTANGLE_PLACEHOLDER,
    masterMetadata,
    files,
    pieces,
  };
}
