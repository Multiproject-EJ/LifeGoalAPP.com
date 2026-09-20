import { FAMILIES } from './content';
import { proposeLegacyTeam } from './matching';

type LegacyCreatureEntry = {
  creatureId: string; copies: number; formLevel?: number; bondLevel: number;
  bondXp: number; claimedBondMilestones: number[]; claimedFormRewards?: number[];
};
type LegacySnapshot = {
  activeCompanionId: string | null;
  creatureCollection: LegacyCreatureEntry[];
};

/** Read-only adapter/dry run, NOT a second save store. The original snapshot is returned intact.
 * Persistent trio fields, conflict resolution and rollback must be integrated in the canonical
 * Island Run record/action/persistence pipeline before apply is enabled.
 */
export function previewCreatureSystemMigration<T extends LegacySnapshot>(source: T) {
  const known = new Set(FAMILIES.map(f => f.id));
  const ownedIds = [...new Set(source.creatureCollection.filter(c => c.copies > 0).map(c => c.creatureId))];
  const proposal = proposeLegacyTeam(source.activeCompanionId, ownedIds);
  const legacyUnknownIds = ownedIds.filter(id => !known.has(id));
  const formConflicts = source.creatureCollection.flatMap(entry => {
    const family = FAMILIES.find(f => f.id === entry.creatureId);
    return family && (entry.formLevel ?? 1) > family.forms.length ? [{ id: entry.creatureId, savedForm: entry.formLevel, proposedCap: family.forms.length }] : [];
  });
  return { original: source, proposal, legacyUnknownIds, formConflicts,
    canApply: false as const,
    preservation: { ownership: 'unchanged', bonds: 'unchanged', rewards: 'unchanged', eggTimers: 'unchanged', unknownIds: 'retained' },
    blockers: ['Canonical trio persistence and cross-device conflict handling not implemented.', 'No roster merges or form truncation approved.', 'New team gameplay effects not enabled.'],
  };
}
