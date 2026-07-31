import type { StorySoundtrackConfig } from './storyTypes';

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/**
 * Story manifests may keep using existing original tracks without new metadata.
 * A recognizable classical composition is stricter: both the composition right
 * and the exact recording/master must be documented before runtime can play it.
 */
export function isStorySoundtrackClearedForPlayback(
  soundtrack: StorySoundtrackConfig | null | undefined,
): boolean {
  if (!soundtrack?.src) return false;
  if (soundtrack.sourceKind !== 'classic-repertoire') return true;

  const rights = soundtrack.rights;
  return Boolean(
    hasText(soundtrack.cueId)
      && hasText(rights?.composition.workTitle)
      && hasText(rights?.composition.composer)
      && hasText(rights?.composition.evidenceReference)
      && hasText(rights?.recording.evidenceReference)
      && (
        rights?.composition.basis === 'public-domain-confirmed'
        || rights?.composition.basis === 'licensed'
      )
      && (
        rights?.recording.basis === 'owned-master'
        || rights?.recording.basis === 'commissioned-master'
        || rights?.recording.basis === 'licensed-master'
      ),
  );
}

export function resolvePlayableStorySoundtrack(
  soundtrack: StorySoundtrackConfig | null | undefined,
): StorySoundtrackConfig | null {
  return isStorySoundtrackClearedForPlayback(soundtrack) ? soundtrack ?? null : null;
}
