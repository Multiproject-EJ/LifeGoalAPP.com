import { createJournalEntry, listJournalEntries, type JournalEntry } from './journal';

export const RATIONALITY_TAG = 'rationality';
export const RATIONALITY_PROMPT = 'What might I be wrong about?';

type RationalityEntry = JournalEntry;

type RationalityListFilters = {
  fromDate?: string;
  toDate?: string;
  limit?: number;
};

type CreateRationalityEntryParams = {
  userId: string;
  content: string;
  entryDate: string;
};

export async function listRationalityEntries(filters: RationalityListFilters = {}) {
  return listJournalEntries({
    tag: RATIONALITY_TAG,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    limit: filters.limit,
  });
}

export async function createRationalityEntry({
  userId,
  content,
  entryDate,
}: CreateRationalityEntryParams) {
  return createJournalEntry({
    user_id: userId,
    entry_date: entryDate,
    title: RATIONALITY_PROMPT,
    content,
    tags: [RATIONALITY_TAG],
    type: 'problem',
    is_private: true,
  });
}

export function getUniqueRationalityDates(entries: RationalityEntry[]): string[] {
  return Array.from(new Set(entries.map((entry) => entry.entry_date))).sort((a, b) =>
    b.localeCompare(a),
  );
}
