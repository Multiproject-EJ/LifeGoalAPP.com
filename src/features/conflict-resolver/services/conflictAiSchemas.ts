export type InnerRecommendation = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

const ALLOWED_HREFS = new Set(['#breathing-space', '#habits', '#goals', '#journal', '#contracts']);

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

