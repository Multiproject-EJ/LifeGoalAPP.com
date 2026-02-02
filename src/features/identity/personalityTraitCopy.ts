import type { AxisKey, TraitKey } from './personalityTestData';
import type { PersonalityScores } from './personalityScoring';

export type ScoreBand = 'low' | 'balanced' | 'high';

export type TraitCardCopy = {
  label: string;
  icon: string;
  color: string;
  powerLine: Record<ScoreBand, string>;
  strengthLine: Record<ScoreBand, string>;
  growthEdgeLine: Record<ScoreBand, string>;
  microTip?: string;
};

export type TraitCard = {
  key: TraitKey | AxisKey;
  label: string;
  icon: string;
  color: string;
  score: number;
  band: ScoreBand;
  powerLine: string;
  strengthLine: string;
  growthEdgeLine: string;
  microTip?: string;
};

const TRAIT_ORDER: TraitKey[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotional_stability',
];

const AXIS_ORDER: AxisKey[] = [
  'regulation_style',
  'stress_response',
  'identity_sensitivity',
  'cognitive_entry',
];

export const BAND_LABELS: Record<ScoreBand, string> = {
  low: 'Low',
  balanced: 'Balanced',
  high: 'High',
};

const TRAIT_COPY: Record<TraitKey | AxisKey, TraitCardCopy> = {
  openness: {
    label: 'Openness',
    icon: '🌌',
    color: '#7A6FF0',
    powerLine: {
      low: "You're low on Openness, which means you prefer proven paths.",
      balanced: "You're balanced on Openness, blending curiosity with practicality.",
      high: "You're high on Openness, so exploration fuels your growth.",
    },
    strengthLine: {
      low: 'You keep things grounded and practical.',
      balanced: 'You adapt without losing focus.',
      high: 'You spot possibilities others miss.',
    },
    growthEdgeLine: {
      low: 'You may overlook novel solutions.',
      balanced: 'You may hesitate to fully commit to new ideas.',
      high: 'You can scatter energy across too many ideas.',
    },
    microTip: 'Try a 10-minute curiosity sprint.',
  },
  conscientiousness: {
    label: 'Conscientiousness',
    icon: '🧭',
    color: '#3F7DBA',
    powerLine: {
      low: "You're low on Conscientiousness, so flexibility comes naturally.",
      balanced: "You're balanced on Conscientiousness, mixing structure with ease.",
      high: "You're high on Conscientiousness, so planning is your superpower.",
    },
    strengthLine: {
      low: 'You stay nimble when plans change.',
      balanced: 'You can organize without over-controlling.',
      high: 'You are reliable and detail-aware.',
    },
    growthEdgeLine: {
      low: 'You may struggle with consistent follow-through.',
      balanced: 'You may feel torn between order and spontaneity.',
      high: 'You can over-index on perfection.',
    },
    microTip: 'Try a 3-step daily plan.',
  },
  extraversion: {
    label: 'Extraversion',
    icon: '🎉',
    color: '#F0A14B',
    powerLine: {
      low: "You're low on Extraversion, so quiet focus restores you.",
      balanced: "You're balanced on Extraversion, choosing people time with intention.",
      high: "You're high on Extraversion, so energy builds through connection.",
    },
    strengthLine: {
      low: 'You listen deeply and think before you speak.',
      balanced: 'You can lead or observe based on the moment.',
      high: 'You spark momentum in groups.',
    },
    growthEdgeLine: {
      low: 'You may hold back ideas that deserve space.',
      balanced: 'You may hesitate to fully lean in socially.',
      high: 'You may overextend your social energy.',
    },
    microTip: 'Try a 1:1 connection boost.',
  },
  agreeableness: {
    label: 'Agreeableness',
    icon: '🤝',
    color: '#6CC37A',
    powerLine: {
      low: "You're low on Agreeableness, so honesty comes fast and direct.",
      balanced: "You're balanced on Agreeableness, blending candor with care.",
      high: "You're high on Agreeableness, so harmony matters deeply.",
    },
    strengthLine: {
      low: 'You speak your mind clearly.',
      balanced: 'You can collaborate without losing your voice.',
      high: 'You make people feel safe and supported.',
    },
    growthEdgeLine: {
      low: 'You may come off sharper than intended.',
      balanced: 'You may hold back tough feedback too long.',
      high: 'You may over-give to keep the peace.',
    },
    microTip: 'Try a clear-ask script.',
  },
  emotional_stability: {
    label: 'Emotional Stability',
    icon: '🫶',
    color: '#4C9F9E',
    powerLine: {
      low: "You're lower on Emotional Stability, so feelings run intense.",
      balanced: "You're balanced on Emotional Stability, bouncing back with time.",
      high: "You're high on Emotional Stability, keeping calm under pressure.",
    },
    strengthLine: {
      low: 'You notice emotional shifts quickly.',
      balanced: 'You can steady yourself with a reset.',
      high: 'You stay composed when stakes rise.',
    },
    growthEdgeLine: {
      low: 'Stress can drain you faster than most.',
      balanced: 'You may suppress emotions to stay calm.',
      high: 'You may overlook signals that need processing.',
    },
    microTip: 'Try a 90-second reset.',
  },
  regulation_style: {
    label: 'Regulation Style',
    icon: '⚖️',
    color: '#B57EDC',
    powerLine: {
      low: 'You lean toward flexibility and openness in routines.',
      balanced: 'You blend structure with room to breathe.',
      high: 'You thrive with clear structure and steady pacing.',
    },
    strengthLine: {
      low: 'You stay open to shifts in the moment.',
      balanced: 'You can set guardrails without rigidity.',
      high: 'You build reliable systems fast.',
    },
    growthEdgeLine: {
      low: 'You may skip the structure that supports focus.',
      balanced: 'You may swing between loose and strict routines.',
      high: 'You may resist necessary flexibility.',
    },
    microTip: 'Try a light daily rhythm.',
  },
  stress_response: {
    label: 'Stress Response',
    icon: '🌤️',
    color: '#5C8CE6',
    powerLine: {
      low: 'Stress can feel loud, so recovery rituals matter.',
      balanced: 'You steady yourself with a mix of calm and action.',
      high: 'You bounce back quickly after pressure.',
    },
    strengthLine: {
      low: 'You read stress signals early.',
      balanced: 'You can regroup after most challenges.',
      high: 'You stay grounded when things spike.',
    },
    growthEdgeLine: {
      low: 'You may need frequent recharge breaks.',
      balanced: 'You may wait too long to reset.',
      high: 'You may under-prepare for high-stress moments.',
    },
    microTip: 'Try a 5-minute decompression.',
  },
  identity_sensitivity: {
    label: 'Identity Sensitivity',
    icon: '🧩',
    color: '#F05C8C',
    powerLine: {
      low: 'You stay steady even when values are challenged.',
      balanced: 'You care about values without losing flexibility.',
      high: 'Values matter deeply and guide your choices.',
    },
    strengthLine: {
      low: 'You can separate feedback from self-worth.',
      balanced: 'You can defend values and stay open.',
      high: 'You live with clarity and conviction.',
    },
    growthEdgeLine: {
      low: 'You may ignore signals that matter to you.',
      balanced: 'You may hesitate to assert your boundaries.',
      high: 'You may feel easily misunderstood.',
    },
    microTip: 'Try a values check-in.',
  },
  cognitive_entry: {
    label: 'Cognitive Entry',
    icon: '🧠',
    color: '#F28C4B',
    powerLine: {
      low: 'You learn best through doing and rapid action.',
      balanced: 'You mix thinking and doing as you learn.',
      high: 'You prefer planning and analysis before action.',
    },
    strengthLine: {
      low: 'You build momentum quickly.',
      balanced: 'You can shift between prep and action.',
      high: 'You see the big picture before moving.',
    },
    growthEdgeLine: {
      low: 'You may skip helpful prep steps.',
      balanced: 'You may pause too long for certainty.',
      high: 'You may delay action while refining.',
    },
    microTip: 'Try a quick-start checklist.',
  },
};

export function getScoreBand(score: number): ScoreBand {
  if (score >= 65) {
    return 'high';
  }
  if (score >= 40) {
    return 'balanced';
  }
  return 'low';
}

export function buildTraitCards(scores: PersonalityScores): TraitCard[] {
  const traits = TRAIT_ORDER.map((key) => {
    const copy = TRAIT_COPY[key];
    const score = scores.traits[key];
    const band = getScoreBand(score);

    return {
      key,
      label: copy.label,
      icon: copy.icon,
      color: copy.color,
      score,
      band,
      powerLine: copy.powerLine[band],
      strengthLine: copy.strengthLine[band],
      growthEdgeLine: copy.growthEdgeLine[band],
      microTip: copy.microTip,
    };
  });

  const axes = AXIS_ORDER.map((key) => {
    const copy = TRAIT_COPY[key];
    const score = scores.axes[key];
    const band = getScoreBand(score);

    return {
      key,
      label: copy.label,
      icon: copy.icon,
      color: copy.color,
      score,
      band,
      powerLine: copy.powerLine[band],
      strengthLine: copy.strengthLine[band],
      growthEdgeLine: copy.growthEdgeLine[band],
      microTip: copy.microTip,
    };
  });

  return [...traits, ...axes];
}

export function getTraitLabel(key: TraitKey | AxisKey): string {
  return TRAIT_COPY[key].label;
}

export function getTraitMicroTip(key: TraitKey | AxisKey): string | undefined {
  return TRAIT_COPY[key].microTip;
}
