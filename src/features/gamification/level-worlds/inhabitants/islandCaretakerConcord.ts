import { island001ConversationDefinitions, island001InhabitantTopicDefinitions } from './definitions/island001Conversations';
import { island001InhabitantDefinitions } from './definitions/island001Inhabitants';
import {
  authoredCaretakerConcordEntries,
  buildFallbackCaretakerConcordContentEntry,
  type IslandCaretakerConcordContentEntry,
} from './definitions/islandCaretakerConcordContent';

/**
 * Resolves the caretaker Concord conversation content for any island.
 *
 * Island 1 reuses the canonical Luma content (the pre-Concord acquisition
 * story). Islands 2-5 use authored entries; islands 6+ fall back to generated
 * content so the caretaker modal works everywhere. Results are memoized so
 * repeated lookups return stable references for React dependency arrays.
 */

const island001Entry: IslandCaretakerConcordContentEntry = {
  islandNumber: 1,
  islandName: 'Luma Isle',
  inhabitant: island001InhabitantDefinitions[0],
  topics: [...island001InhabitantTopicDefinitions],
  conversations: [...island001ConversationDefinitions],
};

const contentCache = new Map<number, IslandCaretakerConcordContentEntry>([
  [1, island001Entry],
  ...authoredCaretakerConcordEntries.map((entry): [number, IslandCaretakerConcordContentEntry] => [entry.islandNumber, entry]),
]);

export function getIslandCaretakerConcordContent(islandNumber: number): IslandCaretakerConcordContentEntry | null {
  if (!Number.isInteger(islandNumber) || islandNumber < 1) return null;
  const cached = contentCache.get(islandNumber);
  if (cached) return cached;
  const fallback = buildFallbackCaretakerConcordContentEntry(islandNumber);
  contentCache.set(islandNumber, fallback);
  return fallback;
}

export function hasIslandCaretakerConcordContent(islandNumber: number): boolean {
  return getIslandCaretakerConcordContent(islandNumber) !== null;
}

export type { IslandCaretakerConcordContentEntry };
