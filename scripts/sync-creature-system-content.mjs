// One-way, explicit transplant of audited data/references. Does not modify the source checkout.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const input = process.argv[2];
if (!input) throw new Error('Pass the audited content-registry.json path');
const source = JSON.parse(fs.readFileSync(input, 'utf8'));
const root = process.cwd();
const snapshot = {
  version: source.version,
  provenance: { registrySha256: createHash('sha256').update(fs.readFileSync(input)).digest('hex'), sourceHashes: source.sourceInfo.sourceHashes },
  masks: source.masks.map(m => ({ id: m.id, name: m.name, suit: m.suit, emotions: m.emotions, drive: m.drive, stressBehavior: m.stressBehavior, growthStrategy: m.growthStrategy, productionAsset: null })),
  families: source.families.map(f => ({ id: f.id, number: f.referenceNumber, name: f.name, rarity: f.rarity, legacy: f.legacyCatalogMember,
    referenceArt: f.baseReference.path, emotions: f.emotions, expressionCue: f.expressionCue, mix: f.archetypeMix,
    ability: f.ability, forms: f.forms.map(form => ({ id: form.id, familyId: form.familyId, ordinal: form.ordinal, name: form.name, previousFormId: form.previousFormId, productionAsset: null })) })),
};
const transferred = [];
for (const family of source.families) {
  const relative = family.baseReference.path.replace(/^\//, '');
  if (relative.includes('..') || !relative.startsWith('assets/creatures/')) throw new Error('Unexpected reference path');
  const from = path.join(source.sourceInfo.repo, 'public', relative), to = path.join(root, 'public', relative);
  if (!fs.existsSync(to)) {
    const bytes = fs.readFileSync(from);
    if (createHash('sha256').update(bytes).digest('hex') !== family.baseReference.sha256) throw new Error('Source art changed: ' + relative);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    transferred.push(relative);
  }
}
fs.writeFileSync(path.join(root, 'src/features/creature-system/content.snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify({ masks: snapshot.masks.length, families: snapshot.families.length, forms: snapshot.families.flatMap(f => f.forms).length, transferred }, null, 2));
