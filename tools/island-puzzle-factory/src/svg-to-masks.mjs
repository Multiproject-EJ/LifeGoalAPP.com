#!/usr/bin/env node
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getExpectedMasks } from './masks.mjs';
import { runMaskExportQc, writeMaskExportReport } from './mask-export-qc.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(factoryRoot, '..', '..');
const factoryOutputRoot = path.join(factoryRoot, 'output');
const factoryTmpRoot = path.join(factoryRoot, 'tmp');

function usage() {
  return `Usage:\n  node tools/island-puzzle-factory/src/svg-to-masks.mjs --config tools/island-puzzle-factory/config/svg-mask-export.example.json\n\nExports nine full-canvas PNG masks from one approved canonical 3x3 SVG template.\n`;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--config') {
      args.config = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveFromRepo(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return path.resolve(repoRoot, value.trim());
}

function assertInsideAllowedOutput(outputPath) {
  const allowedRoots = [factoryOutputRoot, factoryTmpRoot];
  const insideAllowed = allowedRoots.some((allowedRoot) => {
    const relative = path.relative(allowedRoot, outputPath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
  if (!insideAllowed) {
    throw new Error(`outputMasksDir must stay under tools/island-puzzle-factory/output or tools/island-puzzle-factory/tmp. Received: ${path.relative(repoRoot, outputPath)}`);
  }

  const publicPuzzleRoot = path.join(repoRoot, 'public', 'assets', 'puzzle');
  const relativeToPublicPuzzle = path.relative(publicPuzzleRoot, outputPath);
  const insidePublicPuzzle = relativeToPublicPuzzle === '' || (!relativeToPublicPuzzle.startsWith('..') && !path.isAbsolute(relativeToPublicPuzzle));
  if (insidePublicPuzzle) {
    throw new Error('Refusing to write exported masks to public/assets/puzzle. Use tools/island-puzzle-factory/output or tmp instead.');
  }
}

function normalizeConfig(rawConfig) {
  const inputSvg = resolveFromRepo(rawConfig.inputSvg);
  const outputMasksDir = resolveFromRepo(rawConfig.outputMasksDir);
  const expectedPieces = Number(rawConfig.expectedPieces ?? 9);
  return {
    inputSvg,
    outputMasksDir,
    width: rawConfig.canvas?.width == null ? null : Number(rawConfig.canvas.width),
    height: rawConfig.canvas?.height == null ? null : Number(rawConfig.canvas.height),
    expectedPieces,
    puzzleId: String(rawConfig.puzzleId ?? 'puzzle').trim(),
    templateId: String(rawConfig.templateId ?? 'canonical-svg-template').trim(),
    coverageElementId: typeof rawConfig.coverageElementId === 'string' && rawConfig.coverageElementId.trim().length > 0
      ? rawConfig.coverageElementId.trim()
      : null,
    clearOutputMasksDir: rawConfig.clearOutputMasksDir !== false,
    alphaThreshold: Number(rawConfig.alphaThreshold ?? 128),
  };
}

function validateConfig(config) {
  const errors = [];
  if (!config.inputSvg) errors.push('inputSvg is required.');
  if (!config.outputMasksDir) errors.push('outputMasksDir is required.');
  if (!Number.isInteger(config.expectedPieces) || config.expectedPieces !== 9) errors.push('expectedPieces must be 9 for the v1 3x3 exporter.');
  if (config.width != null && (!Number.isInteger(config.width) || config.width <= 0)) errors.push('canvas.width must be a positive integer when provided.');
  if (config.height != null && (!Number.isInteger(config.height) || config.height <= 0)) errors.push('canvas.height must be a positive integer when provided.');
  if (!Number.isFinite(config.alphaThreshold) || config.alphaThreshold < 1 || config.alphaThreshold > 255) errors.push('alphaThreshold must be between 1 and 255.');
  if (config.coverageElementId && config.coverageElementId.startsWith('piece_')) errors.push('coverageElementId must be a separate silhouette element id, not a piece id (piece_01 through piece_09).');
  if (config.outputMasksDir) {
    try {
      assertInsideAllowedOutput(config.outputMasksDir);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return errors;
}

function parseSvgTag(svg) {
  const match = svg.match(/<svg\b[^>]*>/i);
  if (!match) throw new Error('Input file does not contain an <svg> root element.');
  return match[0];
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const match = tag.match(pattern);
  return match ? (match[2] ?? match[3] ?? '') : null;
}

function parsePositiveIntegerDimension(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseViewBox(svgTag) {
  const rawViewBox = getAttribute(svgTag, 'viewBox');
  if (!rawViewBox) throw new Error('Canonical SVG template must define a viewBox; the viewBox defines the mask canvas.');
  const values = rawViewBox.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Invalid SVG viewBox: ${rawViewBox}`);
  }
  if (values[2] <= 0 || values[3] <= 0) throw new Error(`Invalid SVG viewBox dimensions: ${rawViewBox}`);
  return values;
}

function inferCanvas({ svgTag, viewBox, config }) {
  const inferredWidth = parsePositiveIntegerDimension(getAttribute(svgTag, 'width')) ?? (Number.isInteger(viewBox[2]) ? viewBox[2] : null);
  const inferredHeight = parsePositiveIntegerDimension(getAttribute(svgTag, 'height')) ?? (Number.isInteger(viewBox[3]) ? viewBox[3] : null);
  const width = config.width ?? inferredWidth;
  const height = config.height ?? inferredHeight;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Unable to infer an integer mask canvas. Provide canvas.width and canvas.height in config or use integer SVG width/height/viewBox dimensions.');
  }
  if (config.width != null && config.width !== viewBox[2]) {
    throw new Error(`Configured canvas.width (${config.width}) must match SVG viewBox width (${viewBox[2]}). Export must not silently resize pieces.`);
  }
  if (config.height != null && config.height !== viewBox[3]) {
    throw new Error(`Configured canvas.height (${config.height}) must match SVG viewBox height (${viewBox[3]}). Export must not silently resize pieces.`);
  }
  return { width, height };
}

function findTagEnd(svg, startIndex) {
  const end = svg.indexOf('>', startIndex);
  if (end === -1) throw new Error('Malformed SVG: unterminated tag.');
  return end;
}

function readTagName(svg, tagStart) {
  const match = svg.slice(tagStart).match(/^<\/?\s*([a-zA-Z][\w:.-]*)/);
  return match ? match[1] : null;
}

function findElementById(svg, id) {
  const idPattern = new RegExp(`<([a-zA-Z][\\w:.-]*)\\b[^>]*\\bid\\s*=\\s*("${id}"|'${id}')[^>]*>`, 'g');
  const idMatch = idPattern.exec(svg);
  if (!idMatch) return null;

  const start = idMatch.index;
  const tagEnd = findTagEnd(svg, start);
  const startTag = svg.slice(start, tagEnd + 1);
  const tagName = readTagName(svg, start);
  if (!tagName) throw new Error(`Unable to determine element tag for ${id}.`);
  if (/\/\s*>$/.test(startTag)) return svg.slice(start, tagEnd + 1);

  const tagPattern = new RegExp(`<\\/?\\s*${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = tagEnd + 1;
  let depth = 1;
  let match;
  while ((match = tagPattern.exec(svg))) {
    const tag = match[0];
    const isClosing = /^<\//.test(tag);
    const isSelfClosing = /\/\s*>$/.test(tag);
    if (isClosing) depth -= 1;
    else if (!isSelfClosing) depth += 1;
    if (depth === 0) return svg.slice(start, tagPattern.lastIndex);
  }
  throw new Error(`Malformed SVG: unable to find closing </${tagName}> for ${id}.`);
}

function extractDefs(svg) {
  const defs = [];
  const defsPattern = /<defs\b[\s\S]*?<\/defs>/gi;
  let match;
  while ((match = defsPattern.exec(svg))) defs.push(match[0]);
  return defs.join('\n');
}

function collectPieceIds(svg) {
  const ids = [];
  const idPattern = /<[a-zA-Z][\w:.-]*\b[^>]*\bid\s*=\s*("([^"]+)"|'([^']+)')[^>]*>/g;
  let match;
  while ((match = idPattern.exec(svg))) {
    const id = match[2] ?? match[3];
    if (id.startsWith('piece_')) ids.push(id);
  }
  return ids;
}

function makeIsolatedMaskSvg({ sourceSvg, svgTag, viewBox, width, height, pieceId }) {
  const pieceElement = findElementById(sourceSvg, pieceId);
  if (!pieceElement) throw new Error(`Required piece element not found: ${pieceId}`);
  const defs = extractDefs(sourceSvg);
  const viewBoxValue = viewBox.join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBoxValue}">
${defs}
<style>
  svg { background: transparent; }
  #${pieceId}, #${pieceId} * { display: inline !important; visibility: visible !important; opacity: 1 !important; fill: #ffffff !important; fill-opacity: 1 !important; stroke: none !important; stroke-opacity: 0 !important; }
</style>
<rect x="${viewBox[0]}" y="${viewBox[1]}" width="${viewBox[2]}" height="${viewBox[3]}" fill="transparent"/>
<g id="export_${pieceId}">
${pieceElement}
</g>
</svg>
`;
}

async function binarizeMask(renderedBuffer, width, height, alphaThreshold) {
  const { data } = await sharp(renderedBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(width * height * 4);
  let visiblePixels = 0;
  for (let sourceOffset = 0; sourceOffset < data.length; sourceOffset += 4) {
    const luminance = Math.max(data[sourceOffset], data[sourceOffset + 1], data[sourceOffset + 2]);
    const sourceAlpha = data[sourceOffset + 3];
    const maskAlpha = Math.round((luminance * sourceAlpha) / 255);
    if (maskAlpha >= alphaThreshold) {
      output[sourceOffset] = 255;
      output[sourceOffset + 1] = 255;
      output[sourceOffset + 2] = 255;
      output[sourceOffset + 3] = 255;
      visiblePixels += 1;
    }
  }
  return { output, visiblePixels };
}

export async function exportSvgToMasks(config) {
  if (!await fileExists(config.inputSvg)) throw new Error(`inputSvg does not exist: ${config.inputSvg}`);

  const sourceSvg = await readFile(config.inputSvg, 'utf8');
  const svgTag = parseSvgTag(sourceSvg);
  const viewBox = parseViewBox(svgTag);
  const { width, height } = inferCanvas({ svgTag, viewBox, config });
  const expectedMasks = getExpectedMasks({ masksDir: config.outputMasksDir, rows: 3, columns: 3 });
  const expectedPieceIds = expectedMasks.map((mask) => `piece_${mask.id}_${mask.position}`);
  const foundPieceIds = collectPieceIds(sourceSvg).sort();
  const missingPieceIds = expectedPieceIds.filter((id) => !foundPieceIds.includes(id));
  const extraPieceIds = foundPieceIds.filter((id) => !expectedPieceIds.includes(id));

  if (foundPieceIds.length !== config.expectedPieces || missingPieceIds.length > 0 || extraPieceIds.length > 0) {
    throw new Error([
      `Canonical SVG must contain exactly ${config.expectedPieces} expected piece ids.`,
      `Missing: ${missingPieceIds.length ? missingPieceIds.join(', ') : 'none'}.`,
      `Extra: ${extraPieceIds.length ? extraPieceIds.join(', ') : 'none'}.`,
      `Found piece_* ids: ${foundPieceIds.length}.`,
    ].join(' '));
  }

  if (config.clearOutputMasksDir) await rm(config.outputMasksDir, { recursive: true, force: true });
  await mkdir(config.outputMasksDir, { recursive: true });

  const outputs = [];
  for (const mask of expectedMasks) {
    const pieceId = `piece_${mask.id}_${mask.position}`;
    const isolatedSvg = makeIsolatedMaskSvg({ sourceSvg, svgTag, viewBox, width, height, pieceId });
    const renderedBuffer = await sharp(Buffer.from(isolatedSvg), { density: 72 }).png().toBuffer();
    const { output, visiblePixels } = await binarizeMask(renderedBuffer, width, height, config.alphaThreshold);
    await sharp(output, { raw: { width, height, channels: 4 } }).png().toFile(mask.path);
    outputs.push({ pieceId, path: mask.path, visiblePixels });
  }

  let expectedCoverage = null;
  if (config.coverageElementId) {
    const coverageSvg = makeIsolatedMaskSvg({
      sourceSvg,
      svgTag,
      viewBox,
      width,
      height,
      pieceId: config.coverageElementId,
    });
    const renderedCoverage = await sharp(Buffer.from(coverageSvg), { density: 72 }).png().toBuffer();
    const { output, visiblePixels } = await binarizeMask(renderedCoverage, width, height, config.alphaThreshold);
    const alpha = new Uint8Array(width * height);
    for (let outputOffset = 3, pixel = 0; outputOffset < output.length; outputOffset += 4, pixel += 1) {
      alpha[pixel] = output[outputOffset];
    }
    expectedCoverage = {
      id: config.coverageElementId,
      alpha,
      visiblePixels,
    };
  }

  const qcSummary = await runMaskExportQc({
    masksDir: config.outputMasksDir,
    width,
    height,
    expectedPieces: config.expectedPieces,
    rows: 3,
    columns: 3,
    expectedCoverage,
  });
  const reportPath = path.join(config.outputMasksDir, 'mask_export_report.md');
  await writeMaskExportReport({
    reportPath,
    config,
    source: { width, height, viewBox },
    outputs,
    qcSummary,
  });

  return {
    status: qcSummary.status,
    reportPath,
    masksDir: config.outputMasksDir,
    width,
    height,
    outputs,
    qcSummary,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.config) throw new Error(`Missing --config.\n${usage()}`);

  const configPath = path.resolve(repoRoot, args.config);
  const rawConfig = JSON.parse(await readFile(configPath, 'utf8'));
  const config = normalizeConfig(rawConfig);
  const errors = validateConfig(config);
  if (errors.length > 0) throw new Error(`Invalid SVG mask export config:\n- ${errors.join('\n- ')}`);

  const result = await exportSvgToMasks(config);
  console.log(`[IslandPuzzleFactory][SvgMaskExport] ${result.status}: ${path.relative(repoRoot, result.masksDir)}`);
  console.log(`[IslandPuzzleFactory][SvgMaskExport] Report: ${path.relative(repoRoot, result.reportPath)}`);
  if (result.status !== 'PASS') process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[IslandPuzzleFactory][SvgMaskExport][ERROR] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
