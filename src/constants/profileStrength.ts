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
} as const;
