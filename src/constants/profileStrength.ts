export const PROFILE_STRENGTH_CONFIG = {
  areaWeights: {
    goals: 1,
    habits: 1,
    journal: 1,
    vision_board: 1,
    life_wheel: 1,
    identity: 1,
  },
  thresholds: {
    goals: {},
    habits: {},
    journal: {},
    vision_board: {},
    life_wheel: {},
    identity: {},
  },
};

export const PROFILE_STRENGTH_CONSTANTS = {
  holdDurationMs: 1000,
  holdSlopPx: 10,
  recencyWindowsDays: {
    goals: 30,
    habits: 14,
    journal: 14,
    vision_board: 60,
    life_wheel: 30,
    identity: 180,
  },
  coverageThresholds: {
    goalsCoverage: {
      noneMax: 0,
      lowMax: 2,
      mediumMax: 5,
      strongMin: 6,
    },
    habitsSpreadMin: 3,
  },
  xpDefaults: {
    baseTaskRange: {
      min: 15,
      max: 60,
    },
    coverageBonuses: {
      goals: 100,
      habits: 250,
    },
  },
} as const;
