#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error(`Missing required argument ${name}`);
  }
  return process.argv[index + 1];
}

const skillRoot = resolve(readArg('--skill-root'));
const referencePath = resolve(readArg('--reference'));
const renderPath = resolve(readArg('--render'));
const specPath = resolve(readArg('--spec'));
const python = process.env.PYTHON || 'python3';

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const materialPipeline = spec.materialPipeline;
const materialGate = spec.materialGate;
const regions = Array.isArray(materialPipeline?.regions) ? materialPipeline.regions : [];
const gateFailures = [];

if (materialPipeline?.status !== 'proceed') {
  gateFailures.push('materialPipeline.status must be proceed');
}
if (materialGate?.passed !== true) {
  gateFailures.push('materialGate.passed must be true');
}
if (!regions.length) {
  gateFailures.push('materialPipeline must contain component-aware regions');
}
if ((materialGate?.comparisonCount ?? 0) < regions.length) {
  gateFailures.push(
    `materialGate comparisonCount ${materialGate?.comparisonCount ?? 0} is below region count ${regions.length}`,
  );
}
if (materialGate?.compatibility?.passed !== true) {
  gateFailures.push('materialGate compatibility checks must pass');
}

const diagnostic = spawnSync(
  python,
  [
    resolve(skillRoot, 'forge/stage4_review/diagnose_render.py'),
    '--reference',
    referencePath,
    '--render',
    renderPath,
    '--spec',
    specPath,
    '--pass-id',
    'form-refinement',
    '--json',
  ],
  { cwd: skillRoot, encoding: 'utf8' },
);

if (diagnostic.error) throw diagnostic.error;
if (!diagnostic.stdout.trim()) {
  throw new Error(`Legacy geometry diagnostic produced no JSON: ${diagnostic.stderr.trim()}`);
}

const legacy = JSON.parse(diagnostic.stdout);
const geometryFailures = Array.isArray(legacy.failures) ? legacy.failures : [];
const failures = [...geometryFailures, ...gateFailures];
const regionIds = regions.map((region) => region.regionId).filter(Boolean);
const result = {
  passed: failures.length === 0,
  checks: {
    ...legacy.checks,
    colorDelta: {
      gated: true,
      mode: 'component-aware-visible-footprint',
      legacyWholeFrameMode: 'advisory-only-known-limitation',
      comparisonCount: materialGate?.comparisonCount ?? 0,
      requiredRegionCount: regions.length,
      regionIds,
      materialGatePassed: materialGate?.passed === true,
      compatibilityPassed: materialGate?.compatibility?.passed === true,
    },
  },
  failures,
  maskWarnings: legacy.maskWarnings ?? [],
  renderHash: legacy.renderHash,
  materialGateHash: createHash('sha256')
    .update(JSON.stringify(materialGate ?? null))
    .digest('hex')
    .slice(0, 16),
  passId: 'material-pass',
  diagnosticBridge: {
    geometryAuthority: 'img2threejs diagnose_render.py',
    materialAuthority: 'img2threejs material_gate.py with per-region visible-footprint comparisons',
    reason:
      'The legacy five-cluster color check is documented as whole-frame and cannot represent eight named material families.',
  },
};

if (!Array.isArray(spec.tier1Results)) spec.tier1Results = [];
spec.tier1Results.push(result);
writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.passed ? 0 : 1;
