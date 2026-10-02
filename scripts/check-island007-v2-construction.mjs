import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('/Users/ejmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Users/ejmac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
try {
  const page = await browser.newPage();
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(String(error)));
  await page.goto('http://127.0.0.1:5197/docs/gauntlets/island-007-v2/review/reef-motion-capture.html');
  const report = await page.evaluate(async () => {
    const base = '/src/features/gamification/level-worlds/dev/';
    const THREE = await import('/node_modules/three/build/three.module.js');
    const world = await import(base + 'Island7UnderwaterThreeWorld.ts');
    const { ISLAND_5_LANDMARKS } = await import(base + 'island5ThreePilotContract.ts');
    const { createIsland7PearlPalaceV2: palaceFactory } = await import(base + 'Island7PearlPalaceV2.ts');
    const { createIsland7NautilusHatcheryV2: hatchery } = await import(base + 'Island7NautilusHatcheryV2.ts');
    const { createIsland7OuterLandmarkV2: outer } = await import(base + 'Island7OuterLandmarksV2.ts');
    const { prepareIslandConstructionLevelDelta } = await import(base + 'IslandConstructionLevelDelta.ts');
    const rows = [], failures = [];
    function snapshot(root) {
      root.updateWorldMatrix(true, true);
      const result = [];
      root.traverse(node => {
        if (!node.isMesh) return;
        let hash = 2166136261;
        for (const attribute of [...Object.values(node.geometry.attributes), node.geometry.index].filter(Boolean)) {
          const a = attribute.array;
          for (const byte of new Uint8Array(a.buffer, a.byteOffset, a.byteLength)) hash = Math.imul(hash ^ byte, 16777619);
        }
        result.push([node.name, hash >>> 0, node.visible, ...node.matrixWorld.elements]);
      });
      return JSON.stringify(result);
    }
    for (const quality of ['low', 'medium', 'high']) for (const definition of ISLAND_5_LANDMARKS) for (const level of [0, 1, 2]) {
      const resources = new Set(), rowErrors = [];
      const palette = world.createIsland7UnderwaterMaterials();
      Object.values(palette).forEach(m => { if (m?.dispose) resources.add(m); });
      const build = (value, constructionPreview) => world.buildIsland7UnderwaterLandmark(definition, value, quality, palette, {
        constructionPreview, palaceFactory,
        outerFactory: (id, l, q) => id === 'hatchery' ? hatchery(l, q, undefined, 0) : outer(id, l, q, false, 0),
      });
      const current = build(level, 'current'), target = build(level + 1, 'target');
      const collect = root => root.traverse(node => { if (!node.isMesh) return; resources.add(node.geometry); (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => resources.add(m)); });
      collect(current); collect(target);
      const fundedBefore = snapshot(current);
      const delta = prepareIslandConstructionLevelDelta({ currentRoot: current, targetRoot: target });
      collect(target);
      if (!delta.revealParts.length) rowErrors.push('No additive reveal parts');
      if (level > 0 && delta.retainedMeshCount === 0) rowErrors.push('No funded meshes recognized');
      for (const progress of [0, .2, .4, .6, .8, 1]) {
        delta.applyProgress(progress, { working: true });
        delta.applyCommissioningScale(1.1, false);
        delta.applyCommissioningScale(1.1, true);
        if (delta.revealParts.some(p => !p.temporary && !p.mesh.scale.equals(p.baseScale))) rowErrors.push('Reduced-motion commissioning changed scale');
        if (snapshot(current) !== fundedBefore) rowErrors.push('Funded geometry/transform/visibility mutated');
        target.traverse(node => {
          if (!node.matrix.elements.every(Number.isFinite)) rowErrors.push('Nonfinite matrix');
          if (!node.isMesh) return;
          for (const attr of Object.values(node.geometry.attributes)) if (!Array.from(attr.array).every(Number.isFinite)) rowErrors.push('Nonfinite geometry');
        });
      }
      delta.applyProgress(1, { working: false });
      if (delta.revealParts.some(p => p.temporary && p.mesh.visible)) rowErrors.push('Temporary rig visible at completion');
      if (delta.revealParts.some(p => !p.temporary && !p.mesh.visible)) rowErrors.push('Permanent reveal hidden at completion');
      const row = { id: definition.id, quality, from: level, to: level + 1, retained: delta.retainedMeshCount, additive: delta.additiveMeshCount, stages: delta.stageCounts, revealBatches: delta.revealBatchCount, temporaryParts: delta.revealParts.filter(p => p.temporary).length, failures: [...new Set(rowErrors)] };
      rows.push(row); failures.push(...row.failures.map(message => `${definition.id}/${quality}/${level}: ${message}`));
      resources.forEach(resource => resource.dispose());
    }
    return { scope: 'Actual Vite browser factory/wrapper/construction-delta execution; day materials; no pixel or shader-render approval', rows, failures };
  });
  report.browserErrors = browserErrors;
  report.passed = report.failures.length === 0 && browserErrors.length === 0;
  mkdirSync('docs/gauntlets/island-007-v2/qa/v2-closeout', { recursive: true });
  writeFileSync('docs/gauntlets/island-007-v2/qa/v2-closeout/construction.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, cases: report.rows.length, failures: report.failures, browserErrors }));
  if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); }
