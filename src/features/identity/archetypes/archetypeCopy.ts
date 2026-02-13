import type { ArchetypeCard } from './archetypeDeck';
import type { HandCard } from './archetypeHandBuilder';

export type ScoreBand = 'low' | 'balanced' | 'high';

export type ArchetypeCopy = {
  powerLine: string;
  strengthLine: string;
  growthEdgeLine: string;
  microTip: string;
};

/**
 * Gets the score band for an archetype card.
 * Low: 0-40, Balanced: 41-70, High: 71-100
 */
export function getArchetypeBand(score: number): ScoreBand {
  if (score <= 40) return 'low';
  if (score <= 70) return 'balanced';
  return 'high';
}

/**
 * Generates display copy for an archetype card based on its score band.
 */
export function getArchetypeCopy(handCard: HandCard): ArchetypeCopy {
  const { card, score } = handCard;
  const band = getArchetypeBand(score);

  return {
    powerLine: getPowerLines(card)[band],
    strengthLine: getStrengthLines(card)[band],
    growthEdgeLine: getGrowthEdgeLines(card)[band],
    microTip: getMicroTip(card),
  };
}

function getPowerLines(card: ArchetypeCard): Record<ScoreBand, string> {
  return {
    low: `Your ${card.name} energy is emerging—you have the potential but it's not your go-to mode yet.`,
    balanced: `You embody ${card.name} traits in moderation—present when needed, not overwhelming.`,
    high: `${card.name} is a core part of who you are—this archetype shapes how you show up in the world.`,
  };
}

function getStrengthLines(card: ArchetypeCard): Record<ScoreBand, string> {
  if (card.strengths.length === 0) {
    return {
      low: 'This archetype offers untapped potential.',
      balanced: 'You can tap into these qualities when needed.',
      high: 'These strengths define your unique contribution.',
    };
  }

  const topStrength = card.strengths[0];
  return {
    low: `You have latent ${topStrength.toLowerCase()}, waiting to be developed.`,
    balanced: `Your ${topStrength.toLowerCase()} serves you in key moments.`,
    high: `Your ${topStrength.toLowerCase()} is a signature strength you can always lean on.`,
  };
}

function getGrowthEdgeLines(card: ArchetypeCard): Record<ScoreBand, string> {
  if (card.weaknesses.length === 0) {
    return {
      low: 'Explore this archetype to expand your range.',
      balanced: 'Stay aware of when this mode serves you vs. when to shift.',
      high: 'Balance this strength by developing complementary archetypes.',
    };
  }

  const topWeakness = card.weaknesses[0];
  return {
    low: `If you develop this archetype, watch for ${topWeakness.toLowerCase()}.`,
    balanced: `Stay mindful of ${topWeakness.toLowerCase()} when in this mode.`,
    high: `Your edge: avoid ${topWeakness.toLowerCase()} by building complementary skills.`,
  };
}

function getMicroTip(card: ArchetypeCard): string {
  // Micro-tips are actionable next steps tied to the archetype
  const tips: Record<string, string> = {
    commander: 'Lead a small project this week to activate your Commander energy.',
    champion: 'Set a personal best goal and track your progress daily.',
    strategist: 'Map out a 90-day plan for one important area of your life.',
    challenger: 'Question one assumption you have been taking for granted.',
    guardian: 'Identify one thing worth protecting and take a concrete step to safeguard it.',
    warlord: 'Take on a tough challenge head-on this week and push past resistance.',
    diplomat: 'Negotiate a compromise in a situation where interests clash.',
    enforcer: 'Hold yourself to a standard this week and track your consistency.',
    caregiver: 'Check in with someone who could use support today.',
    mentor: 'Share one lesson you have learned with someone earlier in their journey.',
    peacemaker: 'Mediate a small conflict or tension you have been avoiding.',
    altruist: 'Volunteer or contribute to a cause you care about this week.',
    empath: 'Practice mindful listening in your next conversation without trying to fix anything.',
    healer: 'Offer a kind word to someone going through a rough patch, then do the same for yourself.',
    connector: 'Introduce two people in your life who would benefit from knowing each other.',
    devotee: 'Honor a commitment or tradition that matters to you this week.',
    sage: 'Spend 30 minutes in reflective reading or journaling.',
    analyst: 'Make one decision today based purely on data and logic.',
    architect: 'Design a system to improve one recurring problem.',
    inventor: 'Experiment with one new approach to a familiar challenge.',
    scholar: 'Deep dive into one topic you have been curious about and take notes.',
    detective: 'Investigate a problem by asking five why questions until you find the root cause.',
    philosopher: 'Journal about a big question that has been on your mind lately.',
    engineer: 'Optimize one workflow or routine to make it more efficient.',
    explorer: 'Try something completely new this week—a place, activity, or perspective.',
    creator: 'Express yourself through any creative medium for 20 minutes.',
    rebel: 'Challenge one rule or norm that does not serve you.',
    visionary: 'Write down one bold vision for your life and share it with someone.',
    mystic: 'Spend 10 minutes in silence or meditation and observe what arises.',
    dreamer: 'Sketch or write about an ideal future without limiting yourself.',
    shaman: 'Create a small ritual around something meaningful to you this week.',
    pioneer: 'Take the first step into a project or area no one around you has explored yet.',
  };

  return tips[card.id] || 'Explore this archetype through action this week.';
}

/**
 * Gets role-specific messaging for cards in the hand.
 */
export function getRoleMessage(handCard: HandCard): string {
  const { role, card } = handCard;

  const messages: Record<typeof role, string> = {
    dominant: `Your ${card.name} archetype is your primary playstyle—how you naturally show up and create impact.`,
    secondary: `Your ${card.name} archetype is your supporting mode—a reliable backup you can tap into when needed.`,
    support: `Your ${card.name} archetype is a tool in your kit—present but not central to your identity.`,
    shadow: `Your ${card.name} archetype is your shadow card—the least developed part of your personality. This represents your growth edge and hidden potential.`,
  };

  return messages[role];
}
