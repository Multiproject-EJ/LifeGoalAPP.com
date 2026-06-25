const PROHIBITED_FIELDS = new Set([
  'reward', 'rewards', 'coins', 'dice', 'essence', 'tickets', 'probability', 'rarity',
  'creatureStats', 'inventory', 'tileIndex', 'tileIndices', 'completeStop', 'resolveBoss',
  'awardReward', 'travel', 'buildSpend', 'callback', 'callbacks', 'mutation', 'mutations',
  'action', 'actionId', 'gameplayAction',
]);

export type IslandStoryManifestValidationResult = { valid: boolean; errors: string[] };

export type IslandStoryManifestValidationOptions = {
  assetExists?: (absolutePublicPath: string) => boolean;
};

export function validateIslandStoryManifest(
  manifest: unknown,
  options: IslandStoryManifestValidationOptions = {},
): IslandStoryManifestValidationResult {
  const errors: string[] = [];
  rejectProhibitedFields(manifest, 'manifest', errors);
  if (!isObject(manifest)) return { valid: false, errors: ['manifest must be an object'] };
  if (typeof manifest.id !== 'string' || !manifest.id.trim()) errors.push('manifest.id must be a non-empty string');
  if (typeof manifest.title !== 'string' || !manifest.title.trim()) errors.push('manifest.title must be a non-empty string');
  if (!Array.isArray(manifest.panels) || manifest.panels.length === 0) {
    errors.push('manifest.panels must be a non-empty array');
  } else {
    manifest.panels.forEach((panel, index) => validatePanel(panel, index, options, errors));
  }
  return { valid: errors.length === 0, errors };
}

function validatePanel(panel: unknown, index: number, options: IslandStoryManifestValidationOptions, errors: string[]): void {
  if (!isObject(panel)) { errors.push(`panels[${index}] must be an object`); return; }
  if (!['image', 'video', 'text'].includes(String(panel.type))) errors.push(`panels[${index}].type is unsupported: ${String(panel.type)}`);
  if (panel.type === 'text') {
    if (typeof panel.text !== 'string' || !panel.text.trim()) errors.push(`panels[${index}].text is required for text panels`);
  }
  if (panel.type === 'image' || panel.type === 'video') {
    if (typeof panel.src !== 'string' || !panel.src.trim()) errors.push(`panels[${index}].src is required for media panels`);
    else validatePublicPath(panel.src, `panels[${index}].src`, options, errors);
    if ('poster' in panel && typeof panel.poster === 'string') validatePublicPath(panel.poster, `panels[${index}].poster`, options, errors);
  }
}

function validatePublicPath(src: string, label: string, options: IslandStoryManifestValidationOptions, errors: string[]): void {
  if (!src.startsWith('/')) { errors.push(`${label} must be an absolute public path`); return; }
  if (options.assetExists && !options.assetExists(src)) errors.push(`${label} does not exist: ${src}`);
}

function rejectProhibitedFields(value: unknown, pathLabel: string, errors: string[]): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((item, index) => rejectProhibitedFields(item, `${pathLabel}[${index}]`, errors)); return; }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PROHIBITED_FIELDS.has(key)) errors.push(`${pathLabel}.${key} is prohibited in story manifests`);
    rejectProhibitedFields(child, `${pathLabel}.${key}`, errors);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
