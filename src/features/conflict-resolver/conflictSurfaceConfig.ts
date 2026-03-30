import type { AppSurface } from '../../surfaces/surfaceContext';

export type ConflictSurfaceConfig = {
  surface: AppSurface;
  productLabel: string;
  nextStepLead: string;
  upgradeHref: string;
  upgradeLabel: string;
  allowedRecommendationHrefs: string[];
  fallbackRecommendationHref: string;
};

export type ConflictRecommendationItem = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

const PEACEBETWEEN_FALLBACK_HREF = '/conflict/new';

export const HABITGAME_CONFLICT_SURFACE: ConflictSurfaceConfig = {
  surface: 'habitgame',
  productLabel: 'HabitGame',
  nextStepLead: 'Based on this session, jump straight into the most useful next step.',
  upgradeHref: '#account',
  upgradeLabel: 'Explore Premium',
  allowedRecommendationHrefs: ['#breathing-space', '#habits', '#goals', '#journal', '#contracts', '#account'],
  fallbackRecommendationHref: '#journal',
};

export const PEACEBETWEEN_CONFLICT_SURFACE: ConflictSurfaceConfig = {
  surface: 'peacebetween',
  productLabel: 'Peace Between',
  nextStepLead: 'Stay in Peace Between and choose one concrete repair action before you leave.',
  upgradeHref: '/conflict/new?upgrade=1',
  upgradeLabel: 'Explore Peace Between Plus',
  allowedRecommendationHrefs: [
    '/conflict/new',
    '/conflict/new?step=grounding',
    '/conflict/new?step=reflection',
    '/conflict/new?step=repair-plan',
    '/conflict/new?upgrade=1',
  ],
  fallbackRecommendationHref: PEACEBETWEEN_FALLBACK_HREF,
};

export function getConflictSurfaceConfig(surface: AppSurface): ConflictSurfaceConfig {
  return surface === 'peacebetween' ? PEACEBETWEEN_CONFLICT_SURFACE : HABITGAME_CONFLICT_SURFACE;
}

function mapPeaceBetweenRecommendation(item: ConflictRecommendationItem): ConflictRecommendationItem {
  const mapping: Record<string, { href: string; ctaLabel: string }> = {
    '#breathing-space': { href: '/conflict/new?step=grounding', ctaLabel: 'Start Calm Reset' },
    '#habits': { href: '/conflict/new?step=repair-plan', ctaLabel: 'Choose One Practice' },
    '#goals': { href: '/conflict/new?step=repair-plan', ctaLabel: 'Set One Shared Goal' },
    '#journal': { href: '/conflict/new?step=reflection', ctaLabel: 'Continue Reflection' },
    '#contracts': { href: '/conflict/new?step=repair-plan', ctaLabel: 'Create Repair Plan' },
    '#account': { href: '/conflict/new?upgrade=1', ctaLabel: 'Explore Peace Between Plus' },
  };

  const mapped = mapping[item.href];
  if (!mapped) {
    return {
      ...item,
      href: PEACEBETWEEN_FALLBACK_HREF,
      ctaLabel: item.ctaLabel === 'Explore Premium' ? 'Explore Peace Between Plus' : item.ctaLabel,
    };
  }

  return {
    ...item,
    href: mapped.href,
    ctaLabel: mapped.ctaLabel,
  };
}

export function mapRecommendationForSurface(item: ConflictRecommendationItem, surface: AppSurface): ConflictRecommendationItem {
  if (surface !== 'peacebetween') return item;
  return mapPeaceBetweenRecommendation(item);
}

export function sanitizeRecommendationHrefForSurface(href: string, surface: AppSurface): string {
  const config = getConflictSurfaceConfig(surface);
  if (config.allowedRecommendationHrefs.includes(href)) return href;
  return config.fallbackRecommendationHref;
}
