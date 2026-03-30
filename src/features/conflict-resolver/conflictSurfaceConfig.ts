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

export function buildFallbackInnerRecommendationsForSurface(
  draftAnswers: Record<string, string>,
  surface: AppSurface,
): ConflictRecommendationItem[] {
  const combined = Object.values(draftAnswers).join(' ').toLowerCase();
  const picks: ConflictRecommendationItem[] = [];

  if (/(anxious|stress|overwhelm|panic|pressure|tired|burnout)/.test(combined)) {
    picks.push({
      id: 'breathing_reset',
      title: 'Reset your nervous system first',
      reason: 'Your reflection shows high pressure. A short regulation reset should come before strategy.',
      ctaLabel: 'Start Breathing Space',
      href: '#breathing-space',
    });
  }
  if (/(consistency|routine|discipline|procrastinat|avoid|stuck|follow through)/.test(combined)) {
    picks.push({
      id: 'habit_alignment',
      title: 'Create one tiny habit that removes friction',
      reason: 'You described repeat-pattern tension. A single daily habit is the best leverage move.',
      ctaLabel: 'Open Habits',
      href: '#habits',
    });
  }
  if (/(direction|purpose|goal|career|future|focus|clarity)/.test(combined)) {
    picks.push({
      id: 'goal_alignment',
      title: 'Re-align with one concrete goal',
      reason: 'Your notes point to uncertainty and direction conflict. Clarifying one active goal can reduce noise.',
      ctaLabel: 'Open Goals',
      href: '#goals',
    });
  }

  if (picks.length === 0) {
    picks.push(
      {
        id: 'journal_first',
        title: 'Capture one clear insight',
        reason: 'You did the hard honesty work. Lock in one sentence you want to remember this week.',
        ctaLabel: 'Open Journal',
        href: '#journal',
      },
      {
        id: 'contract_step',
        title: 'Turn insight into a commitment contract',
        reason: 'Convert reflection into behavior by defining one concrete promise with a deadline.',
        ctaLabel: 'Open Contracts',
        href: '#contracts',
      },
    );
  }

  return picks.slice(0, 3).map((item) => mapRecommendationForSurface(item, surface));
}
