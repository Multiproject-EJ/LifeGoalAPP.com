import type { Json } from '../../lib/database.types';
import type { PlanQualityResult } from './planQuality';

export type GoalHealthState = 'on_track' | 'caution' | 'at_risk';

export type GoalHealthSnapshot = {
  goalId: string;
  capturedAt: string;
  healthState: GoalHealthState;
  riskReason: string | null;
  recommendedAction: string | null;
  signals: Json | null;
};

export type GoalExecutionRecommendation = {
  encouragementLine: string;
  realityObservation: string;
  recommendedAction: string;
  oneTapOptions: string[];
};

export type GoalExecutionEvaluation = {
  planQuality: PlanQualityResult;
  healthSnapshot: GoalHealthSnapshot;
};
