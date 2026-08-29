import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

function readPngSize(path) {
  const buffer = readFileSync(join(root, path));
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const files = {
  contract: 'src/features/gamification/level-worlds/dev/VaultIslandLabContract.ts',
  lookdev: 'src/features/gamification/level-worlds/dev/VaultPremiumLookdev.ts',
  treasures: 'src/features/gamification/level-worlds/dev/VaultTreasureModels.ts',
  exterior: 'src/features/gamification/level-worlds/dev/VaultTreasureIslandModel.ts',
  interior: 'src/features/gamification/level-worlds/dev/VaultTreasureVaultInteriorModel.ts',
  islandLab: 'src/dev/VaultIslandLab.tsx',
  treasureLab: 'src/dev/VaultTreasureLab.tsx',
  board: 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
  productionModal: 'src/features/gamification/level-worlds/components/VaultIslandCollectionModal.tsx',
  productionModalStyles: 'src/features/gamification/level-worlds/components/VaultIslandCollectionModal.css',
  customization: 'src/features/gamification/level-worlds/services/islandRunVaultCustomization.ts',
  exteriorV2: 'src/features/gamification/level-worlds/dev/VaultTreasureIslandModelV2.ts',
  main: 'src/main.tsx',
  handoff: 'docs/visual-references/island-special-vault-treasure/integration-handoff.v1.json',
  packageJson: 'package.json',
};

const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));
const handoff = JSON.parse(source.handoff);
const completionAudit = JSON.parse(read(handoff.completionAudit ?? ''));
const packageJson = JSON.parse(source.packageJson);
const browserCaptureManifest = JSON.parse(read(handoff.browserQaEvidence?.captureManifest ?? ''));
const productionQaManifest = JSON.parse(read(handoff.productionQaEvidence?.manifest ?? ''));
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function uniqueMatches(text, regex) {
  return [...text.matchAll(regex)].map((match) => match[1]).filter((value, index, all) => all.indexOf(value) === index);
}

function includesText(values, expected) {
  return Array.isArray(values) && values.some((value) => typeof value === 'string' && value.includes(expected));
}

const treasureIds = uniqueMatches(source.treasures, /id:\s*'([^']+)'/g);
const socketNodeNames = uniqueMatches(source.contract, /sceneNodeName:\s*'([^']+)'/g);
const discoveryTargets = uniqueMatches(source.contract, /targetTreasureId:\s*'([^']+)'/g);
const discoveryModes = uniqueMatches(source.contract, /mode:\s*'([^']+)'/g);
const interiorUsesSocketContract =
  source.interior.includes('VAULT_TREASURE_PLACEMENT_SOCKETS') &&
  source.interior.includes('socket?.sceneNodeName');

assert(treasureIds.length === 8, `Expected 8 treasure definitions, found ${treasureIds.length}.`);
for (const id of ['crown', 'compass', 'obelisk', 'egg', 'hourglass', 'key', 'medallion', 'chalice']) {
  assert(treasureIds.includes(id), `Missing treasure definition: ${id}.`);
  assert(discoveryTargets.includes(id), `Missing discovery rule target for treasure: ${id}.`);
  assert(source.contract.includes(`acceptedTreasureIds: ['${id}']`) || source.contract.includes(`'${id}'`), `Missing placement socket support for treasure: ${id}.`);
  assert(interiorUsesSocketContract || source.interior.includes(`vault-interior-display-${id}`), `Interior model does not create display node for treasure: ${id}.`);
}

for (const mode of ['roll-search', 'hotspot', 'riddle', 'mission']) {
  assert(discoveryModes.includes(mode), `Missing discovery mode: ${mode}.`);
}

for (const route of ['/dev/vault-island-lab', '/dev/vault-island-lab?view=atrium', '/dev/vault-island-lab?view=vault', '/dev/vault-treasure-lab']) {
  assert(source.contract.includes(route), `Contract is missing route ${route}.`);
}

assert(handoff.schemaVersion === 1, 'Integration handoff must use schemaVersion 1.');
assert(handoff.status === 'production-presentation-integrated-browser-qa-captured', 'Integration handoff must record production presentation integration and browser QA capture.');
assert(handoff.labCompletionStatus === 'complete-and-quality-gated', 'Integration handoff must record the completed phone-lab gate.');
assert(completionAudit.overallStatus === 'achieved-for-phone-lab', 'Completion audit must prove the phone-lab objective.');
assert(completionAudit.requirements?.length >= 10, 'Completion audit must cover the full phone-lab requirement set.');
assert(completionAudit.requirements?.every((requirement) => requirement.status.startsWith('proven')), 'Every completion-audit requirement must be proven.');
assert(handoff.sourceAuthority?.sha256 === '5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57', 'Integration handoff source hash is incorrect.');
assert(handoff.devRoutes?.exterior === '/dev/vault-island-lab', 'Integration handoff exterior route is incorrect.');
assert(handoff.devRoutes?.atrium === '/dev/vault-island-lab?view=atrium', 'Integration handoff atrium route is incorrect.');
assert(handoff.devRoutes?.interior === '/dev/vault-island-lab?view=vault', 'Integration handoff interior route is incorrect.');
assert(handoff.devRoutes?.treasureLab === '/dev/vault-treasure-lab', 'Integration handoff treasure lab route is incorrect.');

for (const path of Object.values(files).filter((path) => path.startsWith('src/'))) {
  assert(Object.values(handoff.implementationFiles ?? {}).includes(path), `Integration handoff does not list implementation file: ${path}.`);
}

assert(handoff.treasureCadence?.majorTreasureEveryApproxIslands === 4, 'Integration handoff treasure cadence must preserve the roughly every-fourth-island rule.');
assert(handoff.treasureCadence?.estimatedMajorTreasuresAcross120Islands === 30, 'Integration handoff treasure cadence must preserve the 30-major-treasure estimate.');
assert(handoff.integrationBoundaries?.currentAuthority === 'read-only production presentation plus dev-lab visual/runtime code', 'Integration handoff must keep production authority presentation-only.');
assert(handoff.integrationBoundaries?.futureGameplayAuthority === 'canonical Island Run action services', 'Integration handoff must route future gameplay through canonical Island Run action services.');
assert(includesText(handoff.integrationBoundaries?.mustNotDoInUi, 'No direct Island Run runtime-state gameplay writes'), 'Integration handoff must forbid direct Island Run runtime-state gameplay writes.');
assert(includesText(handoff.integrationBoundaries?.mustNotDoInUi, 'No coupling treasure discovery to fixed board tile indices'), 'Integration handoff must forbid fixed tile-index coupling.');

for (const check of [
  'node scripts/check-vault-island-lab-contract.mjs',
  'node scripts/check-vault-island-model-runtime.mjs',
  'node scripts/capture-vault-island-browser-qa.mjs',
  'targeted TypeScript check for Vault lab modules',
  'vite build',
]) {
  assert(includesText(handoff.repeatableChecks, check), `Integration handoff is missing repeatable check: ${check}.`);
}

assert(handoff.browserQaHook?.globalName === 'window.__vaultIslandLabQa', 'Integration handoff must document window.__vaultIslandLabQa.');
for (const field of ['view', 'quality', 'isReady', 'frameCount', 'canvasWidth', 'canvasHeight', 'sampledPixels', 'variedPixelPairs', 'clickableDisplays', 'selectedTreasureId', 'revealRun', 'inspectedDisplay', 'collectionValue', 'perimeterStyle', 'lastPointerHit', 'route']) {
  assert(handoff.browserQaHook?.expectedFields?.includes(field), `Integration handoff QA hook is missing expected field: ${field}.`);
}
assert(handoff.treasureLabQaHook?.globalName === 'window.__vaultTreasureLabQa', 'Integration handoff must document window.__vaultTreasureLabQa.');
assert(source.islandLab.includes('vault-island-lab__perimeter-selector'), 'Vault Island lab must expose the perimeter customization control.');
assert(source.islandLab.includes('saveVaultIslandPerimeterStyle'), 'Vault Island lab must persist the selected cosmetic through the presentation service.');
assert(source.customization.includes("['charms', 'garden', 'gold-castle']"), 'Vault Island customization service must define all three perimeter styles.');
for (const field of ['selectedTreasureId', 'inspectMode', 'revealRun', 'frameCount', 'canvasWidth', 'canvasHeight', 'treasureCount', 'museumValue']) {
  assert(handoff.treasureLabQaHook?.expectedFields?.includes(field), `Integration handoff Treasure Lab QA hook is missing expected field: ${field}.`);
}

assert(browserCaptureManifest.schemaVersion === 1, 'Browser capture manifest must use schemaVersion 1.');
assert(browserCaptureManifest.viewport?.width === 390 && browserCaptureManifest.viewport?.height === 844, 'Browser capture manifest must use a 390x844 viewport.');
assert(browserCaptureManifest.diagnostics?.length === 0, 'Browser capture manifest must not contain diagnostics for the accepted capture run.');
for (const capture of [
  'exterior',
  'atrium',
  'vault-initial',
  'vault-after-discovery-1',
  'vault-after-reveal',
  'treasure-lab-initial',
  'treasure-lab-after-reveal',
  'treasure-lab-inspect',
  'treasure-lab-pointer-inspect',
  'treasure-lab-hourglass',
  'treasure-lab-key',
  'treasure-lab-medallion',
  'treasure-lab-chalice',
]) {
  const record = browserCaptureManifest.captures?.find((entry) => entry.label === capture);
  assert(Boolean(record), `Browser capture manifest is missing capture: ${capture}.`);
  if (record?.path) {
    assert(existsSync(join(root, record.path)), `Browser capture image is missing: ${record.path}.`);
    assert(statSync(join(root, record.path)).size > 40000, `Browser capture image appears too small/blank: ${record.path}.`);
    const pngSize = readPngSize(record.path);
    assert(pngSize?.width === 390 && pngSize?.height === 844, `Browser capture image must be 390x844: ${record.path}.`);
  }
}
for (const interaction of [
  'click-enter-palace',
  'click-descend-to-vault',
  'click-discovery-1',
  'click-discovery-2',
  'click-vault-reveal',
  'click-treasure-lab-sapphire-compass',
  'click-treasure-lab-reveal',
  'click-treasure-lab-inspect',
  'click-treasure-lab-gallery',
  'click-treasure-lab-canvas-selected',
  'click-treasure-lab-pointer-gallery',
  'click-treasure-lab-hourglass',
  'click-treasure-lab-key',
  'click-treasure-lab-medallion',
  'click-treasure-lab-chalice',
  'click-treasure-lab-chalice-reveal',
]) {
  const record = browserCaptureManifest.interactions?.find((entry) => entry.label === interaction);
  assert(record?.result?.ok === true, `Browser capture manifest is missing successful interaction: ${interaction}.`);
}
const exteriorQa = browserCaptureManifest.qaSnapshots?.find((entry) => entry.label === 'exterior-ready')?.snapshot;
const atriumQa = browserCaptureManifest.qaSnapshots?.find((entry) => entry.label === 'atrium-ready')?.snapshot;
const vaultQa = browserCaptureManifest.qaSnapshots?.find((entry) => entry.label === 'vault-ready')?.snapshot;
const vaultRevealQa = browserCaptureManifest.qaSnapshots?.find((entry) => entry.label === 'vault-after-reveal')?.snapshot;
const treasureLabQa = browserCaptureManifest.qaSnapshots?.find((entry) => entry.label === 'treasure-lab-dom-state')?.snapshot;
const treasureInspectQa = browserCaptureManifest.qaSnapshots?.find((entry) => entry.label === 'treasure-lab-inspect-ready')?.snapshot;
const treasurePointerInspectQa = browserCaptureManifest.qaSnapshots?.find((entry) => entry.label === 'treasure-lab-pointer-inspect-ready')?.snapshot;
assert(exteriorQa?.canvasWidth === 390 && exteriorQa?.canvasHeight === 844 && exteriorQa?.variedPixelPairs >= 2, 'Exterior browser QA snapshot must prove a varied 390x844 canvas.');
assert(atriumQa?.view === 'atrium' && atriumQa?.canvasWidth === 390 && atriumQa?.canvasHeight === 844 && atriumQa?.variedPixelPairs >= 2, 'Atrium browser QA snapshot must prove the palace descent on a varied 390x844 canvas.');
assert(vaultQa?.view === 'vault' && vaultQa?.canvasWidth === 390 && vaultQa?.canvasHeight === 844 && vaultQa?.clickableDisplays >= 8, 'Vault browser QA snapshot must prove eight clickable displays on a 390x844 canvas.');
assert(vaultRevealQa?.revealRun >= 3 && vaultRevealQa?.selectedTreasureId === 'obelisk', 'Vault reveal QA snapshot must prove discovery and reveal progression.');
assert(treasureLabQa?.title === 'Sapphire Astrolabe' && treasureLabQa?.activeDock === 'Sapphire' && treasureLabQa?.canvasSize?.width === 390 && treasureLabQa?.canvasSize?.height === 844, 'Treasure lab QA snapshot must prove the selected Sapphire Astrolabe on a 390x844 canvas.');
assert(treasureLabQa?.qa?.treasureCount === 8 && treasureLabQa?.qa?.museumValue === 9200, 'Treasure lab QA hook must prove eight treasures and the selected relic museum value.');
assert(treasureInspectQa?.inspectMode === true && treasureInspectQa?.selectedTreasureId === 'compass', 'Treasure lab Inspect command must open the Sapphire Astrolabe close-up.');
assert(treasurePointerInspectQa?.inspectMode === true && treasurePointerInspectQa?.selectedTreasureId === 'compass' && treasurePointerInspectQa?.revealRun >= 3, 'Direct 3D treasure pointer click must open inspect mode and trigger a reveal.');

assert(productionQaManifest.schemaVersion === 1, 'Production QA manifest must use schemaVersion 1.');
for (const check of ['boardMenuEntryVisible', 'topLevelDialogPortalVisible', 'closeControlVisible', 'viewportFill', 'documentScrollLocked', 'closeReturnsToBoard', 'escapeReturnsToBoard', 'webglUnavailableFallbackVisible']) {
  assert(productionQaManifest.checks?.[check] === true, `Production QA manifest is missing successful check: ${check}.`);
}
assert(productionQaManifest.checks?.gameplayWrites === false, 'Production Vault Island presentation must remain write-free.');
assert(existsSync(join(root, productionQaManifest.capture ?? '')), 'Production QA screenshot is missing.');
assert(statSync(join(root, productionQaManifest.capture ?? '')).size > 40000, 'Production QA screenshot appears too small.');

for (const gate of ['canonical action service', 'Island Visual Production approval gates']) {
  assert(includesText(handoff.remainingApprovalGates, gate), `Integration handoff is missing remaining production gate: ${gate}.`);
}

assert(source.main.includes("const VAULT_ISLAND_LAB_PATH = '/dev/vault-island-lab';"), 'main.tsx is missing Vault Island lab route wiring.');
assert(source.main.includes("const VAULT_TREASURE_LAB_PATH = '/dev/vault-treasure-lab';"), 'main.tsx is missing Vault Treasure lab route wiring.');
assert(source.islandLab.includes('VAULT_TREASURE_DISCOVERY_RULES.map'), 'VaultIslandLab does not render discovery rules from the contract.');
assert(source.islandLab.includes('setSelectedTreasureId(rule.targetTreasureId)'), 'VaultIslandLab discovery rule buttons do not select their target treasure.');
assert(source.treasureLab.includes('VAULT_ISLAND_LAB_ROUTES.interior'), 'VaultTreasureLab does not use the shared interior route.');
assert(source.treasureLab.includes('__vaultTreasureLabQa'), 'VaultTreasureLab must expose the inspect/runtime QA snapshot.');
assert(source.treasureLab.includes('setIsInspecting'), 'VaultTreasureLab must expose an inspect-mode interaction.');
assert(source.treasureLab.includes("click-treasure-lab") || source.treasureLab.includes('handlePointerDown'), 'VaultTreasureLab must support direct 3D pointer selection.');
assert(source.islandLab.includes('inspectionTarget'), 'VaultIslandLab must move selected relics to a central inspection position.');
assert(source.islandLab.includes('vault-room-luxury-reveal-rings'), 'VaultIslandLab must provide the luxury reveal-ring celebration.');
assert(source.islandLab.includes('collectionValue'), 'VaultIslandLab must expose the lab-derived collection value.');
assert(packageJson.scripts?.['check:vault-island-lab'] === 'node scripts/check-vault-island-lab-contract.mjs', 'package.json is missing check:vault-island-lab script.');
assert(packageJson.scripts?.['check:vault-island-runtime'] === 'node scripts/check-vault-island-model-runtime.mjs', 'package.json is missing check:vault-island-runtime script.');
assert(packageJson.scripts?.['check:vault-island-browser-qa'] === 'node scripts/capture-vault-island-browser-qa.mjs', 'package.json is missing check:vault-island-browser-qa script.');
assert(source.islandLab.includes('__vaultIslandLabQa'), 'VaultIslandLab must expose the runtime QA snapshot on window.__vaultIslandLabQa.');
assert(source.islandLab.includes('gl.readPixels'), 'VaultIslandLab runtime QA must sample WebGL pixels.');
assert(source.islandLab.includes('clickableDisplays'), 'VaultIslandLab runtime QA must report clickable treasure display count.');
assert(source.islandLab.includes('lastPointerHit'), 'VaultIslandLab runtime QA must report pointer hit state.');
assert(source.islandLab.includes("setRenderError('Interactive 3D is unavailable on this device.')"), 'VaultIslandLab must keep the production modal usable when WebGL is unavailable.');
assert(existsSync(join(root, 'public/assets/islands/special/vault-island/vault-island-fallback.png')), 'Vault Island WebGL fallback artwork is missing.');
assert(statSync(join(root, 'public/assets/islands/special/vault-island/vault-island-fallback.png')).size > 500000, 'Vault Island WebGL fallback artwork is unexpectedly small.');
assert(source.board.includes("lazy(() => import('./VaultIslandCollectionModal'))"), 'Island Run Board must lazy-load the Vault Island production modal.');
assert(source.board.includes('Vault Island collection'), 'Island Run Board menu is missing the Vault Island collection entry.');
assert(source.board.includes('showVaultIslandCollection ||'), 'Vault Island production modal must pause board interaction through doesModalOwnAttention.');
assert(source.productionModal.includes('createPortal(') && source.productionModal.includes('document.body'), 'Vault Island production modal must render through a top-level portal.');
assert(source.productionModal.includes('lockFullscreenPageScroll({ root: true })'), 'Vault Island production modal must lock background page scrolling.');
assert(source.productionModal.includes('aria-modal="true"'), 'Vault Island production modal must expose modal semantics.');
assert(source.productionModalStyles.includes('position: fixed') && source.productionModalStyles.includes('inset: 0'), 'Vault Island production modal must be viewport anchored.');
assert(source.contract.includes("entrySurface: 'island-run-board-menu'"), 'Vault Island contract must record the production Board menu entry.');
assert(source.contract.includes("collectionMode: 'read-only-authored-preview'"), 'Vault Island production presentation must remain a read-only authored preview.');
assert(source.exteriorV2.includes("'/assets/islands/special/vault-island/vault-palace.glb'"), 'Exterior v2 must load the stable production palace GLB.');
for (const exteriorDetail of [
  'vault-v2-source-led-ceremonial-garden-axis',
  'vault-v2-ceremonial-axis-warm-lantern-marker',
  'vault-v2-fountain-radial-prismatic-crystal-crown',
  'vault-v2-fountain-luminous-inner-crystal-core',
  'vault-v2-fountain-cyan-heart-light',
  'vault-v2-marina-gate-curved-gilded-wing-rail',
  'vault-v2-wet-natural-shoreline-rock',
  'vault-v2-rock-contact-foam-ribbon',
  'vault-v2-horizon-island-limestone-villa',
  'vault-v2-blender-palace-v016',
]) {
  assert(source.exteriorV2.includes(exteriorDetail), `Exterior v2 is missing accepted source-fidelity detail: ${exteriorDetail}.`);
}

for (const nodeName of socketNodeNames) {
  const appearsInModel = source.interior.includes(nodeName) || source.exterior.includes(nodeName);
  assert(appearsInModel || interiorUsesSocketContract, `Placement socket scene node is not created by any model: ${nodeName}.`);
}

for (const nodeName of [
  'vault-treasure-island-lab-model',
  'vault-treasure-palace-atrium-model',
  'vault-treasure-island-interior-model',
  'vault-interior-main-treasure-displays',
]) {
  assert(source.exterior.includes(nodeName) || source.interior.includes(nodeName), `Required scene node group is missing: ${nodeName}.`);
}

for (const key of ['treasureId', 'vaultInteriorDisplay']) {
  assert(source.islandLab.includes(key) || source.interior.includes(key), `Clickable userData key is missing: ${key}.`);
}

for (const forbidden of ['persistIslandRunRuntimeStatePatch', 'islandRunRuntimeState']) {
  for (const [key, text] of Object.entries({
    contract: source.contract,
    exterior: source.exterior,
    interior: source.interior,
    islandLab: source.islandLab,
    treasureLab: source.treasureLab,
    productionModal: source.productionModal,
  })) {
    assert(!text.includes(forbidden), `Forbidden gameplay write/coupling token "${forbidden}" found in ${files[key]}.`);
  }
}

assert(!source.contract.includes("futureGameplayAuthority: 'legacy"), 'Contract must not route future authority through legacy gameplay paths.');
assert((source.contract.match(/futureGameplayAuthority:\s*'canonical-island-run-action-service'/g) ?? []).length >= 4, 'Discovery rules must declare canonical future gameplay authority.');
assert((source.contract.match(/labOnly:\s*true/g) ?? []).length >= 4, 'Discovery rules must be marked labOnly.');
assert(source.contract.includes('majorTreasureEveryApproxIslands: 4'), 'Treasure cadence must preserve the roughly every-fourth-island rule.');
assert(source.contract.includes('estimatedMajorTreasuresAcross120Islands: 30'), 'Treasure cadence must preserve the 30-major-treasure estimate.');

if (failures.length > 0) {
  console.error('Vault Island lab contract check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Vault Island lab contract check passed.');
console.log(`Treasures: ${treasureIds.join(', ')}`);
console.log(`Discovery modes: ${discoveryModes.join(', ')}`);
console.log(`Placement sockets checked: ${socketNodeNames.length}`);
