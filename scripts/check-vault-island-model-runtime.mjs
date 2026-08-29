import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const tempRoot = join(root, 'work/tmp');
mkdirSync(tempRoot, { recursive: true });
const outRoot = mkdtempSync(join(tempRoot, 'vault-island-runtime-check-'));

const moduleMap = new Map([
  [
    'src/features/gamification/level-worlds/services/islandRunVaultRush.ts',
    'src/features/gamification/level-worlds/services/islandRunVaultRush.mjs',
  ],
  [
    'src/features/gamification/level-worlds/services/islandRunVaultCollection.ts',
    'src/features/gamification/level-worlds/services/islandRunVaultCollection.mjs',
  ],
  [
    'src/features/gamification/level-worlds/dev/VaultPremiumLookdev.ts',
    'src/features/gamification/level-worlds/dev/VaultPremiumLookdev.mjs',
  ],
  [
    'src/features/gamification/level-worlds/dev/VaultTreasureModels.ts',
    'src/features/gamification/level-worlds/dev/VaultTreasureModels.mjs',
  ],
  [
    'src/features/gamification/level-worlds/dev/VaultIslandLabContract.ts',
    'src/features/gamification/level-worlds/dev/VaultIslandLabContract.mjs',
  ],
  [
    'src/features/gamification/level-worlds/dev/VaultTreasureInteriorArchitectureV3.ts',
    'src/features/gamification/level-worlds/dev/VaultTreasureInteriorArchitectureV3.mjs',
  ],
  [
    'src/features/gamification/level-worlds/services/islandRunVaultCustomization.ts',
    'src/features/gamification/level-worlds/services/islandRunVaultCustomization.mjs',
  ],
  [
    'src/features/gamification/level-worlds/dev/VaultTreasureIslandModel.ts',
    'src/features/gamification/level-worlds/dev/VaultTreasureIslandModel.mjs',
  ],
  [
    'src/features/gamification/level-worlds/dev/VaultTreasureIslandModelV2.ts',
    'src/features/gamification/level-worlds/dev/VaultTreasureIslandModelV2.mjs',
  ],
  [
    'src/features/gamification/level-worlds/dev/VaultTreasureVaultInteriorModel.ts',
    'src/features/gamification/level-worlds/dev/VaultTreasureVaultInteriorModel.mjs',
  ],
]);

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function rewriteImports(js) {
  let output = js;
  for (const [sourcePath, compiledPath] of moduleMap) {
    const sourceStem = sourcePath.replace(/\.ts$/, '');
    const compiledStem = compiledPath.replace(/\.mjs$/, '');
    const localName = sourceStem.split('/').at(-1);
    output = output.replaceAll(`'./${localName}'`, `'./${localName}.mjs'`);
    output = output.replaceAll(`"./${localName}"`, `"./${localName}.mjs"`);
    output = output.replaceAll(`'../services/${localName}'`, `'../services/${localName}.mjs'`);
    output = output.replaceAll(`"../services/${localName}"`, `"../services/${localName}.mjs"`);
    output = output.replaceAll(`'${sourceStem}'`, `'${compiledStem}.mjs'`);
    output = output.replaceAll(`"${sourceStem}"`, `"${compiledStem}.mjs"`);
  }
  return output;
}

function compileVaultModules() {
  for (const [sourcePath, compiledPath] of moduleMap) {
    const source = readFileSync(join(root, sourcePath), 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      },
      fileName: sourcePath,
      reportDiagnostics: true,
    });
    const diagnostics = result.diagnostics ?? [];
    assert(diagnostics.length === 0, `TypeScript transpile diagnostics for ${sourcePath}: ${diagnostics.map((diagnostic) => diagnostic.messageText).join(', ')}`);
    const outputPath = join(outRoot, compiledPath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, rewriteImports(result.outputText));
  }
}

function collectNames(rootObject) {
  const names = new Set();
  rootObject.traverse((child) => {
    if (child.name) names.add(child.name);
  });
  return names;
}

function countNamed(rootObject, name) {
  let count = 0;
  rootObject.traverse((child) => {
    if (child.name === name) count += 1;
  });
  return count;
}

function meshCount(rootObject) {
  let count = 0;
  rootObject.traverse((child) => {
    if (child.isMesh) count += 1;
  });
  return count;
}

function collectMaterialNames(rootObject) {
  const names = new Set();
  rootObject.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material?.name) names.add(material.name);
    });
  });
  return names;
}

function assertHasNames(names, expected, label) {
  for (const name of expected) {
    assert(names.has(name), `${label} is missing scene node: ${name}.`);
  }
}

compileVaultModules();

const modelsModule = await import(join(outRoot, 'src/features/gamification/level-worlds/dev/VaultTreasureModels.mjs'));
const contractModule = await import(join(outRoot, 'src/features/gamification/level-worlds/dev/VaultIslandLabContract.mjs'));
const exteriorModule = await import(join(outRoot, 'src/features/gamification/level-worlds/dev/VaultTreasureIslandModel.mjs'));
const interiorModule = await import(join(outRoot, 'src/features/gamification/level-worlds/dev/VaultTreasureVaultInteriorModel.mjs'));
const customizationModule = await import(join(outRoot, 'src/features/gamification/level-worlds/services/islandRunVaultCustomization.mjs'));

const {
  VAULT_TREASURE_DEFINITIONS,
  createVaultTreasureModel,
} = modelsModule;
const {
  VAULT_ISLAND_ACTION_READY_REQUIREMENTS,
  VAULT_ISLAND_MUSEUM_PRESENTATION,
  VAULT_TREASURE_DISCOVERY_RULES,
  VAULT_TREASURE_PLACEMENT_SOCKETS,
} = contractModule;
const { normalizeVaultIslandPerimeterStyle } = customizationModule;

assert(VAULT_TREASURE_DEFINITIONS.length === 8, 'Expected exactly eight authored vault treasure definitions.');
assert(VAULT_TREASURE_DISCOVERY_RULES.length >= 8, 'Expected at least eight vault discovery rules.');
assert(VAULT_TREASURE_PLACEMENT_SOCKETS.length >= 10, 'Expected at least ten vault placement sockets.');
assert(VAULT_ISLAND_ACTION_READY_REQUIREMENTS.visualOnlyDevLab === true, 'Vault action-ready requirements must remain visual-only for now.');
assert(VAULT_ISLAND_MUSEUM_PRESENTATION.gameplayWrites === false, 'Museum presentation contract must not permit gameplay writes.');
assert(VAULT_ISLAND_MUSEUM_PRESENTATION.selectedRelicMotion.includes('central-inspection-stage'), 'Museum presentation must require central relic inspection.');
assert(normalizeVaultIslandPerimeterStyle('garden') === 'garden', 'Garden must be a valid Vault Island perimeter style.');
assert(normalizeVaultIslandPerimeterStyle('gold-castle') === 'gold-castle', 'Gold castle must be a valid Vault Island perimeter style.');
assert(normalizeVaultIslandPerimeterStyle('invalid') === 'charms', 'Invalid Vault Island perimeter styles must fall back to charms.');
const blenderPalaceAsset = join(root, 'public/assets/islands/special/vault-island/vault-palace.glb');
assert(existsSync(blenderPalaceAsset), 'Exterior v2 is missing the Blender-authored palace GLB.');
assert(existsSync(blenderPalaceAsset) && statSync(blenderPalaceAsset).size > 1_000_000, 'Blender palace GLB is unexpectedly small.');

const exterior = exteriorModule.createVaultTreasureIslandModel({ quality: 'high', animated: true });
const exteriorNames = collectNames(exterior.root);
const exteriorMaterialNames = collectMaterialNames(exterior.root);
assert(exterior.root.userData.sculptRuntime?.id === 'vault-island-exterior-v2', 'Exterior model is missing v2 sculptRuntime id.');
assert(exterior.root.userData.sculptRuntime?.productionUnits === 18, 'Exterior v2 must expose the approved 18-unit production inventory.');
assert(meshCount(exterior.root) > 500, 'Exterior v2 should contain the palace, jewelry, garden, and inhabited cliff construction systems.');
assertHasNames(exteriorNames, [
  'vault-v2-ocean',
  'vault-v2-three-dimensional-sunset-sky-dome',
  'vault-v2-three-dimensional-sunset-sun',
  'vault-v2-three-dimensional-sunset-halo',
  'vault-v2-animated-golden-scattering-dome',
  'vault-v2-animated-three-dimensional-cloud-bank',
  'vault-v2-submerged-crystalline-seabed',
  'vault-v2-submerged-sunlit-reef-patch',
  'vault-v2-horizon-cliff-island',
  'vault-v2-sailboat',
  'vault-v2-massive-cliff-backing',
  'vault-v2-individual-ashlar-block',
  'vault-v2-lower-inhabited-gallery-bay',
  'vault-v2-upper-inhabited-gallery-bay',
  'vault-v2-visible-gallery-treasure',
  'vault-v2-grand-front-vault-portal',
  'vault-v2-vault-round-door',
  'vault-v2-marina-stair-and-gate',
  'vault-v2-marina-gate-sun-crest-ring',
  'vault-v2-marina-gate-curved-gilded-wing-rail',
  'vault-v2-articulated-charm-bracelet',
  'vault-v2-living-garden-perimeter',
  'vault-v2-solid-gold-castle-perimeter',
  'vault-v2-bracelet-inner-silver-rail',
  'vault-v2-bracelet-outer-silver-rail',
  'vault-v2-bracelet-openwork-gold-diagonal',
  'vault-v2-bracelet-openwork-silver-diagonal',
  'vault-v2-bracelet-gem-station',
  'vault-v2-hanging-faceted-charm',
  'vault-v2-formal-garden-lawn',
  'vault-v2-source-led-ceremonial-garden-axis',
  'vault-v2-ceremonial-axis-warm-lantern-marker',
  'vault-v2-ceremonial-axis-warm-path-light',
  'vault-v2-front-crystal-fountain',
  'vault-v2-fountain-radial-prismatic-crystal-crown',
  'vault-v2-fountain-central-prismatic-crystal',
  'vault-v2-fountain-luminous-inner-crystal-core',
  'vault-v2-fountain-cyan-heart-light',
  'vault-v2-garden-domed-pavilion',
  'vault-v2-palace-raised-podium',
  'vault-v2-blender-palace-mount',
], 'Exterior model');
assert(countNamed(exterior.root, 'vault-v2-lower-inhabited-gallery-bay') >= 10, 'Exterior v2 must expose a substantial occupied lower gallery floor.');
assert(countNamed(exterior.root, 'vault-v2-upper-inhabited-gallery-bay') >= 10, 'Exterior v2 must expose a substantial occupied upper gallery floor.');
assert(countNamed(exterior.root, 'vault-v2-bracelet-openwork-link-coupler') >= 8, 'Exterior v2 must read as a large-cadence articulated jewelry perimeter.');
assert(countNamed(exterior.root, 'vault-v2-horizon-cliff-island') === 4, 'Exterior v2 should retain a layered four-island 3D horizon.');
assert(countNamed(exterior.root, 'vault-v2-sailboat') === 3, 'Exterior v2 should include three animated sailboats.');
assert(countNamed(exterior.root, 'vault-v2-animated-three-dimensional-cloud-bank') === 7, 'Exterior v2 should include seven layered animated 3D sunset cloud banks.');
assert(countNamed(exterior.root, 'vault-v2-submerged-sunlit-reef-patch') === 6, 'Exterior v2 should include six submerged reef patches beneath the transparent ocean.');
assert(countNamed(exterior.root, 'vault-v2-horizon-island-limestone-villa') === 12, 'Exterior v2 should include twelve limestone villas across the inhabited horizon.');
assert(countNamed(exterior.root, 'vault-v2-wet-natural-shoreline-rock') === 28, 'Exterior v2 should include twenty-eight faceted wet shoreline rocks at high quality.');
assert(countNamed(exterior.root, 'vault-v2-rock-contact-foam-ribbon') === 20, 'Exterior v2 should include twenty shoreline-contact foam ribbons at high quality.');
assert(countNamed(exterior.root, 'vault-v2-marina-gate-curved-gilded-wing-rail') === 2, 'Exterior marina should include two curved gilded gate wings.');
assert(countNamed(exterior.root, 'vault-v2-marina-gate-curved-lower-wing-rail') === 2, 'Exterior marina should include two lower gate-wing rails.');
assert(countNamed(exterior.root, 'vault-v2-marina-gate-wing-end-pier') === 2, 'Exterior marina should terminate both gate wings with marble piers.');
assert(countNamed(exterior.root, 'vault-v2-fountain-radial-secondary-prismatic-crystal') === 5, 'Exterior crystal fountain should include five radial secondary prismatic crystals.');
assert(countNamed(exterior.root, 'vault-v2-fountain-arched-crystalline-water-jet') === 4, 'Exterior crystal fountain should include four arched water jets.');
assert(countNamed(exterior.root, 'vault-v2-ceremonial-axis-warm-lantern-marker') === 6, 'Exterior ceremonial axis should include six visible warm lantern markers.');
assert(countNamed(exterior.root, 'vault-v2-ceremonial-axis-warm-path-light') === 2, 'Exterior ceremonial axis should include two warm path lights at high quality.');
assert(countNamed(exterior.root, 'vault-v2-warm-architectural-light') === 6, 'Exterior palace and garden approach should include six warm architectural lights.');
assert(countNamed(exterior.root, 'vault-v2-garden-ring-planted-station') >= 12, 'Garden perimeter should contain a substantial planted ring.');
assert(countNamed(exterior.root, 'vault-v2-gold-castle-relief-panel') >= 12, 'Gold castle perimeter should contain a substantial relief-panel frieze.');
assert(countNamed(exterior.root, 'vault-v2-gold-castle-ornamental-tower') === 8, 'Gold castle perimeter should contain eight ornamental towers.');
assert(exteriorMaterialNames.has('vault-v2-weathered-honey-limestone'), 'Exterior masonry should retain weathered honey-limestone material variation.');
assert(exteriorMaterialNames.has('vault-v2-dressed-honey-limestone'), 'Exterior architecture should retain dressed honey-limestone surfaces.');
assert(exteriorMaterialNames.has('vault-v2-polished-warm-marble-trim'), 'Exterior should reserve polished warm marble for trim and circulation surfaces.');
assert(exteriorMaterialNames.has('vault-v2-royal-solid-gold'), 'Gold castle customization should use its bright solid-gold material.');
const exteriorOcean = exterior.root.getObjectByName('vault-v2-ocean');
const exteriorSky = exterior.root.getObjectByName('vault-v2-three-dimensional-sunset-sky-dome');
const exteriorGoldenSky = exterior.root.getObjectByName('vault-v2-animated-golden-scattering-dome');
assert(exteriorOcean?.isWater === true, 'Exterior ocean should use the reflective Three.js Water runtime.');
assert(exteriorSky?.isSky === true, 'Exterior atmosphere should use the analytic Three.js Sky runtime.');
assert(exteriorGoldenSky?.isMesh === true, 'Exterior atmosphere should layer a real procedural golden scattering dome.');
const charmPerimeter = exterior.root.getObjectByName('vault-v2-articulated-charm-bracelet');
const gardenPerimeter = exterior.root.getObjectByName('vault-v2-living-garden-perimeter');
const goldCastlePerimeter = exterior.root.getObjectByName('vault-v2-solid-gold-castle-perimeter');
assert(exterior.root.userData.perimeterStyle === 'charms', 'Exterior should default to the charm perimeter.');
assert(charmPerimeter?.visible === true && gardenPerimeter?.visible === false && goldCastlePerimeter?.visible === false, 'Only the default charm perimeter should initially render.');
exterior.setPerimeterStyle?.('garden');
assert(exterior.root.userData.perimeterStyle === 'garden' && gardenPerimeter?.visible === true && charmPerimeter?.visible === false, 'Garden perimeter selection should swap visible geometry immediately.');
exterior.setPerimeterStyle?.('gold-castle');
assert(exterior.root.userData.perimeterStyle === 'gold-castle' && goldCastlePerimeter?.visible === true && gardenPerimeter?.visible === false, 'Gold castle perimeter selection should swap visible geometry immediately.');
exterior.setPerimeterStyle?.('charms');
const oceanTimeBeforeUpdate = exteriorOcean.material.uniforms.time.value;
exterior.update(1.25);
assert(exteriorOcean.material.uniforms.time.value > oceanTimeBeforeUpdate, 'Exterior water time uniform should animate.');
assert(exteriorSky.material.uniforms.time.value === 1.25, 'Exterior sky cloud time uniform should animate.');
assert(exteriorGoldenSky.material.uniforms.time.value === 1.25, 'Exterior golden scattering time uniform should animate.');
exterior.dispose();

const atrium = interiorModule.createVaultTreasurePalaceAtriumModel({ quality: 'high', animated: true });
const atriumNames = collectNames(atrium.root);
assert(atrium.root.userData.sculptRuntime?.id === 'vault-treasure-palace-atrium', 'Atrium model is missing sculptRuntime id.');
assert(meshCount(atrium.root) > 140, 'Atrium model should contain monumental architecture, masonry, and split stairs.');
assertHasNames(atriumNames, [
  'vault-palace-atrium-monumental-two-floor-shell',
  'vault-palace-atrium-first-tall-floor-gallery',
  'vault-palace-atrium-second-tall-floor-gallery',
  'vault-palace-atrium-central-vault-descent-void',
  'vault-palace-atrium-left-garden-door',
  'vault-palace-atrium-right-garden-door',
  'vault-palace-atrium-royal-luxury-details',
  'vault-palace-atrium-dome-jewel-rosette',
], 'Palace atrium model');
assert(countNamed(atrium.root, 'vault-palace-atrium-split-descent-marble-step') >= 30, 'Atrium should have two substantial split staircase flights.');
atrium.update(1.8);
atrium.dispose();

const interior = interiorModule.createVaultTreasureVaultInteriorModel({ quality: 'high', animated: true });
const interiorNames = collectNames(interior.root);
assert(interior.root.userData.sculptRuntime?.id === 'vault-treasure-island-interior', 'Interior model is missing sculptRuntime id.');
assert(meshCount(interior.root) > 80, 'Interior model should contain enough meshes to be more than a placeholder.');
assertHasNames(interiorNames, [
  'vault-interior-chamber-shell',
  'vault-interior-grand-round-door',
  'vault-interior-main-treasure-displays',
  'vault-interior-sticker-relic-wall',
  'vault-interior-essence-ingot-stack',
  'vault-interior-collection-light-beams',
  'vault-interior-royal-relic-gallery-layer',
  'vault-interior-framed-velvet-relic-alcove',
], 'Interior model');
assert(countNamed(interior.root, 'vault-interior-framed-velvet-relic-alcove') === 8, 'Museum should provide one luxury alcove for every relic display.');
assert(countNamed(interior.root, 'vault-interior-relic-alcove-accession-plaque-face') === 8, 'Museum should provide one accession plaque face for every relic display.');

for (const socket of VAULT_TREASURE_PLACEMENT_SOCKETS) {
  assert(interiorNames.has(socket.sceneNodeName), `Interior runtime tree is missing placement socket node: ${socket.sceneNodeName}.`);
}

for (const treasure of VAULT_TREASURE_DEFINITIONS) {
  const displayName = `vault-interior-display-${treasure.id}`;
  assert(interiorNames.has(displayName), `Interior runtime tree is missing treasure display: ${displayName}.`);
  const matchingObjects = [];
  interior.root.traverse((child) => {
    if (child.userData.treasureId === treasure.id) matchingObjects.push(child);
  });
  assert(matchingObjects.length > 0, `Interior model has no clickable userData.treasureId nodes for ${treasure.id}.`);
}

assert(countNamed(interior.root, 'vault-interior-soft-spotlight-cone') >= 8, 'Interior should have at least eight spotlight cones.');
assert(countNamed(interior.root, 'vault-interior-individual-beveled-ashlar-block') >= 40, 'Interior should expose real cut-stone masonry blocks.');
assert(countNamed(interior.root, 'vault-interior-polished-marble-radial-tile') >= 20, 'Interior should expose polished radial floor tiles.');
const wealthStack = interior.root.getObjectByName('vault-interior-essence-ingot-stack');
assert(wealthStack?.userData.sculptRuntime?.holdingsValue === 89200, 'The standalone lab must retain its explicit showcase reserve.');
assert(wealthStack?.userData.sculptRuntime?.wealthTier === 'legendary', 'The showcase reserve must resolve to the legendary tier.');
assert(countNamed(interior.root, 'vault-interior-stacked-essence-ingot') === 56, 'The legendary reserve must render two bounded 28-ingot stacks.');
assert(countNamed(interior.root, 'vault-interior-floor-loose-coin') === 64, 'The legendary reserve must cap loose coins at 64.');
assert(countNamed(interior.root, 'vault-interior-loose-premium-gem') + countNamed(interior.root, 'vault-interior-floor-loose-cut-gem') === 26, 'The legendary reserve must cap premium gems at 26.');
interior.update(2.5);
interior.dispose();

const emptyInterior = interiorModule.createVaultTreasureVaultInteriorModel({ quality: 'high', holdingsValue: 0 });
assert(emptyInterior.root.userData.sculptRuntime?.wealthTier === 'empty', 'A zero balance must resolve to an empty reserve.');
assert(countNamed(emptyInterior.root, 'vault-interior-stacked-essence-ingot') === 0, 'A zero balance must not render fake ingots.');
assert(countNamed(emptyInterior.root, 'vault-interior-floor-loose-coin') === 0, 'A zero balance must not render fake coins.');
assert(countNamed(emptyInterior.root, 'vault-interior-loose-premium-gem') + countNamed(emptyInterior.root, 'vault-interior-floor-loose-cut-gem') === 0, 'A zero balance must not render fake gems.');
emptyInterior.dispose();

for (const treasure of VAULT_TREASURE_DEFINITIONS) {
  const model = createVaultTreasureModel(treasure.id);
  const names = collectNames(model.root);
  assert(model.root.userData.sculptRuntime?.clickable === true, `Treasure ${treasure.id} must expose clickable sculptRuntime metadata.`);
  assert(model.root.userData.treasureId === treasure.id, `Treasure ${treasure.id} root treasureId mismatch.`);
  assert(names.has(`treasure-${treasure.id}-pedestal`), `Treasure ${treasure.id} missing pedestal group.`);
  assert(meshCount(model.root) >= 5, `Treasure ${treasure.id} appears too sparse.`);
  model.dispose();
}

if (failures.length > 0) {
  console.error('Vault Island model runtime check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Vault Island model runtime check passed.');
console.log(`Exterior meshes: ${meshCount(exterior.root)}`);
console.log(`Interior sockets: ${VAULT_TREASURE_PLACEMENT_SOCKETS.length}`);
console.log(`Treasures checked: ${VAULT_TREASURE_DEFINITIONS.map((treasure) => treasure.id).join(', ')}`);
if (existsSync(outRoot)) rmSync(outRoot, { recursive: true, force: true });
