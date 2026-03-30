export type InnerRecommendation = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

export type SharedSummaryCard = {
  id: 'what_happened' | 'what_it_meant' | 'what_is_needed';
  title: string;
  text: string;
};

export type ResolutionOption = {
  id: string;
  title: string;
  description: string;
};

const ALLOWED_HREFS = new Set(['#breathing-space', '#habits', '#goals', '#journal', '#contracts']);
const ALLOWED_SUMMARY_IDS = new Set(['what_happened', 'what_it_meant', 'what_is_needed']);

function normalizeInnerRecommendation(raw: unknown, index: number): InnerRecommendation | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<InnerRecommendation>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const reason = typeof candidate.reason === 'string' ? candidate.reason.trim() : '';
  const ctaLabel = typeof candidate.ctaLabel === 'string' ? candidate.ctaLabel.trim() : '';
  const href = typeof candidate.href === 'string' ? candidate.href.trim() : '';

  if (!title || !reason || !ctaLabel || !ALLOWED_HREFS.has(href)) return null;
  return {
    id: typeof candidate.id === 'string' && candidate.id.trim().length > 0
      ? candidate.id.trim()
      : `inner_reco_${index + 1}`,
    title,
    reason,
    ctaLabel,
    href,
  };
}

export function parseInnerRecommendationsFromContent(content: unknown, max = 3): InnerRecommendation[] {
  if (typeof content !== 'string' || content.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(content) as { recommendations?: unknown[] };
    if (!Array.isArray(parsed.recommendations)) return [];
    return parsed.recommendations
      .map((item, index) => normalizeInnerRecommendation(item, index))
      .filter((item): item is InnerRecommendation => Boolean(item))
      .slice(0, max);
  } catch {
    return [];
  }
}

export function parseSharedSummaryCardsFromContent(content: unknown): SharedSummaryCard[] {
  if (typeof content !== 'string' || content.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(content) as { summaryCards?: unknown[] };
    if (!Array.isArray(parsed.summaryCards)) return [];
    return parsed.summaryCards
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const card = item as Partial<SharedSummaryCard>;
        const id = typeof card.id === 'string' ? card.id.trim() : '';
        const title = typeof card.title === 'string' ? card.title.trim() : '';
        const text = typeof card.text === 'string' ? card.text.trim() : '';
        if (!ALLOWED_SUMMARY_IDS.has(id) || !title || !text) return null;
        return { id: id as SharedSummaryCard['id'], title, text };
      })
      .filter((item): item is SharedSummaryCard => Boolean(item));
  } catch {
    return [];
  }
}

export function parseResolutionOptionsFromContent(content: unknown, max = 3): ResolutionOption[] {
  if (typeof content !== 'string' || content.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(content) as { options?: unknown[] };
    if (!Array.isArray(parsed.options)) return [];
    return parsed.options
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const option = item as Partial<ResolutionOption>;
        const title = typeof option.title === 'string' ? option.title.trim() : '';
        const description = typeof option.description === 'string' ? option.description.trim() : '';
        if (!title || !description) return null;
        const id = typeof option.id === 'string' && option.id.trim().length > 0
          ? option.id.trim()
          : `resolution_option_${index + 1}`;
        return { id, title, description };
      })
      .filter((item): item is ResolutionOption => Boolean(item))
      .slice(0, max);
  } catch {
    return [];
  }
}
